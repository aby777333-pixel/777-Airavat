"use client";
import { useState } from "react";
import clsx from "clsx";
import { premortemCheck } from "../../intel/actions";

type Check = { check: string; value: unknown; flag: boolean; note: string };
type Result = { ok: boolean; reason?: string; checks?: Check[]; flags?: number; disclaimer?: string };

// Sentinel X pre-mortem: deterministic "what could go wrong" checks, shown on request before confirming an order.
export default function PremortemPanel({ symbol, side, product, qty }: { symbol: string; side: "BUY" | "SELL"; product: "CNC" | "MIS"; qty: number }) {
  const [res, setRes] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    const r = await premortemCheck({ symbol, side, product, qty });
    setRes(r.ok ? (r.data as Result) : { ok: false, reason: r.error });
    setBusy(false);
  }
  return (
    <div className="mb-3 rounded-lg border border-border bg-bg/40 p-2 text-xs">
      <div className="flex items-center justify-between gap-2"><span className="font-medium">Sentinel pre-mortem</span><button type="button" className="btn btn-ghost btn-sm" onClick={run} disabled={busy}>{busy ? "Checking…" : res ? "Re-run" : "Run checks"}</button></div>
      {res && !res.ok && <div className="mt-1 text-loss">{res.reason}</div>}
      {res?.ok && (
        <ul className="mt-2 space-y-1">
          {res.checks?.map((c) => <li key={c.check} className="flex items-start gap-2"><span className={clsx("mt-0.5 h-2 w-2 shrink-0 rounded-full", c.flag ? "bg-warn" : "bg-profit")} /><span><span className="font-medium">{c.check.replace(/_/g, " ")}</span>{c.value !== null && c.value !== undefined && <span className="tnum text-muted"> · {String(c.value)}</span>}<span className="text-muted"> — {c.note}</span></span></li>)}
          <li className="pt-1 text-faint">{res.flags} of {res.checks?.length} checks flagged. {res.disclaimer}</li>
        </ul>
      )}
    </div>
  );
}
