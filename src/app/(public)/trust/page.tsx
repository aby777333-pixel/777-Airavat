import PageHero from "@/components/site/PageHero";
import { seoFor, metadataFor } from "@/lib/seo";
import Link from "next/link";
import { PageHeader, Badge, Notice } from "@/components/ui";
import { getMarketStatus } from "@/lib/market";

export const metadata = { ...metadataFor("/trust") };

const identity = [
  ["Registered legal name", "Not yet incorporated / placeholder"],
  ["SEBI stock broker registration", "Not obtained"],
  ["NSE / BSE / MCX membership", "Not obtained"],
  ["Depository participant (CDSL/NSDL)", "Not obtained"],
  ["Clearing arrangement", "Not obtained"],
  ["Market data licence", "None — sandbox uses synthetic data"],
  ["Compliance officer", "Not appointed"],
  ["Registered office", "Placeholder"],
];

export default async function Trust() {
  const ms = await getMarketStatus();
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6">
      <PageHero variant="trust" intro={seoFor("/trust").intro}><PageHeader eyebrow="Trust Centre" title="Exactly what AIRAVAT is, and is not, today" subtitle="We publish only verified facts. There are no trust badges here because none have been earned yet." /></PageHero>
      <Notice tone="warn">AIRAVAT is a technology platform in sandbox development. It is not a registered stock broker and cannot accept real funds or real orders.</Notice>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <section className="glass p-6">
          <h2 className="font-display text-lg font-semibold">Regulatory identity</h2>
          <table className="table mt-3 text-sm">
            <tbody>{identity.map(([k, v]) => <tr key={k}><td>{k}</td><td className="text-right"><Badge tone="bad">{v}</Badge></td></tr>)}</tbody>
          </table>
        </section>
        <section className="glass p-6">
          <h2 className="font-display text-lg font-semibold">Service status</h2>
          <table className="table mt-3 text-sm">
            <tbody>
              <tr><td>Environment</td><td className="text-right"><Badge tone="sim">Sandbox</Badge></td></tr>
              <tr><td>Market data</td><td className="text-right"><Badge tone="sim">Simulated</Badge></td></tr>
              <tr><td>Session</td><td className="text-right"><Badge tone={ms.status === "OPEN" ? "ok" : "info"}>{ms.status}</Badge></td></tr>
              <tr><td>Exchange connectivity</td><td className="text-right"><Badge tone="bad">None</Badge></td></tr>
              <tr><td>Bank / payment rails</td><td className="text-right"><Badge tone="bad">None</Badge></td></tr>
              <tr><td>Live trading</td><td className="text-right"><Badge tone="bad">Disabled by gate</Badge></td></tr>
            </tbody>
          </table>
        </section>
        <section className="glass p-6">
          <h2 className="font-display text-lg font-semibold">Investor protection and security</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
            <li>Row-level security isolates every client&apos;s data; staff roles are explicit and audited.</li>
            <li>Financial actions run server-side in transactional database functions. The browser is never the source of truth.</li>
            <li>Withdrawals require approval by a different staff member than the requester (maker-checker).</li>
            <li>Secrets live only in server environment variables. AI providers never receive your ledger or identity documents.</li>
            <li>Not yet implemented: MFA, passkeys, device binding, penetration testing, SOC/ISO audits, DR drills.</li>
          </ul>
        </section>
        <section className="glass p-6">
          <h2 className="font-display text-lg font-semibold">Grievances and disclosures</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
            <li>Raise a ticket from <Link className="text-accent underline" href="/app/support">Support</Link>; it is tracked with timestamps and a status.</li>
            <li>SCORES / ODR registration: not applicable until registration is obtained.</li>
            <li>Read the draft <Link className="text-accent underline" href="/legal/risk-disclosure">Risk Disclosure</Link>, <Link className="text-accent underline" href="/legal/terms-of-use">Terms</Link> and <Link className="text-accent underline" href="/legal/privacy-policy">Privacy Policy</Link>. All are marked as drafts pending counsel review.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
