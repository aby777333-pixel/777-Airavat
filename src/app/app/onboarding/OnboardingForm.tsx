"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { submitKyc } from "../actions";

const steps = ["Identity", "Profile", "Nominee & segments", "Declarations"];

export default function OnboardingForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    full_name: defaultName, phone: "", pan: "", date_of_birth: "", line1: "", city: "", state: "", pincode: "",
    occupation: "Salaried", income_range: "5-10 lakh", trading_experience: "< 1 year", nominee_name: "", nominee_rel: "",
    risk_profile: "Moderate", not_pep: false, tax_resident_india: false, info_true: false, sandbox_ack: false,
  });
  const set = (k: keyof typeof f, v: string | boolean) => setF({ ...f, [k]: v });

  async function submit() {
    setBusy(true); setError(null);
    const res = await submitKyc({
      full_name: f.full_name, phone: f.phone, pan: f.pan.toUpperCase(), date_of_birth: f.date_of_birth, account_type: "individual",
      address: { line1: f.line1, city: f.city, state: f.state, pincode: f.pincode },
      occupation: f.occupation, income_range: f.income_range, trading_experience: f.trading_experience, segments: ["EQ"],
      nominee: { name: f.nominee_name, relationship: f.nominee_rel }, risk_profile: f.risk_profile,
      declarations: { not_pep: f.not_pep, tax_resident_india: f.tax_resident_india, info_true: f.info_true, sandbox_ack: f.sandbox_ack },
    });
    setBusy(false);
    if (!res.ok) { setError(res.error ?? "Could not submit"); return; }
    router.push("/app");
    router.refresh();
  }

  const valid = [
    f.full_name.length >= 2 && /^[6-9]\d{9}$/.test(f.phone) && /^[A-Za-z]{5}\d{4}[A-Za-z]$/.test(f.pan) && !!f.date_of_birth,
    f.line1.length >= 3 && f.city.length >= 2 && f.state.length >= 2 && /^\d{6}$/.test(f.pincode),
    f.nominee_name.length >= 2 && f.nominee_rel.length >= 2,
    f.not_pep && f.tax_resident_india && f.info_true && f.sandbox_ack,
  ];

  return (
    <div className="glass p-6">
      <ol className="mb-6 flex flex-wrap gap-2" aria-label="Progress">
        {steps.map((s, i) => <li key={s} className={clsx("rounded-full border px-3 py-1 text-xs", i === step ? "border-accent text-accent" : i < step ? "border-profit/50 text-profit" : "border-border text-faint")}>{i + 1}. {s}</li>)}
      </ol>

      {step === 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2"><span className="label">Full name (as on PAN)</span><input className="input" value={f.full_name} onChange={(e) => set("full_name", e.target.value)} /></label>
          <label className="block"><span className="label">Mobile (10 digits)</span><input className="input tnum" inputMode="numeric" value={f.phone} onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} /></label>
          <label className="block"><span className="label">PAN</span><input className="input uppercase" maxLength={10} value={f.pan} onChange={(e) => set("pan", e.target.value.toUpperCase())} placeholder="ABCDE1234F" /></label>
          <label className="block"><span className="label">Date of birth</span><input className="input" type="date" value={f.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} /></label>
          <p className="text-xs text-faint sm:col-span-2">Format validation only. In production this step verifies PAN with the income-tax database and fetches KRA/CKYC records.</p>
        </div>
      )}
      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2"><span className="label">Address line</span><input className="input" value={f.line1} onChange={(e) => set("line1", e.target.value)} /></label>
          <label className="block"><span className="label">City</span><input className="input" value={f.city} onChange={(e) => set("city", e.target.value)} /></label>
          <label className="block"><span className="label">State</span><input className="input" value={f.state} onChange={(e) => set("state", e.target.value)} /></label>
          <label className="block"><span className="label">PIN code</span><input className="input tnum" inputMode="numeric" value={f.pincode} onChange={(e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))} /></label>
          <label className="block"><span className="label">Occupation</span><select className="select" value={f.occupation} onChange={(e) => set("occupation", e.target.value)}>{["Salaried", "Self-employed", "Business", "Student", "Retired", "Homemaker", "Other"].map((o) => <option key={o}>{o}</option>)}</select></label>
          <label className="block"><span className="label">Annual income</span><select className="select" value={f.income_range} onChange={(e) => set("income_range", e.target.value)}>{["< 1 lakh", "1-5 lakh", "5-10 lakh", "10-25 lakh", "25 lakh - 1 crore", "> 1 crore"].map((o) => <option key={o}>{o}</option>)}</select></label>
          <label className="block"><span className="label">Trading experience</span><select className="select" value={f.trading_experience} onChange={(e) => set("trading_experience", e.target.value)}>{["None", "< 1 year", "1-3 years", "3-5 years", "> 5 years"].map((o) => <option key={o}>{o}</option>)}</select></label>
          <label className="block"><span className="label">Risk profile (self-assessed)</span><select className="select" value={f.risk_profile} onChange={(e) => set("risk_profile", e.target.value)}>{["Conservative", "Moderate", "Aggressive"].map((o) => <option key={o}>{o}</option>)}</select></label>
        </div>
      )}
      {step === 2 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="label">Nominee name</span><input className="input" value={f.nominee_name} onChange={(e) => set("nominee_name", e.target.value)} /></label>
          <label className="block"><span className="label">Relationship</span><input className="input" value={f.nominee_rel} onChange={(e) => set("nominee_rel", e.target.value)} /></label>
          <div className="sm:col-span-2 rounded-xl border border-border bg-bg/40 p-4 text-sm">
            <div className="font-medium">Segments</div>
            <label className="mt-2 flex items-center gap-2"><input type="checkbox" checked readOnly /> NSE Equity cash (CNC + MIS)</label>
            <p className="mt-2 text-xs text-faint">F&O, currency and commodity segments are not available in the sandbox. They require separate eligibility checks, income proof and exchange enablement.</p>
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="space-y-3 text-sm">
          {[
            ["not_pep", "I am not a politically exposed person and I am not related to one."],
            ["tax_resident_india", "I am a tax resident of India only (FATCA/CRS declaration)."],
            ["info_true", "The information provided is true and I will update AIRAVAT of any change."],
            ["sandbox_ack", "I understand this is a SIMULATED environment: no real KYC verification, no real money, no real exchange orders."],
          ].map(([k, label]) => (
            <label key={k} className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={f[k as "not_pep"] as boolean} onChange={(e) => set(k as "not_pep", e.target.checked)} /><span className="text-muted">{label}</span></label>
          ))}
          <p className="text-xs text-faint">Each declaration is stored with your application and auditable. Pre-ticked consent is never used.</p>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-loss" role="alert">{error}</p>}
      <div className="mt-6 flex justify-between">
        <button className="btn btn-ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0 || busy}>Back</button>
        {step < steps.length - 1 ? (
          <button className="btn btn-primary" onClick={() => setStep(step + 1)} disabled={!valid[step]}>Continue</button>
        ) : (
          <button className="btn btn-primary" onClick={submit} disabled={!valid[step] || busy}>{busy ? "Submitting…" : "Submit application"}</button>
        )}
      </div>
    </div>
  );
}
