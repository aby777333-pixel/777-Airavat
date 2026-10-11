import clsx from "clsx";
import { requireUser } from "@/lib/auth";
import { getAccount } from "@/lib/account";
import { istTime, price } from "@/lib/format";
import { Badge, Card, Notice, PageHeader } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { ackAlert, savePrefs } from "../intel/actions";

type Health = { symbol: string; product: string; net_qty: number; avg_price: number; ltp: number; pnl_pct: number; concentration_pct: number; health_index: number; factors: { factor: string; value: unknown; impact: number; note: string }[]; disclaimer: string };
const sevTone = (s: string) => (s === "critical" ? "bad" : s === "warning" ? "info" : s === "opportunity" ? "ok" : "default");

export default async function Sentinel() {
  const { supabase, user } = await requireUser("/app/sentinel");
  const account = await getAccount(supabase, user.id);
  const [{ data: alerts }, { data: prefs }, health] = await Promise.all([
    supabase.from("sentinel_alerts").select("*, instrument:instruments(symbol)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(60),
    supabase.from("sentinel_preferences").select("*").eq("user_id", user.id).maybeSingle(),
    account ? supabase.rpc("trade_health", { p_account: account.id }).then((r) => (r.data as Health[] | null) ?? []) : Promise.resolve([] as Health[]),
  ]);
  const open = (alerts ?? []).filter((a) => !a.acknowledged_at);
  const acked = (alerts ?? []).filter((a) => a.acknowledged_at);
  return (
    <>
      <PageHeader eyebrow="Sentinel X" title="Early warnings and trade health" subtitle="Deterministic, explainable checks on your sandbox book every five minutes. Alerts carry their evidence; none of them is a prediction or a recommendation." />
      <Notice tone="info">Sentinel never places, modifies or cancels orders. The broker-wide kill switch, if active, is shown as a critical alert.</Notice>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.618fr_1fr]">
        <div className="space-y-5">
          <Card title={`Open alerts (${open.length})`}>
            {open.length === 0 ? <p className="text-sm text-muted">Nothing to flag right now.</p> : (
              <ul className="space-y-3">
                {open.map((a) => (
                  <li key={a.id} className={clsx("rounded-xl border p-3", a.severity === "critical" ? "border-loss/50 bg-loss/10" : "border-border bg-bg/30")}>
                    <div className="flex flex-wrap items-center gap-2"><Badge tone={sevTone(a.severity)}>{a.severity}</Badge><span className="font-semibold">{a.title}</span><span className="ml-auto text-xs text-faint">{istTime(a.created_at)}</span></div>
                    <p className="mt-1 text-sm text-muted">{a.body}</p>
                    <details className="mt-1 text-xs text-faint"><summary className="cursor-pointer">Evidence</summary><pre className="mt-1 overflow-x-auto rounded bg-bg/50 p-2">{JSON.stringify(a.evidence, null, 1)}</pre></details>
                    <ActionForm action={ackAlert} className="mt-2"><input type="hidden" name="id" value={a.id} /><button className="btn btn-ghost btn-sm">Acknowledge</button></ActionForm>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Trade health" subtitle="Per open position; factor-based index, 100 = no flags">
            {health.length === 0 ? <p className="text-sm text-muted">No open positions.</p> : health.map((h) => (
              <div key={`${h.symbol}-${h.product}`} className="border-b border-border py-3 last:border-0">
                <div className="flex items-center justify-between"><div className="font-semibold">{h.symbol} <span className="text-xs text-muted">{h.product} · {h.net_qty} @ {price(h.avg_price)} · LTP {price(h.ltp)}</span></div><div className={clsx("tnum font-display text-xl font-bold", h.health_index >= 70 ? "text-profit" : h.health_index >= 40 ? "text-warn" : "text-loss")}>{h.health_index}</div></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded bg-bg/60"><div className={clsx("h-full", h.health_index >= 70 ? "bg-profit" : h.health_index >= 40 ? "bg-warn" : "bg-loss")} style={{ width: `${h.health_index}%` }} /></div>
                {h.factors.length > 0 && <ul className="mt-2 space-y-0.5 text-xs text-muted">{h.factors.map((f) => <li key={f.factor}><span className="text-text">{f.factor}</span> {String(f.value)} ({f.impact}) — {f.note}</li>)}</ul>}
              </div>
            ))}
            {health[0] && <p className="mt-2 text-xs text-faint">{health[0].disclaimer}</p>}
          </Card>
        </div>
        <div className="space-y-5">
          <Card title="Thresholds" subtitle="Your alert preferences">
            <ActionForm action={savePrefs} successText="Preferences saved." className="space-y-3 text-sm">
              <label className="block"><span className="label">Concentration warning (% of exposure)</span><input className="input tnum" name="concentration_warn_pct" type="number" min={10} max={100} step={1} defaultValue={prefs?.concentration_warn_pct ?? 40} /></label>
              <label className="block"><span className="label">Position drawdown warning (%)</span><input className="input tnum" name="position_drawdown_warn_pct" type="number" min={1} max={50} step={0.5} defaultValue={prefs?.position_drawdown_warn_pct ?? 5} /></label>
              <label className="block"><span className="label">Funds utilisation warning (%)</span><input className="input tnum" name="funds_utilization_warn_pct" type="number" min={10} max={100} step={1} defaultValue={prefs?.funds_utilization_warn_pct ?? 80} /></label>
              <label className="flex items-center gap-2"><input type="checkbox" name="opportunity_alerts" defaultChecked={prefs?.opportunity_alerts ?? true} /> Opportunity alerts from system scanners on my watchlist</label>
              <button className="btn btn-primary btn-sm">Save</button>
            </ActionForm>
          </Card>
          <Card title={`Acknowledged (${acked.length})`}>
            {acked.length === 0 ? <p className="text-sm text-muted">—</p> : <ul className="space-y-1 text-xs text-muted">{acked.slice(0, 15).map((a) => <li key={a.id}><Badge tone={sevTone(a.severity)}>{a.severity}</Badge> {a.title} · {istTime(a.created_at, false)}</li>)}</ul>}
          </Card>
        </div>
      </div>
    </>
  );
}
