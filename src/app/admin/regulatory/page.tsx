import { requireStaff } from "@/lib/auth";
import { Badge, Notice, PageHeader } from "@/components/ui";
import { updateObligation } from "../actions";

const STATUSES = ["Not started", "Researching", "Designed", "In development", "Implemented", "Tested", "Blocked", "Externally dependent", "Certified", "Production ready"];

export default async function Regulatory() {
  const { supabase, profile } = await requireStaff("/admin/regulatory");
  const { data: rows } = await supabase.from("regulatory_obligations").select("*").order("regulation_id");
  const can = !!profile && ["compliance", "admin", "super_admin"].includes(profile.role);
  return (
    <>
      <PageHeader eyebrow="Compliance" title="Regulatory obligation register" subtitle="Each entry must be traced to an official source and verified by a compliance professional before it is relied upon. None are verified yet." />
      <Notice tone="warn">Nothing in this register is a claim of compliance. Thresholds, dates and circular references must be validated against SEBI, exchange and depository sources.</Notice>
      <div className="mt-5 space-y-3">{(rows ?? []).map((r) => (
        <div key={r.regulation_id} className="glass p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><div className="text-xs font-semibold text-accent">{r.regulation_id} · {r.authority}</div><div className="font-medium">{r.requirement}</div><div className="text-xs text-muted">{r.circular_reference} · applies to: {r.applicability} · <a className="underline" href={r.source_url ?? "#"} target="_blank" rel="noreferrer">source</a></div></div>
            <div className="flex gap-2"><Badge tone={r.verified ? "ok" : "bad"}>{r.verified ? "verified" : "unverified"}</Badge><Badge tone="info">{r.status}</Badge></div>
          </div>
          {can && <form action={updateObligation} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_2fr_auto]"><input type="hidden" name="regulation_id" value={r.regulation_id} />
            <select className="select" name="status" defaultValue={r.status}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select><input className="input" name="owner" defaultValue={r.owner ?? ""} placeholder="Owner" /><input className="input" name="evidence" defaultValue={r.evidence ?? ""} placeholder="Evidence reference" /><button className="btn btn-ghost btn-sm">Save</button></form>}
        </div>))}</div>
    </>
  );
}
