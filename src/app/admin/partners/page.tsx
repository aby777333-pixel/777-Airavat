import { requireStaff } from "@/lib/auth";
import { istTime, money } from "@/lib/format";
import { Badge, Card, Notice, PageHeader, Stat } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { assignCommissionPlan, createCommissionPlan, createPayout, registerPartner, setPartnerStatus, settlePayout, updateLead, updatePartner } from "../ops/actions";

const tone = (st: string) => (["active", "approved", "activated", "paid"].includes(st) ? "ok" : ["suspended", "terminated", "rejected", "lost"].includes(st) ? "bad" : ["pending_approval", "applied", "verified", "new", "contacted", "qualified", "application"].includes(st) ? "info" : "default");

export default async function PartnersAdmin() {
  const { supabase, profile } = await requireStaff("/admin/partners");
  const [{ data: partners }, { data: plans }, { data: payouts }, { data: leads }, { data: sales }, { data: accruals }] = await Promise.all([
    supabase.from("partners").select("*, assignments:partner_plan_assignments(plan:commission_plans(code,name),effective_to)").order("created_at", { ascending: false }),
    supabase.from("commission_plans").select("*").order("id"),
    supabase.from("partner_payouts").select("*, partner:partners(legal_name)").order("created_at", { ascending: false }).limit(30),
    supabase.from("leads").select("*, partner:partners(legal_name), assignee:profiles!leads_assigned_to_fkey(full_name)").order("created_at", { ascending: false }).limit(100),
    supabase.from("profiles").select("id,full_name,email").in("role", ["sales", "admin", "super_admin"]),
    supabase.from("commission_accruals").select("gross,net,status"),
  ]);
  const acc = (accruals ?? []) as { gross: number; net: number; status: string }[];
  const role = profile?.role ?? "";
  return (
    <>
      <PageHeader eyebrow="Salesforce & Partner Network OS" title="Partners, commissions and CRM" subtitle="Partner lifecycle (applied → verified → active → suspended/terminated), compliance-approved commission plans, accrual ledger, maker-checker payouts, and the lead pipeline with consent tracking." />
      <Notice tone="warn">An Authorized Person cannot be activated without an exchange approval reference. Payout eligibility survives suspension; new business does not.</Notice>
      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        <Stat label="Partners" value={(partners ?? []).length} sub={`${(partners ?? []).filter((p) => p.status === "active").length} active`} />
        <Stat label="Accrued (gross)" value={money(acc.reduce((s, a) => s + Number(a.gross), 0))} />
        <Stat label="Pending payout (net)" value={money(acc.filter((a) => a.status !== "paid" && a.status !== "reversed").reduce((s, a) => s + Number(a.net), 0))} />
        <Stat label="Open leads" value={(leads ?? []).filter((l) => !["activated", "lost"].includes(l.status)).length} sub={`${(leads ?? []).length} total`} />
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <Card title="Partner register">
          <div className="max-h-[32rem] space-y-3 overflow-auto">
            {(partners ?? []).map((p) => { const plan = ((p.assignments as { plan: { code: string; name: string } | { code: string; name: string }[] | null; effective_to: string | null }[]) ?? []).find((a) => !a.effective_to); const pl = plan ? (Array.isArray(plan.plan) ? plan.plan[0] : plan.plan) : null; return (
              <div key={p.id} className="rounded-xl border border-border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{p.legal_name}</span><Badge>{p.category.replace("_", " ")}</Badge><Badge tone={tone(p.status)}>{p.status}</Badge><span className="font-mono text-xs text-muted">{p.referral_code}</span>{pl && <Badge tone="accent">{pl.code}</Badge>}<span className="ml-auto text-xs text-faint">{istTime(p.created_at, false)}</span></div>
                <div className="mt-1 text-xs text-muted">{p.contact_email || "no email"} · user {p.user_id ? p.user_id.slice(0, 8) : "unlinked"} · AP ref {p.exchange_approval_ref || "—"} · training until {p.training_valid_until || "—"} · activities {(p.approved_activities as string[]).join(", ") || "—"} · channels {(p.permitted_channels as string[]).join(", ") || "—"}</div>
                <div className="mt-2 grid gap-2 md:grid-cols-3">
                  <ActionForm action={setPartnerStatus} className="flex gap-1"><input type="hidden" name="id" value={p.id} /><select className="select" name="status" defaultValue={p.status}>{["applied", "verified", "active", "suspended", "terminated"].map((s) => <option key={s}>{s}</option>)}</select><input className="input w-24" name="note" placeholder="Note" /><button className="btn btn-ghost btn-sm">Set</button></ActionForm>
                  <ActionForm action={assignCommissionPlan} className="flex gap-1"><input type="hidden" name="partner_id" value={p.id} /><select className="select" name="plan_code" defaultValue={pl?.code}>{(plans ?? []).filter((x) => x.partner_category === p.category).map((x) => <option key={x.id} value={x.code}>{x.code} ({x.status})</option>)}</select><button className="btn btn-ghost btn-sm">Assign plan</button></ActionForm>
                  <ActionForm action={createPayout} successText="Payout request created." className="flex gap-1"><input type="hidden" name="partner_id" value={p.id} /><button className="btn btn-ghost btn-sm">Create payout</button></ActionForm>
                </div>
                <details className="mt-2 text-xs"><summary className="cursor-pointer text-muted">Edit permissions</summary>
                  <ActionForm action={updatePartner} successText="Updated." className="mt-2 grid grid-cols-2 gap-1"><input type="hidden" name="id" value={p.id} /><input className="input" name="approved_activities" placeholder="activities, comma separated" /><input className="input" name="permitted_channels" placeholder="channels, comma separated" /><input className="input" name="exchange_approval_ref" placeholder="Exchange approval ref (AP)" /><input className="input" name="training_valid_until" type="date" /><input className="input" name="user_id" placeholder="Link login user id (uuid)" /><button className="btn btn-ghost btn-sm">Save</button></ActionForm></details>
              </div>); })}
            {(partners ?? []).length === 0 && <p className="text-sm text-muted">No partners registered.</p>}
          </div>
        </Card>
        <div className="space-y-5">
          <Card title="Register partner">
            <ActionForm action={registerPartner} successText="Registered as applied." className="grid grid-cols-2 gap-2 text-sm"><input className="input col-span-2" name="legal_name" placeholder="Legal name" required /><select className="select" name="category"><option value="introducer">introducer</option><option value="affiliate">affiliate</option><option value="authorized_person">authorized person</option><option value="franchise">franchise</option><option value="employee">employee</option></select><input className="input" name="contact_email" type="email" placeholder="Contact email" /><input className="input" name="referral_code" placeholder="Referral code (auto if blank)" /><input className="input" name="user_id" placeholder="Login user id (optional)" /><input className="input col-span-2" name="compliance_note" placeholder="Compliance note" /><button className="btn btn-primary btn-sm">Register</button></ActionForm>
          </Card>
          <Card title="Commission plans" subtitle="Each plan records its legal basis; compliance approves">
            <ul className="mb-3 text-xs">{(plans ?? []).map((p) => <li key={p.id} className="flex justify-between py-1"><span><span className="font-mono">{p.code}</span> {p.name} · {p.partner_category} · {p.basis} {p.rate}{p.cap_per_event ? ` cap ${money(p.cap_per_event)}` : ""} · TDS {p.tds_pct}%</span><Badge tone={tone(p.status)}>{p.status}</Badge></li>)}</ul>
            <ActionForm action={createCommissionPlan} successText="Plan created; awaiting compliance approval." className="grid grid-cols-2 gap-2 text-sm"><input className="input" name="code" placeholder="CODE" required /><input className="input" name="name" placeholder="Name" required /><select className="select" name="partner_category"><option value="introducer">introducer</option><option value="affiliate">affiliate</option><option value="authorized_person">authorized person</option><option value="franchise">franchise</option><option value="employee">employee</option></select><select className="select" name="basis"><option>FIXED_PER_ACTIVATION</option><option>REVENUE_SHARE_PCT</option><option>FIXED_SERVICE_FEE</option></select><input className="input tnum" name="rate" type="number" step="any" placeholder="Rate (₹ or %)" required /><input className="input tnum" name="cap_per_event" type="number" step="any" placeholder="Cap per event ₹" /><input className="input tnum" name="monthly_cap" type="number" step="any" placeholder="Monthly cap ₹" /><input className="input tnum" name="tds_pct" type="number" step="0.5" placeholder="TDS % (10)" /><input className="input col-span-2" name="legal_basis" placeholder="Legal basis (regulation / agreement reference)" required /><button className="btn btn-ghost btn-sm">Create plan</button></ActionForm>
          </Card>
          <Card title="Payouts" subtitle="Finance/admin approve; posts Dr 5100 / Cr 2400 net and Cr 2200 TDS">
            {(payouts ?? []).length === 0 ? <p className="text-sm text-muted">No payouts.</p> : (payouts ?? []).map((po) => <div key={po.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 text-sm last:border-0"><span>{((Array.isArray(po.partner) ? po.partner[0] : po.partner) as { legal_name: string } | null)?.legal_name} · gross {money(po.gross)} · TDS {money(po.tds)} · net {money(po.net)} · {istTime(po.created_at, false)}</span><Badge tone={tone(po.status)}>{po.status}</Badge>{po.status === "pending_approval" && ["finance", "admin", "super_admin"].includes(role) && <ActionForm action={settlePayout} className="flex gap-1"><input type="hidden" name="id" value={po.id} /><button className="btn btn-primary btn-sm" name="decision" value="approve">Approve & pay</button><button className="btn btn-ghost btn-sm" name="decision" value="reject">Reject</button></ActionForm>}</div>)}
          </Card>
        </div>
      </div>
      <Card title={`Lead pipeline (${(leads ?? []).length})`} className="mt-5" subtitle="Round-robin assigned to the sales team; consent and source are recorded on every lead">
        <div className="max-h-[28rem] overflow-auto"><table className="table text-xs"><thead><tr><th>Lead</th><th>Source</th><th>Consent</th><th>Status</th><th>Assigned</th><th>Created</th><th>Update</th></tr></thead><tbody>
          {(leads ?? []).map((l) => { const pn = ((Array.isArray(l.partner) ? l.partner[0] : l.partner) as { legal_name: string } | null)?.legal_name; const an = ((Array.isArray(l.assignee) ? l.assignee[0] : l.assignee) as { full_name: string } | null)?.full_name; return (
            <tr key={l.id}><td><div className="font-medium">{l.full_name}</div><div className="text-muted">{l.email || l.phone || "—"}</div></td><td>{l.source}{pn ? ` · ${pn}` : ""}</td><td>{l.consent_marketing ? <Badge tone="ok">yes</Badge> : <Badge tone="bad">no</Badge>}</td><td><Badge tone={tone(l.status)}>{l.status}</Badge></td><td>{an || "—"}</td><td>{istTime(l.created_at, false)}</td>
              <td>{!["activated", "lost"].includes(l.status) && <ActionForm action={updateLead} className="flex gap-1"><input type="hidden" name="id" value={l.id} /><select className="select" name="status" defaultValue={l.status}>{["new", "contacted", "qualified", "application", "lost"].map((s) => <option key={s}>{s}</option>)}</select><select className="select" name="assignee" defaultValue={l.assigned_to ?? ""}><option value="">assignee</option>{(sales ?? []).map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}</select><input className="input w-28" name="note" placeholder="Note" /><button className="btn btn-ghost btn-sm">Save</button></ActionForm>}</td></tr>); })}
        </tbody></table></div>
      </Card>
    </>
  );
}
