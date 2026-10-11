"use client";
import { useState } from "react";
import { requestWithdrawal, sandboxDeposit } from "../actions";
import { money } from "@/lib/format";

export default function FundsForms({ withdrawable }: { withdrawable: number }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function run(fn: (f: FormData) => Promise<{ ok: boolean; error?: string }>, f: FormData, okText: string) {
    setBusy(true); setMsg(null);
    const r = await fn(f);
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: okText } : { ok: false, text: r.error ?? "Failed" });
  }
  return (
    <div className="space-y-4">
      <form className="glass p-5" action={(f) => run(sandboxDeposit, f, "Simulated deposit credited to your ledger.")}>
        <div className="font-display text-sm font-semibold">Add simulated funds</div>
        <p className="mt-1 text-xs text-muted">No real money. Capped at ₹1 crore ledger balance. Posts Dr Client Bank / Cr Client Funds Payable.</p>
        <div className="mt-3 flex flex-wrap gap-2">{[100000, 500000, 1000000].map((a) => <button key={a} name="amount" value={a} className="btn btn-ghost btn-sm" disabled={busy}>{money(a, { decimals: false })}</button>)}</div>
        <div className="mt-3 flex gap-2"><input className="input tnum" name="amount" type="number" min={1} step={1} placeholder="Custom amount" /><button className="btn btn-primary" disabled={busy}>Deposit</button></div>
      </form>
      <form className="glass p-5" action={(f) => run(requestWithdrawal, f, "Withdrawal request submitted for operations approval.")}>
        <div className="font-display text-sm font-semibold">Request withdrawal</div>
        <p className="mt-1 text-xs text-muted">Withdrawable now: {money(withdrawable)}. Approved by a different staff member; funds are reserved while pending.</p>
        <div className="mt-3 flex gap-2"><input className="input tnum" name="amount" type="number" min={1} step={1} max={withdrawable} placeholder="Amount" /><button className="btn btn-ghost" disabled={busy || withdrawable <= 0}>Request</button></div>
      </form>
      {msg && <div className={msg.ok ? "rounded-xl border border-profit/40 bg-profit/10 p-3 text-sm text-profit" : "rounded-xl border border-loss/40 bg-loss/10 p-3 text-sm text-loss"} role="status">{msg.text}</div>}
    </div>
  );
}
