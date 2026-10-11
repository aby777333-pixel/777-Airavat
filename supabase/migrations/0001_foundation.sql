-- AIRAVAT | Migration 0001: Foundation schema (sandbox brokerage core)
-- Environment: SANDBOX ONLY. No live exchange, bank, depository or clearing connectivity exists.
-- Money is stored as numeric(18,2) (paise precision). Prices as numeric(18,4). Never float.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------
create type app_role as enum ('client','dealer','ops','risk','compliance','admin','super_admin');
create type account_env as enum ('sandbox','live');
create type account_status as enum ('pending','active','frozen','closed');
create type kyc_status as enum ('draft','submitted','under_review','approved','rejected');
create type order_side as enum ('BUY','SELL');
create type order_type as enum ('MARKET','LIMIT','SL','SL-M');
create type product_type as enum ('CNC','MIS');
create type order_status as enum (
  'RECEIVED','RMS_CHECK','RMS_REJECTED','ROUTED','ACKNOWLEDGED',
  'PARTIALLY_FILLED','FILLED','CANCELLED','REJECTED','EXPIRED'
);
create type fund_txn_type as enum ('DEPOSIT','WITHDRAWAL');
create type fund_txn_status as enum ('PENDING','APPROVED','REJECTED','COMPLETED');
create type ledger_account_type as enum ('ASSET','LIABILITY','EQUITY','INCOME','EXPENSE');
create type requirement_status as enum (
  'Not started','Researching','Designed','In development','Implemented','Tested',
  'Blocked','Externally dependent','Certified','Production ready'
);

-- ---------------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------------
create table app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into app_settings(key,value) values
  ('bootstrap_admin_emails', '["aby777333@gmail.com"]'),
  ('sandbox_auto_approve_kyc', 'true'),
  ('sandbox_extended_hours', 'true'),
  ('sandbox_max_deposit', '10000000'),
  ('sim_tick_interval_seconds', '60'),
  ('live_trading_enabled', 'false');

-- ---------------------------------------------------------------------------
-- Profiles & roles
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  role app_role not null default 'client',
  language text not null default 'en',
  theme text not null default 'midnight-sovereign',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_role app_role := 'client';
begin
  if exists (select 1 from app_settings s where s.key='bootstrap_admin_emails'
             and s.value ? lower(new.email)) then
    v_role := 'super_admin';
  end if;
  insert into profiles(id,email,full_name,role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''), v_role)
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

create or replace function current_app_role() returns app_role
language sql stable security definer set search_path = public as $$
  select coalesce((select role from profiles where id = auth.uid()), 'client'::app_role)
$$;

create or replace function is_staff() returns boolean
language sql stable as $$
  select current_app_role() in ('dealer','ops','risk','compliance','admin','super_admin')
$$;

-- ---------------------------------------------------------------------------
-- Audit (append-only)
-- ---------------------------------------------------------------------------
create table audit_events (
  id bigserial primary key,
  actor_id uuid,
  actor_role text,
  action text not null,
  entity_type text,
  entity_id text,
  before_state jsonb,
  after_state jsonb,
  correlation_id uuid default gen_random_uuid(),
  outcome text not null default 'success',
  source text not null default 'app',
  created_at timestamptz not null default now()
);
create index on audit_events(created_at desc);
create index on audit_events(entity_type, entity_id);

create or replace function audit(p_action text, p_entity_type text, p_entity_id text,
  p_before jsonb, p_after jsonb, p_outcome text default 'success') returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_events(actor_id, actor_role, action, entity_type, entity_id, before_state, after_state, outcome)
  values (auth.uid(), current_app_role()::text, p_action, p_entity_type, p_entity_id, p_before, p_after, p_outcome);
end $$;

-- ---------------------------------------------------------------------------
-- Instruments, quotes, candles (SIMULATED market data)
-- ---------------------------------------------------------------------------
create table instruments (
  id serial primary key,
  symbol text not null,
  exchange text not null default 'NSE',
  segment text not null default 'EQ',           -- EQ | INDEX
  name text not null,
  isin text,
  sector text,
  lot_size int not null default 1,
  tick_size numeric(10,4) not null default 0.05,
  price_band_pct numeric(6,2) not null default 10,
  tradable boolean not null default true,
  is_simulated boolean not null default true,
  unique (exchange, symbol)
);

create table quotes (
  instrument_id int primary key references instruments(id) on delete cascade,
  ltp numeric(18,4) not null,
  open numeric(18,4) not null,
  high numeric(18,4) not null,
  low numeric(18,4) not null,
  prev_close numeric(18,4) not null,
  volume bigint not null default 0,
  bid numeric(18,4),
  ask numeric(18,4),
  source text not null default 'SIMULATED',
  updated_at timestamptz not null default now()
);

create table candles (
  instrument_id int references instruments(id) on delete cascade,
  ts timestamptz not null,
  timeframe text not null default '1d',
  o numeric(18,4) not null, h numeric(18,4) not null, l numeric(18,4) not null, c numeric(18,4) not null,
  v bigint not null default 0,
  primary key (instrument_id, timeframe, ts)
);

create table market_holidays (
  day date primary key,
  description text not null
);

-- ---------------------------------------------------------------------------
-- Onboarding / KYC
-- ---------------------------------------------------------------------------
create table kyc_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  status kyc_status not null default 'draft',
  account_type text not null default 'individual',
  pan text,
  date_of_birth date,
  address jsonb,
  occupation text,
  income_range text,
  trading_experience text,
  segments text[] not null default '{EQ}',
  nominee jsonb,
  declarations jsonb,
  risk_profile text,
  submitted_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on kyc_applications(user_id);
create index on kyc_applications(status);

-- ---------------------------------------------------------------------------
-- Trading accounts
-- ---------------------------------------------------------------------------
create sequence client_code_seq start 100001;
create table trading_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  client_code text not null unique default ('AV' || nextval('client_code_seq')::text),
  environment account_env not null default 'sandbox',
  status account_status not null default 'pending',
  segments text[] not null default '{EQ}',
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  unique (user_id, environment)
);

-- ---------------------------------------------------------------------------
-- Double-entry ledger
-- ---------------------------------------------------------------------------
create table ledger_accounts (
  id serial primary key,
  code text not null unique,
  name text not null,
  type ledger_account_type not null,
  trading_account_id uuid references trading_accounts(id),
  created_at timestamptz not null default now()
);
insert into ledger_accounts(code,name,type) values
  ('1000','Client Bank Account (Sandbox, simulated)','ASSET'),
  ('1100','Settlement Receivable from Clearing (simulated)','ASSET'),
  ('2100','Payable to Clearing (simulated)','LIABILITY'),
  ('2200','Statutory Levies Payable','LIABILITY'),
  ('2300','Exchange Charges Payable','LIABILITY'),
  ('4000','Brokerage Revenue','INCOME'),
  ('3000','Opening Equity','EQUITY');

create table journal_entries (
  id bigserial primary key,
  ref_type text not null,
  ref_id text,
  narration text not null,
  posted_by uuid,
  posted_at timestamptz not null default now(),
  reversal_of bigint references journal_entries(id)
);
create table journal_lines (
  id bigserial primary key,
  entry_id bigint not null references journal_entries(id) on delete cascade,
  ledger_account_id int not null references ledger_accounts(id),
  debit numeric(18,2) not null default 0 check (debit >= 0),
  credit numeric(18,2) not null default 0 check (credit >= 0),
  check (not (debit > 0 and credit > 0))
);
create index on journal_lines(ledger_account_id);
create index on journal_lines(entry_id);

-- Post a balanced journal entry. lines: [{code|ledger_account_id, debit, credit}]
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
    if v_line ? 'ledger_account_id' then v_acct := (v_line->>'ledger_account_id')::int;
    else select id into v_acct from ledger_accounts where code = v_line->>'code'; end if;
    if v_acct is null then raise exception 'LEDGER_ACCOUNT_NOT_FOUND %', v_line; end if;
    insert into journal_lines(entry_id, ledger_account_id, debit, credit)
    values (v_entry, v_acct, coalesce((v_line->>'debit')::numeric,0), coalesce((v_line->>'credit')::numeric,0));
  end loop;
  return v_entry;
end $$;

-- ---------------------------------------------------------------------------
-- Funds
-- ---------------------------------------------------------------------------
create table fund_transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references trading_accounts(id),
  type fund_txn_type not null,
  amount numeric(18,2) not null check (amount > 0),
  status fund_txn_status not null default 'PENDING',
  bank_reference text,
  requested_by uuid,
  approved_by uuid,
  journal_entry_id bigint references journal_entries(id),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on fund_transactions(account_id);

-- Fund holds (margin blocked for open orders)
create table fund_holds (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references trading_accounts(id),
  order_id uuid,
  amount numeric(18,2) not null check (amount >= 0),
  released boolean not null default false,
  created_at timestamptz not null default now()
);
create index on fund_holds(account_id) where not released;

-- ---------------------------------------------------------------------------
-- Risk limits
-- ---------------------------------------------------------------------------
create table risk_limits (
  id serial primary key,
  scope text not null default 'global',   -- global | account
  account_id uuid references trading_accounts(id),
  max_order_value numeric(18,2) not null default 2500000,
  max_order_qty int not null default 10000,
  max_position_value numeric(18,2) not null default 10000000,
  max_daily_loss numeric(18,2) not null default 500000,
  mis_margin_pct numeric(6,2) not null default 20,
  allow_mis boolean not null default true,
  kill_switch boolean not null default false,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  unique (scope, account_id)
);
insert into risk_limits(scope) values ('global');

-- Brokerage & charges schedule (versioned, sandbox illustrative values; verify statutory rates before production)
create table charge_schedules (
  id serial primary key,
  effective_from date not null,
  product product_type not null,
  brokerage_pct numeric(8,4) not null,      -- % of trade value
  brokerage_cap numeric(10,2) not null,     -- max per order
  stt_buy_pct numeric(8,4) not null,
  stt_sell_pct numeric(8,4) not null,
  exchange_txn_pct numeric(8,5) not null,
  sebi_fee_pct numeric(8,6) not null,
  stamp_buy_pct numeric(8,5) not null,
  gst_pct numeric(6,2) not null default 18,
  note text
);
insert into charge_schedules(effective_from,product,brokerage_pct,brokerage_cap,stt_buy_pct,stt_sell_pct,exchange_txn_pct,sebi_fee_pct,stamp_buy_pct,note) values
  ('2026-01-01','CNC',0,0,0.1,0.1,0.00297,0.0001,0.015,'Sandbox illustrative schedule. Statutory rates must be verified against current notifications before any live use.'),
  ('2026-01-01','MIS',0.03,20,0,0.025,0.00297,0.0001,0.003,'Sandbox illustrative schedule. Statutory rates must be verified against current notifications before any live use.');

-- ---------------------------------------------------------------------------
-- Orders, events, trades, positions, holdings
-- ---------------------------------------------------------------------------
create table orders (
  id uuid primary key default gen_random_uuid(),
  client_order_id text not null unique,
  account_id uuid not null references trading_accounts(id),
  user_id uuid not null references profiles(id),
  instrument_id int not null references instruments(id),
  side order_side not null,
  order_type order_type not null,
  product product_type not null,
  qty int not null check (qty > 0),
  price numeric(18,4),
  trigger_price numeric(18,4),
  filled_qty int not null default 0,
  avg_fill_price numeric(18,4),
  status order_status not null default 'RECEIVED',
  rejection_reason text,
  rms_result jsonb,
  exchange_order_id text,
  environment account_env not null default 'sandbox',
  placed_via text not null default 'web',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on orders(account_id, created_at desc);
create index on orders(status) where status in ('ACKNOWLEDGED','PARTIALLY_FILLED');

create table order_events (
  id bigserial primary key,
  order_id uuid not null references orders(id) on delete cascade,
  from_status order_status,
  to_status order_status not null,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index on order_events(order_id);

create table trades (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  account_id uuid not null references trading_accounts(id),
  instrument_id int not null references instruments(id),
  side order_side not null,
  product product_type not null,
  qty int not null,
  price numeric(18,4) not null,
  value numeric(18,2) not null,
  brokerage numeric(18,2) not null default 0,
  stt numeric(18,2) not null default 0,
  exchange_txn numeric(18,2) not null default 0,
  sebi_fee numeric(18,2) not null default 0,
  stamp_duty numeric(18,2) not null default 0,
  gst numeric(18,2) not null default 0,
  total_charges numeric(18,2) not null default 0,
  exchange_trade_id text,
  journal_entry_id bigint references journal_entries(id),
  traded_at timestamptz not null default now()
);
create index on trades(account_id, traded_at desc);

create table positions (
  account_id uuid not null references trading_accounts(id),
  instrument_id int not null references instruments(id),
  product product_type not null,
  net_qty int not null default 0,
  buy_qty int not null default 0,
  buy_value numeric(18,2) not null default 0,
  sell_qty int not null default 0,
  sell_value numeric(18,2) not null default 0,
  avg_price numeric(18,4) not null default 0,
  realized_pnl numeric(18,2) not null default 0,
  trading_day date not null default (now() at time zone 'Asia/Kolkata')::date,
  updated_at timestamptz not null default now(),
  primary key (account_id, instrument_id, product, trading_day)
);

create table holdings (
  account_id uuid not null references trading_accounts(id),
  instrument_id int not null references instruments(id),
  qty int not null default 0,
  avg_price numeric(18,4) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (account_id, instrument_id)
);

create table settlement_runs (
  id bigserial primary key,
  trading_day date not null,
  run_by uuid,
  summary jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Watchlists, notifications, support, consents, registers, AI audit
-- ---------------------------------------------------------------------------
create table watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create table watchlist_items (
  watchlist_id uuid references watchlists(id) on delete cascade,
  instrument_id int references instruments(id) on delete cascade,
  position int not null default 0,
  primary key (watchlist_id, instrument_id)
);

create table notifications (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null default 'info',
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on notifications(user_id, created_at desc);

create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  subject text not null,
  category text not null default 'general',
  priority text not null default 'normal',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table ticket_messages (
  id bigserial primary key,
  ticket_id uuid not null references support_tickets(id) on delete cascade,
  author_id uuid,
  is_staff boolean not null default false,
  body text not null,
  created_at timestamptz not null default now()
);

create table legal_documents (
  id serial primary key,
  slug text not null,
  title text not null,
  version int not null default 1,
  body_md text not null,
  content_hash text not null,
  mandatory boolean not null default true,
  effective_from date not null default current_date,
  unique (slug, version)
);
create table consents (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  document_id int not null references legal_documents(id),
  document_version int not null,
  content_hash text not null,
  accepted_at timestamptz not null default now(),
  unique (user_id, document_id)
);

create table regulatory_obligations (
  regulation_id text primary key,
  authority text not null,
  circular_reference text,
  effective_date date,
  applicability text,
  requirement text not null,
  owner text,
  evidence text,
  due_date date,
  status text not null default 'Not started',
  review_date date,
  source_url text,
  verified boolean not null default false,
  updated_at timestamptz not null default now()
);

create table requirements (
  req_id text primary key,
  title text not null,
  module text not null,
  source text,
  priority text not null default 'P2',
  status requirement_status not null default 'Not started',
  regulatory_dependency text,
  notes text,
  updated_at timestamptz not null default now()
);

create table ai_interactions (
  id bigserial primary key,
  user_id uuid,
  provider text not null,
  model text not null,
  prompt_version text not null,
  classification text not null default 'general_assistance',
  input_chars int,
  output_chars int,
  tokens_in int,
  tokens_out int,
  tools_used text[],
  outcome text not null default 'success',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Market session (IST)
-- ---------------------------------------------------------------------------
create or replace function market_status() returns jsonb
language plpgsql stable as $$
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

-- ---------------------------------------------------------------------------
-- Funds helpers
-- ---------------------------------------------------------------------------
create or replace function account_ledger_balance(p_account uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum(l.credit - l.debit),0)
  from journal_lines l join ledger_accounts a on a.id = l.ledger_account_id
  where a.trading_account_id = p_account and a.type = 'LIABILITY'
$$;

create or replace function account_funds(p_account uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_bal numeric := account_ledger_balance(p_account);
        v_hold numeric := (select coalesce(sum(amount),0) from fund_holds where account_id=p_account and not released);
        v_pending_wd numeric := (select coalesce(sum(amount),0) from fund_transactions where account_id=p_account and type='WITHDRAWAL' and status='PENDING');
        v_mtm numeric := 0; v_used numeric := 0; v_pct numeric;
begin
  select mis_margin_pct/100 into v_pct from risk_limits where scope='global';
  select coalesce(sum(case when p.net_qty <> 0 then (q.ltp - p.avg_price) * p.net_qty else 0 end),0),
         coalesce(sum(case when p.net_qty <> 0 and p.product='MIS' then abs(p.net_qty) * p.avg_price * v_pct else 0 end),0)
    into v_mtm, v_used
  from positions p join quotes q on q.instrument_id = p.instrument_id
  where p.account_id = p_account and p.trading_day = (now() at time zone 'Asia/Kolkata')::date;
  return jsonb_build_object(
    'ledger_balance', round(v_bal,2),
    'blocked_for_orders', round(v_hold,2),
    'pending_withdrawals', round(v_pending_wd,2),
    'margin_used', round(v_used,2),
    'unrealized_mtm', round(v_mtm,2),
    'available', round(v_bal - v_hold - v_pending_wd - v_used + least(v_mtm,0),2),
    'withdrawable', greatest(round(v_bal - v_hold - v_pending_wd - v_used + least(v_mtm,0),2),0),
    'environment','sandbox','currency','INR');
end $$;

-- ---------------------------------------------------------------------------
-- Onboarding functions
-- ---------------------------------------------------------------------------
create or replace function approve_kyc_internal(p_app uuid, p_reviewer uuid, p_note text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_app kyc_applications; v_acct trading_accounts; v_existing uuid;
begin
  select * into v_app from kyc_applications where id = p_app for update;
  if v_app.status = 'approved' then
    select id into v_existing from trading_accounts where user_id = v_app.user_id and environment='sandbox';
    return v_existing;
  end if;
  update kyc_applications set status='approved', reviewed_by=p_reviewer, reviewed_at=now(), rejection_reason=p_note, updated_at=now() where id=p_app;
  insert into trading_accounts(user_id, environment, status, segments, activated_at)
  values (v_app.user_id,'sandbox','active',v_app.segments,now())
  on conflict (user_id, environment) do update set status='active', activated_at=coalesce(trading_accounts.activated_at, now())
  returning * into v_acct;
  insert into ledger_accounts(code,name,type,trading_account_id)
  values ('C-'||v_acct.client_code, 'Client Funds Payable - '||v_acct.client_code, 'LIABILITY', v_acct.id)
  on conflict (code) do nothing;
  insert into watchlists(user_id,name) select v_app.user_id,'My Watchlist' where not exists (select 1 from watchlists where user_id=v_app.user_id);
  insert into watchlist_items(watchlist_id,instrument_id,position)
    select w.id, i.id, row_number() over () from watchlists w, instruments i
    where w.user_id=v_app.user_id and i.symbol in ('RELIANCE','TCS','HDFCBANK','INFY','NIFTY 50') on conflict do nothing;
  insert into notifications(user_id,kind,title,body) values (v_app.user_id,'account','Sandbox trading account activated',
    'Client code '||v_acct.client_code||'. This is a SIMULATED environment: no real exchange, bank or depository connectivity.');
  perform audit('kyc.approved','kyc_application',p_app::text,jsonb_build_object('status',v_app.status),jsonb_build_object('status','approved','note',p_note,'account_id',v_acct.id));
  return v_acct.id;
end $$;

create or replace function submit_kyc(p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_app kyc_applications; v_auto boolean; v_acct uuid; v_pan text := upper(trim(p_payload->>'pan'));
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_pan !~ '^[A-Z]{5}[0-9]{4}[A-Z]$' then raise exception 'INVALID_PAN_FORMAT'; end if;
  if (p_payload->>'date_of_birth')::date > current_date - interval '18 years' then raise exception 'MUST_BE_ADULT'; end if;
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

create or replace function review_kyc(p_app uuid, p_decision text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if current_app_role() not in ('compliance','ops','admin','super_admin') then raise exception 'FORBIDDEN'; end if;
  if p_decision = 'approve' then perform approve_kyc_internal(p_app, auth.uid(), p_note);
  elsif p_decision = 'reject' then
    update kyc_applications set status='rejected', reviewed_by=auth.uid(), reviewed_at=now(), rejection_reason=p_note, updated_at=now() where id=p_app;
    perform audit('kyc.rejected','kyc_application',p_app::text,null,jsonb_build_object('note',p_note));
  else raise exception 'INVALID_DECISION'; end if;
end $$;

-- ---------------------------------------------------------------------------
-- Funds functions
-- ---------------------------------------------------------------------------
create or replace function sandbox_deposit(p_amount numeric, p_reference text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_acct trading_accounts; v_max numeric; v_txn fund_transactions; v_entry bigint;
begin
  select * into v_acct from trading_accounts where user_id = auth.uid() and environment='sandbox';
  if v_acct.id is null or v_acct.status <> 'active' then raise exception 'ACCOUNT_NOT_ACTIVE'; end if;
  select (value)::numeric into v_max from app_settings where key='sandbox_max_deposit';
  if p_amount <= 0 or p_amount > coalesce(v_max, 10000000) then raise exception 'AMOUNT_OUT_OF_RANGE'; end if;
  if account_ledger_balance(v_acct.id) + p_amount > coalesce(v_max,10000000) then raise exception 'SANDBOX_BALANCE_CAP_EXCEEDED'; end if;
  insert into fund_transactions(account_id,type,amount,status,bank_reference,requested_by,approved_by,note)
  values (v_acct.id,'DEPOSIT',round(p_amount,2),'COMPLETED',coalesce(p_reference,'SIMULATED-UPI-'||substr(gen_random_uuid()::text,1,8)),auth.uid(),null,'Simulated deposit (sandbox). No real money moved.')
  returning * into v_txn;
  v_entry := post_journal('fund_transaction', v_txn.id::text, 'Simulated client deposit '||v_acct.client_code,
    jsonb_build_array(jsonb_build_object('code','1000','debit',round(p_amount,2)),
                      jsonb_build_object('code','C-'||v_acct.client_code,'credit',round(p_amount,2))));
  update fund_transactions set journal_entry_id = v_entry where id = v_txn.id;
  perform audit('funds.deposit.simulated','fund_transaction',v_txn.id::text,null,to_jsonb(v_txn));
  return jsonb_build_object('transaction_id', v_txn.id, 'funds', account_funds(v_acct.id));
end $$;

create or replace function request_withdrawal(p_amount numeric) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_acct trading_accounts; v_funds jsonb; v_txn fund_transactions;
begin
  select * into v_acct from trading_accounts where user_id = auth.uid() and environment='sandbox';
  if v_acct.id is null or v_acct.status <> 'active' then raise exception 'ACCOUNT_NOT_ACTIVE'; end if;
  v_funds := account_funds(v_acct.id);
  if p_amount <= 0 or p_amount > (v_funds->>'withdrawable')::numeric then raise exception 'INSUFFICIENT_WITHDRAWABLE_BALANCE'; end if;
  insert into fund_transactions(account_id,type,amount,status,requested_by,note)
  values (v_acct.id,'WITHDRAWAL',round(p_amount,2),'PENDING',auth.uid(),'Awaiting operations approval (maker-checker).') returning * into v_txn;
  perform audit('funds.withdrawal.requested','fund_transaction',v_txn.id::text,null,to_jsonb(v_txn));
  return jsonb_build_object('transaction_id', v_txn.id, 'status','PENDING');
end $$;

create or replace function review_withdrawal(p_txn uuid, p_decision text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare v_txn fund_transactions; v_acct trading_accounts; v_entry bigint;
begin
  if current_app_role() not in ('ops','admin','super_admin') then raise exception 'FORBIDDEN'; end if;
  select * into v_txn from fund_transactions where id=p_txn for update;
  if v_txn.status <> 'PENDING' then raise exception 'NOT_PENDING'; end if;
  if v_txn.requested_by = auth.uid() then raise exception 'MAKER_CHECKER_VIOLATION: requester cannot approve own withdrawal'; end if;
  select * into v_acct from trading_accounts where id = v_txn.account_id;
  if p_decision = 'approve' then
    v_entry := post_journal('fund_transaction', v_txn.id::text, 'Simulated client payout '||v_acct.client_code,
      jsonb_build_array(jsonb_build_object('code','C-'||v_acct.client_code,'debit',v_txn.amount),
                        jsonb_build_object('code','1000','credit',v_txn.amount)));
    update fund_transactions set status='COMPLETED', approved_by=auth.uid(), journal_entry_id=v_entry, note=coalesce(p_note,note), updated_at=now() where id=p_txn;
    insert into notifications(user_id,kind,title,body) values (v_acct.user_id,'funds','Withdrawal approved (simulated)','Rs '||v_txn.amount||' released from your sandbox ledger.');
  elsif p_decision='reject' then
    update fund_transactions set status='REJECTED', approved_by=auth.uid(), note=coalesce(p_note,note), updated_at=now() where id=p_txn;
    insert into notifications(user_id,kind,title,body) values (v_acct.user_id,'funds','Withdrawal rejected',coalesce(p_note,'Rejected by operations.'));
  else raise exception 'INVALID_DECISION'; end if;
  perform audit('funds.withdrawal.'||p_decision,'fund_transaction',p_txn::text,to_jsonb(v_txn),jsonb_build_object('note',p_note));
end $$;

-- ---------------------------------------------------------------------------
-- Charges
-- ---------------------------------------------------------------------------
create or replace function compute_charges(p_product product_type, p_side order_side, p_value numeric)
returns jsonb language plpgsql stable as $$
declare s charge_schedules; v_brok numeric; v_stt numeric; v_exch numeric; v_sebi numeric; v_stamp numeric; v_gst numeric;
begin
  select * into s from charge_schedules where product = p_product and effective_from <= current_date order by effective_from desc limit 1;
  v_brok := least(round(p_value * s.brokerage_pct/100, 2), s.brokerage_cap);
  v_stt := round(p_value * (case when p_side='BUY' then s.stt_buy_pct else s.stt_sell_pct end)/100, 2);
  v_exch := round(p_value * s.exchange_txn_pct/100, 2);
  v_sebi := round(p_value * s.sebi_fee_pct/100, 2);
  v_stamp := round(p_value * (case when p_side='BUY' then s.stamp_buy_pct else 0 end)/100, 2);
  v_gst := round((v_brok + v_exch + v_sebi) * s.gst_pct/100, 2);
  return jsonb_build_object('brokerage',v_brok,'stt',v_stt,'exchange_txn',v_exch,'sebi_fee',v_sebi,'stamp_duty',v_stamp,'gst',v_gst,
    'total', v_brok+v_stt+v_exch+v_sebi+v_stamp+v_gst, 'schedule_id', s.id, 'schedule_note', s.note);
end $$;

-- ---------------------------------------------------------------------------
-- Order lifecycle
-- ---------------------------------------------------------------------------
create or replace function order_transition(p_order uuid, p_to order_status, p_payload jsonb default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_from order_status;
begin
  select status into v_from from orders where id = p_order for update;
  if v_from in ('FILLED','CANCELLED','REJECTED','RMS_REJECTED','EXPIRED') then
    raise exception 'ORDER_TERMINAL_STATE %', v_from;
  end if;
  update orders set status = p_to, updated_at = now() where id = p_order;
  insert into order_events(order_id, from_status, to_status, payload) values (p_order, v_from, p_to, p_payload);
end $$;

-- Apply a fill: trade record, charges, position, holdings, ledger. Internal.
create or replace function apply_fill(p_order uuid, p_qty int, p_price numeric) returns uuid
language plpgsql security definer set search_path = public as $$
declare o orders; a trading_accounts; v_value numeric; ch jsonb; t trades; p positions; v_entry bigint;
        v_day date := (now() at time zone 'Asia/Kolkata')::date; v_new_filled int; v_new_avg numeric;
        v_pnl numeric := 0; v_lines jsonb; v_total numeric; v_sym text; v_avg_all numeric;
begin
  select * into o from orders where id = p_order for update;
  select * into a from trading_accounts where id = o.account_id;
  select symbol into v_sym from instruments where id = o.instrument_id;
  v_value := round(p_qty * p_price, 2);
  ch := compute_charges(o.product, o.side, v_value);
  v_total := (ch->>'total')::numeric;
  insert into trades(order_id,account_id,instrument_id,side,product,qty,price,value,brokerage,stt,exchange_txn,sebi_fee,stamp_duty,gst,total_charges,exchange_trade_id)
  values (o.id,o.account_id,o.instrument_id,o.side,o.product,p_qty,p_price,v_value,(ch->>'brokerage')::numeric,(ch->>'stt')::numeric,(ch->>'exchange_txn')::numeric,
          (ch->>'sebi_fee')::numeric,(ch->>'stamp_duty')::numeric,(ch->>'gst')::numeric,v_total,'SIMT-'||to_char(now(),'YYYYMMDD')||'-'||lpad(nextval('client_code_seq')::text,8,'0'))
  returning * into t;

  -- position update (weighted average, realized pnl on reducing)
  insert into positions(account_id,instrument_id,product,trading_day) values (o.account_id,o.instrument_id,o.product,v_day) on conflict do nothing;
  select * into p from positions where account_id=o.account_id and instrument_id=o.instrument_id and product=o.product and trading_day=v_day for update;
  if o.side = 'BUY' then
    if p.net_qty >= 0 then v_new_avg := case when p.net_qty + p_qty = 0 then 0 else (p.avg_price*p.net_qty + p_price*p_qty)/(p.net_qty+p_qty) end;
    else
      v_pnl := (p.avg_price - p_price) * least(p_qty, -p.net_qty);
      v_new_avg := case when p.net_qty + p_qty > 0 then p_price when p.net_qty + p_qty = 0 then 0 else p.avg_price end;
    end if;
    update positions set net_qty = net_qty + p_qty, buy_qty = buy_qty + p_qty, buy_value = buy_value + v_value, avg_price = v_new_avg, realized_pnl = realized_pnl + v_pnl, updated_at=now()
      where account_id=o.account_id and instrument_id=o.instrument_id and product=o.product and trading_day=v_day;
  else
    if p.net_qty <= 0 then v_new_avg := case when p.net_qty - p_qty = 0 then 0 else (p.avg_price*(-p.net_qty) + p_price*p_qty)/((-p.net_qty)+p_qty) end;
    else
      v_pnl := (p_price - p.avg_price) * least(p_qty, p.net_qty);
      v_new_avg := case when p.net_qty - p_qty < 0 then p_price when p.net_qty - p_qty = 0 then 0 else p.avg_price end;
    end if;
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

  -- ledger
  if o.side='BUY' then
    v_lines := jsonb_build_array(
      jsonb_build_object('code','C-'||a.client_code,'debit', v_value + v_total),
      jsonb_build_object('code','2100','credit', v_value),
      jsonb_build_object('code','4000','credit', (ch->>'brokerage')::numeric),
      jsonb_build_object('code','2200','credit', (ch->>'stt')::numeric + (ch->>'sebi_fee')::numeric + (ch->>'stamp_duty')::numeric + (ch->>'gst')::numeric),
      jsonb_build_object('code','2300','credit', (ch->>'exchange_txn')::numeric));
  else
    v_lines := jsonb_build_array(
      jsonb_build_object('code','1100','debit', v_value),
      jsonb_build_object('code','C-'||a.client_code,'credit', v_value - v_total),
      jsonb_build_object('code','4000','credit', (ch->>'brokerage')::numeric),
      jsonb_build_object('code','2200','credit', (ch->>'stt')::numeric + (ch->>'sebi_fee')::numeric + (ch->>'stamp_duty')::numeric + (ch->>'gst')::numeric),
      jsonb_build_object('code','2300','credit', (ch->>'exchange_txn')::numeric));
  end if;
  v_entry := post_journal('trade', t.id::text, 'Simulated '||o.side||' '||p_qty||' x '||v_sym||' @ '||p_price, v_lines);
  update trades set journal_entry_id = v_entry where id = t.id;

  -- order aggregate
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
  return t.id;
end $$;

create or replace function place_order(p_client_order_id text, p_symbol text, p_side order_side, p_type order_type,
  p_product product_type, p_qty int, p_price numeric default null, p_trigger numeric default null, p_via text default 'web')
returns jsonb language plpgsql security definer set search_path = public as $$
declare a trading_accounts; i instruments; q quotes; rl risk_limits; o orders; ms jsonb; funds jsonb;
        v_ref numeric; v_value numeric; v_req numeric; v_rms jsonb := '[]'::jsonb; v_reason text; v_hold_qty int;
        v_fill_price numeric; v_ex text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into o from orders where client_order_id = p_client_order_id;
  if o.id is not null then return jsonb_build_object('order_id', o.id, 'status', o.status, 'idempotent_replay', true); end if;

  select * into a from trading_accounts where user_id = auth.uid() and environment = 'sandbox';
  if a.id is null then raise exception 'NO_TRADING_ACCOUNT'; end if;
  if a.status <> 'active' then raise exception 'ACCOUNT_NOT_ACTIVE: %', a.status; end if;
  select * into i from instruments where symbol = p_symbol and exchange='NSE';
  if i.id is null then raise exception 'INSTRUMENT_NOT_FOUND'; end if;
  if not i.tradable or i.segment <> 'EQ' then raise exception 'INSTRUMENT_NOT_TRADABLE'; end if;
  select * into q from quotes where instrument_id = i.id;
  if q.instrument_id is null then raise exception 'NO_QUOTE'; end if;
  select * into rl from risk_limits where scope='global';
  ms := market_status();

  insert into orders(client_order_id,account_id,user_id,instrument_id,side,order_type,product,qty,price,trigger_price,status,placed_via)
  values (p_client_order_id,a.id,auth.uid(),i.id,p_side,p_type,p_product,p_qty,p_price,p_trigger,'RECEIVED',p_via) returning * into o;
  insert into order_events(order_id,from_status,to_status,payload) values (o.id,null,'RECEIVED',jsonb_build_object('market',ms));
  perform order_transition(o.id,'RMS_CHECK',null);

  -- RMS (fail-closed)
  v_ref := case when p_type in ('LIMIT','SL') and p_price is not null then p_price else q.ltp end;
  v_value := round(p_qty * v_ref, 2);
  if rl.kill_switch then v_reason := 'RMS_KILL_SWITCH_ACTIVE'; end if;
  if v_reason is null and not (ms->>'accepting_orders')::boolean then v_reason := 'MARKET_CLOSED'; end if;
  if v_reason is null and p_qty % i.lot_size <> 0 then v_reason := 'QTY_NOT_MULTIPLE_OF_LOT'; end if;
  if v_reason is null and p_qty > rl.max_order_qty then v_reason := 'MAX_ORDER_QTY_EXCEEDED'; end if;
  if v_reason is null and v_value > rl.max_order_value then v_reason := 'MAX_ORDER_VALUE_EXCEEDED'; end if;
  if v_reason is null and p_type in ('LIMIT','SL') and (p_price is null or p_price <= 0) then v_reason := 'PRICE_REQUIRED'; end if;
  if v_reason is null and p_type in ('SL','SL-M') and (p_trigger is null or p_trigger <= 0) then v_reason := 'TRIGGER_REQUIRED'; end if;
  if v_reason is null and p_price is not null and round(p_price / i.tick_size) * i.tick_size <> p_price then v_reason := 'PRICE_NOT_TICK_MULTIPLE'; end if;
  if v_reason is null and p_price is not null and (p_price > q.prev_close*(1+i.price_band_pct/100) or p_price < q.prev_close*(1-i.price_band_pct/100)) then v_reason := 'PRICE_OUTSIDE_BAND'; end if;
  if v_reason is null and p_product='MIS' and not rl.allow_mis then v_reason := 'MIS_DISABLED'; end if;
  v_rms := v_rms || jsonb_build_object('check','static_validation','ok', v_reason is null, 'reference_price', v_ref, 'order_value', v_value, 'reason', v_reason);

  funds := account_funds(a.id);
  if v_reason is null then
    if p_side='BUY' then
      v_req := case when p_product='CNC' then v_value + (compute_charges(p_product,p_side,v_value)->>'total')::numeric
                    else round(v_value * rl.mis_margin_pct/100, 2) end;
      if (funds->>'available')::numeric < v_req then v_reason := 'INSUFFICIENT_FUNDS'; end if;
      v_rms := v_rms || jsonb_build_object('check','margin','required', v_req, 'available', (funds->>'available')::numeric, 'ok', v_reason is null);
    else
      if p_product='CNC' then
        select coalesce(qty,0) into v_hold_qty from holdings where account_id=a.id and instrument_id=i.id;
        v_hold_qty := coalesce(v_hold_qty,0) - coalesce((select sum(qty-filled_qty) from orders where account_id=a.id and instrument_id=i.id and side='SELL' and product='CNC' and status in ('ACKNOWLEDGED','PARTIALLY_FILLED') and id<>o.id),0);
        if v_hold_qty < p_qty then v_reason := 'INSUFFICIENT_HOLDINGS'; end if;
        v_rms := v_rms || jsonb_build_object('check','holdings','free_qty', v_hold_qty, 'ok', v_reason is null);
        v_req := 0;
      else
        v_req := round(v_value * rl.mis_margin_pct/100, 2);
        if (funds->>'available')::numeric < v_req then v_reason := 'INSUFFICIENT_MARGIN_FOR_SHORT'; end if;
        v_rms := v_rms || jsonb_build_object('check','short_margin','required', v_req, 'available', (funds->>'available')::numeric, 'ok', v_reason is null);
      end if;
    end if;
  end if;

  if v_reason is not null then
    update orders set rms_result = v_rms, rejection_reason = v_reason where id = o.id;
    perform order_transition(o.id,'RMS_REJECTED',jsonb_build_object('reason',v_reason));
    perform audit('order.rms_rejected','order',o.id::text,null,jsonb_build_object('reason',v_reason,'rms',v_rms),'rejected');
    return jsonb_build_object('order_id', o.id, 'status','RMS_REJECTED','reason', v_reason, 'rms', v_rms);
  end if;
  update orders set rms_result = v_rms where id = o.id;
  if coalesce(v_req,0) > 0 then insert into fund_holds(account_id,order_id,amount) values (a.id,o.id,v_req); end if;

  -- Simulated exchange routing
  perform order_transition(o.id,'ROUTED',jsonb_build_object('adapter','SIMULATED_EXCHANGE'));
  v_ex := 'SIMX-'||to_char(now(),'YYYYMMDD')||'-'||lpad(nextval('client_code_seq')::text,10,'0');
  update orders set exchange_order_id = v_ex where id = o.id;
  perform order_transition(o.id,'ACKNOWLEDGED',jsonb_build_object('exchange_order_id',v_ex,'simulated',true));

  if p_type = 'MARKET' then
    v_fill_price := case when p_side='BUY' then coalesce(q.ask, q.ltp) else coalesce(q.bid, q.ltp) end;
    v_fill_price := round(v_fill_price / i.tick_size) * i.tick_size;
    perform apply_fill(o.id, p_qty, v_fill_price);
  elsif p_type = 'LIMIT' then
    if (p_side='BUY' and coalesce(q.ask,q.ltp) <= p_price) or (p_side='SELL' and coalesce(q.bid,q.ltp) >= p_price) then
      perform apply_fill(o.id, p_qty, p_price);
    end if;
  end if;

  select * into o from orders where id = o.id;
  return jsonb_build_object('order_id', o.id, 'status', o.status, 'exchange_order_id', v_ex, 'filled_qty', o.filled_qty,
    'avg_fill_price', o.avg_fill_price, 'rms', v_rms, 'simulated', true);
end $$;

create or replace function cancel_order(p_order uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare o orders;
begin
  select * into o from orders where id = p_order for update;
  if o.id is null then raise exception 'ORDER_NOT_FOUND'; end if;
  if o.user_id <> auth.uid() and not is_staff() then raise exception 'FORBIDDEN'; end if;
  if o.status not in ('ACKNOWLEDGED','PARTIALLY_FILLED') then raise exception 'ORDER_NOT_OPEN: %', o.status; end if;
  perform order_transition(o.id,'CANCELLED',jsonb_build_object('by',auth.uid()));
  update fund_holds set released = true where order_id = o.id and not released;
  perform audit('order.cancelled','order',o.id::text,jsonb_build_object('status',o.status),jsonb_build_object('status','CANCELLED'));
  return jsonb_build_object('order_id', o.id, 'status','CANCELLED');
end $$;

-- ---------------------------------------------------------------------------
-- Simulated market engine
-- ---------------------------------------------------------------------------
create or replace function sim_tick() returns jsonb
language plpgsql security definer set search_path = public as $$
declare r record; v_new numeric; v_vol numeric; v_n int := 0; v_matched int := 0; ms jsonb := market_status();
        v_last timestamptz; v_day date := (now() at time zone 'Asia/Kolkata')::date;
begin
  select max(updated_at) into v_last from quotes;
  if v_last is not null and v_last > now() - interval '3 seconds' then
    return jsonb_build_object('skipped', true, 'reason','throttled','last', v_last);
  end if;
  if not (ms->>'accepting_orders')::boolean then
    return jsonb_build_object('skipped', true, 'reason','market_closed');
  end if;
  for r in select q.*, i.tick_size, i.segment, i.price_band_pct from quotes q join instruments i on i.id=q.instrument_id loop
    v_vol := case when r.segment='INDEX' then 0.0009 else 0.0018 end;
    v_new := r.ltp * (1 + (random()*2-1) * v_vol + (random()*2-1) * v_vol * 0.3);
    v_new := greatest(v_new, r.prev_close*(1-r.price_band_pct/100));
    v_new := least(v_new, r.prev_close*(1+r.price_band_pct/100));
    v_new := round(v_new / r.tick_size) * r.tick_size;
    if (r.updated_at at time zone 'Asia/Kolkata')::date < v_day then
      update quotes set prev_close = ltp, open = v_new, high = v_new, low = v_new, volume = 0 where instrument_id = r.instrument_id;
    end if;
    update quotes set ltp = v_new, high = greatest(high, v_new), low = least(low, v_new),
      volume = volume + (random()*5000)::bigint,
      bid = round((v_new - r.tick_size) / r.tick_size) * r.tick_size, ask = round((v_new + r.tick_size)/r.tick_size)*r.tick_size,
      updated_at = now() where instrument_id = r.instrument_id;
    insert into candles(instrument_id, ts, timeframe, o,h,l,c,v)
      values (r.instrument_id, date_trunc('minute', now()), '1m', v_new, v_new, v_new, v_new, (random()*5000)::bigint)
      on conflict (instrument_id, timeframe, ts) do update set h = greatest(candles.h, excluded.c), l = least(candles.l, excluded.c), c = excluded.c, v = candles.v + excluded.v;
    insert into candles(instrument_id, ts, timeframe, o,h,l,c,v)
      values (r.instrument_id, v_day::timestamptz, '1d', v_new, v_new, v_new, v_new, (random()*5000)::bigint)
      on conflict (instrument_id, timeframe, ts) do update set h = greatest(candles.h, excluded.c), l = least(candles.l, excluded.c), c = excluded.c, v = candles.v + excluded.v;
    v_n := v_n + 1;
  end loop;
  for r in select o.*, q.ltp, q.bid, q.ask from orders o join quotes q on q.instrument_id=o.instrument_id
           where o.status in ('ACKNOWLEDGED','PARTIALLY_FILLED') loop
    if r.order_type='LIMIT' then
      if (r.side='BUY' and r.ask <= r.price) or (r.side='SELL' and r.bid >= r.price) then
        perform apply_fill(r.id, r.qty - r.filled_qty, r.price); v_matched := v_matched + 1; end if;
    elsif r.order_type='SL-M' then
      if (r.side='BUY' and r.ltp >= r.trigger_price) or (r.side='SELL' and r.ltp <= r.trigger_price) then
        perform apply_fill(r.id, r.qty - r.filled_qty, case when r.side='BUY' then r.ask else r.bid end); v_matched := v_matched + 1; end if;
    elsif r.order_type='SL' then
      if (r.side='BUY' and r.ltp >= r.trigger_price and r.ask <= r.price) or (r.side='SELL' and r.ltp <= r.trigger_price and r.bid >= r.price) then
        perform apply_fill(r.id, r.qty - r.filled_qty, r.price); v_matched := v_matched + 1; end if;
    end if;
  end loop;
  return jsonb_build_object('ticked', v_n, 'matched', v_matched, 'at', now(), 'source','SIMULATED');
end $$;

-- Seed ~260 calendar days of random-walk daily history for every instrument (idempotent)
create or replace function sim_seed_history() returns int
language plpgsql security definer set search_path = public as $$
declare r record; d date; px numeric; o numeric; h numeric; l numeric; c numeric; n int := 0;
begin
  for r in select q.*, i.tick_size from quotes q join instruments i on i.id = q.instrument_id
           where not exists (select 1 from candles c where c.instrument_id = q.instrument_id and c.timeframe='1d') loop
    px := r.prev_close * 0.85;
    for k in reverse 260..1 loop
      d := current_date - k;
      if extract(dow from d) in (0,6) then continue; end if;
      o := px; c := px * (1 + (random()*2-1)*0.015 + 0.0006);
      h := greatest(o,c) * (1 + random()*0.008); l := least(o,c) * (1 - random()*0.008);
      insert into candles(instrument_id,ts,timeframe,o,h,l,c,v) values (r.instrument_id, d::timestamptz, '1d',
        round(o/r.tick_size)*r.tick_size, round(h/r.tick_size)*r.tick_size, round(l/r.tick_size)*r.tick_size, round(c/r.tick_size)*r.tick_size, (random()*2000000)::bigint)
        on conflict do nothing;
      px := c;
    end loop;
    update quotes set prev_close = round(px/r.tick_size)*r.tick_size, ltp = round(px/r.tick_size)*r.tick_size, open = round(px/r.tick_size)*r.tick_size,
       high = round(px/r.tick_size)*r.tick_size, low = round(px/r.tick_size)*r.tick_size,
       bid = round(px/r.tick_size)*r.tick_size - r.tick_size, ask = round(px/r.tick_size)*r.tick_size + r.tick_size
       where instrument_id = r.instrument_id;
    n := n + 1;
  end loop;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- EOD settlement (sandbox): expire open orders, square off MIS, record run
-- ---------------------------------------------------------------------------
create or replace function run_eod_settlement() returns jsonb
language plpgsql security definer set search_path = public as $$
declare r record; v_sq int := 0; v_cancel int := 0; v_day date := (now() at time zone 'Asia/Kolkata')::date; v_run bigint; v_oid uuid;
begin
  if current_app_role() not in ('ops','risk','admin','super_admin') then raise exception 'FORBIDDEN'; end if;
  for r in select o.id from orders o where o.status in ('ACKNOWLEDGED','PARTIALLY_FILLED') loop
    perform order_transition(r.id,'EXPIRED',jsonb_build_object('reason','EOD'));
    update fund_holds set released = true where order_id = r.id and not released; v_cancel := v_cancel + 1;
  end loop;
  for r in select p.*, q.ltp, i.symbol, i.tick_size, ta.user_id from positions p join quotes q on q.instrument_id=p.instrument_id join instruments i on i.id=p.instrument_id
           join trading_accounts ta on ta.id = p.account_id
           where p.product='MIS' and p.net_qty <> 0 and p.trading_day = v_day loop
    insert into orders(client_order_id,account_id,user_id,instrument_id,side,order_type,product,qty,status,placed_via,exchange_order_id)
    values ('EOD-'||r.account_id||'-'||r.instrument_id||'-'||v_day||'-'||extract(epoch from now())::bigint, r.account_id, r.user_id, r.instrument_id,
            case when r.net_qty>0 then 'SELL' else 'BUY' end, 'MARKET','MIS', abs(r.net_qty), 'ACKNOWLEDGED','system_square_off','SIMX-EOD')
    returning id into v_oid;
    insert into order_events(order_id,from_status,to_status,payload) values (v_oid,null,'ACKNOWLEDGED',jsonb_build_object('reason','EOD_SQUARE_OFF'));
    perform apply_fill(v_oid, abs(r.net_qty), round(r.ltp/r.tick_size)*r.tick_size);
    v_sq := v_sq + 1;
  end loop;
  insert into settlement_runs(trading_day, run_by, summary) values (v_day, auth.uid(), jsonb_build_object('mis_squared_off', v_sq, 'orders_expired', v_cancel))
  returning id into v_run;
  perform audit('settlement.eod.run','settlement_run',v_run::text,null,jsonb_build_object('mis_squared_off',v_sq,'orders_expired',v_cancel));
  return jsonb_build_object('run_id', v_run, 'mis_squared_off', v_sq, 'orders_expired', v_cancel);
end $$;

create or replace function trial_balance() returns table(code text, name text, type ledger_account_type, debit numeric, credit numeric, balance numeric)
language sql stable security definer set search_path = public as $$
  select a.code, a.name, a.type, coalesce(sum(l.debit),0), coalesce(sum(l.credit),0),
         case when a.type in ('ASSET','EXPENSE') then coalesce(sum(l.debit),0)-coalesce(sum(l.credit),0) else coalesce(sum(l.credit),0)-coalesce(sum(l.debit),0) end
  from ledger_accounts a left join journal_lines l on l.ledger_account_id = a.id
  where is_staff()
  group by a.id order by a.code
$$;

create or replace function reconciliation_report() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_dr numeric; v_cr numeric; v_client_liab numeric; v_bank numeric; v_breaks jsonb; v_neg jsonb;
begin
  if not is_staff() then raise exception 'FORBIDDEN'; end if;
  select coalesce(sum(debit),0), coalesce(sum(credit),0) into v_dr, v_cr from journal_lines;
  select coalesce(sum(l.credit-l.debit),0) into v_client_liab from journal_lines l join ledger_accounts a on a.id=l.ledger_account_id where a.trading_account_id is not null;
  select coalesce(sum(l.debit-l.credit),0) into v_bank from journal_lines l join ledger_accounts a on a.id=l.ledger_account_id where a.code='1000';
  select coalesce(jsonb_agg(jsonb_build_object('order_id',o.id,'status',o.status,'filled_qty',o.filled_qty,'trade_qty',coalesce(t.q,0))),'[]'::jsonb) into v_breaks
    from orders o left join (select order_id, sum(qty) q from trades group by order_id) t on t.order_id=o.id
    where o.filled_qty <> coalesce(t.q,0);
  select coalesce(jsonb_agg(jsonb_build_object('account',a.code,'balance',s.b)),'[]'::jsonb) into v_neg
    from (select ledger_account_id, sum(credit-debit) b from journal_lines group by 1) s join ledger_accounts a on a.id=s.ledger_account_id
    where a.trading_account_id is not null and s.b < 0;
  return jsonb_build_object('journal_debits',v_dr,'journal_credits',v_cr,'journal_balanced', round(v_dr,2)=round(v_cr,2),
    'client_funds_liability', v_client_liab, 'client_bank_asset', v_bank,
    'order_trade_breaks', v_breaks, 'negative_client_balances', v_neg, 'generated_at', now());
end $$;

create or replace function set_user_role(p_user uuid, p_role app_role) returns void
language plpgsql security definer set search_path = public as $$
declare v_old app_role;
begin
  if current_app_role() <> 'super_admin' then raise exception 'FORBIDDEN'; end if;
  if p_user = auth.uid() then raise exception 'CANNOT_CHANGE_OWN_ROLE'; end if;
  select role into v_old from profiles where id = p_user;
  update profiles set role = p_role, updated_at=now() where id = p_user;
  perform audit('user.role.changed','profile',p_user::text,jsonb_build_object('role',v_old),jsonb_build_object('role',p_role));
end $$;

create or replace function update_risk_limits(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v_old risk_limits;
begin
  if current_app_role() not in ('risk','admin','super_admin') then raise exception 'FORBIDDEN'; end if;
  select * into v_old from risk_limits where scope='global';
  update risk_limits set
    max_order_value = coalesce((p->>'max_order_value')::numeric, max_order_value),
    max_order_qty = coalesce((p->>'max_order_qty')::int, max_order_qty),
    max_position_value = coalesce((p->>'max_position_value')::numeric, max_position_value),
    max_daily_loss = coalesce((p->>'max_daily_loss')::numeric, max_daily_loss),
    mis_margin_pct = coalesce((p->>'mis_margin_pct')::numeric, mis_margin_pct),
    allow_mis = coalesce((p->>'allow_mis')::boolean, allow_mis),
    kill_switch = coalesce((p->>'kill_switch')::boolean, kill_switch),
    updated_by = auth.uid(), updated_at = now()
  where scope='global';
  perform audit('risk.limits.updated','risk_limits','global',to_jsonb(v_old),p);
end $$;

create or replace function accept_document(p_slug text) returns void
language plpgsql security definer set search_path = public as $$
declare d legal_documents;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into d from legal_documents where slug=p_slug order by version desc limit 1;
  if d.id is null then raise exception 'DOCUMENT_NOT_FOUND'; end if;
  insert into consents(user_id,document_id,document_version,content_hash) values (auth.uid(), d.id, d.version, d.content_hash)
  on conflict (user_id, document_id) do nothing;
  perform audit('consent.accepted','legal_document',d.slug,null,jsonb_build_object('version',d.version,'hash',d.content_hash));
end $$;

create or replace function log_ai_interaction(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into ai_interactions(user_id,provider,model,prompt_version,classification,input_chars,output_chars,tokens_in,tokens_out,tools_used,outcome)
  values (auth.uid(), p->>'provider', p->>'model', p->>'prompt_version', coalesce(p->>'classification','general_assistance'),
          (p->>'input_chars')::int,(p->>'output_chars')::int,(p->>'tokens_in')::int,(p->>'tokens_out')::int,
          (select array_agg(x) from jsonb_array_elements_text(coalesce(p->'tools_used','[]'::jsonb)) x), coalesce(p->>'outcome','success'));
end $$;

create or replace function update_app_setting(p_key text, p_value jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v_old jsonb;
begin
  if current_app_role() not in ('admin','super_admin') then raise exception 'FORBIDDEN'; end if;
  if p_key = 'live_trading_enabled' then raise exception 'LIVE_TRADING_GATE: requires regulatory approval workflow, not a settings toggle'; end if;
  select value into v_old from app_settings where key = p_key;
  insert into app_settings(key,value,updated_at) values (p_key,p_value,now()) on conflict (key) do update set value=excluded.value, updated_at=now();
  perform audit('settings.updated','app_settings',p_key,v_old,p_value);
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table kyc_applications enable row level security;
alter table trading_accounts enable row level security;
alter table ledger_accounts enable row level security;
alter table journal_entries enable row level security;
alter table journal_lines enable row level security;
alter table fund_transactions enable row level security;
alter table fund_holds enable row level security;
alter table risk_limits enable row level security;
alter table charge_schedules enable row level security;
alter table orders enable row level security;
alter table order_events enable row level security;
alter table trades enable row level security;
alter table positions enable row level security;
alter table holdings enable row level security;
alter table settlement_runs enable row level security;
alter table watchlists enable row level security;
alter table watchlist_items enable row level security;
alter table notifications enable row level security;
alter table support_tickets enable row level security;
alter table ticket_messages enable row level security;
alter table legal_documents enable row level security;
alter table consents enable row level security;
alter table regulatory_obligations enable row level security;
alter table requirements enable row level security;
alter table ai_interactions enable row level security;
alter table audit_events enable row level security;
alter table instruments enable row level security;
alter table quotes enable row level security;
alter table candles enable row level security;
alter table market_holidays enable row level security;
alter table app_settings enable row level security;

create policy "public read instruments" on instruments for select using (true);
create policy "public read quotes" on quotes for select using (true);
create policy "public read candles" on candles for select using (true);
create policy "public read holidays" on market_holidays for select using (true);
create policy "public read legal" on legal_documents for select using (true);
create policy "public read charges" on charge_schedules for select using (true);
create policy "auth read requirements" on requirements for select using (auth.uid() is not null);
create policy "auth read obligations" on regulatory_obligations for select using (auth.uid() is not null);
create policy "staff write requirements" on requirements for all using (is_staff()) with check (is_staff());
create policy "staff write obligations" on regulatory_obligations for all using (is_staff()) with check (is_staff());
create policy "auth read settings" on app_settings for select using (auth.uid() is not null);

create policy "profile self or staff read" on profiles for select using (id = auth.uid() or is_staff());
create policy "profile self update" on profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = current_app_role());

create policy "kyc own read" on kyc_applications for select using (user_id = auth.uid() or is_staff());
create policy "account own read" on trading_accounts for select using (user_id = auth.uid() or is_staff());
create policy "ledger accounts own" on ledger_accounts for select using (is_staff() or trading_account_id in (select id from trading_accounts where user_id = auth.uid()));
create policy "journal entries own" on journal_entries for select using (is_staff() or id in (select l.entry_id from journal_lines l join ledger_accounts a on a.id=l.ledger_account_id join trading_accounts t on t.id=a.trading_account_id where t.user_id=auth.uid()));
create policy "journal lines own" on journal_lines for select using (is_staff() or entry_id in (select l.entry_id from journal_lines l join ledger_accounts a on a.id=l.ledger_account_id join trading_accounts t on t.id=a.trading_account_id where t.user_id=auth.uid()));
create policy "funds own" on fund_transactions for select using (is_staff() or account_id in (select id from trading_accounts where user_id=auth.uid()));
create policy "holds own" on fund_holds for select using (is_staff() or account_id in (select id from trading_accounts where user_id=auth.uid()));
create policy "risk read" on risk_limits for select using (auth.uid() is not null);
create policy "orders own" on orders for select using (user_id = auth.uid() or is_staff());
create policy "order events own" on order_events for select using (is_staff() or order_id in (select id from orders where user_id=auth.uid()));
create policy "trades own" on trades for select using (is_staff() or account_id in (select id from trading_accounts where user_id=auth.uid()));
create policy "positions own" on positions for select using (is_staff() or account_id in (select id from trading_accounts where user_id=auth.uid()));
create policy "holdings own" on holdings for select using (is_staff() or account_id in (select id from trading_accounts where user_id=auth.uid()));
create policy "settlement staff" on settlement_runs for select using (is_staff());
create policy "watchlists own" on watchlists for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "watchlist items own" on watchlist_items for all using (watchlist_id in (select id from watchlists where user_id=auth.uid())) with check (watchlist_id in (select id from watchlists where user_id=auth.uid()));
create policy "notifications own" on notifications for select using (user_id = auth.uid());
create policy "notifications mark read" on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "tickets own" on support_tickets for select using (user_id = auth.uid() or is_staff());
create policy "tickets create" on support_tickets for insert with check (user_id = auth.uid());
create policy "tickets update" on support_tickets for update using (is_staff() or user_id = auth.uid());
create policy "ticket msgs own" on ticket_messages for select using (is_staff() or ticket_id in (select id from support_tickets where user_id=auth.uid()));
create policy "ticket msgs insert" on ticket_messages for insert with check (author_id = auth.uid() and (is_staff() or ticket_id in (select id from support_tickets where user_id=auth.uid())));
create policy "consents own" on consents for select using (user_id = auth.uid() or is_staff());
create policy "ai own or staff" on ai_interactions for select using (user_id = auth.uid() or is_staff());
create policy "audit staff" on audit_events for select using (is_staff());

revoke insert, update, delete on orders, order_events, trades, positions, holdings, journal_entries, journal_lines, ledger_accounts,
  fund_transactions, fund_holds, trading_accounts, kyc_applications, audit_events, consents, quotes, candles, instruments,
  risk_limits, charge_schedules, settlement_runs, ai_interactions, app_settings, market_holidays, legal_documents from anon, authenticated;
