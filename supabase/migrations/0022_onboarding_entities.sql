-- 0022: account opening for every eligible entity type, with sandbox verification steps, document checklists,
-- derivatives activation, re-KYC and dormant-account reactivation. Additive: the existing individual flow is unchanged.
-- Every external check (PAN, CKYC, KRA, DigiLocker, Aadhaar offline XML, bank penny-drop, IPV, eSign, UCC, demat) is a
-- SANDBOX SIMULATION with deterministic format validation; production adapters are blockers recorded in docs.

alter table kyc_applications add column if not exists entity_type text not null default 'individual';
alter table kyc_applications add column if not exists entity_details jsonb;          -- CIN/LLPIN/registration, authorised signatories, karta, PIS details, FATCA/CRS
alter table kyc_applications add column if not exists documents jsonb not null default '[]';  -- [{code, name, status:'provided'|'missing', ref}]
alter table kyc_applications add column if not exists derivatives_requested boolean not null default false;
alter table kyc_applications add column if not exists income_proof jsonb;
alter table trading_accounts add column if not exists last_activity_at timestamptz default now();
alter table trading_accounts add column if not exists kyc_valid_until date;
alter table trading_accounts add column if not exists derivatives_enabled boolean not null default false;
alter table trading_accounts add column if not exists ucc text;
alter table trading_accounts add column if not exists demat_id text;
alter type account_status add value if not exists 'dormant';

create table kyc_verifications (
  id bigserial primary key,
  application_id uuid not null references kyc_applications(id) on delete cascade,
  step text not null,                   -- PAN | CKYC | KRA | DIGILOCKER | AADHAAR_OFFLINE | BANK | IPV | ESIGN | FATCA_CRS | NOMINATION | INCOME_PROOF | UCC | DEMAT_LINK
  status text not null default 'pending',   -- pending | passed | failed | waived
  provider text not null default 'SANDBOX_SIMULATED',
  reference text,
  detail jsonb,
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (application_id, step)
);
create table client_bank_accounts (
  id bigserial primary key,
  account_id uuid references trading_accounts(id),
  user_id uuid not null references profiles(id) on delete cascade,
  bank_name text not null,
  account_number_masked text not null,
  account_number_hash text not null,
  ifsc text not null,
  holder_name text not null,
  is_primary boolean not null default true,
  status text not null default 'pending',   -- pending | verified | rejected
  verification jsonb,
  created_at timestamptz not null default now()
);
create table kyc_events (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  account_id uuid references trading_accounts(id),
  kind text not null,                     -- rekyc_requested | rekyc_completed | dormant_marked | reactivation_requested | reactivated | derivatives_enabled
  detail jsonb, actor_id uuid, created_at timestamptz not null default now()
);
alter table kyc_verifications enable row level security;
alter table client_bank_accounts enable row level security;
alter table kyc_events enable row level security;
create policy "kyc verifications own" on kyc_verifications for select using (is_staff() or application_id in (select id from kyc_applications where user_id = auth.uid()));
create policy "bank accounts own" on client_bank_accounts for select using (user_id = auth.uid() or is_staff());
create policy "kyc events own" on kyc_events for select using (user_id = auth.uid() or is_staff());
revoke insert, update, delete on kyc_verifications, client_bank_accounts, kyc_events from anon, authenticated;

-- Document checklist per entity type (used by the wizard and validated on submit)
create or replace function kyc_document_requirements(p_entity text) returns jsonb
language sql immutable as $$
  select case p_entity
    when 'individual' then '[{"code":"PAN","name":"PAN card"},{"code":"ADDRESS","name":"Address proof (Aadhaar/passport/voter id/DL)"},{"code":"BANK","name":"Cancelled cheque or bank statement"},{"code":"PHOTO","name":"Photograph / IPV"},{"code":"SIGNATURE","name":"Signature"}]'::jsonb
    when 'nri' then '[{"code":"PAN","name":"PAN card"},{"code":"PASSPORT","name":"Passport with visa / OCI"},{"code":"OVERSEAS_ADDRESS","name":"Overseas address proof"},{"code":"PIS","name":"PIS permission letter (NRE) or NRO declaration"},{"code":"NRE_NRO_BANK","name":"NRE/NRO bank proof"},{"code":"FATCA","name":"FATCA/CRS declaration"},{"code":"PHOTO","name":"Photograph / IPV"}]'::jsonb
    when 'huf' then '[{"code":"HUF_PAN","name":"HUF PAN"},{"code":"KARTA_PAN","name":"Karta PAN and KYC"},{"code":"HUF_DEED","name":"HUF deed / declaration with coparceners"},{"code":"BANK","name":"HUF bank proof"},{"code":"KARTA_PHOTO","name":"Karta photograph / IPV"}]'::jsonb
    when 'company' then '[{"code":"COMPANY_PAN","name":"Company PAN"},{"code":"COI","name":"Certificate of incorporation"},{"code":"MOA_AOA","name":"MoA and AoA"},{"code":"BOARD_RESOLUTION","name":"Board resolution for trading and authorised signatories"},{"code":"SIGNATORY_KYC","name":"KYC of authorised signatories and UBOs"},{"code":"BANK","name":"Company bank proof"},{"code":"FINANCIALS","name":"Latest audited financials / net worth"}]'::jsonb
    when 'partnership' then '[{"code":"FIRM_PAN","name":"Firm PAN"},{"code":"DEED","name":"Registered partnership deed"},{"code":"PARTNERS_KYC","name":"KYC of all partners"},{"code":"AUTHORITY","name":"Authority letter for trading"},{"code":"BANK","name":"Firm bank proof"}]'::jsonb
    when 'llp' then '[{"code":"LLP_PAN","name":"LLP PAN"},{"code":"LLPIN","name":"Certificate of incorporation (LLPIN)"},{"code":"LLP_AGREEMENT","name":"LLP agreement"},{"code":"PARTNERS_KYC","name":"KYC of designated partners"},{"code":"RESOLUTION","name":"Resolution for trading"},{"code":"BANK","name":"LLP bank proof"}]'::jsonb
    when 'trust' then '[{"code":"TRUST_PAN","name":"Trust PAN"},{"code":"TRUST_DEED","name":"Trust deed / registration"},{"code":"TRUSTEES_KYC","name":"KYC of trustees"},{"code":"RESOLUTION","name":"Trustee resolution"},{"code":"BANK","name":"Trust bank proof"}]'::jsonb
    else '[]'::jsonb end
$$;

-- Simulated verification: deterministic format checks; each result is recorded with provider SANDBOX_SIMULATED.
create or replace function run_kyc_verification(p_app uuid, p_step text, p_payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k kyc_applications; v_ok boolean := false; v_detail jsonb := '{}'::jsonb; v_ref text;
begin
  select * into k from kyc_applications where id = p_app;
  if k.id is null then raise exception 'NOT_FOUND'; end if;
  if k.user_id <> auth.uid() and not is_staff() then raise exception 'FORBIDDEN'; end if;
  v_ref := 'SIM-'||upper(p_step)||'-'||substr(md5(p_app::text||p_step),1,8);
  case p_step
    when 'PAN' then v_ok := k.pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$' and (k.entity_type <> 'individual' or substr(k.pan,4,1) = 'P') and (k.entity_type not in ('company') or substr(k.pan,4,1) = 'C') and (k.entity_type <> 'huf' or substr(k.pan,4,1) = 'H');
      v_detail := jsonb_build_object('rule','format + 4th character matches entity type','note','Income-tax PAN verification API not connected');
    when 'CKYC' then v_ok := k.pan is not null and k.date_of_birth is not null; v_detail := jsonb_build_object('ckyc_number', case when v_ok then 'SIM'||lpad((random()*1e10)::bigint::text,11,'0') else null end,'note','CERSAI CKYC search/download not connected');
    when 'KRA' then v_ok := k.pan is not null; v_detail := jsonb_build_object('kra_status', case when v_ok then 'KYC_REGISTERED (simulated)' else 'NOT_FOUND' end,'note','KRA fetch not connected');
    when 'DIGILOCKER' then v_ok := coalesce(p_payload->>'consent','') = 'true'; v_detail := jsonb_build_object('documents', case when v_ok then jsonb_build_array('Aadhaar (masked)','PAN') else '[]'::jsonb end,'note','DigiLocker OAuth not connected; consent recorded');
    when 'AADHAAR_OFFLINE' then v_ok := coalesce(p_payload->>'share_code','') ~ '^\d{4}$' and coalesce(p_payload->>'xml_hash','') <> ''; v_detail := jsonb_build_object('method','offline XML (legally permitted route)','last4', right(coalesce(p_payload->>'aadhaar_last4','XXXX'),4),'note','UIDAI offline XML signature validation not connected');
    when 'BANK' then v_ok := coalesce(p_payload->>'ifsc','') ~ '^[A-Z]{4}0[A-Z0-9]{6}$' and length(coalesce(p_payload->>'account_number','')) between 9 and 18;
      v_detail := jsonb_build_object('method','penny drop (simulated)','name_match', v_ok, 'note','Bank verification API not connected');
    when 'IPV' then v_ok := coalesce(p_payload->>'completed','') = 'true'; v_detail := jsonb_build_object('mode', coalesce(p_payload->>'mode','video'),'note','Liveness/video IPV vendor not connected');
    when 'ESIGN' then v_ok := coalesce(p_payload->>'accepted','') = 'true'; v_detail := jsonb_build_object('document','Account opening form + tariff sheet','note','Aadhaar eSign provider not connected; acceptance recorded with timestamp');
    when 'FATCA_CRS' then v_ok := coalesce(p_payload->>'tax_residency','') <> '' and (coalesce(p_payload->>'tax_residency','') = 'IN' or coalesce(p_payload->>'tin','') <> ''); v_detail := p_payload;
    when 'NOMINATION' then v_ok := (k.nominee is not null and k.nominee->>'name' is not null) or coalesce(p_payload->>'opt_out','') = 'true'; v_detail := jsonb_build_object('opt_out', coalesce(p_payload->>'opt_out','false'));
    when 'INCOME_PROOF' then v_ok := coalesce(p_payload->>'type','') in ('salary_slip','itr','bank_statement','holdings_statement','net_worth','form16'); v_detail := jsonb_build_object('type', p_payload->>'type','note','Required for derivatives activation');
    when 'UCC' then v_ok := k.status = 'approved'; v_detail := jsonb_build_object('ucc', case when v_ok then 'UCC-SIM-'||substr(md5(k.id::text),1,8) else null end,'note','Exchange UCC upload not connected');
    when 'DEMAT_LINK' then v_ok := k.status = 'approved'; v_detail := jsonb_build_object('demat', case when v_ok then '1208SIM'||substr(md5(k.id::text),1,8) else null end,'note','Depository BO account opening not connected');
    else raise exception 'UNKNOWN_STEP';
  end case;
  insert into kyc_verifications(application_id, step, status, reference, detail, checked_at) values (p_app, upper(p_step), case when v_ok then 'passed' else 'failed' end, v_ref, v_detail, now())
  on conflict (application_id, step) do update set status = excluded.status, reference = excluded.reference, detail = excluded.detail, checked_at = now();
  perform audit('kyc.verification.'||lower(p_step),'kyc_application',p_app::text,null,jsonb_build_object('status', case when v_ok then 'passed' else 'failed' end, 'simulated', true));
  return jsonb_build_object('step', upper(p_step), 'status', case when v_ok then 'passed' else 'failed' end, 'reference', v_ref, 'detail', v_detail, 'simulated', true);
end $$;

-- Extended submission for all entity types; the legacy submit_kyc(jsonb) keeps working for individuals.
create or replace function submit_kyc_entity(p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_entity text := coalesce(p_payload->>'entity_type','individual'); v_req jsonb; v_missing jsonb; r jsonb; v_app uuid; v_bank_id bigint;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_entity not in ('individual','nri','huf','company','partnership','llp','trust') then raise exception 'UNKNOWN_ENTITY_TYPE'; end if;
  v_req := kyc_document_requirements(v_entity);
  select coalesce(jsonb_agg(d->>'name'),'[]') into v_missing from jsonb_array_elements(v_req) d where not exists (select 1 from jsonb_array_elements(coalesce(p_payload->'documents','[]'::jsonb)) x where x->>'code' = d->>'code' and x->>'status' = 'provided');
  if jsonb_array_length(v_missing) > 0 then raise exception 'DOCUMENTS_MISSING: %', v_missing; end if;
  if v_entity in ('company','partnership','llp','trust') and jsonb_typeof(p_payload->'entity_details'->'authorised_signatories') <> 'array' then raise exception 'AUTHORISED_SIGNATORIES_REQUIRED'; end if;
  if v_entity = 'huf' and (p_payload->'entity_details'->>'karta_name') is null then raise exception 'KARTA_REQUIRED'; end if;
  if v_entity = 'nri' and (p_payload->'entity_details'->>'pis_type') not in ('NRE_PIS','NRO_NON_PIS') then raise exception 'NRI_PIS_TYPE_REQUIRED'; end if;
  if v_entity = 'nri' and coalesce(p_payload->'fatca'->>'tax_residency','') = '' then raise exception 'FATCA_CRS_REQUIRED'; end if;
  if coalesce((p_payload->>'derivatives_requested')::boolean,false) and (p_payload->'income_proof'->>'type') is null then raise exception 'INCOME_PROOF_REQUIRED_FOR_DERIVATIVES'; end if;
  r := submit_kyc(p_payload || jsonb_build_object('account_type', v_entity, 'date_of_birth', coalesce(p_payload->>'date_of_birth', p_payload->'entity_details'->>'incorporation_date', '1990-01-01')));
  v_app := (r->>'application_id')::uuid;
  update kyc_applications set entity_type = v_entity, entity_details = p_payload->'entity_details', documents = coalesce(p_payload->'documents','[]'), derivatives_requested = coalesce((p_payload->>'derivatives_requested')::boolean,false), income_proof = p_payload->'income_proof' where id = v_app;
  -- bank account on file (masked; hash for dedupe)
  if p_payload->'bank' is not null then
    insert into client_bank_accounts(user_id, bank_name, account_number_masked, account_number_hash, ifsc, holder_name)
    values (auth.uid(), coalesce(p_payload->'bank'->>'bank_name','Bank'), 'XXXX'||right(p_payload->'bank'->>'account_number',4), md5(p_payload->'bank'->>'account_number'), upper(p_payload->'bank'->>'ifsc'), coalesce(p_payload->'bank'->>'holder_name', p_payload->>'full_name')) returning id into v_bank_id;
  end if;
  -- run the simulated verification set
  perform run_kyc_verification(v_app, 'PAN'); perform run_kyc_verification(v_app, 'CKYC'); perform run_kyc_verification(v_app, 'KRA');
  perform run_kyc_verification(v_app, 'DIGILOCKER', coalesce(p_payload->'digilocker','{}'::jsonb));
  if p_payload->'aadhaar_offline' is not null then perform run_kyc_verification(v_app, 'AADHAAR_OFFLINE', p_payload->'aadhaar_offline'); end if;
  if p_payload->'bank' is not null then r := run_kyc_verification(v_app, 'BANK', p_payload->'bank'); update client_bank_accounts set status = case when r->>'status'='passed' then 'verified' else 'rejected' end, verification = r where id = v_bank_id; end if;
  perform run_kyc_verification(v_app, 'IPV', coalesce(p_payload->'ipv','{}'::jsonb));
  perform run_kyc_verification(v_app, 'ESIGN', coalesce(p_payload->'esign','{}'::jsonb));
  perform run_kyc_verification(v_app, 'FATCA_CRS', coalesce(p_payload->'fatca', jsonb_build_object('tax_residency','IN')));
  perform run_kyc_verification(v_app, 'NOMINATION', coalesce(p_payload->'nomination','{}'::jsonb));
  if coalesce((p_payload->>'derivatives_requested')::boolean,false) then perform run_kyc_verification(v_app, 'INCOME_PROOF', p_payload->'income_proof'); end if;
  perform run_kyc_verification(v_app, 'UCC'); perform run_kyc_verification(v_app, 'DEMAT_LINK');
  -- post-approval wiring (sandbox auto-approval may already have activated the account)
  update trading_accounts t set ucc = coalesce(t.ucc, 'UCC-SIM-'||substr(md5(v_app::text),1,8)), demat_id = coalesce(t.demat_id, '1208SIM'||substr(md5(v_app::text),1,8)), kyc_valid_until = current_date + interval '2 years', last_activity_at = now(),
    derivatives_enabled = coalesce((p_payload->>'derivatives_requested')::boolean,false) and exists (select 1 from kyc_verifications v where v.application_id = v_app and v.step='INCOME_PROOF' and v.status='passed')
  where t.user_id = auth.uid() and t.environment='sandbox';
  update client_bank_accounts set account_id = (select id from trading_accounts where user_id = auth.uid() and environment='sandbox') where user_id = auth.uid() and account_id is null;
  return r || jsonb_build_object('entity_type', v_entity, 'verifications', (select jsonb_agg(jsonb_build_object('step',step,'status',status)) from kyc_verifications where application_id = v_app));
end $$;

-- Derivatives activation after account opening (income proof → enable; sandbox)
create or replace function activate_derivatives(p_income_proof jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a trading_accounts; k kyc_applications; r jsonb;
begin
  select * into a from trading_accounts where user_id = auth.uid() and environment='sandbox' and status='active';
  if a.id is null then raise exception 'ACCOUNT_NOT_ACTIVE'; end if;
  select * into k from kyc_applications where user_id = auth.uid() and status='approved' order by submitted_at desc limit 1;
  r := run_kyc_verification(k.id, 'INCOME_PROOF', p_income_proof);
  if r->>'status' = 'passed' then
    update trading_accounts set derivatives_enabled = true, segments = array(select distinct unnest(segments || '{FO}')) where id = a.id;
    update kyc_applications set derivatives_requested = true, income_proof = p_income_proof where id = k.id;
    insert into kyc_events(user_id, account_id, kind, detail, actor_id) values (auth.uid(), a.id, 'derivatives_enabled', r, auth.uid());
  end if;
  return r || jsonb_build_object('derivatives_enabled', r->>'status' = 'passed', 'note', 'Segment enablement is a sandbox flag; F&O trading itself is not enabled.');
end $$;

-- Re-KYC and dormancy
create or replace function request_rekyc(p_updates jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a trading_accounts;
begin
  select * into a from trading_accounts where user_id = auth.uid() and environment='sandbox';
  if a.id is null then raise exception 'NO_TRADING_ACCOUNT'; end if;
  update kyc_applications set address = coalesce(p_updates->'address', address), occupation = coalesce(p_updates->>'occupation', occupation), income_range = coalesce(p_updates->>'income_range', income_range), updated_at = now() where user_id = auth.uid() and status='approved';
  update profiles set phone = coalesce(p_updates->>'phone', phone), updated_at = now() where id = auth.uid();
  update trading_accounts set kyc_valid_until = current_date + interval '2 years', last_activity_at = now() where id = a.id;
  insert into kyc_events(user_id, account_id, kind, detail, actor_id) values (auth.uid(), a.id, 'rekyc_completed', p_updates - 'address', auth.uid());
  perform audit('kyc.rekyc','trading_account',a.id::text,null,jsonb_build_object('fields', (select jsonb_agg(k) from jsonb_object_keys(p_updates) k)));
  return jsonb_build_object('ok', true, 'kyc_valid_until', current_date + interval '2 years');
end $$;
create or replace function mark_dormant_accounts(p_days int default 365) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with u as (update trading_accounts t set status = 'dormant' where t.status='active' and coalesce(t.last_activity_at, t.activated_at, t.created_at) < now() - (p_days||' days')::interval
    and not exists (select 1 from orders o where o.account_id = t.id and o.created_at > now() - (p_days||' days')::interval) returning t.id, t.user_id)
  insert into kyc_events(user_id, account_id, kind, detail) select user_id, id, 'dormant_marked', jsonb_build_object('days', p_days) from u;
  get diagnostics n = row_count;
  return n;
end $$;
create or replace function reactivate_account(p_confirmation jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a trading_accounts;
begin
  select * into a from trading_accounts where user_id = auth.uid() and environment='sandbox';
  if a.id is null then raise exception 'NO_TRADING_ACCOUNT'; end if;
  if a.status <> 'dormant' then raise exception 'ACCOUNT_NOT_DORMANT'; end if;
  if coalesce(p_confirmation->>'ipv','') <> 'true' or coalesce(p_confirmation->>'details_confirmed','') <> 'true' then raise exception 'REACTIVATION_REQUIRES_IPV_AND_CONFIRMATION'; end if;
  update trading_accounts set status='active', last_activity_at = now(), kyc_valid_until = current_date + interval '2 years' where id = a.id;
  insert into kyc_events(user_id, account_id, kind, detail, actor_id) values (auth.uid(), a.id, 'reactivated', p_confirmation, auth.uid());
  perform audit('account.reactivated','trading_account',a.id::text,jsonb_build_object('status','dormant'),jsonb_build_object('status','active'));
  return jsonb_build_object('ok', true, 'status', 'active');
end $$;
-- touch activity on orders (keeps dormancy honest)
create or replace function touch_account_activity() returns trigger language plpgsql as $$ begin update trading_accounts set last_activity_at = now() where id = new.account_id; return new; end $$;
drop trigger if exists trg_touch_activity on orders;
create trigger trg_touch_activity after insert on orders for each row execute function touch_account_activity();

-- Staff: verification dashboard for the KYC queue
create or replace function kyc_verification_summary(p_app uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('step',step,'status',status,'provider',provider,'reference',reference,'detail',detail,'checked_at',checked_at) order by id),'[]') from kyc_verifications where application_id = p_app and (is_staff() or exists (select 1 from kyc_applications k where k.id = p_app and k.user_id = auth.uid()))
$$;

revoke execute on function run_kyc_verification(uuid, text, jsonb) from public, anon;
revoke execute on function submit_kyc_entity(jsonb) from public, anon;
revoke execute on function activate_derivatives(jsonb) from public, anon;
revoke execute on function request_rekyc(jsonb) from public, anon;
revoke execute on function mark_dormant_accounts(int) from public, anon, authenticated;
revoke execute on function reactivate_account(jsonb) from public, anon;
revoke execute on function kyc_verification_summary(uuid) from public, anon;
grant execute on function kyc_document_requirements(text) to anon, authenticated;
select cron.schedule('airavat-dormancy', '30 1 * * *', $$select public.mark_dormant_accounts(365)$$);
