"use client";
import { useState } from "react";

export default function LeadForm({ source, title, subtitle }: { source: string; title: string; subtitle?: string }) {
  const [state, setState] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setState(null);
    const f = new FormData(e.currentTarget);
    const body = { full_name: f.get("full_name"), email: f.get("email") || "", phone: f.get("phone") || "", interest: f.get("interest") || "", consent_marketing: f.get("consent") === "on", source, website: f.get("website") || "" };
    try {
      const r = await fetch("/api/leads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      setState(r.ok ? { ok: true, text: "Thank you. Your enquiry is recorded; we will only contact you through the channel you consented to." } : { ok: false, text: d.error ?? "Could not submit." });
    } catch { setState({ ok: false, text: "Network error." }); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="m-frost p-6">
      <div className="font-display text-base font-semibold">{title}</div>
      {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
      <div className="mt-3 space-y-3">
        <input className="input" name="full_name" placeholder="Full name" required minLength={2} aria-label="Full name" />
        <input className="input" name="email" type="email" placeholder="Email" aria-label="Email" />
        <input className="input" name="phone" placeholder="Mobile (10 digits)" pattern="[6-9][0-9]{9}" aria-label="Mobile" />
        <input className="input" name="interest" placeholder="What are you interested in?" aria-label="Interest" />
        <input className="hidden" name="website" tabIndex={-1} autoComplete="off" />
        <label className="flex items-start gap-2 text-xs text-muted"><input type="checkbox" name="consent" className="mt-0.5" /> I consent to being contacted about AIRAVAT. No marketing is sent without this consent; DND preferences are respected.</label>
      </div>
      {state && <p className={state.ok ? "mt-3 text-xs text-profit" : "mt-3 text-xs text-loss"} role="status">{state.text}</p>}
      <button className="btn btn-primary mt-4" disabled={busy}>{busy ? "Sending…" : "Send enquiry"}</button>
    </form>
  );
}
