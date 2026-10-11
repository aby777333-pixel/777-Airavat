import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Markdown } from "@/lib/markdown";
import { istTime } from "@/lib/format";
import { Badge } from "@/components/ui";
import { getPublishedArticles } from "@/lib/daily";

export default async function Article({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: a } = await supabase.from("articles").select("*, category:article_categories(slug,name), author:profiles(full_name)").eq("slug", slug).eq("status", "published").maybeSingle();
  if (!a) notFound();
  const cat = (Array.isArray(a.category) ? a.category[0] : a.category) as { slug: string; name: string } | null;
  const author = (Array.isArray(a.author) ? a.author[0] : a.author) as { full_name: string } | null;
  const related = (await getPublishedArticles({ category: cat?.slug, limit: 4 })).filter((r) => r.slug !== slug).slice(0, 3);
  const sources = (a.sources ?? []) as { title: string; url?: string }[];
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Link href="/daily" className="text-accent">AIRAVAT DAILY</Link><span className="text-faint">/</span>{cat && <Link href={`/daily?category=${cat.slug}`} className="text-muted">{cat.name}</Link>}
        <Badge tone="info">{a.classification.replace("_", " ")}</Badge>{a.ai_assisted && <Badge tone="sim">AI-assisted, human reviewed</Badge>}
      </div>
      <h1 className="font-display mt-4 text-4xl font-bold leading-tight">{a.title}</h1>
      {a.dek && <p className="mt-3 text-lg text-muted">{a.dek}</p>}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-faint">
        <span>By {author?.full_name || "AIRAVAT Editorial"}</span><span>Published {istTime(a.published_at)}</span>{a.updated_at !== a.created_at && <span>Updated {istTime(a.updated_at)}</span>}<span>{a.reading_minutes} min read</span>
      </div>
      <div className="m-ceramic mt-8 p-8 text-[#1d1b17] [&_.prose_h1]:text-[#1d1b17] [&_.prose_h2]:text-[#1d1b17] [&_.prose_p]:text-[#3b3933] [&_.prose_li]:text-[#3b3933] [&_.prose_strong]:text-[#1d1b17]">
        <Markdown source={a.body_md} />
      </div>
      {sources.length > 0 && (
        <section className="glass mt-6 p-5 text-sm"><div className="font-semibold">Sources</div><ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">{sources.map((s, i) => <li key={i}>{s.url ? <a className="underline" href={s.url} target="_blank" rel="noreferrer">{s.title}</a> : s.title}</li>)}</ol></section>
      )}
      <section className="mt-6 rounded-xl border border-warn/40 bg-warn/10 p-4 text-xs text-warn">
        Educational content. Not investment advice, not a research recommendation. AIRAVAT is a sandbox platform without regulatory registrations; any market figures are simulated.
      </section>
      {related.length > 0 && (
        <section className="mt-10"><div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Related</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">{related.map((r) => <Link key={r.id} href={`/daily/${r.slug}`} className="glass p-4 text-sm font-medium">{r.title}</Link>)}</div></section>
      )}
    </article>
  );
}
