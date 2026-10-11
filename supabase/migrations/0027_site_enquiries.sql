-- 0027: general enquiries from the public contact page (anonymous allowed, validated, rate limited, honeypot),
-- tracked by the support desk with a reference number; optional CRM lead with explicit consent.
create table site_enquiries (
  id bigserial primary key,
  reference text not null unique,
  kind text not null,                 -- account_opening | trading_platforms | pricing | partnership | api_developer | corporate | media | careers | grievance | feedback | other
  full_name text not null,
  email text,
  phone text,
  city text,
  state text,
  country text not null default 'IN',
  preferred_language text not null default 'en',
  existing_client boolean not null default false,
  client_code text,
  segments text[] not null default '{}',
  horizon text,
  capital_range text,
  heard_from text,
  callback_slot text,
  subject text,
  message text not null,
  consent_contact boolean not null default false,
  consent_marketing boolean not null default false,
  user_id uuid,
  lead_id bigint,
  status text not null default 'new', -- new | in_progress | answered | closed | spam
  assigned_to uuid references profiles(id),
  staff_note text,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on site_enquiries(status, created_at desc);
alter table site_enquiries enable row level security;
create policy "enquiries staff" on site_enquiries for select using (is_staff() or (user_id is not null and user_id = auth.uid()));
revoke insert, update, delete on site_enquiries from anon, authenticated;

create or replace function submit_enquiry(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_ref text; v_email text := nullif(lower(trim(p->>'email')),''); v_phone text := nullif(regexp_replace(coalesce(p->>'phone',''), '\D', '', 'g'),''); v_lead bigint; v_kind text := coalesce(p->>'kind','other');
begin
  if coalesce(p->>'website','') <> '' then return jsonb_build_object('reference', 'ENQ-OK'); end if;   -- honeypot: pretend success
  if length(coalesce(p->>'full_name','')) < 2 then raise exception 'NAME_REQUIRED'; end if;
  if v_email is null and v_phone is null then raise exception 'CONTACT_REQUIRED: provide an email or a mobile number'; end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'INVALID_EMAIL'; end if;
  if v_phone is not null and v_phone !~ '^[6-9]\d{9}$' and length(v_phone) < 8 then raise exception 'INVALID_PHONE'; end if;
  if length(coalesce(p->>'message','')) < 10 then raise exception 'MESSAGE_TOO_SHORT'; end if;
  if v_kind not in ('account_opening','trading_platforms','pricing','partnership','api_developer','corporate','media','careers','grievance','feedback','other') then raise exception 'INVALID_KIND'; end if;
  if not coalesce((p->>'consent_contact')::boolean, false) then raise exception 'CONSENT_REQUIRED'; end if;
  if (select count(*) from site_enquiries e where e.created_at > now() - interval '1 hour' and (e.email = v_email or e.phone = v_phone)) >= 5 then raise exception 'TOO_MANY_REQUESTS: please try again later'; end if;
  v_ref := 'ENQ-'||to_char(now() at time zone 'Asia/Kolkata','YYYYMMDD')||'-'||upper(substr(md5(random()::text),1,6));
  if coalesce((p->>'consent_marketing')::boolean,false) then
    begin
      v_lead := create_lead(jsonb_build_object('full_name', p->>'full_name', 'email', v_email, 'phone', v_phone, 'source', 'contact-page', 'consent_marketing', true, 'notes', 'Enquiry '||v_ref||' · '||v_kind));
    exception when others then v_lead := null; end;
  end if;
  insert into site_enquiries(reference, kind, full_name, email, phone, city, state, country, preferred_language, existing_client, client_code, segments, horizon, capital_range, heard_from, callback_slot, subject, message, consent_contact, consent_marketing, user_id, lead_id)
  values (v_ref, v_kind, trim(p->>'full_name'), v_email, v_phone, nullif(trim(p->>'city'),''), nullif(trim(p->>'state'),''), coalesce(nullif(p->>'country',''),'IN'), coalesce(nullif(p->>'preferred_language',''),'en'),
    coalesce((p->>'existing_client')::boolean,false), nullif(trim(p->>'client_code'),''), coalesce((select array_agg(x) from jsonb_array_elements_text(p->'segments') x),'{}'), nullif(p->>'horizon',''), nullif(p->>'capital_range',''), nullif(p->>'heard_from',''), nullif(p->>'callback_slot',''),
    nullif(trim(p->>'subject'),''), trim(p->>'message'), true, coalesce((p->>'consent_marketing')::boolean,false), auth.uid(), v_lead)
  returning id into v_id;
  perform audit('enquiry.submitted','site_enquiry',v_id::text,null,jsonb_build_object('kind',v_kind,'reference',v_ref,'grievance', v_kind='grievance'));
  return jsonb_build_object('reference', v_ref, 'id', v_id, 'kind', v_kind, 'sla_hours', case when v_kind='grievance' then 48 else 72 end);
end $$;
create or replace function update_enquiry(p_id bigint, p_status text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'FORBIDDEN'; end if;
  if p_status not in ('new','in_progress','answered','closed','spam') then raise exception 'INVALID_STATUS'; end if;
  update site_enquiries set status = p_status, staff_note = coalesce(p_note, staff_note), assigned_to = coalesce(assigned_to, auth.uid()), answered_at = case when p_status='answered' then now() else answered_at end, updated_at = now() where id = p_id;
  perform audit('enquiry.updated','site_enquiry',p_id::text,null,jsonb_build_object('status',p_status,'note',p_note));
end $$;
grant execute on function submit_enquiry(jsonb) to anon, authenticated;
revoke execute on function update_enquiry(bigint, text, text) from public, anon;
