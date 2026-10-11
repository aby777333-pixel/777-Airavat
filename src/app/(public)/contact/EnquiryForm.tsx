"use client";
import { useState } from "react";
import { submitEnquiry, type EnquiryResult } from "./actions";

const KINDS = [
  ["account_opening", "Opening an account (individual, NRI, HUF, company, partnership, LLP, trust)"],
  ["trading_platforms", "Trading platforms, Terminal X, orders and charts"],
  ["pricing", "Brokerage, charges and plans"],
  ["partnership", "Partner, sub-broker, franchise or introducer programme"],
  ["api_developer", "Developer APIs and algo trading"],
  ["corporate", "Corporate, institutional or family-office desk"],
  ["media", "Media and press"],
  ["careers", "Careers"],
  ["grievance", "Grievance or complaint"],
  ["feedback", "Feedback and suggestions"],
  ["other", "Something else"],
];
const STATES = ["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman & Nicobar", "Chandigarh", "Dadra & Nagar Haveli and Daman & Diu", "Delhi", "Jammu & Kashmir", "Ladakh", "Lakshadweep", "Puducherry", "Outside India"];
const LANGS = [["en", "English"], ["hi", "हिन्दी"], ["ta", "தமிழ்"], ["te", "తెలుగు"], ["kn", "ಕನ್ನಡ"], ["ml", "മലയാളം"], ["mr", "मराठी"], ["bn", "বাংলা"], ["gu", "ગુજરાતી"], ["pa", "ਪੰਜਾਬੀ"]];
const SEGMENTS = [["EQ", "Equity (delivery / intraday)"], ["FO", "Futures & Options"], ["CDS", "Currency derivatives"], ["COMM", "Commodities (MCX / NCDEX)"], ["MF", "Mutual funds & SIP"], ["IPO", "IPO & SME IPO"], ["BONDS", "Bonds, G-Secs, T-bills, SGB"], ["ETF", "ETFs, REITs & InvITs"], ["ALGO", "Algo & API trading"]];

export default function EnquiryForm({ initialKind }: { initialKind?: string }) {
  const [result, setResult] = useState<EnquiryResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState(KINDS.some(([k]) => k === initialKind) ? (initialKind as string) : "account_opening");
  const [existing, setExisting] = useState(false);
  if (result?.ok && result.data) {
    return (
      <div className="glass p-8">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Enquiry received</div>
        <div className="font-display mt-2 text-2xl">Reference {result.data.reference}</div>
        <p className="mt-3 text-sm text-muted">Keep this reference. The team replies within {result.data.sla_hours} hours on working days (Monday to Friday, 9:00 to 18:00 IST){result.data.kind === "grievance" ? "; grievances are acknowledged within 48 hours and escalate automatically if unresolved" : ""}. In the sandbox no email is sent yet: the enquiry is visible to the support desk and, if you are signed in, under your account.</p>
        <button className="btn btn-ghost btn-sm mt-5" onClick={() => setResult(null)}>Send another enquiry</button>
      </div>
    );
  }
  return (
    <form
      className="glass p-6 sm:p-8"
      action={async (f) => { setBusy(true); setResult(null); const r = await submitEnquiry(f); setBusy(false); setResult(r); if (r.ok) window.scrollTo({ top: 0, behavior: "smooth" }); }}
    >
      <fieldset disabled={busy} className="contents">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2"><span className="label">What is this about?</span>
            <select name="kind" className="select" value={kind} onChange={(e) => setKind(e.target.value)}>{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <label className="block"><span className="label">Full name</span><input name="full_name" required minLength={2} maxLength={120} className="input" autoComplete="name" /></label>
          <label className="block"><span className="label">Email</span><input name="email" type="email" maxLength={160} className="input" autoComplete="email" placeholder="you@example.com" /></label>
          <label className="block"><span className="label">Mobile (India, 10 digits)</span><input name="phone" inputMode="numeric" pattern="[6-9][0-9]{9}" className="input" autoComplete="tel" placeholder="98765 43210" /></label>
          <label className="block"><span className="label">Preferred language</span><select name="preferred_language" className="select" defaultValue="en">{LANGS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></label>
          <label className="block"><span className="label">City</span><input name="city" maxLength={80} className="input" autoComplete="address-level2" /></label>
          <label className="block"><span className="label">State / UT</span><select name="state" className="select" defaultValue=""><option value="">Select</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="existing_client" checked={existing} onChange={(e) => setExisting(e.target.checked)} /> I already have an AIRAVAT account</label>
          {existing && <label className="block"><span className="label">Client code (AV…)</span><input name="client_code" maxLength={20} className="input" placeholder="AV100024" /></label>}
          {(kind === "account_opening" || kind === "trading_platforms" || kind === "pricing" || kind === "corporate") && (
            <>
              <fieldset className="sm:col-span-2"><legend className="label">Segments of interest</legend>
                <div className="mt-1 grid gap-1 sm:grid-cols-3">{SEGMENTS.map(([k, l]) => <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" name="segments" value={k} /> {l}</label>)}</div></fieldset>
              <label className="block"><span className="label">Investment horizon</span><select name="horizon" className="select" defaultValue=""><option value="">Select</option><option>Intraday</option><option>Swing (days to weeks)</option><option>Positional (months)</option><option>Long-term (years)</option><option>Mixed</option></select></label>
              <label className="block"><span className="label">Approximate capital</span><select name="capital_range" className="select" defaultValue=""><option value="">Prefer not to say</option><option>Under ₹1 lakh</option><option>₹1–5 lakh</option><option>₹5–25 lakh</option><option>₹25 lakh – 1 crore</option><option>Over ₹1 crore</option></select></label>
            </>
          )}
          {kind === "partnership" && <label className="block sm:col-span-2"><span className="label">Your current business</span><select name="horizon" className="select" defaultValue=""><option value="">Select</option><option>Independent financial adviser</option><option>Mutual fund distributor</option><option>Sub-broker / authorised person with another broker</option><option>Insurance / loan agent</option><option>Content creator / educator</option><option>Fintech or software company</option><option>Other</option></select></label>}
          {kind === "api_developer" && <label className="block sm:col-span-2"><span className="label">Use case</span><select name="horizon" className="select" defaultValue=""><option value="">Select</option><option>Personal algo trading</option><option>Strategy platform / vendor</option><option>Portfolio tracking app</option><option>Market data research</option><option>Other</option></select></label>}
          {kind === "grievance" && <label className="block sm:col-span-2"><span className="label">Nature of the grievance</span><select name="horizon" className="select" defaultValue=""><option value="">Select</option><option>Order execution</option><option>Charges or ledger entry</option><option>Funds pay-in / pay-out</option><option>KYC or account status</option><option>Platform availability</option><option>Conduct of staff or partner</option><option>Other</option></select></label>}
          <label className="block"><span className="label">How did you hear about AIRAVAT?</span><select name="heard_from" className="select" defaultValue=""><option value="">Select</option><option>Search engine</option><option>Social media</option><option>Friend or colleague</option><option>Partner / introducer</option><option>News or article</option><option>Event</option><option>Other</option></select></label>
          <label className="block"><span className="label">Preferred callback slot (IST)</span><select name="callback_slot" className="select" defaultValue=""><option value="">No call needed</option><option>09:00–11:00</option><option>11:00–13:00</option><option>13:00–15:00</option><option>15:00–18:00</option></select></label>
          <label className="block sm:col-span-2"><span className="label">Subject</span><input name="subject" maxLength={140} className="input" /></label>
          <label className="block sm:col-span-2"><span className="label">Your message</span><textarea name="message" required minLength={10} maxLength={4000} rows={6} className="input" placeholder="Tell us what you need. For grievances include dates, order or ledger references and what you expect as a resolution." /></label>
          <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" name="consent_contact" required className="mt-1" /><span>I agree to be contacted about this enquiry by email or phone, and I have read the <a className="underline" href="/legal/privacy-policy" target="_blank">privacy policy</a>. Required.</span></label>
          <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" name="consent_marketing" className="mt-1" /><span>I would also like product updates and market education from AIRAVAT (optional; withdraw any time).</span></label>
        </div>
        {result && !result.ok && <div role="alert" className="mt-4 text-sm text-loss">{result.error}</div>}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button className="btn btn-primary" type="submit">{busy ? "Sending…" : "Send enquiry"}</button>
          <span className="text-xs text-faint">No attachments are accepted here; the support desk will ask for documents through a secure channel if needed.</span>
        </div>
      </fieldset>
    </form>
  );
}
