// Indian-market planners: capital gains, harvesting, futures margin, pledge haircut, 80C comparison, retirement, goals, HRA.
// Rates are illustrative and labelled on screen; verify against the current Finance Act before relying on them.
const r2 = (n: number) => Math.round(n * 100) / 100;

export const TAX_RATES = { stcgEquityPct: 20, ltcgEquityPct: 12.5, ltcgExemption: 125000, holdingDaysLongTerm: 365, note: "Listed equity and equity funds with STT paid. Illustrative rates; surcharge and cess excluded." };

/** Capital gains tax on listed equity: short-term (held 12 months or less) at a flat rate, long-term above the annual exemption. */
export function equityCapitalGainsTax(stcg: number, ltcg: number, rates = TAX_RATES) {
  const stTax = Math.max(0, stcg) * (rates.stcgEquityPct / 100);
  const taxableLt = Math.max(0, ltcg - rates.ltcgExemption);
  const ltTax = taxableLt * (rates.ltcgEquityPct / 100);
  return { stTax: r2(stTax), taxableLtcg: r2(taxableLt), ltTax: r2(ltTax), total: r2(stTax + ltTax), exemptionUsed: r2(Math.min(Math.max(0, ltcg), rates.ltcgExemption)) };
}

/** Gain harvesting: long-term gain that can still be booked tax-free this year, and the tax saved by booking it now. */
export function harvestPlan(unrealisedLtcg: number, ltcgBookedThisYear: number, rates = TAX_RATES) {
  const room = Math.max(0, rates.ltcgExemption - Math.max(0, ltcgBookedThisYear));
  const bookNow = Math.min(room, Math.max(0, unrealisedLtcg));
  return { exemptionRoom: r2(room), bookNow: r2(bookNow), taxSaved: r2(bookNow * (rates.ltcgEquityPct / 100)), remainingUnrealised: r2(Math.max(0, unrealisedLtcg - bookNow)) };
}

/** Futures margin: SPAN (risk array) plus exposure margin on contract value, both collected upfront under peak-margin rules. */
export function futuresMargin(contractValue: number, spanPct: number, exposurePct: number) {
  const span = contractValue * (spanPct / 100); const exposure = contractValue * (exposurePct / 100);
  return { span: r2(span), exposure: r2(exposure), total: r2(span + exposure), leverage: span + exposure > 0 ? r2(contractValue / (span + exposure)) : 0 };
}

/** Pledge haircut: collateral value after the haircut, and the rule that at least half the margin must be cash or cash-equivalent. */
export function pledgeCollateral(marketValue: number, haircutPct: number, cashAvailable: number) {
  const collateral = marketValue * (1 - haircutPct / 100);
  const usable = Math.min(collateral, cashAvailable);
  return { collateral: r2(collateral), haircut: r2(marketValue - collateral), usableWithCashRule: r2(usable + cashAvailable), note: "At least 50% of the margin must come from cash or cash-equivalent collateral; the rest can be pledged securities." };
}

/** Section 80C comparison: the same yearly amount in ELSS, PPF and NPS at assumed returns. */
export function taxSaverComparison(yearly: number, years: number, elssPct = 12, ppfPct = 7.1, npsPct = 10) {
  const fv = (rate: number) => { const r = rate / 100; let v = 0; for (let i = 0; i < years; i++) v = (v + yearly) * (1 + r); return r2(v); };
  return [
    { name: "ELSS", lockIn: "3 years", value: fv(elssPct), taxOnExit: "LTCG 12.5% above ₹1.25 lakh a year", risk: "Market-linked (equity)" },
    { name: "PPF", lockIn: "15 years (partial withdrawal from year 7)", value: fv(ppfPct), taxOnExit: "Exempt (EEE)", risk: "Sovereign guarantee" },
    { name: "NPS Tier 1", lockIn: "Until 60 (60% lumpsum, 40% annuity)", value: fv(npsPct), taxOnExit: "60% exempt; annuity taxed as income", risk: "Market-linked (equity + debt)" },
  ];
}

/** Retirement corpus: inflate today's expense to retirement, then size a corpus that funds it with real returns. */
export function retirementCorpus(monthlyExpenseToday: number, yearsToRetire: number, yearsInRetirement: number, inflationPct: number, preReturnPct: number, postReturnPct: number, currentCorpus = 0) {
  const expenseAtRetirement = monthlyExpenseToday * Math.pow(1 + inflationPct / 100, yearsToRetire);
  const realMonthly = ((1 + postReturnPct / 100) / (1 + inflationPct / 100) - 1) / 12;
  const n = yearsInRetirement * 12;
  const corpus = realMonthly === 0 ? expenseAtRetirement * n : expenseAtRetirement * (1 - Math.pow(1 + realMonthly, -n)) / realMonthly;
  const corpusFromExisting = currentCorpus * Math.pow(1 + preReturnPct / 100, yearsToRetire);
  const gap = Math.max(0, corpus - corpusFromExisting);
  const i = preReturnPct / 100 / 12; const m = yearsToRetire * 12;
  const sip = m <= 0 ? gap : i === 0 ? gap / m : gap / (((Math.pow(1 + i, m) - 1) / i) * (1 + i));
  return { expenseAtRetirement: r2(expenseAtRetirement), corpus: r2(corpus), corpusFromExisting: r2(corpusFromExisting), gap: r2(gap), monthlySip: r2(sip) };
}

/** Goal planner (education, wedding, house): inflate the goal and compute the SIP that reaches it. */
export function goalPlanner(goalToday: number, years: number, inflationPct: number, returnPct: number, existing = 0) {
  const target = goalToday * Math.pow(1 + inflationPct / 100, years);
  const fromExisting = existing * Math.pow(1 + returnPct / 100, years);
  const gap = Math.max(0, target - fromExisting);
  const i = returnPct / 100 / 12; const m = years * 12;
  const sip = m <= 0 ? gap : i === 0 ? gap / m : gap / (((Math.pow(1 + i, m) - 1) / i) * (1 + i));
  return { target: r2(target), fromExisting: r2(fromExisting), gap: r2(gap), monthlySip: r2(sip) };
}

/** HRA exemption (old regime): least of actual HRA, rent minus 10% of basic, and 50% (metro) or 40% (non-metro) of basic. */
export function hraExemption(basicAnnual: number, hraReceived: number, rentPaid: number, metro: boolean) {
  const a = hraReceived; const b = Math.max(0, rentPaid - 0.1 * basicAnnual); const c = basicAnnual * (metro ? 0.5 : 0.4);
  const exempt = Math.max(0, Math.min(a, b, c));
  return { exempt: r2(exempt), taxable: r2(Math.max(0, hraReceived - exempt)), components: { actualHra: r2(a), rentMinus10pct: r2(b), pctOfBasic: r2(c) } };
}
