import { requireStaff } from "@/lib/auth";
import { istTime } from "@/lib/format";
import { Badge, Card, PageHeader } from "@/components/ui";
import { replyTicket } from "@/app/app/actions";
import { resolveTicket } from "../actions";

export default async function SupportDesk() {
  const { supabase } = await requireStaff("/admin/support");
  const { data: tickets } = await supabase.from("support_tickets").select("*, profile:profiles(email,full_name), messages:ticket_messages(*)").order("updated_at", { ascending: false }).limit(100);
  return (
    <>
      <PageHeader eyebrow="Service" title="Support desk" subtitle="Complaints are flagged by category so they can be escalated through the grievance process." />
      <div className="space-y-4">{(tickets ?? []).map((t) => { const pr = t.profile as unknown as { email: string; full_name: string }; return (
        <Card key={t.id} title={<>{t.subject} {t.category === "complaint" && <Badge tone="bad" className="ml-2">complaint</Badge>}</>} subtitle={<>{pr?.full_name || pr?.email} · {t.category} · {istTime(t.created_at)}</>} action={<form action={resolveTicket} className="flex gap-1"><input type="hidden" name="ticket_id" value={t.id} /><select className="select !w-auto !py-1 !text-xs" name="status" defaultValue={t.status}>{["open", "answered", "escalated", "resolved"].map((s) => <option key={s}>{s}</option>)}</select><button className="btn btn-ghost btn-sm">Set</button></form>}>
          <ul className="space-y-2 text-sm">{(t.messages as { id: number; body: string; is_staff: boolean; created_at: string }[]).sort((a, b) => a.id - b.id).map((m) => <li key={m.id} className={m.is_staff ? "rounded-lg bg-accent/10 p-2" : "rounded-lg bg-bg/40 p-2"}><div className="text-xs text-faint">{m.is_staff ? "Staff" : "Client"} · {istTime(m.created_at)}</div><div className="mt-1 whitespace-pre-wrap">{m.body}</div></li>)}</ul>
          <form action={replyTicket} className="mt-3 flex gap-2"><input type="hidden" name="ticket_id" value={t.id} /><input className="input" name="body" placeholder="Reply as AIRAVAT support…" required /><button className="btn btn-primary btn-sm">Reply</button></form>
        </Card>); })}{(tickets ?? []).length === 0 && <p className="text-sm text-muted">No tickets.</p>}</div>
    </>
  );
}
