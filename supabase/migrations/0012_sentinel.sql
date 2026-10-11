-- AIRAVAT | Migration 0011: Sentinel X — deterministic early-warning scan, trade health, pre-mortem, decision twin,
-- "what changed" digest. Alerts are explainable observations; never predictions. Strictly additive.

create type alert_severity as enum ('critical','warning','opportunity','info');
create table sentinel_alerts (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  account_id uuid references trading_accounts(id),
  severity alert_severity not null,
  kind text not null,
  instrument_id int references instruments(id),
  title text not null,
  body text not null,
  evidence jsonb not null,
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  unique (user_id, dedupe_key)
);
create index on sentinel_alerts(user_id, created_at desc);

create table sentinel_preferences (
  user_id uuid primary key references profiles(id) on delete cascade,
  concentration_warn_pct numeric(6,2) not null default 40,
  position_drawdown_warn_pct numeric(6,2) not null default 5,
  funds_utilization_warn_pct numeric(6,2) not null default 80,
  opportunity_alerts boolean not null default true,
  quiet_hours text,
  updated_at timestamptz not null default now()
);

-- Trade health for an account's open positions (explainable factors; not a probability of failure)
create or replace function trade_health(p_account uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb := '[]'::jsonb; r record; v_total numeric; v_score int; v_factors jsonb;
begin
  if not exists (select 1 from trading_accounts where id = p_account and (user_id = auth.uid() or is_staff())) then raise exception 'FORBIDDEN'; end if;
  select coalesce(sum(abs(p.net_qty) * q.ltp),0) into v_total from positions p join quotes q on q.instrument_id = p.instrument_id where p.account_id = p_account and p.net_qty <> 0;
  for r in select p.*, q.ltp, i.symbol, m.atr_pct_14, m.vol_ratio, m.rsi_14, m.ret_20d from positions p join quotes q on q.instrument_id = p.instrument_id join instruments i on i.id = p.instrument_id
           left join instrument_metrics m on m.instrument_id = p.instrument_id where p.account_id = p_account and p.net_qty <> 0 loop
    declare v_pnl_pct numeric := round(((r.ltp - r.avg_price) / nullif(r.avg_price,0)) * 100 * sign(r.net_qty::numeric), 2);
            v_conc numeric := round(abs(r.net_qty) * r.ltp / nullif(v_total,0) * 100, 1);
    begin
      v_score := 100; v_factors := '[]'::jsonb;
      if v_pnl_pct <= -5 then v_score := v_score - 30; v_factors := v_factors || jsonb_build_object('factor','drawdown','value',v_pnl_pct,'impact',-30,'note','Position is down more than 5% from average cost');
      elsif v_pnl_pct <= -2 then v_score := v_score - 12; v_factors := v_factors || jsonb_build_object('factor','drawdown','value',v_pnl_pct,'impact',-12,'note','Position is down more than 2%'); end if;
      if v_conc >= 40 then v_score := v_score - 20; v_factors := v_factors || jsonb_build_object('factor','concentration','value',v_conc,'impact',-20,'note','Position is 40%+ of open exposure'); end if;
      if coalesce(r.atr_pct_14,0) >= 3 then v_score := v_score - 15; v_factors := v_factors || jsonb_build_object('factor','volatility','value',r.atr_pct_14,'impact',-15,'note','ATR above 3% of price'); end if;
      if coalesce(r.vol_ratio,1) < 0.5 then v_score := v_score - 10; v_factors := v_factors || jsonb_build_object('factor','liquidity','value',r.vol_ratio,'impact',-10,'note','Volume well below 20-day average (exit cost may rise)'); end if;
      if r.product = 'MIS' then v_score := v_score - 10; v_factors := v_factors || jsonb_build_object('factor','intraday_expiry','value','EOD square-off','impact',-10,'note','MIS position will be squared off at end of day'); end if;
      if (r.net_qty > 0 and coalesce(r.rsi_14,50) > 70) or (r.net_qty < 0 and coalesce(r.rsi_14,50) < 30) then v_score := v_score - 5; v_factors := v_factors || jsonb_build_object('factor','extended','value',r.rsi_14,'impact',-5,'note','RSI extended in the direction of the position'); end if;
      v := v || jsonb_build_object('symbol', r.symbol, 'product', r.product, 'net_qty', r.net_qty, 'avg_price', r.avg_price, 'ltp', r.ltp, 'pnl_pct', v_pnl_pct, 'concentration_pct', v_conc,
        'health_index', greatest(v_score, 0), 'factors', v_factors, 'as_of', now(), 'data_source', 'SIMULATED', 'disclaimer', 'Explainable factor score, not a calibrated probability of loss.');
    end;
  end loop;
  return v;
end $$;

-- Pre-mortem: deterministic checks on a proposed order before confirmation
create or replace function premortem(p_symbol text, p_side order_side, p_product product_type, p_qty int) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare a trading_accounts; i instruments; q quotes; m instrument_metrics; funds jsonb; v_value numeric; v_total numeric; v_checks jsonb := '[]'::jsonb; v_conc numeric; v_req numeric; rl risk_limits;
begin
  select * into a from trading_accounts where user_id = auth.uid() and environment='sandbox';
  if a.id is null then return jsonb_build_object('ok', false, 'reason', 'NO_TRADING_ACCOUNT'); end if;
  select * into i from instruments where symbol = p_symbol; select * into q from quotes where instrument_id = i.id; select * into m from instrument_metrics where instrument_id = i.id;
  select * into rl from risk_limits where scope='global';
  funds := account_funds(a.id);
  v_value := round(p_qty * q.ltp, 2);
  select coalesce(sum(abs(p.net_qty) * qq.ltp),0) into v_total from positions p join quotes qq on qq.instrument_id = p.instrument_id where p.account_id = a.id and p.net_qty <> 0;
  v_conc := round(v_value / nullif(v_total + v_value,0) * 100, 1);
  v_req := case when p_side='BUY' and p_product='CNC' then v_value else round(v_value * rl.mis_margin_pct/100,2) end;
  v_checks := v_checks || jsonb_build_object('check','concentration','value',v_conc,'flag', v_conc >= 40, 'note', 'This order would make '||i.symbol||' '||v_conc||'% of your open exposure');
  v_checks := v_checks || jsonb_build_object('check','funds_utilization','value', round(v_req / nullif((funds->>'available')::numeric,0) * 100, 1), 'flag', v_req > 0.8 * (funds->>'available')::numeric, 'note', 'Margin/cash required vs available funds');
  v_checks := v_checks || jsonb_build_object('check','volatility','value', m.atr_pct_14, 'flag', coalesce(m.atr_pct_14,0) >= 3, 'note', 'Average true range as % of price (14 sessions)');
  v_checks := v_checks || jsonb_build_object('check','liquidity','value', m.vol_ratio, 'flag', coalesce(m.vol_ratio,1) < 0.5, 'note', 'Today''s volume vs 20-day average');
  v_checks := v_checks || jsonb_build_object('check','extended_move','value', m.ret_5d, 'flag', (p_side='BUY' and coalesce(m.ret_5d,0) >= 8) or (p_side='SELL' and coalesce(m.ret_5d,0) <= -8), 'note', '5-day move already large in the direction of the trade');
  v_checks := v_checks || jsonb_build_object('check','intraday_square_off','value', p_product, 'flag', p_product='MIS', 'note', 'MIS positions are squared off at end of day regardless of P&L');
  v_checks := v_checks || jsonb_build_object('check','market_session','value', market_status()->>'status', 'flag', not (market_status()->>'accepting_orders')::boolean, 'note', 'Session status at the time of review');
  return jsonb_build_object('ok', true, 'symbol', i.symbol, 'order_value', v_value, 'checks', v_checks, 'flags', (select count(*) from jsonb_array_elements(v_checks) c where (c->>'flag')::boolean),
    'data_source', 'SIMULATED', 'disclaimer', 'Pre-mortem lists plausible reasons a trade could go wrong. It is not a prediction or a recommendation.');
end $$;

-- Decision twin: compare hold / reduce half / close for an open position (costs and exposure deltas; hypothetical)
create or replace function decision_twin(p_symbol text, p_product product_type) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare a trading_accounts; p positions; q quotes; i instruments; v_total numeric; v_opts jsonb := '[]'::jsonb; k record;
begin
  select * into a from trading_accounts where user_id = auth.uid() and environment='sandbox';
  if a.id is null then raise exception 'NO_TRADING_ACCOUNT'; end if;
  select * into i from instruments where symbol = p_symbol; select * into q from quotes where instrument_id = i.id;
  select * into p from positions where account_id = a.id and instrument_id = i.id and product = p_product and net_qty <> 0 and trading_day = (now() at time zone 'Asia/Kolkata')::date;
  if p.account_id is null then raise exception 'NO_OPEN_POSITION'; end if;
  select coalesce(sum(abs(pp.net_qty) * qq.ltp),0) into v_total from positions pp join quotes qq on qq.instrument_id = pp.instrument_id where pp.account_id = a.id and pp.net_qty <> 0;
  for k in select * from (values ('hold', 0), ('reduce_half', (abs(p.net_qty)/2)::int), ('close', abs(p.net_qty))) as t(name, qty) loop
    declare v_px numeric := case when p.net_qty > 0 then coalesce(q.bid,q.ltp) else coalesce(q.ask,q.ltp) end;
            v_val numeric := round(k.qty * v_px, 2); v_ch numeric := case when k.qty = 0 then 0 else (compute_charges_v2(a.id, p_product, (case when p.net_qty > 0 then 'SELL' else 'BUY' end)::order_side, v_val)->>'total')::numeric end;
            v_realized numeric := round((v_px - p.avg_price) * k.qty * sign(p.net_qty::numeric), 2); v_remaining int := abs(p.net_qty) - k.qty;
    begin
      v_opts := v_opts || jsonb_build_object('option', k.name, 'qty', k.qty, 'exit_price', v_px, 'estimated_charges', v_ch, 'realized_pnl', v_realized - v_ch,
        'remaining_qty', v_remaining, 'remaining_exposure', round(v_remaining * q.ltp, 2),
        'exposure_pct_after', round(v_remaining * q.ltp / nullif(v_total - abs(p.net_qty) * q.ltp + v_remaining * q.ltp, 0) * 100, 1),
        'one_pct_move_impact_after', round(v_remaining * q.ltp * 0.01, 2));
    end;
  end loop;
  return jsonb_build_object('symbol', i.symbol, 'product', p_product, 'net_qty', p.net_qty, 'avg_price', p.avg_price, 'ltp', q.ltp, 'options', v_opts,
    'hypothetical', true, 'disclaimer', 'Scenario costs use current simulated quotes and the sandbox charge schedule. No order is placed from this screen.');
end $$;

-- Sentinel scan: evaluates every active account and watchlist; dedupes per user per day
create or replace function sentinel_scan() returns jsonb
language plpgsql security definer set search_path = public as $$
declare a record; r record; n int := 0; v_day text := to_char(now() at time zone 'Asia/Kolkata','YYYY-MM-DD'); rl risk_limits; funds jsonb; v_total numeric; pref sentinel_preferences;
begin
  select * into rl from risk_limits where scope='global';
  for a in select t.*, p.id as uid from trading_accounts t join profiles p on p.id = t.user_id where t.status='active' loop
    select * into pref from sentinel_preferences where user_id = a.user_id;
    if rl.kill_switch then
      insert into sentinel_alerts(user_id, account_id, severity, kind, title, body, evidence, dedupe_key) values (a.user_id, a.id, 'critical', 'kill_switch', 'Trading halted by risk desk', 'New orders are being rejected while the broker-wide kill switch is active. Open positions are not closed automatically.', jsonb_build_object('kill_switch', true, 'at', now()), 'kill_switch:'||v_day) on conflict do nothing; n := n + 1;
    end if;
    funds := account_funds(a.id);
    if (funds->>'ledger_balance')::numeric > 0 and ((funds->>'blocked_for_orders')::numeric + (funds->>'margin_used')::numeric) / (funds->>'ledger_balance')::numeric * 100 >= coalesce(pref.funds_utilization_warn_pct, 80) then
      insert into sentinel_alerts(user_id, account_id, severity, kind, title, body, evidence, dedupe_key) values (a.user_id, a.id, 'warning', 'funds_utilization', 'High funds utilization', 'Blocked margin and open-order holds exceed '||coalesce(pref.funds_utilization_warn_pct,80)||'% of your ledger balance.', funds, 'funds_utilization:'||v_day) on conflict do nothing; n := n + 1;
    end if;
    select coalesce(sum(abs(p.net_qty) * q.ltp),0) into v_total from positions p join quotes q on q.instrument_id = p.instrument_id where p.account_id = a.id and p.net_qty <> 0;
    for r in select p.*, q.ltp, i.symbol, m.atr_pct_14, m.vol_ratio from positions p join quotes q on q.instrument_id = p.instrument_id join instruments i on i.id = p.instrument_id left join instrument_metrics m on m.instrument_id = p.instrument_id
             where p.account_id = a.id and p.net_qty <> 0 loop
      declare v_pnl_pct numeric := round(((r.ltp - r.avg_price) / nullif(r.avg_price,0)) * 100 * sign(r.net_qty::numeric), 2); v_conc numeric := round(abs(r.net_qty) * r.ltp / nullif(v_total,0) * 100, 1);
      begin
        if v_pnl_pct <= -coalesce(pref.position_drawdown_warn_pct, 5) then
          insert into sentinel_alerts(user_id, account_id, severity, kind, instrument_id, title, body, evidence, dedupe_key) values (a.user_id, a.id, 'warning', 'position_drawdown', r.instrument_id, r.symbol||' position down '||abs(v_pnl_pct)||'%', 'Marked to the simulated LTP '||r.ltp||' against average '||round(r.avg_price,2)||'. Review the thesis, the stop and the exposure.', jsonb_build_object('pnl_pct',v_pnl_pct,'ltp',r.ltp,'avg',r.avg_price,'data_source','SIMULATED'), 'position_drawdown:'||r.symbol||':'||v_day) on conflict do nothing; n := n + 1;
        end if;
        if v_conc >= coalesce(pref.concentration_warn_pct, 40) then
          insert into sentinel_alerts(user_id, account_id, severity, kind, instrument_id, title, body, evidence, dedupe_key) values (a.user_id, a.id, 'warning', 'concentration', r.instrument_id, r.symbol||' is '||v_conc||'% of open exposure', 'A single instrument dominates the book; a 1% move changes P&L by about Rs '||round(abs(r.net_qty) * r.ltp * 0.01, 0)||'.', jsonb_build_object('concentration_pct', v_conc, 'exposure', abs(r.net_qty) * r.ltp), 'concentration:'||r.symbol||':'||v_day) on conflict do nothing; n := n + 1;
        end if;
        if coalesce(r.atr_pct_14,0) >= 3 then
          insert into sentinel_alerts(user_id, account_id, severity, kind, instrument_id, title, body, evidence, dedupe_key) values (a.user_id, a.id, 'info', 'volatility', r.instrument_id, 'Elevated volatility in '||r.symbol, 'ATR(14) is '||r.atr_pct_14||'% of price. Position sizing and stops may need review.', jsonb_build_object('atr_pct', r.atr_pct_14), 'volatility:'||r.symbol||':'||v_day) on conflict do nothing; n := n + 1;
        end if;
      end;
    end loop;
    -- opportunities on watchlist instruments from system scanners (today)
    if coalesce(pref.opportunity_alerts, true) then
      for r in select distinct s.name sname, s.description, i.symbol, sr.instrument_id, sr.evidence from watchlist_items wi join watchlists w on w.id = wi.watchlist_id
               join scanner_results sr on sr.instrument_id = wi.instrument_id and sr.as_of_day = (now() at time zone 'Asia/Kolkata')::date
               join scanners s on s.id = sr.scanner_id and s.kind='system' and s.category in ('breakout','momentum','volume') join instruments i on i.id = sr.instrument_id
               where w.user_id = a.user_id loop
        insert into sentinel_alerts(user_id, account_id, severity, kind, instrument_id, title, body, evidence, dedupe_key) values (a.user_id, a.id, 'opportunity', 'scanner', r.instrument_id, r.sname||': '||r.symbol, r.description||' Outcome uncertain; this is a research observation, not a recommendation.', r.evidence, 'scanner:'||r.sname||':'||r.symbol||':'||v_day) on conflict do nothing; n := n + 1;
      end loop;
    end if;
  end loop;
  delete from sentinel_alerts where created_at < now() - interval '45 days';
  return jsonb_build_object('alerts_evaluated', n, 'at', now());
end $$;
revoke execute on function sentinel_scan() from public, anon, authenticated;

create or replace function acknowledge_alert(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  update sentinel_alerts set acknowledged_at = now() where id = p_id and user_id = auth.uid();
end $$;

create or replace function set_sentinel_preferences(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  insert into sentinel_preferences(user_id, concentration_warn_pct, position_drawdown_warn_pct, funds_utilization_warn_pct, opportunity_alerts, quiet_hours, updated_at)
  values (auth.uid(), coalesce((p->>'concentration_warn_pct')::numeric,40), coalesce((p->>'position_drawdown_warn_pct')::numeric,5), coalesce((p->>'funds_utilization_warn_pct')::numeric,80), coalesce((p->>'opportunity_alerts')::boolean,true), p->>'quiet_hours', now())
  on conflict (user_id) do update set concentration_warn_pct = excluded.concentration_warn_pct, position_drawdown_warn_pct = excluded.position_drawdown_warn_pct, funds_utilization_warn_pct = excluded.funds_utilization_warn_pct, opportunity_alerts = excluded.opportunity_alerts, quiet_hours = excluded.quiet_hours, updated_at = now();
end $$;

-- What changed since yesterday (per user)
create or replace function what_changed(p_since timestamptz default now() - interval '1 day') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare a trading_accounts; v jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into a from trading_accounts where user_id = auth.uid() and environment='sandbox';
  select jsonb_build_object(
    'since', p_since,
    'watchlist_moves', (select coalesce(jsonb_agg(jsonb_build_object('symbol', i.symbol, 'ltp', q.ltp, 'change_pct', round((q.ltp/nullif(q.prev_close,0)-1)*100,2)) order by abs(q.ltp/nullif(q.prev_close,0)-1) desc), '[]'::jsonb)
        from watchlist_items wi join watchlists w on w.id = wi.watchlist_id join instruments i on i.id = wi.instrument_id join quotes q on q.instrument_id = i.id where w.user_id = auth.uid()),
    'alerts', (select coalesce(jsonb_agg(jsonb_build_object('severity', severity, 'title', title, 'created_at', created_at) order by created_at desc), '[]'::jsonb) from sentinel_alerts where user_id = auth.uid() and created_at >= p_since),
    'orders', (select count(*) from orders where user_id = auth.uid() and created_at >= p_since),
    'fills', (select count(*) from trades t where t.account_id = a.id and t.traded_at >= p_since),
    'open_positions', (select count(*) from positions where account_id = a.id and net_qty <> 0),
    'funds', case when a.id is null then null else account_funds(a.id) end,
    'new_articles', (select count(*) from articles where status='published' and published_at >= p_since),
    'market', market_status(), 'data_source', 'SIMULATED') into v;
  return v;
end $$;

alter table sentinel_alerts enable row level security;
alter table sentinel_preferences enable row level security;
create policy "alerts own" on sentinel_alerts for select using (user_id = auth.uid() or is_staff());
create policy "prefs own" on sentinel_preferences for select using (user_id = auth.uid() or is_staff());
revoke insert, update, delete on sentinel_alerts, sentinel_preferences from anon, authenticated;
revoke execute on function trade_health(uuid) from public, anon;
revoke execute on function premortem(text, order_side, product_type, int) from public, anon;
revoke execute on function decision_twin(text, product_type) from public, anon;
revoke execute on function acknowledge_alert(bigint) from public, anon;
revoke execute on function set_sentinel_preferences(jsonb) from public, anon;
revoke execute on function what_changed(timestamptz) from public, anon;

select cron.schedule('airavat-sentinel', '2-59/5 * * * *', $$select public.sentinel_scan()$$);
