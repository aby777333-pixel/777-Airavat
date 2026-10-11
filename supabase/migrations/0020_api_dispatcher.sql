-- 0020: API v1 dispatcher. The HTTP gateway (Next.js) calls api_call() with the presented key; the function authenticates,
-- throttles, enforces scopes and idempotency, then executes the action under the key owner's identity so every order,
-- alert or read goes through exactly the same engine functions and audit trail as the web app.
create or replace function api_call(p_key text, p_action text, p_params jsonb default '{}'::jsonb, p_idem text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare auth_res jsonb; v_user uuid; v_key_id bigint; v_scope text; res jsonb; a trading_accounts; v_inst instruments; v_limit int;
begin
  v_scope := case
    when p_action in ('orders.place','orders.cancel','conditional.place','conditional.cancel') then 'trade'
    when p_action in ('funds.get','funds.deposit') then 'funds'
    when p_action in ('alerts.create','alerts.cancel','alerts.list') then 'alerts'
    when p_action in ('partner.passport','partner.leads','partner.lead.create') then 'partner'
    when p_action in ('admin.health','admin.reconciliation') then 'admin'
    else 'read' end;
  auth_res := api_authenticate(p_key, v_scope);
  if not (auth_res->>'ok')::boolean then return jsonb_build_object('ok', false, 'error', auth_res->>'error', 'detail', auth_res - 'ok' - 'error'); end if;
  v_user := (auth_res->>'user_id')::uuid; v_key_id := (auth_res->>'key_id')::bigint;
  if p_idem is not null then res := api_idempotent_get(v_key_id, p_idem); if res is not null then return res || jsonb_build_object('idempotent_replay', true); end if; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  v_limit := least(coalesce((p_params->>'limit')::int, 100), 500);
  begin
    case p_action
      when 'auth.whoami' then
        res := jsonb_build_object('ok', true, 'user_id', v_user, 'scopes', auth_res->'scopes', 'environment', 'sandbox', 'rate_remaining', auth_res->'remaining');
      when 'instruments.list' then
        res := jsonb_build_object('ok', true, 'data', (select coalesce(jsonb_agg(jsonb_build_object('symbol',symbol,'exchange',exchange,'segment',segment,'name',name,'isin',isin,'sector',sector,'lot_size',lot_size,'tick_size',tick_size,'tradable',tradable,'simulated',is_simulated) order by symbol),'[]') from instruments));
      when 'quotes.get' then
        res := jsonb_build_object('ok', true, 'data_source', 'SIMULATED', 'data', (select coalesce(jsonb_agg(jsonb_build_object('symbol',i.symbol,'ltp',q.ltp,'open',q.open,'high',q.high,'low',q.low,'prev_close',q.prev_close,'volume',q.volume,'bid',q.bid,'ask',q.ask,'updated_at',q.updated_at) order by i.symbol),'[]')
          from quotes q join instruments i on i.id=q.instrument_id where p_params->'symbols' is null or i.symbol in (select upper(x) from jsonb_array_elements_text(p_params->'symbols') x)));
      when 'candles.get' then
        select * into v_inst from instruments where symbol = upper(p_params->>'symbol');
        if v_inst.id is null then raise exception 'INSTRUMENT_NOT_FOUND'; end if;
        res := jsonb_build_object('ok', true, 'symbol', v_inst.symbol, 'timeframe', coalesce(p_params->>'timeframe','1d'), 'data_source', 'SIMULATED', 'data', (select coalesce(jsonb_agg(jsonb_build_object('ts',ts,'o',o,'h',h,'l',l,'c',c,'v',v) order by ts),'[]') from (select * from candles where instrument_id = v_inst.id and timeframe = coalesce(p_params->>'timeframe','1d') order by ts desc limit v_limit) x));
      when 'orders.place' then
        res := place_order(coalesce(p_params->>'client_order_id', 'API-'||v_key_id||'-'||coalesce(p_idem, md5(random()::text))), upper(p_params->>'symbol'), (p_params->>'side')::order_side, coalesce((p_params->>'order_type')::order_type,'MARKET'), coalesce((p_params->>'product')::product_type,'CNC'), (p_params->>'qty')::int, nullif(p_params->>'price','')::numeric, nullif(p_params->>'trigger_price','')::numeric, 'api');
        res := res || jsonb_build_object('ok', true);
      when 'orders.list' then
        res := jsonb_build_object('ok', true, 'data', (select coalesce(jsonb_agg(jsonb_build_object('order_id',o.id,'client_order_id',o.client_order_id,'symbol',i.symbol,'side',o.side,'order_type',o.order_type,'product',o.product,'qty',o.qty,'price',o.price,'trigger_price',o.trigger_price,'filled_qty',o.filled_qty,'avg_fill_price',o.avg_fill_price,'status',o.status,'rejection_reason',o.rejection_reason,'created_at',o.created_at) order by o.created_at desc),'[]')
          from (select * from orders where user_id = v_user order by created_at desc limit v_limit) o join instruments i on i.id = o.instrument_id));
      when 'orders.get' then
        res := jsonb_build_object('ok', true, 'data', (select to_jsonb(o) - 'rms_result' || jsonb_build_object('rms', o.rms_result, 'events', (select coalesce(jsonb_agg(jsonb_build_object('from',from_status,'to',to_status,'at',created_at,'payload',payload) order by created_at),'[]') from order_events e where e.order_id=o.id)) from orders o where o.id = (p_params->>'order_id')::uuid and o.user_id = v_user));
        if res->'data' is null or jsonb_typeof(res->'data') = 'null' then raise exception 'ORDER_NOT_FOUND'; end if;
      when 'orders.cancel' then
        res := cancel_order((p_params->>'order_id')::uuid) || jsonb_build_object('ok', true);
      when 'conditional.place' then
        res := place_conditional_order(p_params) || jsonb_build_object('ok', true);
      when 'conditional.cancel' then
        res := cancel_conditional_order((p_params->>'id')::bigint) || jsonb_build_object('ok', true);
      when 'portfolio.holdings' then
        select * into a from trading_accounts where user_id = v_user and environment='sandbox';
        res := jsonb_build_object('ok', true, 'data', (select coalesce(jsonb_agg(jsonb_build_object('symbol',i.symbol,'qty',h.qty,'avg_price',h.avg_price,'ltp',q.ltp,'value',round(h.qty*q.ltp,2),'pnl',round((q.ltp-h.avg_price)*h.qty,2))),'[]') from holdings h join instruments i on i.id=h.instrument_id join quotes q on q.instrument_id=h.instrument_id where h.account_id = a.id and h.qty <> 0));
      when 'portfolio.positions' then
        select * into a from trading_accounts where user_id = v_user and environment='sandbox';
        res := jsonb_build_object('ok', true, 'data', (select coalesce(jsonb_agg(jsonb_build_object('symbol',i.symbol,'product',p.product,'net_qty',p.net_qty,'avg_price',p.avg_price,'realized_pnl',p.realized_pnl,'ltp',q.ltp,'unrealized_pnl',round((q.ltp-p.avg_price)*p.net_qty,2),'trading_day',p.trading_day)),'[]') from positions p join instruments i on i.id=p.instrument_id join quotes q on q.instrument_id=p.instrument_id where p.account_id = a.id and p.net_qty <> 0));
      when 'funds.get' then
        select * into a from trading_accounts where user_id = v_user and environment='sandbox';
        if a.id is null then raise exception 'NO_TRADING_ACCOUNT'; end if;
        res := jsonb_build_object('ok', true, 'data', account_funds(a.id));
      when 'funds.deposit' then
        res := sandbox_deposit((p_params->>'amount')::numeric, coalesce(p_params->>'reference','api')) || jsonb_build_object('ok', true, 'simulated', true);
      when 'alerts.create' then
        res := jsonb_build_object('ok', true, 'id', create_price_alert(p_params->>'symbol', p_params->>'condition', (p_params->>'price')::numeric, p_params->>'note'));
      when 'alerts.list' then
        res := jsonb_build_object('ok', true, 'data', (select coalesce(jsonb_agg(jsonb_build_object('id',al.id,'symbol',i.symbol,'condition',al.condition,'price',al.price,'status',al.status,'triggered_at',al.triggered_at,'note',al.note) order by al.created_at desc),'[]') from price_alerts al join instruments i on i.id=al.instrument_id where al.user_id = v_user));
      when 'alerts.cancel' then
        perform cancel_price_alert((p_params->>'id')::bigint); res := jsonb_build_object('ok', true);
      when 'partner.passport' then
        res := jsonb_build_object('ok', true, 'data', partner_passport((select id from partners where user_id = v_user limit 1)));
      when 'partner.leads' then
        res := jsonb_build_object('ok', true, 'data', (select coalesce(jsonb_agg(jsonb_build_object('id',id,'full_name',full_name,'status',status,'source',source,'created_at',created_at) order by created_at desc),'[]') from leads where partner_id = (select id from partners where user_id = v_user limit 1)));
      when 'partner.lead.create' then
        res := jsonb_build_object('ok', true, 'id', create_lead(p_params || jsonb_build_object('source','partner_api')));
      when 'admin.health' then
        res := jsonb_build_object('ok', true, 'market', market_status(), 'last_tick', (select max(updated_at) from quotes), 'open_orders', (select count(*) from orders where status in ('ACKNOWLEDGED','PARTIALLY_FILLED')), 'journal_balanced', (select count(*) = 0 from (select entry_id from journal_lines group by entry_id having sum(debit)<>sum(credit)) x));
      when 'admin.reconciliation' then
        res := jsonb_build_object('ok', true, 'data', reconciliation_report());
      else raise exception 'UNKNOWN_ACTION';
    end case;
  exception when others then
    res := jsonb_build_object('ok', false, 'error', split_part(sqlerrm, ':', 1), 'detail', sqlerrm);
  end;
  if p_idem is not null and (res->>'ok')::boolean then perform api_idempotent_put(v_key_id, p_idem, res); end if;
  perform set_config('request.jwt.claims', '', true);
  return res;
end $$;
-- The gateway presents the API key itself; the function is the authenticator, so anon may execute it.
revoke execute on function api_call(text, text, jsonb, text) from public;
grant execute on function api_call(text, text, jsonb, text) to anon, authenticated;
