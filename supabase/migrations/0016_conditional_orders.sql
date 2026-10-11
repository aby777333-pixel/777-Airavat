-- 0016: broker-managed conditional orders (additive).
-- Exchange-native in this sandbox: MARKET, LIMIT, SL, SL-M (handled by place_order / sim_tick).
-- Broker-managed (this migration): GTT, AMO, OCO, TRAILING_STOP, BRACKET, COVER, ICEBERG, BASKET.
-- A conditional order never bypasses RMS: when it triggers, it calls place_order under the owner's claims,
-- so every resulting exchange order carries the full RMS trail, holds and journal postings.

create type cond_kind as enum ('GTT','AMO','OCO','TRAILING_STOP','BRACKET','COVER','ICEBERG','BASKET');
create type cond_status as enum ('PENDING','ACTIVE','TRIGGERED','COMPLETED','CANCELLED','EXPIRED','FAILED');

create table conditional_orders (
  id bigserial primary key,
  account_id uuid not null references trading_accounts(id),
  user_id uuid not null references profiles(id),
  kind cond_kind not null,
  status cond_status not null default 'ACTIVE',
  instrument_id int references instruments(id),
  side order_side,
  product product_type,
  order_type order_type not null default 'MARKET',   -- type of the exchange order placed on trigger
  qty int check (qty is null or qty > 0),
  price numeric(18,4),                                -- limit price for LIMIT-type triggered orders / entry
  trigger_price numeric(18,4),
  trigger_direction text check (trigger_direction in ('ABOVE','BELOW')),
  target_price numeric(18,4),                         -- OCO / BRACKET profit leg
  stop_price numeric(18,4),                           -- OCO / BRACKET / COVER stop leg (SL-M)
  trail_pct numeric(8,4),
  trail_amount numeric(18,4),
  high_water numeric(18,4),
  low_water numeric(18,4),
  disclosed_qty int,
  filled_total int not null default 0,
  legs jsonb,                                         -- BASKET legs and per-leg results
  parent_id bigint references conditional_orders(id),
  entry_order_id uuid references orders(id),
  child_order_ids uuid[] not null default '{}',
  valid_till timestamptz,
  note text,
  last_error text,
  triggered_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on conditional_orders(status) where status in ('PENDING','ACTIVE');
create index on conditional_orders(account_id, created_at desc);

alter table conditional_orders enable row level security;
create policy "conditional own or staff" on conditional_orders for select using (user_id = auth.uid() or is_staff());
revoke insert, update, delete on conditional_orders from anon, authenticated;

-- Validation + creation. Immediate kinds (BASKET, BRACKET/COVER entry, ICEBERG first slice) place real orders now.
create or replace function place_conditional_order(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a trading_accounts; i instruments; q quotes; c conditional_orders; v_kind cond_kind; v_side order_side; v_product product_type; v_type order_type;
        v_qty int; v_price numeric; v_res jsonb; v_leg jsonb; v_results jsonb := '[]'::jsonb; v_cid text; v_child uuid; v_status cond_status := 'ACTIVE';
        v_valid timestamptz; v_dir text; v_trigger numeric;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into a from trading_accounts where user_id = auth.uid() and environment='sandbox';
  if a.id is null then raise exception 'NO_TRADING_ACCOUNT'; end if;
  if a.status <> 'active' then raise exception 'ACCOUNT_NOT_ACTIVE: %', a.status; end if;
  v_kind := (p->>'kind')::cond_kind;
  -- Day validity = the next session close (15:30 IST) that is still in the future, so legs placed during sandbox extended hours survive until the next close.
  v_valid := (date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '15 hours 30 minutes') at time zone 'Asia/Kolkata';
  if v_valid <= now() then v_valid := v_valid + interval '1 day'; end if;
  v_valid := coalesce((p->>'valid_till')::timestamptz, case when v_kind='GTT' then now() + interval '365 days' when v_kind='AMO' then now() + interval '2 days' else v_valid end);
  if (select count(*) from conditional_orders where account_id = a.id and status in ('PENDING','ACTIVE')) >= 50 then raise exception 'CONDITIONAL_ORDER_LIMIT'; end if;

  if v_kind = 'BASKET' then
    if jsonb_typeof(p->'legs') <> 'array' or jsonb_array_length(p->'legs') = 0 or jsonb_array_length(p->'legs') > 20 then raise exception 'BASKET_1_TO_20_LEGS'; end if;
    insert into conditional_orders(account_id,user_id,kind,status,legs,note) values (a.id, auth.uid(), 'BASKET', 'TRIGGERED', p->'legs', p->>'note') returning * into c;
    for v_leg in select * from jsonb_array_elements(p->'legs') loop
      v_cid := 'BSK-'||c.id||'-'||(select count(*) from jsonb_array_elements(v_results))||'-'||substr(md5(random()::text),1,6);
      begin
        v_res := place_order(v_cid, upper(v_leg->>'symbol'), (v_leg->>'side')::order_side, coalesce((v_leg->>'order_type')::order_type,'MARKET'), coalesce((v_leg->>'product')::product_type,'CNC'), (v_leg->>'qty')::int, nullif(v_leg->>'price','')::numeric, nullif(v_leg->>'trigger_price','')::numeric, 'basket');
      exception when others then v_res := jsonb_build_object('status','FAILED','reason', sqlerrm); end;
      v_results := v_results || (v_leg || jsonb_build_object('result', v_res));
      if v_res->>'order_id' is not null then update conditional_orders set child_order_ids = array_append(child_order_ids, (v_res->>'order_id')::uuid) where id = c.id; end if;
    end loop;
    update conditional_orders set legs = v_results, status = 'COMPLETED', completed_at = now(), updated_at = now() where id = c.id;
    perform audit('order.basket.placed','conditional_order',c.id::text,null,jsonb_build_object('legs',jsonb_array_length(v_results)));
    return jsonb_build_object('id', c.id, 'kind', 'BASKET', 'status', 'COMPLETED', 'legs', v_results);
  end if;

  select * into i from instruments where symbol = upper(p->>'symbol') and exchange='NSE';
  if i.id is null then raise exception 'INSTRUMENT_NOT_FOUND'; end if;
  if not i.tradable or i.segment <> 'EQ' then raise exception 'INSTRUMENT_NOT_TRADABLE'; end if;
  select * into q from quotes where instrument_id = i.id;
  v_side := (p->>'side')::order_side; v_product := coalesce((p->>'product')::product_type,'CNC'); v_type := coalesce((p->>'order_type')::order_type,'MARKET');
  v_qty := (p->>'qty')::int; v_price := nullif(p->>'price','')::numeric;
  if v_qty is null or v_qty <= 0 or v_qty % i.lot_size <> 0 then raise exception 'QTY_INVALID'; end if;
  if v_type = 'LIMIT' and (v_price is null or v_price <= 0) then raise exception 'PRICE_REQUIRED'; end if;
  if v_type not in ('MARKET','LIMIT') then raise exception 'CONDITIONAL_ORDERS_PLACE_MARKET_OR_LIMIT'; end if;

  if v_kind = 'GTT' then
    v_trigger := (p->>'trigger_price')::numeric;
    if v_trigger is null or v_trigger <= 0 then raise exception 'TRIGGER_REQUIRED'; end if;
    v_dir := case when v_trigger > q.ltp then 'ABOVE' else 'BELOW' end;
    insert into conditional_orders(account_id,user_id,kind,instrument_id,side,product,order_type,qty,price,trigger_price,trigger_direction,valid_till,note)
    values (a.id,auth.uid(),'GTT',i.id,v_side,v_product,v_type,v_qty,v_price,v_trigger,v_dir,v_valid,p->>'note') returning * into c;
  elsif v_kind = 'AMO' then
    insert into conditional_orders(account_id,user_id,kind,status,instrument_id,side,product,order_type,qty,price,valid_till,note)
    values (a.id,auth.uid(),'AMO','PENDING',i.id,v_side,v_product,v_type,v_qty,v_price,v_valid,p->>'note') returning * into c;
  elsif v_kind = 'OCO' then
    if (p->>'target_price') is null or (p->>'stop_price') is null then raise exception 'OCO_NEEDS_TARGET_AND_STOP'; end if;
    if v_side = 'SELL' and not ((p->>'target_price')::numeric > q.ltp and (p->>'stop_price')::numeric < q.ltp) then raise exception 'OCO_LEGS_MUST_BRACKET_LTP'; end if;
    if v_side = 'BUY' and not ((p->>'target_price')::numeric < q.ltp and (p->>'stop_price')::numeric > q.ltp) then raise exception 'OCO_LEGS_MUST_BRACKET_LTP'; end if;
    insert into conditional_orders(account_id,user_id,kind,instrument_id,side,product,order_type,qty,target_price,stop_price,valid_till,note)
    values (a.id,auth.uid(),'OCO',i.id,v_side,v_product,'MARKET',v_qty,(p->>'target_price')::numeric,(p->>'stop_price')::numeric,v_valid,p->>'note') returning * into c;
  elsif v_kind = 'TRAILING_STOP' then
    if coalesce((p->>'trail_pct')::numeric,0) <= 0 and coalesce((p->>'trail_amount')::numeric,0) <= 0 then raise exception 'TRAIL_REQUIRED'; end if;
    insert into conditional_orders(account_id,user_id,kind,instrument_id,side,product,order_type,qty,trail_pct,trail_amount,high_water,low_water,valid_till,note)
    values (a.id,auth.uid(),'TRAILING_STOP',i.id,v_side,v_product,'MARKET',v_qty,nullif((p->>'trail_pct')::numeric,0),nullif((p->>'trail_amount')::numeric,0),q.ltp,q.ltp,v_valid,p->>'note') returning * into c;
  elsif v_kind in ('BRACKET','COVER') then
    if (p->>'stop_price') is null then raise exception 'STOP_REQUIRED'; end if;
    if v_kind='BRACKET' and (p->>'target_price') is null then raise exception 'TARGET_REQUIRED'; end if;
    if v_side='BUY' and not ((p->>'stop_price')::numeric < coalesce(v_price,q.ltp) and (v_kind='COVER' or (p->>'target_price')::numeric > coalesce(v_price,q.ltp))) then raise exception 'LEGS_INCONSISTENT_WITH_ENTRY'; end if;
    if v_side='SELL' and not ((p->>'stop_price')::numeric > coalesce(v_price,q.ltp) and (v_kind='COVER' or (p->>'target_price')::numeric < coalesce(v_price,q.ltp))) then raise exception 'LEGS_INCONSISTENT_WITH_ENTRY'; end if;
    insert into conditional_orders(account_id,user_id,kind,status,instrument_id,side,product,order_type,qty,price,target_price,stop_price,valid_till,note)
    values (a.id,auth.uid(),v_kind,'TRIGGERED',i.id,v_side,v_product,v_type,v_qty,v_price,nullif(p->>'target_price','')::numeric,(p->>'stop_price')::numeric,v_valid,p->>'note') returning * into c;
    v_res := place_order('CND-'||c.id||'-E', i.symbol, v_side, v_type, v_product, v_qty, v_price, null, lower(v_kind::text));
    if v_res->>'order_id' is not null then update conditional_orders set entry_order_id = (v_res->>'order_id')::uuid where id = c.id; end if;
    if v_res->>'status' = 'RMS_REJECTED' then
      update conditional_orders set status='FAILED', last_error = v_res->>'reason', updated_at=now() where id = c.id;
      return jsonb_build_object('id', c.id, 'kind', v_kind, 'status', 'FAILED', 'reason', v_res->>'reason', 'entry', v_res);
    end if;
    perform activate_bracket_children(c.id);
  elsif v_kind = 'ICEBERG' then
    if coalesce((p->>'disclosed_qty')::int,0) <= 0 or (p->>'disclosed_qty')::int >= v_qty then raise exception 'DISCLOSED_QTY_MUST_BE_BELOW_TOTAL'; end if;
    insert into conditional_orders(account_id,user_id,kind,instrument_id,side,product,order_type,qty,price,disclosed_qty,valid_till,note)
    values (a.id,auth.uid(),'ICEBERG',i.id,v_side,v_product,v_type,v_qty,v_price,(p->>'disclosed_qty')::int,v_valid,p->>'note') returning * into c;
    perform iceberg_next_slice(c.id);
  else raise exception 'UNKNOWN_KIND'; end if;

  select * into c from conditional_orders where id = c.id;
  perform audit('order.conditional.placed','conditional_order',c.id::text,null,p - 'note');
  return jsonb_build_object('id', c.id, 'kind', c.kind, 'status', c.status, 'entry_order_id', c.entry_order_id, 'child_order_ids', c.child_order_ids, 'valid_till', c.valid_till, 'last_error', c.last_error);
end $$;

-- Bracket / cover: once the entry is filled, arm the protective legs as an OCO (bracket) or stop-only (cover) child.
create or replace function activate_bracket_children(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare c conditional_orders; o orders; v_exit order_side; v_child bigint;
begin
  select * into c from conditional_orders where id = p_id;
  if c.entry_order_id is null then return; end if;
  select * into o from orders where id = c.entry_order_id;
  if o.status in ('CANCELLED','EXPIRED','RMS_REJECTED','REJECTED') then
    update conditional_orders set status='CANCELLED', last_error='entry '||o.status, completed_at=now(), updated_at=now() where id = p_id; return;
  end if;
  if o.status <> 'FILLED' then return; end if;   -- still resting; the monitor re-checks every minute
  if exists (select 1 from conditional_orders where parent_id = p_id) then
    update conditional_orders set status='COMPLETED', completed_at=now(), updated_at=now() where id = p_id and status='TRIGGERED'; return;
  end if;
  v_exit := case when c.side='BUY' then 'SELL' else 'BUY' end;
  if c.kind = 'BRACKET' then
    insert into conditional_orders(account_id,user_id,kind,instrument_id,side,product,order_type,qty,target_price,stop_price,parent_id,valid_till,note)
    values (c.account_id,c.user_id,'OCO',c.instrument_id,v_exit,c.product,'MARKET',o.filled_qty,c.target_price,c.stop_price,p_id,c.valid_till,'bracket legs') returning id into v_child;
  else
    insert into conditional_orders(account_id,user_id,kind,instrument_id,side,product,order_type,qty,trigger_price,trigger_direction,parent_id,valid_till,note)
    values (c.account_id,c.user_id,'GTT',c.instrument_id,v_exit,c.product,'MARKET',o.filled_qty,c.stop_price,case when v_exit='SELL' then 'BELOW' else 'ABOVE' end,p_id,c.valid_till,'cover stop') returning id into v_child;
  end if;
  update conditional_orders set status='COMPLETED', completed_at=now(), updated_at=now() where id = p_id;
  perform audit('order.conditional.children_armed','conditional_order',p_id::text,null,jsonb_build_object('child',v_child));
end $$;

-- Iceberg: place the next disclosed slice as a real order; completes when total filled.
create or replace function iceberg_next_slice(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare c conditional_orders; i instruments; v_last orders; v_slice int; v_res jsonb;
begin
  select * into c from conditional_orders where id = p_id for update;
  if c.status not in ('ACTIVE') then return; end if;
  if array_length(c.child_order_ids,1) is not null then
    select * into v_last from orders where id = c.child_order_ids[array_length(c.child_order_ids,1)];
    if v_last.status in ('ACKNOWLEDGED','PARTIALLY_FILLED') then return; end if;   -- slice still working
    if v_last.status in ('CANCELLED','EXPIRED','RMS_REJECTED','REJECTED') then
      update conditional_orders set status='CANCELLED', last_error='slice '||v_last.status, completed_at=now(), updated_at=now() where id = p_id; return;
    end if;
  end if;
  if c.filled_total >= c.qty then update conditional_orders set status='COMPLETED', completed_at=now(), updated_at=now() where id = p_id; return; end if;
  select * into i from instruments where id = c.instrument_id;
  v_slice := least(c.disclosed_qty, c.qty - c.filled_total);
  v_res := place_order('CND-'||c.id||'-S'||(coalesce(array_length(c.child_order_ids,1),0)+1), i.symbol, c.side, c.order_type, c.product, v_slice, c.price, null, 'iceberg');
  if v_res->>'status' = 'RMS_REJECTED' then
    update conditional_orders set status='FAILED', last_error = v_res->>'reason', updated_at=now() where id = p_id; return;
  end if;
  update conditional_orders set child_order_ids = array_append(child_order_ids, (v_res->>'order_id')::uuid), triggered_at = coalesce(triggered_at, now()),
    filled_total = filled_total + case when v_res->>'status'='FILLED' then v_slice else 0 end, updated_at = now() where id = p_id;
  if (select filled_total from conditional_orders where id = p_id) >= c.qty then update conditional_orders set status='COMPLETED', completed_at=now() where id = p_id; end if;
end $$;

-- Monitor: runs every minute (cron). Evaluates triggers under each owner's claims so RMS and audit apply unchanged.
create or replace function process_conditional_orders() returns jsonb
language plpgsql security definer set search_path = public as $$
declare c record; q quotes; i instruments; ms jsonb := market_status(); v_fire boolean; v_res jsonb; v_n int := 0; v_fired int := 0; v_stop numeric; v_leg text;
begin
  for c in select * from conditional_orders where status in ('PENDING','ACTIVE','TRIGGERED') order by id loop
    v_n := v_n + 1;
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', c.user_id, 'role', 'authenticated')::text, true);
      if c.valid_till is not null and c.valid_till < now() and c.status in ('PENDING','ACTIVE') then
        update conditional_orders set status='EXPIRED', completed_at=now(), updated_at=now() where id = c.id;
        perform audit('order.conditional.expired','conditional_order',c.id::text,null,null); continue;
      end if;
      if c.kind in ('BRACKET','COVER') and c.status='TRIGGERED' then perform activate_bracket_children(c.id); continue; end if;
      if c.kind = 'ICEBERG' then
        -- credit fills of the working slice before deciding the next one
        update conditional_orders co set filled_total = (select coalesce(sum(o.filled_qty),0) from orders o where o.id = any(co.child_order_ids)) where co.id = c.id;
        perform iceberg_next_slice(c.id); continue;
      end if;
      if not (ms->>'accepting_orders')::boolean then continue; end if;
      select * into q from quotes where instrument_id = c.instrument_id; select * into i from instruments where id = c.instrument_id;
      v_fire := false; v_leg := null;
      if c.kind = 'AMO' then v_fire := true; v_leg := 'amo';
      elsif c.kind = 'GTT' then v_fire := (c.trigger_direction='ABOVE' and q.ltp >= c.trigger_price) or (c.trigger_direction='BELOW' and q.ltp <= c.trigger_price); v_leg := 'gtt';
      elsif c.kind = 'OCO' then
        if c.side='SELL' then
          if q.ltp >= c.target_price then v_fire := true; v_leg := 'target'; elsif q.ltp <= c.stop_price then v_fire := true; v_leg := 'stop'; end if;
        else
          if q.ltp <= c.target_price then v_fire := true; v_leg := 'target'; elsif q.ltp >= c.stop_price then v_fire := true; v_leg := 'stop'; end if;
        end if;
      elsif c.kind = 'TRAILING_STOP' then
        if c.side='SELL' then
          update conditional_orders set high_water = greatest(high_water, q.ltp), updated_at=now() where id = c.id and q.ltp > high_water;
          v_stop := case when c.trail_pct is not null then greatest(c.high_water, q.ltp) * (1 - c.trail_pct/100) else greatest(c.high_water, q.ltp) - c.trail_amount end;
          v_fire := q.ltp <= v_stop;
        else
          update conditional_orders set low_water = least(low_water, q.ltp), updated_at=now() where id = c.id and q.ltp < low_water;
          v_stop := case when c.trail_pct is not null then least(c.low_water, q.ltp) * (1 + c.trail_pct/100) else least(c.low_water, q.ltp) + c.trail_amount end;
          v_fire := q.ltp >= v_stop;
        end if;
        v_leg := 'trail';
      end if;
      if v_fire then
        v_res := place_order('CND-'||c.id||'-'||v_leg, i.symbol, c.side, case when c.kind in ('OCO','TRAILING_STOP') then 'MARKET' else c.order_type end, c.product, c.qty,
                             case when c.kind in ('OCO','TRAILING_STOP') then null else c.price end, null, 'conditional:'||c.kind::text);
        if v_res->>'status' = 'RMS_REJECTED' then
          update conditional_orders set status='FAILED', last_error = v_res->>'reason', triggered_at = now(), child_order_ids = array_append(child_order_ids,(v_res->>'order_id')::uuid), updated_at=now() where id = c.id;
        else
          update conditional_orders set status='COMPLETED', triggered_at = now(), completed_at = now(), child_order_ids = array_append(child_order_ids,(v_res->>'order_id')::uuid), note = coalesce(note,'')||' fired:'||v_leg, updated_at=now() where id = c.id;
          v_fired := v_fired + 1;
        end if;
        insert into notifications(user_id,kind,title,body) values (c.user_id,'order', c.kind::text||' triggered: '||i.symbol, 'Leg '||v_leg||' fired at simulated LTP '||q.ltp||' → '||coalesce(v_res->>'status','?')||coalesce(' ('||(v_res->>'reason')||')',''));
        perform audit('order.conditional.fired','conditional_order',c.id::text,null,jsonb_build_object('leg',v_leg,'ltp',q.ltp,'result',v_res - 'rms'));
      end if;
    exception when others then
      update conditional_orders set status='FAILED', last_error = left(sqlerrm, 300), updated_at=now() where id = c.id;
      perform audit('order.conditional.failed','conditional_order',c.id::text,null,jsonb_build_object('error',sqlerrm));
    end;
  end loop;
  perform set_config('request.jwt.claims', '', true);
  return jsonb_build_object('evaluated', v_n, 'fired', v_fired, 'at', now());
end $$;

create or replace function cancel_conditional_order(p_id bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c conditional_orders;
begin
  select * into c from conditional_orders where id = p_id for update;
  if c.id is null then raise exception 'NOT_FOUND'; end if;
  if c.user_id <> auth.uid() and not is_staff() then raise exception 'FORBIDDEN'; end if;
  if c.status not in ('PENDING','ACTIVE','TRIGGERED') then raise exception 'CONDITIONAL_NOT_OPEN: %', c.status; end if;
  update conditional_orders set status='CANCELLED', completed_at=now(), updated_at=now() where id = p_id or (parent_id = p_id and status in ('PENDING','ACTIVE'));
  perform audit('order.conditional.cancelled','conditional_order',p_id::text,jsonb_build_object('status',c.status),jsonb_build_object('status','CANCELLED'));
  return jsonb_build_object('id', p_id, 'status', 'CANCELLED');
end $$;

revoke execute on function place_conditional_order(jsonb) from public, anon;
revoke execute on function cancel_conditional_order(bigint) from public, anon;
revoke execute on function activate_bracket_children(bigint) from public, anon, authenticated;
revoke execute on function iceberg_next_slice(bigint) from public, anon, authenticated;
revoke execute on function process_conditional_orders() from public, anon, authenticated;

select cron.schedule('airavat-conditional-orders', '* * * * *', $$select public.process_conditional_orders()$$);
