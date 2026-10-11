import Link from "next/link";
import { getBriefing, getCategories, getPublishedArticles } from "@/lib/daily";
import { istTime, pct } from "@/lib/format";
import { Badge, PageHeader, SimBadge } from "@/components/ui";
import NewsletterForm from "./NewsletterForm";
import clsx from "clsx";

export const metadata = { title: "AIRAVAT DAILY — The Financial Journal", description: "Daily market briefs, explainers and financial education from AIRAVAT. Simulated sandbox data; educational content." };

export default async function Daily({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const [articles, cats, briefing] = await Promise.all([getPublishedArticles({ category, limit: 40 }), getCategories(), getBriefing()]);
  const [featured, ...rest] = articles;
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageHeader eyebrow="AIRAVAT DAILY" title="The Financial Journal" subtitle="Market briefs, explainers and financial literacy, reviewed by humans before publication. Educational content, not advice." action={<Link href="/briefing" className="btn btn-primary btn-sm">Today&apos;s briefing →</Link>} />
      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="/daily" className={clsx("btn btn-sm", !category ? "btn-primary" : "btn-ghost")}>All</Link>
        {cats.map((c) => <Link key={c.slug} href={`/daily?category=${c.slug}`} className={clsx("btn btn-sm", category === c.slug ? "btn-primary" : "btn-ghost")}>{c.name}</Link>)}
      </div>
      {briefing && (
        <div className="m-frost mb-8 flex flex-wrap items-center gap-4 p-4 text-sm">
          <SimBadge /><span className="text-muted">Session {briefing.market.status}</span>
          {briefing.indices.map((i) => <span key={i.symbol} className="tnum">{i.symbol} <strong>{i.ltp.toLocaleString("en-IN")}</strong> <span className={i.change_pct >= 0 ? "text-profit" : "text-loss"}>{pct(i.change_pct)}</span></span>)}
          <span className="text-muted">Breadth ▲{briefing.breadth.up} ▼{briefing.breadth.down}</span>
        </div>
      )}
      {articles.length === 0 ? (
        <div className="glass p-10 text-center text-muted">No published articles in this section yet. The newsroom publishes only after editorial (and, where required, compliance) approval.</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.618fr_1fr]">
          <Link href={`/daily/${featured.slug}`} className="m-crystal sheen block p-8">
            <div className="flex items-center gap-2 text-xs"><Badge tone="accent">Featured</Badge><Badge>{featured.category?.name ?? "Journal"}</Badge>{featured.ai_assisted && <Badge tone="info">AI-assisted draft, human reviewed</Badge>}</div>
            <h2 className="font-display mt-3 text-3xl font-bold">{featured.title}</h2>
            {featured.dek && <p className="mt-2 text-muted">{featured.dek}</p>}
            <div className="mt-4 text-xs text-faint">{istTime(featured.published_at)} · {featured.reading_minutes} min read</div>
          </Link>
          <div className="space-y-3">
            {rest.slice(0, 8).map((a) => (
              <Link key={a.id} href={`/daily/${a.slug}`} className="glass block p-4 transition hover:border-border-strong">
                <div className="text-xs text-accent">{a.category?.name ?? "Journal"}</div>
                <div className="font-display mt-1 font-semibold">{a.title}</div>
                <div className="mt-1 text-xs text-faint">{istTime(a.published_at)} · {a.reading_minutes} min</div>
              </Link>
            ))}
          </div>
        </div>
      )}
      {rest.length > 8 && (
        <div className="mt-8 grid gap-4 md:grid-cols-3">{rest.slice(8).map((a) => <Link key={a.id} href={`/daily/${a.slug}`} className="glass p-4"><div className="text-xs text-accent">{a.category?.name}</div><div className="mt-1 font-semibold">{a.title}</div></Link>)}</div>
      )}
      <div className="mt-12 grid gap-6 md:grid-cols-[1fr_1.618fr]">
        <NewsletterForm />
        <div className="glass p-6 text-sm text-muted">
          <div className="font-display text-base font-semibold text-text">Editorial standards</div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Every article passes an editorial review; market commentary, research and news summaries also pass compliance review before publication.</li>
            <li>AI-assisted drafts are labelled and always human-edited. Facts needing sources are marked until a source is attached.</li>
            <li>Nothing in AIRAVAT DAILY is personalised investment advice. Market figures on this site are simulated sandbox data.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
