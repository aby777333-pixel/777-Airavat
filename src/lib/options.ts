// Options analytics: Black-Scholes pricing, Greeks, implied volatility, multi-leg payoff, breakevens, max pain, PCR,
// IV percentile and a SPAN-style margin approximation. Pure functions, unit-tested. Model assumptions are documented
// on the tools that use them: European exercise, continuous compounding, no dividends unless q is given.

export type OptType = "CE" | "PE";
export type Leg = { type: OptType | "FUT"; strike: number; qty: number; premium: number; lot?: number; expiryDays?: number; iv?: number }; // qty > 0 long, < 0 short (in lots)

const r2 = (n: number) => Math.round(n * 100) / 100;
export function normCdf(x: number) { const t = 1 / (1 + 0.2316419 * Math.abs(x)); const d = 0.3989423 * Math.exp((-x * x) / 2); const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - p : p; }
export function normPdf(x: number) { return Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI); }

export function bsPrice(type: OptType, S: number, K: number, T: number, sigma: number, r = 0.065, q = 0) {
  if (T <= 0) return Math.max(type === "CE" ? S - K : K - S, 0);
  const d1 = (Math.log(S / K) + (r - q + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T)); const d2 = d1 - sigma * Math.sqrt(T);
  return type === "CE" ? S * Math.exp(-q * T) * normCdf(d1) - K * Math.exp(-r * T) * normCdf(d2) : K * Math.exp(-r * T) * normCdf(-d2) - S * Math.exp(-q * T) * normCdf(-d1);
}
export function greeks(type: OptType, S: number, K: number, T: number, sigma: number, r = 0.065, q = 0) {
  if (T <= 0) return { delta: type === "CE" ? (S > K ? 1 : 0) : S < K ? -1 : 0, gamma: 0, theta: 0, vega: 0, rho: 0 };
  const sq = Math.sqrt(T); const d1 = (Math.log(S / K) + (r - q + (sigma * sigma) / 2) * T) / (sigma * sq); const d2 = d1 - sigma * sq;
  const pdf = normPdf(d1); const sign = type === "CE" ? 1 : -1;
  const delta = sign * Math.exp(-q * T) * normCdf(sign * d1);
  const gamma = (Math.exp(-q * T) * pdf) / (S * sigma * sq);
  const vega = (S * Math.exp(-q * T) * pdf * sq) / 100; // per 1% vol
  const theta = (-(S * Math.exp(-q * T) * pdf * sigma) / (2 * sq) - sign * r * K * Math.exp(-r * T) * normCdf(sign * d2) + sign * q * S * Math.exp(-q * T) * normCdf(sign * d1)) / 365; // per day
  const rho = (sign * K * T * Math.exp(-r * T) * normCdf(sign * d2)) / 100;
  return { delta, gamma, theta, vega, rho };
}
export function impliedVol(type: OptType, price: number, S: number, K: number, T: number, r = 0.065, q = 0) {
  let lo = 0.01, hi = 5;
  for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (bsPrice(type, S, K, T, mid, r, q) > price) hi = mid; else lo = mid; }
  return (lo + hi) / 2;
}

/** Payoff at expiry per unit (one share) for a set of legs at underlying price S; qty in lots × lot size. */
export function payoffAtExpiry(legs: Leg[], S: number) {
  return legs.reduce((sum, l) => { const lot = l.lot ?? 1; const units = l.qty * lot; if (l.type === "FUT") return sum + units * (S - l.strike); const intrinsic = l.type === "CE" ? Math.max(S - l.strike, 0) : Math.max(l.strike - S, 0); return sum + units * (intrinsic - l.premium); }, 0);
}
export function payoffCurve(legs: Leg[], spot: number, rangePct = 0.2, steps = 80) {
  const lo = spot * (1 - rangePct), hi = spot * (1 + rangePct);
  return Array.from({ length: steps + 1 }, (_, i) => { const S = lo + ((hi - lo) * i) / steps; return { S: r2(S), pnl: r2(payoffAtExpiry(legs, S)) }; });
}
export function breakevens(legs: Leg[], spot: number, rangePct = 0.5) {
  const pts = payoffCurve(legs, spot, rangePct, 2000); const out: number[] = [];
  for (let i = 1; i < pts.length; i++) if ((pts[i - 1].pnl < 0 && pts[i].pnl >= 0) || (pts[i - 1].pnl > 0 && pts[i].pnl <= 0)) { const a = pts[i - 1], b = pts[i]; out.push(r2(a.S + ((0 - a.pnl) * (b.S - a.S)) / (b.pnl - a.pnl || 1))); }
  return out;
}
export function maxProfitLoss(legs: Leg[], spot: number) {
  const pts = payoffCurve(legs, spot, 0.5, 1000); const pnls = pts.map((p) => p.pnl);
  const netUnits = legs.reduce((s, l) => s + (l.type === "FUT" ? l.qty * (l.lot ?? 1) : l.type === "CE" ? l.qty * (l.lot ?? 1) : -l.qty * (l.lot ?? 1)), 0);
  const unboundedUp = netUnits > 0, unboundedDown = legs.reduce((s, l) => s + (l.type === "FUT" ? l.qty * (l.lot ?? 1) : l.type === "PE" ? l.qty * (l.lot ?? 1) : 0), 0) < 0 || legs.some((l) => l.type === "FUT" && l.qty > 0);
  return { maxProfit: unboundedUp ? Infinity : Math.max(...pnls), maxLoss: unboundedDown ? -Infinity : Math.min(...pnls) };
}
/** Net premium: positive = debit paid, negative = credit received (per unit × lots). */
export function netPremium(legs: Leg[]) { return r2(legs.filter((l) => l.type !== "FUT").reduce((s, l) => s + l.qty * (l.lot ?? 1) * l.premium, 0)); }

/** SPAN-style approximation (disclosed as an approximation): worst loss across ±(scan%) spot moves and ±vol shifts, plus exposure margin for short options/futures. */
export function marginEstimate(legs: Leg[], spot: number, days: number, ivPct: number, scanPct = 0.05, exposurePct = 0.02) {
  const T = Math.max(days, 1) / 365; let worst = 0;
  const mark = (S: number, iv: number) => legs.reduce((s, l) => { const lot = l.lot ?? 1; if (l.type === "FUT") return s + l.qty * lot * (S - l.strike); return s + l.qty * lot * (bsPrice(l.type, S, l.strike, T, iv) - l.premium); }, 0);
  const base = mark(spot, ivPct / 100);
  for (const m of [-scanPct, -scanPct / 2, 0, scanPct / 2, scanPct]) for (const v of [-0.1, 0, 0.1]) worst = Math.min(worst, mark(spot * (1 + m), Math.max(0.05, ivPct / 100 + v)) - base);
  const exposure = legs.filter((l) => l.qty < 0 || l.type === "FUT").reduce((s, l) => s + Math.abs(l.qty) * (l.lot ?? 1) * spot * exposurePct, 0);
  return { span: r2(-worst), exposure: r2(exposure), total: r2(-worst + exposure), note: "Approximation: ±5% price scan × ±10 vol points plus 2% exposure margin. Exchange SPAN files are authoritative." };
}

export function maxPain(chain: { strike: number; ceOI: number; peOI: number }[]) {
  let best = chain[0]?.strike ?? 0, bestPain = Infinity;
  for (const s of chain) { const pain = chain.reduce((sum, c) => sum + c.ceOI * Math.max(s.strike - c.strike, 0) + c.peOI * Math.max(c.strike - s.strike, 0), 0); if (pain < bestPain) { bestPain = pain; best = s.strike; } }
  return best;
}
export function putCallRatio(chain: { ceOI: number; peOI: number }[]) { const ce = chain.reduce((s, c) => s + c.ceOI, 0); const pe = chain.reduce((s, c) => s + c.peOI, 0); return ce ? r2(pe / ce) : 0; }
export function ivPercentile(history: number[], current: number) { if (!history.length) return 0; return r2((history.filter((h) => h < current).length / history.length) * 100); }

/** Expiry calendar: NSE index weekly expiries (Thursday for NIFTY; other weekdays vary by product) and monthly last-Thursday expiries. */
export function monthlyExpiries(from: Date, months = 3) {
  const out: Date[] = [];
  for (let m = 0; m < months; m++) { const d = new Date(from.getFullYear(), from.getMonth() + m + 1, 0); while (d.getDay() !== 4) d.setDate(d.getDate() - 1); if (d >= from) out.push(new Date(d)); }
  return out;
}
export function weeklyExpiries(from: Date, weeks = 6, weekday = 4) {
  const out: Date[] = []; const d = new Date(from); d.setHours(0, 0, 0, 0);
  while (d.getDay() !== weekday) d.setDate(d.getDate() + 1);
  for (let i = 0; i < weeks; i++) { out.push(new Date(d)); d.setDate(d.getDate() + 7); }
  return out;
}

/** Simulated chain generator for research tools: strikes around spot, a volatility smile, synthetic OI. Deterministic for a given spot/seed. */
export function simulatedChain(symbol: string, spot: number, days: number, strikesEachSide = 8, step?: number, seed = 7) {
  const st = step ?? (spot > 20000 ? 100 : spot > 5000 ? 50 : spot > 1000 ? 20 : 5);
  const atm = Math.round(spot / st) * st; const T = Math.max(days, 1) / 365;
  let s = seed + Math.floor(spot); const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const baseIv = symbol.includes("BANK") ? 0.16 : symbol.includes("NIFTY") ? 0.13 : 0.28;
  return Array.from({ length: strikesEachSide * 2 + 1 }, (_, i) => {
    const K = atm + (i - strikesEachSide) * st; const m = Math.log(K / spot); const iv = baseIv * (1 + 1.6 * m * m) + (m < 0 ? 0.03 * -m : 0);
    const ce = bsPrice("CE", spot, K, T, iv), pe = bsPrice("PE", spot, K, T, iv);
    const dist = Math.abs(i - strikesEachSide);
    return { strike: K, iv: r2(iv * 100), ce: r2(ce), pe: r2(pe), ceOI: Math.round((200000 + rnd() * 800000) / (1 + dist * 0.4)) * 25, peOI: Math.round((200000 + rnd() * 800000) / (1 + dist * 0.4)) * 25, ceGreeks: greeks("CE", spot, K, T, iv), peGreeks: greeks("PE", spot, K, T, iv) };
  });
}
