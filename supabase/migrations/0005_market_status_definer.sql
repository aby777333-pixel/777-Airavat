-- AIRAVAT | Migration 0005: market_status() must read app_settings/market_holidays regardless of caller RLS (anon public pages)
create or replace function market_status() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_ist timestamp := (now() at time zone 'Asia/Kolkata');
        v_t time := v_ist::time; v_dow int := extract(dow from v_ist); v_status text; v_ext boolean;
begin
  select (value)::boolean into v_ext from app_settings where key='sandbox_extended_hours';
  if v_dow in (0,6) or exists (select 1 from market_holidays where day = v_ist::date) then v_status := 'CLOSED';
  elsif v_t >= '09:00' and v_t < '09:08' then v_status := 'PRE_OPEN';
  elsif v_t >= '09:08' and v_t < '09:15' then v_status := 'PRE_OPEN_MATCHING';
  elsif v_t >= '09:15' and v_t < '15:30' then v_status := 'OPEN';
  elsif v_t >= '15:40' and v_t < '16:00' then v_status := 'CLOSING_SESSION';
  else v_status := 'CLOSED'; end if;
  return jsonb_build_object('status', v_status, 'ist', v_ist, 'exchange_session_live', v_status='OPEN',
    'sandbox_extended_hours', coalesce(v_ext,false), 'accepting_orders', (v_status='OPEN' or coalesce(v_ext,false)),
    'data_source','SIMULATED');
end $$;
grant execute on function market_status() to anon, authenticated;
