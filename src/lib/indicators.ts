// Chart transforms and technical indicators. Pure functions, unit-tested. Input candles are ascending by time (unix seconds).
export type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Aggregate minute candles into N-minute or daily bars (bucket by floor(time / seconds)). */
export function aggregate(candles: Candle[], seconds: number): Candle[] {
  const out: Candle[] = [];
  for (const c of candles) {
    const t = Math.floor(c.time / seconds) * seconds; const last = out[out.length - 1];
    if (last && last.time === t) { last.high = Math.max(last.high, c.high); last.low = Math.min(last.low, c.low); last.close = c.close; last.volume += c.volume; }
    else out.push({ time: t, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume });
  }
  return out;
}
export function heikinAshi(candles: Candle[]): Candle[] {
  const out: Candle[] = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]; const close = (c.open + c.high + c.low + c.close) / 4;
    const open = i === 0 ? (c.open + c.close) / 2 : (out[i - 1].open + out[i - 1].close) / 2;
    out.push({ time: c.time, open: r2(open), close: r2(close), high: r2(Math.max(c.high, open, close)), low: r2(Math.min(c.low, open, close)), volume: c.volume });
  }
  return out;
}
/** Renko bricks from closes with a fixed brick size; brick time = time of the close that completed it. */
export function renko(candles: Candle[], brick: number): Candle[] {
  if (!candles.length || brick <= 0) return [];
  const out: Candle[] = []; let base = Math.floor(candles[0].close / brick) * brick;
  for (const c of candles) {
    while (c.close >= base + brick) { out.push({ time: c.time + out.length, open: base, close: base + brick, high: base + brick, low: base, volume: c.volume }); base += brick; }
    while (c.close <= base - brick) { out.push({ time: c.time + out.length, open: base, close: base - brick, high: base, low: base - brick, volume: c.volume }); base -= brick; }
  }
  // ensure strictly increasing times for the chart library
  for (let i = 1; i < out.length; i++) if (out[i].time <= out[i - 1].time) out[i].time = out[i - 1].time + 1;
  return out;
}
export function sma(values: number[], n: number): (number | null)[] { return values.map((_, i) => (i + 1 < n ? null : r2(values.slice(i + 1 - n, i + 1).reduce((s, v) => s + v, 0) / n))); }
export function ema(values: number[], n: number): (number | null)[] { const k = 2 / (n + 1); let e: number | null = null; return values.map((v, i) => { if (i + 1 < n) return null; if (e === null) e = values.slice(0, n).reduce((s, x) => s + x, 0) / n; else e = v * k + e * (1 - k); return r2(e); }); }
export function wma(values: number[], n: number): (number | null)[] { const w = n * (n + 1) / 2; return values.map((_, i) => (i + 1 < n ? null : r2(values.slice(i + 1 - n, i + 1).reduce((s, v, j) => s + v * (j + 1), 0) / w))); }
export function bollinger(values: number[], n = 20, k = 2) { const m = sma(values, n); return values.map((_, i) => { if (m[i] === null) return null; const win = values.slice(i + 1 - n, i + 1); const sd = Math.sqrt(win.reduce((s, v) => s + (v - m[i]!) ** 2, 0) / n); return { mid: m[i]!, upper: r2(m[i]! + k * sd), lower: r2(m[i]! - k * sd) }; }); }
export function rsi(values: number[], n = 14): (number | null)[] {
  const out: (number | null)[] = []; let ag = 0, al = 0;
  for (let i = 0; i < values.length; i++) {
    if (i === 0) { out.push(null); continue; }
    const d = values[i] - values[i - 1]; const g = Math.max(d, 0), l = Math.max(-d, 0);
    if (i <= n) { ag += g / n; al += l / n; out.push(i < n ? null : r2(al === 0 ? 100 : 100 - 100 / (1 + ag / al))); }
    else { ag = (ag * (n - 1) + g) / n; al = (al * (n - 1) + l) / n; out.push(r2(al === 0 ? 100 : 100 - 100 / (1 + ag / al))); }
  }
  return out;
}
export function macd(values: number[], fast = 12, slow = 26, signal = 9) {
  const f = ema(values, fast), s = ema(values, slow);
  const line = values.map((_, i) => (f[i] === null || s[i] === null ? null : r2(f[i]! - s[i]!)));
  const valid = line.map((v) => v ?? 0); const sig = ema(valid, signal);
  return line.map((v, i) => (v === null || sig[i] === null ? null : { macd: v, signal: sig[i]!, hist: r2(v - sig[i]!) }));
}
export function atr(candles: Candle[], n = 14): (number | null)[] {
  const tr = candles.map((c, i) => (i === 0 ? c.high - c.low : Math.max(c.high - c.low, Math.abs(c.high - candles[i - 1].close), Math.abs(c.low - candles[i - 1].close))));
  return sma(tr, n);
}
export function supertrend(candles: Candle[], n = 10, mult = 3): ({ value: number; up: boolean } | null)[] {
  const a = atr(candles, n); const out: ({ value: number; up: boolean } | null)[] = []; let fu = 0, fl = 0, up = true;
  for (let i = 0; i < candles.length; i++) {
    if (a[i] === null) { out.push(null); continue; }
    const hl2 = (candles[i].high + candles[i].low) / 2; let bu = hl2 + mult * a[i]!, bl = hl2 - mult * a[i]!;
    const prev = out[i - 1]; const pc = candles[i - 1]?.close ?? candles[i].close;
    if (prev) { bl = bl > fl || pc < fl ? bl : fl; bu = bu < fu || pc > fu ? bu : fu; }
    fu = bu; fl = bl;
    if (prev) up = prev.up ? candles[i].close > fl : candles[i].close > fu; else up = candles[i].close > fu;
    out.push({ value: r2(up ? fl : fu), up });
  }
  return out;
}
/** Session VWAP (resets each day) and anchored VWAP (from index). */
export function vwap(candles: Candle[], anchorIndex = 0, resetDaily = true): (number | null)[] {
  let pv = 0, v = 0, day = -1; return candles.map((c, i) => { const d = Math.floor(c.time / 86400); if (i < anchorIndex) return null; if (resetDaily && d !== day) { pv = 0; v = 0; day = d; } const tp = (c.high + c.low + c.close) / 3; pv += tp * c.volume; v += c.volume; return v ? r2(pv / v) : null; });
}
/** Volume profile: volume by price bucket over the window; returns buckets sorted by price with the point of control flagged. */
export function volumeProfile(candles: Candle[], buckets = 24) {
  if (!candles.length) return [];
  const lo = Math.min(...candles.map((c) => c.low)), hi = Math.max(...candles.map((c) => c.high)); const step = (hi - lo) / buckets || 1;
  const vol = new Array(buckets).fill(0);
  for (const c of candles) { const b = Math.min(buckets - 1, Math.max(0, Math.floor(((c.high + c.low) / 2 - lo) / step))); vol[b] += c.volume; }
  const max = Math.max(...vol);
  return vol.map((v, i) => ({ price: r2(lo + i * step), volume: v, pct: max ? v / max : 0, poc: v === max }));
}
export function fibonacciLevels(high: number, low: number) { const d = high - low; return [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1].map((r) => ({ ratio: r, price: r2(high - d * r) })); }
export function fibonacciExtensions(high: number, low: number) { const d = high - low; return [1.272, 1.618, 2, 2.618].map((r) => ({ ratio: r, price: r2(low + d * r) })); }

/** Minimal custom-indicator expression evaluator: supports close/open/high/low/volume arrays, sma(x,n), ema(x,n), +,-,*,/ and numbers. Sandboxed (no eval). */
export function evaluateCustom(expr: string, candles: Candle[]): (number | null)[] {
  const tokens = expr.replace(/\s+/g, "").match(/[a-z]+|\d+(\.\d+)?|[()+\-*/,]/g) ?? [];
  let i = 0;
  const series = (name: string): (number | null)[] => candles.map((c) => (c as unknown as Record<string, number>)[name] ?? null);
  const binop = (a: (number | null)[], b: (number | null)[], f: (x: number, y: number) => number) => a.map((x, k) => (x === null || b[k] === null ? null : r2(f(x, b[k]!))));
  const num = (v: number) => candles.map(() => v);
  function parseExpr(): (number | null)[] { let left = parseTerm(); while (tokens[i] === "+" || tokens[i] === "-") { const op = tokens[i++]; const right = parseTerm(); left = binop(left, right, op === "+" ? (x, y) => x + y : (x, y) => x - y); } return left; }
  function parseTerm(): (number | null)[] { let left = parseFactor(); while (tokens[i] === "*" || tokens[i] === "/") { const op = tokens[i++]; const right = parseFactor(); left = binop(left, right, op === "*" ? (x, y) => x * y : (x, y) => (y === 0 ? 0 : x / y)); } return left; }
  function parseFactor(): (number | null)[] {
    const t = tokens[i++];
    if (t === "(") { const v = parseExpr(); if (tokens[i++] !== ")") throw new Error("expected )"); return v; }
    if (t === undefined) throw new Error("unexpected end");
    if (/^\d/.test(t)) return num(Number(t));
    if (["open", "high", "low", "close", "volume"].includes(t)) return series(t);
    if (t === "sma" || t === "ema" || t === "rsi") {
      if (tokens[i++] !== "(") throw new Error("expected ("); const arg = parseExpr(); if (tokens[i++] !== ",") throw new Error("expected ,"); const n = Number(tokens[i++]); if (tokens[i++] !== ")") throw new Error("expected )");
      const vals = arg.map((v) => v ?? 0); return t === "sma" ? sma(vals, n) : t === "ema" ? ema(vals, n) : rsi(vals, n);
    }
    throw new Error(`unknown token ${t}`);
  }
  const out = parseExpr(); if (i !== tokens.length) throw new Error("unexpected trailing tokens"); return out;
}
