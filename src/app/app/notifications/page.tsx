import { requireUser } from "@/lib/auth";
import { istTime } from "@/lib/format";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { markAllRead } from "../actions";

export default async function Notifications() {
  const { supabase, user } = await requireUser("/app/notifications");
  const { data: items } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
  return (
    <>
      <PageHeader eyebrow="Notifications" title="Notification centre" action={<form action={markAllRead}><button className="btn btn-ghost btn-sm">Mark all read</button></form>} />
      {(items ?? []).length === 0 ? <Empty title="No notifications" /> : (
        <ul className="space-y-2">{(items ?? []).map((n) => (
          <li key={n.id} className={`glass p-4 ${n.read_at ? "opacity-70" : ""}`}><div className="flex items-center justify-between gap-3"><div className="font-medium">{n.title}</div><div className="flex items-center gap-2"><Badge tone="info">{n.kind}</Badge><span className="text-xs text-faint">{istTime(n.created_at)}</span></div></div>{n.body && <p className="mt-1 text-sm text-muted">{n.body}</p>}</li>))}</ul>
      )}
    </>
  );
}
