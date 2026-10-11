-- 0015: published charge schedule across segments + engine guard.
-- 1) compute_charges_v2 only ever priced NSE equity (CNC/MIS). Now that the catalogue carries approved reference rows for
--    F&O, currency and commodity segments, the statutory/exchange loop must be restricted to segment 'EQ' so those rows
--    can never leak into equity charges. No other logic changes.
create or replace function compute_charges_v2(p_account uuid, p_product product_type, p_side order_side, p_value numeric, p_date date default current_date)
returns jsonb language plpgsql stable set search_path = public as $$
declare v_brok_fee fee_definitions; v_brok numeric; v_brok_gross numeric; v_plan pricing_plans; v_pb jsonb;
        v_stt numeric := 0; v_exch numeric := 0; v_sebi numeric := 0; v_stamp numeric := 0; v_gst numeric := 0; v_gst_rate numeric;
        v_lines jsonb := '[]'::jsonb; f fee_definitions; v_offer offer_campaigns; v_offer_disc numeric := 0; v_waiver waiver_grants; v_waived numeric := 0;
        v_brok_code text := case when p_product='CNC' then 'BRK_CNC' else 'BRK_MIS' end;
begin
  v_brok_fee := active_fee(v_brok_code, p_date);
  v_brok_gross := fee_amount(v_brok_fee, p_value);
  if p_account is not null then
    v_plan := account_plan(p_account, p_date);
    if v_plan.id is not null then
      v_pb := v_plan.brokerage -> p_product::text;
      if v_pb is not null then
        v_brok_gross := least(round(p_value * (v_pb->>'pct')::numeric / 100, 2), case when (v_pb->>'cap')::numeric > 0 then (v_pb->>'cap')::numeric else 1e12 end);
        if (v_pb->>'pct')::numeric = 0 then v_brok_gross := 0; end if;
      end if;
    end if;
  end if;
  v_brok := v_brok_gross;
  v_lines := v_lines || jsonb_build_object('code', v_brok_code, 'name', coalesce(v_brok_fee.name,'Brokerage'), 'classification','BROKER_FEE', 'amount', v_brok_gross, 'plan', coalesce(v_plan.code,'CATALOGUE'));
  if p_account is not null and v_brok > 0 then
    select o.* into v_offer from offer_enrollments e join offer_campaigns o on o.id = e.offer_id
      where e.account_id = p_account and o.status='approved' and o.fee_code = v_brok_code and o.starts_at <= now() and (o.ends_at is null or o.ends_at >= now())
        and e.redemptions < o.per_customer_cap and (o.redemption_limit is null or (select count(*) from offer_redemptions r where r.offer_id=o.id) < o.redemption_limit)
        and (o.budget is null or o.spent < o.budget)
      order by e.enrolled_at desc limit 1;
    if v_offer.id is not null then
      v_offer_disc := least(v_brok, case when v_offer.discount_type='PCT' then round(v_brok * v_offer.value/100, 2) else round(v_offer.value, 2) end);
      v_brok := v_brok - v_offer_disc;
    end if;
    select w.* into v_waiver from waiver_grants w where w.account_id = p_account and w.status='approved' and w.fee_code = v_brok_code
      and w.valid_from <= p_date and (w.valid_to is null or w.valid_to >= p_date) and (w.max_total is null or w.used_total < w.max_total)
      order by w.id desc limit 1;
    if v_waiver.id is not null and v_brok > 0 then
      v_waived := case when v_waiver.waiver_type='FULL' then v_brok when v_waiver.waiver_type='PCT' then round(v_brok * v_waiver.value/100, 2) else least(v_brok, round(v_waiver.value,2)) end;
      if v_waiver.max_total is not null then v_waived := least(v_waived, v_waiver.max_total - v_waiver.used_total); end if;
      v_waived := greatest(v_waived, 0);
      v_brok := v_brok - v_waived;
    end if;
  end if;
  for f in select * from fee_definitions d where d.status='approved' and d.classification in ('STATUTORY_LEVY','EXCHANGE_CHARGE')
      and d.segment = 'EQ'
      and d.fee_code <> 'GST' and (d.product is null or d.product = p_product) and (d.side is null or d.side = p_side)
      and d.effective_from <= p_date and (d.effective_to is null or d.effective_to >= p_date)
      and d.version = (select max(version) from fee_definitions x where x.fee_code = d.fee_code and x.status='approved' and x.effective_from <= p_date) loop
    declare v_amt numeric := fee_amount(f, p_value); begin
      if f.fee_code like 'STT%' then v_stt := v_stt + v_amt;
      elsif f.fee_code = 'EXCH_TXN' then v_exch := v_exch + v_amt;
      elsif f.fee_code = 'SEBI_FEE' then v_sebi := v_sebi + v_amt;
      elsif f.fee_code like 'STAMP%' then v_stamp := v_stamp + v_amt; end if;
      v_lines := v_lines || jsonb_build_object('code', f.fee_code, 'name', f.name, 'classification', f.classification, 'amount', v_amt, 'authority', f.authority);
    end;
  end loop;
  v_gst_rate := coalesce((active_fee('GST', p_date)).rate, 18);
  v_gst := round((v_brok + v_exch + v_sebi) * v_gst_rate / 100, 2);
  v_lines := v_lines || jsonb_build_object('code','GST','name','GST','classification','STATUTORY_LEVY','amount', v_gst, 'basis', v_brok + v_exch + v_sebi);
  return jsonb_build_object('brokerage', v_brok, 'brokerage_gross', v_brok_gross, 'offer_discount', v_offer_disc, 'offer_id', v_offer.id, 'waived', v_waived, 'waiver_id', v_waiver.id,
    'stt', v_stt, 'exchange_txn', v_exch, 'sebi_fee', v_sebi, 'stamp_duty', v_stamp, 'gst', v_gst,
    'total', v_brok + v_stt + v_exch + v_sebi + v_stamp + v_gst, 'lines', v_lines, 'plan', coalesce(v_plan.code,'STANDARD'),
    'schedule_note', 'RevenueOS versioned catalogue (sandbox). Statutory rates follow the published market reference of 2026-10-11 and are re-verified before live use.');
end $$;

-- 2) Published reference rows for segments that are not yet tradable (approved for publication, inert in the engine).
--    Source for every row: https://zerodha.com/charges/ retrieved 2026-10-11 (market reference), to be replaced by exchange/statute citations before live use.
insert into fee_definitions(fee_code,version,name,description,category_id,classification,product,segment,side,calc_method,rate,cap,gst_applicable,accounting_code,authority,source_url,status,effective_from)
select v.code, 1, v.name, v.descr, (select id from fee_categories where code = v.cat), v.cls::fee_classification, null, v.seg, v.side::order_side, v.method::fee_calc_method, v.rate, v.cap, v.gst, v.acct, v.auth, 'https://zerodha.com/charges/', 'approved', '2026-10-11'
from (values
  ('BRK_FUT','Equity futures brokerage','0.03% or Rs 20 per executed order, whichever is lower','BROKERAGE','BROKER_FEE','FO',null,'PCT_CAPPED',0.03,20,true,'4000','AIRAVAT'),
  ('BRK_OPT','Equity options brokerage','Flat Rs 20 per executed order; also charged on expired, exercised and assigned contracts','BROKERAGE','BROKER_FEE','FO',null,'FLAT_PER_ORDER',20,null,true,'4000','AIRAVAT'),
  ('STT_FUT_SELL','STT equity futures sell','0.05% of contract value on the sell side','STATUTORY','STATUTORY_LEVY','FO','SELL','PCT_OF_VALUE',0.05,null,false,'2100','CBDT'),
  ('STT_OPT_SELL','STT equity options sell (premium)','0.15% of premium on the sell side','STATUTORY','STATUTORY_LEVY','FO','SELL','PCT_OF_VALUE',0.15,null,false,'2100','CBDT'),
  ('STT_OPT_EXERCISE','STT equity options exercised (intrinsic)','0.15% of intrinsic value on options bought and exercised','STATUTORY','STATUTORY_LEVY','FO','BUY','PCT_OF_VALUE',0.15,null,false,'2100','CBDT'),
  ('EXCH_TXN_FUT','NSE transaction charge equity futures','0.00183% of contract value (BSE 0%)','EXCHANGE','EXCHANGE_CHARGE','FO',null,'PCT_OF_VALUE',0.00183,null,true,'2300','NSE'),
  ('EXCH_TXN_OPT','NSE transaction charge equity options','0.03553% of premium (BSE 0.0325%)','EXCHANGE','EXCHANGE_CHARGE','FO',null,'PCT_OF_VALUE',0.03553,null,true,'2300','NSE'),
  ('STAMP_FUT_BUY','Stamp duty equity futures buy','0.002% (Rs 200 per crore) on the buy side','STATUTORY','STATUTORY_LEVY','FO','BUY','PCT_OF_VALUE',0.002,null,false,'2100','Ministry of Finance'),
  ('STAMP_OPT_BUY','Stamp duty equity options buy','0.003% (Rs 300 per crore) on the buy side','STATUTORY','STATUTORY_LEVY','FO','BUY','PCT_OF_VALUE',0.003,null,false,'2100','Ministry of Finance'),
  ('BRK_CUR_FUT','Currency futures brokerage','0.03% or Rs 20 per executed order, whichever is lower','BROKERAGE','BROKER_FEE','CDS',null,'PCT_CAPPED',0.03,20,true,'4000','AIRAVAT'),
  ('BRK_CUR_OPT','Currency options brokerage','Flat Rs 20 per executed order','BROKERAGE','BROKER_FEE','CDS',null,'FLAT_PER_ORDER',20,null,true,'4000','AIRAVAT'),
  ('EXCH_TXN_CUR_FUT','NSE transaction charge currency futures','0.00035% of contract value (BSE 0.00045%)','EXCHANGE','EXCHANGE_CHARGE','CDS',null,'PCT_OF_VALUE',0.00035,null,true,'2300','NSE'),
  ('EXCH_TXN_CUR_OPT','NSE transaction charge currency options','0.0311% of premium (BSE 0.001%)','EXCHANGE','EXCHANGE_CHARGE','CDS',null,'PCT_OF_VALUE',0.0311,null,true,'2300','NSE'),
  ('STAMP_CUR_BUY','Stamp duty currency derivatives buy','0.0001% (Rs 10 per crore) on the buy side; no STT on currency','STATUTORY','STATUTORY_LEVY','CDS','BUY','PCT_OF_VALUE',0.0001,null,false,'2100','Ministry of Finance'),
  ('BRK_COM_FUT','Commodity futures brokerage','0.03% or Rs 20 per executed order, whichever is lower','BROKERAGE','BROKER_FEE','COMM',null,'PCT_CAPPED',0.03,20,true,'4000','AIRAVAT'),
  ('BRK_COM_OPT','Commodity options brokerage','Flat Rs 20 per executed order','BROKERAGE','BROKER_FEE','COMM',null,'FLAT_PER_ORDER',20,null,true,'4000','AIRAVAT'),
  ('CTT_COM_FUT_SELL','CTT commodity futures sell (non-agri)','0.01% of contract value on the sell side for non-agri commodities','STATUTORY','STATUTORY_LEVY','COMM','SELL','PCT_OF_VALUE',0.01,null,false,'2100','CBDT'),
  ('CTT_COM_OPT_SELL','CTT commodity options sell','0.05% of premium on the sell side','STATUTORY','STATUTORY_LEVY','COMM','SELL','PCT_OF_VALUE',0.05,null,false,'2100','CBDT'),
  ('EXCH_TXN_COM_FUT','MCX transaction charge commodity futures','0.0021% of contract value (NSE 0.0001%)','EXCHANGE','EXCHANGE_CHARGE','COMM',null,'PCT_OF_VALUE',0.0021,null,true,'2300','MCX'),
  ('EXCH_TXN_COM_OPT','MCX transaction charge commodity options','0.0418% of premium (NSE 0.001%)','EXCHANGE','EXCHANGE_CHARGE','COMM',null,'PCT_OF_VALUE',0.0418,null,true,'2300','MCX'),
  ('SEBI_FEE_COM_AGRI','SEBI fee agri commodities','Rs 1 per crore for agri commodity futures (non-agri Rs 10 per crore)','STATUTORY','STATUTORY_LEVY','COMM',null,'PCT_OF_VALUE',0.00001,null,true,'2100','SEBI'),
  ('STAMP_COM_FUT_BUY','Stamp duty commodity futures buy','0.002% (Rs 200 per crore) on the buy side','STATUTORY','STATUTORY_LEVY','COMM','BUY','PCT_OF_VALUE',0.002,null,false,'2100','Ministry of Finance'),
  ('STAMP_COM_OPT_BUY','Stamp duty commodity options buy','0.003% (Rs 300 per crore) on the buy side','STATUTORY','STATUTORY_LEVY','COMM','BUY','PCT_OF_VALUE',0.003,null,false,'2100','Ministry of Finance')
) as v(code,name,descr,cat,cls,seg,side,method,rate,cap,gst,acct,auth)
where not exists (select 1 from fee_definitions f where f.fee_code = v.code);

select audit('revenueos.catalogue.reference_segments_published','fee_definitions','0015',null,jsonb_build_object('source','https://zerodha.com/charges/','retrieved','2026-10-11','segments',array['FO','CDS','COMM']));
