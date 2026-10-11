-- AIRAVAT | Migration 0004: function execution hardening
-- Internal engine functions must never be reachable through the public RPC surface.

-- Fix mutable search_path warnings
alter function is_staff() set search_path = public;
alter function market_status() set search_path = public;
alter function compute_charges(product_type, order_side, numeric) set search_path = public;

-- Internal-only functions: revoke from every API role
revoke execute on function handle_new_user() from public, anon, authenticated;
revoke execute on function audit(text,text,text,jsonb,jsonb,text) from public, anon, authenticated;
revoke execute on function post_journal(text,text,text,jsonb) from public, anon, authenticated;
revoke execute on function order_transition(uuid, order_status, jsonb) from public, anon, authenticated;
revoke execute on function apply_fill(uuid,int,numeric) from public, anon, authenticated;
revoke execute on function approve_kyc_internal(uuid,uuid,text) from public, anon, authenticated;
revoke execute on function sim_tick() from public, anon, authenticated;
revoke execute on function sim_seed_history() from public, anon, authenticated;
revoke execute on function account_ledger_balance(uuid) from public, anon, authenticated;

-- Authenticated-only functions: revoke from anon (and public)
revoke execute on function accept_document(text) from public, anon;
revoke execute on function account_funds(uuid) from public, anon;
revoke execute on function cancel_order(uuid) from public, anon;
revoke execute on function current_app_role() from public, anon;
revoke execute on function log_ai_interaction(jsonb) from public, anon;
revoke execute on function place_order(text,text,order_side,order_type,product_type,int,numeric,numeric,text) from public, anon;
revoke execute on function reconciliation_report() from public, anon;
revoke execute on function request_withdrawal(numeric) from public, anon;
revoke execute on function review_kyc(uuid,text,text) from public, anon;
revoke execute on function review_withdrawal(uuid,text,text) from public, anon;
revoke execute on function run_eod_settlement() from public, anon;
revoke execute on function sandbox_deposit(numeric,text) from public, anon;
revoke execute on function set_user_role(uuid, app_role) from public, anon;
revoke execute on function submit_kyc(jsonb) from public, anon;
revoke execute on function trial_balance() from public, anon;
revoke execute on function update_app_setting(text,jsonb) from public, anon;
revoke execute on function update_risk_limits(jsonb) from public, anon;

-- account_funds must only expose the caller's own account (or staff)
create or replace function account_funds(p_account uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_bal numeric; v_hold numeric; v_pending_wd numeric; v_mtm numeric := 0; v_used numeric := 0; v_pct numeric;
begin
  if not exists (select 1 from trading_accounts t where t.id = p_account and (t.user_id = auth.uid() or is_staff())) then
    raise exception 'FORBIDDEN';
  end if;
  v_bal := account_ledger_balance(p_account);
  v_hold := (select coalesce(sum(amount),0) from fund_holds where account_id=p_account and not released);
  v_pending_wd := (select coalesce(sum(amount),0) from fund_transactions where account_id=p_account and type='WITHDRAWAL' and status='PENDING');
  select mis_margin_pct/100 into v_pct from risk_limits where scope='global';
  select coalesce(sum(case when p.net_qty <> 0 then (q.ltp - p.avg_price) * p.net_qty else 0 end),0),
         coalesce(sum(case when p.net_qty <> 0 and p.product='MIS' then abs(p.net_qty) * p.avg_price * v_pct else 0 end),0)
    into v_mtm, v_used
  from positions p join quotes q on q.instrument_id = p.instrument_id
  where p.account_id = p_account and p.trading_day = (now() at time zone 'Asia/Kolkata')::date;
  return jsonb_build_object(
    'ledger_balance', round(v_bal,2),
    'blocked_for_orders', round(v_hold,2),
    'pending_withdrawals', round(v_pending_wd,2),
    'margin_used', round(v_used,2),
    'unrealized_mtm', round(v_mtm,2),
    'available', round(v_bal - v_hold - v_pending_wd - v_used + least(v_mtm,0),2),
    'withdrawable', greatest(round(v_bal - v_hold - v_pending_wd - v_used + least(v_mtm,0),2),0),
    'environment','sandbox','currency','INR');
end $$;
revoke execute on function account_funds(uuid) from public, anon;

-- Order preview (no side effects): RMS dry run for the order ticket
create or replace function preview_order(p_symbol text, p_side order_side, p_type order_type, p_product product_type, p_qty int, p_price numeric default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare a trading_accounts; i instruments; q quotes; rl risk_limits; v_ref numeric; v_value numeric; v_req numeric; ch jsonb; funds jsonb; v_hold int;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into a from trading_accounts where user_id = auth.uid() and environment='sandbox';
  if a.id is null then return jsonb_build_object('ok', false, 'reason', 'NO_TRADING_ACCOUNT'); end if;
  select * into i from instruments where symbol = p_symbol and exchange='NSE';
  if i.id is null then return jsonb_build_object('ok', false, 'reason','INSTRUMENT_NOT_FOUND'); end if;
  select * into q from quotes where instrument_id = i.id;
  select * into rl from risk_limits where scope='global';
  v_ref := case when p_type in ('LIMIT','SL') and p_price is not null then p_price else q.ltp end;
  v_value := round(p_qty * v_ref, 2);
  ch := compute_charges(p_product, p_side, v_value);
  funds := account_funds(a.id);
  if p_side='BUY' then
    v_req := case when p_product='CNC' then v_value + (ch->>'total')::numeric else round(v_value * rl.mis_margin_pct/100, 2) end;
  elsif p_product='MIS' then v_req := round(v_value * rl.mis_margin_pct/100, 2);
  else v_req := 0; end if;
  select coalesce(qty,0) into v_hold from holdings where account_id=a.id and instrument_id=i.id;
  return jsonb_build_object('ok', true, 'reference_price', v_ref, 'order_value', v_value, 'charges', ch, 'margin_required', v_req,
    'available', (funds->>'available')::numeric, 'sufficient', (funds->>'available')::numeric >= v_req,
    'holdings_qty', coalesce(v_hold,0), 'kill_switch', rl.kill_switch, 'market', market_status(), 'simulated', true);
end $$;
revoke execute on function preview_order(text, order_side, order_type, product_type, int, numeric) from public, anon;
