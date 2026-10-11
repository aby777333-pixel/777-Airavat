import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, PageHeader, SimBadge } from "@/components/ui";
import { istTime } from "@/lib/format";

export const metadata = { title: "Research ONE", description: "AIRAVAT Research ONE: Market Detective investigations, Scanner Matrix, Strategy DNA backtests with robustness, Shadow Portfolio simulation and Sentinel X early warnings. Sandbox, simulated data." };

const pillars = [
  { name: "Market Detective", status: "Sandbox live", body: "Open a case on any instrument. The evidence board is seeded with sourced facts from the sandbox engine, scanner matches and an explicit list of what data is missing. The AI Research Council then argues bull, bear and neutral cases and an auditor flags contradictions.", href: "/login?next=/app/research" },
  { name: "Scanner Matrix", status: "Sandbox live", body: "Ten system scanners (breakouts, relative strength, RSI, volume, volatility, trend alignment) evaluated every five minutes over derived metrics, plus a no-code builder for your own scans with AND/OR logic.", href: "/login?next=/app/scanners" },
  { name: "Strategy DNA", status: "Sandbox live", body: "Rule-based strategies (EMA cross, breakout, RSI reversion) backtested with next-open execution, charges and slippage, a measured fingerprint (trend dependence, cost sensitivity, regime edge) and ±20% parameter robustness.", href: "/login?next=/app/strategies" },
  { name: "Shadow Portfolio", status: "Sandbox live", body: "Hypothetical portfolios with their own cash ledger, simulated fills at the current simulated quote, charges, realised and unrealised P&L and benchmark reference. Fully isolated from the order system.", href: "/login?next=/app/shadow" },
  { name: "Sentinel X", status: "Sandbox live", body: "Deterministic early warnings on drawdown, concentration, volatility, funds utilisation and the kill switch; trade health factors; a pre-mortem before every order; and a Decision Twin comparing hold, reduce and close.", href: "/login?next=/app/sentinel" },
  { name: "Evidence Graph, Digital Twin, Financial MRI", status: "Planned", body: "Require licensed fundamentals, filings and ownership data. Designed, not started; tracked in the requirements register.", href: "/trust" },
];

export default async function ResearchPage() {
  const supabase = await createClient();
  const [{ data: scans }, { data: results }] = await Promise.all([
    supabase.from("scanners").select("code,name,description,category").eq("kind", "system").order("id"),
    supabase.from("scanner_results").select("matched_at, scanner:scanners(name), instrument:instruments(symbol)").order("matched_at", { ascending: false }).limit(8),
  ]);
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageHeader eyebrow="Research ONE" title="Evidence first. Opinions second." subtitle="An AI-assisted research environment that separates facts, estimates, hypotheses and contradictions, and never turns a conclusion into an order." />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pillars.map((p) => (
          <Link key={p.name} href={p.href} className={p.status === "Planned" ? "glass p-6" : "m-crystal magnetic p-6"}>
            <div className="flex items-start justify-between gap-2"><div className="font-display font-semibold">{p.name}</div><Badge tone={p.status === "Planned" ? "default" : "ok"}>{p.status}</Badge></div>
            <p className="mt-2 text-sm text-muted">{p.body}</p>
          </Link>
        ))}
      </div>
      <div className="mt-10 grid gap-5 lg:grid-cols-[1.618fr_1fr]">
        <div className="glass p-6">
          <div className="flex items-center gap-2"><h2 className="font-display text-lg font-semibold">System scanners</h2><SimBadge /></div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">{(scans ?? []).map((s) => <li key={s.code} className="rounded-lg border border-border p-3 text-sm"><div className="font-medium">{s.name} <Badge>{s.category}</Badge></div><div className="text-xs text-muted">{s.description}</div></li>)}</ul>
        </div>
        <div className="glass p-6">
          <h2 className="font-display text-lg font-semibold">Latest matches</h2>
          <ul className="mt-3 space-y-2 text-sm">{(results ?? []).map((r, i) => { const s = (Array.isArray(r.scanner) ? r.scanner[0] : r.scanner) as { name: string } | null; const ins = (Array.isArray(r.instrument) ? r.instrument[0] : r.instrument) as { symbol: string } | null; return <li key={i} className="flex justify-between"><span>{ins?.symbol}</span><span className="text-xs text-muted">{s?.name} · {istTime(r.matched_at, false)}</span></li>; })}{(results ?? []).length === 0 && <li className="text-muted">No matches yet today.</li>}</ul>
          <p className="mt-3 text-xs text-faint">Matches are observations with recorded conditions. They are not recommendations and have no verified predictive value.</p>
        </div>
      </div>
    </div>
  );
}
