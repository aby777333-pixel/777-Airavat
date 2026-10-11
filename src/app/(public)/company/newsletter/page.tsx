import Link from "next/link";
import { getPublishedArticles } from "@/lib/daily";
import { metadataFor, seoFor } from "@/lib/seo";
import { Badge, Notice, PageHeader } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/site/ContentPageView";
import LeadForm from "@/components/site/LeadForm";

export const metadata = { ...metadataFor("/company/newsletter") };
export const dynamic = "force-dynamic";

export default async function Newsletter() {
  const issues = await getPublishedArticles({ category: "market-brief", limit: 60 });
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/daily", label: "Journal" }, { href: "/company/newsletter", label: "Newsletter" }]} />
      <PageHero variant="briefing" intro={seoFor("/company/newsletter").intro}><PageHeader eyebrow="AIRAVAT Brief" title="Newsletter archive" subtitle={<>Every published market brief, in order, with the date it went out <Badge tone="info">{issues.length} issue{issues.length === 1 ? "" : "s"}</Badge></>} /></PageHero>
      <div className="grid gap-6 lg:grid-cols-[1.618fr_1fr]">
        <div className="space-y-3">
          {issues.length === 0 && <div className="glass p-6 text-sm text-muted">No issues have been published yet. The first brief appears here the day it is sent.</div>}
          {issues.map((a) => (
            <Link key={a.id} href={`/daily/${a.slug}`} className="glass block p-5 hover:-translate-y-0.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted"><span>{a.published_at ? new Date(a.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }) : "Undated"}</span>{a.reading_minutes && <span>· {a.reading_minutes} min</span>}{a.ai_assisted && <Badge tone="info">AI-assisted, human-reviewed</Badge>}</div>
              <div className="mt-1 font-display text-lg font-semibold">{a.title}</div>
              {a.dek && <p className="mt-1 text-sm text-muted">{a.dek}</p>}
            </Link>
          ))}
        </div>
        <aside className="space-y-4">
          <LeadForm source="newsletter" title="Get the brief by email" subtitle="One email per market day before the open. Consent is recorded; unsubscribe in one click from any issue." />
          <div className="glass p-5"><div className="font-display font-semibold">What is in it</div><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted"><li>Overnight global cues and the pre-open picture (simulated feed, labelled)</li><li>Results, IPOs and corporate actions due</li><li>One regulation or education note</li><li>Never a tip, target or recommendation</li></ul></div>
          <Notice tone="info">Issues are editorial content under the maker-checker CMS, dated and versioned. Sandbox data is simulated.</Notice>
        </aside>
      </div>
    </div>
  );
}
