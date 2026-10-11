import { requireStaff } from "@/lib/auth";
import { istTime } from "@/lib/format";
import { Badge, Card, Empty, PageHeader, statusTone } from "@/components/ui";
import { reviewKyc } from "../actions";
import ActionForm from "@/components/ActionForm";

export default async function KycQueue() {
  const { supabase, profile } = await requireStaff("/admin/kyc");
  const { data: apps } = await supabase.from("kyc_applications").select("*, profile:profiles(email,full_name)").order("submitted_at", { ascending: false }).limit(100);
  const canReview = !!profile && ["compliance", "ops", "admin", "super_admin"].includes(profile.role);
  const pending = (apps ?? []).filter((a) => a.status === "under_review");
  return (
    <>
      <PageHeader eyebrow="KYC" title="Onboarding review queue" subtitle={`${pending.length} awaiting review. Sandbox auto-approval may be enabled in System settings; approvals are audited either way.`} />
      {(apps ?? []).length === 0 ? <Empty title="No applications" /> : (
        <div className="space-y-4">{(apps ?? []).map((a) => { const pr = a.profile as unknown as { email: string; full_name: string }; const addr = a.address as { line1: string; city: string; state: string; pincode: string } | null; return (
          <Card key={a.id} title={<>{pr?.full_name || pr?.email} <Badge tone={statusTone(a.status)} className="ml-2">{a.status}</Badge></>} subtitle={<>{pr?.email} · submitted {istTime(a.submitted_at)} · PAN masked {a.pan ? `${a.pan.slice(0, 2)}XXXXXX${a.pan.slice(-2)}` : "—"}</>}>
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <div><span className="text-muted">DOB</span> {a.date_of_birth}</div><div><span className="text-muted">Occupation</span> {a.occupation}</div><div><span className="text-muted">Income</span> {a.income_range}</div>
              <div><span className="text-muted">Experience</span> {a.trading_experience}</div><div><span className="text-muted">Risk profile</span> {a.risk_profile}</div><div><span className="text-muted">Segments</span> {(a.segments as string[]).join(", ")}</div>
              <div className="sm:col-span-3"><span className="text-muted">Address</span> {addr ? `${addr.line1}, ${addr.city}, ${addr.state} ${addr.pincode}` : "—"}</div>
              <div className="sm:col-span-3"><span className="text-muted">Nominee</span> {(a.nominee as { name: string; relationship: string })?.name} ({(a.nominee as { relationship: string })?.relationship}) · <span className="text-muted">Declarations</span> {Object.entries((a.declarations ?? {}) as Record<string, boolean>).filter(([, v]) => v).map(([k]) => k).join(", ")}</div>
              {a.rejection_reason && <div className="sm:col-span-3 text-xs text-muted">Reviewer note: {a.rejection_reason}</div>}
            </div>
            {a.status === "under_review" && canReview && (
              <ActionForm action={reviewKyc} className="mt-4 flex flex-wrap items-center gap-2"><input type="hidden" name="id" value={a.id} /><input className="input max-w-xs" name="note" placeholder="Reviewer note (required for reject)" />
                <button className="btn btn-primary btn-sm" name="decision" value="approve">Approve</button><button className="btn btn-ghost btn-sm" name="decision" value="reject">Reject</button></ActionForm>
            )}
          </Card>); })}</div>
      )}
    </>
  );
}
