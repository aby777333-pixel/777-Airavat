import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { requireUser } from "@/lib/auth";
import { istTime, money } from "@/lib/format";
import { Badge, Card, PageHeader } from "@/components/ui";
import BacktestPanel from "./BacktestPanel";
import type { Metrics } from "@/lib/backtest";

type Fp = Record<string, { value: number; explain: string }>;
type Rb = { runs: { label: string; total_return_pct: number; max_drawdown_pct: number; trades: number; sharpe: number }[]; return_spread_pct: number; all_positive: boolean; note: string };

export default async function StrategyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser(`/app/strategies/${id}`);
  const { data: s } = await supabase.from("strategies").select("*").eq("id", Number(id)).maybeSingle();
  if (!s) notFound();
  const { data: runs } = await supabase.from("backtest_runs").select("*").eq("strategy_id", s.id).order("created_at", { ascending: false }).limit(10);
  const last = runs?.[0];
  const m = last?.metrics as Metrics | undefined;
  const fp = last?.fingerprint as Fp | null | undefined;
  const rb = last?.robustness as Rb | null | undefined;
  const rules = s.rules as Record<string, unknown>;
  const fmt = (v: unknown) => (v === null || v === undefined ? "—" : typeof v === "number" ? v.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : String(v));
  return (
    <>
      <PageHeader eyebrow="Strategy DNA" title={s.name} subtitle={<><Badge>{String(rules.type)}</Badge> <Badge tone="info">{s.status}</Badge> · {(s.universe as string[]).join(", ")} · v{s.version}</>} action={<Link href="/app/strategies" className="btn btn-ghost btn-sm">← Strategies</Link>} />
      <div className="grid gap-5 lg:grid-cols-[1fr_1.618fr]">
        <div className="space-y-5">
          <Card title="Rules" subtitle="Exactly what the engine evaluates">
            <dl className="grid grid-cols-2 gap-1 text-sm">{Object.entries(rules).map(([k, v]) => <div key={k} className="contents"><dt className="text-muted">{k}</dt><dd className="tnum">{fmt(v)}</dd></div>)}</dl>
            <p className="mt-3 text-xs text-faint">Execution model: signals on close, fills at next open, slippage 5 bps, charges from the sandbox CNC schedule, long-only, equal allocation across the universe, no lookahead.</p>
          </Card>
          <Card title="Run backtest"><BacktestPanel strategyId={s.id} /></Card>
        </div>
        <div className="space-y-5">
          {!last ? <Card title="No runs yet"><p className="text-sm text-muted">Run a backtest to see metrics, the fingerprint and robustness.</p></Card> : (
            <>
              <Card title={`Latest run · ${istTime(last.created_at)}`} subtitle={`${last.engine_version} · ${last.start_date} → ${last.end_date} · ${last.trades_count} trades · ${last.data_source}`}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {m && ([["CAGR", `${fmt(m.cagr_pct)}%`], ["Max drawdown", `${fmt(m.max_drawdown_pct)}%`], ["Sharpe (daily, ann.)", fmt(m.sharpe)], ["Win rate", `${fmt(m.win_rate_pct)}%`], ["Profit factor", fmt(m.profit_factor)], ["Total return", `${fmt(m.total_return_pct)}%`], ["Trades", fmt(m.trades)], ["Final equity", money(m.final_equity)]] as [string, string][]).map(([k, v]) => <div key={k} className="rounded-lg border border-border bg-bg/30 p-3"><div className="text-xs text-muted">{k}</div><div className="tnum font-display text-lg font-semibold">{v}</div></div>)}
                </div>
              </Card>
              {fp && (
                <Card title="Fingerprint" subtitle="Measured from this run; every number carries its definition">
                  <ul className="space-y-2 text-sm">{Object.entries(fp).map(([k, v]) => <li key={k}><strong>{k.replace(/_/g, " ")}</strong> <span className="tnum">{fmt(v.value)}</span><div className="text-xs text-muted">{v.explain}</div></li>)}</ul>
                </Card>
              )}
              {rb && (
                <Card title="Robustness" subtitle="Parameters perturbed ±20% plus cost stress">
                  <div className={clsx("mb-2 text-sm font-semibold", rb.all_positive && rb.return_spread_pct < 15 ? "text-profit" : rb.all_positive ? "text-warn" : "text-loss")}>Return spread across variants: {fmt(rb.return_spread_pct)} pts · {rb.all_positive ? "all variants positive" : "some variants negative"}</div>
                  <table className="table text-xs"><thead><tr><th>Variant</th><th className="num">Return</th><th className="num">Max DD</th><th className="num">Trades</th><th className="num">Sharpe</th></tr></thead><tbody>
                    {rb.runs.map((p, i) => <tr key={i}><td>{p.label}</td><td className={clsx("num", p.total_return_pct >= 0 ? "text-profit" : "text-loss")}>{fmt(p.total_return_pct)}%</td><td className="num">{fmt(p.max_drawdown_pct)}%</td><td className="num">{p.trades}</td><td className="num">{fmt(p.sharpe)}</td></tr>)}
                  </tbody></table>
                  <p className="mt-2 text-xs text-faint">{rb.note}</p>
                </Card>
              )}
              <Card title="Run history"><ul className="text-xs text-muted">{(runs ?? []).map((r) => <li key={r.id} className="flex justify-between py-1"><span>{istTime(r.created_at)}</span><span className="tnum">CAGR {fmt((r.metrics as Metrics).cagr_pct)}% · MDD {fmt((r.metrics as Metrics).max_drawdown_pct)}% · {r.trades_count} trades</span></li>)}</ul></Card>
            </>
          )}
        </div>
      </div>
    </>
  );
}
