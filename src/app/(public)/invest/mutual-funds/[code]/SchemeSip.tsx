"use client";
import { useState } from "react";
import { sipFutureValue } from "@/lib/calculators";
import { money } from "@/lib/format";

// Per-scheme SIP projection seeded with the scheme's own 3-year return; the user can change every input.
export default function SchemeSip({ ratePct, minSip }: { ratePct: number; minSip: number }) {
  const [monthly, setMonthly] = useState(Math.max(minSip, 5000));
  const [years, setYears] = useState(10);
  const [rate, setRate] = useState(Math.round(ratePct * 10) / 10);
  const out = sipFutureValue(monthly, rate, years);
  return (
    <div className="glass p-5">
      <div className="font-display font-semibold">SIP projection for this scheme</div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <label>Monthly (₹)<input type="number" min={minSip} step={500} value={monthly} onChange={(e) => setMonthly(Number(e.target.value))} className="input mt-1 w-full" /></label>
        <label>Years<input type="number" min={1} max={40} value={years} onChange={(e) => setYears(Number(e.target.value))} className="input mt-1 w-full" /></label>
        <label>Return % p.a.<input type="number" step={0.5} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="input mt-1 w-full" /></label>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm"><dt className="text-muted">Invested</dt><dd className="tnum">{money(out.invested)}</dd><dt className="text-muted">Projected value</dt><dd className="tnum font-semibold text-profit">{money(out.value)}</dd><dt className="text-muted">Wealth gained</dt><dd className="tnum">{money(out.value - out.invested)}</dd></dl>
      <p className="mt-2 text-[11px] text-faint">Formula: FV = P × ((1+i)^n − 1) / i × (1+i), monthly compounding. Projection, not a promise.</p>
    </div>
  );
}
