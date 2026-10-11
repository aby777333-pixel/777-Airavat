import { requireStaff } from "@/lib/auth";
import { istTime } from "@/lib/format";
import { Badge, Card, PageHeader, Stat } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { updateEnquiry } from "./actions";

const tone = (s: string) => (s === "answered" || s === "closed" ? "ok" : s === "spam" ? "bad" : s === "in_progress" ? "info" : "default");

export default async function Enquiries({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireStaff("/admin/enquiries");
  let q = supabase.from("site_enquiries").select("*").order("created_at", { ascending: false }).limit(200);
  if (sp.status) q = q.eq("status", sp.status);
  const { data: rows } = await q;
  const open = (rows ?? []).filter((r) => r.status === "new" || r.status === "in_progress");
  const grievances = (rows ?? []).filter((r) => r.kind === "grievance" && r.status !== "closed");
  return (
    <>
      <PageHeader eyebrow="Service" title="Website enquiries" subtitle="Every enquiry from the public contact form, with reference, consent and status. Grievances carry a 48-hour acknowledgement target." />
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Open" value={open.length} />
        <Stat label="Grievances open" value={grievances.length} tone={grievances.length ? "loss" : "default"} />
        <Stat label="Marketing consent" value={(rows ?? []).filter((r) => r.consent_marketing).length} sub="pushed to CRM leads" />
        <Stat label="Loaded" value={(rows ?? []).length} />
      </div>
      <div className="mb-4 flex flex-wrap gap-2 text-xs">{["", "new", "in_progress", "answered", "closed", "spam"].map((s) => <a key={s} href={s ? `?status=${s}` : "?"} className={`badge ${sp.status === s || (!sp.status && !s) ? "badge-accent" : ""}`}>{s || "all"}</a>)}</div>
      <div className="space-y-4">
        {(rows ?? []).map((e) => (
          <Card key={e.id} title={<span><span className="font-mono text-xs">{e.reference}</span> · {e.subject || e.kind.replace(/_/g, " ")} {e.kind === "grievance" && <Badge tone="bad">grievance</Badge>} <Badge tone={tone(e.status)}>{e.status}</Badge></span>} subtitle={`${e.full_name} · ${e.email ?? "—"} · ${e.phone ?? "—"} · ${[e.city, e.state].filter(Boolean).join(", ") || e.country} · ${istTime(e.created_at)}`}>
            <p className="whitespace-pre-wrap text-sm">{e.message}</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted sm:grid-cols-4">
              <dt>Kind</dt><dd className="text-text">{e.kind}</dd><dt>Language</dt><dd className="text-text">{e.preferred_language}</dd>
              <dt>Existing client</dt><dd className="text-text">{e.existing_client ? e.client_code || "yes" : "no"}</dd><dt>Segments</dt><dd className="text-text">{(e.segments as string[]).join(", ") || "—"}</dd>
              <dt>Horizon / detail</dt><dd className="text-text">{e.horizon || "—"}</dd><dt>Capital</dt><dd className="text-text">{e.capital_range || "—"}</dd>
              <dt>Heard from</dt><dd className="text-text">{e.heard_from || "—"}</dd><dt>Callback</dt><dd className="text-text">{e.callback_slot || "—"}</dd>
              <dt>Consent</dt><dd className="text-text">contact{e.consent_marketing ? " + marketing" : ""}{e.lead_id ? ` · lead #${e.lead_id}` : ""}</dd><dt>Staff note</dt><dd className="text-text">{e.staff_note || "—"}</dd>
            </dl>
            <ActionForm action={updateEnquiry} successText="Updated." className="mt-3 flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={e.id} />
              <input name="note" className="input !w-72 !py-1 !text-xs" placeholder="Note (what was answered, where)" />
              {["in_progress", "answered", "closed", "spam"].map((s) => <button key={s} name="status" value={s} className="btn btn-ghost btn-sm">{s.replace("_", " ")}</button>)}
            </ActionForm>
          </Card>
        ))}
        {(rows ?? []).length === 0 && <p className="text-sm text-muted">No enquiries.</p>}
      </div>
    </>
  );
}
