-- 0030: screener metrics in SQL (one call for the whole equity universe): valuation from the simulated fundamentals,
-- technicals from daily candles (SMA 50/200, 14-day RSI simple form, 52-week range, volume ratio), dividend yield.
create or replace function screener_metrics() returns jsonb
language sql stable security definer set search_path = public as $$
  with eq as (
    select i.id, i.symbol, i.name, i.sector, q.ltp, q.prev_close, q.volume
    from instruments i join quotes q on q.instrument_id = i.id where i.segment = 'EQ'
  ), f26 as (
    select * from instrument_fundamentals where fy = 'FY2026'
  ), f23 as (
    select instrument_id, net_profit_cr from instrument_fundamentals where fy = 'FY2023'
  ), c as (
    select instrument_id, ts, c, h, l, v,
           avg(c) over (partition by instrument_id order by ts rows between 49 preceding and current row) sma50,
           avg(c) over (partition by instrument_id order by ts rows between 199 preceding and current row) sma200,
           c - lag(c) over (partition by instrument_id order by ts) d,
           avg(v) over (partition by instrument_id order by ts rows between 19 preceding and current row) avgv20,
           row_number() over (partition by instrument_id order by ts desc) rn
    from candles where timeframe = '1d' and ts > now() - interval '400 days'
  ), rsi as (
    select instrument_id,
           avg(case when d > 0 then d else 0 end) ag, avg(case when d < 0 then -d else 0 end) al
    from c where rn <= 14 group by instrument_id
  ), rng as (
    select instrument_id, max(h) hi52, min(l) lo52 from c where ts > now() - interval '365 days' group by instrument_id
  ), last as (
    select * from c where rn = 1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id, 'symbol', e.symbol, 'name', e.name, 'sector', e.sector, 'ltp', e.ltp, 'chg_pct', round((e.ltp - e.prev_close) / nullif(e.prev_close,0) * 100, 2),
    'mcap_cr', round(e.ltp * f.shares_cr, 0), 'pe', case when f.eps > 0 then round(e.ltp / f.eps, 1) end, 'pb', case when f.book_value_ps > 0 then round(e.ltp / f.book_value_ps, 2) end,
    'roe', f.roe_pct, 'roce', f.roce_pct, 'de', f.debt_to_equity, 'promoter', f.promoter_holding_pct, 'div_yield', round(f.dividend_ps / nullif(e.ltp,0) * 100, 2),
    'profit_cagr_3y', case when f3.net_profit_cr > 0 then round((power(f.net_profit_cr / f3.net_profit_cr, 1.0/3) - 1) * 100, 1) end,
    'sma50', round(l.sma50, 2), 'sma200', round(l.sma200, 2), 'above_sma50', e.ltp > l.sma50, 'above_sma200', e.ltp > l.sma200,
    'rsi14', case when r.al = 0 then 100 when r.ag = 0 then 0 else round(100 - 100 / (1 + r.ag / r.al), 1) end,
    'hi52', g.hi52, 'lo52', g.lo52, 'pct_from_hi52', round((e.ltp - g.hi52) / nullif(g.hi52,0) * 100, 1), 'breakout_52w', e.ltp >= g.hi52 * 0.995,
    'vol_ratio', round(e.volume / nullif(l.avgv20,0), 2)
  ) order by e.symbol), '[]')
  from eq e left join f26 f on f.instrument_id = e.id left join f23 f3 on f3.instrument_id = e.id left join last l on l.instrument_id = e.id left join rsi r on r.instrument_id = e.id left join rng g on g.instrument_id = e.id
$$;
grant execute on function screener_metrics() to anon, authenticated;
create or replace function resolve_symbols(p_symbols text[]) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('symbol', i.symbol, 'name', i.name, 'sector', i.sector, 'segment', i.segment, 'ltp', q.ltp, 'prev_close', q.prev_close,
    'nifty50_weight', (select weight_pct from index_constituents c where c.instrument_id = i.id and c.index_symbol = 'NIFTY 50'))), '[]')
  from instruments i join quotes q on q.instrument_id = i.id where i.symbol = any(select upper(trim(x)) from unnest(p_symbols) x)
$$;
grant execute on function resolve_symbols(text[]) to anon, authenticated;
