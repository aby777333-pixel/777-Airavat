import { describe, expect, it } from "vitest";
import { equityCapitalGainsTax, harvestPlan, futuresMargin, pledgeCollateral, taxSaverComparison, retirementCorpus, goalPlanner, hraExemption } from "./planners";

describe("Indian-market planners", () => {
  it("equity capital gains: STCG flat, LTCG above the exemption", () => {
    const t = equityCapitalGainsTax(100000, 200000);
    expect(t.stTax).toBe(20000); expect(t.taxableLtcg).toBe(75000); expect(t.ltTax).toBe(9375); expect(t.total).toBe(29375);
  });
  it("harvest plan uses the remaining exemption room", () => {
    const h = harvestPlan(300000, 25000); expect(h.exemptionRoom).toBe(100000); expect(h.bookNow).toBe(100000); expect(h.taxSaved).toBe(12500);
  });
  it("futures margin adds SPAN and exposure", () => { const m = futuresMargin(1000000, 8, 2); expect(m.total).toBe(100000); expect(m.leverage).toBe(10); });
  it("pledge haircut and cash rule", () => { const p = pledgeCollateral(100000, 20, 50000); expect(p.collateral).toBe(80000); expect(p.usableWithCashRule).toBe(100000); });
  it("tax saver comparison ranks by assumed return", () => { const c = taxSaverComparison(150000, 15); expect(c[0].value).toBeGreaterThan(c[1].value); expect(c[1].name).toBe("PPF"); });
  it("retirement corpus grows with inflation and shrinks with existing savings", () => {
    const a = retirementCorpus(50000, 25, 25, 6, 11, 7, 0); const b = retirementCorpus(50000, 25, 25, 6, 11, 7, 2000000);
    expect(a.corpus).toBeGreaterThan(a.expenseAtRetirement * 12 * 10); expect(b.monthlySip).toBeLessThan(a.monthlySip);
  });
  it("goal planner and HRA follow the published formulas", () => {
    expect(goalPlanner(1000000, 10, 8, 12).target).toBeCloseTo(2158925, -2);
    const h = hraExemption(600000, 240000, 300000, true); expect(h.exempt).toBe(240000);
  });
});
