import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getQuotes } from "@/lib/market";
import { istTime } from "@/lib/format";
import { Badge, Card, Notice, PageHeader } from "@/components/ui";
import StrategyForm from "./StrategyForm";

export default async function Strategies() {
  const { supabase, user } = await requireUser("/app/strategies");
  const [{ data: strategies }, quotes] = await Promise.all([
    supabase.from("strategies").select("*, runs:backtest_runs(id,created_at,metrics)").eq("owner_id", user.id).order("created_at", { ascending: false }),
    getQuotes(),
  ]);
  const symbols = quotes.filter((q) => q.segment === "EQ" && q.tradable).map((q) => q.symbol);
  return (
    <>
      <PageHeader eyebrow="Strategy DNA" title="Strategy factory" subtitle="Define rules, backtest with next-open execution and sandbox charges, read the fingerprint, test robustness. Promotion to paper trading is a Shadow Portfolio, never a live order." />
      <Notice tone="warn">Backtests run on simulated daily candles (about 300 sessions). Past simulated performance says nothing about future results; the engine reports every assumption it makes.</Notice>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.618fr]">
        <Card title="New strategy"><StrategyForm symbols={symbols} /></Card>
        <Card title={`Your strategies (${(strategies ?? []).length})`}>
          {(strategies ?? []).length === 0 ? <p className="text-sm text-muted">None yet.</p> : (
            <ul className="divide-y divide-border">
              {(strategies ?? []).map((s) => { const runs = (s.runs as { id: number; created_at: string; metrics: { cagr_pct?: number; max_drawdown_pct?: number } }[]) ?? []; const last = runs.sort((a, b) => b.created_at.localeCompare(a.created_at))[0]; return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div><Link href={`/app/strategies/${s.id}`} className="font-semibold hover:text-accent">{s.name}</Link> <Badge>{(s.rules as { type: string }).type}</Badge> <Badge tone="info">{s.status}</Badge><div className="text-xs text-muted">{(s.universe as string[]).join(", ")} · v{s.version} · {istTime(s.created_at, false)}</div></div>
                  {last && <div className="text-right text-xs text-muted">Last run CAGR {last.metrics.cagr_pct ?? "—"}% · MDD {last.metrics.max_drawdown_pct ?? "—"}%</div>}
                </li>); })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
