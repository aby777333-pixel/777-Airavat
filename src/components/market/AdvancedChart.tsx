"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { createChart, createSeriesMarkers, CandlestickSeries, BarSeries, LineSeries, AreaSeries, HistogramSeries, ColorType, type IChartApi, type ISeriesApi, type UTCTimestamp, type IPriceLine, type SeriesMarker, type Time } from "lightweight-charts";
import { aggregate, bollinger, ema, evaluateCustom, fibonacciLevels, heikinAshi, macd, renko, rsi, sma, supertrend, volumeProfile, vwap, type Candle } from "@/lib/indicators";

export type Marker = { time: number; side: "BUY" | "SELL"; qty: number; price: number };
type ChartType = "candle" | "bar" | "line" | "area" | "heikin" | "renko";
type Interval = "1m" | "5m" | "15m" | "30m" | "1h" | "1d" | "1w";
type Template = { type: ChartType; interval: Interval; inds: string[]; custom: string };
const INTERVALS: [Interval, number][] = [["1m", 60], ["5m", 300], ["15m", 900], ["30m", 1800], ["1h", 3600], ["1d", 86400], ["1w", 604800]];
const INDICATORS = ["SMA20", "SMA50", "EMA20", "EMA50", "Bollinger", "VWAP", "Supertrend", "RSI", "MACD", "VolumeProfile"];

// Advanced charting: chart types, intervals (aggregated from 1m / 1d), indicators, drawings (horizontal, trend, fib), volume profile,
// replay (hidden future), saved templates, trade annotations and click-to-prepare orders (dispatches airavat:prefill-price).
export default function AdvancedChart({ daily, intraday, symbol, markers = [], height = 420, compact = false }: { daily: Candle[]; intraday: Candle[]; symbol: string; markers?: Marker[]; height?: number; compact?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const rsiRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const linesRef = useRef<IPriceLine[]>([]);
  const mainRef = useRef<ISeriesApi<"Candlestick"> | ISeriesApi<"Bar"> | ISeriesApi<"Line"> | ISeriesApi<"Area"> | null>(null);
  const [type, setType] = useState<ChartType>("candle");
  const [interval, setInterval_] = useState<Interval>(intraday.length ? "5m" : "1d");
  const [inds, setInds] = useState<string[]>(["EMA20", "VWAP"]);
  const [custom, setCustom] = useState("");
  const [tool, setTool] = useState<"none" | "hline" | "trend" | "fib">("none");
  const [drawings, setDrawings] = useState<{ kind: string; p1: number; p2?: number; t1?: number; t2?: number }[]>([]);
  const [pending, setPending] = useState<{ p: number; t: number } | null>(null);
  const [replay, setReplay] = useState<number | null>(null);
  const [showAnn, setShowAnn] = useState(true);
  const [templates, setTemplates] = useState<Record<string, Template>>({});
  const [brick, setBrick] = useState(0);
  // Templates live in localStorage; they are read inside the effect's subscription callback (storage event + initial tick) rather than synchronously.
  useEffect(() => {
    const read = () => { try { setTemplates(JSON.parse(localStorage.getItem("airavat-chart-templates") || "{}")); } catch { /* ignore */ } };
    const id = window.setTimeout(read, 0); window.addEventListener("storage", read);
    return () => { window.clearTimeout(id); window.removeEventListener("storage", read); };
  }, []);

  const base = useMemo<Candle[]>(() => {
    const sec = INTERVALS.find((x) => x[0] === interval)![1];
    const src = sec >= 86400 ? daily : intraday.length ? intraday : daily;
    const agg = sec >= 86400 ? (sec === 86400 ? src : aggregate(src, sec)) : aggregate(src, sec);
    return replay !== null ? agg.slice(0, replay) : agg;
  }, [daily, intraday, interval, replay]);
  const shown = useMemo(() => (type === "heikin" ? heikinAshi(base) : type === "renko" ? renko(base, brick || Math.max(0.05, (base[base.length - 1]?.close ?? 100) * 0.005)) : base), [base, type, brick]);
  const customEval = useMemo<{ vals: (number | null)[] | null; err: string | null }>(() => { if (!custom.trim()) return { vals: null, err: null }; try { return { vals: evaluateCustom(custom, shown), err: null }; } catch (e) { return { vals: null, err: (e as Error).message }; } }, [custom, shown]);
  const customErr = customEval.err;
  const closes = useMemo(() => shown.map((c) => c.close), [shown]);
  const vp = useMemo(() => (inds.includes("VolumeProfile") ? volumeProfile(shown, 20) : []), [shown, inds]);

  useEffect(() => {
    if (!ref.current) return;
    const css = getComputedStyle(document.documentElement); const v = (n: string) => css.getPropertyValue(n).trim();
    const chart = createChart(ref.current, { height, layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: v("--text-muted"), fontFamily: "Inter, system-ui" }, grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } }, rightPriceScale: { borderColor: v("--border") }, timeScale: { borderColor: v("--border"), timeVisible: interval !== "1d" && interval !== "1w" }, crosshair: { mode: 0 }, localization: { priceFormatter: (p: number) => p.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 }) } });
    chartRef.current = chart;
    const data = shown.map((c) => ({ ...c, time: c.time as UTCTimestamp }));
    let main: typeof mainRef.current;
    if (type === "bar") main = chart.addSeries(BarSeries, { upColor: v("--buy"), downColor: v("--sell") });
    else if (type === "line") main = chart.addSeries(LineSeries, { color: v("--accent"), lineWidth: 2 });
    else if (type === "area") main = chart.addSeries(AreaSeries, { lineColor: v("--accent"), topColor: "rgba(212,180,106,0.3)", bottomColor: "rgba(212,180,106,0.02)" });
    else main = chart.addSeries(CandlestickSeries, { upColor: v("--buy"), downColor: v("--sell"), wickUpColor: v("--buy"), wickDownColor: v("--sell"), borderVisible: false });
    if (type === "line" || type === "area") (main as ISeriesApi<"Line">).setData(data.map((c) => ({ time: c.time, value: c.close }))); else (main as ISeriesApi<"Candlestick">).setData(data);
    mainRef.current = main;
    if (type !== "renko") { const vol = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "vol" }); chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } }); vol.setData(data.map((c) => ({ time: c.time, value: c.volume, color: c.close >= c.open ? "rgba(34,195,138,0.35)" : "rgba(255,95,109,0.35)" }))); }
    const addLine = (vals: (number | null)[], color: string, width: 1 | 2 = 1) => { const s = chart.addSeries(LineSeries, { color, lineWidth: width, priceLineVisible: false, lastValueVisible: false }); s.setData(vals.map((y, i) => (y === null ? null : { time: data[i].time, value: y })).filter((x): x is { time: UTCTimestamp; value: number } => !!x)); };
    if (inds.includes("SMA20")) addLine(sma(closes, 20), "#7cc4ff"); if (inds.includes("SMA50")) addLine(sma(closes, 50), "#c084fc");
    if (inds.includes("EMA20")) addLine(ema(closes, 20), v("--accent")); if (inds.includes("EMA50")) addLine(ema(closes, 50), "#fb923c");
    if (inds.includes("Bollinger")) { const b = bollinger(closes, 20); addLine(b.map((x) => x?.upper ?? null), "rgba(124,196,255,0.6)"); addLine(b.map((x) => x?.lower ?? null), "rgba(124,196,255,0.6)"); }
    if (inds.includes("VWAP")) addLine(vwap(shown), "#46c6cc", 2);
    if (inds.includes("Supertrend")) { const st = supertrend(shown); addLine(st.map((x) => (x && x.up ? x.value : null)), v("--profit"), 2); addLine(st.map((x) => (x && !x.up ? x.value : null)), v("--loss"), 2); }
    if (customEval.vals) addLine(customEval.vals, "#f472b6", 1);
    // drawings
    linesRef.current = [];
    for (const d of drawings) {
      if (d.kind === "hline") linesRef.current.push(main.createPriceLine({ price: d.p1, color: v("--warn"), lineWidth: 1, lineStyle: 2, title: "level" }));
      if (d.kind === "fib" && d.p2 !== undefined) for (const l of fibonacciLevels(Math.max(d.p1, d.p2), Math.min(d.p1, d.p2))) linesRef.current.push(main.createPriceLine({ price: l.price, color: "rgba(212,180,106,0.6)", lineWidth: 1, lineStyle: 3, title: `${(l.ratio * 100).toFixed(1)}%` }));
      if (d.kind === "trend" && d.p2 !== undefined && d.t1 && d.t2) { const s = chart.addSeries(LineSeries, { color: v("--warn"), lineWidth: 1, priceLineVisible: false, lastValueVisible: false }); const [a, b] = d.t1 < d.t2 ? [{ time: d.t1, value: d.p1 }, { time: d.t2, value: d.p2 }] : [{ time: d.t2, value: d.p2 }, { time: d.t1, value: d.p1 }]; s.setData([{ time: a.time as UTCTimestamp, value: a.value }, { time: b.time as UTCTimestamp, value: b.value }]); }
    }
    // trade annotations
    if (showAnn && markers.length) {
      const set = new Set(data.map((d) => d.time as number)); const sec = INTERVALS.find((x) => x[0] === interval)![1];
      const ms: SeriesMarker<Time>[] = markers.map((m) => ({ time: (Math.floor(m.time / sec) * sec) as UTCTimestamp, position: (m.side === "BUY" ? "belowBar" : "aboveBar") as "belowBar" | "aboveBar", color: m.side === "BUY" ? v("--buy") : v("--sell"), shape: (m.side === "BUY" ? "arrowUp" : "arrowDown") as "arrowUp" | "arrowDown", text: `${m.side} ${m.qty} @ ${m.price}` })).filter((m) => set.has(m.time as number)).sort((a, b) => (a.time as number) - (b.time as number));
      if (ms.length) createSeriesMarkers(main, ms);
    }
    // click: drawing tools and order prefill
    const onClick = (param: { point?: { x: number; y: number }; time?: Time }) => {
      if (!param.point || !mainRef.current) return; const price = mainRef.current.coordinateToPrice(param.point.y); if (price === null) return; const p = Math.round(Number(price) * 20) / 20; const t = typeof param.time === "number" ? param.time : 0;
      if (tool === "hline") setDrawings((d) => [...d, { kind: "hline", p1: p }]);
      else if (tool === "trend" || tool === "fib") { if (!pending) setPending({ p, t }); else { setDrawings((d) => [...d, { kind: tool, p1: pending.p, p2: p, t1: pending.t, t2: t }]); setPending(null); } }
      else window.dispatchEvent(new CustomEvent("airavat:prefill-price", { detail: { symbol, price: p } }));
    };
    chart.subscribeClick(onClick);
    chart.timeScale().fitContent();
    const ro = new ResizeObserver(() => chart.applyOptions({ width: ref.current?.clientWidth ?? 600 })); ro.observe(ref.current);
    // RSI / MACD pane
    let sub: IChartApi | null = null;
    if (rsiRef.current && (inds.includes("RSI") || inds.includes("MACD"))) {
      sub = createChart(rsiRef.current, { height: 110, layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: v("--text-muted") }, grid: { vertLines: { color: "rgba(255,255,255,0.03)" }, horzLines: { color: "rgba(255,255,255,0.03)" } }, rightPriceScale: { borderColor: v("--border") }, timeScale: { visible: false } });
      if (inds.includes("RSI")) { const s = sub.addSeries(LineSeries, { color: "#f472b6", lineWidth: 1 }); s.setData(rsi(closes, 14).map((y, i) => (y === null ? null : { time: data[i].time, value: y })).filter((x): x is { time: UTCTimestamp; value: number } => !!x)); s.createPriceLine({ price: 70, color: "rgba(255,95,109,0.5)", lineWidth: 1, lineStyle: 2 }); s.createPriceLine({ price: 30, color: "rgba(34,195,138,0.5)", lineWidth: 1, lineStyle: 2 }); }
      if (inds.includes("MACD")) { const m = macd(closes); const h = sub.addSeries(HistogramSeries, { priceScaleId: "macd" }); h.setData(m.map((x, i) => (x ? { time: data[i].time, value: x.hist, color: x.hist >= 0 ? "rgba(34,195,138,0.5)" : "rgba(255,95,109,0.5)" } : null)).filter((x): x is { time: UTCTimestamp; value: number; color: string } => !!x)); }
      sub.timeScale().fitContent();
      const sync = () => { const r = chart.timeScale().getVisibleLogicalRange(); if (r && sub) sub.timeScale().setVisibleLogicalRange(r); };
      chart.timeScale().subscribeVisibleLogicalRangeChange(sync); sync();
    }
    return () => { ro.disconnect(); chart.unsubscribeClick(onClick); chart.remove(); sub?.remove(); chartRef.current = null; mainRef.current = null; };
  }, [shown, closes, type, inds, custom, drawings, markers, showAnn, interval, height, symbol, tool, pending]);

  const saveTemplate = () => { const name = prompt("Template name"); if (!name) return; const t = { ...templates, [name]: { type, interval, inds, custom } }; setTemplates(t); try { localStorage.setItem("airavat-chart-templates", JSON.stringify(t)); } catch { /* ignore */ } };
  const loadTemplate = (name: string) => { const t = templates[name]; if (!t) return; setType(t.type); setInterval_(t.interval); setInds(t.inds); setCustom(t.custom); };
  const total = useMemo(() => { const sec = INTERVALS.find((x) => x[0] === interval)![1]; const src = sec >= 86400 ? daily : intraday.length ? intraday : daily; return (sec === 86400 ? src : aggregate(src, sec)).length; }, [daily, intraday, interval]);
  return (
    <div>
      <div className={clsx("mb-2 flex flex-wrap items-center gap-1 text-xs", compact && "gap-0.5")}>
        <select className="select w-auto !py-1 !text-xs" value={type} onChange={(e) => setType(e.target.value as ChartType)}><option value="candle">Candles</option><option value="bar">Bars</option><option value="line">Line</option><option value="area">Area</option><option value="heikin">Heikin-Ashi</option><option value="renko">Renko</option></select>
        {type === "renko" && <input className="input !w-24 !py-1 !text-xs" type="number" step="0.05" placeholder="brick" value={brick || ""} onChange={(e) => setBrick(Number(e.target.value))} />}
        {INTERVALS.map(([k]) => <button key={k} type="button" disabled={k !== "1d" && k !== "1w" && intraday.length === 0} className={clsx("btn btn-sm !px-2", interval === k ? "btn-primary" : "btn-ghost")} onClick={() => setInterval_(k)}>{k}</button>)}
        <span className="mx-1 text-faint">|</span>
        {INDICATORS.map((i) => <button key={i} type="button" className={clsx("btn btn-sm !px-2", inds.includes(i) ? "btn-primary" : "btn-ghost")} onClick={() => setInds((x) => (x.includes(i) ? x.filter((y) => y !== i) : [...x, i]))}>{i}</button>)}
        <span className="mx-1 text-faint">|</span>
        {(["none", "hline", "trend", "fib"] as const).map((t) => <button key={t} type="button" className={clsx("btn btn-sm !px-2", tool === t ? "btn-primary" : "btn-ghost")} onClick={() => { setTool(t); setPending(null); }}>{t === "none" ? "Order on click" : t === "hline" ? "H-line" : t === "trend" ? "Trend" : "Fib"}</button>)}
        {drawings.length > 0 && <button type="button" className="btn btn-ghost btn-sm !px-2" onClick={() => setDrawings([])}>Clear drawings</button>}
        <button type="button" className={clsx("btn btn-sm !px-2", showAnn ? "btn-primary" : "btn-ghost")} onClick={() => setShowAnn((s) => !s)}>Trades</button>
        <button type="button" className={clsx("btn btn-sm !px-2", replay !== null ? "btn-primary" : "btn-ghost")} onClick={() => setReplay(replay === null ? Math.max(10, Math.floor(total / 2)) : null)}>Replay</button>
        <button type="button" className="btn btn-ghost btn-sm !px-2" onClick={saveTemplate}>Save template</button>
        {Object.keys(templates).length > 0 && <select className="select w-auto !py-1 !text-xs" defaultValue="" onChange={(e) => loadTemplate(e.target.value)}><option value="">Load template…</option>{Object.keys(templates).map((n) => <option key={n}>{n}</option>)}</select>}
      </div>
      {replay !== null && <div className="mb-2 flex items-center gap-2 text-xs"><button type="button" className="btn btn-ghost btn-sm" onClick={() => setReplay((r) => Math.max(10, (r ?? 10) - 1))}>◀</button><input type="range" min={10} max={total} value={replay} onChange={(e) => setReplay(Number(e.target.value))} className="w-64" aria-label="Replay position" /><button type="button" className="btn btn-ghost btn-sm" onClick={() => setReplay((r) => Math.min(total, (r ?? 10) + 1))}>▶</button><span className="text-muted">bar {replay}/{total} · future hidden</span></div>}
      <div className="relative">
        <div ref={ref} className="w-full" role="img" aria-label={`${symbol} ${type} chart, ${interval} (simulated data)`} />
        {vp.length > 0 && <div className="pointer-events-none absolute inset-y-0 left-0 flex w-1/4 flex-col-reverse justify-start opacity-70">{vp.map((b) => <div key={b.price} className={clsx("h-[4%]", b.poc ? "bg-accent/60" : "bg-accent/25")} style={{ width: `${Math.max(2, b.pct * 100)}%` }} title={`${b.price}: ${b.volume}`} />)}</div>}
      </div>
      {(inds.includes("RSI") || inds.includes("MACD")) && <div ref={rsiRef} className="mt-1 w-full" />}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
        <input className="input !w-72 !py-1 !text-xs" placeholder="Custom indicator, e.g. sma(close,20)-ema(close,50)" value={custom} onChange={(e) => setCustom(e.target.value)} />
        {customErr && <span className="text-loss">{customErr}</span>}
        {pending && <span className="text-warn">Click a second point to finish the {tool}.</span>}
        <span className="ml-auto">Click on the chart with “Order on click” to prefill the ticket price. Simulated candles{intraday.length === 0 ? "; intraday bars appear once minute candles exist" : ""}.</span>
      </div>
    </div>
  );
}
