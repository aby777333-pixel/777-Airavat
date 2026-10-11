import { describe, expect, it } from "vitest";
import {
  averagePrice, brokerageBreakdown, cagr, inflationAdjusted, lumpsumFutureValue, marginEstimate,
  positionSize, riskReward, roundTrip, sipFutureValue,
} from "./calculators";

describe("brokerage breakdown", () => {
  it("CNC buy of 1,00,000 has zero brokerage and statutory levies only", () => {
    const b = brokerageBreakdown("CNC", "BUY", 100000);
    expect(b.brokerage).toBe(0);
    expect(b.stt).toBe(100);
    expect(b.stamp).toBe(15);
    expect(b.exchange).toBe(3.07);
    expect(b.sebi).toBe(0.1);
    expect(b.gst).toBe(0.57);
    expect(b.total).toBe(118.74);
  });
  it("MIS brokerage is capped at 20", () => {
    expect(brokerageBreakdown("MIS", "SELL", 1000000).brokerage).toBe(20);
    expect(brokerageBreakdown("MIS", "SELL", 10000).brokerage).toBe(3);
  });
  it("never produces negative charges for zero value", () => {
    const b = brokerageBreakdown("MIS", "BUY", 0);
    expect(b.total).toBe(0);
  });
});

describe("round trip", () => {
  it("computes gross, charges and net", () => {
    const rt = roundTrip("MIS", 100, 100, 101);
    expect(rt.gross).toBe(100);
    expect(rt.totalCharges).toBeGreaterThan(0);
    expect(rt.net).toBe(rt.gross - rt.totalCharges);
    expect(rt.breakEvenMove).toBeCloseTo(rt.totalCharges / 100, 2);
  });
  it("handles zero quantity without dividing by zero", () => {
    expect(roundTrip("CNC", 0, 100, 110).breakEvenMove).toBe(0);
  });
});

describe("SIP and lumpsum", () => {
  it("SIP with 0% return equals invested", () => {
    const s = sipFutureValue(1000, 0, 2);
    expect(s.value).toBe(24000);
    expect(s.gain).toBe(0);
  });
  it("SIP of 5000 at 12% for 10 years is about 11.6 lakh", () => {
    const s = sipFutureValue(5000, 12, 10);
    expect(s.invested).toBe(600000);
    expect(s.value).toBeGreaterThan(1150000);
    expect(s.value).toBeLessThan(1170000);
  });
  it("lumpsum doubles roughly in 6 years at 12%", () => {
    const l = lumpsumFutureValue(100000, 12, 6);
    expect(l.value).toBeGreaterThan(197000);
    expect(l.value).toBeLessThan(198000);
  });
  it("zero years returns zero SIP", () => {
    expect(sipFutureValue(1000, 10, 0).value).toBe(0);
  });
});

describe("CAGR", () => {
  it("doubling in 3 years is ~25.99%", () => expect(cagr(100, 200, 3)).toBeCloseTo(25.99, 1));
  it("guards invalid inputs", () => {
    expect(cagr(0, 100, 3)).toBe(0);
    expect(cagr(100, 200, 0)).toBe(0);
  });
});

describe("position sizing and risk-reward", () => {
  it("sizes by risk per share", () => {
    const p = positionSize(500000, 1, 100, 95);
    expect(p.riskAmount).toBe(5000);
    expect(p.qty).toBe(1000);
    expect(p.exposure).toBe(100000);
  });
  it("returns zero qty when stop equals entry", () => expect(positionSize(100000, 1, 100, 100).qty).toBe(0));
  it("risk reward 1:2", () => expect(riskReward(100, 95, 110).ratio).toBe(2));
});

describe("misc", () => {
  it("inflation adjusts", () => expect(inflationAdjusted(100, 10, 1)).toBeCloseTo(90.91, 2));
  it("average price", () => expect(averagePrice([{ qty: 10, price: 100 }, { qty: 10, price: 200 }]).avg).toBe(150));
  it("MIS margin at 20% gives 5x", () => {
    const m = marginEstimate("MIS", 100, 100);
    expect(m.margin).toBe(2000);
    expect(m.leverage).toBe(5);
  });
});

describe("xirr and emi", () => {
  it("XIRR of a single investment doubling in two years is about 41.4%", async () => {
    const { xirr } = await import("./calculators");
    expect(xirr([{ date: "2024-01-01", amount: -100000 }, { date: "2026-01-01", amount: 200000 }])).toBeCloseTo(41.42, 0);
  });
  it("XIRR handles SIP-style flows and returns null for one-sided flows", async () => {
    const { xirr } = await import("./calculators");
    const flows = Array.from({ length: 12 }, (_, i) => ({ date: new Date(2025, i, 1), amount: -10000 }));
    flows.push({ date: new Date(2026, 0, 1), amount: 130000 });
    const r = xirr(flows)!; expect(r).toBeGreaterThan(10); expect(r).toBeLessThan(40);
    expect(xirr([{ date: "2025-01-01", amount: -1 }, { date: "2025-06-01", amount: -1 }])).toBeNull();
  });
  it("EMI for 10 lakh at 9% over 240 months is about 8,997", async () => {
    const { emi } = await import("./calculators");
    const e = emi(1000000, 9, 240);
    expect(e.emi).toBeCloseTo(8997.26, 0);
    expect(e.totalInterest).toBeGreaterThan(1100000);
  });
});
