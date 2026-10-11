import Link from "next/link";
import { metadataFor, seoFor } from "@/lib/seo";
import { Badge, Notice, PageHeader } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/site/ContentPageView";
import InterestForm from "./InterestForm";

export const metadata = { ...metadataFor("/company/careers/roles") };

type Role = { title: string; team: string; location: string; summary: string; youWill: string[]; youHave: string[] };
const ROLES: Role[] = [
  { title: "Compliance Officer (SEBI stock broker)", team: "Compliance", location: "Mumbai", summary: "Own the regulatory register, PMLA programme, grievance process and exchange reporting from before registration.", youWill: ["Lead the SEBI and exchange membership applications", "Run the compliance register already built into the platform", "Be the principal officer under PMLA"], youHave: ["Experience as compliance officer at a SEBI-registered broker", "Working knowledge of exchange inspections and SCORES", "Comfort reading SQL-enforced controls with engineers"] },
  { title: "Risk Manager", team: "Risk", location: "Mumbai or remote", summary: "Own RMS policy, limits, stress tests and the kill switch, with the surveillance and margin engines already running in sandbox.", youWill: ["Set and review per-account and global limits", "Design the MTM, margin-shortfall and surveillance rules with engineering", "Run and publish stress-test results"], youHave: ["Risk experience at a broker or clearing member", "Quantitative comfort with margins (SPAN, exposure, peak margin)", "A bias for fail-closed systems"] },
  { title: "Backend Engineer (Postgres, PL/pgSQL)", team: "Engineering", location: "Remote (India)", summary: "The broking engine lives in the database. You will extend security-definer functions, ledger logic and the risk engine, with E2E SQL tests.", youWill: ["Build financial state changes as audited database functions", "Write migration-based features with rollback-safe tests", "Keep internal functions non-executable by client roles"], youHave: ["Deep Postgres: RLS, PL/pgSQL, numeric correctness, cron", "Double-entry thinking", "Care for money that is not yours"] },
  { title: "Frontend Engineer (Next.js, TypeScript)", team: "Engineering", location: "Remote (India)", summary: "Terminal, order passport, charts, PWA, accessibility and the nine-language public site.", youWill: ["Ship the trading terminal and app screens", "Keep the React compiler lint rules and accessibility targets green", "Render simulated data with honest labels everywhere"], youHave: ["Next.js App Router, React 19, Tailwind, lightweight-charts or similar", "Attention to latency and keyboard-first trading UIs"] },
  { title: "Back-office Operations Lead", team: "Operations", location: "Mumbai", summary: "Settlement, reconciliation, DP operations, client funds and the maker-checker queues.", youWill: ["Run daily settlement and reconciliation in the back-office console", "Own DP operations and corporate-action processing", "Design the exception process with compliance"], youHave: ["Broker back-office experience (settlement, DP, client funds)", "NISM certifications as applicable"] },
  { title: "Editorial Lead (markets, nine languages)", team: "Editorial", location: "Remote (India)", summary: "Daily briefings, result previews, IPO notes and regulation digests through the maker-checker CMS and BHASHA translation.", youWill: ["Write and edit dated, labelled, non-advisory content", "Run the editorial calendar and translation review", "Keep the glossary, Academy and Chart School current"], youHave: ["Financial journalism or research-desk experience", "Fluency in at least one Indian language besides English"] },
  { title: "Security Engineer", team: "Engineering", location: "Remote (India)", summary: "Threat-model the sandbox, run the disclosure programme, prepare for external audits.", youWill: ["Review RLS and function grants on every migration", "Run the responsible disclosure process", "Prepare for penetration testing and ISO 27001"], youHave: ["Application security experience, ideally with Postgres and Supabase-style stacks", "Written, calm incident communication"] },
  { title: "Customer Support Specialist (regional languages)", team: "Support", location: "Mumbai, Chennai, Hyderabad, Kolkata, Ahmedabad", summary: "Phone and ticket support in Hindi, Tamil, Telugu, Kannada, Malayalam, Marathi, Bengali or Gujarati plus English.", youWill: ["Resolve account, KYC and ledger questions with the audit trail at hand", "Own grievances to closure within the SLA", "Never give trading tips"], youHave: ["Support experience at a financial institution", "Fluency in a regional language and English", "NISM certification or willingness to obtain it"] },
];

export default function Roles() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/company/careers", label: "Careers" }, { href: "/company/careers/roles", label: "Roles" }]} />
      <PageHero variant="about" intro={seoFor("/company/careers/roles").intro}><PageHeader eyebrow="Careers" title="Roles we will hire for first" subtitle={<>Eight roles, written in full so you can decide early <Badge tone="info">Not yet open: talent pool</Badge></>} /></PageHero>
      <Notice tone="warn">No position is open today and no offer can be made before the legal entity exists. Registering interest puts you in a talent pool that is contacted only when a matching role opens.</Notice>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.618fr_1fr]">
        <div className="grid gap-4 md:grid-cols-2">{ROLES.map((r) => (
          <details key={r.title} className="glass p-5"><summary className="cursor-pointer"><span className="font-display font-semibold">{r.title}</span><span className="block text-xs text-muted">{r.team} · {r.location} · <Badge tone="default">Pipeline</Badge></span></summary>
            <p className="mt-2 text-sm text-muted">{r.summary}</p>
            <div className="mt-2 text-xs font-semibold uppercase tracking-wider text-accent">You will</div><ul className="list-disc space-y-0.5 pl-5 text-sm text-muted">{r.youWill.map((x) => <li key={x}>{x}</li>)}</ul>
            <div className="mt-2 text-xs font-semibold uppercase tracking-wider text-accent">You have</div><ul className="list-disc space-y-0.5 pl-5 text-sm text-muted">{r.youHave.map((x) => <li key={x}>{x}</li>)}</ul>
          </details>))}</div>
        <aside className="space-y-4">
          <InterestForm roles={ROLES.map((r) => r.title)} />
          <div className="glass p-5"><div className="font-display font-semibold">How we will hire</div><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted"><li>Published salary bands with every opening</li><li>One take-home exercise drawn from the real codebase, paid</li><li>No volume targets for anyone who talks to clients</li><li>Remote-first for engineering and editorial; regulated roles sit where the regulator expects them</li></ul><Link href="/company/careers" className="mt-2 inline-block text-xs text-accent">Careers overview →</Link></div>
        </aside>
      </div>
    </div>
  );
}
