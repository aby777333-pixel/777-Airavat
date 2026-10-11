import { describe, expect, it } from "vitest";
import { bsPrice, breakevens, greeks, impliedVol, marginEstimate, maxPain, maxProfitLoss, monthlyExpiries, netPremium, payoffAtExpiry, putCallRatio, simulatedChain, weeklyExpiries } from "./options";

describe("Black-Scholes", () => {
  it("prices an ATM call near the textbook value", () => {
    // S=100, K=100, T=1, sigma=20%, r=5% → call ≈ 10.45
    expect(bsPrice("CE", 100, 100, 1, 0.2, 0.05)).toBeCloseTo(10.45, 1);
    expect(bsPrice("PE", 100, 100, 1, 0.2, 0.05)).toBeCloseTo(5.57, 1);
  });
  it("put-call parity holds", () => {
    const c = bsPrice("CE", 100, 95, 0.5, 0.25, 0.06), p = bsPrice("PE", 100, 95, 0.5, 0.25, 0.06);
    expect(c - p).toBeCloseTo(100 - 95 * Math.exp(-0.06 * 0.5), 6);
  });
  it("recovers implied volatility", () => {
    const px = bsPrice("CE", 22000, 22200, 10 / 365, 0.14);
    expect(impliedVol("CE", px, 22000, 22200, 10 / 365)).toBeCloseTo(0.14, 3);
  });
  it("Greeks have the right signs", () => {
    const g = greeks("CE", 100, 100, 0.25, 0.2);
    expect(g.delta).toBeGreaterThan(0.5); expect(g.gamma).toBeGreaterThan(0); expect(g.theta).toBeLessThan(0); expect(g.vega).toBeGreaterThan(0);
    expect(greeks("PE", 100, 100, 0.25, 0.2).delta).toBeLessThan(0);
  });
});

describe("payoffs", () => {
  const lot = 50;
  const longCall = [{ type: "CE" as const, strike: 22000, qty: 1, premium: 150, lot }];
  it("long call payoff and breakeven", () => {
    expect(payoffAtExpiry(longCall, 21900)).toBe(-150 * lot);
    expect(payoffAtExpiry(longCall, 22300)).toBe(150 * lot);
    expect(breakevens(longCall, 22000)[0]).toBeCloseTo(22150, 0);
    expect(maxProfitLoss(longCall, 22000).maxProfit).toBe(Infinity);
    expect(maxProfitLoss(longCall, 22000).maxLoss).toBe(-150 * lot);
  });
  it("bull call spread is bounded both sides", () => {
    const spread = [{ type: "CE" as const, strike: 22000, qty: 1, premium: 150, lot }, { type: "CE" as const, strike: 22200, qty: -1, premium: 70, lot }];
    const mp = maxProfitLoss(spread, 22000);
    expect(mp.maxProfit).toBe((200 - 80) * lot); expect(mp.maxLoss).toBe(-80 * lot);
    expect(netPremium(spread)).toBe(80 * lot);
  });
  it("short straddle margin estimate is positive and larger than a long straddle", () => {
    const shortStr = [{ type: "CE" as const, strike: 22000, qty: -1, premium: 150, lot }, { type: "PE" as const, strike: 22000, qty: -1, premium: 140, lot }];
    const longStr = shortStr.map((l) => ({ ...l, qty: 1 }));
    expect(marginEstimate(shortStr, 22000, 10, 14).total).toBeGreaterThan(marginEstimate(longStr, 22000, 10, 14).total);
  });
});

describe("chain analytics", () => {
  const chain = simulatedChain("NIFTY 50", 22000, 7);
  it("builds a symmetric chain with a smile", () => {
    expect(chain).toHaveLength(17);
    expect(chain[8].strike).toBe(22000);
    expect(chain[0].iv).toBeGreaterThan(chain[8].iv);
  });
  it("max pain sits near the money and PCR is finite", () => {
    const mp = maxPain(chain); expect(Math.abs(mp - 22000)).toBeLessThanOrEqual(400);
    expect(putCallRatio(chain)).toBeGreaterThan(0);
  });
  it("expiry calendars land on Thursdays", () => {
    const from = new Date(2026, 9, 11);
    expect(monthlyExpiries(from, 2).every((d) => d.getDay() === 4)).toBe(true);
    expect(weeklyExpiries(from, 3).every((d) => d.getDay() === 4)).toBe(true);
  });
});
