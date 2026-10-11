-- 0018: market-data companion tables for the public Markets section (sandbox). Every row carries provenance.
-- No licensed feed is connected; rows are either SIMULATED SAMPLE (clearly labelled) or entered by staff.

create table corporate_actions (
  id bigserial primary key,
  instrument_id int not null references instruments(id) on delete cascade,
  kind text not null check (kind in ('DIVIDEND','SPLIT','BONUS','RIGHTS','BUYBACK','AGM','RESULTS')),
  ex_date date not null,
  record_date date,
  amount numeric(18,4),          -- dividend per share
  ratio text,                    -- e.g. '1:2' for split/bonus
  description text,
  source text not null default 'SIMULATED SAMPLE',
  status text not null default 'announced',   -- announced | applied
  applied_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index on corporate_actions(ex_date);

create table economic_events (
  id bigserial primary key,
  event_date date not null,
  event_time time,
  country text not null default 'IN',
  title text not null,
  category text not null,        -- policy | inflation | gdp | holiday | earnings | global
  importance text not null default 'medium',
  expected text, previous text, actual text,
  source text not null default 'SIMULATED SAMPLE',
  created_by uuid,
  created_at timestamptz not null default now()
);
create index on economic_events(event_date);

create table ipos (
  id bigserial primary key,
  name text not null,
  symbol text,
  board text not null default 'MAINBOARD',   -- MAINBOARD | SME
  price_band_low numeric(18,2), price_band_high numeric(18,2),
  lot_size int,
  issue_size_cr numeric(18,2),
  open_date date, close_date date, allotment_date date, listing_date date,
  status text not null default 'upcoming',   -- upcoming | open | closed | allotted | listed
  registrar text,
  description text,
  source text not null default 'SIMULATED SAMPLE',
  created_by uuid,
  created_at timestamptz not null default now()
);

create table ipo_applications (
  id bigserial primary key,
  ipo_id bigint not null references ipos(id),
  account_id uuid not null references trading_accounts(id),
  user_id uuid not null references profiles(id),
  lots int not null check (lots > 0),
  bid_price numeric(18,2) not null,
  amount numeric(18,2) not null,
  hold_id uuid references fund_holds(id),
  status text not null default 'applied',    -- applied | allotted | not_allotted | cancelled
  allotted_qty int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table corporate_actions enable row level security;
alter table economic_events enable row level security;
alter table ipos enable row level security;
alter table ipo_applications enable row level security;
create policy "corporate actions public" on corporate_actions for select using (true);
create policy "economic events public" on economic_events for select using (true);
create policy "ipos public" on ipos for select using (true);
create policy "ipo applications own" on ipo_applications for select using (user_id = auth.uid() or is_staff());
create policy "corporate actions staff write" on corporate_actions for all using (current_app_role() in ('ops','admin','super_admin','editor')) with check (current_app_role() in ('ops','admin','super_admin','editor'));
create policy "economic events staff write" on economic_events for all using (current_app_role() in ('ops','admin','super_admin','editor')) with check (current_app_role() in ('ops','admin','super_admin','editor'));
create policy "ipos staff write" on ipos for all using (current_app_role() in ('ops','admin','super_admin','editor')) with check (current_app_role() in ('ops','admin','super_admin','editor'));
revoke insert, update, delete on ipo_applications from anon, authenticated;

-- Sandbox IPO application: blocks funds (ASBA-style hold) until allotment; allotment is a simulated lottery at close.
create or replace function apply_ipo(p_ipo bigint, p_lots int, p_bid numeric) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a trading_accounts; i ipos; v_amt numeric; v_hold uuid; v_id bigint; funds jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into a from trading_accounts where user_id = auth.uid() and environment='sandbox' and status='active';
  if a.id is null then raise exception 'ACCOUNT_NOT_ACTIVE'; end if;
  select * into i from ipos where id = p_ipo;
  if i.id is null then raise exception 'NOT_FOUND'; end if;
  if i.status <> 'open' then raise exception 'IPO_NOT_OPEN'; end if;
  if p_lots < 1 or p_lots > 13 then raise exception 'LOTS_1_TO_13'; end if;
  if p_bid < i.price_band_low or p_bid > i.price_band_high then raise exception 'BID_OUTSIDE_BAND'; end if;
  if exists (select 1 from ipo_applications where ipo_id = i.id and account_id = a.id and status='applied') then raise exception 'ALREADY_APPLIED'; end if;
  v_amt := round(p_lots * i.lot_size * p_bid, 2);
  if v_amt > 200000 then raise exception 'RETAIL_LIMIT_2_LAKH'; end if;
  funds := account_funds(a.id);
  if (funds->>'available')::numeric < v_amt then raise exception 'INSUFFICIENT_FUNDS'; end if;
  insert into fund_holds(account_id, amount) values (a.id, v_amt) returning id into v_hold;
  insert into ipo_applications(ipo_id, account_id, user_id, lots, bid_price, amount, hold_id) values (i.id, a.id, auth.uid(), p_lots, p_bid, v_amt, v_hold) returning id into v_id;
  perform audit('ipo.applied','ipo_application',v_id::text,null,jsonb_build_object('ipo',i.name,'lots',p_lots,'amount',v_amt,'simulated',true));
  return jsonb_build_object('application_id', v_id, 'amount_blocked', v_amt, 'simulated', true);
end $$;

create or replace function cancel_ipo_application(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare ap ipo_applications; i ipos;
begin
  select * into ap from ipo_applications where id = p_id for update;
  if ap.id is null then raise exception 'NOT_FOUND'; end if;
  if ap.user_id <> auth.uid() and not is_staff() then raise exception 'FORBIDDEN'; end if;
  select * into i from ipos where id = ap.ipo_id;
  if ap.status <> 'applied' or i.status <> 'open' then raise exception 'CANNOT_CANCEL'; end if;
  update fund_holds set released = true where id = ap.hold_id;
  update ipo_applications set status='cancelled', updated_at=now() where id = p_id;
  perform audit('ipo.cancelled','ipo_application',p_id::text,null,null);
end $$;

-- Staff: close an issue and run the simulated allotment (lottery when oversubscribed; sandbox credits shares via holdings).
create or replace function allot_ipo(p_ipo bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare i ipos; ap record; v_inst int; v_allotted int := 0; v_total_lots int; v_cap_lots int; v_px numeric; v_entry bigint; a trading_accounts;
begin
  if current_app_role() not in ('ops','admin','super_admin') then raise exception 'FORBIDDEN'; end if;
  select * into i from ipos where id = p_ipo for update;
  if i.status not in ('open','closed') then raise exception 'IPO_NOT_CLOSABLE'; end if;
  v_px := i.price_band_high;
  select coalesce(sum(lots),0) into v_total_lots from ipo_applications where ipo_id = i.id and status='applied';
  v_cap_lots := greatest(1, floor(coalesce(i.issue_size_cr,1) * 1e7 * 0.35 / nullif(i.lot_size * v_px,0)))::int;  -- 35% retail portion (sandbox)
  if i.symbol is not null then
    insert into instruments(symbol, exchange, segment, name, sector, lot_size, tick_size, tradable, is_simulated) values (i.symbol, 'NSE', 'EQ', i.name, 'New listing', 1, 0.05, true, true)
      on conflict (exchange, symbol) do nothing;
    select id into v_inst from instruments where symbol = i.symbol and exchange='NSE';
    insert into quotes(instrument_id, ltp, open, high, low, prev_close, bid, ask) values (v_inst, v_px, v_px, v_px, v_px, v_px, v_px - 0.05, v_px + 0.05) on conflict (instrument_id) do nothing;
  end if;
  for ap in select * from ipo_applications where ipo_id = i.id and status='applied' order by random() loop
    if v_total_lots <= v_cap_lots or v_allotted < v_cap_lots then
      select * into a from trading_accounts where id = ap.account_id;
      update fund_holds set released = true where id = ap.hold_id;
      v_entry := post_journal('ipo_allotment', ap.id::text, 'IPO allotment '||i.name||' (simulated)', jsonb_build_array(jsonb_build_object('code','C-'||a.client_code,'debit',ap.lots*i.lot_size*v_px), jsonb_build_object('code','1100','credit',ap.lots*i.lot_size*v_px)));
      insert into holdings(account_id, instrument_id, qty, avg_price) values (ap.account_id, v_inst, ap.lots*i.lot_size, v_px)
        on conflict (account_id, instrument_id) do update set avg_price = (holdings.avg_price*holdings.qty + excluded.avg_price*excluded.qty)/(holdings.qty+excluded.qty), qty = holdings.qty + excluded.qty, updated_at = now();
      update ipo_applications set status='allotted', allotted_qty = ap.lots*i.lot_size, updated_at=now() where id = ap.id;
      insert into notifications(user_id,kind,title,body) values (ap.user_id,'funds','IPO allotted: '||i.name,'Simulated allotment of '||ap.lots*i.lot_size||' shares at Rs '||v_px||'. Funds debited from the block.');
      v_allotted := v_allotted + ap.lots;
    else
      update fund_holds set released = true where id = ap.hold_id;
      update ipo_applications set status='not_allotted', updated_at=now() where id = ap.id;
      insert into notifications(user_id,kind,title,body) values (ap.user_id,'funds','IPO not allotted: '||i.name,'Simulated lottery did not allot; the blocked amount is released.');
    end if;
  end loop;
  update ipos set status='allotted' where id = i.id;
  perform audit('ipo.allotted','ipo',i.id::text,null,jsonb_build_object('lots_applied',v_total_lots,'lots_allotted',v_allotted,'simulated',true));
  return jsonb_build_object('ipo', i.name, 'lots_applied', v_total_lots, 'lots_allotted', v_allotted, 'simulated', true);
end $$;

-- Apply announced corporate actions on/after ex-date (sandbox): dividends credit cash; splits/bonus adjust holdings and candle history.
create or replace function apply_corporate_actions() returns jsonb
language plpgsql security definer set search_path = public as $$
declare ca record; h record; n int := 0; v_num int; v_den int; v_factor numeric; a trading_accounts;
begin
  for ca in select * from corporate_actions where status='announced' and ex_date <= (now() at time zone 'Asia/Kolkata')::date loop
    if ca.kind = 'DIVIDEND' and ca.amount is not null then
      for h in select * from holdings where instrument_id = ca.instrument_id and qty > 0 loop
        select * into a from trading_accounts where id = h.account_id;
        perform post_journal('dividend', ca.id::text||':'||h.account_id, 'Dividend '||ca.amount||' per share (simulated)', jsonb_build_array(jsonb_build_object('code','1000','debit',round(h.qty*ca.amount,2)), jsonb_build_object('code','C-'||a.client_code,'credit',round(h.qty*ca.amount,2))));
        insert into notifications(user_id,kind,title,body) values (a.user_id,'funds','Dividend credited','Rs '||round(h.qty*ca.amount,2)||' for '||h.qty||' shares (simulated).');
      end loop;
    elsif ca.kind in ('SPLIT','BONUS') and ca.ratio ~ '^\d+:\d+$' then
      v_num := split_part(ca.ratio,':',1)::int; v_den := split_part(ca.ratio,':',2)::int;
      -- SPLIT a:b means each old share becomes b/a new shares? Convention used here: ratio 'new:old' (e.g. 2:1 = two new for one old); BONUS 'bonus:held' (e.g. 1:2 = one bonus per two held).
      v_factor := case when ca.kind='SPLIT' then v_num::numeric / v_den else (v_num + v_den)::numeric / v_den end;
      update holdings set qty = floor(qty * v_factor), avg_price = round(avg_price / v_factor, 4), updated_at = now() where instrument_id = ca.instrument_id and qty > 0;
      update candles set o = round(o / v_factor, 4), h = round(h / v_factor, 4), l = round(l / v_factor, 4), c = round(c / v_factor, 4), v = floor(v * v_factor) where instrument_id = ca.instrument_id and ts < ca.ex_date::timestamptz;
      update quotes set prev_close = round(prev_close / v_factor, 4), ltp = round(ltp / v_factor, 4), open = round(open / v_factor, 4), high = round(high / v_factor, 4), low = round(low / v_factor, 4), bid = round(bid / v_factor, 4), ask = round(ask / v_factor, 4) where instrument_id = ca.instrument_id;
    end if;
    update corporate_actions set status='applied', applied_at = now() where id = ca.id;
    perform audit('corporate_action.applied','corporate_action',ca.id::text,null,jsonb_build_object('kind',ca.kind,'simulated',true));
    n := n + 1;
  end loop;
  return jsonb_build_object('applied', n, 'at', now());
end $$;

revoke execute on function apply_ipo(bigint,int,numeric) from public, anon;
revoke execute on function cancel_ipo_application(bigint) from public, anon;
revoke execute on function allot_ipo(bigint) from public, anon;
revoke execute on function apply_corporate_actions() from public, anon, authenticated;
select cron.schedule('airavat-corporate-actions', '5 10 * * 1-5', $$select public.apply_corporate_actions()$$);

-- Clearly labelled simulated samples so the pages demonstrate the workflow.
insert into economic_events(event_date, event_time, title, category, importance, expected, previous, source) values
 (current_date + 3, '10:00', 'RBI monetary policy decision (sample)', 'policy', 'high', 'Unchanged', 'Unchanged', 'SIMULATED SAMPLE'),
 (current_date + 7, '17:30', 'CPI inflation (sample)', 'inflation', 'high', '4.9%', '5.1%', 'SIMULATED SAMPLE'),
 (current_date + 14, '17:30', 'IIP industrial production (sample)', 'gdp', 'medium', '4.2%', '3.8%', 'SIMULATED SAMPLE'),
 (current_date + 21, '00:00', 'US FOMC decision (sample)', 'global', 'high', '-', '-', 'SIMULATED SAMPLE');
insert into economic_events(event_date, title, category, importance, source) select day, description, 'holiday', 'medium', 'Exchange holiday calendar (sandbox)' from market_holidays where day >= current_date;
insert into ipos(name, symbol, board, price_band_low, price_band_high, lot_size, issue_size_cr, open_date, close_date, allotment_date, listing_date, status, registrar, description, source) values
 ('Demo Infra Trust IPO (sample)', 'DEMOINFRA', 'MAINBOARD', 95, 100, 150, 1200, current_date - 1, current_date + 2, current_date + 4, current_date + 6, 'open', 'Sandbox Registrar', 'A simulated mainboard issue so the application, block and allotment workflow can be exercised end to end.', 'SIMULATED SAMPLE'),
 ('Demo Precision SME IPO (sample)', 'DEMOSME', 'SME', 60, 64, 2000, 45, current_date + 5, current_date + 8, current_date + 10, current_date + 12, 'upcoming', 'Sandbox Registrar', 'A simulated SME issue illustrating larger lots and lower liquidity.', 'SIMULATED SAMPLE');
insert into corporate_actions(instrument_id, kind, ex_date, record_date, amount, description, source) select id, 'DIVIDEND', current_date + 6, current_date + 6, 9, 'Interim dividend Rs 9 per share (simulated sample)', 'SIMULATED SAMPLE' from instruments where symbol='TCS';
insert into corporate_actions(instrument_id, kind, ex_date, record_date, ratio, description, source) select id, 'BONUS', current_date + 20, current_date + 20, '1:1', 'Bonus issue 1:1 (simulated sample)', 'SIMULATED SAMPLE' from instruments where symbol='ITC';
insert into corporate_actions(instrument_id, kind, ex_date, description, source) select id, 'RESULTS', current_date + 9, 'Quarterly results board meeting (simulated sample)', 'SIMULATED SAMPLE' from instruments where symbol='RELIANCE';
