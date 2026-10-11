-- 0026: back office (settlement obligations, margin shortfalls, exceptions/refunds with maker-checker) and the
-- independent RMS (per-account limits enforced in place_order, fat-finger rules, real-time MTM scan with auto-block,
-- surveillance flags, stress test). Additive: the original place_order logic is kept verbatim and extended.

-- ---------------------------------------------------------------- risk limits: per-account rows and fat-finger thresholds
alter table risk_limits add column if not exists fat_finger_price_pct numeric(6,2) not null default 10;
alter table risk_limits add column if not exists fat_finger_volume_pct numeric(6,2) not null default 10;
alter table risk_limits add column if not exists auto_blocked boolean not null default false;
alter table risk_limits add column if not exists block_reason text;
drop policy if exists "risk read" on risk_limits;
create policy "risk read global" on risk_limits for select using (auth.uid() is not null and scope = 'global');
create policy "risk read own or staff" on risk_limits for select using (scope = 'account' and (is_staff() or account_id in (select id from trading_accounts where user_id = auth.uid())));

create or replace function set_account_risk_limits(p_account uuid, p jsonb) returns risk_limits
language plpgsql security definer set search_path = public as $$
declare g risk_limits; v_old risk_limits; v_new risk_limits;
begin
  if current_app_role() not in ('risk','admin','super_admin') then raise exception 'FORBIDDEN'; end if;
  select * into g from risk_limits where scope='global';
  select * into v_old from risk_limits where scope='account' and account_id = p_account;
  insert into risk_limits(scope, account_id, max_order_value, max_order_qty, max_position_value, max_daily_loss, mis_margin_pct, allow_mis, kill_switch, fat_finger_price_pct, fat_finger_volume_pct, auto_blocked, block_reason, updated_by)
  values ('account', p_account,
    coalesce((p->>'max_order_value')::numeric, v_old.max_order_value, g.max_order_value), coalesce((p->>'max_order_qty')::int, v_old.max_order_qty, g.max_order_qty),
    coalesce((p->>'max_position_value')::numeric, v_old.max_position_value, g.max_position_value), coalesce((p->>'max_daily_loss')::numeric, v_old.max_daily_loss, g.max_daily_loss),
    coalesce((p->>'mis_margin_pct')::numeric, v_old.mis_margin_pct, g.mis_margin_pct), coalesce((p->>'allow_mis')::boolean, v_old.allow_mis, true), coalesce((p->>'kill_switch')::boolean, v_old.kill_switch, false),
    coalesce((p->>'fat_finger_price_pct')::numeric, v_old.fat_finger_price_pct, g.fat_finger_price_pct), coalesce((p->>'fat_finger_volume_pct')::numeric, v_old.fat_finger_volume_pct, g.fat_finger_volume_pct),
    case when (p->>'kill_switch')::boolean is false then false else coalesce(v_old.auto_blocked, false) end, case when (p->>'kill_switch')::boolean is false then null else v_old.block_reason end, auth.uid())
  on conflict (scope, account_id) do update set max_order_value = excluded.max_order_value, max_order_qty = excluded.max_order_qty, max_position_value = excluded.max_position_value, max_daily_loss = excluded.max_daily_loss,
    mis_margin_pct = excluded.mis_margin_pct, allow_mis = excluded.allow_mis, kill_switch = excluded.kill_switch, fat_finger_price_pct = excluded.fat_finger_price_pct, fat_finger_volume_pct = excluded.fat_finger_volume_pct,
    auto_blocked = excluded.auto_blocked, block_reason = excluded.block_reason, updated_by = auth.uid(), updated_at = now()
  returning * into v_new;
  perform audit('risk.account_limits.updated','risk_limits',p_account::text,to_jsonb(v_old),to_jsonb(v_new));
  return v_new;
end $$;

-- day P&L: realised today + unrealised on open MIS positions
create or replace function account_day_pnl(p_account uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce((select sum(realized_pnl) from positions where account_id = p_account and trading_day = (now() at time zone 'Asia/Kolkata')::date),0)
       + coalesce((select sum((q.ltp - p.avg_price) * p.net_qty) from positions p join quotes q on q.instrument_id = p.instrument_id where p.account_id = p_account and p.product='MIS' and p.net_qty <> 0),0)
$$;
create or replace function account_exposure(p_account uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce((select sum(h.qty * q.ltp) from holdings h join quotes q on q.instrument_id = h.instrument_id where h.account_id = p_account),0)
       + coalesce((select sum(abs(p.net_qty) * q.ltp) from positions p join quotes q on q.instrument_id = p.instrument_id where p.account_id = p_account and p.product='MIS' and p.net_qty <> 0),0)
$$;

-- place_order: original body (0001) + per-account limits, fat-finger, exposure and daily-loss checks (marked 0026)
create or replace function place_order(p_client_order_id text, p_symbol text, p_side order_side, p_type order_type,
  p_product product_type, p_qty int, p_price numeric default null, p_trigger numeric default null, p_via text default 'web')
returns jsonb language plpgsql security definer set search_path = public as $$
declare a trading_accounts; i instruments; q quotes; rl risk_limits; arl risk_limits; o orders; ms jsonb; funds jsonb;
        v_ref numeric; v_value numeric; v_req numeric; v_rms jsonb := '[]'::jsonb; v_reason text; v_hold_qty int;
        v_fill_price numeric; v_ex text; v_pos_val numeric := 0; v_day_pnl numeric := 0;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into o from orders where client_order_id = p_client_order_id;
  if o.id is not null then return jsonb_build_object('order_id', o.id, 'status', o.status, 'idempotent_replay', true); end if;

  select * into a from trading_accounts where user_id = auth.uid() and environment = 'sandbox';
  if a.id is null then raise exception 'NO_TRADING_ACCOUNT'; end if;
  if a.status <> 'active' then raise exception 'ACCOUNT_NOT_ACTIVE: %', a.status; end if;
  select * into i from instruments where symbol = p_symbol and exchange='NSE';
  if i.id is null then raise exception 'INSTRUMENT_NOT_FOUND'; end if;
  if not i.tradable or i.segment <> 'EQ' then raise exception 'INSTRUMENT_NOT_TRADABLE'; end if;
  select * into q from quotes where instrument_id = i.id;
  if q.instrument_id is null then raise exception 'NO_QUOTE'; end if;
  select * into rl from risk_limits where scope='global';
  select * into arl from risk_limits where scope='account' and account_id = a.id;   -- 0026
  ms := market_status();

  insert into orders(client_order_id,account_id,user_id,instrument_id,side,order_type,product,qty,price,trigger_price,status,placed_via)
  values (p_client_order_id,a.id,auth.uid(),i.id,p_side,p_type,p_product,p_qty,p_price,p_trigger,'RECEIVED',p_via) returning * into o;
  insert into order_events(order_id,from_status,to_status,payload) values (o.id,null,'RECEIVED',jsonb_build_object('market',ms));
  perform order_transition(o.id,'RMS_CHECK',null);

  v_ref := case when p_type in ('LIMIT','SL') and p_price is not null then p_price else q.ltp end;
  v_value := round(p_qty * v_ref, 2);
  if rl.kill_switch then v_reason := 'RMS_KILL_SWITCH_ACTIVE'; end if;
  if v_reason is null and not (ms->>'accepting_orders')::boolean then v_reason := 'MARKET_CLOSED'; end if;
  if v_reason is null and p_qty % i.lot_size <> 0 then v_reason := 'QTY_NOT_MULTIPLE_OF_LOT'; end if;
  if v_reason is null and p_qty > rl.max_order_qty then v_reason := 'MAX_ORDER_QTY_EXCEEDED'; end if;
  if v_reason is null and v_value > rl.max_order_value then v_reason := 'MAX_ORDER_VALUE_EXCEEDED'; end if;
  if v_reason is null and p_type in ('LIMIT','SL') and (p_price is null or p_price <= 0) then v_reason := 'PRICE_REQUIRED'; end if;
  if v_reason is null and p_type in ('SL','SL-M') and (p_trigger is null or p_trigger <= 0) then v_reason := 'TRIGGER_REQUIRED'; end if;
  if v_reason is null and p_price is not null and round(p_price / i.tick_size) * i.tick_size <> p_price then v_reason := 'PRICE_NOT_TICK_MULTIPLE'; end if;
  if v_reason is null and p_price is not null and (p_price > q.prev_close*(1+i.price_band_pct/100) or p_price < q.prev_close*(1-i.price_band_pct/100)) then v_reason := 'PRICE_OUTSIDE_BAND'; end if;
  if v_reason is null and p_product='MIS' and not rl.allow_mis then v_reason := 'MIS_DISABLED'; end if;
  v_rms := v_rms || jsonb_build_object('check','static_validation','ok', v_reason is null, 'reference_price', v_ref, 'order_value', v_value, 'reason', v_reason);

  -- 0026: per-account limits (override global when a row exists)
  if v_reason is null and arl.id is not null then
    if arl.kill_switch then v_reason := case when arl.auto_blocked then 'RMS_ACCOUNT_AUTO_BLOCKED' else 'RMS_ACCOUNT_BLOCKED' end; end if;
    if v_reason is null and p_qty > arl.max_order_qty then v_reason := 'ACCOUNT_MAX_ORDER_QTY_EXCEEDED'; end if;
    if v_reason is null and v_value > arl.max_order_value then v_reason := 'ACCOUNT_MAX_ORDER_VALUE_EXCEEDED'; end if;
    if v_reason is null and p_product='MIS' and not arl.allow_mis then v_reason := 'ACCOUNT_MIS_DISABLED'; end if;
  end if;
  -- 0026: fat-finger guards (price far from LTP inside the band; quantity out of proportion to the day's volume)
  if v_reason is null and p_price is not null and q.ltp > 0 and abs(p_price - q.ltp) / q.ltp * 100 > coalesce(arl.fat_finger_price_pct, rl.fat_finger_price_pct) then v_reason := 'FAT_FINGER_PRICE_DEVIATION'; end if;
  if v_reason is null and p_qty > 1000 and q.volume > 0 and p_qty > q.volume * coalesce(arl.fat_finger_volume_pct, rl.fat_finger_volume_pct) / 100 then v_reason := 'FAT_FINGER_QTY_VS_VOLUME'; end if;
  -- 0026: exposure and daily-loss limits (global defaults, per-account override)
  if v_reason is null then
    v_pos_val := account_exposure(a.id);
    if p_side='BUY' and v_pos_val + v_value > coalesce(arl.max_position_value, rl.max_position_value) then v_reason := 'MAX_POSITION_VALUE_EXCEEDED'; end if;
    v_day_pnl := account_day_pnl(a.id);
    if v_reason is null and v_day_pnl < -coalesce(arl.max_daily_loss, rl.max_daily_loss) then v_reason := 'DAILY_LOSS_LIMIT_BREACHED'; end if;
  end if;
  v_rms := v_rms || jsonb_build_object('check','account_limits','scope', case when arl.id is null then 'global' else 'account' end, 'exposure', v_pos_val, 'day_pnl', v_day_pnl, 'ok', v_reason is null, 'reason', v_reason);

  funds := account_funds(a.id);
  if v_reason is null then
    if p_side='BUY' then
      v_req := case when p_product='CNC' then v_value + (compute_charges(p_product,p_side,v_value)->>'total')::numeric
                    else round(v_value * rl.mis_margin_pct/100, 2) end;
      if (funds->>'available')::numeric < v_req then v_reason := 'INSUFFICIENT_FUNDS'; end if;
      v_rms := v_rms || jsonb_build_object('check','margin','required', v_req, 'available', (funds->>'available')::numeric, 'ok', v_reason is null);
    else
      if p_product='CNC' then
        select coalesce(qty,0) into v_hold_qty from holdings where account_id=a.id and instrument_id=i.id;
        v_hold_qty := coalesce(v_hold_qty,0) - coalesce((select sum(qty-filled_qty) from orders where account_id=a.id and instrument_id=i.id and side='SELL' and product='CNC' and status in ('ACKNOWLEDGED','PARTIALLY_FILLED') and id<>o.id),0);
        if v_hold_qty < p_qty then v_reason := 'INSUFFICIENT_HOLDINGS'; end if;
        v_rms := v_rms || jsonb_build_object('check','holdings','free_qty', v_hold_qty, 'ok', v_reason is null);
        v_req := 0;
      else
        v_req := round(v_value * rl.mis_margin_pct/100, 2);
        if (funds->>'available')::numeric < v_req then v_reason := 'INSUFFICIENT_MARGIN_FOR_SHORT'; end if;
        v_rms := v_rms || jsonb_build_object('check','short_margin','required', v_req, 'available', (funds->>'available')::numeric, 'ok', v_reason is null);
      end if;
    end if;
  end if;

  if v_reason is not null then
    update orders set rms_result = v_rms, rejection_reason = v_reason where id = o.id;
    perform order_transition(o.id,'RMS_REJECTED',jsonb_build_object('reason',v_reason));
    perform audit('order.rms_rejected','order',o.id::text,null,jsonb_build_object('reason',v_reason,'rms',v_rms),'rejected');
    return jsonb_build_object('order_id', o.id, 'status','RMS_REJECTED','reason', v_reason, 'rms', v_rms);
  end if;
  update orders set rms_result = v_rms where id = o.id;
  if coalesce(v_req,0) > 0 then insert into fund_holds(account_id,order_id,amount) values (a.id,o.id,v_req); end if;

  perform order_transition(o.id,'ROUTED',jsonb_build_object('adapter','SIMULATED_EXCHANGE'));
  v_ex := 'SIMX-'||to_char(now(),'YYYYMMDD')||'-'||lpad(nextval('client_code_seq')::text,10,'0');
  update orders set exchange_order_id = v_ex where id = o.id;
  perform order_transition(o.id,'ACKNOWLEDGED',jsonb_build_object('exchange_order_id',v_ex,'simulated',true));

  if p_type = 'MARKET' then
    v_fill_price := case when p_side='BUY' then coalesce(q.ask, q.ltp) else coalesce(q.bid, q.ltp) end;
    v_fill_price := round(v_fill_price / i.tick_size) * i.tick_size;
    perform apply_fill(o.id, p_qty, v_fill_price);
  elsif p_type = 'LIMIT' then
    if (p_side='BUY' and coalesce(q.ask,q.ltp) <= p_price) or (p_side='SELL' and coalesce(q.bid,q.ltp) >= p_price) then
      perform apply_fill(o.id, p_qty, p_price);
    end if;
  end if;

  select * into o from orders where id = o.id;
  return jsonb_build_object('order_id', o.id, 'status', o.status, 'exchange_order_id', v_ex, 'filled_qty', o.filled_qty,
    'avg_fill_price', o.avg_fill_price, 'rms', v_rms, 'simulated', true);
end $$;

-- ---------------------------------------------------------------- real-time MTM scan with auto-block
create table rms_mtm_snapshots (
  id bigserial primary key,
  account_id uuid not null references trading_accounts(id) on delete cascade,
  at timestamptz not null default now(),
  realized numeric(18,2) not null,
  unrealized numeric(18,2) not null,
  exposure numeric(18,2) not null,
  available numeric(18,2) not null,
  loss_limit numeric(18,2) not null,
  utilisation_pct numeric(8,2) not null
);
create index on rms_mtm_snapshots(account_id, at desc);
alter table rms_mtm_snapshots enable row level security;
create policy "mtm own or staff" on rms_mtm_snapshots for select using (is_staff() or account_id in (select id from trading_accounts where user_id = auth.uid()));

create or replace function rms_mtm_scan() returns int
language plpgsql security definer set search_path = public as $$
declare a record; g risk_limits; arl risk_limits; v_real numeric; v_unreal numeric; v_lim numeric; v_util numeric; v_day text := to_char(now() at time zone 'Asia/Kolkata','YYYY-MM-DD'); n int := 0; funds jsonb;
begin
  select * into g from risk_limits where scope='global';
  for a in select t.* from trading_accounts t where t.status='active' and t.environment='sandbox' loop
    select * into arl from risk_limits where scope='account' and account_id = a.id;
    v_lim := coalesce(arl.max_daily_loss, g.max_daily_loss);
    select coalesce(sum(realized_pnl),0) into v_real from positions where account_id = a.id and trading_day = (now() at time zone 'Asia/Kolkata')::date;
    select coalesce(sum((q.ltp - p.avg_price) * p.net_qty),0) into v_unreal from positions p join quotes q on q.instrument_id = p.instrument_id where p.account_id = a.id and p.product='MIS' and p.net_qty <> 0;
    funds := account_funds(a.id);
    v_util := case when v_lim > 0 then round(greatest(0, -(v_real + v_unreal)) / v_lim * 100, 2) else 0 end;
    insert into rms_mtm_snapshots(account_id, realized, unrealized, exposure, available, loss_limit, utilisation_pct) values (a.id, v_real, v_unreal, account_exposure(a.id), (funds->>'available')::numeric, v_lim, v_util);
    n := n + 1;
    if v_util >= 80 and v_util < 100 then
      insert into sentinel_alerts(user_id, account_id, severity, kind, title, body, evidence, dedupe_key) values (a.user_id, a.id, 'warning', 'rms_loss_warning', 'Daily loss at '||v_util||'% of your limit', 'Realised plus marked-to-market loss today is approaching the daily loss limit of Rs '||v_lim||'. New orders will be blocked at 100%.', jsonb_build_object('realized', v_real, 'unrealized', v_unreal, 'limit', v_lim), 'rms_loss_warn:'||v_day) on conflict do nothing;
    elsif v_util >= 100 and not coalesce(arl.kill_switch, false) then
      insert into risk_limits(scope, account_id, max_order_value, max_order_qty, max_position_value, max_daily_loss, mis_margin_pct, allow_mis, kill_switch, fat_finger_price_pct, fat_finger_volume_pct, auto_blocked, block_reason)
      values ('account', a.id, g.max_order_value, g.max_order_qty, g.max_position_value, g.max_daily_loss, g.mis_margin_pct, g.allow_mis, true, g.fat_finger_price_pct, g.fat_finger_volume_pct, true, 'DAILY_LOSS_LIMIT_BREACHED '||v_day)
      on conflict (scope, account_id) do update set kill_switch = true, auto_blocked = true, block_reason = excluded.block_reason, updated_at = now();
      insert into sentinel_alerts(user_id, account_id, severity, kind, title, body, evidence, dedupe_key) values (a.user_id, a.id, 'critical', 'rms_auto_block', 'New orders blocked: daily loss limit reached', 'The risk engine blocked new orders because today''s loss reached the daily limit of Rs '||v_lim||'. Open positions are not closed automatically. Contact the risk desk to review.', jsonb_build_object('realized', v_real, 'unrealized', v_unreal, 'limit', v_lim), 'rms_auto_block:'||v_day) on conflict do nothing;
      insert into notifications(user_id, kind, title, body) values (a.user_id, 'risk', 'New orders blocked by the risk engine', 'Daily loss limit of Rs '||v_lim||' reached. Existing positions remain open.');
      perform audit('rms.auto_block','trading_account',a.id::text,null,jsonb_build_object('realized', v_real, 'unrealized', v_unreal, 'limit', v_lim));
    end if;
  end loop;
  return n;
end $$;

-- ---------------------------------------------------------------- surveillance
create table surveillance_flags (
  id bigserial primary key,
  account_id uuid not null references trading_accounts(id) on delete cascade,
  day date not null,
  kind text not null,
  severity alert_severity not null,
  evidence jsonb not null,
  status text not null default 'open',        -- open | reviewed | escalated
  reviewed_by uuid,
  reviewed_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  unique (account_id, day, kind)
);
alter table surveillance_flags enable row level security;
create policy "surveillance staff" on surveillance_flags for select using (is_staff());

create or replace function run_surveillance() returns int
language plpgsql security definer set search_path = public as $$
declare a record; v_day date := (now() at time zone 'Asia/Kolkata')::date; n int := 0; v_orders int; v_trades int; v_cancels int; v_rej int; v_wash int;
begin
  for a in select t.id from trading_accounts t where t.status='active' loop
    select count(*), count(*) filter (where status='CANCELLED'), count(*) filter (where status='RMS_REJECTED') into v_orders, v_cancels, v_rej from orders where account_id = a.id and created_at::date = v_day and placed_via <> 'system_square_off';
    select count(*) into v_trades from trades where account_id = a.id and traded_at::date = v_day;
    select count(*) into v_wash from trades b join trades s on s.account_id = b.account_id and s.instrument_id = b.instrument_id and s.side='SELL' and b.side='BUY' and s.product='MIS' and b.product='MIS' and abs(extract(epoch from s.traded_at - b.traded_at)) <= 60
      where b.account_id = a.id and b.traded_at::date = v_day;
    if v_orders >= 20 and v_trades > 0 and v_orders::numeric / v_trades > 20 then
      insert into surveillance_flags(account_id, day, kind, severity, evidence) values (a.id, v_day, 'order_to_trade_ratio', 'warning', jsonb_build_object('orders', v_orders, 'trades', v_trades, 'ratio', round(v_orders::numeric / v_trades, 1))) on conflict do nothing; n := n + 1;
    end if;
    if v_orders >= 10 and v_cancels::numeric / v_orders > 0.8 then
      insert into surveillance_flags(account_id, day, kind, severity, evidence) values (a.id, v_day, 'excessive_cancellations', 'warning', jsonb_build_object('orders', v_orders, 'cancelled', v_cancels)) on conflict do nothing; n := n + 1;
    end if;
    if v_rej >= 10 then
      insert into surveillance_flags(account_id, day, kind, severity, evidence) values (a.id, v_day, 'repeated_rms_rejections', 'info', jsonb_build_object('rejections', v_rej)) on conflict do nothing; n := n + 1;
    end if;
    if v_wash >= 3 then
      insert into surveillance_flags(account_id, day, kind, severity, evidence) values (a.id, v_day, 'rapid_round_trips', 'critical', jsonb_build_object('pairs_within_60s', v_wash, 'note', 'Buy and sell of the same instrument within 60 seconds, repeated')) on conflict do nothing; n := n + 1;
    end if;
  end loop;
  return n;
end $$;
create or replace function review_surveillance_flag(p_id bigint, p_status text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if current_app_role() not in ('risk','compliance','admin','super_admin') then raise exception 'FORBIDDEN'; end if;
  if p_status not in ('reviewed','escalated') then raise exception 'INVALID_STATUS'; end if;
  update surveillance_flags set status = p_status, reviewed_by = auth.uid(), reviewed_at = now(), note = p_note where id = p_id;
  perform audit('surveillance.reviewed','surveillance_flag',p_id::text,null,jsonb_build_object('status',p_status,'note',p_note));
end $$;

-- ---------------------------------------------------------------- stress test
create or replace function stress_test(p_account uuid, p_shocks numeric[] default array[-5,-10,-20,-30]) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_hold numeric; v_mis numeric; funds jsonb; v_out jsonb := '[]'::jsonb; s numeric; v_loss numeric; v_post numeric; g risk_limits; arl risk_limits;
begin
  if not exists (select 1 from trading_accounts where id = p_account and (user_id = auth.uid() or is_staff())) then raise exception 'FORBIDDEN'; end if;
  select * into g from risk_limits where scope='global'; select * into arl from risk_limits where scope='account' and account_id = p_account;
  select coalesce(sum(h.qty * q.ltp),0) into v_hold from holdings h join quotes q on q.instrument_id = h.instrument_id where h.account_id = p_account;
  select coalesce(sum(p.net_qty * q.ltp),0) into v_mis from positions p join quotes q on q.instrument_id = p.instrument_id where p.account_id = p_account and p.product='MIS' and p.net_qty <> 0;
  funds := account_funds(p_account);
  foreach s in array coalesce(p_shocks, array[-5,-10,-20,-30]::numeric[]) loop
    v_loss := round((v_hold + v_mis) * s / 100, 2);
    v_post := (funds->>'available')::numeric + v_loss;
    v_out := v_out || jsonb_build_object('shock_pct', s, 'pnl', v_loss, 'post_shock_available', round(v_post, 2), 'margin_shortfall', v_post < 0, 'breaches_daily_loss_limit', v_loss < -coalesce(arl.max_daily_loss, g.max_daily_loss));
  end loop;
  return jsonb_build_object('holdings_value', v_hold, 'mis_net_exposure', v_mis, 'available', (funds->>'available')::numeric, 'daily_loss_limit', coalesce(arl.max_daily_loss, g.max_daily_loss), 'scenarios', v_out, 'note', 'Uniform price shock applied to holdings and net intraday exposure; simulated prices.');
end $$;

-- ---------------------------------------------------------------- back office: settlement obligations
create table settlement_obligations (
  id bigserial primary key,
  account_id uuid not null references trading_accounts(id) on delete cascade,
  trading_day date not null,
  settlement_day date not null,
  pay_in numeric(18,2) not null default 0,     -- client owes (buy value + charges)
  pay_out numeric(18,2) not null default 0,    -- due to client (sell value - charges)
  net numeric(18,2) not null default 0,        -- pay_out - pay_in
  securities jsonb not null default '[]',
  status text not null default 'pending',      -- pending | settled | short | exception
  settled_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  unique (account_id, trading_day)
);
create table margin_shortfalls (
  id bigserial primary key,
  account_id uuid not null references trading_accounts(id) on delete cascade,
  day date not null,
  amount numeric(18,2) not null,
  status text not null default 'open',         -- open | called | resolved
  called_at timestamptz,
  resolved_at timestamptz,
  resolved_by uuid,
  note text,
  created_at timestamptz not null default now(),
  unique (account_id, day)
);
create table backoffice_exceptions (
  id bigserial primary key,
  kind text not null,                           -- refund | charge_dispute | reversal | reconciliation | other
  account_id uuid references trading_accounts(id),
  amount numeric(18,2),
  description text not null,
  status text not null default 'open',          -- open | approved | rejected
  raised_by uuid not null,
  decided_by uuid,
  decided_at timestamptz,
  decision_note text,
  journal_entry_id bigint,
  created_at timestamptz not null default now()
);
alter table settlement_obligations enable row level security; alter table margin_shortfalls enable row level security; alter table backoffice_exceptions enable row level security;
create policy "obligations own or staff" on settlement_obligations for select using (is_staff() or account_id in (select id from trading_accounts where user_id = auth.uid()));
create policy "shortfalls own or staff" on margin_shortfalls for select using (is_staff() or account_id in (select id from trading_accounts where user_id = auth.uid()));
create policy "exceptions own or staff" on backoffice_exceptions for select using (is_staff() or raised_by = auth.uid() or account_id in (select id from trading_accounts where user_id = auth.uid()));
revoke insert, update, delete on rms_mtm_snapshots, surveillance_flags, settlement_obligations, margin_shortfalls, backoffice_exceptions from anon, authenticated;

create or replace function next_settlement_day(p_day date) returns date
language sql immutable as $$
  select case extract(isodow from p_day) when 5 then p_day + 3 when 6 then p_day + 2 else p_day + 1 end
$$;

create or replace function generate_settlement_obligations(p_day date default null) returns int
language plpgsql security definer set search_path = public as $$
declare v_day date := coalesce(p_day, (now() at time zone 'Asia/Kolkata')::date); n int;
begin
  insert into settlement_obligations(account_id, trading_day, settlement_day, pay_in, pay_out, net, securities)
  select t.account_id, v_day, next_settlement_day(v_day),
    coalesce(sum(case when t.side='BUY' then t.value + t.total_charges end),0),
    coalesce(sum(case when t.side='SELL' then t.value - t.total_charges end),0),
    coalesce(sum(case when t.side='SELL' then t.value - t.total_charges else -(t.value + t.total_charges) end),0),
    (select coalesce(jsonb_agg(jsonb_build_object('symbol', i.symbol, 'qty_in', x.qin, 'qty_out', x.qout)), '[]') from (select instrument_id, sum(case when side='BUY' then qty else 0 end) qin, sum(case when side='SELL' then qty else 0 end) qout from trades where account_id = t.account_id and product='CNC' and traded_at::date = v_day group by instrument_id) x join instruments i on i.id = x.instrument_id)
  from trades t where t.product='CNC' and t.traded_at::date = v_day
  group by t.account_id
  on conflict (account_id, trading_day) do update set pay_in = excluded.pay_in, pay_out = excluded.pay_out, net = excluded.net, securities = excluded.securities where settlement_obligations.status = 'pending';
  get diagnostics n = row_count; return n;
end $$;

create or replace function settle_due_obligations() returns jsonb
language plpgsql security definer set search_path = public as $$
declare r record; v_settled int := 0; v_short int := 0; v_bal numeric;
begin
  for r in select * from settlement_obligations where status='pending' and settlement_day <= (now() at time zone 'Asia/Kolkata')::date loop
    v_bal := account_ledger_balance(r.account_id);
    if v_bal < 0 then
      update settlement_obligations set status='short', note = 'Ledger balance '||v_bal||' below zero on settlement day' where id = r.id; v_short := v_short + 1;
      insert into margin_shortfalls(account_id, day, amount, note) values (r.account_id, r.settlement_day, -v_bal, 'Settlement obligation '||r.id) on conflict (account_id, day) do update set amount = excluded.amount;
    else
      update settlement_obligations set status='settled', settled_at = now(), note = 'Funds and securities settled in the sandbox (no clearing corporation involved)' where id = r.id; v_settled := v_settled + 1;
    end if;
  end loop;
  return jsonb_build_object('settled', v_settled, 'short', v_short);
end $$;

create or replace function run_settlement_cycle() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_gen int; v_res jsonb;
begin
  if current_app_role() not in ('ops','finance','risk','admin','super_admin') then raise exception 'FORBIDDEN'; end if;
  v_gen := generate_settlement_obligations(null); v_res := settle_due_obligations();
  perform audit('settlement.cycle.run','settlement_obligations',to_char(now(),'YYYY-MM-DD'),null,v_res || jsonb_build_object('generated', v_gen));
  return v_res || jsonb_build_object('generated', v_gen);
end $$;

-- ---------------------------------------------------------------- margin shortfalls
create or replace function detect_margin_shortfalls() returns int
language plpgsql security definer set search_path = public as $$
declare a record; funds jsonb; v_avail numeric; n int := 0; v_day date := (now() at time zone 'Asia/Kolkata')::date;
begin
  for a in select t.* from trading_accounts t where t.status='active' and t.environment='sandbox' loop
    funds := account_funds(a.id); v_avail := (funds->>'available')::numeric;
    if v_avail < 0 then
      insert into margin_shortfalls(account_id, day, amount, note) values (a.id, v_day, -v_avail, 'Available funds below zero (margin used + holds exceed ledger)') on conflict (account_id, day) do update set amount = excluded.amount where margin_shortfalls.status <> 'resolved';
      insert into sentinel_alerts(user_id, account_id, severity, kind, title, body, evidence, dedupe_key) values (a.user_id, a.id, 'critical', 'margin_shortfall', 'Margin shortfall of Rs '||(-v_avail), 'Add funds or reduce positions. Shortfalls may lead to position square-off per the risk policy.', funds, 'margin_shortfall:'||v_day) on conflict do nothing;
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;
create or replace function call_margin_shortfall(p_id bigint, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare m margin_shortfalls; a trading_accounts;
begin
  if current_app_role() not in ('ops','risk','admin','super_admin') then raise exception 'FORBIDDEN'; end if;
  select * into m from margin_shortfalls where id = p_id; if m.id is null then raise exception 'NOT_FOUND'; end if;
  select * into a from trading_accounts where id = m.account_id;
  update margin_shortfalls set status='called', called_at = now(), note = coalesce(p_note, note) where id = p_id;
  insert into notifications(user_id, kind, title, body) values (a.user_id, 'risk', 'Margin call: Rs '||m.amount, coalesce(p_note, 'Please add funds to clear the shortfall by the next settlement.'));
  perform audit('margin.call','margin_shortfall',p_id::text,to_jsonb(m),jsonb_build_object('status','called','note',p_note));
end $$;
create or replace function resolve_margin_shortfall(p_id bigint, p_note text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if current_app_role() not in ('ops','risk','admin','super_admin') then raise exception 'FORBIDDEN'; end if;
  update margin_shortfalls set status='resolved', resolved_at = now(), resolved_by = auth.uid(), note = coalesce(p_note, note) where id = p_id;
  perform audit('margin.shortfall.resolved','margin_shortfall',p_id::text,null,jsonb_build_object('note',p_note));
end $$;

-- ---------------------------------------------------------------- exceptions and refunds (maker-checker)
create or replace function raise_backoffice_exception(p_kind text, p_account uuid, p_amount numeric, p_description text) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_kind not in ('refund','charge_dispute','reversal','reconciliation','other') then raise exception 'INVALID_KIND'; end if;
  if not is_staff() then
    if p_kind not in ('refund','charge_dispute') or not exists (select 1 from trading_accounts where id = p_account and user_id = auth.uid()) then raise exception 'FORBIDDEN'; end if;
  end if;
  if length(coalesce(p_description,'')) < 5 then raise exception 'DESCRIPTION_REQUIRED'; end if;
  insert into backoffice_exceptions(kind, account_id, amount, description, raised_by) values (p_kind, p_account, p_amount, p_description, auth.uid()) returning id into v_id;
  perform audit('backoffice.exception.raised','backoffice_exception',v_id::text,null,jsonb_build_object('kind',p_kind,'amount',p_amount));
  return v_id;
end $$;
create or replace function decide_backoffice_exception(p_id bigint, p_decision text, p_note text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e backoffice_exceptions; a trading_accounts; v_je bigint;
begin
  if current_app_role() not in ('ops','finance','admin','super_admin') then raise exception 'FORBIDDEN'; end if;
  select * into e from backoffice_exceptions where id = p_id for update;
  if e.id is null then raise exception 'NOT_FOUND'; end if;
  if e.status <> 'open' then raise exception 'ALREADY_DECIDED'; end if;
  if e.raised_by = auth.uid() then raise exception 'MAKER_CHECKER_VIOLATION: raiser cannot decide own exception'; end if;
  if p_decision not in ('approve','reject') then raise exception 'INVALID_DECISION'; end if;
  if p_decision = 'approve' and e.kind in ('refund','charge_dispute') and coalesce(e.amount,0) > 0 then
    select * into a from trading_accounts where id = e.account_id;
    if a.id is null then raise exception 'ACCOUNT_REQUIRED_FOR_REFUND'; end if;
    v_je := post_journal('backoffice_refund', e.id::text, 'Refund (simulated): '||left(e.description, 80), jsonb_build_array(jsonb_build_object('code','4000','debit',e.amount), jsonb_build_object('code','C-'||a.client_code,'credit',e.amount)));
    insert into notifications(user_id, kind, title, body) values (a.user_id, 'funds', 'Refund credited: Rs '||e.amount, coalesce(p_note, 'Your refund request was approved.'));
  end if;
  update backoffice_exceptions set status = case when p_decision='approve' then 'approved' else 'rejected' end, decided_by = auth.uid(), decided_at = now(), decision_note = p_note, journal_entry_id = v_je where id = p_id;
  perform audit('backoffice.exception.decided','backoffice_exception',p_id::text,to_jsonb(e),jsonb_build_object('decision',p_decision,'note',p_note,'journal_entry_id',v_je));
  return jsonb_build_object('id', p_id, 'status', case when p_decision='approve' then 'approved' else 'rejected' end, 'journal_entry_id', v_je);
end $$;

-- ---------------------------------------------------------------- grants and schedules
revoke execute on function set_account_risk_limits(uuid, jsonb) from public, anon;
revoke execute on function account_day_pnl(uuid) from public, anon, authenticated;
revoke execute on function account_exposure(uuid) from public, anon, authenticated;
revoke execute on function rms_mtm_scan() from public, anon, authenticated;
revoke execute on function run_surveillance() from public, anon, authenticated;
revoke execute on function review_surveillance_flag(bigint, text, text) from public, anon;
revoke execute on function stress_test(uuid, numeric[]) from public, anon;
revoke execute on function next_settlement_day(date) from public, anon;
revoke execute on function generate_settlement_obligations(date) from public, anon, authenticated;
revoke execute on function settle_due_obligations() from public, anon, authenticated;
revoke execute on function run_settlement_cycle() from public, anon;
revoke execute on function detect_margin_shortfalls() from public, anon, authenticated;
revoke execute on function call_margin_shortfall(bigint, text) from public, anon;
revoke execute on function resolve_margin_shortfall(bigint, text) from public, anon;
revoke execute on function raise_backoffice_exception(text, uuid, numeric, text) from public, anon;
revoke execute on function decide_backoffice_exception(bigint, text, text) from public, anon;
select cron.schedule('airavat-rms-mtm', '*/5 3-10 * * 1-5', $$select public.rms_mtm_scan()$$);
select cron.schedule('airavat-surveillance', '*/15 3-11 * * 1-5', $$select public.run_surveillance()$$);
select cron.schedule('airavat-margin-shortfalls', '7 3-11 * * 1-5', $$select public.detect_margin_shortfalls()$$);
select cron.schedule('airavat-settlement-cycle', '0 13 * * 1-5', $$select public.generate_settlement_obligations(null); select public.settle_due_obligations();$$);
select generate_settlement_obligations((now() at time zone 'Asia/Kolkata')::date);
