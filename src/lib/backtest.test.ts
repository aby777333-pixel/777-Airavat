import { describe, expect, it } from "vitest";
import { computeMetrics, correlation, ema, fingerprint, robustness, rsi, runBacktest, type Candle } from "./backtest";

function series(n: number, start: number, drift: number, wiggle: number): Candle[] {
  const out: Candle[] = []; let px = start;
  for (let i = 0; i < n; i++) {
    const open = px; const close = px * (1 + drift + wiggle * Math.sin(i / 3));
    out.push({ time: 1_700_000_000 + i * 86400, open, high: Math.max(open, close) * 1.004, low: Math.min(open, close) * 0.996, close, volume: 1000 });
    px = close;
  }
  return out;
}

describe("indicators", () => {
  it("ema seeds with SMA and tracks a constant series", () => {
    const e = ema([10, 10, 10, 10, 10, 10], 3);
    expect(isNaN(e[0])).toBe(true); expect(e[2]).toBe(10); expect(e[5]).toBeCloseTo(10, 6);
  });
  it("rsi is 100 on a monotonically rising series and near 0 on falling", () => {
    const up = rsi(Array.from({ length: 30 }, (_, i) => 100 + i), 14); expect(up[29]).toBe(100);
    const down = rsi(Array.from({ length: 30 }, (_, i) => 100 - i), 14); expect(down[29]).toBeLessThan(1);
  });
  it("correlation of identical series is 1", () => expect(correlation([1, 2, 3, 4], [2, 4, 6, 8])).toBe(1));
});

describe("backtest engine", () => {
  // dip for 50 sessions then a sustained rise so an EMA cross from below actually occurs
  const dip = series(50, 100, -0.004, 0.002);
  const rise = series(150, dip[dip.length - 1].close, 0.004, 0.002).map((c, i) => ({ ...c, time: dip[dip.length - 1].time + (i + 1) * 86400 }));
  const uptrend = [{ symbol: "UP", candles: [...dip, ...rise] }];
  it("ema cross on an uptrend makes money net of costs and executes at next open", () => {
    const r = runBacktest(uptrend, { type: "ema_cross", fast: 5, slow: 15 }, 100000);
    expect(r.metrics.trades).toBeGreaterThan(0);
    expect(r.metrics.total_return_pct).toBeGreaterThan(0);
    for (const t of r.trades) expect(t.exitTime).toBeGreaterThan(t.entryTime);
    // entry price must equal an open (with slippage), never a close of the signal day
    const first = r.trades[0]; const bar = uptrend[0].candles.find((c) => c.time === first.entryTime)!;
    expect(first.entry).toBeCloseTo(bar.open * 1.0005, 2);
  });
  it("doubling costs reduces net return", () => {
    const base = runBacktest(uptrend, { type: "ema_cross", fast: 5, slow: 15 }, 100000);
    const costly = runBacktest(uptrend, { type: "ema_cross", fast: 5, slow: 15 }, 100000, { brokerage_product: "CNC", slippage_bps: 5, multiplier: 3 });
    expect(costly.metrics.total_return_pct).toBeLessThan(base.metrics.total_return_pct);
  });
  it("stop loss exits a falling position", () => {
    const down = [{ symbol: "DN", candles: series(120, 100, -0.01, 0) }];
    const r = runBacktest(down, { type: "rsi_reversion", rsi_buy: 101, rsi_sell: 200, stop_pct: 3 }, 100000);
    expect(r.trades.length).toBeGreaterThan(0);
    expect(r.trades.some((t) => t.reason === "stop")).toBe(true);
  });
  it("max_hold_days caps holding period", () => {
    const r = runBacktest(uptrend, { type: "breakout", lookback: 10, max_hold_days: 5 }, 100000);
    for (const t of r.trades) expect(t.holdDays).toBeLessThanOrEqual(5);
  });
  it("returns empty metrics for insufficient data", () => {
    const r = runBacktest([{ symbol: "X", candles: series(5, 100, 0, 0) }], { type: "ema_cross" }, 50000);
    expect(r.metrics.trades).toBe(0); expect(r.metrics.final_equity).toBe(50000);
  });
  it("drawdown is computed from equity peaks", () => {
    const m = computeMetrics([{ value: 100 }, { value: 120 }, { value: 90 }, { value: 110 }], [0, 0.2, -0.25, 0.22], [], 100, 4);
    expect(m.max_drawdown_pct).toBe(-25);
    expect(m.total_return_pct).toBe(10);
  });
  it("fingerprint and robustness return explained measures", () => {
    const r = runBacktest(uptrend, { type: "ema_cross", fast: 5, slow: 15 }, 100000);
    const fp = fingerprint(r, uptrend, r.params);
    expect(fp.trend_dependence.value).toBeGreaterThan(-1.01); expect(fp.cost_sensitivity_pct.explain.length).toBeGreaterThan(10);
    const rb = robustness(uptrend, r.params, 100000, r.cost_model);
    expect(rb.runs.length).toBe(6); expect(typeof rb.return_spread_pct).toBe("number");
  });
});
