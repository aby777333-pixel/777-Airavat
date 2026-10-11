// AIRAVAT published charge schedule (sandbox). One source of truth for the public pricing page and the calculators.
// Values are AIRAVAT's own schedule, benchmarked on 2026-10-11 against prevailing Indian discount-brokerage market rates (see REFERENCE below); statutory and
// exchange rates are re-verified against official notifications before any live use. Only NSE equity cash (CNC/MIS) is
// tradable in the sandbox; every other segment is published for transparency and labelled "not enabled".

export const SCHEDULE_VERSION = "2026-10-11";
export const REFERENCE = { label: "AIRAVAT published schedule, benchmarked against prevailing Indian discount-brokerage market rates and statutory levies", url: "/pricing", retrieved: "2026-10-11" };

export type SegmentKey = "equity_delivery" | "equity_intraday" | "equity_futures" | "equity_options" | "currency_futures" | "currency_options" | "commodity_futures" | "commodity_options";
export type Side = "BUY" | "SELL";
export type Brokerage = { type: "zero" } | { type: "pct_capped"; pct: number; cap: number } | { type: "flat"; amount: number };
export type SttRule = { pct: number; side: Side | "BOTH"; basis: "value" | "premium" | "intrinsic"; note?: string };
export type Segment = {
  key: SegmentKey; group: "Equity" | "F&O" | "Currency" | "Commodity"; name: string; matrixSegment: string; // matches market_access_matrix.segment
  brokerage: Brokerage; stt: SttRule[]; txn: Record<string, number>; txnBasis: "value" | "premium"; sebiPerCrore: number | { agri: number; nonAgri: number };
  stampPct: number; stampNote: string; gstPct: 18; ipft?: string; notes?: string[];
};

export const SEGMENTS: Segment[] = [
  { key: "equity_delivery", group: "Equity", name: "Equity delivery (CNC)", matrixSegment: "EQ", brokerage: { type: "zero" }, stt: [{ pct: 0.1, side: "BOTH", basis: "value" }], txn: { NSE: 0.00307, BSE: 0.00375 }, txnBasis: "value", sebiPerCrore: 10, stampPct: 0.015, stampNote: "0.015% (₹1,500 per crore) on the buy side", gstPct: 18, ipft: "₹10 per crore + GST (NSE)" },
  { key: "equity_intraday", group: "Equity", name: "Equity intraday (MIS)", matrixSegment: "EQ", brokerage: { type: "pct_capped", pct: 0.03, cap: 20 }, stt: [{ pct: 0.025, side: "SELL", basis: "value" }], txn: { NSE: 0.00307, BSE: 0.00375 }, txnBasis: "value", sebiPerCrore: 10, stampPct: 0.003, stampNote: "0.003% (₹300 per crore) on the buy side", gstPct: 18, ipft: "₹10 per crore + GST (NSE)" },
  { key: "equity_futures", group: "F&O", name: "Equity futures", matrixSegment: "FO", brokerage: { type: "pct_capped", pct: 0.03, cap: 20 }, stt: [{ pct: 0.05, side: "SELL", basis: "value" }], txn: { NSE: 0.00183, BSE: 0 }, txnBasis: "value", sebiPerCrore: 10, stampPct: 0.002, stampNote: "0.002% (₹200 per crore) on the buy side", gstPct: 18, ipft: "₹10 per crore + GST (NSE)" },
  { key: "equity_options", group: "F&O", name: "Equity options", matrixSegment: "FO", brokerage: { type: "flat", amount: 20 }, stt: [{ pct: 0.15, side: "SELL", basis: "premium" }, { pct: 0.15, side: "BUY", basis: "intrinsic", note: "on options bought and exercised" }], txn: { NSE: 0.03553, BSE: 0.0325 }, txnBasis: "premium", sebiPerCrore: 10, stampPct: 0.003, stampNote: "0.003% (₹300 per crore) on the buy side", gstPct: 18, ipft: "₹10 per crore + GST on premium (NSE)", notes: ["Brokerage also applies to expired, exercised and assigned contracts.", "Physical delivery: 0.25% of contract value; netted-off physically settled contracts: 0.1%."] },
  { key: "currency_futures", group: "Currency", name: "Currency futures", matrixSegment: "CDS", brokerage: { type: "pct_capped", pct: 0.03, cap: 20 }, stt: [], txn: { NSE: 0.00035, BSE: 0.00045 }, txnBasis: "value", sebiPerCrore: 10, stampPct: 0.0001, stampNote: "0.0001% (₹10 per crore) on the buy side", gstPct: 18, ipft: "₹0.05 per lakh + GST of turnover (NSE)" },
  { key: "currency_options", group: "Currency", name: "Currency options", matrixSegment: "CDS", brokerage: { type: "flat", amount: 20 }, stt: [], txn: { NSE: 0.0311, BSE: 0.001 }, txnBasis: "premium", sebiPerCrore: 10, stampPct: 0.0001, stampNote: "0.0001% (₹10 per crore) on the buy side", gstPct: 18, ipft: "₹2 per lakh + GST of premium (NSE)" },
  { key: "commodity_futures", group: "Commodity", name: "Commodity futures", matrixSegment: "COMM", brokerage: { type: "pct_capped", pct: 0.03, cap: 20 }, stt: [{ pct: 0.01, side: "SELL", basis: "value", note: "CTT, non-agri commodities" }], txn: { MCX: 0.0021, NSE: 0.0001 }, txnBasis: "value", sebiPerCrore: { agri: 1, nonAgri: 10 }, stampPct: 0.002, stampNote: "0.002% (₹200 per crore) on the buy side", gstPct: 18 },
  { key: "commodity_options", group: "Commodity", name: "Commodity options", matrixSegment: "COMM", brokerage: { type: "flat", amount: 20 }, stt: [{ pct: 0.05, side: "SELL", basis: "premium", note: "CTT" }], txn: { MCX: 0.0418, NSE: 0.001 }, txnBasis: "premium", sebiPerCrore: 10, stampPct: 0.003, stampNote: "0.003% (₹300 per crore) on the buy side", gstPct: 18 },
];

export const OTHER_CHARGES: { item: string; amount: string; note?: string; sandbox: string }[] = [
  { item: "Account opening", amount: "Free for individuals and minors; ₹500 for NRI, HUF (offline), partnership, LLP and corporate accounts", sandbox: "Sandbox accounts are free and simulated." },
  { item: "DP charge on sell", amount: "₹15.34 per scrip per day on the sell side, irrespective of quantity (depository ₹3.50 + broker ₹9.50 + GST ₹2.34)", note: "Female first holder: ₹0.25 less on the depository fee; mutual fund and bond debits: a further ₹0.25 less.", sandbox: "Not charged yet: no depository arrangement." },
  { item: "Pledging", amount: "₹30 + GST per pledge request per ISIN", sandbox: "Pledging not available." },
  { item: "Call & trade / dealer-placed orders", amount: "₹50 per order (includes dealer auto square-off)", sandbox: "Dealer desk not built." },
  { item: "Delayed payment", amount: "18% per year (0.05% per day) on the debit balance", sandbox: "Sandbox accounts cannot go into debit." },
  { item: "Debit balance orders", amount: "Additional ₹20 per executed order while the account is in debit", sandbox: "Not applicable." },
  { item: "Physical CMR", amount: "First request free; thereafter ₹20 + ₹100 courier + 18% GST", sandbox: "Not available." },
  { item: "Off-market transfer", amount: "₹25 per transaction", sandbox: "Not available." },
  { item: "Payment gateway", amount: "₹9 + GST per non-UPI transfer; nil on UPI", sandbox: "Deposits are simulated." },
  { item: "Corporate action orders (OFS, buyback, takeover, delisting)", amount: "₹20 + GST per order", sandbox: "Not built." },
  { item: "Direct mutual funds", amount: "Zero commission, zero DP charges", sandbox: "Not enabled." },
];

export const AMC = {
  billing: "Charged quarterly (every 91 days from account opening) and debited from the trading ledger; can be prepaid for 1 to 5 years.",
  firstYear: "Free for the first year on the primary demat account of resident individuals opened on or after 1 June 2026; minors pay no AMC; a secondary demat account is charged from its opening date.",
  bsdaEligibility: "Basic Service Demat Account (BSDA): resident individuals and NRIs whose demat account is the only one on their PAN across brokers and whose holdings are below ₹10,00,000. Classification is automatic and shown on the CMR.",
  bsda: [
    { slab: "Holdings up to ₹4,00,000", resident: "₹0", nri: "₹0" },
    { slab: "₹4,00,001 to ₹10,00,000", resident: "₹25 per quarter + GST", nri: "₹25 per quarter + GST" },
    { slab: "Above ₹10,00,000 (no longer BSDA)", resident: "₹75 per quarter + GST", nri: "₹125 per quarter + GST" },
  ],
  nonBsda: [
    { type: "Individual, HUF, partnership firm", annual: "₹300 + GST", quarterly: "₹75 + GST" },
    { type: "NRI", annual: "₹500 + GST", quarterly: "₹125 + GST" },
    { type: "Corporates (LLP, private and public companies)", annual: "₹1,000 + GST", quarterly: "₹250 + GST" },
  ],
  secondary: "Each additional demat account is charged ₹300 + GST per year separately, and holding more than one account disqualifies all of them from BSDA rates.",
  sandbox: "AMC is not debited in the sandbox; there is no depository arrangement.",
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export type Estimate = { brokerage: number; stt: number; exchange: number; sebi: number; stamp: number; gst: number; total: number; basis: number; notes: string[] };

/** Estimate charges for one executed order in any published segment. `value` is contract/turnover value; `premium` is the option premium value (defaults to value for options). */
export function estimateCharges(key: SegmentKey, side: Side, value: number, opts: { exchange?: string; premium?: number; agri?: boolean } = {}): Estimate {
  const s = SEGMENTS.find((x) => x.key === key)!;
  const isOption = key.endsWith("_options");
  const premium = opts.premium ?? value;
  const basis = isOption ? premium : value;
  const notes: string[] = [];
  let brokerage = 0;
  if (s.brokerage.type === "pct_capped") brokerage = Math.min(r2((value * s.brokerage.pct) / 100), s.brokerage.cap);
  else if (s.brokerage.type === "flat") brokerage = s.brokerage.amount;
  let stt = 0;
  for (const rule of s.stt) {
    if (rule.basis === "intrinsic") { notes.push("STT of 0.15% on intrinsic value applies only if a bought option is exercised; not included."); continue; }
    if (rule.side === "BOTH" || rule.side === side) stt += r2(((rule.basis === "premium" ? premium : value) * rule.pct) / 100);
  }
  const exch = opts.exchange && s.txn[opts.exchange] !== undefined ? opts.exchange : Object.keys(s.txn)[0];
  const exchange = r2((basis * s.txn[exch]) / 100);
  const sebiRate = typeof s.sebiPerCrore === "number" ? s.sebiPerCrore : opts.agri ? s.sebiPerCrore.agri : s.sebiPerCrore.nonAgri;
  const sebi = r2((basis * sebiRate) / 1e7);
  const stamp = side === "BUY" ? r2((basis * s.stampPct) / 100) : 0;
  const gst = r2(((brokerage + exchange + sebi) * s.gstPct) / 100);
  if (s.matrixSegment !== "EQ") notes.push("This segment is not enabled in the sandbox; the estimate is for transparency only.");
  return { brokerage, stt, exchange, sebi, stamp, gst, total: r2(brokerage + stt + exchange + sebi + stamp + gst), basis, notes };
}
