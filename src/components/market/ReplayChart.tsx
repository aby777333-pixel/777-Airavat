"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createChart, CandlestickSeries, HistogramSeries, LineSeries, ColorType, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import type { Candle } from "./Chart";
import { ema } from "@/lib/backtest";

// Bar-by-bar replay: the future is hidden; step, play at speed, and see an EMA(20) and a running P&L of a hypothetical long entered at the replay start.
export default function ReplayChart({ candles, symbol }: { candles: Candle[]; symbol: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<{ c: ISeriesApi<"Candlestick">; v: ISeriesApi<"Histogram">; e: ISeriesApi<"Line"> } | null>(null);
  const [idx, setIdx] = useState(Math.min(40, candles.length));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(600);
  const [entryIdx, setEntryIdx] = useState<number | null>(null);
  const emaAll = useMemo(() => ema(candles.map((c) => c.close), 20), [candles]);

  useEffect(() => {
    if (!ref.current) return;
    const css = getComputedStyle(document.documentElement); const v = (n: string) => css.getPropertyValue(n).trim();
    const chart = createChart(ref.current, { height: 380, layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: v("--text-muted") }, grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } }, rightPriceScale: { borderColor: v("--border") }, timeScale: { borderColor: v("--border") } });
    const c = chart.addSeries(CandlestickSeries, { upColor: v("--buy"), downColor: v("--sell"), wickUpColor: v("--buy"), wickDownColor: v("--sell"), borderVisible: false });
    const vol = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "vol" }); chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    const e = chart.addSeries(LineSeries, { color: v("--accent"), lineWidth: 1 });
    chartRef.current = chart; seriesRef.current = { c, v: vol, e };
    const ro = new ResizeObserver(() => chart.applyOptions({ width: ref.current?.clientWidth ?? 600 })); ro.observe(ref.current);
    return () => { ro.disconnect(); chart.remove(); chartRef.current = null; seriesRef.current = null; };
  }, []);
  useEffect(() => {
    const s = seriesRef.current; if (!s) return;
    const slice = candles.slice(0, idx);
    s.c.setData(slice.map((x) => ({ ...x, time: x.time as UTCTimestamp })));
    s.v.setData(slice.map((x) => ({ time: x.time as UTCTimestamp, value: x.volume, color: x.close >= x.open ? "rgba(34,195,138,0.35)" : "rgba(255,95,109,0.35)" })));
    s.e.setData(slice.map((x, i) => ({ time: x.time as UTCTimestamp, value: emaAll[i] })).filter((p) => Number.isFinite(p.value)));
    chartRef.current?.timeScale().scrollToRealTime();
  }, [idx, candles, emaAll]);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setIdx((i) => { if (i >= candles.length) { setPlaying(false); return i; } return i + 1; }), speed);
    return () => clearInterval(t);
  }, [playing, speed, candles.length]);

  const cur = candles[idx - 1]; const entry = entryIdx !== null ? candles[entryIdx - 1] : null;
  const pnlPct = entry && cur ? ((cur.close - entry.close) / entry.close) * 100 : null;
  return (
    <div className="glass p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-display font-semibold">{symbol}</span><span className="badge badge-sim">replay · simulated</span>
        <span className="text-xs text-muted">bar {idx}/{candles.length}{cur ? ` · ${new Date(cur.time * 1000).toLocaleDateString("en-IN")} · close ${cur.close.toFixed(2)}` : ""}</span>
        <div className="ml-auto flex flex-wrap gap-1">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIdx((i) => Math.max(5, i - 1))}>◀</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setPlaying((p) => !p)}>{playing ? "Pause" : "Play"}</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIdx((i) => Math.min(candles.length, i + 1))}>▶</button>
          <select className="select w-auto" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}><option value={1200}>0.5×</option><option value={600}>1×</option><option value={250}>2×</option><option value={100}>5×</option></select>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setIdx(Math.min(40, candles.length)); setEntryIdx(null); setPlaying(false); }}>Reset</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEntryIdx(entryIdx === null ? idx : null)}>{entryIdx === null ? "Mark hypothetical entry" : "Clear entry"}</button>
        </div>
      </div>
      <div ref={ref} className="w-full" role="img" aria-label="Replay chart (simulated data)" />
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
        <input type="range" min={5} max={candles.length} value={idx} onChange={(e) => setIdx(Number(e.target.value))} className="w-full sm:w-1/2" aria-label="Replay position" />
        {pnlPct !== null && <span className={pnlPct >= 0 ? "text-profit" : "text-loss"}>Hypothetical long from bar {entryIdx}: {pnlPct.toFixed(2)}% (before charges)</span>}
        <span>Gold line: EMA(20). Future bars are hidden until you step forward.</span>
      </div>
    </div>
  );
}
