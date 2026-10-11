-- AIRAVAT | Migration 0008: Partner Universe + Salesforce/CRM core — partners, agreements, compliance-approved
-- commission plans, referral attribution, accruals, maker-checker payouts, leads pipeline, Partner Passport.
-- RevenueOS remains the authoritative calculation and ledger service. Strictly additive.

create type partner_category as enum ('introducer','affiliate','authorized_person','franchise','employee');
create type partner_status as enum ('applied','verified','active','suspended','terminated');
create type commission_basis as enum ('FIXED_PER_ACTIVATION','REVENUE_SHARE_PCT','FIXED_SERVICE_FEE');

create table partners (
  id serial primary key,
  user_id uuid references profiles(id),
  category partner_category not null,
  legal_name text not null,
  contact_email text,
  status partner_status not null default 'applied',
  referral_code text not null unique,
  approved_activities text[] not null default '{}',
  permitted_channels text[] not null default '{}',
  exchange_approval_ref text,
  training_valid_until date,
  compliance_note text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table partner_agreements (
  id serial primary key,
  partner_id int not null references partners(id),
  version int not null default 1,
  terms text not null,
  effective_from date not null default current_date,
  effective_to date,
  approved_by uuid,
  created_at timestamptz not null default now()
);
create table commission_plans (
  id serial primary key,
  code text not null unique,
  name text not null,
  partner_category partner_category not null,
  basis commission_basis not null,
  rate numeric(12,4) not null,          -- INR for FIXED, % for REVENUE_SHARE
  cap_per_event numeric(12,2),
  monthly_cap numeric(14,2),
  valid_from date not null default current_date,
  valid_to date,
  legal_basis text not null,
  tds_pct numeric(6,2) not null default 10,
  status approval_status not null default 'draft',
  created_by uuid, compliance_approved_by uuid,
  created_at timestamptz not null default now()
);
create table partner_plan_assignments (
  id serial primary key,
  partner_id int not null references partners(id),
  plan_id int not null references commission_plans(id),
  effective_from date not null default current_date,
  effective_to date,
  assigned_by uuid,
  created_at timestamptz not null default now()
);
create table referral_attributions (
  client_user_id uuid primary key references profiles(id) on delete cascade,
  partner_id int not null references partners(id),
  referral_code text not null,
  source text not null default 'signup_ref',
  attributed_at timestamptz not null default now()
);
create table commission_accruals (
  id bigserial primary key,
  partner_id int not null references partners(id),
  plan_id int not null references commission_plans(id),
  qualifying_event_type text not null,
  qualifying_event_id text not null,
  basis_amount numeric(14,2),
  gross numeric(12,2) not null,
  tds numeric(12,2) not null default 0,
  net numeric(12,2) not null,
  status text not null default 'accrued',   -- accrued | in_payout | paid | reversed
  payout_id bigint,
  accrued_at timestamptz not null default now(),
  unique (plan_id, qualifying_event_type, qualifying_event_id)
);
create table partner_payouts (
  id bigserial primary key,
  partner_id int not null references partners(id),
  gross numeric(14,2) not null,
  tds numeric(14,2) not null,
  net numeric(14,2) not null,
  status approval_status not null default 'pending_approval',
  requested_by uuid not null,
  approved_by uuid,
  journal_entry_id bigint references journal_entries(id),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- CRM
create type lead_status as enum ('new','contacted','qualified','application','activated','lost');
create table leads (
  id bigserial primary key,
  full_name text not null,
  email text,
  phone text,
  source text not null default 'website',
  partner_id int references partners(id),
  status lead_status not null default 'new',
  assigned_to uuid references profiles(id),
  consent_marketing boolean not null default false,
  notes text,
  converted_user_id uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on leads(status);
create index on leads(assigned_to);
create table lead_activities (
  id bigserial primary key,
  lead_id bigint not null references leads(id) on delete cascade,
  actor_id uuid,
  kind text not null,   -- note | call | email | status_change | assignment
  body text,
  created_at timestamptz not null default now()
);
create table sales_targets (
  id serial primary key,
  owner_id uuid not null references profiles(id),
  period text not null,          -- e.g. 2026-Q4
  metric text not null,          -- activated_accounts | qualified_leads
  target numeric not null,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------
create or replace function partner_for_user(p_user uuid) returns partners
language sql stable security definer set search_path = public as $$ select * from partners where user_id = p_user limit 1 $$;

create or replace function register_partner(p jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare v_id int; v_code text;
begin
  if current_app_role() not in ('sales','ops','admin','super_admin','compliance') then raise exception 'FORBIDDEN'; end if;
  v_code := upper(coalesce(nullif(p->>'referral_code',''), 'AV' || substr(md5(random()::text),1,6)));
  insert into partners(user_id, category, legal_name, contact_email, referral_code, status, compliance_note, created_by)
  values (nullif(p->>'user_id','')::uuid, (p->>'category')::partner_category, p->>'legal_name', p->>'contact_email', v_code, 'applied', p->>'compliance_note', auth.uid())
  returning id into v_id;
  perform audit('partner.registered','partner',v_id::text,null,p);
  return v_id;
end $$;

create or replace function set_partner_status(p_id int, p_status partner_status, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare v_old partners;
begin
  if current_app_role() not in ('compliance','admin','super_admin') then raise exception 'FORBIDDEN: partner status changes need compliance/admin'; end if;
  select * into v_old from partners where id = p_id;
  if v_old.id is null then raise exception 'NOT_FOUND'; end if;
  if p_status in ('active','verified') and v_old.category = 'authorized_person' and coalesce(v_old.exchange_approval_ref,'') = '' then
    raise exception 'AUTHORIZED_PERSON_NEEDS_EXCHANGE_APPROVAL_REF';
  end if;
  update partners set status = p_status, compliance_note = coalesce(p_note, compliance_note), updated_at = now() where id = p_id;
  if v_old.user_id is not null and p_status = 'active' then update profiles set role = 'partner' where id = v_old.user_id and role = 'client'; end if;
  perform audit('partner.status.changed','partner',p_id::text,jsonb_build_object('status',v_old.status),jsonb_build_object('status',p_status,'note',p_note));
end $$;

create or replace function update_partner(p_id int, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if current_app_role() not in ('sales','ops','compliance','admin','super_admin') then raise exception 'FORBIDDEN'; end if;
  update partners set
    approved_activities = coalesce((select array_agg(x) from jsonb_array_elements_text(p->'approved_activities') x), approved_activities),
    permitted_channels = coalesce((select array_agg(x) from jsonb_array_elements_text(p->'permitted_channels') x), permitted_channels),
    exchange_approval_ref = coalesce(p->>'exchange_approval_ref', exchange_approval_ref),
    training_valid_until = coalesce((p->>'training_valid_until')::date, training_valid_until),
    user_id = coalesce(nullif(p->>'user_id','')::uuid, user_id),
    updated_at = now()
  where id = p_id;
  perform audit('partner.updated','partner',p_id::text,null,p);
end $$;

create or replace function create_commission_plan(p jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare v_id int;
begin
  if current_app_role() not in ('finance','sales','admin','super_admin','compliance') then raise exception 'FORBIDDEN'; end if;
  insert into commission_plans(code,name,partner_category,basis,rate,cap_per_event,monthly_cap,valid_from,valid_to,legal_basis,tds_pct,created_by)
  values (upper(p->>'code'), p->>'name', (p->>'partner_category')::partner_category, (p->>'basis')::commission_basis, (p->>'rate')::numeric, (p->>'cap_per_event')::numeric, (p->>'monthly_cap')::numeric,
          coalesce((p->>'valid_from')::date, current_date), (p->>'valid_to')::date, coalesce(p->>'legal_basis','Pending legal review'), coalesce((p->>'tds_pct')::numeric, 10), auth.uid())
  returning id into v_id;
  insert into approval_requests(entity_type,entity_id,action,payload,requested_by) values ('commission_plan', v_id::text, 'approve', p, auth.uid());
  perform audit('partner.commission_plan.created','commission_plan',v_id::text,null,p);
  return v_id;
end $$;

create or replace function set_commission_plan_status(p_id int, p_decision text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update commission_plans set status = case when p_decision='approve' then 'approved' else 'rejected' end::approval_status, compliance_approved_by = auth.uid() where id = p_id;
end $$;
revoke execute on function set_commission_plan_status(int,text) from public, anon, authenticated;

create or replace function assign_commission_plan(p_partner int, p_plan_code text) returns void
language plpgsql security definer set search_path = public as $$
declare pl commission_plans; pt partners;
begin
  if current_app_role() not in ('finance','sales','admin','super_admin') then raise exception 'FORBIDDEN'; end if;
  select * into pl from commission_plans where code = p_plan_code and status='approved';
  if pl.id is null then raise exception 'PLAN_NOT_APPROVED'; end if;
  select * into pt from partners where id = p_partner;
  if pt.category <> pl.partner_category then raise exception 'PLAN_CATEGORY_MISMATCH'; end if;
  update partner_plan_assignments set effective_to = current_date - 1 where partner_id = p_partner and effective_to is null;
  insert into partner_plan_assignments(partner_id, plan_id, assigned_by) values (p_partner, pl.id, auth.uid());
  perform audit('partner.plan.assigned','partner',p_partner::text,null,jsonb_build_object('plan',pl.code));
end $$;

-- Accrual hook called from apply_fill (basis = net brokerage) and from approve_kyc_internal (activation)
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
revoke execute on function accrue_partner_commission(text,text,uuid,numeric) from public, anon, authenticated;

-- approve_kyc_internal: add activation accrual + lead conversion (behaviour otherwise unchanged)
create or replace function approve_kyc_internal(p_app uuid, p_reviewer uuid, p_note text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_app kyc_applications; v_acct trading_accounts; v_existing uuid;
begin
  select * into v_app from kyc_applications where id = p_app for update;
  if v_app.status = 'approved' then
    select id into v_existing from trading_accounts where user_id = v_app.user_id and environment='sandbox';
    return v_existing;
  end if;
  update kyc_applications set status='approved', reviewed_by=p_reviewer, reviewed_at=now(), rejection_reason=p_note, updated_at=now() where id=p_app;
  insert into trading_accounts(user_id, environment, status, segments, activated_at)
  values (v_app.user_id,'sandbox','active',v_app.segments,now())
  on conflict (user_id, environment) do update set status='active', activated_at=coalesce(trading_accounts.activated_at, now())
  returning * into v_acct;
  insert into ledger_accounts(code,name,type,trading_account_id)
  values ('C-'||v_acct.client_code, 'Client Funds Payable - '||v_acct.client_code, 'LIABILITY', v_acct.id)
  on conflict (code) do nothing;
  insert into watchlists(user_id,name) select v_app.user_id,'My Watchlist' where not exists (select 1 from watchlists where user_id=v_app.user_id);
  insert into watchlist_items(watchlist_id,instrument_id,position)
    select w.id, i.id, row_number() over () from watchlists w, instruments i
    where w.user_id=v_app.user_id and i.symbol in ('RELIANCE','TCS','HDFCBANK','INFY','NIFTY 50') on conflict do nothing;
  insert into notifications(user_id,kind,title,body) values (v_app.user_id,'account','Sandbox trading account activated',
    'Client code '||v_acct.client_code||'. This is a SIMULATED environment: no real exchange, bank or depository connectivity.');
  perform audit('kyc.approved','kyc_application',p_app::text,jsonb_build_object('status',v_app.status),jsonb_build_object('status','approved','note',p_note,'account_id',v_acct.id));
  perform accrue_partner_commission('activation', v_acct.id::text, v_acct.id, null);
  update leads set status='activated', converted_user_id = v_app.user_id, updated_at=now() where converted_user_id = v_app.user_id or (email is not null and lower(email) = (select lower(email) from profiles where id = v_app.user_id));
  return v_acct.id;
end $$;
revoke execute on function approve_kyc_internal(uuid,uuid,text) from public, anon, authenticated;

-- handle_new_user: capture ?ref= attribution from signup metadata
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_role app_role := 'client'; v_ref text; pt partners;
begin
  if exists (select 1 from app_settings s where s.key='bootstrap_admin_emails' and s.value ? lower(new.email)) then v_role := 'super_admin'; end if;
  insert into profiles(id,email,full_name,role) values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''), v_role) on conflict (id) do nothing;
  v_ref := upper(coalesce(new.raw_user_meta_data->>'referral_code',''));
  if v_ref <> '' then
    select * into pt from partners where referral_code = v_ref and status = 'active';
    if pt.id is not null then
      insert into referral_attributions(client_user_id, partner_id, referral_code) values (new.id, pt.id, v_ref) on conflict do nothing;
    end if;
  end if;
  return new;
end $$;
revoke execute on function handle_new_user() from public, anon, authenticated;

create or replace function create_partner_payout(p_partner int) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_gross numeric; v_tds numeric; v_id bigint; pt partners;
begin
  if current_app_role() not in ('finance','ops','admin','super_admin') then raise exception 'FORBIDDEN'; end if;
  select * into pt from partners where id = p_partner;
  if pt.status not in ('active','suspended') then raise exception 'PARTNER_NOT_ELIGIBLE: previously earned amounts remain payable only for active or suspended partners under review'; end if;
  select coalesce(sum(gross),0), coalesce(sum(tds),0) into v_gross, v_tds from commission_accruals where partner_id = p_partner and status='accrued';
  if v_gross <= 0 then raise exception 'NOTHING_TO_PAY'; end if;
  insert into partner_payouts(partner_id, gross, tds, net, requested_by) values (p_partner, v_gross, v_tds, v_gross - v_tds, auth.uid()) returning id into v_id;
  update commission_accruals set status='in_payout', payout_id = v_id where partner_id = p_partner and status='accrued';
  insert into approval_requests(entity_type,entity_id,action,payload,requested_by) values ('partner_payout', v_id::text, 'approve', jsonb_build_object('partner',p_partner,'net',v_gross - v_tds), auth.uid());
  perform audit('partner.payout.requested','partner_payout',v_id::text,null,jsonb_build_object('gross',v_gross,'tds',v_tds));
  return v_id;
end $$;

create or replace function settle_partner_payout(p_id bigint, p_decision text) returns void
language plpgsql security definer set search_path = public as $$
declare po partner_payouts; pt partners; v_entry bigint;
begin
  select * into po from partner_payouts where id = p_id for update;
  select * into pt from partners where id = po.partner_id;
  if pt.user_id = auth.uid() then raise exception 'PARTNER_CANNOT_APPROVE_OWN_PAYOUT'; end if;
  if p_decision = 'approve' then
    v_entry := post_journal('partner_payout', po.id::text, 'Simulated partner remuneration '||pt.legal_name,
      jsonb_build_array(jsonb_build_object('code','5100','debit', po.gross), jsonb_build_object('code','2400','credit', po.net), jsonb_build_object('code','2200','credit', po.tds)));
    update partner_payouts set status='approved', approved_by=auth.uid(), journal_entry_id=v_entry, paid_at=now() where id = p_id;
    update commission_accruals set status='paid' where payout_id = p_id;
  else
    update partner_payouts set status='rejected', approved_by=auth.uid() where id = p_id;
    update commission_accruals set status='accrued', payout_id = null where payout_id = p_id;
  end if;
end $$;
revoke execute on function settle_partner_payout(bigint,text) from public, anon, authenticated;

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

-- Leads
create or replace function create_lead(p jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_partner int; v_assignee uuid;
begin
  if p->>'full_name' is null then raise exception 'NAME_REQUIRED'; end if;
  -- partner submissions are attributed to the partner; staff submissions carry the source
  select id into v_partner from partners where user_id = auth.uid() and status='active';
  if v_partner is null and not is_staff() and auth.uid() is not null then
    -- authenticated client raising their own interest is allowed only as source 'self'
    v_partner := null;
  end if;
  -- round-robin assignment among sales staff
  select id into v_assignee from profiles where role = 'sales' order by (select count(*) from leads l where l.assigned_to = profiles.id and l.status not in ('activated','lost')) asc, id limit 1;
  insert into leads(full_name,email,phone,source,partner_id,assigned_to,consent_marketing,notes,created_by)
  values (p->>'full_name', p->>'email', p->>'phone', coalesce(p->>'source', case when v_partner is not null then 'partner' else 'website' end), coalesce(nullif(p->>'partner_id','')::int, v_partner), v_assignee, coalesce((p->>'consent_marketing')::boolean,false), p->>'notes', auth.uid())
  returning id into v_id;
  insert into lead_activities(lead_id, actor_id, kind, body) values (v_id, auth.uid(), 'created', 'Lead created from '||coalesce(p->>'source','website'));
  return v_id;
end $$;

create or replace function update_lead(p_id bigint, p_status lead_status, p_note text, p_assignee uuid default null) returns void
language plpgsql security definer set search_path = public as $$
declare l leads;
begin
  select * into l from leads where id = p_id;
  if l.id is null then raise exception 'NOT_FOUND'; end if;
  if not (is_staff() or exists (select 1 from partners where user_id = auth.uid() and id = l.partner_id)) then raise exception 'FORBIDDEN'; end if;
  if not is_staff() and p_assignee is not null then raise exception 'FORBIDDEN'; end if;
  update leads set status = coalesce(p_status, status), assigned_to = coalesce(p_assignee, assigned_to), updated_at = now() where id = p_id;
  insert into lead_activities(lead_id, actor_id, kind, body) values (p_id, auth.uid(), case when p_assignee is not null then 'assignment' when p_status is not null then 'status_change' else 'note' end, coalesce(p_note, p_status::text));
end $$;

-- RLS
alter table partners enable row level security;
alter table partner_agreements enable row level security;
alter table commission_plans enable row level security;
alter table partner_plan_assignments enable row level security;
alter table referral_attributions enable row level security;
alter table commission_accruals enable row level security;
alter table partner_payouts enable row level security;
alter table leads enable row level security;
alter table lead_activities enable row level security;
alter table sales_targets enable row level security;

create policy "partners staff or self" on partners for select using (is_staff() or user_id = auth.uid());
create policy "agreements staff or self" on partner_agreements for select using (is_staff() or partner_id in (select id from partners where user_id = auth.uid()));
create policy "commission plans staff" on commission_plans for select using (is_staff() or status='approved');
create policy "plan assignments staff or self" on partner_plan_assignments for select using (is_staff() or partner_id in (select id from partners where user_id = auth.uid()));
create policy "attribution staff or self" on referral_attributions for select using (is_staff() or client_user_id = auth.uid() or partner_id in (select id from partners where user_id = auth.uid()));
create policy "accruals staff or self" on commission_accruals for select using (is_staff() or partner_id in (select id from partners where user_id = auth.uid()));
create policy "payouts staff or self" on partner_payouts for select using (is_staff() or partner_id in (select id from partners where user_id = auth.uid()));
create policy "leads staff or partner" on leads for select using (is_staff() or partner_id in (select id from partners where user_id = auth.uid()));
create policy "lead activities staff or partner" on lead_activities for select using (is_staff() or lead_id in (select id from leads where partner_id in (select id from partners where user_id = auth.uid())));
create policy "targets staff" on sales_targets for select using (is_staff());
create policy "targets admin write" on sales_targets for all using (current_app_role() in ('sales','admin','super_admin')) with check (current_app_role() in ('sales','admin','super_admin'));

revoke insert, update, delete on partners, partner_agreements, commission_plans, partner_plan_assignments, referral_attributions, commission_accruals, partner_payouts, leads, lead_activities from anon, authenticated;
revoke execute on function partner_for_user(uuid) from public, anon;
revoke execute on function register_partner(jsonb) from public, anon;
revoke execute on function set_partner_status(int, partner_status, text) from public, anon;
revoke execute on function update_partner(int, jsonb) from public, anon;
revoke execute on function create_commission_plan(jsonb) from public, anon;
revoke execute on function assign_commission_plan(int, text) from public, anon;
revoke execute on function create_partner_payout(int) from public, anon;
revoke execute on function partner_passport(int) from public, anon;
revoke execute on function update_lead(bigint, lead_status, text, uuid) from public, anon;
-- create_lead stays callable by anon for the public interest form (validated, rate-limited at the edge)
