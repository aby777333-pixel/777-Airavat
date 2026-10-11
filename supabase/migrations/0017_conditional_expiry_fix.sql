-- 0017: day-validity for broker-managed orders = next 15:30 IST close in the future (sandbox extended hours).
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

