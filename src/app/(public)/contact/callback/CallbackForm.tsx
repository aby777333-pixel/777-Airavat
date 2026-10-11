"use client";
import { useState } from "react";
import { submitEnquiry, type EnquiryResult } from "../actions";

const TOPICS = [["account_opening", "Opening an account"], ["trading_platforms", "Platforms and orders"], ["pricing", "Charges and plans"], ["partnership", "Partner programme"], ["api_developer", "APIs and algos"], ["corporate", "Corporate or family office"], ["grievance", "Grievance"], ["other", "Something else"]];
const LANGS = [["en", "English"], ["hi", "हिन्दी"], ["ta", "தமிழ்"], ["te", "తెలుగు"], ["kn", "ಕನ್ನಡ"], ["ml", "മലയാളം"], ["mr", "मराठी"], ["bn", "বাংলা"], ["gu", "ગુજરાતી"]];
const WINDOWS = ["09:00–11:00", "11:00–13:00", "13:00–15:00", "15:00–17:00", "17:00–19:00"];

// Next seven working days (Mon–Sat) from a fixed "today" supplied by the server, to keep render deterministic.
function days(todayIso: string) {
  const out: { v: string; l: string }[] = []; const d = new Date(todayIso + "T00:00:00+05:30");
  while (out.length < 7) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0) out.push({ v: d.toISOString().slice(0, 10), l: d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" }) }); }
  return out;
}

export default function CallbackForm({ todayIso }: { todayIso: string }) {
  const [result, setResult] = useState<EnquiryResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"call" | "visit">("call");
  const slots = days(todayIso);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setResult(null);
    const f = new FormData(e.currentTarget);
    f.set("callback_slot", `${f.get("day")} ${f.get("window")} IST${mode === "visit" ? " (visit requested)" : ""}`);
    f.set("subject", `${mode === "visit" ? "Visit" : "Callback"} request`);
    const msg = String(f.get("message") || "").trim();
    f.set("message", msg.length >= 10 ? msg : `${mode === "visit" ? "Home/office visit" : "Callback"} requested about ${f.get("kind")}; preferred ${f.get("day")} ${f.get("window")} IST.`);
    try { setResult(await submitEnquiry(f)); } catch { setResult({ ok: false, error: "Network error. Please try again." }); } finally { setBusy(false); }
  }
  if (result?.ok && result.data) return <div className="glass p-6"><div className="font-display text-lg font-semibold text-profit">Request recorded</div><p className="mt-1 text-sm text-muted">Reference <span className="font-mono text-text">{result.data.reference}</span>. We call only from a number published on the contact page, within {result.data.sla_hours} hours, in the language you chose.</p></div>;
  return (
    <form onSubmit={onSubmit} className="glass p-6">
      <input className="hidden" name="website" tabIndex={-1} autoComplete="off" />
      <div className="flex gap-1 text-xs">{(["call", "visit"] as const).map((m) => <button key={m} type="button" onClick={() => setMode(m)} className={`badge !normal-case !tracking-normal ${mode === m ? "badge-accent" : ""}`}>{m === "call" ? "Phone callback" : "Home / office visit"}</button>)}</div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="label">Full name</span><input name="full_name" className="input" required minLength={2} /></label>
        <label className="block"><span className="label">Mobile (10 digits)</span><input name="phone" className="input" required pattern="[6-9][0-9]{9}" inputMode="numeric" /></label>
        <label className="block"><span className="label">Email (optional)</span><input name="email" type="email" className="input" /></label>
        <label className="block"><span className="label">Topic</span><select name="kind" className="select" defaultValue="account_opening">{TOPICS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label className="block"><span className="label">Preferred language</span><select name="preferred_language" className="select" defaultValue="en">{LANGS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label className="block"><span className="label">City</span><input name="city" className="input" required={mode === "visit"} /></label>
        <label className="block"><span className="label">Day</span><select name="day" className="select" defaultValue={slots[0].v}>{slots.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}</select></label>
        <label className="block"><span className="label">Window (IST)</span><select name="window" className="select" defaultValue={WINDOWS[0]}>{WINDOWS.map((w) => <option key={w}>{w}</option>)}</select></label>
        <label className="block sm:col-span-2"><span className="label">{mode === "visit" ? "Address and what needs signing" : "Anything we should prepare (optional)"}</span><textarea name="message" className="input min-h-20" required={mode === "visit"} minLength={mode === "visit" ? 10 : 0} /></label>
      </div>
      <label className="mt-3 flex items-start gap-2 text-xs text-muted"><input type="checkbox" name="consent_contact" className="mt-0.5" required /> I consent to being contacted on the number above for this request. No marketing follows.</label>
      <label className="mt-1 flex items-start gap-2 text-xs text-muted"><input type="checkbox" name="consent_marketing" className="mt-0.5" /> You may also tell me about AIRAVAT products (optional).</label>
      {result && !result.ok && <p className="mt-3 text-xs text-loss" role="alert">{result.error}</p>}
      <button className="btn btn-primary mt-4" disabled={busy}>{busy ? "Sending…" : mode === "visit" ? "Request a visit" : "Request a callback"}</button>
    </form>
  );
}
