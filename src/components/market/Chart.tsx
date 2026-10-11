"use client";
import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries, HistogramSeries, ColorType, type IChartApi, type UTCTimestamp } from "lightweight-charts";

export type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };

export default function Chart({ candles, height = 380 }: { candles: Candle[]; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const css = getComputedStyle(document.documentElement);
    const v = (n: string) => css.getPropertyValue(n).trim();
    const chart: IChartApi = createChart(ref.current, {
      height,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: v("--text-muted"), fontFamily: "Inter, system-ui" },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      rightPriceScale: { borderColor: v("--border") },
      timeScale: { borderColor: v("--border"), timeVisible: candles.length > 0 && candles[1] && candles[1].time - candles[0].time < 86400 },
      crosshair: { mode: 0 },
      localization: { priceFormatter: (p: number) => p.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 }) },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: v("--buy"), downColor: v("--sell"), wickUpColor: v("--buy"), wickDownColor: v("--sell"), borderVisible: false,
    });
    series.setData(candles.map((c) => ({ ...c, time: c.time as UTCTimestamp })));
    const vol = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "vol" });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    vol.setData(candles.map((c) => ({ time: c.time as UTCTimestamp, value: c.volume, color: c.close >= c.open ? "rgba(34,195,138,0.35)" : "rgba(255,95,109,0.35)" })));
    chart.timeScale().fitContent();
    const ro = new ResizeObserver(() => chart.applyOptions({ width: ref.current?.clientWidth ?? 600 }));
    ro.observe(ref.current);
    return () => { ro.disconnect(); chart.remove(); };
  }, [candles, height]);
  return <div ref={ref} className="w-full" role="img" aria-label="Price chart (simulated data)" />;
}
