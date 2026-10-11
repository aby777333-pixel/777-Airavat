-- 0028: markets hub (additive). Sector indices and India VIX as simulated index instruments, index constituents with
-- weights, per-company fundamentals (SIMULATED SAMPLE), FII/DII activity, market holidays, macro series, results
-- calendar, IPO subscription tracker, derivative contract specs, and SQL views for market pulse and index detail.
-- Every generated row is labelled SIMULATED SAMPLE; licensed feeds replace the generators without schema change.

create table index_constituents (
  index_symbol text not null,
  instrument_id int not null references instruments(id) on delete cascade,
  weight_pct numeric(6,2) not null,
  primary key (index_symbol, instrument_id)
);
create table instrument_fundamentals (
  instrument_id int not null references instruments(id) on delete cascade,
  fy text not null,
  revenue_cr numeric(14,2), ebitda_cr numeric(14,2), net_profit_cr numeric(14,2),
  eps numeric(12,2), book_value_ps numeric(12,2), dividend_ps numeric(10,2),
  roe_pct numeric(6,2), roce_pct numeric(6,2), debt_to_equity numeric(6,2),
  promoter_holding_pct numeric(6,2), shares_cr numeric(12,2),
  source text not null default 'SIMULATED SAMPLE',
  primary key (instrument_id, fy)
);
create table fii_dii_activity (
  day date primary key,
  fii_buy_cr numeric(12,2) not null, fii_sell_cr numeric(12,2) not null,
  dii_buy_cr numeric(12,2) not null, dii_sell_cr numeric(12,2) not null,
  fii_index_fut_net_cr numeric(12,2), fii_index_opt_net_cr numeric(12,2), fii_stock_fut_net_cr numeric(12,2),
  source text not null default 'SIMULATED SAMPLE'
);
-- market_holidays(day, description) already exists from 0001; national holidays are added below
create table macro_series (
  series text not null,
  period date not null,
  value numeric(14,4) not null,
  unit text not null,
  label text not null,
  source text not null default 'SIMULATED SAMPLE',
  is_sample boolean not null default true,
  primary key (series, period)
);
create table corporate_events (
  id bigserial primary key,
  instrument_id int not null references instruments(id) on delete cascade,
  kind text not null,              -- results | agm | board_meeting
  event_date date not null,
  note text,
  source text not null default 'SIMULATED SAMPLE'
);
create index on corporate_events(event_date);
create table ipo_subscriptions (
  ipo_id bigint not null references ipos(id) on delete cascade,
  day_no int not null,
  qib_x numeric(8,2) not null, nii_x numeric(8,2) not null, retail_x numeric(8,2) not null, employee_x numeric(8,2), total_x numeric(8,2) not null,
  source text not null default 'SIMULATED SAMPLE',
  primary key (ipo_id, day_no)
);
create table contract_specs (
  instrument_id int primary key references instruments(id) on delete cascade,
  expiry date not null,
  lot_size int not null,
  unit text not null,
  tick_size numeric(10,4) not null,
  margin_pct numeric(6,2) not null,
  trading_hours text not null,
  delivery text not null,
  source text not null default 'SIMULATED SAMPLE'
);
alter table index_constituents enable row level security; alter table instrument_fundamentals enable row level security; alter table fii_dii_activity enable row level security;
alter table macro_series enable row level security; alter table corporate_events enable row level security; alter table ipo_subscriptions enable row level security; alter table contract_specs enable row level security;
create policy "public read" on index_constituents for select using (true);
create policy "public read" on instrument_fundamentals for select using (true);
create policy "public read" on fii_dii_activity for select using (true);
create policy "public read" on macro_series for select using (true);
create policy "public read" on corporate_events for select using (true);
create policy "public read" on ipo_subscriptions for select using (true);
create policy "public read" on contract_specs for select using (true);
revoke insert, update, delete on index_constituents, instrument_fundamentals, fii_dii_activity, macro_series, corporate_events, ipo_subscriptions, contract_specs from anon, authenticated;

-- deterministic pseudo-random in [0,1) from a text seed
create or replace function sim_rand(p text) returns numeric language sql immutable as $$
  select (('x' || substr(md5(p), 1, 8))::bit(32)::bigint % 1000000) / 1000000.0
$$;

do $$
declare r record; v_id int; v_shares numeric; v_pe numeric; v_np numeric; v_rev numeric; v_eps numeric; v_bv numeric; v_g numeric; fy int; d date; k numeric; v_total numeric;
        sectors text[] := array['NIFTY IT|IT Services|Nifty IT','NIFTY PHARMA|Pharma,Healthcare|Nifty Pharma','NIFTY AUTO|Automobiles|Nifty Auto','NIFTY FMCG|FMCG,Consumer|Nifty FMCG','NIFTY METAL|Metals,Mining|Nifty Metal','NIFTY ENERGY|Energy,Utilities|Nifty Energy','NIFTY FIN SERVICE|Banking,NBFC,Financial Services,Insurance|Nifty Financial Services'];
        s text; parts text[]; v_level numeric;
begin
  -- 1. sector indices and India VIX as simulated index instruments
  foreach s in array sectors loop
    parts := string_to_array(s, '|');
    if not exists (select 1 from instruments where symbol = parts[1]) then
      insert into instruments(symbol, exchange, segment, name, sector, lot_size, tick_size, price_band_pct, tradable, is_simulated) values (parts[1], 'NSE', 'INDEX', parts[3], 'Index', 1, 0.05, 20, false, true) returning id into v_id;
      select coalesce(sum(q.ltp) * 4.2, 10000) into v_level from instruments i join quotes q on q.instrument_id = i.id where i.segment='EQ' and i.sector = any(string_to_array(parts[2], ','));
      insert into quotes(instrument_id, ltp, open, high, low, prev_close, volume, bid, ask, source) values (v_id, round(v_level,2), round(v_level*0.998,2), round(v_level*1.006,2), round(v_level*0.994,2), round(v_level*0.997,2), 0, null, null, 'SIMULATED');
    end if;
    select id into v_id from instruments where symbol = parts[1];
    delete from index_constituents where index_symbol = parts[1];
    insert into index_constituents(index_symbol, instrument_id, weight_pct)
    select parts[1], i.id, 0 from instruments i where i.segment='EQ' and i.sector = any(string_to_array(parts[2], ','));
  end loop;
  if not exists (select 1 from instruments where symbol = 'INDIA VIX') then
    insert into instruments(symbol, exchange, segment, name, sector, lot_size, tick_size, price_band_pct, tradable, is_simulated) values ('INDIA VIX', 'NSE', 'INDEX', 'India VIX (volatility index)', 'Index', 1, 0.01, 50, false, true) returning id into v_id;
    insert into quotes(instrument_id, ltp, open, high, low, prev_close, volume, bid, ask, source) values (v_id, 13.42, 13.10, 13.80, 12.95, 13.05, 0, null, null, 'SIMULATED');
  end if;
  -- NIFTY 50 and NIFTY BANK constituents
  delete from index_constituents where index_symbol in ('NIFTY 50','NIFTY BANK');
  insert into index_constituents(index_symbol, instrument_id, weight_pct) select 'NIFTY 50', id, 0 from instruments where segment='EQ';
  insert into index_constituents(index_symbol, instrument_id, weight_pct) select 'NIFTY BANK', id, 0 from instruments where segment='EQ' and sector='Banking';
  -- weights: free-float proxy = ltp x simulated share count, normalised per index
  for r in select distinct index_symbol from index_constituents loop
    select sum(q.ltp * (40 + 900 * sim_rand(i.symbol||':shares'))) into v_total from index_constituents c join instruments i on i.id=c.instrument_id join quotes q on q.instrument_id=i.id where c.index_symbol = r.index_symbol;
    update index_constituents c set weight_pct = round((q.ltp * (40 + 900 * sim_rand(i.symbol||':shares'))) / v_total * 100, 2) from instruments i, quotes q where i.id=c.instrument_id and q.instrument_id=i.id and c.index_symbol = r.index_symbol;
  end loop;
  -- 2. fundamentals: four financial years per company, generated from the simulated price and a stable per-company seed
  for r in select i.id, i.symbol, i.sector, q.ltp from instruments i join quotes q on q.instrument_id=i.id where i.segment='EQ' loop
    v_shares := round(40 + 900 * sim_rand(r.symbol||':shares'), 2);
    v_pe := round(case when r.sector in ('IT Services','FMCG','Consumer','Retail','Healthcare') then 28 + 30 * sim_rand(r.symbol||':pe') when r.sector in ('Banking','NBFC','Financial Services','Insurance') then 12 + 14 * sim_rand(r.symbol||':pe') when r.sector in ('Energy','Utilities','Metals','Mining') then 8 + 12 * sim_rand(r.symbol||':pe') else 18 + 20 * sim_rand(r.symbol||':pe') end, 1);
    v_g := 0.06 + 0.14 * sim_rand(r.symbol||':growth');
    v_np := r.ltp * v_shares / v_pe;   -- crore, FY2026
    for fy in 0..3 loop
      k := power(1 + v_g, -fy);
      v_eps := v_np * k / v_shares; v_bv := v_eps * (3 + 8 * sim_rand(r.symbol||':bv'));
      v_rev := v_np * k * (case when r.sector in ('Banking','NBFC','Financial Services','Insurance') then 4 + 3 * sim_rand(r.symbol||':m') else 6 + 10 * sim_rand(r.symbol||':m') end);
      insert into instrument_fundamentals(instrument_id, fy, revenue_cr, ebitda_cr, net_profit_cr, eps, book_value_ps, dividend_ps, roe_pct, roce_pct, debt_to_equity, promoter_holding_pct, shares_cr)
      values (r.id, 'FY'||(2026 - fy), round(v_rev,2), round(v_rev * (0.14 + 0.2 * sim_rand(r.symbol||':ebitda')),2), round(v_np * k,2), round(v_eps,2), round(v_bv,2), round(v_eps * (0.15 + 0.3 * sim_rand(r.symbol||':dps')),2),
        round(v_eps / v_bv * 100,2), round(v_eps / v_bv * 100 * (0.9 + 0.3 * sim_rand(r.symbol||':roce')),2), case when r.sector in ('Banking','NBFC','Financial Services','Insurance') then null else round(1.2 * sim_rand(r.symbol||':de'),2) end, round(28 + 48 * sim_rand(r.symbol||':prom'),2), v_shares)
      on conflict do nothing;
    end loop;
    -- results calendar: one quarterly result date in the next 40 days, some AGMs
    insert into corporate_events(instrument_id, kind, event_date, note) values (r.id, 'results', (now() at time zone 'Asia/Kolkata')::date + (3 + floor(37 * sim_rand(r.symbol||':res')))::int, 'Quarterly results (board meeting)');
    if sim_rand(r.symbol||':agm') > 0.6 then insert into corporate_events(instrument_id, kind, event_date, note) values (r.id, 'agm', (now() at time zone 'Asia/Kolkata')::date + (10 + floor(60 * sim_rand(r.symbol||':agmd')))::int, 'Annual general meeting'); end if;
  end loop;
  -- 3. FII / DII activity for the last 45 weekdays
  for fy in 0..64 loop
    d := (now() at time zone 'Asia/Kolkata')::date - fy;
    if extract(isodow from d) <= 5 then
      insert into fii_dii_activity(day, fii_buy_cr, fii_sell_cr, dii_buy_cr, dii_sell_cr, fii_index_fut_net_cr, fii_index_opt_net_cr, fii_stock_fut_net_cr)
      values (d, round(7000 + 9000 * sim_rand(d::text||':fb'),2), round(7000 + 9000 * sim_rand(d::text||':fs'),2), round(6000 + 8000 * sim_rand(d::text||':db'),2), round(6000 + 8000 * sim_rand(d::text||':ds'),2),
        round(-2500 + 5000 * sim_rand(d::text||':if'),2), round(-20000 + 40000 * sim_rand(d::text||':io'),2), round(-1500 + 3000 * sim_rand(d::text||':sf'),2))
      on conflict do nothing;
    end if;
  end loop;
  -- 4. holidays: fixed national holidays only; festival dates come from the exchange circular and are entered by staff
  insert into market_holidays(day, description) values
    ('2026-01-26','Republic Day (fixed national holiday; verify the exchange circular)'),
    ('2026-08-15','Independence Day (fixed national holiday; verify the exchange circular)'),
    ('2026-10-02','Mahatma Gandhi Jayanti (fixed national holiday; verify the exchange circular)'),
    ('2026-12-25','Christmas (fixed national holiday; verify the exchange circular)')
  on conflict do nothing;
  -- 5. macro series: 12 monthly points, indicative sample values
  for fy in 0..11 loop
    d := date_trunc('month', (now() at time zone 'Asia/Kolkata')::date)::date - (fy || ' months')::interval;
    insert into macro_series(series, period, value, unit, label) values
      ('cpi_yoy', d, round(4.3 + 1.6 * sim_rand(d::text||':cpi'),2), '%', 'CPI inflation (YoY)'),
      ('wpi_yoy', d, round(0.8 + 2.4 * sim_rand(d::text||':wpi'),2), '%', 'WPI inflation (YoY)'),
      ('repo_rate', d, case when fy >= 6 then 6.50 else 6.25 end, '%', 'RBI repo rate'),
      ('gsec_10y', d, round(6.7 + 0.5 * sim_rand(d::text||':gs'),2), '%', '10-year G-Sec yield'),
      ('usdinr', d, round(83.2 + 1.9 * sim_rand(d::text||':inr'),2), 'INR', 'USD/INR reference'),
      ('iip_yoy', d, round(2.5 + 4 * sim_rand(d::text||':iip'),2), '%', 'Index of Industrial Production (YoY)'),
      ('pmi_mfg', d, round(54 + 4.5 * sim_rand(d::text||':pmi'),1), 'index', 'Manufacturing PMI'),
      ('brent', d, round(68 + 20 * sim_rand(d::text||':oil'),2), 'USD/bbl', 'Brent crude')
    on conflict do nothing;
  end loop;
  for fy in 0..7 loop
    d := date_trunc('quarter', (now() at time zone 'Asia/Kolkata')::date)::date - (fy * 3 || ' months')::interval;
    insert into macro_series(series, period, value, unit, label) values ('gdp_yoy', d, round(6.2 + 2 * sim_rand(d::text||':gdp'),1), '%', 'Real GDP growth (YoY, quarterly)') on conflict do nothing;
  end loop;
  -- 6. IPO subscription tracker for existing sample issues
  for r in select id, status from ipos loop
    for fy in 1..3 loop
      k := sim_rand(r.id::text||':'||fy);
      insert into ipo_subscriptions(ipo_id, day_no, qib_x, nii_x, retail_x, employee_x, total_x)
      values (r.id, fy, round((0.3 + 2 * k) * fy * fy, 2), round((0.5 + 3 * k) * fy, 2), round((0.8 + 1.5 * k) * fy, 2), round(0.4 * fy, 2), round(((0.3 + 2 * k) * fy * fy * 0.5 + (0.5 + 3 * k) * fy * 0.15 + (0.8 + 1.5 * k) * fy * 0.35), 2))
      on conflict do nothing;
    end loop;
  end loop;
  -- 7. contract specs for research-only commodity and currency instruments
  for r in select id, symbol, segment, lot_size, tick_size from instruments where segment in ('COMM','CDS') loop
    insert into contract_specs(instrument_id, expiry, lot_size, unit, tick_size, margin_pct, trading_hours, delivery)
    values (r.id, (date_trunc('month', (now() at time zone 'Asia/Kolkata')::date) + interval '1 month' + interval '1 month' - interval '1 day')::date, r.lot_size,
      case r.symbol when 'GOLD' then '1 kg (100 x 10 g)' when 'SILVER' then '30 kg' when 'CRUDEOIL' then '100 barrels' when 'NATURALGAS' then '1250 mmBtu' when 'COPPER' then '2500 kg' else '1000 units of base currency' end,
      r.tick_size, case when r.segment='CDS' then 2.5 else 10 end, case when r.segment='CDS' then '09:00–17:00 IST' else '09:00–23:30 IST (23:55 in US daylight-saving period)' end,
      case when r.segment='CDS' then 'Cash settled (RBI reference rate)' when r.symbol in ('GOLD','SILVER','COPPER') then 'Compulsory delivery' else 'Cash settled' end)
    on conflict do nothing;
  end loop;
end $$;

-- market pulse: breadth, 52-week extremes, volume shockers, circuit hits, delivery leaders
create or replace function market_pulse() returns jsonb
language sql stable security definer set search_path = public as $$
  with eq as (
    select i.id, i.symbol, i.sector, i.price_band_pct, q.ltp, q.prev_close, q.volume, q.high, q.low,
           (q.ltp - q.prev_close) / nullif(q.prev_close,0) * 100 as chg
    from instruments i join quotes q on q.instrument_id = i.id where i.segment='EQ'
  ), hist as (
    select instrument_id, max(h) hi52, min(l) lo52, avg(v) avgv from candles where timeframe='1d' and ts > now() - interval '365 days' group by instrument_id
  ), joined as (
    select e.*, h.hi52, h.lo52, h.avgv from eq e left join hist h on h.instrument_id = e.id
  )
  select jsonb_build_object(
    'advances', (select count(*) from joined where chg > 0), 'declines', (select count(*) from joined where chg < 0), 'unchanged', (select count(*) from joined where chg = 0),
    'new_highs', (select coalesce(jsonb_agg(jsonb_build_object('symbol', symbol, 'ltp', ltp, 'hi52', hi52) order by chg desc), '[]') from joined where hi52 is not null and ltp >= hi52),
    'new_lows', (select coalesce(jsonb_agg(jsonb_build_object('symbol', symbol, 'ltp', ltp, 'lo52', lo52) order by chg), '[]') from joined where lo52 is not null and ltp <= lo52),
    'volume_shockers', (select coalesce(jsonb_agg(jsonb_build_object('symbol', symbol, 'volume', volume, 'avg', round(avgv), 'ratio', round(volume / nullif(avgv,0), 2)) order by volume / nullif(avgv,0) desc), '[]') from (select * from joined where avgv > 0 and volume / avgv >= 1.8 order by volume / avgv desc limit 10) x),
    'circuit_hits', (select coalesce(jsonb_agg(jsonb_build_object('symbol', symbol, 'chg', round(chg,2), 'band', price_band_pct) order by abs(chg) desc), '[]') from joined where abs(chg) >= price_band_pct * 0.98),
    'top_delivery', (select coalesce(jsonb_agg(jsonb_build_object('symbol', t.symbol, 'delivery_pct', t.delivery_pct, 'day', t.day) order by t.delivery_pct desc), '[]') from (select i.symbol, s.delivery_pct, s.day from (select distinct on (instrument_id) * from market_stats_daily order by instrument_id, day desc) s join instruments i on i.id = s.instrument_id order by s.delivery_pct desc limit 10) t),
    'sector_breadth', (select coalesce(jsonb_agg(jsonb_build_object('sector', sector, 'advances', a, 'declines', d, 'avg_chg', avgc) order by avgc desc), '[]') from (select sector, count(*) filter (where chg > 0) a, count(*) filter (where chg < 0) d, round(avg(chg),2) avgc from joined group by sector) s),
    'as_of', now(), 'simulated', true)
$$;
create or replace function index_detail(p_symbol text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'index', (select jsonb_build_object('symbol', i.symbol, 'name', i.name, 'ltp', q.ltp, 'prev_close', q.prev_close, 'open', q.open, 'high', q.high, 'low', q.low, 'updated_at', q.updated_at) from instruments i join quotes q on q.instrument_id=i.id where i.symbol = p_symbol),
    'constituents', (select coalesce(jsonb_agg(jsonb_build_object('symbol', i.symbol, 'name', i.name, 'sector', i.sector, 'weight_pct', c.weight_pct, 'ltp', q.ltp, 'prev_close', q.prev_close, 'chg_pct', round((q.ltp - q.prev_close) / nullif(q.prev_close,0) * 100, 2), 'contribution', round(c.weight_pct * (q.ltp - q.prev_close) / nullif(q.prev_close,0), 3)) order by c.weight_pct desc), '[]')
      from index_constituents c join instruments i on i.id = c.instrument_id join quotes q on q.instrument_id = i.id where c.index_symbol = p_symbol),
    'sectors', (select coalesce(jsonb_agg(jsonb_build_object('sector', s.sector, 'weight_pct', s.w) order by s.w desc), '[]') from (select i.sector, round(sum(c.weight_pct),2) w from index_constituents c join instruments i on i.id=c.instrument_id where c.index_symbol = p_symbol group by i.sector) s))
$$;
grant execute on function sim_rand(text) to anon, authenticated;
grant execute on function market_pulse() to anon, authenticated;
grant execute on function index_detail(text) to anon, authenticated;
