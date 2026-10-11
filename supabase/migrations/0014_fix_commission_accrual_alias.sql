-- 0014: accrue_partner_commission used a query alias (pl) that collided with the PL/pgSQL variable of the same name,
-- raising 'column reference pl.id is ambiguous' on KYC approval of any referred client. Alias renamed; logic unchanged.
create or replace function accrue_partner_commission(p_event_type text, p_event_id text, p_account uuid, p_basis numeric) returns void
language plpgsql security definer set search_path = public as $$
declare v_user uuid; ra referral_attributions; pt partners; pl commission_plans; v_gross numeric; v_tds numeric; v_month_total numeric;
begin
  select user_id into v_user from trading_accounts where id = p_account;
  select * into ra from referral_attributions where client_user_id = v_user;
  if ra.partner_id is null then return; end if;
  select * into pt from partners where id = ra.partner_id;
  if pt.status <> 'active' then return; end if;
  if pt.training_valid_until is not null and pt.training_valid_until < current_date then return; end if;
  select cp.* into pl from partner_plan_assignments a join commission_plans cp on cp.id = a.plan_id
    where a.partner_id = pt.id and a.effective_from <= current_date and (a.effective_to is null or a.effective_to >= current_date)
      and cp.status='approved' and cp.valid_from <= current_date and (cp.valid_to is null or cp.valid_to >= current_date)
    order by a.effective_from desc limit 1;
  if pl.id is null then return; end if;
  if p_event_type = 'activation' and pl.basis = 'FIXED_PER_ACTIVATION' then v_gross := pl.rate;
  elsif p_event_type = 'trade' and pl.basis = 'REVENUE_SHARE_PCT' then v_gross := round(coalesce(p_basis,0) * pl.rate / 100, 2);
  else return; end if;
  if pl.cap_per_event is not null then v_gross := least(v_gross, pl.cap_per_event); end if;
  if v_gross <= 0 then return; end if;
  if pl.monthly_cap is not null then
    select coalesce(sum(gross),0) into v_month_total from commission_accruals where partner_id = pt.id and date_trunc('month', accrued_at) = date_trunc('month', now());
    if v_month_total >= pl.monthly_cap then return; end if;
    v_gross := least(v_gross, pl.monthly_cap - v_month_total);
  end if;
  v_tds := round(v_gross * pl.tds_pct / 100, 2);
  insert into commission_accruals(partner_id, plan_id, qualifying_event_type, qualifying_event_id, basis_amount, gross, tds, net)
  values (pt.id, pl.id, p_event_type, p_event_id, p_basis, v_gross, v_tds, v_gross - v_tds)
  on conflict (plan_id, qualifying_event_type, qualifying_event_id) do nothing;
end $$;

-- Same alias collision in partner_passport.
create or replace function partner_passport(p_partner int) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare pt partners; pl commission_plans;
begin
  select * into pt from partners where id = p_partner;
  if pt.id is null then raise exception 'NOT_FOUND'; end if;
  if not (is_staff() or pt.user_id = auth.uid()) then raise exception 'FORBIDDEN'; end if;
  select cp.* into pl from partner_plan_assignments a join commission_plans cp on cp.id=a.plan_id where a.partner_id=pt.id and a.effective_to is null order by a.effective_from desc limit 1;
  return jsonb_build_object(
    'partner', jsonb_build_object('id',pt.id,'legal_name',pt.legal_name,'category',pt.category,'status',pt.status,'referral_code',pt.referral_code,'approved_activities',pt.approved_activities,'permitted_channels',pt.permitted_channels,'training_valid_until',pt.training_valid_until,'exchange_approval_ref',pt.exchange_approval_ref),
    'access_allowed', pt.status = 'active',
    'new_business_allowed', pt.status = 'active' and (pt.training_valid_until is null or pt.training_valid_until >= current_date),
    'commission_eligible', pt.status = 'active' and pl.id is not null,
    'payout_eligible', pt.status in ('active','suspended'),
    'plan', case when pl.id is null then null else jsonb_build_object('code',pl.code,'name',pl.name,'basis',pl.basis,'rate',pl.rate,'status',pl.status,'legal_basis',pl.legal_basis) end,
    'referred_clients', (select count(*) from referral_attributions where partner_id = pt.id),
    'earned_gross', (select coalesce(sum(gross),0) from commission_accruals where partner_id = pt.id),
    'pending_net', (select coalesce(sum(net),0) from commission_accruals where partner_id = pt.id and status in ('accrued','in_payout')),
    'paid_net', (select coalesce(sum(net),0) from commission_accruals where partner_id = pt.id and status = 'paid'),
    'leads', (select count(*) from leads where partner_id = pt.id));
end $$;

