-- 0029: invest hub (additive). Sample mutual fund schemes with NAV history, bond and SGB catalogue, ETF/REIT/InvIT
-- instruments with metadata, IPO listing outcomes. All rows are SIMULATED SAMPLE from fictional issuers; licensed AMFI,
-- CCIL/NSDL and exchange data replace the generators without schema change.

create table mutual_funds (
  id serial primary key,
  scheme_code text not null unique,
  name text not null,
  amc text not null,
  category text not null,          -- Large Cap | Flexi Cap | Mid Cap | Small Cap | ELSS | Index | Liquid | Short Duration | Corporate Bond | Gilt | Aggressive Hybrid | Balanced Advantage | Gold FoF
  asset_class text not null,       -- equity | debt | hybrid | commodity
  plan text not null default 'Direct',
  option text not null default 'Growth',
  nav numeric(12,4) not null,
  nav_date date not null,
  aum_cr numeric(14,2) not null,
  expense_ratio_pct numeric(5,2) not null,
  exit_load text not null,
  min_sip numeric(10,2) not null default 500,
  min_lumpsum numeric(10,2) not null default 5000,
  riskometer text not null,
  benchmark text not null,
  fund_manager text not null,
  lock_in text,
  ret_1y_pct numeric(6,2), ret_3y_pct numeric(6,2), ret_5y_pct numeric(6,2),
  source text not null default 'SIMULATED SAMPLE'
);
create table mf_nav_history (
  scheme_id int not null references mutual_funds(id) on delete cascade,
  nav_date date not null,
  nav numeric(12,4) not null,
  primary key (scheme_id, nav_date)
);
create table bonds (
  id serial primary key,
  kind text not null,              -- gsec | tbill | sdl | corporate | ncd | sgb
  name text not null,
  issuer text not null,
  isin text,
  coupon_pct numeric(6,3),
  maturity_date date,
  face_value numeric(12,2) not null default 100,
  price numeric(12,4),
  ytm_pct numeric(6,3),
  rating text,
  interest_frequency text,
  min_investment numeric(12,2),
  tax_note text,
  how_to_buy text,
  issue_open date, issue_close date,
  source text not null default 'SIMULATED SAMPLE'
);
create table etf_reit_meta (
  instrument_id int primary key references instruments(id) on delete cascade,
  kind text not null,              -- etf | reit | invit
  underlying text not null,
  expense_ratio_pct numeric(5,2),
  inav numeric(12,4),
  distribution_yield_pct numeric(6,2),
  aum_cr numeric(14,2),
  tracking_error_pct numeric(6,3),
  source text not null default 'SIMULATED SAMPLE'
);
alter table ipos add column if not exists listing_price numeric(12,2);
alter table ipos add column if not exists listing_gain_pct numeric(6,2);
alter table ipos add column if not exists gmp_note text default 'Grey-market premium is not published: it is unregulated and unverifiable.';
alter table mutual_funds enable row level security; alter table mf_nav_history enable row level security; alter table bonds enable row level security; alter table etf_reit_meta enable row level security;
create policy "public read" on mutual_funds for select using (true);
create policy "public read" on mf_nav_history for select using (true);
create policy "public read" on bonds for select using (true);
create policy "public read" on etf_reit_meta for select using (true);
revoke insert, update, delete on mutual_funds, mf_nav_history, bonds, etf_reit_meta from anon, authenticated;

do $$
declare r record; i int; d date; v numeric; v_id int; k numeric; mo int;
  schemes text[] := array[
    'SBX-LC-1|Sandbox Bluechip Fund|Sandbox AMC One|Large Cap|equity|Very High|NIFTY 100 TRI|0.55',
    'SBX-LC-2|Sandbox Top 100 Fund|Sandbox AMC Two|Large Cap|equity|Very High|NIFTY 100 TRI|0.72',
    'SBX-FC-1|Sandbox Flexi Cap Fund|Sandbox AMC One|Flexi Cap|equity|Very High|NIFTY 500 TRI|0.68',
    'SBX-FC-2|Sandbox Opportunities Fund|Sandbox AMC Three|Flexi Cap|equity|Very High|NIFTY 500 TRI|0.81',
    'SBX-MC-1|Sandbox Midcap Fund|Sandbox AMC Two|Mid Cap|equity|Very High|NIFTY Midcap 150 TRI|0.74',
    'SBX-SC-1|Sandbox Small Cap Fund|Sandbox AMC Three|Small Cap|equity|Very High|NIFTY Smallcap 250 TRI|0.79',
    'SBX-ELSS-1|Sandbox Tax Saver Fund|Sandbox AMC One|ELSS|equity|Very High|NIFTY 500 TRI|0.62',
    'SBX-ELSS-2|Sandbox Long Term Equity Fund|Sandbox AMC Two|ELSS|equity|Very High|NIFTY 500 TRI|0.70',
    'SBX-IDX-1|Sandbox Nifty 50 Index Fund|Sandbox AMC One|Index|equity|Very High|NIFTY 50 TRI|0.12',
    'SBX-IDX-2|Sandbox Nifty Next 50 Index Fund|Sandbox AMC Three|Index|equity|Very High|NIFTY Next 50 TRI|0.18',
    'SBX-LIQ-1|Sandbox Liquid Fund|Sandbox AMC One|Liquid|debt|Low to Moderate|CRISIL Liquid Debt Index|0.15',
    'SBX-SD-1|Sandbox Short Duration Fund|Sandbox AMC Two|Short Duration|debt|Moderate|CRISIL Short Duration Debt Index|0.32',
    'SBX-CB-1|Sandbox Corporate Bond Fund|Sandbox AMC Three|Corporate Bond|debt|Moderate|CRISIL Corporate Bond Index|0.30',
    'SBX-GILT-1|Sandbox Gilt Fund|Sandbox AMC One|Gilt|debt|Moderate|CRISIL Dynamic Gilt Index|0.40',
    'SBX-AH-1|Sandbox Equity & Debt Fund|Sandbox AMC Two|Aggressive Hybrid|hybrid|Very High|CRISIL Hybrid 35+65 Index|0.78',
    'SBX-BA-1|Sandbox Balanced Advantage Fund|Sandbox AMC Three|Balanced Advantage|hybrid|High|CRISIL Hybrid 50+50 Index|0.66',
    'SBX-GOLD-1|Sandbox Gold Fund of Fund|Sandbox AMC One|Gold FoF|commodity|High|Domestic price of gold|0.20'];
  parts text[]; base numeric; drift numeric; vol numeric; v_nav numeric;
begin
  for i in 1..array_length(schemes, 1) loop
    parts := string_to_array(schemes[i], '|');
    base := 10 + 90 * sim_rand(parts[1]||':base');
    drift := case parts[5] when 'equity' then 0.011 when 'hybrid' then 0.008 when 'debt' then 0.0055 else 0.009 end;
    vol := case parts[5] when 'equity' then 0.045 when 'hybrid' then 0.03 when 'debt' then 0.004 else 0.035 end;
    insert into mutual_funds(scheme_code, name, amc, category, asset_class, nav, nav_date, aum_cr, expense_ratio_pct, exit_load, riskometer, benchmark, fund_manager, lock_in)
    values (parts[1], parts[2]||' (Direct, Growth)', parts[3], parts[4], parts[5], base, (now() at time zone 'Asia/Kolkata')::date, round(500 + 30000 * sim_rand(parts[1]||':aum'), 2), parts[8]::numeric,
      case parts[5] when 'debt' then 'Nil' else '1% if redeemed within 1 year' end, parts[6], parts[7], 'Sample Manager '||chr(64 + ((i - 1) % 5) + 1), case when parts[4]='ELSS' then '3 years (Section 80C)' else null end)
    returning id into v_id;
    v_nav := base;
    for mo in reverse 60..0 loop
      d := (date_trunc('month', (now() at time zone 'Asia/Kolkata')::date) - (mo || ' months')::interval)::date;
      k := sim_rand(parts[1]||':'||d::text) - 0.5;
      v_nav := round(v_nav * (1 + drift + k * vol * 2), 4);
      insert into mf_nav_history(scheme_id, nav_date, nav) values (v_id, d, v_nav) on conflict do nothing;
    end loop;
    update mutual_funds m set nav = h.nav, nav_date = h.nav_date,
      ret_1y_pct = round((h.nav / nullif((select nav from mf_nav_history where scheme_id = v_id and nav_date = h.nav_date - interval '12 months'),0) - 1) * 100, 2),
      ret_3y_pct = round((power(h.nav / nullif((select nav from mf_nav_history where scheme_id = v_id and nav_date = h.nav_date - interval '36 months'),0), 1.0/3) - 1) * 100, 2),
      ret_5y_pct = round((power(h.nav / nullif((select nav from mf_nav_history where scheme_id = v_id and nav_date = h.nav_date - interval '60 months'),0), 1.0/5) - 1) * 100, 2)
    from (select nav, nav_date from mf_nav_history where scheme_id = v_id order by nav_date desc limit 1) h where m.id = v_id;
  end loop;

  insert into bonds(kind, name, issuer, isin, coupon_pct, maturity_date, face_value, price, ytm_pct, rating, interest_frequency, min_investment, tax_note, how_to_buy) values
    ('gsec','7.10% GS 2034 (sample)','Government of India','IN0SAMPLE0001',7.10,'2034-04-18',100,101.25,6.94,'Sovereign','Half-yearly',10000,'Interest taxed at slab; no TDS for residents on RBI Retail Direct; LTCG after 12 months at 12.5% without indexation (illustrative, verify).','RBI Retail Direct, NSE goBID / BSE Direct, or secondary market through a broker'),
    ('gsec','7.26% GS 2033 (sample)','Government of India','IN0SAMPLE0002',7.26,'2033-08-22',100,102.10,6.98,'Sovereign','Half-yearly',10000,'Interest taxed at slab.','RBI Retail Direct or secondary market'),
    ('gsec','6.79% GS 2029 (sample)','Government of India','IN0SAMPLE0003',6.79,'2029-12-30',100,99.80,6.85,'Sovereign','Half-yearly',10000,'Interest taxed at slab.','RBI Retail Direct or secondary market'),
    ('tbill','91-day T-bill (sample)','Government of India',null,null,(now() at time zone 'Asia/Kolkata')::date + 91,100,98.36,6.72,'Sovereign','Discount (zero coupon)',10000,'Gain taxed as short-term capital gain at slab.','Weekly RBI auction via RBI Retail Direct (non-competitive bids)'),
    ('tbill','182-day T-bill (sample)','Government of India',null,null,(now() at time zone 'Asia/Kolkata')::date + 182,100,96.70,6.80,'Sovereign','Discount (zero coupon)',10000,'Gain taxed as short-term capital gain at slab.','Weekly RBI auction'),
    ('tbill','364-day T-bill (sample)','Government of India',null,null,(now() at time zone 'Asia/Kolkata')::date + 364,100,93.60,6.84,'Sovereign','Discount (zero coupon)',10000,'Gain taxed as short-term capital gain at slab.','Weekly RBI auction'),
    ('sdl','7.38% Maharashtra SDL 2035 (sample)','State of Maharashtra','IN2SAMPLE0001',7.38,'2035-03-12',100,101.90,7.16,'Sovereign (state)','Half-yearly',10000,'Interest taxed at slab.','RBI Retail Direct or secondary market'),
    ('sdl','7.45% Tamil Nadu SDL 2036 (sample)','State of Tamil Nadu','IN2SAMPLE0002',7.45,'2036-01-20',100,102.40,7.18,'Sovereign (state)','Half-yearly',10000,'Interest taxed at slab.','RBI Retail Direct or secondary market'),
    ('corporate','8.05% Sandbox Infra Finance NCD 2029 (sample)','Sandbox Infra Finance Ltd','INE0SAMPLE001',8.05,'2029-06-30',1000,1012.50,7.72,'AAA (sample)','Annual',10000,'Interest taxed at slab; TDS applies above the threshold.','Secondary market (NSE/BSE debt segment) through a broker'),
    ('corporate','8.60% Sandbox Housing Finance bond 2031 (sample)','Sandbox Housing Finance Ltd','INE0SAMPLE002',8.60,'2031-09-15',1000,1021.00,8.21,'AA+ (sample)','Annual',10000,'Interest taxed at slab.','Secondary market through a broker'),
    ('ncd','9.25% Sandbox Credit NCD Tranche II (sample)','Sandbox Credit Ltd',null,9.25,'2030-11-05',1000,1000.00,9.25,'AA (sample)','Monthly / Annual options',10000,'Interest taxed at slab; listed NCDs carry no TDS for demat holders (verify).','Public issue via ASBA during the issue window, then secondary market'),
    ('sgb','Sovereign Gold Bond 2025-26 Series I (sample)','Reserve Bank of India (on behalf of GoI)','IN0SGBSAMPLE1',2.50,(now() at time zone 'Asia/Kolkata')::date + interval '8 years',1,7420.00,null,'Sovereign','Half-yearly 2.5% on issue price',7420,'Capital gain on redemption at maturity is exempt for individuals; interest taxed at slab; early exit after 5 years at RBI buyback windows.','Primary tranches via banks, post offices, NSE/BSE and RBI Retail Direct; secondary market on exchanges'),
    ('sgb','Sovereign Gold Bond 2024-25 Series IV (sample)','Reserve Bank of India (on behalf of GoI)','IN0SGBSAMPLE2',2.50,(now() at time zone 'Asia/Kolkata')::date + interval '7 years',1,6920.00,null,'Sovereign','Half-yearly 2.5% on issue price',6920,'Capital gain on redemption at maturity is exempt for individuals.','Secondary market on exchanges');
  update bonds set issue_open = (now() at time zone 'Asia/Kolkata')::date + 5, issue_close = (now() at time zone 'Asia/Kolkata')::date + 12 where kind = 'ncd';

  -- ETFs, REITs and InvITs as research-only instruments with quotes
  for r in select * from (values
    ('SBXNIFTY','Sandbox Nifty 50 ETF','etf','NIFTY 50 TRI',0.05,265.40,1.20,15000.00,0.05),
    ('SBXBANK','Sandbox Nifty Bank ETF','etf','NIFTY Bank TRI',0.15,520.10,0.90,4200.00,0.08),
    ('SBXIT','Sandbox Nifty IT ETF','etf','NIFTY IT TRI',0.20,41.35,1.10,1800.00,0.10),
    ('SBXGOLD','Sandbox Gold ETF','etf','Domestic gold price',0.45,62.80,0.00,9000.00,0.30),
    ('SBXSILVER','Sandbox Silver ETF','etf','Domestic silver price',0.50,85.20,0.00,2100.00,0.35),
    ('SBXNEXT','Sandbox Nifty Next 50 ETF','etf','NIFTY Next 50 TRI',0.10,72.90,1.00,2600.00,0.12),
    ('SBXLIQUID','Sandbox Liquid ETF','etf','Overnight rate',0.25,1000.00,6.40,6500.00,0.02),
    ('SBXREIT1','Sandbox Office Parks REIT','reit','Grade-A offices (Bengaluru, Mumbai, Pune)',null,312.50,6.20,18000.00,null),
    ('SBXREIT2','Sandbox Business Parks REIT','reit','Grade-A offices (NCR, Hyderabad)',null,278.00,6.60,11500.00,null),
    ('SBXINVIT1','Sandbox Roads InvIT','invit','Toll road concessions',null,128.40,9.10,9800.00,null),
    ('SBXINVIT2','Sandbox Power Grid InvIT','invit','Transmission assets',null,142.75,8.40,12200.00,null)
  ) as t(symbol, name, kind, underlying, expense, ltp, yield, aum, te) loop
    if not exists (select 1 from instruments where symbol = r.symbol) then
      insert into instruments(symbol, exchange, segment, name, sector, lot_size, tick_size, price_band_pct, tradable, is_simulated) values (r.symbol, 'NSE', upper(r.kind), r.name, case r.kind when 'etf' then 'ETF' when 'reit' then 'Real Estate' else 'Infrastructure' end, 1, 0.01, 20, false, true) returning id into v_id;
      insert into quotes(instrument_id, ltp, open, high, low, prev_close, volume, bid, ask, source) values (v_id, r.ltp, round(r.ltp * 0.997, 2), round(r.ltp * 1.006, 2), round(r.ltp * 0.993, 2), round(r.ltp * 0.995, 2), 50000, round(r.ltp * 0.999, 2), round(r.ltp * 1.001, 2), 'SIMULATED');
      insert into etf_reit_meta(instrument_id, kind, underlying, expense_ratio_pct, inav, distribution_yield_pct, aum_cr, tracking_error_pct) values (v_id, r.kind, r.underlying, r.expense, round(r.ltp * (1 + (sim_rand(r.symbol||':inav') - 0.5) * 0.01), 4), r.yield, r.aum, r.te);
    end if;
  end loop;
  -- listing outcomes for sample IPOs that are past listing
  update ipos set listing_price = round(price_band_high * (0.9 + 0.5 * sim_rand(name||':list')), 2) where status in ('listed','closed','allotted') and listing_price is null;
  update ipos set listing_gain_pct = round((listing_price / price_band_high - 1) * 100, 2) where listing_price is not null;
end $$;
