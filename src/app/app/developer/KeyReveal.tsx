"use client";
import { useState } from "react";
import type { ActionResult } from "../actions";

export default function KeyReveal({ action }: { action: (f: FormData) => Promise<ActionResult> }) {
  const [key, setKey] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  return (
    <form className="space-y-2 text-sm" action={async (f) => { setErr(null); const r = await action(f); if (!r.ok) setErr(r.error ?? "Failed"); else setKey((r.data as { key: string }).key); }}>
      <input className="input" name="name" placeholder="Key name (e.g. my-bot)" required maxLength={60} />
      <div className="flex flex-wrap gap-3 text-xs">{["read", "trade", "funds", "alerts", "partner", "admin"].map((s) => <label key={s} className="flex items-center gap-1"><input type="checkbox" name={`scope_${s}`} defaultChecked={s === "read"} /> {s}</label>)}</div>
      <button className="btn btn-primary btn-sm">Issue sandbox key</button>
      {err && <p className="text-xs text-loss">{err}</p>}
      {key && <div className="rounded-lg border border-warn/40 bg-warn/10 p-3 text-xs"><div className="font-semibold text-warn">Copy this key now; it will not be shown again.</div><code className="mt-1 block break-all">{key}</code></div>}
    </form>
  );
}
