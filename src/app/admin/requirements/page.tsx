import { requireStaff } from "@/lib/auth";
import { Badge, PageHeader } from "@/components/ui";
import { updateRequirement } from "../actions";

const STATUSES = ["Not started", "Researching", "Designed", "In development", "Implemented", "Tested", "Blocked", "Externally dependent", "Certified", "Production ready"];
const tone = (s: string) => (["Tested", "Certified", "Production ready"].includes(s) ? "ok" : ["Implemented", "In development", "Designed"].includes(s) ? "info" : ["Blocked", "Externally dependent"].includes(s) ? "bad" : "default");

export default async function Requirements() {
  const { supabase } = await requireStaff("/admin/requirements");
  const { data: rows } = await supabase.from("requirements").select("*").order("req_id");
  const counts = new Map<string, number>(); (rows ?? []).forEach((r) => counts.set(r.status, (counts.get(r.status) ?? 0) + 1));
  return (
    <>
      <PageHeader eyebrow="Governance" title="Master requirements register" subtitle="Every requirement has a unique id and an honest status. 'Implemented' is not 'production ready'." />
      <div className="mb-4 flex flex-wrap gap-2">{STATUSES.filter((s) => counts.get(s)).map((s) => <Badge key={s} tone={tone(s)}>{s}: {counts.get(s)}</Badge>)}</div>
      <div className="glass overflow-x-auto p-2">
        <table className="table text-sm"><thead><tr><th>ID</th><th>Requirement</th><th>Module</th><th>Source</th><th>Pri</th><th>Status</th><th>Notes</th></tr></thead>
          <tbody>{(rows ?? []).map((r) => (
            <tr key={r.req_id}><td className="tnum font-medium">{r.req_id}</td><td>{r.title}</td><td className="text-muted">{r.module}</td><td className="text-xs text-faint">{r.source}</td><td>{r.priority}</td>
              <td><form action={updateRequirement} className="flex items-center gap-1"><input type="hidden" name="req_id" value={r.req_id} /><input type="hidden" name="notes" value={r.notes ?? ""} /><select className="select !w-auto !py-1 !text-xs" name="status" defaultValue={r.status}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select><button className="btn btn-ghost btn-sm">Set</button></form></td>
              <td className="max-w-xs text-xs text-muted">{r.notes}</td></tr>))}</tbody></table>
      </div>
    </>
  );
}
