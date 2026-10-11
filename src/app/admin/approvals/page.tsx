import { requireStaff } from "@/lib/auth";
import { istTime } from "@/lib/format";
import { Badge, Notice, PageHeader } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { decideApproval } from "../ops/actions";

export default async function Approvals({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "pending_approval" } = await searchParams;
  const { supabase, user } = await requireStaff("/admin/approvals");
  const { data: rows } = await supabase.from("approval_requests").select("*").eq("status", status).order("created_at", { ascending: false }).limit(100);
  const ids = [...new Set((rows ?? []).map((r) => r.requested_by))];
  const { data: people } = ids.length ? await supabase.from("profiles").select("id,full_name,email").in("id", ids) : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
  const who = new Map((people ?? []).map((p) => [p.id, p]));
  const list = (rows ?? []).map((r) => ({ ...r, requester: who.get(r.requested_by) ?? null }));
  return (
    <>
      <PageHeader eyebrow="Maker-checker" title="Approvals queue" subtitle="Every RevenueOS and partner change waits here. The database enforces who may approve what, and that the requester is never the approver." />
      <Notice tone="info">fee_definition → finance/admin (statutory: compliance) · waiver_grant → finance/admin · offer_campaign → compliance · pricing_plan → finance/admin · charge_adjustment → finance/admin · commission_plan → compliance · partner_payout → finance/admin.</Notice>
      <div className="my-4 flex gap-2 text-sm">{["pending_approval", "approved", "rejected"].map((s) => <a key={s} href={`/admin/approvals?status=${s}`} className={s === status ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}>{s.replace("_", " ")}</a>)}</div>
      {list.length === 0 ? <div className="glass p-8 text-center text-muted">Nothing {status.replace("_", " ")}.</div> : (
        <div className="space-y-3">
          {list.map((r) => (
            <div key={r.id} className="glass p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm"><Badge tone="accent">{r.entity_type}</Badge><span className="font-mono text-xs">#{r.entity_id}</span><span className="text-muted">{r.action}</span><Badge tone={r.status === "approved" ? "ok" : r.status === "rejected" ? "bad" : "info"}>{r.status}</Badge><span className="ml-auto text-xs text-faint">requested {istTime(r.created_at)} by {r.requester?.full_name || r.requester?.email || r.requested_by.slice(0, 8)}</span></div>
              <details className="mt-2 text-xs"><summary className="cursor-pointer text-muted">Payload</summary><pre className="mt-1 max-h-48 overflow-auto rounded bg-bg/50 p-2">{JSON.stringify(r.payload, null, 1)}</pre></details>
              {r.note && <div className="mt-1 text-xs text-muted">Note: {r.note}</div>}
              {r.status === "pending_approval" && (r.requested_by === user.id ? <div className="mt-2 text-xs text-warn">You raised this request; another approver must decide.</div> : (
                <ActionForm action={decideApproval} className="mt-3 flex flex-wrap gap-2 text-sm"><input type="hidden" name="id" value={r.id} /><input className="input max-w-sm" name="note" placeholder="Decision note (required for rejection)" /><button className="btn btn-primary btn-sm" name="decision" value="approve">Approve</button><button className="btn btn-ghost btn-sm" name="decision" value="reject">Reject</button></ActionForm>
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
