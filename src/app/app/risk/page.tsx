import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getAccount } from "@/lib/account";
import { istTime, money } from "@/lib/format";
import { Badge, Card, Empty, Notice, PageHeader, Stat } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { raiseRefundRequest } from "./actions";

type Stress = { holdings_value: number; mis_net_exposure: number; available: number; daily_loss_limit: number; scenarios: { shock_pct: number; pnl: number; post_shock_available: number; margin_shortfall: boolean; breaches_daily_loss_limit: boolean }[]; note: string };

export default async function MyRisk() {
  const { supabase, user } = await requireUser("/app/risk");
  const account = await getAccount(supabase, user.id);
  if (!account) return <Empty title="No sandbox account" cta={{ href: "/app/onboarding", label: "Complete onboarding" }} />;
  const [{ data: global }, { data: mine }, { data: mtm }, { data: stressRaw }, { data: obligations }, { data: shortfalls }, { data: exceptions }] = await Promise.all([
    supabase.from("risk_limits").select("*").eq("scope", "global").single(),
    supabase.from("risk_limits").select("*").eq("scope", "account").eq("account_id", account.id).maybeSingle(),
    supabase.from("rms_mtm_snapshots").select("*").eq("account_id", account.id).order("at", { ascending: false }).limit(1),
    supabase.rpc("stress_test", { p_account: account.id }),
    supabase.from("settlement_obligations").select("*").eq("account_id", account.id).order("trading_day", { ascending: false }).limit(10),
    supabase.from("margin_shortfalls").select("*").eq("account_id", account.id).order("day", { ascending: false }).limit(5),
    supabase.from("backoffice_exceptions").select("*").eq("account_id", account.id).order("created_at", { ascending: false }).limit(10),
  ]);
  const eff = (k: "max_order_value" | "max_order_qty" | "max_position_value" | "max_daily_loss" | "fat_finger_price_pct") => (mine?.[k] ?? global?.[k]) as number | undefined;
  const last = (mtm ?? [])[0]; const stress = stressRaw as Stress | null;
  const blocked = !!mine?.kill_switch;
  return (
    <>
      <PageHeader eyebrow="Risk" title="My limits, mark-to-market and stress test" subtitle="The same risk engine that checks every order, shown to you before you trade." action={<Link href="/app/sentinel" className="btn btn-ghost btn-sm">Sentinel X alerts →</Link>} />
      {blocked && <Notice tone="bad">New orders are currently blocked on your account{mine?.auto_blocked ? ` by the risk engine (${mine.block_reason})` : " by the risk desk"}. Open positions stay open. Contact support to review.</Notice>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Max order value" value={money(eff("max_order_value"))} sub={mine ? "account-specific" : "global default"} />
        <Stat label="Max exposure" value={money(eff("max_position_value"))} />
        <Stat label="Daily loss limit" value={money(eff("max_daily_loss"))} sub={last ? `${last.utilisation_pct}% used at ${istTime(last.at, false)}` : "no scan yet today"} tone={last && Number(last.utilisation_pct) >= 80 ? "loss" : "default"} />
        <Stat label="Fat-finger guard" value={`±${eff("fat_finger_price_pct")}%`} sub="limit price vs LTP" />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title="Stress test" subtitle="What a uniform price shock would do to your available funds" action={<Badge tone="sim">simulated</Badge>}>
          {!stress ? <p className="text-sm text-muted">Unavailable.</p> : (
            <>
              <table className="table text-xs"><thead><tr><th>Shock</th><th className="num">P&L</th><th className="num">Available after</th><th>Shortfall</th></tr></thead>
                <tbody>{stress.scenarios.map((s) => <tr key={s.shock_pct}><td>{s.shock_pct}%</td><td className={`num ${s.pnl >= 0 ? "text-profit" : "text-loss"}`}>{money(s.pnl)}</td><td className="num">{money(s.post_shock_available)}</td><td>{s.margin_shortfall ? <Badge tone="bad">yes</Badge> : <Badge tone="ok">no</Badge>}</td></tr>)}</tbody></table>
              <p className="mt-2 text-xs text-faint">{stress.note}</p>
            </>
          )}
        </Card>
        <Card title="Settlement obligations and shortfalls" subtitle="T+1 obligations from your delivery trades">
          {(obligations ?? []).length === 0 ? <p className="text-sm text-muted">No obligations yet.</p> : <table className="table text-xs"><thead><tr><th>Trade day</th><th>Settles</th><th className="num">Net</th><th>Status</th></tr></thead><tbody>{(obligations ?? []).map((o) => <tr key={o.id}><td>{o.trading_day}</td><td>{o.settlement_day}</td><td className={`num ${Number(o.net) >= 0 ? "text-profit" : "text-loss"}`}>{money(o.net)}</td><td><Badge tone={o.status === "settled" ? "ok" : o.status === "short" ? "bad" : "default"}>{o.status}</Badge></td></tr>)}</tbody></table>}
          {(shortfalls ?? []).length > 0 && <div className="mt-3 text-sm">{(shortfalls ?? []).map((s) => <div key={s.id} className="flex justify-between border-t border-border py-1"><span>Shortfall {s.day}</span><span className="tnum">{money(s.amount)} <Badge tone={s.status === "resolved" ? "ok" : "bad"}>{s.status}</Badge></span></div>)}</div>}
        </Card>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.618fr]">
        <Card title="Request a refund or dispute a charge" subtitle="Reviewed by operations and decided by a second person">
          <ActionForm action={raiseRefundRequest} successText="Submitted to the back office." className="grid gap-2 text-sm">
            <label>Type<select name="kind" className="select mt-1 w-full"><option value="refund">Refund request</option><option value="charge_dispute">Charge dispute</option></select></label>
            <label>Amount (₹)<input name="amount" type="number" step="0.01" min="0" className="input mt-1 w-full" /></label>
            <label>What happened<textarea name="description" required minLength={5} rows={3} className="input mt-1 w-full" /></label>
            <button className="btn btn-primary btn-sm">Submit</button>
          </ActionForm>
        </Card>
        <Card title="My requests">
          {(exceptions ?? []).length === 0 ? <p className="text-sm text-muted">None.</p> : (exceptions ?? []).map((e) => <div key={e.id} className="border-b border-border py-2 text-sm last:border-0"><div className="flex justify-between"><span>#{e.id} {e.kind.replace("_", " ")} {e.amount ? money(e.amount) : ""}</span><Badge tone={e.status === "approved" ? "ok" : e.status === "rejected" ? "bad" : "default"}>{e.status}</Badge></div><div className="text-xs text-muted">{e.description}</div>{e.decision_note && <div className="text-xs text-faint">Decision: {e.decision_note}</div>}</div>)}
        </Card>
      </div>
    </>
  );
}
