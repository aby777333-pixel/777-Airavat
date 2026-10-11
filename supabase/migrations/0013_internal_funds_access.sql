-- 0013: allow internal (cron / no-JWT) callers such as sentinel_scan() to read account_funds.
-- API callers (anon/authenticated/service_role) always carry request.jwt.claims, so their ownership gate is unchanged.
create or replace function account_funds(p_account uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_bal numeric; v_hold numeric; v_pending_wd numeric; v_mtm numeric := 0; v_used numeric := 0; v_pct numeric;
        v_internal boolean := coalesce(current_setting('request.jwt.claims', true), '') = '';
begin
  if not v_internal and not exists (select 1 from trading_accounts t where t.id = p_account and (t.user_id = auth.uid() or is_staff())) then
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

-- Advisor hygiene: pin search_path on helper functions flagged by the Supabase linter.
alter function fee_amount(fee_definitions, numeric) set search_path = public;
alter function eval_condition(instrument_metrics, jsonb) set search_path = public;
alter function slugify(text) set search_path = public;
