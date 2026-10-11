"use client";
import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";

type Entity = { key: string; label: string; who: string; docs: string[]; extra: string[]; days: string; notes: string[] };
const ENTITIES: Entity[] = [
  { key: "individual", label: "Individual", who: "Resident Indian, 18 or older", docs: ["PAN (fetched and verified online)", "Aadhaar via DigiLocker for identity and address", "Bank proof: cancelled cheque or statement in your name", "Signature on white paper (photo)", "Live photo and video verification"], extra: ["Income proof for F&O, currency or commodity (6-month bank statement, ITR, salary slip, Form 16 or net-worth certificate)", "Nominee details or an explicit opt-out"], days: "Same day to 2 working days", notes: ["Mobile number should be linked to Aadhaar for the OTP step", "Joint demat accounts are supported later through the service desk"] },
  { key: "nri", label: "NRI", who: "Non-resident Indian or OCI holder", docs: ["PAN", "Passport (identity pages) and visa or OCI card", "Overseas address proof", "NRE or NRO bank account (PIS letter for NRE repatriable)", "Signature and photo", "Video verification or in-person verification through an authorised entity abroad"], extra: ["FEMA declaration", "FATCA and CRS tax residency declaration", "Nominee or opt-out"], days: "3 to 7 working days", notes: ["Intraday equity and most derivatives are not available to NRIs under FEMA", "Separate accounts are needed for repatriable and non-repatriable holdings"] },
  { key: "huf", label: "HUF", who: "Hindu Undivided Family represented by its Karta", docs: ["HUF PAN", "Karta's PAN, Aadhaar and photo", "HUF declaration listing coparceners", "HUF bank proof", "Karta's signature"], extra: ["Income proof of the HUF for derivatives", "Nomination is not applicable; the Karta represents the family"], days: "2 to 4 working days", notes: ["Only the Karta can operate the account", "The HUF's date of creation replaces date of birth"] },
  { key: "company", label: "Company", who: "Private or public limited company", docs: ["Company PAN and certificate of incorporation", "Memorandum and articles of association", "Board resolution authorising trading and naming authorised signatories", "Shareholding pattern and list of directors (DIN)", "PAN, Aadhaar and photo of every authorised signatory and of beneficial owners above 10%", "Bank proof in the company's name", "Latest audited financials or net-worth certificate"], extra: ["Ultimate beneficial owner declaration", "FATCA/CRS for the entity", "Board resolution for derivatives"], days: "5 to 10 working days", notes: ["Incorporation date must be in the past; there is no age rule for entities", "A company secretary or director must certify copies"] },
  { key: "partnership", label: "Partnership / LLP", who: "Registered partnership firm or LLP", docs: ["Firm or LLP PAN", "Partnership deed or LLP agreement and registration certificate", "Authority letter signed by all partners naming the operating partners", "PAN, Aadhaar and photo of partners", "Bank proof in the firm's name", "Financials or net-worth certificate"], extra: ["Beneficial owner declaration", "FATCA/CRS"], days: "5 to 10 working days", notes: ["Demat is opened in the names of the partners for a partnership; LLPs hold in their own name"] },
  { key: "trust", label: "Trust", who: "Registered public or private trust", docs: ["Trust PAN and registration certificate", "Trust deed", "Resolution of trustees authorising investments and naming signatories", "PAN, Aadhaar and photo of trustees and settlor", "Bank proof in the trust's name", "Financials or net-worth certificate"], extra: ["Beneficial owner declaration", "FATCA/CRS", "Confirmation that the deed permits market investments"], days: "7 to 12 working days", notes: ["Some trusts are restricted to specific instruments by their own deed; the deed is checked"] },
  { key: "minor", label: "Minor", who: "Below 18, operated by a guardian", docs: ["Minor's PAN and birth certificate", "Guardian's PAN, Aadhaar, photo and signature", "Bank account of the minor with the guardian", "Guardian's video verification"], extra: ["Court order if the guardian is not a natural parent"], days: "2 to 4 working days", notes: ["Delivery only: no intraday, no derivatives, no pledge", "On turning 18 the account is converted to an individual account after fresh KYC"] },
];
const STEPS = ["Create a login with mobile and email", "Choose the entity type and fill the profile", "Verify PAN and fetch Aadhaar from DigiLocker", "Upload bank proof, signature and income proof if needed", "Record a short video for in-person verification", "Read and e-sign the account-opening form, tariff sheet and rights document", "Nominate (or opt out) and declare FATCA", "Compliance review; UCC and demat created; welcome kit and credentials"];

export default function Checklist() {
  const [key, setKey] = useState("individual");
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const e = ENTITIES.find((x) => x.key === key)!;
  const all = [...e.docs, ...e.extra];
  const done = all.filter((d) => ticked[key + d]).length;
  return (
    <div className="grid gap-6 lg:grid-cols-[1.618fr_1fr]">
      <div>
        <div className="flex flex-wrap gap-1">{ENTITIES.map((x) => <button key={x.key} type="button" onClick={() => setKey(x.key)} className={clsx("badge !normal-case !tracking-normal", key === x.key && "badge-accent")}>{x.label}</button>)}</div>
        <div className="glass mt-4 p-5">
          <div className="flex items-start justify-between gap-3"><div><div className="font-display text-lg font-semibold">{e.label}</div><div className="text-sm text-muted">{e.who}</div></div><div className="text-right text-xs text-muted">Typical time<br /><span className="font-semibold text-text">{e.days}</span></div></div>
          <div className="mt-4 text-xs font-semibold uppercase tracking-wider text-accent">Documents · {done}/{all.length} ready</div>
          <ul className="mt-2 space-y-1.5">{e.docs.map((d) => <li key={d}><label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={!!ticked[key + d]} onChange={(ev) => setTicked((t) => ({ ...t, [key + d]: ev.target.checked }))} /><span>{d}</span></label></li>)}</ul>
          <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted">Additional, depending on segments</div>
          <ul className="mt-2 space-y-1.5">{e.extra.map((d) => <li key={d}><label className="flex items-start gap-2 text-sm text-muted"><input type="checkbox" className="mt-1" checked={!!ticked[key + d]} onChange={(ev) => setTicked((t) => ({ ...t, [key + d]: ev.target.checked }))} /><span>{d}</span></label></li>)}</ul>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-muted">{e.notes.map((n) => <li key={n}>{n}</li>)}</ul>
          <Link href="/signup" className="btn btn-primary mt-5">Start the sandbox onboarding →</Link>
        </div>
      </div>
      <div className="space-y-4">
        <div className="glass p-5"><div className="font-display font-semibold">The eight steps</div><ol className="mt-2 space-y-1.5 text-sm">{STEPS.map((s, i) => <li key={s} className="flex gap-2"><span className="w-5 shrink-0 text-accent">{i + 1}.</span><span className="text-muted">{s}</span></li>)}</ol></div>
        <div className="glass p-5"><div className="font-display font-semibold">After approval</div><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted"><li>UCC registered with the exchanges and demat opened at the depository</li><li>Welcome email with client code, tariff sheet and the rights and obligations document</li><li>Add funds from the registered bank only; first trade possible once funds clear</li><li>Segments can be added later with income proof</li></ul></div>
        <div className="rounded-xl border border-warn/40 bg-warn/10 p-5 text-sm"><div className="font-display font-semibold text-warn">Sandbox note</div><p className="mt-1 text-muted">AIRAVAT runs the full onboarding flow with simulated KYC adapters. No real KRA, CKYC, DigiLocker or depository calls are made and no real account is opened. Do not upload real identity documents.</p></div>
      </div>
    </div>
  );
}
