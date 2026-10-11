"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { submitKycEntity } from "../kyc/actions";

type Entity = "individual" | "nri" | "huf" | "company" | "partnership" | "llp" | "trust";
const ENTITIES: [Entity, string, string][] = [["individual", "Resident individual", "PAN, address, bank, IPV, eSign"], ["nri", "Non-resident Indian", "Passport, PIS/NRO, FATCA/CRS, overseas address"], ["huf", "Hindu Undivided Family", "HUF PAN, karta, deed"], ["company", "Company", "CIN, board resolution, signatories, UBOs"], ["partnership", "Partnership firm", "Deed, partners' KYC, authority letter"], ["llp", "LLP", "LLPIN, agreement, designated partners"], ["trust", "Trust", "Deed, trustees' KYC, resolution"]];
const DOCS: Record<Entity, { code: string; name: string }[]> = {
  individual: [{ code: "PAN", name: "PAN card" }, { code: "ADDRESS", name: "Address proof (Aadhaar/passport/voter id/DL)" }, { code: "BANK", name: "Cancelled cheque or bank statement" }, { code: "PHOTO", name: "Photograph / IPV" }, { code: "SIGNATURE", name: "Signature" }],
  nri: [{ code: "PAN", name: "PAN card" }, { code: "PASSPORT", name: "Passport with visa / OCI" }, { code: "OVERSEAS_ADDRESS", name: "Overseas address proof" }, { code: "PIS", name: "PIS permission letter (NRE) or NRO declaration" }, { code: "NRE_NRO_BANK", name: "NRE/NRO bank proof" }, { code: "FATCA", name: "FATCA/CRS declaration" }, { code: "PHOTO", name: "Photograph / IPV" }],
  huf: [{ code: "HUF_PAN", name: "HUF PAN" }, { code: "KARTA_PAN", name: "Karta PAN and KYC" }, { code: "HUF_DEED", name: "HUF deed / declaration with coparceners" }, { code: "BANK", name: "HUF bank proof" }, { code: "KARTA_PHOTO", name: "Karta photograph / IPV" }],
  company: [{ code: "COMPANY_PAN", name: "Company PAN" }, { code: "COI", name: "Certificate of incorporation" }, { code: "MOA_AOA", name: "MoA and AoA" }, { code: "BOARD_RESOLUTION", name: "Board resolution for trading and authorised signatories" }, { code: "SIGNATORY_KYC", name: "KYC of authorised signatories and UBOs" }, { code: "BANK", name: "Company bank proof" }, { code: "FINANCIALS", name: "Latest audited financials / net worth" }],
  partnership: [{ code: "FIRM_PAN", name: "Firm PAN" }, { code: "DEED", name: "Registered partnership deed" }, { code: "PARTNERS_KYC", name: "KYC of all partners" }, { code: "AUTHORITY", name: "Authority letter for trading" }, { code: "BANK", name: "Firm bank proof" }],
  llp: [{ code: "LLP_PAN", name: "LLP PAN" }, { code: "LLPIN", name: "Certificate of incorporation (LLPIN)" }, { code: "LLP_AGREEMENT", name: "LLP agreement" }, { code: "PARTNERS_KYC", name: "KYC of designated partners" }, { code: "RESOLUTION", name: "Resolution for trading" }, { code: "BANK", name: "LLP bank proof" }],
  trust: [{ code: "TRUST_PAN", name: "Trust PAN" }, { code: "TRUST_DEED", name: "Trust deed / registration" }, { code: "TRUSTEES_KYC", name: "KYC of trustees" }, { code: "RESOLUTION", name: "Trustee resolution" }, { code: "BANK", name: "Trust bank proof" }],
};
const steps = ["Entity", "Identity", "Profile & address", "Bank & verification", "Nominee, tax & segments", "Documents", "Declarations & eSign"];

export default function OnboardingForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entity, setEntity] = useState<Entity>("individual");
  const [f, setF] = useState({
    full_name: defaultName, phone: "", pan: "", date_of_birth: "", line1: "", city: "", state: "", pincode: "", country: "IN",
    occupation: "Salaried", income_range: "5-10 lakh", trading_experience: "< 1 year", risk_profile: "Moderate",
    // entity details
    registration_no: "", incorporation_date: "", karta_name: "", pis_type: "NRE_PIS", signatories: "", ubo: "",
    // bank
    bank_name: "", account_number: "", ifsc: "", holder_name: "",
    // verification
    digilocker_consent: false, aadhaar_share_code: "", aadhaar_last4: "", ipv_done: false,
    // nominee / tax / segments
    nominee_name: "", nominee_rel: "", nominee_opt_out: false, tax_residency: "IN", tin: "", derivatives: false, income_proof_type: "",
    // declarations
    not_pep: false, info_true: false, sandbox_ack: false, esign: false,
  });
  const [docs, setDocs] = useState<Record<string, boolean>>({});
  const chooseEntity = (k: Entity) => { setEntity(k); setDocs({}); };
  const set = (k: keyof typeof f, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));
  const isOrg = ["company", "partnership", "llp", "trust"].includes(entity);
  const panOk = /^[A-Za-z]{5}\d{4}[A-Za-z]$/.test(f.pan) && (entity === "individual" || entity === "nri" ? /^[A-Za-z]{3}[Pp]/.test(f.pan) : entity === "huf" ? /^[A-Za-z]{3}[Hh]/.test(f.pan) : entity === "company" ? /^[A-Za-z]{3}[Cc]/.test(f.pan) : true);
  const valid = [
    true,
    f.full_name.length >= 2 && /^[6-9]\d{9}$/.test(f.phone) && panOk && (isOrg ? !!f.incorporation_date && f.registration_no.length >= 3 && f.signatories.length >= 3 : !!f.date_of_birth) && (entity !== "huf" || f.karta_name.length >= 2),
    f.line1.length >= 3 && f.city.length >= 2 && f.state.length >= 2 && (entity === "nri" ? f.country !== "IN" : /^\d{6}$/.test(f.pincode)),
    f.bank_name.length >= 2 && /^\d{9,18}$/.test(f.account_number) && /^[A-Z]{4}0[A-Z0-9]{6}$/.test(f.ifsc.toUpperCase()) && f.ipv_done,
    (f.nominee_opt_out || (f.nominee_name.length >= 2 && f.nominee_rel.length >= 2)) && (f.tax_residency === "IN" || f.tin.length >= 4) && (!f.derivatives || !!f.income_proof_type),
    DOCS[entity].every((d) => docs[d.code]),
    f.not_pep && f.info_true && f.sandbox_ack && f.esign,
  ];

  async function submit() {
    setBusy(true); setError(null);
    const payload = {
      entity_type: entity, full_name: f.full_name, phone: f.phone, pan: f.pan.toUpperCase(), date_of_birth: isOrg ? f.incorporation_date : f.date_of_birth,
      address: { line1: f.line1, city: f.city, state: f.state, pincode: f.pincode, country: f.country }, occupation: f.occupation, income_range: f.income_range, trading_experience: f.trading_experience, segments: f.derivatives ? ["EQ", "FO"] : ["EQ"],
      nominee: f.nominee_opt_out ? null : { name: f.nominee_name, relationship: f.nominee_rel }, risk_profile: f.risk_profile,
      declarations: { not_pep: f.not_pep, tax_resident_india: f.tax_residency === "IN", info_true: f.info_true, sandbox_ack: f.sandbox_ack },
      entity_details: { registration_no: f.registration_no || null, incorporation_date: f.incorporation_date || null, karta_name: f.karta_name || null, pis_type: entity === "nri" ? f.pis_type : null, authorised_signatories: isOrg ? f.signatories.split(",").map((s) => s.trim()).filter(Boolean) : undefined, ubo: f.ubo || null },
      documents: DOCS[entity].map((d) => ({ code: d.code, name: d.name, status: docs[d.code] ? "provided" : "missing", ref: docs[d.code] ? `SIM-DOC-${d.code}` : null })),
      bank: { bank_name: f.bank_name, account_number: f.account_number, ifsc: f.ifsc.toUpperCase(), holder_name: f.holder_name || f.full_name },
      digilocker: { consent: f.digilocker_consent ? "true" : "false" }, aadhaar_offline: f.aadhaar_share_code ? { share_code: f.aadhaar_share_code, aadhaar_last4: f.aadhaar_last4, xml_hash: "SIM-XML" } : undefined,
      ipv: { completed: f.ipv_done ? "true" : "false", mode: "video" }, esign: { accepted: f.esign ? "true" : "false" },
      fatca: { tax_residency: f.tax_residency, tin: f.tin || null }, nomination: { opt_out: f.nominee_opt_out ? "true" : "false" },
      derivatives_requested: f.derivatives, income_proof: f.derivatives ? { type: f.income_proof_type, reference: "SIM-INCOME" } : undefined,
    };
    const res = await submitKycEntity(payload);
    setBusy(false);
    if (!res.ok) { setError(res.error ?? "Could not submit"); return; }
    router.push("/app/kyc"); router.refresh();
  }
  const field = ({ k, label, type = "text", placeholder = "" }: { k: keyof typeof f; label: string; type?: string; placeholder?: string }) => <label key={String(k)} className="block"><span className="label">{label}</span><input className="input" type={type} value={String(f[k])} placeholder={placeholder} onChange={(e) => set(k, e.target.value)} /></label>;
  return (
    <div className="glass p-6">
      <ol className="mb-6 flex flex-wrap gap-2" aria-label="Progress">{steps.map((s, i) => <li key={s} className={clsx("rounded-full border px-3 py-1 text-xs", i === step ? "border-accent text-accent" : i < step ? "border-profit/50 text-profit" : "border-border text-faint")}>{i + 1}. {s}</li>)}</ol>
      {step === 0 && (<div className="grid gap-2 sm:grid-cols-2">{ENTITIES.map(([k, name, hint]) => <button key={k} type="button" onClick={() => chooseEntity(k)} className={clsx("rounded-xl border p-4 text-left", entity === k ? "border-accent bg-accent/10" : "border-border")}><div className="font-medium">{name}</div><div className="text-xs text-muted">{hint}</div></button>)}<p className="text-xs text-faint sm:col-span-2">Eligibility and document requirements change with the entity type. Every verification below is a sandbox simulation; the production adapters (PAN, CKYC, KRA, DigiLocker, Aadhaar offline, bank, IPV, eSign, UCC, demat) are listed as blockers.</p></div>)}
      {step === 1 && (<div className="grid gap-3 sm:grid-cols-2">
        {field({ k: "full_name", label: isOrg ? "Entity legal name" : "Full name (as on PAN)" })}{field({ k: "phone", label: "Mobile (10 digits)", placeholder: "98765 43210" })}{field({ k: "pan", label: isOrg ? "Entity PAN" : "PAN", placeholder: "ABCPE1234F" })}
        {isOrg ? <>{field({ k: "registration_no", label: entity === "company" ? "CIN" : entity === "llp" ? "LLPIN" : "Registration number" })}{field({ k: "incorporation_date", label: "Incorporation / registration date", type: "date" })}{field({ k: "signatories", label: "Authorised signatories (comma separated)" })}{field({ k: "ubo", label: "Ultimate beneficial owners (optional)" })}</> : field({ k: "date_of_birth", label: "Date of birth", type: "date" })}
        {entity === "huf" && field({ k: "karta_name", label: "Karta name" })}
        {entity === "nri" && <label className="block"><span className="label">Account route</span><select className="select" value={f.pis_type} onChange={(e) => set("pis_type", e.target.value)}><option value="NRE_PIS">NRE with PIS (repatriable)</option><option value="NRO_NON_PIS">NRO non-PIS (non-repatriable)</option></select></label>}
        {!panOk && f.pan.length >= 4 && <p className="text-xs text-warn sm:col-span-2">PAN&apos;s fourth character must match the entity type (P individual, H HUF, C company).</p>}
      </div>)}
      {step === 2 && (<div className="grid gap-3 sm:grid-cols-2">
        {field({ k: "line1", label: "Address line" })}{field({ k: "city", label: "City" })}{field({ k: "state", label: "State / province" })}
        {entity === "nri" ? <label className="block"><span className="label">Country of residence</span><input className="input" value={f.country} onChange={(e) => set("country", e.target.value.toUpperCase().slice(0, 2))} placeholder="AE" /></label> : field({ k: "pincode", label: "PIN code" })}
        <label className="block"><span className="label">Occupation / nature of business</span><select className="select" value={f.occupation} onChange={(e) => set("occupation", e.target.value)}>{["Salaried", "Self-employed", "Business", "Professional", "Retired", "Student", "Homemaker", "Trading entity"].map((o) => <option key={o}>{o}</option>)}</select></label>
        <label className="block"><span className="label">Annual income / net worth</span><select className="select" value={f.income_range} onChange={(e) => set("income_range", e.target.value)}>{["< 1 lakh", "1-5 lakh", "5-10 lakh", "10-25 lakh", "25 lakh - 1 crore", "> 1 crore"].map((o) => <option key={o}>{o}</option>)}</select></label>
        <label className="block"><span className="label">Trading experience</span><select className="select" value={f.trading_experience} onChange={(e) => set("trading_experience", e.target.value)}>{["None", "< 1 year", "1-3 years", "3-5 years", "> 5 years"].map((o) => <option key={o}>{o}</option>)}</select></label>
        <label className="block"><span className="label">Risk profile</span><select className="select" value={f.risk_profile} onChange={(e) => set("risk_profile", e.target.value)}>{["Conservative", "Moderate", "Aggressive"].map((o) => <option key={o}>{o}</option>)}</select></label>
      </div>)}
      {step === 3 && (<div className="grid gap-3 sm:grid-cols-2">
        {field({ k: "bank_name", label: "Bank name" })}{field({ k: "holder_name", label: "Account holder name", placeholder: "defaults to applicant" })}{field({ k: "account_number", label: "Account number" })}{field({ k: "ifsc", label: "IFSC", placeholder: "HDFC0001234" })}
        <p className="text-xs text-faint sm:col-span-2">Bank verification runs a simulated penny drop (format and name checks only). Pay-ins and pay-outs are restricted to verified accounts in your name.</p>
        <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={f.digilocker_consent} onChange={(e) => set("digilocker_consent", e.target.checked)} className="mt-1" /><span>DigiLocker consent: fetch masked Aadhaar and PAN (simulated; no DigiLocker session is opened).</span></label>
        {field({ k: "aadhaar_share_code", label: "Aadhaar offline XML share code (optional, 4 digits)" })}{field({ k: "aadhaar_last4", label: "Aadhaar last 4 digits (optional)" })}
        <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={f.ipv_done} onChange={(e) => set("ipv_done", e.target.checked)} className="mt-1" /><span>In-person verification completed by video (simulated; a liveness vendor is not connected).</span></label>
      </div>)}
      {step === 4 && (<div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={f.nominee_opt_out} onChange={(e) => set("nominee_opt_out", e.target.checked)} className="mt-1" /><span>I opt out of nomination (a signed declaration is recorded).</span></label>
        {!f.nominee_opt_out && <>{field({ k: "nominee_name", label: "Nominee name" })}{field({ k: "nominee_rel", label: "Relationship" })}</>}
        <label className="block"><span className="label">Tax residency (FATCA/CRS)</span><select className="select" value={f.tax_residency} onChange={(e) => set("tax_residency", e.target.value)}><option value="IN">India only</option><option value="US">United States</option><option value="GB">United Kingdom</option><option value="AE">UAE</option><option value="SG">Singapore</option><option value="OTHER">Other</option></select></label>
        {f.tax_residency !== "IN" && field({ k: "tin", label: "Foreign TIN" })}
        <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={f.derivatives} onChange={(e) => set("derivatives", e.target.checked)} className="mt-1" /><span>Request derivatives (F&O) segment activation. Income proof is mandatory; the segment stays a sandbox flag until F&O trading is enabled.</span></label>
        {f.derivatives && <label className="block"><span className="label">Income proof type</span><select className="select" value={f.income_proof_type} onChange={(e) => set("income_proof_type", e.target.value)}><option value="">Select</option><option value="salary_slip">Salary slip</option><option value="itr">ITR acknowledgement</option><option value="form16">Form 16</option><option value="bank_statement">6-month bank statement</option><option value="holdings_statement">Demat holdings statement</option><option value="net_worth">Net worth certificate</option></select></label>}
      </div>)}
      {step === 5 && (<div className="space-y-2">{DOCS[entity].map((d) => <label key={d.code} className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm"><input type="checkbox" checked={!!docs[d.code]} onChange={(e) => setDocs((x) => ({ ...x, [d.code]: e.target.checked }))} className="mt-1" /><span>{d.name}<div className="text-xs text-faint">Mark as provided (sandbox: no upload is stored; a document reference is recorded).</div></span></label>)}</div>)}
      {step === 6 && (<div className="space-y-2 text-sm">
        {[["not_pep", "I am not a politically exposed person and I am not related to one."], ["info_true", "The information provided is true and complete; I will inform AIRAVAT of changes."], ["sandbox_ack", "I understand this is a simulated environment: no real account is opened and no real money is involved."], ["esign", "eSign: I accept the account opening form, tariff sheet, rights and obligations and risk disclosure (simulated signature with timestamp)."]].map(([k, t]) => <label key={k} className="flex items-start gap-2"><input type="checkbox" checked={Boolean(f[k as keyof typeof f])} onChange={(e) => set(k as keyof typeof f, e.target.checked)} className="mt-1" /><span>{t}</span></label>)}
      </div>)}
      {error && <p className="mt-4 text-sm text-loss" role="alert">{error}</p>}
      <div className="mt-6 flex justify-between">
        <button className="btn btn-ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0 || busy}>Back</button>
        {step < steps.length - 1 ? <button className="btn btn-primary" onClick={() => setStep(step + 1)} disabled={!valid[step]}>Continue</button> : <button className="btn btn-primary" onClick={submit} disabled={!valid[step] || busy}>{busy ? "Submitting…" : "Submit application"}</button>}
      </div>
    </div>
  );
}
