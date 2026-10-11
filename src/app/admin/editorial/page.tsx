import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { istTime } from "@/lib/format";
import { Badge, Card, Notice, PageHeader } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { transitionArticle } from "../ops/actions";

const STATUSES = ["draft", "in_review", "compliance_review", "approved", "scheduled", "published", "archived"];
const tone = (s: string) => (s === "published" ? "ok" : s === "archived" ? "default" : s === "compliance_review" ? "bad" : "info");

export default async function Editorial() {
  const { supabase, profile } = await requireStaff("/admin/editorial");
  const [{ data: articles }, { data: subs }] = await Promise.all([
    supabase.from("articles").select("id,slug,title,status,classification,scheduled_for,published_at,updated_at,ai_assisted,author:profiles!articles_author_id_fkey(full_name,email),category:article_categories(name)").order("updated_at", { ascending: false }).limit(200),
    supabase.from("newsletter_subscriptions").select("status"),
  ]);
  const role = profile?.role ?? "";
  const editorial = ["editor", "compliance", "admin", "super_admin"].includes(role);
  const cols = STATUSES.map((s) => ({ s, items: (articles ?? []).filter((a) => a.status === s) }));
  const upcoming = (articles ?? []).filter((a) => a.status === "scheduled" && a.scheduled_for).sort((a, b) => String(a.scheduled_for).localeCompare(String(b.scheduled_for)));
  return (
    <>
      <PageHeader eyebrow="Editorial Empire · AIRAVAT DAILY" title="Newsroom" subtitle="Draft → review → (compliance review for market commentary, research and news summaries) → approved → scheduled/published. Authors cannot approve their own work. Scheduled pieces publish by database cron every minute." action={editorial ? <Link href="/admin/editorial/new" className="btn btn-primary btn-sm">New article</Link> : undefined} />
      {!editorial && <Notice tone="warn">Your role can view the newsroom but not edit. Editor, compliance or admin role is required.</Notice>}
      <Notice tone="info">Newsletter: {(subs ?? []).filter((x) => x.status === "confirmed").length} confirmed · {(subs ?? []).filter((x) => x.status === "pending").length} pending confirmation. Email delivery provider is not connected; subscriptions are stored with confirmation tokens.</Notice>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cols.map(({ s, items }) => (
          <div key={s} className="glass p-3">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider"><span>{s.replace("_", " ")}</span><Badge tone={tone(s)}>{items.length}</Badge></div>
            <div className="space-y-2">
              {items.map((a) => { const au = (Array.isArray(a.author) ? a.author[0] : a.author) as { full_name: string; email: string } | null; const cat = (Array.isArray(a.category) ? a.category[0] : a.category) as { name: string } | null; return (
                <div key={a.id} className="rounded-lg border border-border bg-bg/30 p-2 text-sm">
                  <Link href={`/admin/editorial/${a.id}`} className="font-medium hover:text-accent">{a.title}</Link>
                  <div className="text-xs text-muted">{cat?.name ?? "uncategorised"} · {a.classification.replace("_", " ")} · {au?.full_name || au?.email || "—"}{a.ai_assisted ? " · AI-assisted" : ""}</div>
                  <div className="text-[11px] text-faint">{a.status === "published" ? `published ${istTime(a.published_at)}` : a.status === "scheduled" ? `scheduled ${istTime(a.scheduled_for)}` : `updated ${istTime(a.updated_at, false)}`}</div>
                  {editorial && a.status !== "archived" && (
                    <ActionForm action={transitionArticle} className="mt-1 flex flex-wrap gap-1">
                      <input type="hidden" name="id" value={a.id} />
                      {a.status === "draft" && <button className="btn btn-ghost btn-sm" name="to" value="in_review">Send to review</button>}
                      {a.status === "in_review" && <><button className="btn btn-ghost btn-sm" name="to" value="compliance_review">To compliance</button><button className="btn btn-ghost btn-sm" name="to" value="approved">Approve</button></>}
                      {a.status === "compliance_review" && <button className="btn btn-ghost btn-sm" name="to" value="approved">Compliance approve</button>}
                      {a.status === "approved" && <><button className="btn btn-primary btn-sm" name="to" value="published">Publish now</button><input className="input !w-44 !py-1 !text-xs" type="datetime-local" name="scheduled_for" /><button className="btn btn-ghost btn-sm" name="to" value="scheduled">Schedule</button></>}
                      {a.status === "scheduled" && <button className="btn btn-primary btn-sm" name="to" value="published">Publish now</button>}
                      {a.status === "published" && <><a className="btn btn-ghost btn-sm" href={`/daily/${a.slug}`} target="_blank">View</a><button className="btn btn-ghost btn-sm" name="to" value="archived">Archive</button></>}
                      {["in_review", "compliance_review", "approved", "scheduled"].includes(a.status) && <button className="btn btn-ghost btn-sm" name="to" value="draft">Back to draft</button>}
                    </ActionForm>
                  )}
                </div>); })}
              {items.length === 0 && <p className="text-xs text-faint">—</p>}
            </div>
          </div>
        ))}
      </div>
      <Card title="Editorial calendar" className="mt-5" subtitle="Scheduled publications (IST)">
        {upcoming.length === 0 ? <p className="text-sm text-muted">Nothing scheduled.</p> : <ul className="text-sm">{upcoming.map((a) => <li key={a.id} className="flex justify-between py-1"><span>{a.title}</span><span className="tnum text-muted">{istTime(a.scheduled_for)}</span></li>)}</ul>}
      </Card>
    </>
  );
}
