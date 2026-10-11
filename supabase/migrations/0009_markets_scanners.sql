-- AIRAVAT | Migration 0009: Universal Markets access matrix, simulated research-only MCX/currency instruments,
-- instrument metrics, Scanner Matrix (system + user scans), scheduled evaluation. Strictly additive.

create table market_access_matrix (
  id serial primary key,
  exchange text not null,
  segment text not null,
  product_family text not null,
  name text not null,
  stage text not null,               -- research | regulatory_assessment | infrastructure | development | testing | certification | compliance_approval | pilot | sandbox_live | production_live | not_enabled
  entity_authorized boolean not null default false,
  exchange_membership boolean not null default false,
  clearing_arrangement boolean not null default false,
  data_feed text not null default 'none',       -- none | synthetic | delayed | realtime
  client_eligibility text,
  regulatory_notes text,
  trading_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (exchange, segment, product_family)
);
insert into market_access_matrix(exchange,segment,product_family,name,stage,data_feed,client_eligibility,regulatory_notes,trading_enabled) values
 ('NSE','EQ','Equity cash','NSE equity cash (CNC/MIS)','sandbox_live','synthetic','All sandbox clients','Simulated venue only; no membership','true'),
 ('BSE','EQ','Equity cash','BSE equity cash','regulatory_assessment','none','—','Requires BSE membership and data licence',false),
 ('NSE','FO','Equity & index derivatives','NSE F&O','research','none','Income proof + segment activation','Requires F&O segment membership, SPAN margin engine, physical settlement workflows',false),
 ('MCX','COMM','Commodity futures & options','MCX commodities','research','synthetic','Commodity declarations','Requires MCX membership; delivery/tender workflows; research-only simulated prices shown',false),
 ('NCDEX','COMM','Agri commodities','NCDEX','research','none','—','Requires membership; warehouse receipt workflows',false),
 ('NSE','CDS','Currency derivatives','NSE currency derivatives','research','synthetic','Exposure declarations per RBI/SEBI','Research-only simulated prices; RBI/SEBI eligibility rules to verify',false),
 ('NSE','DEBT','Government securities & bonds','Fixed income','research','none','—','Exchange debt segment / RFQ; RBI Retail Direct referral option',false),
 ('NSE','ETF','Exchange-traded funds','ETFs','development','synthetic','All clients','Trades through equity infrastructure once listed ETFs are in the instrument master',false),
 ('NSE','REIT','REITs & InvITs','REITs / InvITs','research','none','—','Equity infrastructure; disclosure data licence needed',false),
 ('NSE','SME','SME equities','NSE Emerge','research','none','Lot-size and risk disclosures','Different lot sizes and liquidity rules',false),
 ('NSE','IPO','Primary market','IPO / FPO / OFS','research','none','UPI/ASBA','Bank, registrar and exchange integrations required',false),
 ('NSE','SLB','Securities lending','SLB','research','none','Eligible participants','Clearing corporation SLB mechanism',false),
 ('NSE','EGR','Electronic gold receipts','EGR','research','none','—','Vault and conversion workflows',false),
 ('IIBX','BULLION','International bullion','IIBX (GIFT City)','research','none','IFSC eligibility','Separate IFSCA permissions and entity',false),
 ('NSE-IX','INTL','IFSC derivatives & securities','NSE International Exchange','research','none','IFSC eligibility','Segregated IFSC books and permissions',false),
 ('INTL','EQ','International equities','US/UK/EU/JP/HK/SG equities','research','none','LRS limits','Separate regulated operating structure; trading disabled',false),
 ('AMFI','MF','Mutual funds','Mutual funds','research','none','KYC','Distribution/execution registration required',false),
 ('SEBI','PMS','Managed products','PMS / AIF','research','none','Suitability','Separate registrations; discretionary management not permitted',false),
 ('OFFSHORE','FX','Leveraged spot FX / CFDs','Offshore FX / CFD','not_enabled','none','Not permitted for Indian residents','Explicitly not enabled; FEMA restrictions',false);

-- Simulated research-only instruments (not tradable): MCX commodities and currency derivatives
insert into instruments(symbol,exchange,segment,name,isin,sector,lot_size,tick_size,price_band_pct,tradable) values
 ('GOLD','MCX','COMM','Gold (10 g) — simulated',null,'Precious metals',100,1,6,false),
 ('SILVER','MCX','COMM','Silver (1 kg) — simulated',null,'Precious metals',30,1,6,false),
 ('CRUDEOIL','MCX','COMM','Crude oil (bbl) — simulated',null,'Energy',100,1,6,false),
 ('NATURALGAS','MCX','COMM','Natural gas (mmBtu) — simulated',null,'Energy',1250,0.1,6,false),
 ('COPPER','MCX','COMM','Copper (kg) — simulated',null,'Base metals',2500,0.05,6,false),
 ('USDINR','NSE','CDS','USD/INR futures — simulated',null,'Currency',1000,0.0025,3,false),
 ('EURINR','NSE','CDS','EUR/INR futures — simulated',null,'Currency',1000,0.0025,3,false),
 ('GBPINR','NSE','CDS','GBP/INR futures — simulated',null,'Currency',1000,0.0025,3,false)
on conflict (exchange, symbol) do nothing;
insert into quotes(instrument_id, ltp, open, high, low, prev_close, bid, ask)
select i.id, p.px, p.px, p.px, p.px, p.px, p.px - i.tick_size, p.px + i.tick_size
from instruments i join (values ('GOLD',72000),('SILVER',88000),('CRUDEOIL',6400),('NATURALGAS',240),('COPPER',820),('USDINR',84.25),('EURINR',91.5),('GBPINR',107.8)) as p(sym,px) on p.sym = i.symbol
where not exists (select 1 from quotes q where q.instrument_id = i.id);

-- Instrument metrics (derived from stored candles + quotes). Recomputed by cron.
create table instrument_metrics (
  instrument_id int primary key references instruments(id) on delete cascade,
  as_of timestamptz not null default now(),
  ltp numeric(18,4),
  ret_1d numeric(10,4), ret_5d numeric(10,4), ret_20d numeric(10,4),
  high_20d numeric(18,4), low_20d numeric(18,4), high_52w numeric(18,4), low_52w numeric(18,4),
  sma_20 numeric(18,4), sma_50 numeric(18,4), rsi_14 numeric(8,2), atr_pct_14 numeric(8,4),
  avg_vol_20 numeric(18,2), vol_ratio numeric(8,3), dist_52w_high_pct numeric(8,3), rs_vs_nifty_20 numeric(10,4),
  gap_pct numeric(8,3)
);

create or replace function compute_instrument_metrics() returns int
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0; v_nifty_ret numeric;
begin
  select (n1.c / nullif(n2.c,0) - 1) into v_nifty_ret from
    (select c from candles where instrument_id=(select id from instruments where symbol='NIFTY 50') and timeframe='1d' order by ts desc limit 1) n1,
    (select c from candles where instrument_id=(select id from instruments where symbol='NIFTY 50') and timeframe='1d' order by ts desc offset 20 limit 1) n2;
  for r in select i.id, q.ltp, q.open, q.prev_close, q.volume from instruments i join quotes q on q.instrument_id = i.id loop
    with cd as (
      select ts, o, h, l, c as cl, v, row_number() over (order by ts desc) rn from candles where instrument_id = r.id and timeframe='1d' order by ts desc limit 260
    ), g as (
      select cd.*, greatest(h - l, abs(h - lag(cl) over (order by ts)), abs(l - lag(cl) over (order by ts))) tr,
             greatest(cl - lag(cl) over (order by ts), 0) gain, greatest(lag(cl) over (order by ts) - cl, 0) loss from cd
    )
    insert into instrument_metrics(instrument_id, as_of, ltp, ret_1d, ret_5d, ret_20d, high_20d, low_20d, high_52w, low_52w, sma_20, sma_50, rsi_14, atr_pct_14, avg_vol_20, vol_ratio, dist_52w_high_pct, rs_vs_nifty_20, gap_pct)
    select r.id, now(), r.ltp,
      round((r.ltp / nullif(r.prev_close,0) - 1) * 100, 4),
      round((r.ltp / nullif((select cl from cd where rn = 5),0) - 1) * 100, 4),
      round((r.ltp / nullif((select cl from cd where rn = 20),0) - 1) * 100, 4),
      (select max(h) from cd where rn <= 20), (select min(l) from cd where rn <= 20),
      (select max(h) from cd where rn <= 250), (select min(l) from cd where rn <= 250),
      (select avg(cl) from cd where rn <= 20), (select avg(cl) from cd where rn <= 50),
      (select case when coalesce(sum(loss),0) = 0 then 100 else round(100 - 100 / (1 + sum(gain)/sum(loss)), 2) end from g where rn <= 14),
      (select round(avg(tr) / nullif(r.ltp,0) * 100, 4) from g where rn <= 14),
      (select avg(v) from cd where rn <= 20),
      round(r.volume / nullif((select avg(v) from cd where rn <= 20),0), 3),
      round((r.ltp / nullif((select max(h) from cd where rn <= 250),0) - 1) * 100, 3),
      round(((r.ltp / nullif((select cl from cd where rn = 20),0) - 1) - coalesce(v_nifty_ret,0)) * 100, 4),
      round((r.open / nullif(r.prev_close,0) - 1) * 100, 3)
    on conflict (instrument_id) do update set as_of = excluded.as_of, ltp = excluded.ltp, ret_1d = excluded.ret_1d, ret_5d = excluded.ret_5d, ret_20d = excluded.ret_20d,
      high_20d = excluded.high_20d, low_20d = excluded.low_20d, high_52w = excluded.high_52w, low_52w = excluded.low_52w, sma_20 = excluded.sma_20, sma_50 = excluded.sma_50,
      rsi_14 = excluded.rsi_14, atr_pct_14 = excluded.atr_pct_14, avg_vol_20 = excluded.avg_vol_20, vol_ratio = excluded.vol_ratio, dist_52w_high_pct = excluded.dist_52w_high_pct,
      rs_vs_nifty_20 = excluded.rs_vs_nifty_20, gap_pct = excluded.gap_pct;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function compute_instrument_metrics() from public, anon, authenticated;

-- Scanners: conditions = [{"metric":"rsi_14","op":"<","value":30}], logic AND|OR
create table scanners (
  id serial primary key,
  code text not null unique,
  name text not null,
  description text,
  category text not null default 'technical',   -- technical | momentum | volume | volatility | breakout | custom
  kind text not null default 'system',           -- system | user
  owner_id uuid references profiles(id) on delete cascade,
  conditions jsonb not null,
  logic text not null default 'AND',
  segment_filter text,                           -- EQ | COMM | CDS | null = tradable EQ
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);
create table scanner_results (
  id bigserial primary key,
  scanner_id int not null references scanners(id) on delete cascade,
  instrument_id int not null references instruments(id) on delete cascade,
  as_of_day date not null,
  matched_at timestamptz not null default now(),
  evidence jsonb not null,
  unique (scanner_id, instrument_id, as_of_day)
);
create index on scanner_results(as_of_day desc, scanner_id);

insert into scanners(code,name,description,category,conditions,logic) values
 ('BREAKOUT_20D','20-day breakout watch','Close at or above the highest high of the last 20 sessions. Breakout is unconfirmed.','breakout','[{"metric":"ltp","op":">=","metric2":"high_20d"}]','AND'),
 ('BREAKDOWN_20D','20-day breakdown watch','Close at or below the lowest low of the last 20 sessions.','breakout','[{"metric":"ltp","op":"<=","metric2":"low_20d"}]','AND'),
 ('MOMENTUM_RS','Relative strength leaders','20-day return beats NIFTY 50 by 5% or more and RSI above 55.','momentum','[{"metric":"rs_vs_nifty_20","op":">=","value":5},{"metric":"rsi_14","op":">","value":55}]','AND'),
 ('OVERSOLD_RSI','RSI oversold','RSI(14) below 30. Oversold readings can persist; not a buy signal.','technical','[{"metric":"rsi_14","op":"<","value":30}]','AND'),
 ('OVERBOUGHT_RSI','RSI overbought','RSI(14) above 70.','technical','[{"metric":"rsi_14","op":">","value":70}]','AND'),
 ('VOLUME_SURGE','Unusual volume','Session volume above 2x the 20-day average.','volume','[{"metric":"vol_ratio","op":">=","value":2}]','AND'),
 ('VOLATILITY_EXPANSION','Volatility expansion','ATR(14) above 3% of price.','volatility','[{"metric":"atr_pct_14","op":">=","value":3}]','AND'),
 ('NEAR_52W_HIGH','Near 52-week high','Within 3% of the 52-week high.','momentum','[{"metric":"dist_52w_high_pct","op":">=","value":-3}]','AND'),
 ('GAP_UP','Gap up open','Opened 2% or more above the previous close.','momentum','[{"metric":"gap_pct","op":">=","value":2}]','AND'),
 ('TREND_ALIGN','Trend alignment','Price above SMA20 and SMA20 above SMA50.','technical','[{"metric":"ltp","op":">","metric2":"sma_20"},{"metric":"sma_20","op":">","metric2":"sma_50"}]','AND');

create or replace function eval_condition(m instrument_metrics, c jsonb) returns boolean
language plpgsql immutable as $$
declare lhs numeric; rhs numeric; op text := c->>'op';
begin
  lhs := to_jsonb(m) ->> (c->>'metric');
  if c ? 'metric2' then rhs := to_jsonb(m) ->> (c->>'metric2'); else rhs := (c->>'value')::numeric; end if;
  if lhs is null or rhs is null then return false; end if;
  return case op when '>' then lhs > rhs when '>=' then lhs >= rhs when '<' then lhs < rhs when '<=' then lhs <= rhs when '=' then lhs = rhs else false end;
end $$;

create or replace function run_scanners() returns jsonb
language plpgsql security definer set search_path = public as $$
declare s scanners; m instrument_metrics; c jsonb; v_ok boolean; v_any boolean; v_matches int := 0; v_ev jsonb;
        v_day date := (now() at time zone 'Asia/Kolkata')::date; n_sc int := 0;
begin
  perform compute_instrument_metrics();
  for s in select * from scanners loop
    n_sc := n_sc + 1;
    for m in select im.* from instrument_metrics im join instruments i on i.id = im.instrument_id
             where (s.segment_filter is null and i.segment = 'EQ' and i.tradable) or (s.segment_filter is not null and i.segment = s.segment_filter) loop
      v_ok := (s.logic = 'AND'); v_any := false; v_ev := '[]'::jsonb;
      for c in select * from jsonb_array_elements(s.conditions) loop
        declare r boolean := eval_condition(m, c); begin
          v_ev := v_ev || jsonb_build_object('metric', c->>'metric', 'op', c->>'op', 'target', coalesce(c->>'metric2', c->>'value'), 'value', to_jsonb(m)->>(c->>'metric'), 'ok', r);
          if s.logic = 'AND' then v_ok := v_ok and r; else v_any := v_any or r; end if;
        end;
      end loop;
      if (s.logic = 'AND' and v_ok) or (s.logic = 'OR' and v_any) then
        insert into scanner_results(scanner_id, instrument_id, as_of_day, evidence)
        values (s.id, m.instrument_id, v_day, jsonb_build_object('conditions', v_ev, 'data_source','SIMULATED','as_of', m.as_of, 'ltp', m.ltp))
        on conflict (scanner_id, instrument_id, as_of_day) do update set matched_at = now(), evidence = excluded.evidence;
        v_matches := v_matches + 1;
      end if;
    end loop;
  end loop;
  delete from scanner_results where as_of_day < v_day - 30;
  return jsonb_build_object('scanners', n_sc, 'matches', v_matches, 'at', now());
end $$;
revoke execute on function run_scanners() from public, anon, authenticated;

create or replace function save_scanner(p jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare v_id int; c jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if jsonb_array_length(p->'conditions') = 0 or jsonb_array_length(p->'conditions') > 8 then raise exception 'CONDITIONS_1_TO_8'; end if;
  for c in select * from jsonb_array_elements(p->'conditions') loop
    if (c->>'metric') not in ('ltp','ret_1d','ret_5d','ret_20d','high_20d','low_20d','high_52w','low_52w','sma_20','sma_50','rsi_14','atr_pct_14','avg_vol_20','vol_ratio','dist_52w_high_pct','rs_vs_nifty_20','gap_pct') then raise exception 'UNKNOWN_METRIC %', c->>'metric'; end if;
    if (c->>'op') not in ('>','>=','<','<=','=') then raise exception 'UNKNOWN_OP'; end if;
  end loop;
  if (select count(*) from scanners where owner_id = auth.uid()) >= 20 then raise exception 'SCANNER_LIMIT'; end if;
  insert into scanners(code,name,description,category,kind,owner_id,conditions,logic,is_public)
  values ('USR-'||substr(auth.uid()::text,1,8)||'-'||substr(md5(random()::text),1,6), left(p->>'name',80), left(p->>'description',300), 'custom', 'user', auth.uid(), p->'conditions', case when p->>'logic'='OR' then 'OR' else 'AND' end, false)
  returning id into v_id;
  perform audit('scanner.saved','scanner',v_id::text,null,p);
  return v_id;
end $$;

create or replace function delete_scanner(p_id int) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from scanners where id = p_id and owner_id = auth.uid() and kind='user';
  if not found then raise exception 'NOT_FOUND'; end if;
end $$;

-- Admin: market matrix updates
create or replace function update_market_stage(p_id int, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v_old market_access_matrix;
begin
  if current_app_role() not in ('compliance','admin','super_admin') then raise exception 'FORBIDDEN'; end if;
  select * into v_old from market_access_matrix where id = p_id;
  if coalesce((p->>'trading_enabled')::boolean,false) and coalesce(p->>'stage', v_old.stage) <> 'sandbox_live' then
    raise exception 'TRADING_ENABLE_GATE: only sandbox_live markets may be enabled; production markets require the regulatory approval workflow';
  end if;
  update market_access_matrix set stage = coalesce(p->>'stage', stage), regulatory_notes = coalesce(p->>'regulatory_notes', regulatory_notes),
    data_feed = coalesce(p->>'data_feed', data_feed), client_eligibility = coalesce(p->>'client_eligibility', client_eligibility), updated_at = now() where id = p_id;
  perform audit('markets.stage.updated','market_access_matrix',p_id::text,to_jsonb(v_old),p);
end $$;

alter table market_access_matrix enable row level security;
alter table instrument_metrics enable row level security;
alter table scanners enable row level security;
alter table scanner_results enable row level security;
create policy "public read market matrix" on market_access_matrix for select using (true);
create policy "public read metrics" on instrument_metrics for select using (true);
create policy "scanners public or own" on scanners for select using (kind='system' or owner_id = auth.uid() or is_staff());
create policy "results visible" on scanner_results for select using (scanner_id in (select id from scanners where kind='system' or owner_id = auth.uid() or is_staff()));
revoke insert, update, delete on market_access_matrix, instrument_metrics, scanners, scanner_results from anon, authenticated;
revoke execute on function eval_condition(instrument_metrics, jsonb) from public, anon;
revoke execute on function save_scanner(jsonb) from public, anon;
revoke execute on function delete_scanner(int) from public, anon;
revoke execute on function update_market_stage(int, jsonb) from public, anon;

select cron.schedule('airavat-scanners', '*/5 * * * *', $$select public.run_scanners()$$);
