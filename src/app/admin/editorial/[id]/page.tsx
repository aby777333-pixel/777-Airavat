import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { istTime } from "@/lib/format";
import { Badge, Card, Notice, PageHeader } from "@/components/ui";
import ArticleEditor from "./ArticleEditor";

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireStaff(`/admin/editorial/${id}`);
  const editorial = ["editor", "compliance", "admin", "super_admin"].includes(profile?.role ?? "");
  const isNew = id === "new";
  const [{ data: cats }, article, transitions, revisions] = await Promise.all([
    supabase.from("article_categories").select("id,name").order("position"),
    isNew ? Promise.resolve(null) : supabase.from("articles").select("*").eq("id", Number(id)).maybeSingle().then((r) => r.data),
    isNew ? Promise.resolve([]) : supabase.from("article_transitions").select("*").eq("article_id", Number(id)).order("created_at", { ascending: false }).then((r) => r.data ?? []),
    isNew ? Promise.resolve([]) : supabase.from("article_revisions").select("id,version,title,change_note,created_at").eq("article_id", Number(id)).order("version", { ascending: false }).then((r) => r.data ?? []),
  ]);
  if (!isNew && !article) notFound();
  const actorIds = [...new Set(transitions.map((t) => t.actor_id).filter((x): x is string => !!x))];
  const { data: actors } = actorIds.length ? await supabase.from("profiles").select("id,full_name,email").in("id", actorIds) : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
  const actorName = (uid: string | null) => { const a = (actors ?? []).find((x) => x.id === uid); return a?.full_name || a?.email || "system"; };
  return (
    <>
      <PageHeader eyebrow="Newsroom" title={isNew ? "New article" : article!.title} subtitle={isNew ? "Drafts start private. Mark AI assistance honestly; attach sources for every factual claim." : <><Badge tone="info">{article!.status}</Badge> · {article!.classification.replace("_", " ")} · slug <code>{article!.slug}</code> · updated {istTime(article!.updated_at)}</>} action={<Link href="/admin/editorial" className="btn btn-ghost btn-sm">← Newsroom</Link>} />
      {!editorial && <Notice tone="warn">Read-only: your role cannot edit articles.</Notice>}
      <div className="grid gap-5 xl:grid-cols-[1.618fr_1fr]">
        <ArticleEditor article={article} categories={cats ?? []} readOnly={!editorial} />
        <div className="space-y-5">
          <Card title="Editorial standards" subtitle="Checked at every transition">
            <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
              <li>Education, tutorials and company updates need editorial approval. Market commentary, research and news summaries also need compliance approval.</li>
              <li>No personalised advice, no return promises, no unsourced numbers. Use [SOURCE NEEDED] in drafts and resolve before review.</li>
              <li>AI-assisted drafts are labelled on the public page. Every save creates a revision; corrections after publication keep the history.</li>
            </ul>
          </Card>
          {!isNew && <Card title="History"><ul className="text-xs text-muted">{transitions.map((t) => <li key={t.id} className="py-1"><Badge tone="info">{t.to_status}</Badge> {t.from_status ? `from ${t.from_status} ` : ""}by {actorName(t.actor_id)} · {istTime(t.created_at)}{t.note ? ` · ${t.note}` : ""}</li>)}</ul>{revisions.length > 0 && <><div className="mt-3 text-xs font-semibold">Revisions</div><ul className="text-xs text-muted">{revisions.map((r) => <li key={r.id}>v{r.version} · {r.title} · {istTime(r.created_at, false)}{r.change_note ? ` · ${r.change_note}` : ""}</li>)}</ul></>}</Card>}
        </div>
      </div>
    </>
  );
}
