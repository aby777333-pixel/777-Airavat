// Financial calculators. Pure functions with documented formulas. Money is rounded to paise at the edges only.
// Statutory charge rates are illustrative sandbox values and must be verified before production.

export type Product = "CNC" | "MIS";

export const SANDBOX_CHARGES = {
  CNC: { brokeragePct: 0, brokerageCap: 0, sttBuyPct: 0.1, sttSellPct: 0.1, exchangePct: 0.00297, sebiPct: 0.0001, stampBuyPct: 0.015, gstPct: 18 },
  MIS: { brokeragePct: 0.03, brokerageCap: 20, sttBuyPct: 0, sttSellPct: 0.025, exchangePct: 0.00297, sebiPct: 0.0001, stampBuyPct: 0.003, gstPct: 18 },
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
