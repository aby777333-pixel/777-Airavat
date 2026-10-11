import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { money } from "@/lib/format";
import { isoAgo } from "@/lib/time";
import { Badge, Card, Notice, PageHeader, Stat } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { assignPlan, createOffer, recordVendorCost, requestAdjustment, requestWaiver, submitFee } from "../ops/actions";

type Summary = { turnover: number; trades: number; brokerage_net: number; levies_collected: number; exchange_charges: number; by_product: Record<string, number>; by_day: { day: string; brokerage: number; turnover: number }[]; waivers_and_discounts: number; subscription_revenue: number; partner_remuneration: number; vendor_costs: number; from: string; to: string; note: string };
const tone = (st: string) => (st === "approved" ? "ok" : st === "rejected" || st === "retired" ? "bad" : st === "pending_approval" ? "info" : "default");

export default async function Revenue({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const { supabase, profile } = await requireStaff("/admin/revenue");
  const to = sp.to || isoAgo(0).slice(0, 10);
  const from = sp.from || new Date(Date.parse(to) - 30 * 86400000).toISOString().slice(0, 10);
  const [{ data: sum }, { data: fees }, { data: cats }, { data: plans }, { data: waivers }, { data: offers }, { data: adjustments }, { data: subs }, { data: vendors }] = await Promise.all([
    supabase.rpc("revenue_summary", { p_from: from, p_to: to }),
    supabase.from("fee_definitions").select("*").order("fee_code").order("version", { ascending: false }),
    supabase.from("fee_categories").select("*").order("id"),
    supabase.from("pricing_plans").select("*").order("id"),
    supabase.from("waiver_grants").select("*, account:trading_accounts(client_code)").order("created_at", { ascending: false }).limit(30),
    supabase.from("offer_campaigns").select("*").order("created_at", { ascending: false }),
    supabase.from("charge_adjustments").select("*, account:trading_accounts(client_code)").order("created_at", { ascending: false }).limit(30),
    supabase.from("subscription_plans").select("*").order("id"),
    supabase.from("vendor_costs").select("*").order("period_month", { ascending: false }).limit(30),
  ]);
  const r = sum as Summary | null;
  const canFinance = ["finance", "admin", "super_admin", "compliance"].includes(profile?.role ?? "");
  const cc = (x: { account: unknown }) => ((Array.isArray(x.account) ? x.account[0] : x.account) as { client_code: string } | null)?.client_code;
  return (
    <>
      <PageHeader eyebrow="RevenueOS" title="Fee command console" subtitle="Versioned catalogue, plans, waivers, offers, adjustments and the management revenue view. Statutory levies are pass-through and cannot be waived; every change is maker-checker." action={<Link href="/admin/approvals" className="btn btn-primary btn-sm">Approvals queue →</Link>} />
      <form className="mb-4 flex flex-wrap items-end gap-2 text-sm"><label className="block"><span className="label">From</span><input className="input" type="date" name="from" defaultValue={from} /></label><label className="block"><span className="label">To</span><input className="input" type="date" name="to" defaultValue={to} /></label><button className="btn btn-ghost">Apply</button></form>
      {r && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Turnover (simulated)" value={money(r.turnover, { compact: true })} sub={`${r.trades} trades`} />
            <Stat label="Net brokerage" value={money(r.brokerage_net)} sub={`waivers & discounts ${money(r.waivers_and_discounts)}`} tone="profit" />
            <Stat label="Levies collected (pass-through)" value={money(r.levies_collected)} sub={`exchange ${money(r.exchange_charges)}`} />
            <Stat label="Subscriptions − partner − vendors" value={money(r.subscription_revenue - r.partner_remuneration - r.vendor_costs)} sub={`subs ${money(r.subscription_revenue)} · partners ${money(r.partner_remuneration)} · vendors ${money(r.vendor_costs)}`} />
          </div>
          <p className="mt-2 text-xs text-faint">{r.note}</p>
          {r.by_day.length > 0 && <div className="glass mt-4 p-4"><div className="mb-2 text-xs text-muted">Net brokerage by day</div><div className="flex h-24 items-end gap-1">{r.by_day.map((d) => { const mx = Math.max(...r.by_day.map((x) => x.brokerage), 1); return <div key={d.day} title={`${d.day}: ${money(d.brokerage)}`} className="flex-1 rounded-t bg-accent/70" style={{ height: `${Math.max(4, (d.brokerage / mx) * 100)}%` }} />; })}</div></div>}
        </>
      )}
      <Notice tone="info">Role matrix: broker fees → finance/admin approve; statutory and exchange levies → compliance approves; offers → compliance; payouts → finance/admin. The requester can never approve their own request.</Notice>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <Card title="Fee catalogue (all versions)">
          <div className="max-h-96 overflow-auto"><table className="table text-xs"><thead><tr><th>Code</th><th>v</th><th>Name</th><th>Class</th><th className="num">Rate</th><th>Status</th><th>Effective</th></tr></thead><tbody>
            {(fees ?? []).map((f) => <tr key={f.id}><td className="font-mono">{f.fee_code}</td><td>{f.version}</td><td>{f.name}</td><td><Badge>{f.classification}</Badge></td><td className="num">{f.calc_method === "FLAT_PER_ORDER" ? money(f.rate) : `${f.rate}%${f.cap ? ` cap ${money(f.cap)}` : ""}`}</td><td><Badge tone={tone(f.status)}>{f.status}</Badge></td><td>{f.effective_from}{f.effective_to ? ` → ${f.effective_to}` : ""}</td></tr>)}
          </tbody></table></div>
        </Card>
        <Card title="Submit a fee version" subtitle="Creates a pending version; the previous version stays active until approval">
          {!canFinance ? <p className="text-sm text-muted">Finance, compliance or admin role required.</p> : (
            <ActionForm action={submitFee} successText="Submitted for approval." className="grid grid-cols-2 gap-2 text-sm">
              <input className="input" name="fee_code" placeholder="Fee code (existing or new)" required /><input className="input" name="name" placeholder="Name (required for new codes)" />
              <select className="select" name="classification" defaultValue=""><option value="">classification (inherit)</option><option>BROKER_FEE</option><option>STATUTORY_LEVY</option><option>EXCHANGE_CHARGE</option><option>PASS_THROUGH</option><option>SUBSCRIPTION</option></select>
              <select className="select" name="calc_method" defaultValue=""><option value="">calc method (inherit)</option><option>FLAT_PER_ORDER</option><option>PCT_OF_VALUE</option><option>PCT_CAPPED</option></select>
              <input className="input tnum" name="rate" type="number" step="any" placeholder="Rate (% or ₹)" required /><input className="input tnum" name="cap" type="number" step="any" placeholder="Cap ₹ (optional)" />
              <select className="select" name="category_id" defaultValue=""><option value="">category (inherit)</option>{(cats ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <select className="select" name="product" defaultValue=""><option value="">product: all</option><option>CNC</option><option>MIS</option></select>
              <select className="select" name="side" defaultValue=""><option value="">side: both</option><option>BUY</option><option>SELL</option></select>
              <input className="input" name="effective_from" type="date" />
              <input className="input col-span-2" name="description" placeholder="Why this change (shown to approver)" required /><input className="input col-span-2" name="source_url" placeholder="Source URL for levies (official notification)" />
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="gst_applicable" /> GST applicable</label>
              <button className="btn btn-primary btn-sm">Submit version</button>
            </ActionForm>
          )}
        </Card>
        <Card title="Pricing plans">
          <ul className="mb-3 text-sm">{(plans ?? []).map((p) => <li key={p.id} className="flex items-center justify-between py-1"><span>{p.name} <span className="font-mono text-xs text-muted">{p.code}</span></span><Badge tone={tone(p.status)}>{p.status}</Badge></li>)}</ul>
          <ActionForm action={assignPlan} successText="Plan assigned." className="grid grid-cols-3 gap-2 text-sm"><input className="input" name="client_code" placeholder="Client code" required /><select className="select" name="plan_code">{(plans ?? []).map((p) => <option key={p.id} value={p.code}>{p.code}</option>)}</select><button className="btn btn-ghost btn-sm">Assign</button><input className="input col-span-3" name="note" placeholder="Note (eligibility basis)" /></ActionForm>
        </Card>
        <Card title="Waivers" subtitle="Broker fees only; capped and reasoned">
          <ActionForm action={requestWaiver} successText="Waiver requested; awaiting approval." className="grid grid-cols-3 gap-2 text-sm"><input className="input" name="client_code" placeholder="Client code" required /><input className="input" name="fee_code" placeholder="Fee code (e.g. BRK_MIS)" required /><select className="select" name="waiver_type"><option>FULL</option><option>PCT</option><option>FIXED</option></select><input className="input tnum" name="value" type="number" step="any" placeholder="Value" /><input className="input tnum" name="max_total" type="number" step="any" placeholder="Max total ₹" /><input className="input" name="valid_to" type="date" /><input className="input col-span-2" name="reason" placeholder="Reason" required /><button className="btn btn-ghost btn-sm">Request</button></ActionForm>
          <ul className="mt-3 max-h-48 overflow-auto text-xs">{(waivers ?? []).map((w) => <li key={w.id} className="flex justify-between py-1"><span>{cc(w)} · {w.fee_code} {w.waiver_type} {w.value} · {w.reason}</span><Badge tone={tone(w.status)}>{w.status}</Badge></li>)}</ul>
        </Card>
        <Card title="Offers & promo codes" subtitle="Compliance approves; disclosures are mandatory">
          <ActionForm action={createOffer} successText="Offer created; awaiting compliance approval." className="grid grid-cols-3 gap-2 text-sm"><input className="input" name="code" placeholder="CODE" required /><input className="input col-span-2" name="name" placeholder="Offer name" required /><input className="input" name="fee_code" placeholder="Broker fee code" required /><select className="select" name="discount_type"><option>PCT</option><option>FIXED</option></select><input className="input tnum" name="value" type="number" step="any" placeholder="Value" required /><input className="input" name="ends_at" type="date" /><input className="input tnum" name="redemption_limit" type="number" placeholder="Redemption limit" /><input className="input tnum" name="budget" type="number" placeholder="Budget ₹" /><input className="input col-span-3" name="disclosures" placeholder="Disclosures shown to clients" required /><button className="btn btn-ghost btn-sm">Create</button></ActionForm>
          <ul className="mt-3 max-h-48 overflow-auto text-xs">{(offers ?? []).map((o) => <li key={o.id} className="flex justify-between py-1"><span className="font-mono">{o.code}</span><span>{o.name} · {o.discount_type} {o.value} on {o.fee_code} · spent {money(o.spent)}</span><Badge tone={tone(o.status)}>{o.status}</Badge></li>)}</ul>
        </Card>
        <Card title="Charge adjustments" subtitle="Refund of a broker fee on a specific trade; posts a reversal on approval">
          <ActionForm action={requestAdjustment} successText="Adjustment requested." className="grid grid-cols-3 gap-2 text-sm"><input className="input col-span-3" name="trade_id" placeholder="Trade id (uuid)" required /><input className="input" name="fee_code" placeholder="Fee code" required /><input className="input tnum" name="amount" type="number" step="0.01" placeholder="Amount ₹" required /><button className="btn btn-ghost btn-sm">Request</button><input className="input col-span-3" name="reason" placeholder="Reason" required /></ActionForm>
          <ul className="mt-3 max-h-40 overflow-auto text-xs">{(adjustments ?? []).map((a) => <li key={a.id} className="flex justify-between py-1"><span>{cc(a)} · {a.fee_code} {money(a.amount)} · {a.reason}</span><Badge tone={tone(a.status)}>{a.status}</Badge></li>)}</ul>
        </Card>
        <Card title="Subscription plans"><ul className="text-sm">{(subs ?? []).map((p) => <li key={p.id} className="flex justify-between py-1"><span>{p.name} <span className="font-mono text-xs text-muted">{p.code}</span> · {money(p.price_month)}/mo</span><Badge tone={tone(p.status)}>{p.status}</Badge></li>)}</ul><p className="mt-2 text-xs text-faint">Subscription plan activation goes through the approvals queue as a pricing_plan-class change.</p></Card>
        <Card title="Vendor costs" subtitle="Data, cloud, AI and connectivity costs for unit economics">
          <ActionForm action={recordVendorCost} successText="Recorded." className="grid grid-cols-4 gap-2 text-sm"><input className="input" name="vendor" placeholder="Vendor" required /><input className="input" name="category" placeholder="Category" required /><input className="input" name="period_month" type="date" /><input className="input tnum" name="amount" type="number" step="0.01" placeholder="₹" required /><input className="input col-span-3" name="note" placeholder="Note" /><button className="btn btn-ghost btn-sm">Add</button></ActionForm>
          <ul className="mt-3 max-h-40 overflow-auto text-xs">{(vendors ?? []).map((v) => <li key={v.id} className="flex justify-between py-1"><span>{v.period_month.slice(0, 7)} · {v.vendor} · {v.category}</span><span className="tnum">{money(v.amount)}</span></li>)}</ul>
        </Card>
      </div>
    </>
  );
}
