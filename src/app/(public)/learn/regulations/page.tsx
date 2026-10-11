import Link from "next/link";
import { metadataFor, seoFor } from "@/lib/seo";
import { Badge, Notice, PageHeader } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/site/ContentPageView";

export const metadata = { ...metadataFor("/learn/regulations") };
const TOPICS = [
  { title: "Peak margin and upfront margin", tag: "Margins", body: "Brokers must collect the full margin before an order and verify it at the day's peak exposure. Shortfalls attract penalties passed to the client. Leverage offered by brokers is therefore bounded by exchange margins.", source: "SEBI circulars on margin collection (2020–2021)", href: "https://www.sebi.gov.in" },
  { title: "T+1 settlement and the move toward T+0", tag: "Settlement", body: "Equity settlement moved to T+1 in phases; an optional T+0 cycle for select scrips followed. Faster settlement reduces counterparty risk and frees funds sooner.", source: "Exchange and SEBI circulars on settlement cycles", href: "https://www.nseindia.com" },
  { title: "Running account settlement", tag: "Funds", body: "Brokers must settle unused client funds back to the bank account at least once a quarter (monthly on request). Idle money cannot sit with the broker indefinitely.", source: "SEBI circular on running account settlement", href: "https://www.sebi.gov.in" },
  { title: "Pledge and re-pledge mechanism", tag: "Collateral", body: "Client securities used as margin are pledged in the client's own demat account and re-pledged to the clearing corporation; brokers cannot pool client shares.", source: "SEBI circular on margin pledge", href: "https://www.sebi.gov.in" },
  { title: "Investor charter", tag: "Rights", body: "Every intermediary publishes a charter of services, timelines and grievance steps. Brokers must display complaint statistics monthly.", source: "SEBI investor charter framework", href: "https://www.sebi.gov.in" },
  { title: "SCORES 2.0 and SMART ODR", tag: "Grievance", body: "Complaints go to the intermediary first, then SCORES with defined timelines, then online conciliation and arbitration through SMART ODR.", source: "SEBI SCORES and ODR circulars", href: "https://scores.sebi.gov.in" },
  { title: "KYC: KRA validation, re-KYC and nomination", tag: "Account", body: "KYC records are validated by KRAs; periodic updates are required; nomination or an explicit opt-out is mandatory for demat and trading accounts.", source: "SEBI KYC and nomination circulars", href: "https://www.sebi.gov.in" },
  { title: "F&O suitability and risk disclosures", tag: "Derivatives", body: "Brokers must display the risk disclosure that a large majority of individual F&O traders lose money, and verify income proof for derivatives activation.", source: "SEBI risk disclosure framework", href: "https://www.sebi.gov.in" },
  { title: "Surveillance measures (ASM/GSM)", tag: "Surveillance", body: "Exchanges place stocks under graded surveillance with higher margins, periodic call auctions and trade-for-trade settlement to curb manipulation.", source: "Exchange surveillance frameworks", href: "https://www.nseindia.com" },
  { title: "Algo and API trading rules", tag: "Technology", body: "Exchange-approved algos, order tagging, API access controls and rate limits apply to retail algorithmic trading; brokers remain responsible for risk checks.", source: "SEBI framework for retail algo trading", href: "https://www.sebi.gov.in" },
  { title: "Charges transparency", tag: "Charges", body: "Brokers must publish their charge schedule and pass exchange levies on actuals; contract notes list every component.", source: "SEBI and exchange circulars on charges", href: "https://www.sebi.gov.in" },
  { title: "Authorised persons and partners", tag: "Distribution", body: "Sub-brokers were replaced by exchange-registered authorised persons; influencer and finfluencer promotions are restricted.", source: "SEBI circulars on authorised persons and advertising", href: "https://www.sebi.gov.in" },
];

export default function Regulations() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/academy", label: "Learn" }, { href: "/learn/regulations", label: "Regulation explained" }]} />
      <PageHero variant="trust" intro={seoFor("/learn/regulations").intro}><PageHeader eyebrow="Learn" title="Regulation explained" subtitle="The rules that shape every order, in plain language, with pointers to the official sources" /></PageHero>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {TOPICS.map((t) => <article key={t.title} className="glass p-5"><div className="flex items-start justify-between gap-2"><h2 className="font-display font-semibold">{t.title}</h2><Badge tone="info">{t.tag}</Badge></div><p className="mt-2 text-sm text-muted">{t.body}</p><a href={t.href} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-accent">{t.source} ↗</a></article>)}
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="glass p-5"><div className="font-display font-semibold">How AIRAVAT applies these</div><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted"><li>Fail-closed risk engine with upfront margin checks (<Link href="/app/risk" className="underline">risk page</Link>).</li><li>Running-account settlement, pledges and refunds through the <Link href="/admin/backoffice" className="underline">back office</Link> with maker-checker.</li><li>Investor charter, grievance process and SCORES escalation on the <Link href="/contact" className="underline">contact page</Link>.</li><li>Charges published in full with every contract note.</li></ul></div>
        <div className="glass p-5"><div className="font-display font-semibold">Digest, not the rulebook</div><p className="mt-2 text-sm text-muted">These summaries are educational and may lag the latest circular. The official text on sebi.gov.in and the exchange websites prevails. AIRAVAT&apos;s own regulatory register tracks the obligations that apply to it.</p><Link href="/trust" className="mt-2 inline-block text-xs text-accent">Trust Centre →</Link></div>
      </div>
      <div className="mt-5"><Notice tone="info">No SEBI registration or exchange membership is claimed; this page explains the framework a licensed broker operates under.</Notice></div>
    </div>
  );
}
