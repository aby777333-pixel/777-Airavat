-- 0019: developer platform (sandbox API keys, scopes, throttling, idempotency) and price alerts.
create table api_keys (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  key_prefix text not null,                 -- first 10 chars, shown in UI
  key_hash text not null unique,            -- sha256 of the full key
  scopes text[] not null default '{read}',  -- read | trade | funds | alerts | partner | admin
  environment text not null default 'sandbox',
  rate_limit_per_min int not null default 120,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create table api_usage (
  key_id bigint not null references api_keys(id) on delete cascade,
  minute timestamptz not null,
  calls int not null default 0,
  primary key (key_id, minute)
);
create table api_idempotency (
  key_id bigint not null references api_keys(id) on delete cascade,
  idem_key text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (key_id, idem_key)
);
create table price_alerts (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  instrument_id int not null references instruments(id) on delete cascade,
  condition text not null check (condition in ('ABOVE','BELOW')),
  price numeric(18,4) not null,
  note text,
  status text not null default 'active',   -- active | triggered | cancelled
  triggered_at timestamptz,
  created_at timestamptz not null default now()
);
alter table api_keys enable row level security;
alter table api_usage enable row level security;
alter table api_idempotency enable row level security;
alter table price_alerts enable row level security;
create policy "api keys own" on api_keys for select using (user_id = auth.uid() or is_staff());
create policy "alerts own" on price_alerts for select using (user_id = auth.uid() or is_staff());
revoke insert, update, delete on api_keys, api_usage, api_idempotency, price_alerts from anon, authenticated;

-- Issue a key: returns the full secret exactly once; only the hash is stored.
create or replace function issue_api_key(p_name text, p_scopes text[]) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_key text; v_id bigint; v_scopes text[];
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if (select count(*) from api_keys where user_id = auth.uid() and revoked_at is null) >= 5 then raise exception 'API_KEY_LIMIT'; end if;
  v_scopes := array(select unnest(p_scopes) intersect select unnest(array['read','trade','funds','alerts','partner','admin']));
  if 'admin' = any(v_scopes) and not is_staff() then raise exception 'ADMIN_SCOPE_REQUIRES_STAFF'; end if;
  if 'partner' = any(v_scopes) and not exists (select 1 from partners where user_id = auth.uid()) and not is_staff() then raise exception 'PARTNER_SCOPE_REQUIRES_PARTNER'; end if;
  v_key := 'avsb_' || encode(extensions.gen_random_bytes(24), 'hex');
  insert into api_keys(user_id, name, key_prefix, key_hash, scopes) values (auth.uid(), left(coalesce(p_name,'key'),60), left(v_key, 10), encode(extensions.digest(v_key, 'sha256'), 'hex'), v_scopes) returning id into v_id;
  perform audit('api.key.issued','api_key',v_id::text,null,jsonb_build_object('scopes',v_scopes));
  return jsonb_build_object('id', v_id, 'key', v_key, 'prefix', left(v_key,10), 'scopes', v_scopes, 'environment', 'sandbox');
end $$;
create or replace function revoke_api_key(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  update api_keys set revoked_at = now() where id = p_id and (user_id = auth.uid() or is_staff()) and revoked_at is null;
  perform audit('api.key.revoked','api_key',p_id::text,null,null);
end $$;

-- Resolve a presented key (called by the API gateway with the service context): returns owner, scopes and throttle result.
create or replace function api_authenticate(p_key text, p_scope text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare k api_keys; v_calls int; v_min timestamptz := date_trunc('minute', now());
begin
  select * into k from api_keys where key_hash = encode(extensions.digest(p_key, 'sha256'), 'hex');
  if k.id is null or k.revoked_at is not null then return jsonb_build_object('ok', false, 'error', 'INVALID_KEY'); end if;
  if p_scope is not null and not (p_scope = any(k.scopes)) then return jsonb_build_object('ok', false, 'error', 'SCOPE_MISSING', 'required', p_scope); end if;
  insert into api_usage(key_id, minute, calls) values (k.id, v_min, 1) on conflict (key_id, minute) do update set calls = api_usage.calls + 1 returning calls into v_calls;
  if v_calls > k.rate_limit_per_min then return jsonb_build_object('ok', false, 'error', 'RATE_LIMITED', 'limit', k.rate_limit_per_min); end if;
  update api_keys set last_used_at = now() where id = k.id;
  delete from api_usage where minute < now() - interval '1 hour';
  return jsonb_build_object('ok', true, 'key_id', k.id, 'user_id', k.user_id, 'scopes', k.scopes, 'remaining', k.rate_limit_per_min - v_calls);
end $$;
create or replace function api_idempotent_get(p_key_id bigint, p_idem text) returns jsonb
language sql security definer set search_path = public as $$ select response from api_idempotency where key_id = p_key_id and idem_key = p_idem $$;
create or replace function api_idempotent_put(p_key_id bigint, p_idem text, p_response jsonb) returns void
language sql security definer set search_path = public as $$ insert into api_idempotency(key_id, idem_key, response) values (p_key_id, p_idem, p_response) on conflict do nothing; delete from api_idempotency where created_at < now() - interval '24 hours' $$;

-- Price alerts (user) + evaluation (cron, every minute)
create or replace function create_price_alert(p_symbol text, p_condition text, p_price numeric, p_note text default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare i instruments; v_id bigint;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into i from instruments where symbol = upper(p_symbol);
  if i.id is null then raise exception 'INSTRUMENT_NOT_FOUND'; end if;
  if (select count(*) from price_alerts where user_id = auth.uid() and status='active') >= 50 then raise exception 'ALERT_LIMIT'; end if;
  insert into price_alerts(user_id, instrument_id, condition, price, note) values (auth.uid(), i.id, upper(p_condition), p_price, p_note) returning id into v_id;
  return v_id;
end $$;
create or replace function cancel_price_alert(p_id bigint) returns void
language sql security definer set search_path = public as $$ update price_alerts set status='cancelled' where id = p_id and user_id = auth.uid() and status='active' $$;
create or replace function process_price_alerts() returns int
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in select a.*, q.ltp, i.symbol from price_alerts a join quotes q on q.instrument_id = a.instrument_id join instruments i on i.id = a.instrument_id where a.status='active' loop
    if (r.condition='ABOVE' and r.ltp >= r.price) or (r.condition='BELOW' and r.ltp <= r.price) then
      update price_alerts set status='triggered', triggered_at=now() where id = r.id;
      insert into notifications(user_id,kind,title,body) values (r.user_id,'alert','Price alert: '||r.symbol||' '||lower(r.condition)||' '||r.price,'Simulated LTP '||r.ltp||coalesce(' · '||r.note,''));
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;
revoke execute on function issue_api_key(text, text[]) from public, anon;
revoke execute on function revoke_api_key(bigint) from public, anon;
revoke execute on function api_authenticate(text, text) from public, anon, authenticated;
revoke execute on function api_idempotent_get(bigint, text) from public, anon, authenticated;
revoke execute on function api_idempotent_put(bigint, text, jsonb) from public, anon, authenticated;
revoke execute on function create_price_alert(text, text, numeric, text) from public, anon;
revoke execute on function cancel_price_alert(bigint) from public, anon;
revoke execute on function process_price_alerts() from public, anon, authenticated;
select cron.schedule('airavat-price-alerts', '* * * * *', $$select public.process_price_alerts()$$);
