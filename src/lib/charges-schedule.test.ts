import { describe, expect, it } from "vitest";
import { SEGMENTS, estimateCharges } from "./charges-schedule";
import { brokerageBreakdown } from "./calculators";

describe("published charge schedule", () => {
  it("covers all eight segments with GST at 18%", () => {
    expect(SEGMENTS.map((s) => s.key)).toHaveLength(8);
    expect(SEGMENTS.every((s) => s.gstPct === 18)).toBe(true);
  });
  it("equity delivery and intraday agree with the sandbox calculator", () => {
    const a = estimateCharges("equity_delivery", "BUY", 100000);
    const b = brokerageBreakdown("CNC", "BUY", 100000);
    expect(a.total).toBe(b.total);
    const c = estimateCharges("equity_intraday", "SELL", 100000);
    const d = brokerageBreakdown("MIS", "SELL", 100000);
    expect(c.total).toBe(d.total);
    expect(c.total).toBe(52.34);
  });
  it("equity options: flat Rs 20 brokerage, STT 0.15% of premium on sell, txn 0.03553% of premium", () => {
    const e = estimateCharges("equity_options", "SELL", 100000, { premium: 10000 });
    expect(e.brokerage).toBe(20);
    expect(e.stt).toBe(15);
    expect(e.exchange).toBe(3.55);
    expect(e.stamp).toBe(0);
    expect(e.gst).toBe(4.24);
  });
  it("equity futures: STT 0.05% on sell only, stamp 0.002% on buy only", () => {
    expect(estimateCharges("equity_futures", "SELL", 1000000).stt).toBe(500);
    expect(estimateCharges("equity_futures", "BUY", 1000000).stt).toBe(0);
    expect(estimateCharges("equity_futures", "BUY", 1000000).stamp).toBe(20);
  });
  it("currency has no STT and SEBI Rs 10 per crore", () => {
    const c = estimateCharges("currency_futures", "SELL", 10000000);
    expect(c.stt).toBe(0);
    expect(c.sebi).toBe(10);
    expect(c.exchange).toBe(35);
  });
  it("commodity futures: CTT 0.01% on sell, agri SEBI fee Rs 1 per crore, MCX txn 0.0021%", () => {
    const n = estimateCharges("commodity_futures", "SELL", 10000000);
    expect(n.stt).toBe(1000);
    expect(n.sebi).toBe(10);
    expect(n.exchange).toBe(210);
    expect(estimateCharges("commodity_futures", "SELL", 10000000, { agri: true }).sebi).toBe(1);
    expect(n.notes.some((x) => x.includes("not enabled"))).toBe(true);
  });
});
