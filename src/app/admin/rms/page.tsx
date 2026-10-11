import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { istTime, money } from "@/lib/format";
import { Badge, Card, Notice, PageHeader, Stat } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { reviewFlag, setAccountLimits } from "../backoffice/actions";

type Stress = { holdings_value: number; mis_net_exposure: number; available: number; daily_loss_limit: number; scenarios: { shock_pct: number; pnl: number; post_shock_available: number; margin_shortfall: boolean; breaches_daily_loss_limit: boolean }[] };

export default async function IndependentRms({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  const sp = await searchParams;
  const { supabase, profile } = await requireStaff("/admin/rms");
  const [{ data: accounts }, { data: limits }, { data: mtm }, { data: flags }, { data: global }] = await Promise.all([
    supabase.from("trading_accounts").select("id, client_code, status, profile:profiles(full_name)").eq("environment", "sandbox").order("client_code"),
    supabase.from("risk_limits").select("*").eq("scope", "account"),
    supabase.from("rms_mtm_snapshots").select("*").order("at", { ascending: false }).limit(200),
    supabase.from("surveillance_flags").select("*, account:trading_accounts(client_code)").order("created_at", { ascending: false }).limit(60),
    supabase.from("risk_limits").select("*").eq("scope", "global").single(),
  ]);
  const selected = sp.account && (accounts ?? []).some((a) => a.id === sp.account) ? sp.account : (accounts ?? [])[0]?.id;
  const { data: stressRaw } = selected ? await supabase.rpc("stress_test", { p_account: selected }) : { data: null };
  const stress = stressRaw as Stress | null;
  const canEdit = ["risk", "admin", "super_admin"].includes(profile?.role ?? "");
  const canReview = ["risk", "compliance", "admin", "super_admin"].includes(profile?.role ?? "");
  const limitFor = (id: string) => (limits ?? []).find((l) => l.account_id === id);
  const latest = new Map<string, NonNullable<typeof mtm>[number]>(); (mtm ?? []).forEach((m) => { if (!latest.has(m.account_id)) latest.set(m.account_id, m); });
  const sel = (accounts ?? []).find((a) => a.id === selected); const selLimit = selected ? limitFor(selected) : undefined;
  const blocked = (limits ?? []).filter((l) => l.kill_switch);
  return (
    <>
      <PageHeader eyebrow="Independent RMS" title="Per-account limits, real-time MTM, surveillance and stress tests" subtitle="Limits are enforced inside place_order(). The MTM scan runs every five minutes in market hours and auto-blocks an account at 100% of its daily loss limit; only the risk desk can unblock." action={<Link href="/admin/risk" className="btn btn-ghost btn-sm">Global limits →</Link>} />
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Accounts with own limits" value={(limits ?? []).length} />
        <Stat label="Blocked accounts" value={blocked.length} tone={blocked.length ? "loss" : "default"} sub={blocked.map((b) => (accounts ?? []).find((a) => a.id === b.account_id)?.client_code).join(", ") || "none"} />
        <Stat label="Open surveillance flags" value={(flags ?? []).filter((f) => f.status === "open").length} />
        <Stat label="Last MTM scan" value={(mtm ?? [])[0] ? istTime((mtm ?? [])[0].at, false) : "—"} sub={`fat-finger ${global?.fat_finger_price_pct ?? 10}% price · ${global?.fat_finger_volume_pct ?? 10}% volume`} />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.618fr]">
        <Card title="Account limits" subtitle="Blank fields inherit the global value">
          <form className="mb-3 flex gap-2 text-sm"><select name="account" defaultValue={selected} className="select w-full">{(accounts ?? []).map((a) => <option key={a.id} value={a.id}>{a.client_code} · {(a.profile as unknown as { full_name: string } | null)?.full_name ?? ""}</option>)}</select><button className="btn btn-ghost btn-sm">Open</button></form>
          {sel && (
            <ActionForm action={setAccountLimits} successText="Saved and audited." className="grid gap-2 text-sm sm:grid-cols-2">
              <input type="hidden" name="account_id" value={sel.id} />
              {[["max_order_value", "Max order value (₹)"], ["max_order_qty", "Max order qty"], ["max_position_value", "Max exposure (₹)"], ["max_daily_loss", "Max daily loss (₹)"], ["mis_margin_pct", "MIS margin %"], ["fat_finger_price_pct", "Fat-finger price %"], ["fat_finger_volume_pct", "Fat-finger volume %"]].map(([k, l]) => <label key={k} className="block"><span className="label">{l}</span><input name={k} type="number" step="any" className="input tnum" defaultValue={selLimit ? String(selLimit[k as "max_order_qty"] ?? "") : ""} placeholder={String(global?.[k as "max_order_qty"] ?? "")} disabled={!canEdit} /></label>)}
              <label className="flex items-center gap-2"><input type="checkbox" name="allow_mis" defaultChecked={selLimit ? selLimit.allow_mis : true} disabled={!canEdit} /> Allow MIS</label>
              <label className="flex items-center gap-2 text-loss"><input type="checkbox" name="kill_switch" defaultChecked={!!selLimit?.kill_switch} disabled={!canEdit} /> Block new orders{selLimit?.auto_blocked ? ` (auto: ${selLimit.block_reason})` : ""}</label>
              {canEdit ? <button className="btn btn-primary sm:col-span-2">Save account limits</button> : <p className="text-xs text-muted sm:col-span-2">Your role can view only.</p>}
            </ActionForm>
          )}
        </Card>
        <Card title={`Stress test · ${sel?.client_code ?? ""}`} subtitle="Uniform shock on holdings and net intraday exposure" action={<Badge tone="sim">simulated prices</Badge>}>
          {!stress ? <p className="text-sm text-muted">Select an account.</p> : (
            <>
              <div className="grid grid-cols-3 gap-3 text-sm"><div><div className="text-xs text-muted">Holdings</div><div className="tnum">{money(stress.holdings_value)}</div></div><div><div className="text-xs text-muted">MIS net exposure</div><div className="tnum">{money(stress.mis_net_exposure)}</div></div><div><div className="text-xs text-muted">Available</div><div className="tnum">{money(stress.available)}</div></div></div>
              <table className="table mt-3 text-xs"><thead><tr><th>Shock</th><th className="num">P&L</th><th className="num">Available after</th><th>Shortfall</th><th>Daily-loss breach</th></tr></thead>
                <tbody>{stress.scenarios.map((s) => <tr key={s.shock_pct}><td>{s.shock_pct}%</td><td className={`num ${s.pnl >= 0 ? "text-profit" : "text-loss"}`}>{money(s.pnl)}</td><td className="num">{money(s.post_shock_available)}</td><td>{s.margin_shortfall ? <Badge tone="bad">yes</Badge> : <Badge tone="ok">no</Badge>}</td><td>{s.breaches_daily_loss_limit ? <Badge tone="bad">yes</Badge> : <Badge tone="ok">no</Badge>}</td></tr>)}</tbody></table>
            </>
          )}
        </Card>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title="Real-time MTM (latest per account)" subtitle="Realised + unrealised intraday against each account's daily loss limit">
          <table className="table text-xs"><thead><tr><th>Client</th><th>At</th><th className="num">Realised</th><th className="num">Unrealised</th><th className="num">Exposure</th><th className="num">Available</th><th className="num">Limit used</th></tr></thead>
            <tbody>{[...latest.values()].map((m) => { const a = (accounts ?? []).find((x) => x.id === m.account_id); const u = Number(m.utilisation_pct); return <tr key={m.id}><td className="font-mono">{a?.client_code ?? "—"}</td><td>{istTime(m.at, false)}</td><td className={`num ${Number(m.realized) >= 0 ? "text-profit" : "text-loss"}`}>{money(m.realized)}</td><td className={`num ${Number(m.unrealized) >= 0 ? "text-profit" : "text-loss"}`}>{money(m.unrealized)}</td><td className="num">{money(m.exposure)}</td><td className="num">{money(m.available)}</td><td className="num"><Badge tone={u >= 100 ? "bad" : u >= 80 ? "info" : "ok"}>{u}%</Badge></td></tr>; })}{latest.size === 0 && <tr><td colSpan={7} className="text-muted">No scan yet (runs in market hours).</td></tr>}</tbody></table>
        </Card>
        <Card title="Surveillance flags" subtitle="Order-to-trade ratio, excessive cancellations, repeated RMS rejections, rapid round trips">
          {(flags ?? []).length === 0 ? <p className="text-sm text-muted">No flags.</p> : (flags ?? []).map((f) => (
            <div key={f.id} className="border-b border-border py-2 text-sm last:border-0">
              <div className="flex flex-wrap items-center justify-between gap-2"><span><span className="font-mono">{(f.account as { client_code?: string } | null)?.client_code}</span> · {f.day} · <Badge tone={f.severity === "critical" ? "bad" : f.severity === "warning" ? "info" : "default"}>{f.kind.replace(/_/g, " ")}</Badge> <Badge tone={f.status === "open" ? "default" : "ok"}>{f.status}</Badge></span>
                {f.status === "open" && canReview && <ActionForm action={reviewFlag} className="flex gap-1"><input type="hidden" name="id" value={f.id} /><input name="note" className="input !py-1 !text-xs" placeholder="Note" /><button name="status" value="reviewed" className="btn btn-ghost btn-sm">Reviewed</button><button name="status" value="escalated" className="btn btn-ghost btn-sm text-loss">Escalate</button></ActionForm>}</div>
              <div className="text-xs text-faint">{JSON.stringify(f.evidence)}{f.note ? ` · ${f.note}` : ""}</div>
            </div>))}
        </Card>
      </div>
      <div className="mt-5"><Notice tone="info">Rejection codes added by this engine: RMS_ACCOUNT_BLOCKED, RMS_ACCOUNT_AUTO_BLOCKED, ACCOUNT_MAX_ORDER_QTY_EXCEEDED, ACCOUNT_MAX_ORDER_VALUE_EXCEEDED, ACCOUNT_MIS_DISABLED, FAT_FINGER_PRICE_DEVIATION, FAT_FINGER_QTY_VS_VOLUME, MAX_POSITION_VALUE_EXCEEDED, DAILY_LOSS_LIMIT_BREACHED.</Notice></div>
    </>
  );
}
