-- AIRAVAT | Migration 0010: Research ONE cases (Market Detective, hypotheses, notebooks), Strategy DNA
-- (strategies, backtest runs, fingerprints), Shadow Portfolio (simulation-only, isolated from OMS). Strictly additive.

create type research_case_kind as enum ('investigation','hypothesis','notebook');
create type evidence_class as enum ('fact','estimate','hypothesis','contradiction');
create type finding_stance as enum ('bull','bear','neutral','auditor','summary');

create table research_cases (
  id bigserial primary key,
  owner_id uuid not null references profiles(id) on delete cascade,
  kind research_case_kind not null default 'investigation',
  title text not null,
  question text,
  instrument_id int references instruments(id),
  status text not null default 'open',       -- open | closed
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on research_cases(owner_id, updated_at desc);
create table research_evidence (
  id bigserial primary key,
  case_id bigint not null references research_cases(id) on delete cascade,
  kind text not null,              -- price_move | scanner | metric | user_note | document | ai_observation
  title text not null,
  body text,
  source text not null default 'AIRAVAT sandbox',
  source_url text,
  observed_at timestamptz not null default now(),
  classification evidence_class not null default 'fact',
  data jsonb,
  created_by uuid,
  created_at timestamptz not null default now()
);
create table research_findings (
  id bigserial primary key,
  case_id bigint not null references research_cases(id) on delete cascade,
  stance finding_stance not null,
  body text not null,
  generated_by text not null default 'ai',     -- ai | user
  model text,
  prompt_version text,
  created_at timestamptz not null default now()
);

-- Strategy DNA
create table strategies (
  id bigserial primary key,
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  description text,
  version int not null default 1,
  rules jsonb not null,            -- {"type":"ema_cross","fast":20,"slow":50,"stop_pct":5,"target_pct":null,"max_hold_days":60,"sizing_pct":100}
  universe text[] not null default '{}',
  status text not null default 'draft',   -- draft | validated | backtested | robustness_reviewed | paper
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table backtest_runs (
  id bigserial primary key,
  strategy_id bigint not null references strategies(id) on delete cascade,
  strategy_version int not null,
  engine_version text not null,
  params jsonb not null,
  universe text[] not null,
  start_date date, end_date date,
  cost_model jsonb not null,
  metrics jsonb not null,
  fingerprint jsonb,
  robustness jsonb,
  equity_curve jsonb,
  trades_count int not null default 0,
  data_source text not null default 'SIMULATED',
  created_at timestamptz not null default now()
);
create index on backtest_runs(strategy_id, created_at desc);

-- Shadow Portfolio (simulation-only). No link to orders/trades/ledger.
create table shadow_portfolios (
  id bigserial primary key,
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  starting_cash numeric(18,2) not null,
  cash numeric(18,2) not null,
  benchmark text not null default 'NIFTY 50',
  thesis text,
  research_case_id bigint references research_cases(id),
  created_at timestamptz not null default now()
);
create table shadow_orders (
  id bigserial primary key,
  portfolio_id bigint not null references shadow_portfolios(id) on delete cascade,
  instrument_id int not null references instruments(id),
  side order_side not null,
  qty int not null check (qty > 0),
  price numeric(18,4) not null,
  charges numeric(12,2) not null default 0,
  note text,
  research_case_id bigint references research_cases(id),
  created_at timestamptz not null default now()
);
create table shadow_positions (
  portfolio_id bigint not null references shadow_portfolios(id) on delete cascade,
  instrument_id int not null references instruments(id),
  qty int not null,
  avg_price numeric(18,4) not null,
  realized_pnl numeric(18,2) not null default 0,
  primary key (portfolio_id, instrument_id)
);
create table shadow_snapshots (
  portfolio_id bigint not null references shadow_portfolios(id) on delete cascade,
  as_of date not null,
  value numeric(18,2) not null,
  cash numeric(18,2) not null,
  benchmark_level numeric(18,4),
  primary key (portfolio_id, as_of)
);

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------
create or replace function create_research_case(p jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_inst int; q quotes; m instrument_metrics; i instruments;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if nullif(p->>'symbol','') is not null then select id into v_inst from instruments where symbol = p->>'symbol'; end if;
  insert into research_cases(owner_id, kind, title, question, instrument_id)
  values (auth.uid(), coalesce((p->>'kind')::research_case_kind,'investigation'), left(p->>'title',160), p->>'question', v_inst) returning id into v_id;
  -- seed deterministic evidence from the sandbox data (facts, clearly sourced)
  if v_inst is not null then
    select * into q from quotes where instrument_id = v_inst; select * into m from instrument_metrics where instrument_id = v_inst; select * into i from instruments where id = v_inst;
    insert into research_evidence(case_id, kind, title, body, source, observed_at, classification, data, created_by) values
      (v_id, 'price_move', 'Current simulated quote', i.symbol||' LTP '||q.ltp||' vs previous close '||q.prev_close||' ('||round((q.ltp/nullif(q.prev_close,0)-1)*100,2)||'%). Session high '||q.high||', low '||q.low||'.', 'AIRAVAT sandbox market engine (SIMULATED)', q.updated_at, 'fact', to_jsonb(q), auth.uid());
    if m.instrument_id is not null then
      insert into research_evidence(case_id, kind, title, body, source, observed_at, classification, data, created_by) values
        (v_id, 'metric', 'Derived technical metrics', 'RSI(14) '||coalesce(m.rsi_14::text,'n/a')||', 20d return '||coalesce(m.ret_20d::text,'n/a')||'%, relative strength vs NIFTY 20d '||coalesce(m.rs_vs_nifty_20::text,'n/a')||'%, ATR% '||coalesce(m.atr_pct_14::text,'n/a')||', volume ratio '||coalesce(m.vol_ratio::text,'n/a')||'.', 'Computed from stored synthetic candles', m.as_of, 'estimate', to_jsonb(m), auth.uid());
    end if;
    insert into research_evidence(case_id, kind, title, body, source, observed_at, classification, data, created_by)
    select v_id, 'scanner', 'Scanner match: '||s.name, s.description, 'AIRAVAT Scanner Matrix (SIMULATED)', r.matched_at, 'estimate', r.evidence, auth.uid()
    from scanner_results r join scanners s on s.id = r.scanner_id where r.instrument_id = v_inst and r.as_of_day >= current_date - 3 and s.kind='system';
    insert into research_evidence(case_id, kind, title, body, source, classification, created_by) values
      (v_id, 'document', 'Missing data: disclosures, fundamentals and news', 'No licensed corporate-disclosure, fundamentals or news feed is connected. Any explanation of the move that relies on company events is a hypothesis until a source is attached.', 'AIRAVAT data governance', 'contradiction', auth.uid());
  end if;
  perform audit('research.case.created','research_case',v_id::text,null,p);
  return v_id;
end $$;

create or replace function add_research_evidence(p_case bigint, p jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  if not exists (select 1 from research_cases where id = p_case and owner_id = auth.uid()) then raise exception 'FORBIDDEN'; end if;
  insert into research_evidence(case_id, kind, title, body, source, source_url, classification, created_by)
  values (p_case, coalesce(p->>'kind','user_note'), left(p->>'title',160), p->>'body', coalesce(p->>'source','User note'), p->>'source_url', coalesce((p->>'classification')::evidence_class,'hypothesis'), auth.uid())
  returning id into v_id;
  update research_cases set updated_at = now() where id = p_case;
  return v_id;
end $$;

create or replace function add_research_finding(p_case bigint, p_stance finding_stance, p_body text, p_generated_by text, p_model text, p_prompt_version text) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  if not exists (select 1 from research_cases where id = p_case and owner_id = auth.uid()) then raise exception 'FORBIDDEN'; end if;
  insert into research_findings(case_id, stance, body, generated_by, model, prompt_version) values (p_case, p_stance, p_body, coalesce(p_generated_by,'user'), p_model, p_prompt_version) returning id into v_id;
  update research_cases set updated_at = now() where id = p_case;
  return v_id;
end $$;

create or replace function close_research_case(p_case bigint, p_summary text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update research_cases set status='closed', summary = p_summary, updated_at = now() where id = p_case and owner_id = auth.uid();
  if not found then raise exception 'FORBIDDEN'; end if;
end $$;

-- Strategies
create or replace function save_strategy(p jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_type text := p->'rules'->>'type';
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_type not in ('ema_cross','breakout','rsi_reversion') then raise exception 'UNKNOWN_STRATEGY_TYPE'; end if;
  if nullif(p->>'id','') is not null then
    update strategies set name = left(p->>'name',80), description = p->>'description', rules = p->'rules', universe = (select array_agg(x) from jsonb_array_elements_text(p->'universe') x),
      version = version + 1, status = 'draft', updated_at = now() where id = (p->>'id')::bigint and owner_id = auth.uid() returning id into v_id;
    if v_id is null then raise exception 'FORBIDDEN'; end if;
  else
    insert into strategies(owner_id, name, description, rules, universe) values (auth.uid(), left(p->>'name',80), p->>'description', p->'rules', coalesce((select array_agg(x) from jsonb_array_elements_text(p->'universe') x), '{}')) returning id into v_id;
  end if;
  perform audit('strategy.saved','strategy',v_id::text,null,p);
  return v_id;
end $$;

create or replace function record_backtest(p jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint; s strategies;
begin
  select * into s from strategies where id = (p->>'strategy_id')::bigint and owner_id = auth.uid();
  if s.id is null then raise exception 'FORBIDDEN'; end if;
  insert into backtest_runs(strategy_id, strategy_version, engine_version, params, universe, start_date, end_date, cost_model, metrics, fingerprint, robustness, equity_curve, trades_count)
  values (s.id, s.version, p->>'engine_version', p->'params', s.universe, (p->>'start_date')::date, (p->>'end_date')::date, p->'cost_model', p->'metrics', p->'fingerprint', p->'robustness', p->'equity_curve', coalesce((p->>'trades_count')::int,0))
  returning id into v_id;
  update strategies set status = case when p->'robustness' is not null then 'robustness_reviewed' else 'backtested' end, updated_at = now() where id = s.id;
  perform audit('strategy.backtest.recorded','backtest_run',v_id::text,null,jsonb_build_object('strategy',s.id,'metrics',p->'metrics'));
  return v_id;
end $$;

-- Shadow Portfolio
create or replace function create_shadow_portfolio(p_name text, p_cash numeric, p_thesis text, p_case bigint default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_cash <= 0 or p_cash > 100000000 then raise exception 'CASH_OUT_OF_RANGE'; end if;
  if (select count(*) from shadow_portfolios where owner_id = auth.uid()) >= 10 then raise exception 'PORTFOLIO_LIMIT'; end if;
  insert into shadow_portfolios(owner_id, name, starting_cash, cash, thesis, research_case_id) values (auth.uid(), left(p_name,80), round(p_cash,2), round(p_cash,2), p_thesis, p_case) returning id into v_id;
  perform audit('shadow.portfolio.created','shadow_portfolio',v_id::text,null,jsonb_build_object('cash',p_cash));
  return v_id;
end $$;

create or replace function shadow_place_order(p_portfolio bigint, p_symbol text, p_side order_side, p_qty int, p_note text default null, p_case bigint default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pf shadow_portfolios; i instruments; q quotes; v_price numeric; v_value numeric; v_ch numeric; pos shadow_positions; v_pnl numeric := 0; v_id bigint;
begin
  select * into pf from shadow_portfolios where id = p_portfolio and owner_id = auth.uid() for update;
  if pf.id is null then raise exception 'FORBIDDEN'; end if;
  select * into i from instruments where symbol = p_symbol;
  if i.id is null then raise exception 'INSTRUMENT_NOT_FOUND'; end if;
  select * into q from quotes where instrument_id = i.id;
  if p_qty <= 0 or p_qty % i.lot_size <> 0 then raise exception 'QTY_NOT_MULTIPLE_OF_LOT'; end if;
  v_price := case when p_side='BUY' then coalesce(q.ask, q.ltp) else coalesce(q.bid, q.ltp) end;
  v_value := round(p_qty * v_price, 2);
  v_ch := (compute_charges('CNC', p_side, v_value)->>'total')::numeric;
  select * into pos from shadow_positions where portfolio_id = pf.id and instrument_id = i.id;
  if p_side = 'BUY' then
    if pf.cash < v_value + v_ch then raise exception 'INSUFFICIENT_SHADOW_CASH'; end if;
    update shadow_portfolios set cash = cash - v_value - v_ch where id = pf.id;
    insert into shadow_positions(portfolio_id, instrument_id, qty, avg_price) values (pf.id, i.id, p_qty, v_price)
      on conflict (portfolio_id, instrument_id) do update set avg_price = (shadow_positions.avg_price*shadow_positions.qty + v_price*p_qty)/(shadow_positions.qty + p_qty), qty = shadow_positions.qty + p_qty;
  else
    if pos.qty is null or pos.qty < p_qty then raise exception 'INSUFFICIENT_SHADOW_HOLDINGS'; end if;
    v_pnl := round((v_price - pos.avg_price) * p_qty, 2);
    update shadow_portfolios set cash = cash + v_value - v_ch where id = pf.id;
    update shadow_positions set qty = qty - p_qty, realized_pnl = realized_pnl + v_pnl where portfolio_id = pf.id and instrument_id = i.id;
    delete from shadow_positions where portfolio_id = pf.id and instrument_id = i.id and qty = 0;
  end if;
  insert into shadow_orders(portfolio_id, instrument_id, side, qty, price, charges, note, research_case_id) values (pf.id, i.id, p_side, p_qty, v_price, v_ch, p_note, p_case) returning id into v_id;
  return jsonb_build_object('order_id', v_id, 'price', v_price, 'value', v_value, 'charges', v_ch, 'realized_pnl', v_pnl, 'simulated', true);
end $$;

create or replace function shadow_valuation(p_portfolio bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare pf shadow_portfolios; v_mv numeric; v_cost numeric; v_real numeric; v_bench numeric;
begin
  select * into pf from shadow_portfolios where id = p_portfolio and (owner_id = auth.uid() or is_staff());
  if pf.id is null then raise exception 'FORBIDDEN'; end if;
  select coalesce(sum(p.qty * q.ltp),0), coalesce(sum(p.qty * p.avg_price),0), coalesce(sum(p.realized_pnl),0) into v_mv, v_cost, v_real
    from shadow_positions p join quotes q on q.instrument_id = p.instrument_id where p.portfolio_id = pf.id;
  select ltp into v_bench from quotes q join instruments i on i.id = q.instrument_id where i.symbol = pf.benchmark;
  return jsonb_build_object('cash', pf.cash, 'market_value', v_mv, 'total', pf.cash + v_mv, 'starting_cash', pf.starting_cash,
    'unrealized_pnl', v_mv - v_cost, 'realized_pnl', v_real, 'return_pct', round((pf.cash + v_mv) / nullif(pf.starting_cash,0) * 100 - 100, 2),
    'benchmark', pf.benchmark, 'benchmark_level', v_bench, 'hypothetical', true, 'data_source', 'SIMULATED');
end $$;

-- RLS
alter table research_cases enable row level security;
alter table research_evidence enable row level security;
alter table research_findings enable row level security;
alter table strategies enable row level security;
alter table backtest_runs enable row level security;
alter table shadow_portfolios enable row level security;
alter table shadow_orders enable row level security;
alter table shadow_positions enable row level security;
alter table shadow_snapshots enable row level security;
create policy "cases own" on research_cases for select using (owner_id = auth.uid() or is_staff());
create policy "evidence own" on research_evidence for select using (is_staff() or case_id in (select id from research_cases where owner_id = auth.uid()));
create policy "findings own" on research_findings for select using (is_staff() or case_id in (select id from research_cases where owner_id = auth.uid()));
create policy "strategies own" on strategies for select using (owner_id = auth.uid() or is_staff());
create policy "backtests own" on backtest_runs for select using (is_staff() or strategy_id in (select id from strategies where owner_id = auth.uid()));
create policy "shadow own" on shadow_portfolios for select using (owner_id = auth.uid() or is_staff());
create policy "shadow orders own" on shadow_orders for select using (is_staff() or portfolio_id in (select id from shadow_portfolios where owner_id = auth.uid()));
create policy "shadow positions own" on shadow_positions for select using (is_staff() or portfolio_id in (select id from shadow_portfolios where owner_id = auth.uid()));
create policy "shadow snapshots own" on shadow_snapshots for select using (is_staff() or portfolio_id in (select id from shadow_portfolios where owner_id = auth.uid()));
revoke insert, update, delete on research_cases, research_evidence, research_findings, strategies, backtest_runs, shadow_portfolios, shadow_orders, shadow_positions, shadow_snapshots from anon, authenticated;
revoke execute on function create_research_case(jsonb) from public, anon;
revoke execute on function add_research_evidence(bigint, jsonb) from public, anon;
revoke execute on function add_research_finding(bigint, finding_stance, text, text, text, text) from public, anon;
revoke execute on function close_research_case(bigint, text) from public, anon;
revoke execute on function save_strategy(jsonb) from public, anon;
revoke execute on function record_backtest(jsonb) from public, anon;
revoke execute on function create_shadow_portfolio(text, numeric, text, bigint) from public, anon;
revoke execute on function shadow_place_order(bigint, text, order_side, int, text, bigint) from public, anon;
revoke execute on function shadow_valuation(bigint) from public, anon;
