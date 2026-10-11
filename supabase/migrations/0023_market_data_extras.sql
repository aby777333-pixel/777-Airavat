-- 0023: remaining market-data companions (provenance on every row; no licensed feeds) and asset-class matrix rows.
create table market_stats_daily (
  instrument_id int not null references instruments(id) on delete cascade,
  day date not null,
  traded_qty bigint not null default 0,
  deliverable_qty bigint not null default 0,
  delivery_pct numeric(6,2) generated always as (case when traded_qty > 0 then round(deliverable_qty::numeric * 100 / traded_qty, 2) else 0 end) stored,
  pre_open_price numeric(18,4), pre_open_qty bigint,
  source text not null default 'SIMULATED',
  primary key (instrument_id, day)
);
create table corporate_announcements (
  id bigserial primary key, instrument_id int references instruments(id) on delete cascade, announced_at timestamptz not null default now(), category text not null, title text not null, body text, source text not null default 'SIMULATED SAMPLE', created_by uuid
);
create table insider_disclosures (
  id bigserial primary key, instrument_id int not null references instruments(id) on delete cascade, person text not null, relation text not null, transaction text not null check (transaction in ('BUY','SELL','PLEDGE','REVOKE')), qty bigint not null, value numeric(18,2), disclosed_on date not null, source text not null default 'SIMULATED SAMPLE', created_by uuid
);
create table shareholding_patterns (
  id bigserial primary key, instrument_id int not null references instruments(id) on delete cascade, quarter text not null, promoters_pct numeric(6,2), fii_pct numeric(6,2), dii_pct numeric(6,2), public_pct numeric(6,2), source text not null default 'SIMULATED SAMPLE', created_by uuid, unique (instrument_id, quarter)
);
create table bulk_block_deals (
  id bigserial primary key, deal_date date not null, instrument_id int not null references instruments(id) on delete cascade, kind text not null check (kind in ('BULK','BLOCK')), client_name text not null, side order_side not null, qty bigint not null, price numeric(18,4) not null, source text not null default 'SIMULATED SAMPLE', created_by uuid
);
create table institutional_flows (
  day date primary key, fii_buy_cr numeric(14,2), fii_sell_cr numeric(14,2), dii_buy_cr numeric(14,2), dii_sell_cr numeric(14,2), source text not null default 'SIMULATED SAMPLE', created_by uuid
);
alter table market_stats_daily enable row level security; alter table corporate_announcements enable row level security; alter table insider_disclosures enable row level security; alter table shareholding_patterns enable row level security; alter table bulk_block_deals enable row level security; alter table institutional_flows enable row level security;
create policy "stats public" on market_stats_daily for select using (true);
create policy "announcements public" on corporate_announcements for select using (true);
create policy "insider public" on insider_disclosures for select using (true);
create policy "shareholding public" on shareholding_patterns for select using (true);
create policy "deals public" on bulk_block_deals for select using (true);
create policy "flows public" on institutional_flows for select using (true);
create policy "announcements staff" on corporate_announcements for all using (current_app_role() in ('ops','admin','super_admin','editor')) with check (current_app_role() in ('ops','admin','super_admin','editor'));
create policy "insider staff" on insider_disclosures for all using (current_app_role() in ('ops','admin','super_admin','editor')) with check (current_app_role() in ('ops','admin','super_admin','editor'));
create policy "shareholding staff" on shareholding_patterns for all using (current_app_role() in ('ops','admin','super_admin','editor')) with check (current_app_role() in ('ops','admin','super_admin','editor'));
create policy "deals staff" on bulk_block_deals for all using (current_app_role() in ('ops','admin','super_admin','editor')) with check (current_app_role() in ('ops','admin','super_admin','editor'));
create policy "flows staff" on institutional_flows for all using (current_app_role() in ('ops','admin','super_admin','editor')) with check (current_app_role() in ('ops','admin','super_admin','editor'));
revoke insert, update, delete on market_stats_daily from anon, authenticated;

-- Daily stats from the simulated engine: delivery % derived from volume with a deterministic per-instrument factor; pre-open snapshot at 09:08 IST.
create or replace function compute_market_stats_daily() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into market_stats_daily(instrument_id, day, traded_qty, deliverable_qty, pre_open_price, pre_open_qty, source)
  select q.instrument_id, (now() at time zone 'Asia/Kolkata')::date, q.volume, floor(q.volume * (0.25 + (q.instrument_id % 7) * 0.08)), q.open, floor(q.volume * 0.03), 'SIMULATED'
  from quotes q join instruments i on i.id = q.instrument_id where i.segment = 'EQ'
  on conflict (instrument_id, day) do update set traded_qty = excluded.traded_qty, deliverable_qty = excluded.deliverable_qty, pre_open_price = coalesce(market_stats_daily.pre_open_price, excluded.pre_open_price), pre_open_qty = coalesce(market_stats_daily.pre_open_qty, excluded.pre_open_qty);
  get diagnostics n = row_count; return n;
end $$;
revoke execute on function compute_market_stats_daily() from public, anon, authenticated;
select cron.schedule('airavat-market-stats', '*/15 9-16 * * 1-5', $$select public.compute_market_stats_daily()$$);
select compute_market_stats_daily();

-- Samples (clearly labelled)
insert into corporate_announcements(instrument_id, category, title, body, source) select id, 'Board meeting', 'Board meeting to consider quarterly results (simulated sample)', 'Sample announcement so the page and workflow can be demonstrated.', 'SIMULATED SAMPLE' from instruments where symbol in ('RELIANCE','TCS');
insert into insider_disclosures(instrument_id, person, relation, transaction, qty, value, disclosed_on, source) select id, 'Sample Promoter Entity', 'Promoter group', 'BUY', 10000, 10000 * 1500, current_date - 2, 'SIMULATED SAMPLE' from instruments where symbol='INFY';
insert into shareholding_patterns(instrument_id, quarter, promoters_pct, fii_pct, dii_pct, public_pct, source) select id, '2026-Q2', 50.1, 22.4, 15.2, 12.3, 'SIMULATED SAMPLE' from instruments where symbol in ('RELIANCE','TCS','INFY','HDFCBANK') on conflict do nothing;
insert into bulk_block_deals(deal_date, instrument_id, kind, client_name, side, qty, price, source) select current_date - 1, id, 'BLOCK', 'Sample Institutional Fund', 'BUY', 500000, 1270, 'SIMULATED SAMPLE' from instruments where symbol='RELIANCE';
insert into institutional_flows(day, fii_buy_cr, fii_sell_cr, dii_buy_cr, dii_sell_cr, source) values (current_date - 1, 8450.2, 9120.7, 7210.5, 6380.1, 'SIMULATED SAMPLE'), (current_date - 2, 7920.0, 7110.4, 6530.9, 6890.3, 'SIMULATED SAMPLE') on conflict do nothing;

-- Asset-class rows in the market access matrix (segment gates), where missing
insert into market_access_matrix(exchange, segment, product_family, name, stage, data_feed, client_eligibility, regulatory_notes)
select * from (values
 ('NSE','EQ','ETF','Exchange-traded funds','sandbox_live','synthetic','Any active account','Trades under the equity cash workflow; sandbox universe gains ETF instruments with the data expansion'),
 ('NSE','EQ','REIT_INVIT','REITs and InvITs','sandbox_live','synthetic','Any active account','Equity cash workflow'),
 ('AMFI','MF','MUTUAL_FUNDS','Mutual funds (direct plans)','regulatory_assessment','none','KYC-compliant investors','Needs AMFI registration and RTA/exchange MF platform'),
 ('NSE','IPO','IPO_MAINBOARD','IPO applications (mainboard, SME)','sandbox_live','synthetic','Demat + UPI','Sandbox ASBA-style blocks and simulated allotment; exchange IPO platform and UPI mandate not connected'),
 ('NSE','DEBT','GSEC_TBILL_SDL','Government securities, T-bills, SDLs','regulatory_assessment','none','Demat; RBI Retail Direct for primary','Exchange debt segment / RBI Retail Direct not connected'),
 ('NSE','DEBT','CORP_BONDS','Corporate bonds','regulatory_assessment','none','Demat','Exchange debt platform access required'),
 ('NSE','EQ','SGB_SECONDARY','Sovereign gold bonds (secondary market)','research','synthetic','Demat','Equity cash workflow once listed instruments are loaded'),
 ('NSE','SLB','SLB','Securities lending and borrowing','research','none','Eligible clients','Requires SLB segment membership and clearing'),
 ('AIRAVAT','FUNDING','MTF','Margin trading facility','development','none','Eligible clients with agreement','Requires MTF authorisation, funding book and pledge infrastructure'),
 ('CDSL','DP','PLEDGE','Pledge and collateral services','development','none','Demat holders','Requires DP registration and margin pledge mechanism')
) v(exchange, segment, product_family, name, stage, data_feed, client_eligibility, regulatory_notes)
where not exists (select 1 from market_access_matrix m where m.exchange = v.exchange and m.segment = v.segment and m.product_family = v.product_family);
update market_access_matrix set trading_enabled = true where stage = 'sandbox_live' and product_family in ('ETF','REIT_INVIT');
