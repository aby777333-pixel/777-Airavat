import { requireUser } from "@/lib/auth";
import { istTime } from "@/lib/format";
import { Badge, Card, PageHeader } from "@/components/ui";
import { createTicket, replyTicket } from "../actions";
import TicketForm from "./TicketForm";

export default async function Support() {
  const { supabase, user } = await requireUser("/app/support");
  const { data: tickets } = await supabase.from("support_tickets").select("*, messages:ticket_messages(*)").eq("user_id", user.id).order("updated_at", { ascending: false });
  return (
    <>
      <PageHeader eyebrow="Support" title="Help and grievances" subtitle="Tickets are timestamped and tracked to resolution. Complaints are categorised so they can be escalated through the grievance process once it exists." />
      <div className="grid gap-5 lg:grid-cols-[1fr_1.618fr]">
        <TicketForm action={createTicket} />
        <div className="space-y-4">
          {(tickets ?? []).length === 0 && <Card title="No tickets yet"><p className="text-sm text-muted">Raise one on the left.</p></Card>}
          {(tickets ?? []).map((t) => (
            <Card key={t.id} title={t.subject} subtitle={<>{t.category} · opened {istTime(t.created_at)}</>} action={<Badge tone={t.status === "resolved" ? "ok" : t.status === "answered" ? "info" : "default"}>{t.status}</Badge>}>
              <ul className="space-y-2 text-sm">{(t.messages as { id: number; body: string; is_staff: boolean; created_at: string }[]).sort((a, b) => a.id - b.id).map((m) => (
                <li key={m.id} className={m.is_staff ? "rounded-lg bg-accent/10 p-2" : "rounded-lg bg-bg/40 p-2"}><div className="text-xs text-faint">{m.is_staff ? "AIRAVAT support" : "You"} · {istTime(m.created_at)}</div><div className="mt-1 whitespace-pre-wrap">{m.body}</div></li>))}</ul>
              {t.status !== "resolved" && <form action={replyTicket} className="mt-3 flex gap-2"><input type="hidden" name="ticket_id" value={t.id} /><input className="input" name="body" placeholder="Reply…" required /><button className="btn btn-ghost btn-sm">Send</button></form>}
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
