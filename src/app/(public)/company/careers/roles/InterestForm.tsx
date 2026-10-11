"use client";
import { useState } from "react";
import { submitEnquiry, type EnquiryResult } from "@/app/(public)/contact/actions";

export default function InterestForm({ roles }: { roles: string[] }) {
  const [result, setResult] = useState<EnquiryResult | null>(null);
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setResult(null);
    const f = new FormData(e.currentTarget);
    f.set("kind", "careers"); f.set("subject", `Talent pool: ${f.get("role")}`);
    const msg = String(f.get("message") || "").trim();
    f.set("message", msg.length >= 10 ? msg : `Interest registered for ${f.get("role")}; profile link: ${f.get("city") || "n/a"}.`);
    try { setResult(await submitEnquiry(f)); } catch { setResult({ ok: false, error: "Network error. Please try again." }); } finally { setBusy(false); }
  }
  if (result?.ok && result.data) return <div className="glass p-5"><div className="font-display font-semibold text-profit">Registered</div><p className="mt-1 text-sm text-muted">Reference {result.data.reference}. We write only when a matching role opens; no newsletters.</p></div>;
  return (
    <form onSubmit={onSubmit} className="glass p-5">
      <div className="font-display font-semibold">Join the talent pool</div>
      <input className="hidden" name="website" tabIndex={-1} autoComplete="off" />
      <div className="mt-3 space-y-2">
        <label className="block"><span className="label">Full name</span><input name="full_name" className="input" required minLength={2} /></label>
        <label className="block"><span className="label">Email</span><input name="email" type="email" className="input" required /></label>
        <label className="block"><span className="label">Role</span><select name="role" className="select" defaultValue={roles[0]}>{roles.map((r) => <option key={r}>{r}</option>)}</select></label>
        <label className="block"><span className="label">Profile link (GitHub, portfolio, LinkedIn)</span><input name="city" className="input" placeholder="https://" /></label>
        <label className="block"><span className="label">A few lines about you (optional)</span><textarea name="message" className="input min-h-20" /></label>
        <label className="flex items-start gap-2 text-xs text-muted"><input type="checkbox" name="consent_contact" className="mt-0.5" required /> You may contact me about roles. Nothing else.</label>
      </div>
      {result && !result.ok && <p className="mt-2 text-xs text-loss" role="alert">{result.error}</p>}
      <button className="btn btn-primary mt-3" disabled={busy}>{busy ? "Sending…" : "Register interest"}</button>
    </form>
  );
}
