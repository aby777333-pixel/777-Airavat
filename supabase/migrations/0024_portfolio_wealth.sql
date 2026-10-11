-- 0024: portfolio and wealth (additive): daily snapshots + benchmark, FIFO capital gains, contract notes, pledge/collateral,
-- margin trading facility (sandbox funding book with daily interest), authorised family views, statement exports.
insert into ledger_accounts(code, name, type) values ('1300','MTF funded receivable','ASSET'), ('4300','MTF interest income','INCOME') on conflict (code) do nothing;

create table portfolio_snapshots (
  account_id uuid not null references trading_accounts(id) on delete cascade,
  day date not null,
  cash numeric(18,2) not null,
  holdings_value numeric(18,2) not null,
  positions_mtm numeric(18,2) not null default 0,
  total numeric(18,2) not null,
  benchmark_level numeric(18,4),
  primary key (account_id, day)
);
create table pledges (
  id bigserial primary key,
  account_id uuid not null references trading_accounts(id),
  instrument_id int not null references instruments(id),
  qty int not null check (qty > 0),
  haircut_pct numeric(6,2) not null default 20,
  status text not null default 'pledged',    -- pledged | released
  pledged_at timestamptz not null default now(),
  released_at timestamptz,
  reference text
);
create table mtf_positions (
  id bigserial primary key,
  account_id uuid not null references trading_accounts(id),
  instrument_id int not null references instruments(id),
  qty int not null check (qty > 0),
  funded_amount numeric(18,2) not null,
  interest_rate_pct numeric(6,2) not null default 18,
  interest_accrued numeric(18,2) not null default 0,
  status text not null default 'open',       -- open | closed
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  last_accrual date
);
create table portfolio_viewers (
  id bigserial primary key,
  owner_id uuid not null references profiles(id) on delete cascade,
  viewer_email text not null,
  viewer_id uuid references profiles(id),
  scope text not null default 'read',
  status text not null default 'invited',    -- invited | active | revoked
  created_at timestamptz not null default now(),
  unique (owner_id, viewer_email)
);
alter table portfolio_snapshots enable row level security; alter table pledges enable row level security; alter table mtf_positions enable row level security; alter table portfolio_viewers enable row level security;
create policy "snapshots own" on portfolio_snapshots for select using (is_staff() or account_id in (select id from trading_accounts where user_id = auth.uid()) or account_id in (select t.id from trading_accounts t join portfolio_viewers v on v.owner_id = t.user_id where v.viewer_id = auth.uid() and v.status='active'));
create policy "pledges own" on pledges for select using (is_staff() or account_id in (select id from trading_accounts where user_id = auth.uid()));
create policy "mtf own" on mtf_positions for select using (is_staff() or account_id in (select id from trading_accounts where user_id = auth.uid()));
create policy "viewers own" on portfolio_viewers for select using (owner_id = auth.uid() or viewer_id = auth.uid() or is_staff());
revoke insert, update, delete on portfolio_snapshots, pledges, mtf_positions, portfolio_viewers from anon, authenticated;

-- Snapshots (cron 16:05 IST and on demand)
create or replace function snapshot_portfolios() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into portfolio_snapshots(account_id, day, cash, holdings_value, positions_mtm, total, benchmark_level)
  select t.id, (now() at time zone 'Asia/Kolkata')::date, account_ledger_balance(t.id),
    coalesce((select sum(h.qty * q.ltp) from holdings h join quotes q on q.instrument_id = h.instrument_id where h.account_id = t.id),0),
    coalesce((select sum((q.ltp - p.avg_price) * p.net_qty) from positions p join quotes q on q.instrument_id = p.instrument_id where p.account_id = t.id and p.net_qty <> 0 and p.product='MIS'),0),
    0, (select q.ltp from quotes q join instruments i on i.id = q.instrument_id where i.symbol = 'NIFTY 50')
  from trading_accounts t where t.status in ('active','dormant')
  on conflict (account_id, day) do update set cash = excluded.cash, holdings_value = excluded.holdings_value, positions_mtm = excluded.positions_mtm, benchmark_level = excluded.benchmark_level;
  update portfolio_snapshots set total = cash + holdings_value + positions_mtm where day = (now() at time zone 'Asia/Kolkata')::date;
  get diagnostics n = row_count; return n;
end $$;

-- FIFO capital gains for delivery trades within a financial year window; MIS trades are reported as speculative intraday.
create or replace function capital_gains(p_account uuid, p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r record; lots jsonb := '{}'::jsonb; v_out jsonb := '[]'::jsonb; v_lots jsonb; v_remaining int; v_lot jsonb; v_take int; v_days int; v_gain numeric; v_stcg numeric := 0; v_ltcg numeric := 0; v_spec numeric := 0;
begin
  if not exists (select 1 from trading_accounts where id = p_account and (user_id = auth.uid() or is_staff() or user_id in (select owner_id from portfolio_viewers where viewer_id = auth.uid() and status='active'))) then raise exception 'FORBIDDEN'; end if;
  for r in select t.*, i.symbol from trades t join instruments i on i.id = t.instrument_id where t.account_id = p_account and t.product='CNC' order by t.traded_at loop
    v_lots := coalesce(lots->r.symbol, '[]'::jsonb);
    if r.side = 'BUY' then
      lots := jsonb_set(lots, array[r.symbol], v_lots || jsonb_build_object('qty', r.qty, 'price', r.price, 'at', r.traded_at, 'charges', r.total_charges));
    else
      v_remaining := r.qty;
      while v_remaining > 0 and jsonb_array_length(v_lots) > 0 loop
        v_lot := v_lots->0; v_take := least(v_remaining, (v_lot->>'qty')::int);
        v_days := (r.traded_at::date - (v_lot->>'at')::timestamptz::date);
        v_gain := round(v_take * (r.price - (v_lot->>'price')::numeric) - r.total_charges * v_take / r.qty - (v_lot->>'charges')::numeric * v_take / (v_lot->>'qty')::int, 2);
        if r.traded_at::date between p_from and p_to then
          v_out := v_out || jsonb_build_object('symbol', r.symbol, 'qty', v_take, 'buy_date', (v_lot->>'at')::timestamptz::date, 'buy_price', v_lot->>'price', 'sell_date', r.traded_at::date, 'sell_price', r.price, 'holding_days', v_days, 'class', case when v_days > 365 then 'LTCG' else 'STCG' end, 'gain', v_gain);
          if v_days > 365 then v_ltcg := v_ltcg + v_gain; else v_stcg := v_stcg + v_gain; end if;
        end if;
        v_remaining := v_remaining - v_take;
        if (v_lot->>'qty')::int > v_take then v_lots := jsonb_set(v_lots, '{0,qty}', to_jsonb((v_lot->>'qty')::int - v_take)); else v_lots := v_lots - 0; end if;
      end loop;
      lots := jsonb_set(lots, array[r.symbol], v_lots);
    end if;
  end loop;
  select coalesce(sum(realized_pnl),0) into v_spec from positions where account_id = p_account and product='MIS' and trading_day between p_from and p_to;
  return jsonb_build_object('from', p_from, 'to', p_to, 'rows', v_out, 'stcg', v_stcg, 'ltcg', v_ltcg, 'speculative_intraday', v_spec, 'open_lots', lots,
    'note', 'FIFO matching on delivery trades with proportionate charges; intraday reported as speculative business income. Grandfathering, exemptions, indexation and rates are not applied: education, not tax advice.');
end $$;

-- Contract note for a trading day
create or replace function contract_note(p_account uuid, p_day date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare a trading_accounts; p profiles;
begin
  select * into a from trading_accounts where id = p_account and (user_id = auth.uid() or is_staff());
  if a.id is null then raise exception 'FORBIDDEN'; end if;
  select * into p from profiles where id = a.user_id;
  return jsonb_build_object('client_code', a.client_code, 'client_name', p.full_name, 'ucc', a.ucc, 'demat', a.demat_id, 'day', p_day, 'note_no', 'CN-SIM-'||to_char(p_day,'YYYYMMDD')||'-'||right(a.client_code,4), 'environment', 'sandbox',
    'trades', (select coalesce(jsonb_agg(jsonb_build_object('time', t.traded_at, 'order_id', t.order_id, 'exchange_trade_id', t.exchange_trade_id, 'symbol', i.symbol, 'side', t.side, 'product', t.product, 'qty', t.qty, 'price', t.price, 'value', t.value, 'brokerage', t.brokerage, 'stt', t.stt, 'exchange_txn', t.exchange_txn, 'sebi_fee', t.sebi_fee, 'stamp_duty', t.stamp_duty, 'gst', t.gst, 'total_charges', t.total_charges) order by t.traded_at),'[]') from trades t join instruments i on i.id = t.instrument_id where t.account_id = p_account and t.traded_at::date = p_day),
    'totals', (select jsonb_build_object('buy_value', coalesce(sum(case when side='BUY' then value end),0), 'sell_value', coalesce(sum(case when side='SELL' then value end),0), 'brokerage', coalesce(sum(brokerage),0), 'stt', coalesce(sum(stt),0), 'exchange_txn', coalesce(sum(exchange_txn),0), 'sebi_fee', coalesce(sum(sebi_fee),0), 'stamp_duty', coalesce(sum(stamp_duty),0), 'gst', coalesce(sum(gst),0), 'total_charges', coalesce(sum(total_charges),0), 'net_obligation', coalesce(sum(case when side='BUY' then -(value + total_charges) else value - total_charges end),0)) from trades where account_id = p_account and traded_at::date = p_day),
    'disclaimer', 'Simulated contract note from the AIRAVAT sandbox: no exchange, clearing or depository involvement. Not a tax document.');
end $$;

-- Pledge / unpledge: pledged quantity leaves free holdings (so it cannot be sold) and counts as collateral after haircut.
create or replace function pledge_holdings(p_symbol text, p_qty int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a trading_accounts; i instruments; h holdings; v_id bigint; v_open int; q quotes;
begin
  select * into a from trading_accounts where user_id = auth.uid() and environment='sandbox' and status='active';
  if a.id is null then raise exception 'ACCOUNT_NOT_ACTIVE'; end if;
  select * into i from instruments where symbol = upper(p_symbol); if i.id is null then raise exception 'INSTRUMENT_NOT_FOUND'; end if;
  select * into h from holdings where account_id = a.id and instrument_id = i.id for update;
  select coalesce(sum(qty - filled_qty),0) into v_open from orders where account_id = a.id and instrument_id = i.id and side='SELL' and product='CNC' and status in ('ACKNOWLEDGED','PARTIALLY_FILLED');
  if h.qty is null or h.qty - v_open < p_qty or p_qty <= 0 then raise exception 'INSUFFICIENT_FREE_HOLDINGS'; end if;
  update holdings set qty = qty - p_qty, updated_at = now() where account_id = a.id and instrument_id = i.id;
  insert into pledges(account_id, instrument_id, qty, reference) values (a.id, i.id, p_qty, 'PLG-SIM-'||substr(md5(random()::text),1,8)) returning id into v_id;
  select * into q from quotes where instrument_id = i.id;
  perform audit('pledge.created','pledge',v_id::text,null,jsonb_build_object('symbol',i.symbol,'qty',p_qty,'simulated',true));
  return jsonb_build_object('pledge_id', v_id, 'collateral_value', round(p_qty * q.ltp * 0.8, 2), 'haircut_pct', 20, 'charge_note', 'Pledge charge Rs 30 + GST is a published reference item and is not debited in the sandbox.', 'simulated', true);
end $$;
create or replace function unpledge_holdings(p_pledge bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pl pledges; a trading_accounts;
begin
  select * into pl from pledges where id = p_pledge for update;
  if pl.id is null then raise exception 'NOT_FOUND'; end if;
  select * into a from trading_accounts where id = pl.account_id;
  if a.user_id <> auth.uid() and not is_staff() then raise exception 'FORBIDDEN'; end if;
  if pl.status <> 'pledged' then raise exception 'ALREADY_RELEASED'; end if;
  update pledges set status='released', released_at = now() where id = p_pledge;
  insert into holdings(account_id, instrument_id, qty, avg_price) values (pl.account_id, pl.instrument_id, pl.qty, 0)
    on conflict (account_id, instrument_id) do update set qty = holdings.qty + excluded.qty, updated_at = now();
  perform audit('pledge.released','pledge',p_pledge::text,null,null);
  return jsonb_build_object('pledge_id', p_pledge, 'status', 'released');
end $$;
create or replace function collateral_summary(p_account uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('pledged', coalesce(jsonb_agg(jsonb_build_object('pledge_id', p.id, 'symbol', i.symbol, 'qty', p.qty, 'ltp', q.ltp, 'haircut_pct', p.haircut_pct, 'collateral_value', round(p.qty * q.ltp * (1 - p.haircut_pct/100), 2), 'pledged_at', p.pledged_at)), '[]'),
    'collateral_value', coalesce(sum(round(p.qty * q.ltp * (1 - p.haircut_pct/100), 2)),0), 'note', 'Collateral is tracked and reported; it is not yet used as margin because F&O is not enabled.')
  from pledges p join instruments i on i.id = p.instrument_id join quotes q on q.instrument_id = p.instrument_id
  where p.account_id = p_account and p.status='pledged' and exists (select 1 from trading_accounts t where t.id = p_account and (t.user_id = auth.uid() or is_staff()))
$$;

-- MTF (sandbox): convert part of a delivery holding to broker-funded; 50% funded; 18% p.a. accrued daily; close repays.
create or replace function mtf_convert(p_symbol text, p_qty int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a trading_accounts; i instruments; h holdings; q quotes; v_funded numeric; v_id bigint;
begin
  select * into a from trading_accounts where user_id = auth.uid() and environment='sandbox' and status='active';
  if a.id is null then raise exception 'ACCOUNT_NOT_ACTIVE'; end if;
  if not exists (select 1 from consents c join legal_documents d on d.id = c.document_id where c.user_id = auth.uid() and d.slug = 'mtf-agreement') then raise exception 'MTF_AGREEMENT_REQUIRED'; end if;
  select * into i from instruments where symbol = upper(p_symbol); select * into q from quotes where instrument_id = i.id;
  select * into h from holdings where account_id = a.id and instrument_id = i.id for update;
  if h.qty is null or h.qty < p_qty or p_qty <= 0 then raise exception 'INSUFFICIENT_HOLDINGS'; end if;
  v_funded := round(p_qty * q.ltp * 0.5, 2);
  update holdings set qty = qty - p_qty, updated_at = now() where account_id = a.id and instrument_id = i.id;
  insert into mtf_positions(account_id, instrument_id, qty, funded_amount, last_accrual) values (a.id, i.id, p_qty, v_funded, current_date) returning id into v_id;
  perform post_journal('mtf_funding', v_id::text, 'MTF funding '||i.symbol||' x'||p_qty||' (simulated)', jsonb_build_array(jsonb_build_object('code','1300','debit',v_funded), jsonb_build_object('code','C-'||a.client_code,'credit',v_funded)));
  perform audit('mtf.opened','mtf_position',v_id::text,null,jsonb_build_object('symbol',i.symbol,'qty',p_qty,'funded',v_funded,'simulated',true));
  return jsonb_build_object('mtf_id', v_id, 'funded_amount', v_funded, 'interest_rate_pct', 18, 'simulated', true);
end $$;
create or replace function mtf_close(p_id bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare m mtf_positions; a trading_accounts; funds jsonb;
begin
  select * into m from mtf_positions where id = p_id for update;
  if m.id is null then raise exception 'NOT_FOUND'; end if;
  select * into a from trading_accounts where id = m.account_id;
  if a.user_id <> auth.uid() and not is_staff() then raise exception 'FORBIDDEN'; end if;
  if m.status <> 'open' then raise exception 'ALREADY_CLOSED'; end if;
  funds := account_funds(a.id);
  if (funds->>'available')::numeric < m.funded_amount then raise exception 'INSUFFICIENT_FUNDS_TO_REPAY'; end if;
  perform post_journal('mtf_repayment', m.id::text, 'MTF repayment (simulated)', jsonb_build_array(jsonb_build_object('code','C-'||a.client_code,'debit',m.funded_amount), jsonb_build_object('code','1300','credit',m.funded_amount)));
  insert into holdings(account_id, instrument_id, qty, avg_price) values (m.account_id, m.instrument_id, m.qty, 0) on conflict (account_id, instrument_id) do update set qty = holdings.qty + excluded.qty, updated_at = now();
  update mtf_positions set status='closed', closed_at = now() where id = p_id;
  perform audit('mtf.closed','mtf_position',p_id::text,null,jsonb_build_object('interest_accrued', m.interest_accrued));
  return jsonb_build_object('mtf_id', p_id, 'repaid', m.funded_amount, 'interest_paid_to_date', m.interest_accrued);
end $$;
create or replace function accrue_mtf_interest() returns int
language plpgsql security definer set search_path = public as $$
declare m record; v_int numeric; n int := 0; a trading_accounts;
begin
  for m in select * from mtf_positions where status='open' and (last_accrual is null or last_accrual < current_date) loop
    v_int := round(m.funded_amount * m.interest_rate_pct / 100 / 365, 2);
    if v_int > 0 then
      select * into a from trading_accounts where id = m.account_id;
      perform post_journal('mtf_interest', m.id::text||':'||current_date, 'MTF interest (simulated)', jsonb_build_array(jsonb_build_object('code','C-'||a.client_code,'debit',v_int), jsonb_build_object('code','4300','credit',v_int)));
      update mtf_positions set interest_accrued = interest_accrued + v_int, last_accrual = current_date where id = m.id; n := n + 1;
    end if;
  end loop;
  return n;
end $$;

-- Family / authorised views
create or replace function grant_portfolio_view(p_email text) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_viewer uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if lower(p_email) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'INVALID_EMAIL'; end if;
  select id into v_viewer from profiles where lower(email) = lower(p_email);
  insert into portfolio_viewers(owner_id, viewer_email, viewer_id, status) values (auth.uid(), lower(p_email), v_viewer, case when v_viewer is null then 'invited' else 'active' end)
  on conflict (owner_id, viewer_email) do update set status = case when excluded.viewer_id is null then 'invited' else 'active' end, viewer_id = excluded.viewer_id returning id into v_id;
  perform audit('portfolio.view.granted','portfolio_viewer',v_id::text,null,jsonb_build_object('viewer', lower(p_email)));
  return v_id;
end $$;
create or replace function revoke_portfolio_view(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$ begin update portfolio_viewers set status='revoked' where id = p_id and owner_id = auth.uid(); perform audit('portfolio.view.revoked','portfolio_viewer',p_id::text,null,null); end $$;
create or replace function family_portfolio(p_owner uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare a trading_accounts;
begin
  if not exists (select 1 from portfolio_viewers where owner_id = p_owner and viewer_id = auth.uid() and status='active') and not is_staff() then raise exception 'FORBIDDEN'; end if;
  select * into a from trading_accounts where user_id = p_owner and environment='sandbox';
  return jsonb_build_object('owner', (select full_name from profiles where id = p_owner), 'client_code', a.client_code, 'funds', jsonb_build_object('ledger_balance', account_ledger_balance(a.id)),
    'holdings', (select coalesce(jsonb_agg(jsonb_build_object('symbol', i.symbol, 'qty', h.qty, 'avg_price', h.avg_price, 'ltp', q.ltp, 'value', round(h.qty*q.ltp,2))), '[]') from holdings h join instruments i on i.id=h.instrument_id join quotes q on q.instrument_id=h.instrument_id where h.account_id = a.id and h.qty <> 0),
    'positions', (select coalesce(jsonb_agg(jsonb_build_object('symbol', i.symbol, 'product', p.product, 'net_qty', p.net_qty, 'avg_price', p.avg_price, 'ltp', q.ltp)), '[]') from positions p join instruments i on i.id=p.instrument_id join quotes q on q.instrument_id=p.instrument_id where p.account_id = a.id and p.net_qty <> 0),
    'read_only', true);
end $$;
-- link invited viewers when they sign up (extends handle_new_user via a separate trigger to keep the original untouched)
create or replace function link_portfolio_viewer() returns trigger language plpgsql security definer set search_path = public as $$
begin update portfolio_viewers set viewer_id = new.id, status = 'active' where lower(viewer_email) = lower(new.email) and status = 'invited'; return new; end $$;
drop trigger if exists trg_link_portfolio_viewer on profiles;
create trigger trg_link_portfolio_viewer after insert on profiles for each row execute function link_portfolio_viewer();

insert into legal_documents(slug, title, version, body_md, content_hash, mandatory, effective_from)
select 'mtf-agreement', 'Margin Trading Facility agreement (sandbox draft)', 1, b, md5(b), false, now()
from (select E'## Margin Trading Facility (sandbox draft)

The broker funds up to 50% of an eligible delivery purchase against the shares as collateral. Interest accrues daily at the published rate and is debited to the ledger. Funded shares are held under lien and cannot be sold or transferred until the funding is repaid. Shortfalls may be met by sale of collateral after notice. This is a draft for the sandbox and is not a legally reviewed agreement.' as b) x
where not exists (select 1 from legal_documents where slug = 'mtf-agreement');

revoke execute on function snapshot_portfolios() from public, anon, authenticated;
revoke execute on function capital_gains(uuid, date, date) from public, anon;
revoke execute on function contract_note(uuid, date) from public, anon;
revoke execute on function pledge_holdings(text, int) from public, anon;
revoke execute on function unpledge_holdings(bigint) from public, anon;
revoke execute on function collateral_summary(uuid) from public, anon;
revoke execute on function mtf_convert(text, int) from public, anon;
revoke execute on function mtf_close(bigint) from public, anon;
revoke execute on function accrue_mtf_interest() from public, anon, authenticated;
revoke execute on function grant_portfolio_view(text) from public, anon;
revoke execute on function revoke_portfolio_view(bigint) from public, anon;
revoke execute on function family_portfolio(uuid) from public, anon;
select cron.schedule('airavat-portfolio-snapshots', '35 10 * * 1-5', $$select public.snapshot_portfolios()$$);
select cron.schedule('airavat-mtf-interest', '15 18 * * *', $$select public.accrue_mtf_interest()$$);
select snapshot_portfolios();
