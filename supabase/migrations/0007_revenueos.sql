-- AIRAVAT | Migration 0007: RevenueOS — versioned fee catalogue, statutory levies, pricing plans, waivers,
-- offers, approvals, charge adjustments, subscriptions, revenue reporting. Strictly additive.
-- Existing compute_charges(product, side, value) keeps its signature and produces identical results for the
-- seeded catalogue (verified in TEST_RESULTS.md); apply_fill now uses the account-aware v2 calculation.

create or replace function is_staff() returns boolean
language sql stable set search_path = public as $$
  select current_app_role() in ('dealer','ops','risk','compliance','admin','super_admin','finance','editor','sales')
$$;

-- post_journal: skip zero/zero lines (balance check unchanged)
create or replace function post_journal(p_ref_type text, p_ref_id text, p_narration text, p_lines jsonb)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_entry bigint; v_line jsonb; v_acct int; v_dr numeric(18,2):=0; v_cr numeric(18,2):=0;
begin
  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_dr := v_dr + coalesce((v_line->>'debit')::numeric,0);
    v_cr := v_cr + coalesce((v_line->>'credit')::numeric,0);
  end loop;
  if round(v_dr,2) <> round(v_cr,2) then
    raise exception 'LEDGER_UNBALANCED: debits % != credits %', v_dr, v_cr;
  end if;
  insert into journal_entries(ref_type, ref_id, narration, posted_by)
  values (p_ref_type, p_ref_id, p_narration, auth.uid()) returning id into v_entry;
  for v_line in select * from jsonb_array_elements(p_lines) loop
    if coalesce((v_line->>'debit')::numeric,0) = 0 and coalesce((v_line->>'credit')::numeric,0) = 0 then continue; end if;
    if v_line ? 'ledger_account_id' then v_acct := (v_line->>'ledger_account_id')::int;
    else select id into v_acct from ledger_accounts where code = v_line->>'code'; end if;
    if v_acct is null then raise exception 'LEDGER_ACCOUNT_NOT_FOUND %', v_line; end if;
    insert into journal_lines(entry_id, ledger_account_id, debit, credit)
    values (v_entry, v_acct, coalesce((v_line->>'debit')::numeric,0), coalesce((v_line->>'credit')::numeric,0));
  end loop;
  return v_entry;
end $$;
revoke execute on function post_journal(text,text,text,jsonb) from public, anon, authenticated;

create type fee_calc_method as enum ('FLAT_PER_ORDER','PCT_OF_VALUE','PCT_CAPPED');
create type fee_classification as enum ('BROKER_FEE','STATUTORY_LEVY','EXCHANGE_CHARGE','PASS_THROUGH','SUBSCRIPTION');
create type approval_status as enum ('draft','pending_approval','approved','rejected','retired');

-- Generic maker-checker approval requests
create table approval_requests (
  id bigserial primary key,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  payload jsonb,
  requested_by uuid not null,
  status approval_status not null default 'pending_approval',
  decided_by uuid,
  decided_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);
create index on approval_requests(status);

create table fee_categories (
  id serial primary key,
  code text not null unique,
  name text not null,
  description text
);
insert into fee_categories(code,name,description) values
 ('BROKERAGE','Brokerage','Broker-controlled execution fees'),
 ('STATUTORY','Statutory levies','Taxes and levies mandated by law; not broker-controlled'),
 ('EXCHANGE','Exchange & clearing charges','Pass-through charges of exchanges and clearing corporations'),
 ('ACCOUNT','Account services','Account opening, maintenance and servicing fees'),
 ('DEPOSITORY','Depository services','DP transaction, pledge and related charges'),
 ('SUBSCRIPTION','Subscriptions','Premium platform, research, data and API subscriptions');

-- Every row is an immutable version. A change = new row (version+1, supersedes = previous id).
create table fee_definitions (
  id serial primary key,
  fee_code text not null,
  version int not null default 1,
  supersedes int references fee_definitions(id),
  name text not null,
  description text,
  category_id int not null references fee_categories(id),
  classification fee_classification not null,
  product product_type,              -- null = all products
  segment text not null default 'EQ',
  side order_side,                   -- null = both sides
  calc_method fee_calc_method not null,
  rate numeric(14,6) not null,       -- % for PCT methods, INR for FLAT
  cap numeric(12,2),
  min_amount numeric(12,2),
  gst_applicable boolean not null default false,
  accounting_code text not null,     -- ledger account code the credit posts to
  authority text,                    -- for levies: source authority
  source_url text,
  status approval_status not null default 'draft',
  effective_from date not null default current_date,
  effective_to date,
  created_by uuid,
  approved_by uuid,
  created_at timestamptz not null default now(),
  unique (fee_code, version)
);
create index on fee_definitions(fee_code, status, effective_from);

-- Seed catalogue identical to the sandbox charge_schedules so existing calculations are unchanged
insert into fee_definitions(fee_code,name,description,category_id,classification,product,side,calc_method,rate,cap,gst_applicable,accounting_code,authority,status,effective_from) values
 ('BRK_CNC','Equity delivery brokerage','Zero brokerage on delivery (sandbox tariff)',1,'BROKER_FEE','CNC',null,'PCT_OF_VALUE',0,null,true,'4000','AIRAVAT','approved','2026-01-01'),
 ('BRK_MIS','Equity intraday brokerage','0.03% or Rs 20 per executed order, whichever is lower (sandbox tariff)',1,'BROKER_FEE','MIS',null,'PCT_CAPPED',0.03,20,true,'4000','AIRAVAT','approved','2026-01-01'),
 ('STT_CNC_BUY','STT delivery buy','Securities Transaction Tax, delivery buy (illustrative; verify current notification)',2,'STATUTORY_LEVY','CNC','BUY','PCT_OF_VALUE',0.1,null,false,'2200','CBDT','approved','2026-01-01'),
 ('STT_CNC_SELL','STT delivery sell','Securities Transaction Tax, delivery sell (illustrative; verify)',2,'STATUTORY_LEVY','CNC','SELL','PCT_OF_VALUE',0.1,null,false,'2200','CBDT','approved','2026-01-01'),
 ('STT_MIS_SELL','STT intraday sell','Securities Transaction Tax, intraday sell side (illustrative; verify)',2,'STATUTORY_LEVY','MIS','SELL','PCT_OF_VALUE',0.025,null,false,'2200','CBDT','approved','2026-01-01'),
 ('EXCH_TXN','Exchange transaction charge','NSE transaction charge (illustrative; verify exchange circular)',3,'EXCHANGE_CHARGE',null,null,'PCT_OF_VALUE',0.00297,null,true,'2300','NSE','approved','2026-01-01'),
 ('SEBI_FEE','SEBI turnover fee','SEBI fee (illustrative; verify)',2,'STATUTORY_LEVY',null,null,'PCT_OF_VALUE',0.0001,null,true,'2200','SEBI','approved','2026-01-01'),
 ('STAMP_CNC_BUY','Stamp duty delivery buy','Stamp duty, delivery buy (illustrative; verify state/central schedule)',2,'STATUTORY_LEVY','CNC','BUY','PCT_OF_VALUE',0.015,null,false,'2200','Ministry of Finance','approved','2026-01-01'),
 ('STAMP_MIS_BUY','Stamp duty intraday buy','Stamp duty, intraday buy (illustrative; verify)',2,'STATUTORY_LEVY','MIS','BUY','PCT_OF_VALUE',0.003,null,false,'2200','Ministry of Finance','approved','2026-01-01'),
 ('ACC_OPEN','Account opening','Sandbox: nil',4,'BROKER_FEE',null,null,'FLAT_PER_ORDER',0,null,true,'4000','AIRAVAT','approved','2026-01-01'),
 ('DP_AMC','Demat annual maintenance','Not yet defined; disabled until a DP arrangement exists',5,'BROKER_FEE',null,null,'FLAT_PER_ORDER',0,null,true,'4000','AIRAVAT','draft','2026-01-01');

-- GST rate as a statutory rule row
insert into fee_definitions(fee_code,name,description,category_id,classification,calc_method,rate,gst_applicable,accounting_code,authority,status,effective_from) values
 ('GST','GST on brokerage and charges','GST applied to brokerage + exchange + SEBI (illustrative; verify)',2,'STATUTORY_LEVY','PCT_OF_VALUE',18,false,'2200','CBIC','approved','2026-01-01');

insert into ledger_accounts(code,name,type) values
 ('4100','Brokerage Waivers & Discounts (contra-income)','EXPENSE'),
 ('4200','Subscription Revenue','INCOME'),
 ('2400','Partner Remuneration Payable','LIABILITY'),
 ('5100','Partner Remuneration Expense','EXPENSE'),
 ('5200','Vendor & Infrastructure Costs','EXPENSE')
on conflict (code) do nothing;

-- Pricing plans
create table pricing_plans (
  id serial primary key,
  code text not null unique,
  name text not null,
  description text,
  brokerage jsonb not null,   -- {"CNC":{"pct":0,"cap":0},"MIS":{"pct":0.03,"cap":20}}
  eligibility text,
  status approval_status not null default 'draft',
  effective_from date not null default current_date,
  created_by uuid, approved_by uuid,
  created_at timestamptz not null default now()
);
insert into pricing_plans(code,name,description,brokerage,eligibility,status) values
 ('STANDARD','Standard','Default sandbox plan: zero delivery brokerage, Rs 20/0.03% intraday','{"CNC":{"pct":0,"cap":0},"MIS":{"pct":0.03,"cap":20}}','All clients','approved'),
 ('ACTIVE_TRADER','Active Trader','Illustrative: Rs 10/0.02% intraday for high-activity clients','{"CNC":{"pct":0,"cap":0},"MIS":{"pct":0.02,"cap":10}}','Eligibility to be defined; requires approval','draft'),
 ('PROFESSIONAL','Professional','Illustrative: flat Rs 5 intraday; subscription-inclusive terminal','{"CNC":{"pct":0,"cap":0},"MIS":{"pct":0.01,"cap":5}}','Professional accounts only','draft');

create table plan_assignments (
  id bigserial primary key,
  account_id uuid not null references trading_accounts(id),
  plan_id int not null references pricing_plans(id),
  effective_from date not null default current_date,
  effective_to date,
  assigned_by uuid,
  note text,
  client_acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);
create index on plan_assignments(account_id, effective_from desc);

-- Waivers (broker fees only)
create type waiver_type as enum ('FULL','PCT','FIXED');
create table waiver_grants (
  id bigserial primary key,
  account_id uuid not null references trading_accounts(id),
  fee_code text not null,
  waiver_type waiver_type not null,
  value numeric(12,4) not null default 0,
  max_total numeric(14,2),
  used_total numeric(14,2) not null default 0,
  valid_from date not null default current_date,
  valid_to date,
  reason text not null,
  status approval_status not null default 'pending_approval',
  requested_by uuid not null,
  approved_by uuid,
  created_at timestamptz not null default now()
);
create index on waiver_grants(account_id, status);

-- Offers
create type discount_type as enum ('PCT','FIXED');
create table offer_campaigns (
  id serial primary key,
  code text not null unique,
  name text not null,
  description text,
  fee_code text not null,
  discount_type discount_type not null,
  value numeric(12,4) not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  redemption_limit int,
  per_customer_cap int not null default 100,
  budget numeric(14,2),
  spent numeric(14,2) not null default 0,
  disclosures text,
  status approval_status not null default 'draft',
  created_by uuid, compliance_approved_by uuid,
  created_at timestamptz not null default now()
);
create table offer_enrollments (
  account_id uuid not null references trading_accounts(id),
  offer_id int not null references offer_campaigns(id),
  enrolled_at timestamptz not null default now(),
  redemptions int not null default 0,
  primary key (account_id, offer_id)
);
create table offer_redemptions (
  id bigserial primary key,
  offer_id int not null references offer_campaigns(id),
  account_id uuid not null references trading_accounts(id),
  trade_id uuid,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);

-- Charge adjustments (refund / reversal) — never edit posted lines
create table charge_adjustments (
  id bigserial primary key,
  trade_id uuid not null references trades(id),
  account_id uuid not null references trading_accounts(id),
  fee_code text not null,
  amount numeric(12,2) not null check (amount > 0),
  reason text not null,
  status approval_status not null default 'pending_approval',
  requested_by uuid not null,
  approved_by uuid,
  journal_entry_id bigint references journal_entries(id),
  created_at timestamptz not null default now()
);

-- Subscriptions (simulated billing)
create table subscription_plans (
  id serial primary key,
  code text not null unique,
  name text not null,
  description text,
  price_month numeric(12,2) not null,
  features text[] not null default '{}',
  status approval_status not null default 'draft',
  created_at timestamptz not null default now()
);
insert into subscription_plans(code,name,description,price_month,features,status) values
 ('RESEARCH_PLUS','Research ONE Plus','Illustrative sandbox subscription: saved investigations, scanner alerts, AI research dossiers',499,'{"Unlimited saved cases","Scanner alerts","AI dossiers"}','approved'),
 ('TERMINAL_PRO','Terminal Pro','Illustrative sandbox subscription: professional terminal features',999,'{"Advanced layouts","Priority support"}','draft');
create table subscriptions (
  id bigserial primary key,
  account_id uuid not null references trading_accounts(id),
  plan_id int not null references subscription_plans(id),
  status text not null default 'active',   -- trial | active | cancelled | past_due
  started_at timestamptz not null default now(),
  renews_at timestamptz,
  cancelled_at timestamptz,
  invoice_entry_id bigint references journal_entries(id)
);

-- Vendor costs for profitability (management view, not statutory accounts)
create table vendor_costs (
  id bigserial primary key,
  vendor text not null,
  category text not null,
  period_month date not null,
  amount numeric(14,2) not null,
  note text,
  recorded_by uuid,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Calculation engine
-- ---------------------------------------------------------------------------
create or replace function active_fee(p_code text, p_date date default current_date) returns fee_definitions
language sql stable set search_path = public as $$
  select * from fee_definitions f where f.fee_code = p_code and f.status='approved'
    and f.effective_from <= p_date and (f.effective_to is null or f.effective_to >= p_date)
  order by f.version desc limit 1
$$;

create or replace function fee_amount(f fee_definitions, p_value numeric) returns numeric
language sql immutable as $$
  select case
    when f.id is null then 0
    when f.calc_method = 'FLAT_PER_ORDER' then round(f.rate, 2)
    when f.calc_method = 'PCT_OF_VALUE' then round(p_value * f.rate / 100, 2)
    when f.calc_method = 'PCT_CAPPED' then least(round(p_value * f.rate / 100, 2), coalesce(f.cap, 1e12))
  end
$$;

create or replace function account_plan(p_account uuid, p_date date default current_date) returns pricing_plans
language sql stable set search_path = public as $$
  select p.* from plan_assignments a join pricing_plans p on p.id = a.plan_id
  where a.account_id = p_account and a.effective_from <= p_date and (a.effective_to is null or a.effective_to >= p_date) and p.status='approved'
  order by a.effective_from desc, a.id desc limit 1
$$;

-- Account-aware charge calculation with full traceability.
create or replace function compute_charges_v2(p_account uuid, p_product product_type, p_side order_side, p_value numeric, p_date date default current_date)
returns jsonb language plpgsql stable set search_path = public as $$
declare v_brok_fee fee_definitions; v_brok numeric; v_brok_gross numeric; v_plan pricing_plans; v_pb jsonb;
        v_stt numeric := 0; v_exch numeric := 0; v_sebi numeric := 0; v_stamp numeric := 0; v_gst numeric := 0; v_gst_rate numeric;
        v_lines jsonb := '[]'::jsonb; f fee_definitions; v_offer offer_campaigns; v_offer_disc numeric := 0; v_waiver waiver_grants; v_waived numeric := 0;
        v_brok_code text := case when p_product='CNC' then 'BRK_CNC' else 'BRK_MIS' end;
begin
  v_brok_fee := active_fee(v_brok_code, p_date);
  v_brok_gross := fee_amount(v_brok_fee, p_value);
  -- pricing plan override (approved plans only)
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

  -- offers then waivers, broker fee only, never negative
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

  -- statutory and exchange lines (never waivable)
  for f in select * from fee_definitions d where d.status='approved' and d.classification in ('STATUTORY_LEVY','EXCHANGE_CHARGE')
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
    'schedule_note', 'RevenueOS versioned catalogue (sandbox). Statutory rates are illustrative and must be verified before live use.');
end $$;

-- Legacy signature preserved: catalogue-driven, no account context.
create or replace function compute_charges(p_product product_type, p_side order_side, p_value numeric)
returns jsonb language sql stable set search_path = public as $$
  select compute_charges_v2(null, p_product, p_side, p_value, current_date)
$$;

-- apply_fill: use v2 with the account, post waiver as contra-income, record offer redemptions / waiver usage
create or replace function apply_fill(p_order uuid, p_qty int, p_price numeric) returns uuid
language plpgsql security definer set search_path = public as $$
declare o orders; a trading_accounts; v_value numeric; ch jsonb; t trades; p positions; v_entry bigint;
        v_day date := (now() at time zone 'Asia/Kolkata')::date; v_new_filled int; v_new_avg numeric;
        v_pnl numeric := 0; v_lines jsonb; v_total numeric; v_sym text; v_avg_all numeric; v_waived numeric; v_disc numeric; v_gross numeric;
begin
  select * into o from orders where id = p_order for update;
  select * into a from trading_accounts where id = o.account_id;
  select symbol into v_sym from instruments where id = o.instrument_id;
  v_value := round(p_qty * p_price, 2);
  ch := compute_charges_v2(o.account_id, o.product, o.side, v_value, v_day);
  v_total := (ch->>'total')::numeric; v_waived := coalesce((ch->>'waived')::numeric,0); v_disc := coalesce((ch->>'offer_discount')::numeric,0); v_gross := (ch->>'brokerage_gross')::numeric;
  insert into trades(order_id,account_id,instrument_id,side,product,qty,price,value,brokerage,stt,exchange_txn,sebi_fee,stamp_duty,gst,total_charges,exchange_trade_id)
  values (o.id,o.account_id,o.instrument_id,o.side,o.product,p_qty,p_price,v_value,(ch->>'brokerage')::numeric,(ch->>'stt')::numeric,(ch->>'exchange_txn')::numeric,
          (ch->>'sebi_fee')::numeric,(ch->>'stamp_duty')::numeric,(ch->>'gst')::numeric,v_total,'SIMT-'||to_char(now(),'YYYYMMDD')||'-'||lpad(nextval('client_code_seq')::text,8,'0'))
  returning * into t;
  if v_waived > 0 and (ch->>'waiver_id') is not null then update waiver_grants set used_total = used_total + v_waived where id = (ch->>'waiver_id')::bigint; end if;
  if v_disc > 0 and (ch->>'offer_id') is not null then
    insert into offer_redemptions(offer_id, account_id, trade_id, amount) values ((ch->>'offer_id')::int, o.account_id, t.id, v_disc);
    update offer_enrollments set redemptions = redemptions + 1 where account_id = o.account_id and offer_id = (ch->>'offer_id')::int;
    update offer_campaigns set spent = spent + v_disc where id = (ch->>'offer_id')::int;
  end if;

  insert into positions(account_id,instrument_id,product,trading_day) values (o.account_id,o.instrument_id,o.product,v_day) on conflict do nothing;
  select * into p from positions where account_id=o.account_id and instrument_id=o.instrument_id and product=o.product and trading_day=v_day for update;
  if o.side = 'BUY' then
    if p.net_qty >= 0 then v_new_avg := case when p.net_qty + p_qty = 0 then 0 else (p.avg_price*p.net_qty + p_price*p_qty)/(p.net_qty+p_qty) end;
    else v_pnl := (p.avg_price - p_price) * least(p_qty, -p.net_qty);
      v_new_avg := case when p.net_qty + p_qty > 0 then p_price when p.net_qty + p_qty = 0 then 0 else p.avg_price end; end if;
    update positions set net_qty = net_qty + p_qty, buy_qty = buy_qty + p_qty, buy_value = buy_value + v_value, avg_price = v_new_avg, realized_pnl = realized_pnl + v_pnl, updated_at=now()
      where account_id=o.account_id and instrument_id=o.instrument_id and product=o.product and trading_day=v_day;
  else
    if p.net_qty <= 0 then v_new_avg := case when p.net_qty - p_qty = 0 then 0 else (p.avg_price*(-p.net_qty) + p_price*p_qty)/((-p.net_qty)+p_qty) end;
    else v_pnl := (p_price - p.avg_price) * least(p_qty, p.net_qty);
      v_new_avg := case when p.net_qty - p_qty < 0 then p_price when p.net_qty - p_qty = 0 then 0 else p.avg_price end; end if;
    update positions set net_qty = net_qty - p_qty, sell_qty = sell_qty + p_qty, sell_value = sell_value + v_value, avg_price = v_new_avg, realized_pnl = realized_pnl + v_pnl, updated_at=now()
      where account_id=o.account_id and instrument_id=o.instrument_id and product=o.product and trading_day=v_day;
    if o.product='CNC' then
      update holdings set qty = qty - p_qty, updated_at=now() where account_id=o.account_id and instrument_id=o.instrument_id;
      delete from holdings where account_id=o.account_id and instrument_id=o.instrument_id and qty <= 0;
    end if;
  end if;
  if o.side='BUY' and o.product='CNC' then
    insert into holdings(account_id,instrument_id,qty,avg_price) values (o.account_id,o.instrument_id,p_qty,p_price)
    on conflict (account_id,instrument_id) do update set avg_price = (holdings.avg_price*holdings.qty + p_price*p_qty)/(holdings.qty+p_qty), qty = holdings.qty + p_qty, updated_at=now();
  end if;

  -- Ledger: client pays net charges; brokerage recognised gross with waivers/discounts as contra-income
  if o.side='BUY' then
    v_lines := jsonb_build_array(
      jsonb_build_object('code','C-'||a.client_code,'debit', v_value + v_total),
      jsonb_build_object('code','4100','debit', v_waived + v_disc),
      jsonb_build_object('code','2100','credit', v_value),
      jsonb_build_object('code','4000','credit', v_gross),
      jsonb_build_object('code','2200','credit', (ch->>'stt')::numeric + (ch->>'sebi_fee')::numeric + (ch->>'stamp_duty')::numeric + (ch->>'gst')::numeric),
      jsonb_build_object('code','2300','credit', (ch->>'exchange_txn')::numeric));
  else
    v_lines := jsonb_build_array(
      jsonb_build_object('code','1100','debit', v_value),
      jsonb_build_object('code','4100','debit', v_waived + v_disc),
      jsonb_build_object('code','C-'||a.client_code,'credit', v_value - v_total),
      jsonb_build_object('code','4000','credit', v_gross),
      jsonb_build_object('code','2200','credit', (ch->>'stt')::numeric + (ch->>'sebi_fee')::numeric + (ch->>'stamp_duty')::numeric + (ch->>'gst')::numeric),
      jsonb_build_object('code','2300','credit', (ch->>'exchange_txn')::numeric));
  end if;
  v_entry := post_journal('trade', t.id::text, 'Simulated '||o.side||' '||p_qty||' x '||v_sym||' @ '||p_price, v_lines);
  update trades set journal_entry_id = v_entry where id = t.id;

  v_new_filled := o.filled_qty + p_qty;
  v_avg_all := round((coalesce(o.avg_fill_price,0)*o.filled_qty + p_price*p_qty)/v_new_filled, 4);
  update orders set filled_qty = v_new_filled, avg_fill_price = v_avg_all, updated_at = now() where id = o.id;
  if v_new_filled >= o.qty then
    perform order_transition(o.id,'FILLED',jsonb_build_object('trade_id',t.id,'qty',p_qty,'price',p_price));
    update fund_holds set released = true where order_id = o.id and not released;
    insert into notifications(user_id,kind,title,body) values (o.user_id,'order','Order filled (simulated)', o.side||' '||o.qty||' '||v_sym||' @ avg '||round(v_avg_all,2));
  else
    perform order_transition(o.id,'PARTIALLY_FILLED',jsonb_build_object('trade_id',t.id,'qty',p_qty,'price',p_price));
  end if;
  perform audit('order.fill.simulated','order',o.id::text,null,jsonb_build_object('trade_id',t.id,'qty',p_qty,'price',p_price,'charges',ch));
  perform accrue_partner_commission('trade', t.id::text, o.account_id, v_gross - v_waived - v_disc);
  return t.id;
end $$;
revoke execute on function apply_fill(uuid,int,numeric) from public, anon, authenticated;

-- placeholder hook; replaced by the Partner migration
create or replace function accrue_partner_commission(p_event_type text, p_event_id text, p_account uuid, p_basis numeric) returns void
language plpgsql security definer set search_path = public as $$ begin return; end $$;
revoke execute on function accrue_partner_commission(text,text,uuid,numeric) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin functions (maker-checker)
-- ---------------------------------------------------------------------------
create or replace function submit_fee_version(p jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare v_prev fee_definitions; v_id int; v_ver int := 1;
begin
  if current_app_role() not in ('finance','admin','super_admin','compliance') then raise exception 'FORBIDDEN'; end if;
  select * into v_prev from fee_definitions where fee_code = p->>'fee_code' order by version desc limit 1;
  if v_prev.id is not null then v_ver := v_prev.version + 1; end if;
  if (p->>'classification') in ('STATUTORY_LEVY','EXCHANGE_CHARGE') and current_app_role() not in ('compliance','super_admin') then
    raise exception 'STATUTORY_CHANGE_REQUIRES_COMPLIANCE';
  end if;
  insert into fee_definitions(fee_code,version,supersedes,name,description,category_id,classification,product,side,calc_method,rate,cap,min_amount,gst_applicable,accounting_code,authority,source_url,status,effective_from,created_by)
  values (p->>'fee_code', v_ver, v_prev.id, coalesce(p->>'name', v_prev.name), p->>'description', coalesce((p->>'category_id')::int, v_prev.category_id),
          coalesce((p->>'classification')::fee_classification, v_prev.classification), coalesce((p->>'product')::product_type, v_prev.product), coalesce((p->>'side')::order_side, v_prev.side),
          coalesce((p->>'calc_method')::fee_calc_method, v_prev.calc_method), (p->>'rate')::numeric, (p->>'cap')::numeric, (p->>'min_amount')::numeric,
          coalesce((p->>'gst_applicable')::boolean, v_prev.gst_applicable, false), coalesce(p->>'accounting_code', v_prev.accounting_code, '4000'), coalesce(p->>'authority', v_prev.authority),
          p->>'source_url', 'pending_approval', coalesce((p->>'effective_from')::date, current_date), auth.uid())
  returning id into v_id;
  insert into approval_requests(entity_type, entity_id, action, payload, requested_by) values ('fee_definition', v_id::text, 'activate', p, auth.uid());
  perform audit('revenueos.fee.submitted','fee_definition',v_id::text,to_jsonb(v_prev),p);
  return v_id;
end $$;

create or replace function decide_approval(p_request bigint, p_decision text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare r approval_requests; v_role app_role := current_app_role(); f fee_definitions; w waiver_grants; adj charge_adjustments; a trading_accounts; v_entry bigint;
begin
  select * into r from approval_requests where id = p_request for update;
  if r.id is null then raise exception 'NOT_FOUND'; end if;
  if r.status <> 'pending_approval' then raise exception 'NOT_PENDING'; end if;
  if r.requested_by = auth.uid() then raise exception 'MAKER_CHECKER_VIOLATION: requester cannot approve own request'; end if;
  if p_decision not in ('approve','reject') then raise exception 'INVALID_DECISION'; end if;
  -- role matrix
  if r.entity_type = 'fee_definition' then
    select * into f from fee_definitions where id = r.entity_id::int;
    if f.classification in ('STATUTORY_LEVY','EXCHANGE_CHARGE') then
      if v_role not in ('compliance','super_admin') then raise exception 'FORBIDDEN: statutory changes need compliance'; end if;
    elsif v_role not in ('finance','admin','super_admin') then raise exception 'FORBIDDEN'; end if;
    if p_decision='approve' then
      update fee_definitions set status='retired', effective_to = least(coalesce(effective_to, f.effective_from - 1), f.effective_from - 1) where fee_code = f.fee_code and id <> f.id and status='approved';
      update fee_definitions set status='approved', approved_by=auth.uid() where id = f.id;
    else update fee_definitions set status='rejected' where id = f.id; end if;
  elsif r.entity_type = 'waiver_grant' then
    if v_role not in ('finance','admin','super_admin') then raise exception 'FORBIDDEN'; end if;
    update waiver_grants set status = case when p_decision='approve' then 'approved' else 'rejected' end::approval_status, approved_by = auth.uid() where id = r.entity_id::bigint;
  elsif r.entity_type = 'offer_campaign' then
    if v_role not in ('compliance','super_admin') then raise exception 'FORBIDDEN: offers need compliance approval'; end if;
    update offer_campaigns set status = case when p_decision='approve' then 'approved' else 'rejected' end::approval_status, compliance_approved_by = auth.uid() where id = r.entity_id::int;
  elsif r.entity_type = 'pricing_plan' then
    if v_role not in ('finance','admin','super_admin') then raise exception 'FORBIDDEN'; end if;
    update pricing_plans set status = case when p_decision='approve' then 'approved' else 'rejected' end::approval_status, approved_by = auth.uid() where id = r.entity_id::int;
  elsif r.entity_type = 'charge_adjustment' then
    if v_role not in ('finance','admin','super_admin') then raise exception 'FORBIDDEN'; end if;
    select * into adj from charge_adjustments where id = r.entity_id::bigint;
    if p_decision='approve' then
      select * into a from trading_accounts where id = adj.account_id;
      v_entry := post_journal('charge_adjustment', adj.id::text, 'Fee reversal '||adj.fee_code||' on trade '||adj.trade_id,
        jsonb_build_array(jsonb_build_object('code','4000','debit',adj.amount), jsonb_build_object('code','C-'||a.client_code,'credit',adj.amount)));
      update charge_adjustments set status='approved', approved_by=auth.uid(), journal_entry_id=v_entry where id = adj.id;
      insert into notifications(user_id,kind,title,body) values (a.user_id,'funds','Fee adjustment credited','Rs '||adj.amount||' reversed for '||adj.fee_code||' ('||adj.reason||').');
    else update charge_adjustments set status='rejected', approved_by=auth.uid() where id = adj.id; end if;
  elsif r.entity_type = 'commission_plan' then
    if v_role not in ('compliance','super_admin') then raise exception 'FORBIDDEN: commission plans need compliance approval'; end if;
    perform set_commission_plan_status(r.entity_id::int, p_decision);
  elsif r.entity_type = 'partner_payout' then
    if v_role not in ('finance','admin','super_admin') then raise exception 'FORBIDDEN'; end if;
    perform settle_partner_payout(r.entity_id::bigint, p_decision);
  else raise exception 'UNKNOWN_ENTITY_TYPE'; end if;
  update approval_requests set status = case when p_decision='approve' then 'approved' else 'rejected' end::approval_status, decided_by=auth.uid(), decided_at=now(), note=p_note where id = p_request;
  perform audit('approval.'||p_decision, r.entity_type, r.entity_id, to_jsonb(r), jsonb_build_object('note',p_note));
end $$;

-- placeholders replaced in the Partner migration
create or replace function set_commission_plan_status(p_id int, p_decision text) returns void language plpgsql security definer set search_path = public as $$ begin raise exception 'PARTNER_MODULE_NOT_INSTALLED'; end $$;
create or replace function settle_partner_payout(p_id bigint, p_decision text) returns void language plpgsql security definer set search_path = public as $$ begin raise exception 'PARTNER_MODULE_NOT_INSTALLED'; end $$;
revoke execute on function set_commission_plan_status(int,text) from public, anon, authenticated;
revoke execute on function settle_partner_payout(bigint,text) from public, anon, authenticated;

create or replace function request_waiver(p_account uuid, p_fee_code text, p_type waiver_type, p_value numeric, p_max_total numeric, p_valid_to date, p_reason text) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint; f fee_definitions;
begin
  if current_app_role() not in ('ops','finance','admin','super_admin','sales') then raise exception 'FORBIDDEN'; end if;
  f := active_fee(p_fee_code);
  if f.id is null then raise exception 'FEE_NOT_FOUND'; end if;
  if f.classification <> 'BROKER_FEE' then raise exception 'ONLY_BROKER_FEES_CAN_BE_WAIVED'; end if;
  insert into waiver_grants(account_id,fee_code,waiver_type,value,max_total,valid_to,reason,requested_by) values (p_account,p_fee_code,p_type,coalesce(p_value,0),p_max_total,p_valid_to,p_reason,auth.uid()) returning id into v_id;
  insert into approval_requests(entity_type,entity_id,action,payload,requested_by) values ('waiver_grant', v_id::text, 'approve', jsonb_build_object('fee_code',p_fee_code,'type',p_type,'value',p_value,'max_total',p_max_total), auth.uid());
  perform audit('revenueos.waiver.requested','waiver_grant',v_id::text,null,jsonb_build_object('account',p_account,'fee_code',p_fee_code,'reason',p_reason));
  return v_id;
end $$;

create or replace function create_offer(p jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare v_id int; f fee_definitions;
begin
  if current_app_role() not in ('finance','admin','super_admin','sales') then raise exception 'FORBIDDEN'; end if;
  f := active_fee(p->>'fee_code');
  if f.id is null or f.classification <> 'BROKER_FEE' then raise exception 'OFFER_MUST_TARGET_BROKER_FEE'; end if;
  insert into offer_campaigns(code,name,description,fee_code,discount_type,value,starts_at,ends_at,redemption_limit,per_customer_cap,budget,disclosures,created_by)
  values (upper(p->>'code'), p->>'name', p->>'description', p->>'fee_code', (p->>'discount_type')::discount_type, (p->>'value')::numeric,
          coalesce((p->>'starts_at')::timestamptz, now()), (p->>'ends_at')::timestamptz, (p->>'redemption_limit')::int, coalesce((p->>'per_customer_cap')::int, 100), (p->>'budget')::numeric, p->>'disclosures', auth.uid())
  returning id into v_id;
  insert into approval_requests(entity_type,entity_id,action,payload,requested_by) values ('offer_campaign', v_id::text, 'approve', p, auth.uid());
  perform audit('revenueos.offer.created','offer_campaign',v_id::text,null,p);
  return v_id;
end $$;

create or replace function apply_promo_code(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a trading_accounts; o offer_campaigns;
begin
  select * into a from trading_accounts where user_id = auth.uid() and environment='sandbox';
  if a.id is null then raise exception 'NO_TRADING_ACCOUNT'; end if;
  select * into o from offer_campaigns where code = upper(trim(p_code)) and status='approved' and starts_at <= now() and (ends_at is null or ends_at >= now());
  if o.id is null then raise exception 'OFFER_NOT_AVAILABLE'; end if;
  insert into offer_enrollments(account_id, offer_id) values (a.id, o.id) on conflict do nothing;
  perform audit('revenueos.offer.enrolled','offer_campaign',o.id::text,null,jsonb_build_object('account',a.id));
  return jsonb_build_object('offer', o.name, 'fee_code', o.fee_code, 'discount_type', o.discount_type, 'value', o.value, 'disclosures', o.disclosures);
end $$;

create or replace function assign_plan(p_account uuid, p_plan_code text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare p pricing_plans; cur pricing_plans;
begin
  if current_app_role() not in ('finance','admin','super_admin','sales','ops') then raise exception 'FORBIDDEN'; end if;
  select * into p from pricing_plans where code = p_plan_code and status='approved';
  if p.id is null then raise exception 'PLAN_NOT_APPROVED'; end if;
  cur := account_plan(p_account);
  update plan_assignments set effective_to = current_date - 1 where account_id = p_account and effective_to is null;
  insert into plan_assignments(account_id, plan_id, assigned_by, note) values (p_account, p.id, auth.uid(), p_note);
  insert into notifications(user_id,kind,title,body) select user_id,'account','Pricing plan changed','Your plan is now '||p.name||'. Review the tariff in Pricing.' from trading_accounts where id = p_account;
  perform audit('revenueos.plan.assigned','trading_account',p_account::text,jsonb_build_object('plan',cur.code),jsonb_build_object('plan',p.code,'note',p_note));
end $$;

create or replace function request_charge_adjustment(p_trade uuid, p_fee_code text, p_amount numeric, p_reason text) returns bigint
language plpgsql security definer set search_path = public as $$
declare t trades; v_id bigint; v_max numeric;
begin
  if current_app_role() not in ('ops','finance','admin','super_admin') then raise exception 'FORBIDDEN'; end if;
  select * into t from trades where id = p_trade;
  if t.id is null then raise exception 'TRADE_NOT_FOUND'; end if;
  v_max := case p_fee_code when 'BRK_CNC' then t.brokerage when 'BRK_MIS' then t.brokerage else 0 end;
  if p_fee_code not in ('BRK_CNC','BRK_MIS') then raise exception 'ONLY_BROKER_FEES_ADJUSTABLE: statutory levies require a separate legal process'; end if;
  if p_amount <= 0 or p_amount > v_max - coalesce((select sum(amount) from charge_adjustments where trade_id = p_trade and status='approved'),0) then raise exception 'AMOUNT_EXCEEDS_CHARGED_FEE'; end if;
  insert into charge_adjustments(trade_id, account_id, fee_code, amount, reason, requested_by) values (p_trade, t.account_id, p_fee_code, round(p_amount,2), p_reason, auth.uid()) returning id into v_id;
  insert into approval_requests(entity_type,entity_id,action,payload,requested_by) values ('charge_adjustment', v_id::text, 'approve', jsonb_build_object('trade',p_trade,'fee_code',p_fee_code,'amount',p_amount,'reason',p_reason), auth.uid());
  perform audit('revenueos.adjustment.requested','charge_adjustment',v_id::text,null,jsonb_build_object('trade',p_trade,'amount',p_amount,'reason',p_reason));
  return v_id;
end $$;

create or replace function subscribe_plan(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a trading_accounts; p subscription_plans; v_entry bigint; v_id bigint; funds jsonb;
begin
  select * into a from trading_accounts where user_id = auth.uid() and environment='sandbox' and status='active';
  if a.id is null then raise exception 'ACCOUNT_NOT_ACTIVE'; end if;
  select * into p from subscription_plans where code = p_code and status='approved';
  if p.id is null then raise exception 'PLAN_NOT_AVAILABLE'; end if;
  if exists (select 1 from subscriptions where account_id=a.id and plan_id=p.id and status='active') then raise exception 'ALREADY_SUBSCRIBED'; end if;
  funds := account_funds(a.id);
  if (funds->>'available')::numeric < p.price_month then raise exception 'INSUFFICIENT_FUNDS'; end if;
  v_entry := post_journal('subscription', p.code, 'Simulated subscription invoice '||p.name||' (1 month)',
    jsonb_build_array(jsonb_build_object('code','C-'||a.client_code,'debit',p.price_month), jsonb_build_object('code','4200','credit',p.price_month)));
  insert into subscriptions(account_id,plan_id,status,renews_at,invoice_entry_id) values (a.id,p.id,'active',now()+interval '30 days',v_entry) returning id into v_id;
  perform audit('revenueos.subscription.started','subscription',v_id::text,null,jsonb_build_object('plan',p.code,'amount',p.price_month));
  return jsonb_build_object('subscription_id', v_id, 'plan', p.name, 'charged', p.price_month, 'renews_at', now()+interval '30 days');
end $$;

create or replace function cancel_subscription(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  update subscriptions s set status='cancelled', cancelled_at=now() from trading_accounts a where s.id=p_id and s.account_id=a.id and (a.user_id=auth.uid() or is_staff()) and s.status='active';
  if not found then raise exception 'SUBSCRIPTION_NOT_FOUND'; end if;
  perform audit('revenueos.subscription.cancelled','subscription',p_id::text,null,null);
end $$;

create or replace function revenue_summary(p_from date default current_date - 30, p_to date default current_date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb; v_cost numeric; v_sub numeric; v_partner numeric;
begin
  if not is_staff() then raise exception 'FORBIDDEN'; end if;
  select jsonb_build_object(
    'turnover', coalesce(sum(value),0), 'trades', count(*),
    'brokerage_net', coalesce(sum(brokerage),0),
    'levies_collected', coalesce(sum(stt+sebi_fee+stamp_duty+gst),0), 'exchange_charges', coalesce(sum(exchange_txn),0),
    'by_product', (select coalesce(jsonb_object_agg(product, b),'{}'::jsonb) from (select product, sum(brokerage) b from trades where traded_at::date between p_from and p_to group by product) x),
    'by_day', (select coalesce(jsonb_agg(jsonb_build_object('day',d,'brokerage',b,'turnover',t) order by d),'[]'::jsonb) from (select traded_at::date d, sum(brokerage) b, sum(value) t from trades where traded_at::date between p_from and p_to group by 1) y))
  into v from trades where traded_at::date between p_from and p_to;
  select coalesce(sum(l.debit),0) into v_cost from journal_lines l join ledger_accounts a on a.id=l.ledger_account_id join journal_entries e on e.id=l.entry_id where a.code='4100' and e.posted_at::date between p_from and p_to;
  select coalesce(sum(l.credit),0) into v_sub from journal_lines l join ledger_accounts a on a.id=l.ledger_account_id join journal_entries e on e.id=l.entry_id where a.code='4200' and e.posted_at::date between p_from and p_to;
  select coalesce(sum(l.debit),0) into v_partner from journal_lines l join ledger_accounts a on a.id=l.ledger_account_id join journal_entries e on e.id=l.entry_id where a.code='5100' and e.posted_at::date between p_from and p_to;
  return v || jsonb_build_object('waivers_and_discounts', v_cost, 'subscription_revenue', v_sub, 'partner_remuneration', v_partner,
    'vendor_costs', (select coalesce(sum(amount),0) from vendor_costs where period_month between date_trunc('month',p_from)::date and p_to),
    'from', p_from, 'to', p_to, 'note', 'Management view from the sandbox ledger; not statutory financial statements.');
end $$;

-- RLS
alter table approval_requests enable row level security;
alter table fee_categories enable row level security;
alter table fee_definitions enable row level security;
alter table pricing_plans enable row level security;
alter table plan_assignments enable row level security;
alter table waiver_grants enable row level security;
alter table offer_campaigns enable row level security;
alter table offer_enrollments enable row level security;
alter table offer_redemptions enable row level security;
alter table charge_adjustments enable row level security;
alter table subscription_plans enable row level security;
alter table subscriptions enable row level security;
alter table vendor_costs enable row level security;

create policy "public read fee categories" on fee_categories for select using (true);
create policy "public read approved fees" on fee_definitions for select using (status='approved' or is_staff());
create policy "public read approved plans" on pricing_plans for select using (status='approved' or is_staff());
create policy "public read approved sub plans" on subscription_plans for select using (status='approved' or is_staff());
create policy "approved offers visible" on offer_campaigns for select using (status='approved' or is_staff());
create policy "approvals staff" on approval_requests for select using (is_staff());
create policy "plan assignments own" on plan_assignments for select using (is_staff() or account_id in (select id from trading_accounts where user_id=auth.uid()));
create policy "waivers own" on waiver_grants for select using (is_staff() or account_id in (select id from trading_accounts where user_id=auth.uid()));
create policy "enrollments own" on offer_enrollments for select using (is_staff() or account_id in (select id from trading_accounts where user_id=auth.uid()));
create policy "redemptions own" on offer_redemptions for select using (is_staff() or account_id in (select id from trading_accounts where user_id=auth.uid()));
create policy "adjustments own" on charge_adjustments for select using (is_staff() or account_id in (select id from trading_accounts where user_id=auth.uid()));
create policy "subscriptions own" on subscriptions for select using (is_staff() or account_id in (select id from trading_accounts where user_id=auth.uid()));
create policy "vendor costs staff" on vendor_costs for select using (is_staff());
create policy "vendor costs finance write" on vendor_costs for insert with check (current_app_role() in ('finance','admin','super_admin') and recorded_by = auth.uid());

revoke insert, update, delete on approval_requests, fee_categories, fee_definitions, pricing_plans, plan_assignments, waiver_grants, offer_campaigns, offer_enrollments, offer_redemptions, charge_adjustments, subscription_plans, subscriptions from anon, authenticated;
revoke execute on function compute_charges_v2(uuid, product_type, order_side, numeric, date) from public, anon;
revoke execute on function active_fee(text, date) from public, anon;
revoke execute on function account_plan(uuid, date) from public, anon;
revoke execute on function fee_amount(fee_definitions, numeric) from public, anon;
revoke execute on function submit_fee_version(jsonb) from public, anon;
revoke execute on function decide_approval(bigint, text, text) from public, anon;
revoke execute on function request_waiver(uuid, text, waiver_type, numeric, numeric, date, text) from public, anon;
revoke execute on function create_offer(jsonb) from public, anon;
revoke execute on function apply_promo_code(text) from public, anon;
revoke execute on function assign_plan(uuid, text, text) from public, anon;
revoke execute on function request_charge_adjustment(uuid, text, numeric, text) from public, anon;
revoke execute on function subscribe_plan(text) from public, anon;
revoke execute on function cancel_subscription(bigint) from public, anon;
revoke execute on function revenue_summary(date, date) from public, anon;
