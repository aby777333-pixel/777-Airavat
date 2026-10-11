import { requireUser } from "@/lib/auth";
import { istTime, money } from "@/lib/format";
import { Badge, Card, Empty, Notice, PageHeader, Stat } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { partnerLead, partnerLeadUpdate } from "../intel/actions";

type Passport = { partner: { id: number; legal_name: string; category: string; status: string; referral_code: string; approved_activities: string[]; permitted_channels: string[]; training_valid_until: string | null; exchange_approval_ref: string | null }; access_allowed: boolean; new_business_allowed: boolean; commission_eligible: boolean; payout_eligible: boolean; plan: { code: string; name: string; basis: string; rate: number; status: string; legal_basis: string } | null; referred_clients: number; earned_gross: number; pending_net: number; paid_net: number; leads: number };

export default async function PartnerPortal() {
  const { supabase, user } = await requireUser("/app/partner");
  const { data: partner } = await supabase.from("partners").select("id").eq("user_id", user.id).maybeSingle();
  if (!partner) return <><PageHeader eyebrow="Partner portal" title="Not a registered partner" /><Empty title="This login is not linked to a partner record" body="Partners are registered and activated by the sales and compliance teams. Read about the programme on the public Partners page." cta={{ href: "/partners", label: "Partner programme" }} /></>;
  const [{ data: pp }, { data: leads }, { data: accruals }, { data: payouts }] = await Promise.all([
    supabase.rpc("partner_passport", { p_partner: partner.id }),
    supabase.from("leads").select("*").eq("partner_id", partner.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("commission_accruals").select("*").eq("partner_id", partner.id).order("accrued_at", { ascending: false }).limit(50),
    supabase.from("partner_payouts").select("*").eq("partner_id", partner.id).order("created_at", { ascending: false }).limit(20),
  ]);
  const p = pp as Passport;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://777-airavat.netlify.app";
  const flag = (ok: boolean, label: string) => <div className={ok ? "rounded-lg border border-profit/40 bg-profit/10 p-3 text-sm" : "rounded-lg border border-loss/40 bg-loss/10 p-3 text-sm"}><div className="text-xs text-muted">{label}</div><div className="font-semibold">{ok ? "Allowed" : "Not allowed"}</div></div>;
  return (
    <>
      <PageHeader eyebrow="Partner Earnings & Eligibility Passport" title={p.partner.legal_name} subtitle={<><Badge>{p.partner.category.replace("_", " ")}</Badge> <Badge tone={p.partner.status === "active" ? "ok" : "bad"}>{p.partner.status}</Badge> · referral code <strong>{p.partner.referral_code}</strong></>} />
      <Notice tone="info">The four controls below are independent: suspension stops new business and access while earned remuneration stays payable; lapsed training stops new business only.</Notice>
      <div className="mt-5 grid gap-3 sm:grid-cols-4">{flag(p.access_allowed, "Portal access")}{flag(p.new_business_allowed, "New business")}{flag(p.commission_eligible, "Commission eligibility")}{flag(p.payout_eligible, "Payout eligibility")}</div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Referred clients" value={p.referred_clients} sub={`${p.leads} leads`} />
        <Stat label="Earned (gross)" value={money(p.earned_gross)} />
        <Stat label="Pending (net of TDS)" value={money(p.pending_net)} />
        <Stat label="Paid (net)" value={money(p.paid_net)} tone="profit" />
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.618fr]">
        <div className="space-y-5">
          <Card title="Your referral link"><code className="block break-all rounded bg-bg/50 p-2 text-xs">{site}/signup?ref={p.partner.referral_code}</code><p className="mt-2 text-xs text-muted">Only use channels you are permitted to use: {p.partner.permitted_channels.length ? p.partner.permitted_channels.join(", ") : "none recorded"}. Approved activities: {p.partner.approved_activities.length ? p.partner.approved_activities.join(", ") : "none recorded"}.{p.partner.training_valid_until ? ` Training valid until ${p.partner.training_valid_until}.` : ""}</p></Card>
          <Card title="Commission plan">{p.plan ? <><div className="font-medium">{p.plan.name} <Badge tone={p.plan.status === "approved" ? "ok" : "info"}>{p.plan.status}</Badge></div><div className="text-sm text-muted">{p.plan.basis} · rate {p.plan.rate}</div><div className="mt-1 text-xs text-faint">Legal basis: {p.plan.legal_basis}</div></> : <p className="text-sm text-muted">No plan assigned. Commission cannot accrue until compliance approves a plan and it is assigned to you.</p>}</Card>
          <Card title="Add a lead" subtitle="Consent is recorded; DND is respected">
            <ActionForm action={partnerLead} successText="Lead recorded." className="space-y-2 text-sm">
              <input className="input" name="full_name" placeholder="Full name" required />
              <input className="input" name="email" type="email" placeholder="Email" />
              <input className="input" name="phone" placeholder="Mobile" />
              <textarea className="input" name="notes" rows={2} placeholder="Context (no financial data)" />
              <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" name="consent" /> Prospect consented to be contacted</label>
              <button className="btn btn-primary btn-sm" disabled={!p.new_business_allowed}>Add lead</button>
            </ActionForm>
          </Card>
        </div>
        <div className="space-y-5">
          <Card title={`Leads (${(leads ?? []).length})`}>
            {(leads ?? []).length === 0 ? <p className="text-sm text-muted">No leads yet.</p> : (leads ?? []).map((l) => (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 text-sm last:border-0">
                <div><span className="font-medium">{l.full_name}</span> <Badge tone={l.status === "converted" ? "ok" : l.status === "lost" ? "bad" : "info"}>{l.status}</Badge><div className="text-xs text-muted">{l.email || l.phone || "no contact"} · {istTime(l.created_at, false)}{l.consent_marketing ? " · consent" : " · no consent"}</div></div>
                {!["converted", "lost"].includes(l.status) && <ActionForm action={partnerLeadUpdate} className="flex gap-1"><input type="hidden" name="id" value={l.id} /><select className="select w-auto" name="status" defaultValue={l.status}><option value="new">new</option><option value="contacted">contacted</option><option value="qualified">qualified</option><option value="lost">lost</option></select><input className="input w-32" name="note" placeholder="Note" /><button className="btn btn-ghost btn-sm">Update</button></ActionForm>}
              </div>
            ))}
          </Card>
          <Card title="Commission ledger">
            {(accruals ?? []).length === 0 ? <p className="text-sm text-muted">No accruals yet.</p> : <table className="table text-xs"><thead><tr><th>When</th><th>Event</th><th className="num">Gross</th><th className="num">TDS</th><th className="num">Net</th><th>Status</th></tr></thead><tbody>{(accruals ?? []).map((a) => <tr key={a.id}><td>{istTime(a.accrued_at, false)}</td><td>{a.qualifying_event_type}</td><td className="num">{money(a.gross)}</td><td className="num">{money(a.tds)}</td><td className="num">{money(a.net)}</td><td><Badge tone={a.status === "paid" ? "ok" : "info"}>{a.status}</Badge></td></tr>)}</tbody></table>}
          </Card>
          <Card title="Payouts">{(payouts ?? []).length === 0 ? <p className="text-sm text-muted">No payouts yet.</p> : <ul className="text-sm">{(payouts ?? []).map((po) => <li key={po.id} className="flex justify-between py-1"><span>{istTime(po.created_at, false)} · net {money(po.net)} (TDS {money(po.tds)})</span><Badge tone={po.status === "approved" ? "ok" : po.status === "rejected" ? "bad" : "info"}>{po.status}</Badge></li>)}</ul>}</Card>
        </div>
      </div>
    </>
  );
}
