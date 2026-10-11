"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveScanner } from "../intel/actions";

const METRICS = ["ltp", "ret_1d", "ret_5d", "ret_20d", "high_20d", "low_20d", "high_52w", "low_52w", "sma_20", "sma_50", "rsi_14", "atr_pct_14", "avg_vol_20", "vol_ratio", "dist_52w_high_pct", "rs_vs_nifty_20", "gap_pct"];
const OPS = [">", ">=", "<", "<=", "="] as const;
type Cond = { metric: string; op: (typeof OPS)[number]; mode: "value" | "metric"; value: number; metric2: string };

export default function ScannerBuilder() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logic, setLogic] = useState<"AND" | "OR">("AND");
  const [conds, setConds] = useState<Cond[]>([{ metric: "ret_5d", op: ">", mode: "value", value: 3, metric2: "sma_20" }]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const upd = (i: number, patch: Partial<Cond>) => setConds((c) => c.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  async function save() {
    setBusy(true); setMsg(null);
    const r = await saveScanner({ name, description: description || undefined, logic, conditions: conds.map((c) => (c.mode === "metric" ? { metric: c.metric, op: c.op, metric2: c.metric2 } : { metric: c.metric, op: c.op, value: c.value })) });
    setBusy(false);
    if (!r.ok) { setMsg({ ok: false, text: r.error ?? "Failed" }); return; }
    setMsg({ ok: true, text: "Saved. It runs with the next scheduled scan (every 5 minutes)." }); setName(""); router.refresh();
  }
  return (
    <div className="space-y-3 text-sm">
      <input className="input" placeholder="Scanner name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
      <input className="input" placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} />
      <div className="flex items-center gap-2 text-xs"><span className="text-muted">Combine with</span><select className="select w-auto" value={logic} onChange={(e) => setLogic(e.target.value as "AND")}><option>AND</option><option>OR</option></select></div>
      {conds.map((c, i) => (
        <div key={i} className="grid grid-cols-[1fr_auto_auto_1fr_auto] items-center gap-1 rounded-lg border border-border p-2">
          <select className="select" value={c.metric} onChange={(e) => upd(i, { metric: e.target.value })}>{METRICS.map((m) => <option key={m}>{m}</option>)}</select>
          <select className="select w-auto" value={c.op} onChange={(e) => upd(i, { op: e.target.value as Cond["op"] })}>{OPS.map((o) => <option key={o}>{o}</option>)}</select>
          <select className="select w-auto" value={c.mode} onChange={(e) => upd(i, { mode: e.target.value as "value" })}><option value="value">value</option><option value="metric">metric</option></select>
          {c.mode === "value" ? <input className="input tnum" type="number" step="any" value={c.value} onChange={(e) => upd(i, { value: Number(e.target.value) })} /> : <select className="select" value={c.metric2} onChange={(e) => upd(i, { metric2: e.target.value })}>{METRICS.map((m) => <option key={m}>{m}</option>)}</select>}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConds((x) => x.filter((_, j) => j !== i))} disabled={conds.length === 1} aria-label="Remove condition">✕</button>
        </div>
      ))}
      <div className="flex gap-2">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConds((x) => [...x, { metric: "rsi_14", op: "<", mode: "value", value: 30, metric2: "sma_50" }])} disabled={conds.length >= 8}>+ Condition</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={busy || name.trim().length < 2}>{busy ? "Saving…" : "Save scanner"}</button>
      </div>
      {msg && <p className={msg.ok ? "text-xs text-profit" : "text-xs text-loss"} role="status">{msg.text}</p>}
    </div>
  );
}
