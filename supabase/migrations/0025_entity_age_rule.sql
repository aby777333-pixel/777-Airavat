-- 0025: the 18-year rule applies to natural persons only. Companies, LLPs, partnerships and trusts carry their
-- incorporation / registration date in date_of_birth (the application's date-of-record) and must not be rejected as minors.
create or replace function submit_kyc(p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_app kyc_applications; v_auto boolean; v_acct uuid; v_pan text := upper(trim(p_payload->>'pan')); v_entity text := coalesce(p_payload->>'entity_type','individual');
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_pan !~ '^[A-Z]{5}[0-9]{4}[A-Z]$' then raise exception 'INVALID_PAN_FORMAT'; end if;
  if v_entity in ('individual','nri','huf') and (p_payload->>'date_of_birth')::date > current_date - interval '18 years' then raise exception 'MUST_BE_ADULT'; end if;
  if v_entity not in ('individual','nri','huf') and (p_payload->>'date_of_birth')::date > current_date then raise exception 'INCORPORATION_DATE_IN_FUTURE'; end if;
  if exists (select 1 from kyc_applications k where k.pan = v_pan and k.user_id <> auth.uid() and k.status in ('submitted','under_review','approved')) then
    raise exception 'DUPLICATE_PAN_APPLICATION';
  end if;
  if exists (select 1 from kyc_applications k where k.user_id = auth.uid() and k.status in ('under_review','approved')) then
    raise exception 'APPLICATION_ALREADY_EXISTS';
  end if;
  insert into kyc_applications(user_id,status,account_type,pan,date_of_birth,address,occupation,income_range,trading_experience,segments,nominee,declarations,risk_profile,submitted_at)
  values (auth.uid(),'under_review',coalesce(p_payload->>'account_type','individual'),v_pan,(p_payload->>'date_of_birth')::date,
          p_payload->'address',p_payload->>'occupation',p_payload->>'income_range',p_payload->>'trading_experience',
          coalesce((select array_agg(x) from jsonb_array_elements_text(p_payload->'segments') x),'{EQ}'),
          p_payload->'nominee',p_payload->'declarations',p_payload->>'risk_profile',now())
  returning * into v_app;
  update profiles set full_name = coalesce(nullif(p_payload->>'full_name',''), full_name), phone = coalesce(p_payload->>'phone', phone), updated_at=now() where id = auth.uid();
  perform audit('kyc.submitted','kyc_application',v_app.id::text,null,to_jsonb(v_app) - 'pan');
  select (value)::boolean into v_auto from app_settings where key='sandbox_auto_approve_kyc';
  if coalesce(v_auto,false) then
    v_acct := approve_kyc_internal(v_app.id, null, 'SANDBOX AUTO-APPROVAL: policy sandbox_auto_approve_kyc=true. No real KRA/CKYC verification performed.');
    return jsonb_build_object('application_id', v_app.id, 'status','approved','account_id', v_acct, 'auto_approved', true);
  end if;
  return jsonb_build_object('application_id', v_app.id, 'status','under_review','auto_approved', false);
end $$;
