import { requireStaff } from "@/lib/auth";
import { istTime } from "@/lib/format";
import { Card, Notice, PageHeader } from "@/components/ui";
import { runSettlement } from "../actions";
import ActionForm from "@/components/ActionForm";

export default async function Settlement() {
  const { supabase, profile } = await requireStaff("/admin/settlement");
  const [{ data: runs }, { count: openOrders }, { count: mis }] = await Promise.all([
    supabase.from("settlement_runs").select("*").order("created_at", { ascending: false }).limit(30),
    supabase.from("orders").select("*", { count: "exact", head: true }).in("status", ["ACKNOWLEDGED", "PARTIALLY_FILLED"]),
    supabase.from("positions").select("*", { count: "exact", head: true }).eq("product", "MIS").neq("net_qty", 0),
  ]);
  const can = !!profile && ["ops", "risk", "admin", "super_admin"].includes(profile.role);
  return (
    <>
      <PageHeader eyebrow="Clearing & settlement" title="End-of-day run (sandbox)" subtitle="Expires resting orders, squares off intraday positions at the simulated LTP through audited system orders, and records a settlement run." />
      <Notice tone="info">Real clearing (obligation files, pay-in/pay-out, auctions, short delivery) requires clearing-member and depository integrations; this run only closes the sandbox day.</Notice>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.618fr]">
        <Card title="Run EOD">
          <ul className="text-sm text-muted"><li>Open orders to expire: <strong className="text-text">{openOrders ?? 0}</strong></li><li>MIS positions to square off: <strong className="text-text">{mis ?? 0}</strong></li></ul>
          {can ? <ActionForm action={runSettlement} successText="Settlement run recorded." className="mt-4"><button className="btn btn-primary">Run end-of-day settlement</button></ActionForm> :<p className="mt-3 text-xs text-muted">Your role cannot run settlement.</p>}
        </Card>
        <Card title="Settlement runs">
          {(runs ?? []).length === 0 ? <p className="text-sm text-muted">No runs yet.</p> : <table className="table text-sm"><thead><tr><th>Run</th><th>Trading day</th><th>At</th><th>Summary</th></tr></thead>
            <tbody>{(runs ?? []).map((r) => <tr key={r.id}><td>#{r.id}</td><td>{r.trading_day}</td><td className="text-xs text-muted">{istTime(r.created_at)}</td><td className="text-xs">{JSON.stringify(r.summary)}</td></tr>)}</tbody></table>}
        </Card>
      </div>
    </>
  );
}
