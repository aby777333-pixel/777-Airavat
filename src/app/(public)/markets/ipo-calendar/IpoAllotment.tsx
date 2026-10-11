"use client";
import { useState } from "react";
import { money } from "@/lib/format";

// Retail allotment helper: in an oversubscribed retail book, SEBI's proportionate basis gives each applicant a lottery for one lot.
export default function IpoAllotment({ retailX, lotSize, priceHigh }: { retailX: number; lotSize: number; priceHigh: number }) {
  const [lots, setLots] = useState(1);
  const amount = lots * lotSize * priceHigh;
  const chance = retailX <= 1 ? 100 : Math.min(100, (1 / retailX) * 100);
  const expectedLots = retailX <= 1 ? lots : Math.min(1, lots / retailX);
  return (
    <div className="mt-2 border-t border-border pt-2">
      <div className="flex flex-wrap items-center gap-2"><span className="text-faint">Allotment helper:</span><label className="inline-flex items-center gap-1">lots <input type="number" min={1} max={13} value={lots} onChange={(e) => setLots(Math.max(1, Number(e.target.value)))} className="input !w-16 !py-0.5 !text-xs" /></label><span className="tnum">blocks {money(amount)} via ASBA/UPI</span></div>
      <div className="mt-1 text-faint">Retail {retailX.toFixed(2)}× → {retailX <= 1 ? "full allotment likely" : `about ${chance.toFixed(0)}% chance of one lot by lottery (bidding more lots does not raise it when oversubscribed)`}; expected lots ≈ {expectedLots.toFixed(2)}.</div>
    </div>
  );
}
