import { requireStaff } from "@/lib/auth";
import { istTime } from "@/lib/format";
import { Badge, PageHeader } from "@/components/ui";

export default async function Audit({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { supabase } = await requireStaff("/admin/audit");
  let query = supabase.from("audit_events").select("*").order("id", { ascending: false }).limit(300);
  if (q) query = query.or(`action.ilike.%${q}%,entity_type.ilike.%${q}%,entity_id.ilike.%${q}%`);
  const { data: rows } = await query;
  return (
    <>
      <PageHeader eyebrow="Audit" title="Audit log" subtitle="Append-only. Every sensitive action records actor, role, entity, before/after state, outcome and a correlation id." />
      <form className="mb-4 flex gap-2"><input className="input max-w-sm" name="q" defaultValue={q ?? ""} placeholder="Filter by action, entity or id" /><button className="btn btn-ghost">Filter</button></form>
      <div className="glass overflow-x-auto p-2">
        <table className="table text-xs">
          <thead><tr><th>#</th><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Outcome</th><th>After</th></tr></thead>
          <tbody>{(rows ?? []).map((e) => (
            <tr key={e.id}><td>{e.id}</td><td className="text-muted">{istTime(e.created_at)}</td><td><div>{e.actor_id ? e.actor_id.slice(0, 8) : "system"}</div><Badge>{e.actor_role ?? "—"}</Badge></td><td className="font-medium">{e.action}</td><td className="text-muted">{e.entity_type} {e.entity_id?.slice(0, 12)}</td><td><Badge tone={e.outcome === "success" ? "ok" : "bad"}>{e.outcome}</Badge></td><td className="max-w-md truncate text-faint" title={JSON.stringify(e.after_state)}>{e.after_state ? JSON.stringify(e.after_state).slice(0, 140) : ""}</td></tr>))}</tbody>
        </table>
      </div>
    </>
  );
}
