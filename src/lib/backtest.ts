// AIRAVAT Strategy DNA — deterministic, event-driven daily backtest engine (long-only, one position per symbol).
// No look-ahead: signals are computed on the close of day t and executed at the open of day t+1.
// Costs use the sandbox charge schedule. All results are hypothetical and run on SIMULATED candles.

import { brokerageBreakdown } from "./calculators";

export const ENGINE_VERSION = "dna-bt-1.0.0";

export type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };
export type StrategyType = "ema_cross" | "breakout" | "rsi_reversion";
export type Rules = {
  type: StrategyType;
  fast?: number; slow?: number;        // ema_cross
  lookback?: number;                   // breakout
  rsi_period?: number; rsi_buy?: number; rsi_sell?: number; // rsi_reversion
  stop_pct?: number | null;            // protective stop from entry, e.g. 5
  target_pct?: number | null;          // take profit from entry
  max_hold_days?: number | null;
  sizing_pct?: number;                 // % of capital allocated per symbol (equal weight across universe)
};
export type CostModel = { brokerage_product: "CNC"; slippage_bps: number; multiplier: number };
export type Trade = { symbol: string; entryTime: number; exitTime: number; entry: number; exit: number; qty: number; pnl: number; costs: number; holdDays: number; reason: string };
export type Metrics = {
  total_return_pct: number; cagr_pct: number; max_drawdown_pct: number; sharpe: number; sortino: number;
  win_rate_pct: number; profit_factor: number; trades: number; avg_hold_days: number; exposure_pct: number;
  volatility_pct: number; final_equity: number; start_equity: number; days: number;
};
export type BacktestResult = {
  engine_version: string; metrics: Metrics; trades: Trade[]; equity: { time: number; value: number }[];
  daily_returns: number[]; benchmark_returns: number[]; params: Rules; cost_model: CostModel;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1); const out: number[] = []; let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (prev === null) { if (i >= period - 1) { prev = values.slice(0, period).reduce((s, x) => s + x, 0) / period; out.push(prev); } else out.push(NaN); }
    else { prev = v * k + prev * (1 - k); out.push(prev); }
  }
  return out;
}

export function rsi(values: number[], period = 14): number[] {
  const out: number[] = new Array(values.length).fill(NaN);
  let gain = 0, loss = 0;
  for (let i = 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    if (i <= period) { gain += Math.max(d, 0); loss += Math.max(-d, 0); if (i === period) { const ag = gain / period, al = loss / period; out[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al); gain = ag; loss = al; } continue; }
    gain = (gain * (period - 1) + Math.max(d, 0)) / period; loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}

/** Returns +1 for enter-long signal, -1 for exit signal, 0 for none, evaluated at close of index i. */
function signalAt(rules: Rules, closes: number[], highs: number[], lows: number[], i: number, ind: { f?: number[]; s?: number[]; r?: number[] }): 1 | -1 | 0 {
  if (rules.type === "ema_cross") {
    const f = ind.f!, s = ind.s!;
    if (i < 1 || isNaN(f[i]) || isNaN(s[i]) || isNaN(f[i - 1]) || isNaN(s[i - 1])) return 0;
    if (f[i - 1] <= s[i - 1] && f[i] > s[i]) return 1;
    if (f[i - 1] >= s[i - 1] && f[i] < s[i]) return -1;
    return 0;
  }
  if (rules.type === "breakout") {
    const lb = rules.lookback ?? 20; if (i < lb) return 0;
    const priorHigh = Math.max(...highs.slice(i - lb, i)); const priorLow = Math.min(...lows.slice(i - Math.ceil(lb / 2), i));
    if (closes[i] > priorHigh) return 1; if (closes[i] < priorLow) return -1; return 0;
  }
  const r = ind.r!; if (isNaN(r[i])) return 0;
  if (r[i] < (rules.rsi_buy ?? 30)) return 1; if (r[i] > (rules.rsi_sell ?? 60)) return -1; return 0;
}

export function runBacktest(universe: { symbol: string; candles: Candle[] }[], rules: Rules, startEquity = 1_000_000, cost: CostModel = { brokerage_product: "CNC", slippage_bps: 5, multiplier: 1 }): BacktestResult {
  const symbols = universe.filter((u) => u.candles.length > 30);
  const times = Array.from(new Set(symbols.flatMap((u) => u.candles.map((c) => c.time)))).sort((a, b) => a - b);
  if (symbols.length === 0 || times.length < 2) {
    return { engine_version: ENGINE_VERSION, metrics: emptyMetrics(startEquity), trades: [], equity: [], daily_returns: [], benchmark_returns: [], params: rules, cost_model: cost };
  }
  const alloc = (startEquity * ((rules.sizing_pct ?? 100) / 100)) / symbols.length;
  let cash = startEquity;
  const trades: Trade[] = [];
  const equity: { time: number; value: number }[] = [];
  const bench: number[] = [];
  const state = symbols.map((u) => {
    const closes = u.candles.map((c) => c.close), highs = u.candles.map((c) => c.high), lows = u.candles.map((c) => c.low);
    const ind: { f?: number[]; s?: number[]; r?: number[] } = {};
    if (rules.type === "ema_cross") { ind.f = ema(closes, rules.fast ?? 20); ind.s = ema(closes, rules.slow ?? 50); }
    if (rules.type === "rsi_reversion") ind.r = rsi(closes, rules.rsi_period ?? 14);
    const byTime = new Map(u.candles.map((c, i) => [c.time, i]));
    return { u, closes, highs, lows, ind, byTime, pos: null as null | { qty: number; entry: number; entryTime: number; days: number }, pending: 0 as 1 | -1 | 0, pendingReason: "" };
  });
  const slip = (p: number, side: 1 | -1) => p * (1 + (side * cost.slippage_bps) / 10000);
  const charge = (value: number, side: "BUY" | "SELL") => r2(brokerageBreakdown(cost.brokerage_product, side, value).total * cost.multiplier);
  let daysInMarket = 0;
  let prevBenchLevel: number | null = null;
  for (const t of times) {
    // 1) execute pending signals at today's open
    for (const s of state) {
      const i = s.byTime.get(t); if (i === undefined) continue;
      const open = s.u.candles[i].open;
      if (s.pending === 1 && !s.pos) {
        const px = slip(open, 1); const qty = Math.floor((alloc * 0.995) / px); // reserve ~0.5% for charges
        if (qty > 0) { const value = qty * px; const c = charge(value, "BUY"); if (cash >= value + c) { cash -= value + c; s.pos = { qty, entry: px, entryTime: t, days: 0 }; s.pos.days = 0; (s as { lastCost?: number }).lastCost = c; } }
      } else if (s.pending === -1 && s.pos) {
        closePosition(s, slip(open, -1), t, s.pendingReason || "signal");
      }
      s.pending = 0; s.pendingReason = "";
    }
    // 2) evaluate close-of-day rules, stops, targets, holds -> pending for tomorrow (stops/targets executed at next open too: no intrabar fill assumption)
    let mv = 0; let anyPos = false; let benchLevel = 0;
    for (const s of state) {
      const i = s.byTime.get(t); if (i === undefined) continue;
      const close = s.closes[i]; benchLevel += close / s.closes[0];
      if (s.pos) {
        s.pos.days += 1; mv += s.pos.qty * close; anyPos = true;
        const ret = (close / s.pos.entry - 1) * 100;
        if (rules.stop_pct && ret <= -rules.stop_pct) { s.pending = -1; s.pendingReason = "stop"; }
        else if (rules.target_pct && ret >= rules.target_pct) { s.pending = -1; s.pendingReason = "target"; }
        else if (rules.max_hold_days && s.pos.days >= rules.max_hold_days) { s.pending = -1; s.pendingReason = "max_hold"; }
        else if (signalAt(rules, s.closes, s.highs, s.lows, i, s.ind) === -1) { s.pending = -1; s.pendingReason = "signal"; }
      } else if (signalAt(rules, s.closes, s.highs, s.lows, i, s.ind) === 1) s.pending = 1;
    }
    if (anyPos) daysInMarket++;
    equity.push({ time: t, value: r2(cash + mv) });
    const bl = benchLevel / symbols.length; bench.push(prevBenchLevel ? bl / prevBenchLevel - 1 : 0); prevBenchLevel = bl;
  }
  // close any open positions at last close
  const lastT = times[times.length - 1];
  for (const s of state) if (s.pos) { const i = s.byTime.get(lastT) ?? s.closes.length - 1; closePosition(s, s.closes[i], lastT, "end"); }
  equity[equity.length - 1] = { time: lastT, value: r2(cash) };

  function closePosition(s: (typeof state)[number], px: number, t: number, reason: string) {
    const p = s.pos!; const value = p.qty * px; const c = charge(value, "SELL"); const entryCost = (s as { lastCost?: number }).lastCost ?? 0;
    cash += value - c;
    trades.push({ symbol: s.u.symbol, entryTime: p.entryTime, exitTime: t, entry: r2(p.entry), exit: r2(px), qty: p.qty, pnl: r2((px - p.entry) * p.qty - c - entryCost), costs: r2(c + entryCost), holdDays: p.days, reason });
    s.pos = null;
  }

  const daily: number[] = equity.map((e, i) => (i === 0 ? 0 : e.value / equity[i - 1].value - 1));
  const metrics = computeMetrics(equity, daily, trades, startEquity, daysInMarket);
  return { engine_version: ENGINE_VERSION, metrics, trades, equity, daily_returns: daily, benchmark_returns: bench, params: rules, cost_model: cost };
}

function emptyMetrics(start: number): Metrics {
  return { total_return_pct: 0, cagr_pct: 0, max_drawdown_pct: 0, sharpe: 0, sortino: 0, win_rate_pct: 0, profit_factor: 0, trades: 0, avg_hold_days: 0, exposure_pct: 0, volatility_pct: 0, final_equity: start, start_equity: start, days: 0 };
}

export function computeMetrics(equity: { value: number }[], daily: number[], trades: Trade[], start: number, daysInMarket: number): Metrics {
  if (equity.length === 0) return emptyMetrics(start);
  const final = equity[equity.length - 1].value; const days = equity.length;
  const years = days / 252;
  const total = final / start - 1;
  const cagr = years > 0 ? Math.pow(final / start, 1 / years) - 1 : 0;
  let peak = -Infinity, mdd = 0;
  for (const e of equity) { peak = Math.max(peak, e.value); mdd = Math.min(mdd, e.value / peak - 1); }
  const mean = daily.reduce((s, x) => s + x, 0) / daily.length;
  const sd = Math.sqrt(daily.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(daily.length - 1, 1));
  const dsd = Math.sqrt(daily.filter((x) => x < 0).reduce((s, x) => s + x * x, 0) / Math.max(daily.length - 1, 1));
  const wins = trades.filter((t) => t.pnl > 0), losses = trades.filter((t) => t.pnl <= 0);
  const gp = wins.reduce((s, t) => s + t.pnl, 0), gl = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  return {
    total_return_pct: r2(total * 100), cagr_pct: r2(cagr * 100), max_drawdown_pct: r2(mdd * 100),
    sharpe: sd > 0 ? r2((mean / sd) * Math.sqrt(252)) : 0, sortino: dsd > 0 ? r2((mean / dsd) * Math.sqrt(252)) : 0,
    win_rate_pct: trades.length ? r2((wins.length / trades.length) * 100) : 0, profit_factor: gl > 0 ? r2(gp / gl) : gp > 0 ? 99 : 0,
    trades: trades.length, avg_hold_days: trades.length ? r2(trades.reduce((s, t) => s + t.holdDays, 0) / trades.length) : 0,
    exposure_pct: r2((daysInMarket / days) * 100), volatility_pct: r2(sd * Math.sqrt(252) * 100), final_equity: r2(final), start_equity: start, days,
  };
}

export function correlation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length); if (n < 3) return 0;
  const ma = a.slice(0, n).reduce((s, x) => s + x, 0) / n, mb = b.slice(0, n).reduce((s, x) => s + x, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return da && db ? r2(num / Math.sqrt(da * db)) : 0;
}

/** Strategy DNA fingerprint: measured characteristics, each explained. */
export function fingerprint(res: BacktestResult, universe: { symbol: string; candles: Candle[] }[], rules: Rules): Record<string, { value: number; explain: string }> {
  const bh = correlation(res.daily_returns, res.benchmark_returns);
  const absR = res.daily_returns.map(Math.abs); const rollVol: number[] = res.daily_returns.map((_, i) => { const w = res.daily_returns.slice(Math.max(0, i - 10), i + 1); const m = w.reduce((s, x) => s + x, 0) / w.length; return Math.sqrt(w.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(w.length - 1, 1)); });
  const volSens = correlation(absR, rollVol);
  const up = res.daily_returns.filter((_, i) => res.benchmark_returns[i] > 0), down = res.daily_returns.filter((_, i) => res.benchmark_returns[i] < 0);
  const avg = (x: number[]) => (x.length ? x.reduce((s, v) => s + v, 0) / x.length : 0);
  const costly = runBacktest(universe, rules, res.metrics.start_equity, { ...res.cost_model, multiplier: res.cost_model.multiplier * 2 });
  return {
    trend_dependence: { value: bh, explain: "Correlation of strategy daily returns with equal-weight buy-and-hold of the universe (1 = moves with the market)." },
    volatility_sensitivity: { value: volSens, explain: "Correlation between the size of daily moves and 10-day rolling volatility (higher = performance swings more in volatile regimes)." },
    up_regime_edge_bps: { value: r2(avg(up) * 10000), explain: "Average daily return (bps) on days the universe rose." },
    down_regime_edge_bps: { value: r2(avg(down) * 10000), explain: "Average daily return (bps) on days the universe fell." },
    exposure_pct: { value: res.metrics.exposure_pct, explain: "Share of sessions with at least one open position." },
    turnover_trades_per_year: { value: res.metrics.days ? r2((res.metrics.trades / res.metrics.days) * 252) : 0, explain: "Annualised number of round trips." },
    cost_sensitivity_pct: { value: r2(res.metrics.total_return_pct - costly.metrics.total_return_pct), explain: "Return given up when all costs double (higher = fragile to slippage and charges)." },
    tail_risk_pct: { value: r2(Math.min(...res.daily_returns, 0) * 100), explain: "Worst single-day return." },
    max_drawdown_pct: { value: res.metrics.max_drawdown_pct, explain: "Largest peak-to-trough decline in equity." },
  };
}

/** Parameter perturbation (±20%) and cost stress; reports metric spread. */
export function robustness(universe: { symbol: string; candles: Candle[] }[], rules: Rules, start: number, cost: CostModel) {
  const variants: { label: string; rules: Rules; cost?: CostModel }[] = [];
  const perturb = (k: keyof Rules, base: number | undefined) => { if (!base) return; variants.push({ label: `${k} -20%`, rules: { ...rules, [k]: Math.max(2, Math.round(base * 0.8)) } }); variants.push({ label: `${k} +20%`, rules: { ...rules, [k]: Math.round(base * 1.2) } }); };
  if (rules.type === "ema_cross") { perturb("fast", rules.fast ?? 20); perturb("slow", rules.slow ?? 50); }
  if (rules.type === "breakout") perturb("lookback", rules.lookback ?? 20);
  if (rules.type === "rsi_reversion") { perturb("rsi_buy", rules.rsi_buy ?? 30); perturb("rsi_sell", rules.rsi_sell ?? 60); }
  variants.push({ label: "costs x2", rules, cost: { ...cost, multiplier: cost.multiplier * 2 } });
  variants.push({ label: "slippage 25bps", rules, cost: { ...cost, slippage_bps: 25 } });
  const runs = variants.map((v) => { const r = runBacktest(universe, v.rules, start, v.cost ?? cost); return { label: v.label, total_return_pct: r.metrics.total_return_pct, max_drawdown_pct: r.metrics.max_drawdown_pct, trades: r.metrics.trades, sharpe: r.metrics.sharpe }; });
  const rets = runs.map((r) => r.total_return_pct);
  const mean = rets.reduce((s, x) => s + x, 0) / Math.max(rets.length, 1);
  const spread = Math.sqrt(rets.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(rets.length - 1, 1));
  return { runs, return_spread_pct: r2(spread), all_positive: rets.every((x) => x > 0), note: "Parameter perturbation ±20% and cost stress on SIMULATED data. Large spread suggests overfitting." };
}
