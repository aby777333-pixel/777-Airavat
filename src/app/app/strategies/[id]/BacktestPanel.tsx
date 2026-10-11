"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { runStrategyBacktest } from "../../intel/actions";

export default function BacktestPanel({ strategyId }: { strategyId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [robust, setRobust] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  async function run() {
    setBusy(true); setMsg(null);
    const r = await runStrategyBacktest(strategyId, robust);
    setBusy(false);
    if (!r.ok) { setMsg(r.error ?? "Backtest failed"); return; }
    const d = r.data as { trades: unknown[]; metrics: { cagr_pct: number } };
    setMsg(`Done. CAGR ${d.metrics.cagr_pct}% on simulated candles.`); router.refresh();
  }
  return (
    <div className="space-y-3 text-sm">
      <label className="flex items-center gap-2"><input type="checkbox" checked={robust} onChange={(e) => setRobust(e.target.checked)} /> Include ±20% parameter robustness sweep</label>
      <button type="button" className="btn btn-primary btn-sm" onClick={run} disabled={busy}>{busy ? "Running engine…" : "Run backtest"}</button>
      {msg && <p className="text-xs text-muted" role="status">{msg}</p>}
      <p className="text-xs text-faint">The engine runs server-side on the stored simulated candles and records engine version, parameters, cost model and date range with every run.</p>
    </div>
  );
}
