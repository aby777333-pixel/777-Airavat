import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { nowMs } from "@/lib/time";
import { metadataFor, seoFor } from "@/lib/seo";
import { Badge, Notice, PageHeader, SimBadge } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/site/ContentPageView";
import AutoRefresh from "./AutoRefresh";

export const metadata = { ...metadataFor("/status") };
export const dynamic = "force-dynamic";

type Tone = "ok" | "bad" | "info" | "sim" | "default";

export default async function StatusPage() {
  const supabase = await createClient();
  const t0 = nowMs();
  const [{ data: ms, error }, { data: q }, { count: instCount }] = await Promise.all([
    supabase.rpc("market_status"),
    supabase.from("quotes").select("updated_at").order("updated_at", { ascending: false }).limit(1),
    supabase.from("instruments").select("id", { count: "exact", head: true }),
  ]);
  const latency = nowMs() - t0;
  const lastTick = q?.[0]?.updated_at ? new Date(q[0].updated_at) : null;
  const ageMin = lastTick ? Math.round((nowMs() - lastTick.getTime()) / 60000) : null;
  const m = (ms ?? null) as { status?: string; accepting_orders?: boolean } | null;
  const feedStale = ageMin !== null && ageMin > 5 && !!m?.accepting_orders;
  const overall: Tone = error ? "bad" : feedStale ? "info" : "ok";
  const rows: { name: string; state: string; tone: Tone; note: string }[] = [
    { name: "Database and engine", state: error ? "Unreachable" : "Operational", tone: error ? "bad" : "ok", note: error ? error.message : `${latency} ms round trip` },
    { name: "Simulated market feed", state: feedStale ? "Stale" : "Ticking", tone: feedStale ? "info" : "sim", note: lastTick ? `last tick ${ageMin} min ago · ${m?.status ?? "?"} session` : "no ticks recorded" },
    { name: "Order routing (simulated exchange)", state: m?.accepting_orders ? "Accepting" : "Closed", tone: m?.accepting_orders ? "sim" : "info", note: "orders match against the sandbox book" },
    { name: "Risk engine and surveillance", state: error ? "Unknown" : "Operational", tone: error ? "bad" : "ok", note: "MTM scan every 5 min, surveillance every 15 min, settlement cycle daily" },
    { name: "Web app and public site", state: "Operational", tone: "ok", note: "you are reading it" },
    { name: "AI assistants (LIVE, BHASHA)", state: process.env.ANTHROPIC_API_KEY ? "Configured" : "Not configured", tone: process.env.ANTHROPIC_API_KEY ? "ok" : "info", note: `translation ${process.env.SARVAM_API_KEY ? "configured" : "not configured"}` },
    { name: "Exchange connectivity", state: "None", tone: "bad", note: "no NSE, BSE or MCX connectivity exists" },
    { name: "Bank and payment rails", state: "None", tone: "bad", note: "deposits and withdrawals are simulated" },
    { name: "Live trading gate", state: "Disabled", tone: "bad", note: "cannot be enabled from any interface" },
  ];
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/trust", label: "Trust Centre" }, { href: "/status", label: "Status" }]} />
      <PageHero variant="trust" intro={seoFor("/status").intro}><PageHeader eyebrow="Service status" title={overall === "ok" ? "All sandbox systems operational" : overall === "info" ? "Degraded: simulated feed is stale" : "Engine unreachable"} subtitle={<>Checked live on every load <SimBadge label="Sandbox environment" /></>} /></PageHero>
      <AutoRefresh seconds={30} />
      <div className="grid gap-6 lg:grid-cols-[1.618fr_1fr]">
        <div className="glass overflow-x-auto p-5">
          <table className="table text-sm"><thead><tr><th>Component</th><th>State</th><th>Detail</th></tr></thead><tbody>{rows.map((r) => <tr key={r.name}><td className="font-medium">{r.name}</td><td><Badge tone={r.tone}>{r.state}</Badge></td><td className="text-muted">{r.note}</td></tr>)}</tbody></table>
          <p className="mt-3 text-xs text-muted">Instruments in the simulated universe: {instCount ?? "n/a"}. Machine-readable: <Link href="/api/health" className="text-accent">/api/health</Link>.</p>
        </div>
        <aside className="space-y-4">
          <div className="glass p-5"><div className="font-display font-semibold">Incident history</div><p className="mt-1 text-sm text-muted">No incidents are recorded for the sandbox. Once the platform leaves sandbox, incidents will be listed here with start, impact, root cause and fix, and a monthly uptime figure.</p></div>
          <div className="glass p-5"><div className="font-display font-semibold">Scheduled jobs</div><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted"><li>Simulated ticks during the session</li><li>RMS mark-to-market scan every 5 minutes</li><li>Surveillance scan every 15 minutes</li><li>Margin shortfall check hourly</li><li>Settlement cycle 18:30 IST, portfolio snapshots 16:05 IST, MTF interest 23:45 IST</li></ul></div>
          <div className="glass p-5"><div className="font-display font-semibold">Report a problem</div><p className="mt-1 text-sm text-muted">Use the <Link href="/contact" className="text-accent">enquiry form</Link> (feedback) or the <Link href="/company/security" className="text-accent">security disclosure</Link> route for vulnerabilities.</p></div>
          <Notice tone="info">Status reflects the sandbox only. There is no live trading, exchange link or bank rail to be up or down.</Notice>
        </aside>
      </div>
    </div>
  );
}
