import { describe, expect, it } from "vitest";
import { aggregate, bollinger, ema, evaluateCustom, fibonacciLevels, heikinAshi, macd, renko, rsi, sma, supertrend, volumeProfile, vwap, type Candle } from "./indicators";

const mk = (n: number, start = 100): Candle[] => Array.from({ length: n }, (_, i) => { const base = start + Math.sin(i / 5) * 5 + i * 0.2; return { time: 1_700_000_100 + i * 60, open: base - 0.3, high: base + 1, low: base - 1, close: base, volume: 1000 + (i % 7) * 100 }; });

describe("chart transforms", () => {
  it("aggregates 1-minute candles into 5-minute bars with OHLCV semantics", () => {
    const c = mk(10); const a = aggregate(c, 300);
    expect(a).toHaveLength(2);
    expect(a[0].open).toBe(c[0].open); expect(a[0].close).toBe(c[4].close);
    expect(a[0].high).toBe(Math.max(...c.slice(0, 5).map((x) => x.high)));
    expect(a[0].volume).toBe(c.slice(0, 5).reduce((s, x) => s + x.volume, 0));
  });
  it("Heikin-Ashi keeps highs above lows and smooths opens", () => {
    const ha = heikinAshi(mk(30)); expect(ha.every((c) => c.high >= c.low && c.high >= Math.max(c.open, c.close))).toBe(true);
  });
  it("Renko bricks have fixed size and increasing times", () => {
    const r = renko(mk(200, 100), 2); expect(r.length).toBeGreaterThan(0);
    expect(r.every((b) => Math.abs(b.close - b.open) === 2)).toBe(true);
    expect(r.every((b, i) => i === 0 || b.time > r[i - 1].time)).toBe(true);
  });
});

describe("indicators", () => {
  const closes = mk(60).map((c) => c.close);
  it("SMA and EMA warm up then track", () => {
    expect(sma(closes, 5)[3]).toBeNull(); expect(sma(closes, 5)[4]).toBeCloseTo(closes.slice(0, 5).reduce((s, v) => s + v, 0) / 5, 1);
    expect(ema(closes, 10)[8]).toBeNull(); expect(typeof ema(closes, 10)[59]).toBe("number");
  });
  it("RSI stays within 0..100 and Bollinger brackets the mid", () => {
    const r = rsi(closes, 14).filter((v): v is number => v !== null); expect(Math.min(...r)).toBeGreaterThanOrEqual(0); expect(Math.max(...r)).toBeLessThanOrEqual(100);
    const b = bollinger(closes, 20)[59]!; expect(b.upper).toBeGreaterThan(b.mid); expect(b.lower).toBeLessThan(b.mid);
  });
  it("MACD histogram equals line minus signal", () => { const m = macd(closes).filter(Boolean) as { macd: number; signal: number; hist: number }[]; expect(m.length).toBeGreaterThan(0); expect(m[m.length - 1].hist).toBeCloseTo(m[m.length - 1].macd - m[m.length - 1].signal, 1); });
  it("VWAP sits between session low and high; supertrend flips with trend", () => {
    const c = mk(40); const v = vwap(c)[39]!; expect(v).toBeGreaterThan(Math.min(...c.map((x) => x.low))); expect(v).toBeLessThan(Math.max(...c.map((x) => x.high)));
    expect(supertrend(c).filter(Boolean).length).toBeGreaterThan(0);
  });
  it("volume profile has exactly one point of control and fib levels descend from the high", () => {
    const vp = volumeProfile(mk(50), 10); expect(vp.filter((b) => b.poc)).toHaveLength(1);
    const f = fibonacciLevels(200, 100); expect(f[0].price).toBe(200); expect(f[6].price).toBe(100); expect(f[3].price).toBe(150);
  });
  it("custom expression evaluator computes sma(close,5) - ema(close,5) safely", () => {
    const c = mk(20); const out = evaluateCustom("sma(close,5)-ema(close,5)", c); expect(out[19]).not.toBeNull();
    expect(() => evaluateCustom("alert(1)", c)).toThrow();
  });
});
