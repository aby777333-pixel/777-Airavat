import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getAccount } from "@/lib/account";
import { istTime, money } from "@/lib/format";
import { Badge, Card, Empty, Notice, PageHeader } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { applyPromo, subscribe, unsubscribe } from "../intel/actions";

export default async function Plan() {
  const { supabase, user } = await requireUser("/app/plan");
  const account = await getAccount(supabase, user.id);
  if (!account) return <Empty title="No sandbox account" cta={{ href: "/app/onboarding", label: "Complete onboarding" }} />;
  const [{ data: assignment }, { data: waivers }, { data: enrollments }, { data: subs }, { data: plans }, { data: adjustments }] = await Promise.all([
    supabase.from("plan_assignments").select("*, plan:pricing_plans(code,name,description,brokerage)").eq("account_id", account.id).is("effective_to", null).order("effective_from", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("waiver_grants").select("*").eq("account_id", account.id).order("created_at", { ascending: false }),
    supabase.from("offer_enrollments").select("*, offer:offer_campaigns(code,name,fee_code,discount_type,value,ends_at,disclosures)").eq("account_id", account.id),
    supabase.from("subscriptions").select("*, plan:subscription_plans(code,name,price_month,features)").eq("account_id", account.id).order("started_at", { ascending: false }),
    supabase.from("subscription_plans").select("*").eq("status", "approved").order("id"),
    supabase.from("charge_adjustments").select("*").eq("account_id", account.id).order("created_at", { ascending: false }).limit(10),
  ]);
  const plan = (assignment?.plan ?? null) as { code: string; name: string; description: string; brokerage: Record<string, { pct: number; cap: number }> } | null;
  const activeSubs = (subs ?? []).filter((s) => s.status === "active");
  return (
    <>
      <PageHeader eyebrow="My plan & offers" title="Pricing applied to your account" subtitle="Every charge on your contract note comes from the versioned fee catalogue plus the plan, waivers and offers below. Statutory levies are never discounted." />
      <Notice tone="info">Sandbox pricing. Plan changes, waivers and offers are approved by finance or compliance before they take effect; you see exactly what applies.</Notice>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title="Pricing plan">
          {plan ? (<><div className="font-display text-lg font-semibold">{plan.name} <Badge tone="ok">active</Badge></div><p className="text-sm text-muted">{plan.description}</p><ul className="mt-2 text-sm">{Object.entries(plan.brokerage).map(([k, b]) => <li key={k}>{k}: {Number(b.pct) === 0 && Number(b.cap) === 0 ? "₹0 brokerage" : `${b.pct}% or ₹${b.cap}, whichever is lower`}</li>)}</ul><div className="mt-2 text-xs text-faint">Effective from {assignment?.effective_from}{assignment?.note ? ` · ${assignment.note}` : ""}</div></>) : (
            <><div className="font-display text-lg font-semibold">Standard <Badge>default</Badge></div><p className="text-sm text-muted">No special plan assigned; the approved standard schedule on the <Link className="text-accent underline" href="/pricing">pricing page</Link> applies.</p></>
          )}
        </Card>
        <Card title="Promo code">
          <ActionForm action={applyPromo} successText="Offer enrolled. It applies automatically to eligible charges." className="flex gap-2 text-sm"><input className="input" name="code" placeholder="Enter code" required /><button className="btn btn-primary btn-sm">Apply</button></ActionForm>
          <div className="mt-3 space-y-2">{(enrollments ?? []).map((e) => { const o = e.offer as unknown as { code: string; name: string; fee_code: string; discount_type: string; value: number; ends_at: string | null; disclosures: string | null }; return <div key={e.id ?? o.code} className="rounded-lg border border-border p-3 text-sm"><div className="font-medium">{o.name} <Badge tone="accent">{o.code}</Badge></div><div className="text-xs text-muted">{o.discount_type === "PCT" ? `${o.value}% off` : `₹${o.value} off`} {o.fee_code}{o.ends_at ? ` · until ${istTime(o.ends_at, true)}` : ""}</div>{o.disclosures && <div className="mt-1 text-xs text-faint">{o.disclosures}</div>}</div>; })}{(enrollments ?? []).length === 0 && <p className="text-xs text-muted">No offers enrolled.</p>}</div>
        </Card>
        <Card title="Waivers" subtitle="Granted by finance with a reason and a cap">
          {(waivers ?? []).length === 0 ? <p className="text-sm text-muted">None.</p> : <ul className="space-y-2 text-sm">{(waivers ?? []).map((w) => <li key={w.id} className="rounded-lg border border-border p-3"><div className="flex items-center justify-between"><span className="font-medium">{w.fee_code} · {w.waiver_type} {w.value}</span><Badge tone={w.status === "approved" ? "ok" : w.status === "rejected" ? "bad" : "info"}>{w.status}</Badge></div><div className="text-xs text-muted">{w.reason} · used {money(w.used_total)}{w.max_total ? ` of ${money(w.max_total)}` : ""}{w.valid_to ? ` · until ${w.valid_to}` : ""}</div></li>)}</ul>}
        </Card>
        <Card title="Subscriptions" subtitle="Billed from your sandbox ledger; cancel any time">
          {activeSubs.map((s) => { const p = s.plan as unknown as { name: string; price_month: number }; return <div key={s.id} className="mb-2 flex items-center justify-between rounded-lg border border-border p-3 text-sm"><div><div className="font-medium">{p.name} <Badge tone="ok">active</Badge></div><div className="text-xs text-muted">{money(p.price_month)}/month · renews {istTime(s.renews_at)}</div></div><ActionForm action={unsubscribe}><input type="hidden" name="id" value={s.id} /><button className="btn btn-ghost btn-sm">Cancel</button></ActionForm></div>; })}
          {(plans ?? []).filter((p) => !activeSubs.some((s) => (s.plan as unknown as { code: string }).code === p.code)).map((p) => <div key={p.id} className="mb-2 rounded-lg border border-border p-3 text-sm"><div className="flex items-center justify-between"><div><div className="font-medium">{p.name}</div><div className="text-xs text-muted">{p.description}</div></div><div className="tnum font-semibold">{money(p.price_month)}<span className="text-xs font-normal text-muted">/mo</span></div></div><ul className="mt-1 list-disc pl-5 text-xs text-muted">{(p.features as string[]).map((f) => <li key={f}>{f}</li>)}</ul><ActionForm action={subscribe} successText="Subscribed; invoice posted to your ledger." className="mt-2"><input type="hidden" name="code" value={p.code} /><button className="btn btn-primary btn-sm">Subscribe (simulated)</button></ActionForm></div>)}
          {(plans ?? []).length === 0 && activeSubs.length === 0 && <p className="text-sm text-muted">No subscription plans approved yet.</p>}
        </Card>
      </div>
      {(adjustments ?? []).length > 0 && <Card title="Charge adjustments" className="mt-5"><ul className="text-sm">{(adjustments ?? []).map((a) => <li key={a.id} className="flex justify-between py-1"><span>{a.fee_code} · {a.reason}</span><span className="tnum">{money(a.amount)} <Badge tone={a.status === "approved" ? "ok" : "info"}>{a.status}</Badge></span></li>)}</ul></Card>}
    </>
  );
}
