"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WarRoom({ caseId }: { caseId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function convene() {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/research/warroom", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ case_id: caseId }) });
      const d = await r.json();
      if (!r.ok) setMsg(d.error ?? "War Room unavailable."); else { setMsg("Council findings recorded."); router.refresh(); }
    } catch { setMsg("Network error."); } finally { setBusy(false); }
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className="btn btn-primary btn-sm" onClick={convene} disabled={busy}>{busy ? "Council deliberating…" : "Convene War Room"}</button>
      {msg && <span className="text-xs text-muted" role="status">{msg}</span>}
    </div>
  );
}
