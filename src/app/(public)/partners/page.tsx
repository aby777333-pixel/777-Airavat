import { Badge, Notice, PageHeader } from "@/components/ui";
import LeadForm from "@/components/site/LeadForm";

export const metadata = { title: "Partner programme", description: "Introducers, affiliates, Authorized Persons and franchise operators: distinct eligibility, permissions and compensation, with compliance approval before any plan is active." };

const categories = [
  { name: "Introducer", body: "Refers prospects through a referral link or code. No solicitation beyond approved activities; no access to client financial data.", comp: "Fixed per activation (only under a compliance-approved plan)" },
  { name: "Affiliate", body: "Runs approved campaigns with tracked links and landing pages. Content must be pre-approved; misleading promotions are prohibited.", comp: "Campaign service fees or fixed per activation" },
  { name: "Authorized Person", body: "Requires exchange approval before activation. Can be assigned client servicing where permitted.", comp: "Remuneration per approved agreement" },
  { name: "Franchise", body: "Operates under a permitted arrangement; franchise registration is not a substitute for exchange approval.", comp: "Contractual service fees" },
];

export default function Partners() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <PageHeader eyebrow="Partner Universe" title="Distribution with discipline" subtitle="Each partner category has its own eligibility, permitted activities and compensation model. Nothing pays out without a compliance-approved plan, and a suspended partner keeps earned, verified remuneration while new business stops." />
      <Notice tone="info">The partner network is in sandbox: commissions accrue in a simulated ledger and payouts are maker-checker approved. Regulatory permissibility of each compensation basis is recorded as a legal basis on every plan and must be verified before live use.</Notice>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {categories.map((c) => <div key={c.name} className="glass p-6"><div className="font-display font-semibold">{c.name}</div><p className="mt-2 text-sm text-muted">{c.body}</p><div className="mt-3 text-xs"><Badge tone="accent">Compensation</Badge> <span className="text-muted">{c.comp}</span></div></div>)}
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_1.618fr]">
        <LeadForm source="partner-enquiry" title="Partner enquiry" subtitle="Tell us who you are. A sales team member will follow up through a permitted channel; we record your consent." />
        <div className="glass p-6 text-sm text-muted">
          <div className="font-display text-base font-semibold text-text">Partner Earnings & Eligibility Passport</div>
          <p className="mt-2">Every partner gets a live passport showing approved activities, permitted channels, training validity, the active commission plan with its legal basis, referred clients, earned, pending and paid amounts, and separate flags for <strong className="text-text">access</strong>, <strong className="text-text">new business</strong>, <strong className="text-text">commission eligibility</strong> and <strong className="text-text">payout eligibility</strong>.</p>
          <p className="mt-2">Those four controls are independent by design: lapsed training stops new business without touching previously earned remuneration.</p>
        </div>
      </div>
    </div>
  );
}
