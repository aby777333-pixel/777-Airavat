// Financial calculators. Pure functions with documented formulas. Money is rounded to paise at the edges only.
// Statutory and exchange rates follow the published market reference of 2026-10-11 (see charges-schedule.ts) and are
// re-verified against official notifications before production.

export type Product = "CNC" | "MIS";

export const SANDBOX_CHARGES = {
  CNC: { brokeragePct: 0, brokerageCap: 0, sttBuyPct: 0.1, sttSellPct: 0.1, exchangePct: 0.00307, sebiPct: 0.0001, stampBuyPct: 0.015, gstPct: 18 },
  MIS: { brokeragePct: 0.03, brokerageCap: 20, sttBuyPct: 0, sttSellPct: 0.025, exchangePct: 0.00307, sebiPct: 0.0001, stampBuyPct: 0.003, gstPct: 18 },
} as const;

const r2 = (n: number) => Math.round(n * 100) / 100;

export function brokerageBreakdown(product: Product, side: "BUY" | "SELL", value: number) {
  const c = SANDBOX_CHARGES[product];
  const brokerage = Math.min(r2((value * c.brokeragePct) / 100), c.brokerageCap);
  const stt = r2((value * (side === "BUY" ? c.sttBuyPct : c.sttSellPct)) / 100);
  const exchange = r2((value * c.exchangePct) / 100);
  const sebi = r2((value * c.sebiPct) / 100);
  const stamp = r2((value * (side === "BUY" ? c.stampBuyPct : 0)) / 100);
  const gst = r2(((brokerage + exchange + sebi) * c.gstPct) / 100);
  const total = r2(brokerage + stt + exchange + sebi + stamp + gst);
  return { brokerage, stt, exchange, sebi, stamp, gst, total };
}

/** Round trip: buy qty at buyPrice, sell at sellPrice. Returns charges on both legs and net P&L. */
export function roundTrip(product: Product, qty: number, buyPrice: number, sellPrice: number) {
  const buyValue = qty * buyPrice;
  const sellValue = qty * sellPrice;
  const buy = brokerageBreakdown(product, "BUY", buyValue);
  const sell = brokerageBreakdown(product, "SELL", sellValue);
  const totalCharges = r2(buy.total + sell.total);
  const gross = r2(sellValue - buyValue);
  const net = r2(gross - totalCharges);
  // Break-even: price move per share needed to cover charges
  const breakEvenMove = qty > 0 ? totalCharges / qty : 0;
  return { buyValue, sellValue, buy, sell, totalCharges, gross, net, breakEvenMove: r2(breakEvenMove) };
}

/** SIP future value: P * [((1+i)^n - 1) / i] * (1+i), monthly compounding. */
export function sipFutureValue(monthly: number, annualRatePct: number, years: number) {
  const i = annualRatePct / 100 / 12;
  const n = Math.round(years * 12);
  if (n <= 0) return { invested: 0, value: 0, gain: 0 };
  const value = i === 0 ? monthly * n : monthly * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
  const invested = monthly * n;
  return { invested: r2(invested), value: r2(value), gain: r2(value - invested) };
}

/** Lumpsum: A = P (1 + r)^t */
export function lumpsumFutureValue(principal: number, annualRatePct: number, years: number) {
  const value = principal * Math.pow(1 + annualRatePct / 100, years);
  return { invested: r2(principal), value: r2(value), gain: r2(value - principal) };
}

/** CAGR = (end/start)^(1/years) - 1 */
export function cagr(start: number, end: number, years: number) {
  if (start <= 0 || years <= 0) return 0;
  return r2((Math.pow(end / start, 1 / years) - 1) * 10000) / 100;
}

/** Position size by risk: qty = floor(riskAmount / |entry - stop|) */
export function positionSize(capital: number, riskPct: number, entry: number, stop: number) {
  const riskAmount = (capital * riskPct) / 100;
  const perShare = Math.abs(entry - stop);
  const qty = perShare > 0 ? Math.floor(riskAmount / perShare) : 0;
  return { riskAmount: r2(riskAmount), perShareRisk: r2(perShare), qty, exposure: r2(qty * entry) };
}

/** Risk-reward ratio */
export function riskReward(entry: number, stop: number, target: number) {
  const risk = Math.abs(entry - stop);
  const reward = Math.abs(target - entry);
  return { risk: r2(risk), reward: r2(reward), ratio: risk > 0 ? r2(reward / risk) : 0 };
}

/** Inflation-adjusted value: FV / (1+i)^t */
export function inflationAdjusted(amount: number, inflationPct: number, years: number) {
  return r2(amount / Math.pow(1 + inflationPct / 100, years));
}

/** Weighted average price */
export function averagePrice(lots: { qty: number; price: number }[]) {
  const qty = lots.reduce((s, l) => s + l.qty, 0);
  const value = lots.reduce((s, l) => s + l.qty * l.price, 0);
  return { qty, avg: qty > 0 ? r2(value / qty) : 0, value: r2(value) };
}

/** Required margin estimate for sandbox products */
export function marginEstimate(product: Product, qty: number, price: number, misMarginPct = 20) {
  const value = qty * price;
  if (product === "CNC") return { value: r2(value), margin: r2(value + brokerageBreakdown("CNC", "BUY", value).total), leverage: 1 };
  const margin = (value * misMarginPct) / 100;
  return { value: r2(value), margin: r2(margin), leverage: r2(100 / misMarginPct) };
}

/** XIRR: annualised return of dated cash flows (negative = investment, positive = withdrawal/value). Newton with bisection fallback. */
export function xirr(flows: { date: string | Date; amount: number }[]): number | null {
  if (flows.length < 2) return null;
  const t0 = new Date(flows[0].date).getTime();
  const yrs = flows.map((f) => (new Date(f.date).getTime() - t0) / (365 * 86400000));
  const npv = (r: number) => flows.reduce((s, f, i) => s + f.amount / Math.pow(1 + r, yrs[i]), 0);
  if (!flows.some((f) => f.amount < 0) || !flows.some((f) => f.amount > 0)) return null;
  let lo = -0.9999, hi = 10;
  if (npv(lo) * npv(hi) > 0) return null;
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (npv(lo) * npv(mid) <= 0) hi = mid; else lo = mid; }
  return Math.round(((lo + hi) / 2) * 10000) / 100;
}

/** EMI for a loan: P × i × (1+i)^n / ((1+i)^n − 1), monthly compounding. */
export function emi(principal: number, annualRatePct: number, months: number) {
  const i = annualRatePct / 1200;
  const m = i === 0 ? principal / months : (principal * i * Math.pow(1 + i, months)) / (Math.pow(1 + i, months) - 1);
  const total = m * months;
  return { emi: r2(m), totalPayment: r2(total), totalInterest: r2(total - principal) };
}
