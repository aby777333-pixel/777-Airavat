import Link from "next/link";
import { metadataFor, seoFor } from "@/lib/seo";
import { Badge, Notice, PageHeader } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/site/ContentPageView";

export const metadata = { ...metadataFor("/company/security") };

const CONTROLS: [string, string][] = [
  ["Single source of truth", "All financial state lives in Postgres; the browser and the web server never compute balances or positions."],
  ["Security-definer functions only", "Orders, fills, ledger postings, pledges and settlements run inside audited database functions; clients cannot call the internal engine."],
  ["Row-level security", "Every table is protected by policies keyed to the authenticated user and their staff role; staff authorisation is checked in SQL."],
  ["Maker-checker", "Withdrawals, refunds, payouts, publishing and exceptions need a second person; the initiator cannot approve."],
  ["Immutable ledger", "Posted lines are never updated; corrections are reversal entries. The audit table records actor, target and payload for every sensitive action."],
  ["Secrets never reach the client", "AI gateway keys and service keys live on the server; the public bundle contains only the anonymous database key, which RLS constrains."],
  ["No order tools for AI", "The LIVE assistant can read and explain; it has no function to place, modify or cancel orders."],
  ["Live trading gate", "A single server-side flag, off, not toggleable from any interface, blocks any path to a real exchange, which in any case does not exist."],
  ["Fail-closed risk engine", "If a check cannot run, the order is rejected, never queued."],
  ["Offline caching limited to the static shell", "The service worker never caches app, admin, auth, markets or API responses."],
];

export default function Security() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/trust", label: "Trust Centre" }, { href: "/company/security", label: "Security" }]} />
      <PageHero variant="trust" intro={seoFor("/company/security").intro}><PageHeader eyebrow="Company" title="Security disclosures and responsible disclosure" subtitle={<>How the platform is protected, and how to tell us when it is not <Badge tone="ok">Disclosure policy active</Badge></>} /></PageHero>
      <div className="grid gap-6 lg:grid-cols-[1.618fr_1fr]">
        <div className="space-y-6">
          <section className="glass p-5"><h2 className="font-display text-lg font-semibold">Controls in place</h2><dl className="mt-3 grid gap-3 sm:grid-cols-2">{CONTROLS.map(([k, v]) => <div key={k}><dt className="text-sm font-semibold">{k}</dt><dd className="text-sm text-muted">{v}</dd></div>)}</dl></section>
          <section id="report" className="glass p-5"><h2 className="font-display text-lg font-semibold">Responsible disclosure</h2>
            <p className="mt-2 text-sm text-muted">If you find a vulnerability in the AIRAVAT sandbox, tell us before telling anyone else. Report through the <Link href="/contact?kind=feedback" className="text-accent">enquiry form</Link> with the subject &quot;Security&quot;; you receive a reference immediately and a human reply within 72 hours. A dedicated security mailbox and PGP key will be published once the legal entity exists; until then the form is the only channel and it is logged.</p>
            <h3 className="mt-4 text-sm font-semibold">In scope</h3><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted"><li>777-airavat.netlify.app and its API under /api</li><li>Authorisation bypass, RLS gaps, privilege escalation, injection, logic flaws in orders, ledger or risk checks</li><li>Secrets exposure, insecure defaults, service-worker caching of sensitive responses</li></ul>
            <h3 className="mt-4 text-sm font-semibold">Out of scope</h3><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted"><li>Denial of service, rate-limit exhaustion, automated scanning that degrades the sandbox for others</li><li>Social engineering of people, physical attacks, third-party hosting providers</li><li>Findings that require a compromised device or browser extension</li><li>Reports that simulated data is simulated (it is labelled)</li></ul>
            <h3 className="mt-4 text-sm font-semibold">Safe harbour</h3><p className="mt-1 text-sm text-muted">Good-faith research that follows this policy, avoids privacy violations and data destruction, and gives us reasonable time to fix before disclosure will not be met with legal action. Test only against your own sandbox accounts.</p>
            <h3 className="mt-4 text-sm font-semibold">What we commit to</h3><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted"><li>Acknowledge within 72 hours, triage within 7 days, fix critical issues before any other work</li><li>Credit you here if you wish, after the fix ships</li><li>No bounty programme yet; this page changes when there is one</li></ul>
          </section>
          <section className="glass p-5"><h2 className="font-display text-lg font-semibold">Known limitations, stated</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted"><li>No penetration test by an external firm has been performed yet</li><li>No SOC 2, ISO 27001 or exchange system audit exists; they are prerequisites for leaving sandbox</li><li>TOTP two-factor authentication is available and enforced for enrolled users; passkeys and recovery codes are not yet available</li><li>Rate limiting on public forms is per hour per contact, not IP-based</li></ul><Link href="/trust" className="mt-2 inline-block text-xs text-accent">Full list in the Trust Centre and known limitations →</Link></section>
        </div>
        <aside className="space-y-4">
          <div className="m-crystal p-5"><div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Report</div><div className="mt-3 flex flex-col gap-2"><Link href="/contact?kind=feedback" className="btn btn-primary">Report a vulnerability</Link><a href="/.well-known/security.txt" className="btn btn-ghost">security.txt</a><Link href="/company/policies#infosec" className="btn btn-ghost">Information security policy</Link></div></div>
          <div className="glass p-5"><div className="font-display font-semibold">Hall of thanks</div><p className="mt-1 text-sm text-muted">No external reports have been received yet. Researchers who report valid issues are listed here with their consent.</p></div>
          <Notice tone="info">Sandbox: no real funds, identities or market connectivity exist to be at risk. The controls are built as if they did.</Notice>
        </aside>
      </div>
    </div>
  );
}
