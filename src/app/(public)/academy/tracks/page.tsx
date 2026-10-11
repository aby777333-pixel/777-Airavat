import Link from "next/link";
import { TRACKS } from "@/lib/academy-tracks";
import { metadataFor, seoFor } from "@/lib/seo";
import { Badge, PageHeader } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/site/ContentPageView";
import TrackProgress from "./TrackProgress";

export const metadata = { ...metadataFor("/academy/tracks") };

export default function Tracks() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/academy", label: "Academy" }, { href: "/academy/tracks", label: "Learning tracks" }]} />
      <PageHero variant="academy" intro={seoFor("/academy/tracks").intro}><PageHeader eyebrow="AIRAVAT Academy" title="Learning tracks" subtitle="Three structured paths with short lessons, a try-it link into the platform and a quiz after every lesson. Progress is saved in your browser." /></PageHero>
      <div className="grid gap-5 lg:grid-cols-3">
        {TRACKS.map((t) => (
          <div key={t.slug} className="glass p-5">
            <div className="flex items-start justify-between gap-2"><div className="font-display text-lg font-semibold">{t.name}</div><Badge tone={t.level === "Beginner" ? "ok" : t.level === "Intermediate" ? "info" : "accent"}>{t.level}</Badge></div>
            <p className="mt-1 text-sm text-muted">{t.blurb}</p>
            <TrackProgress track={t.slug} total={t.lessons.length} />
            <ol className="mt-3 space-y-1.5 text-sm">{t.lessons.map((l, i) => <li key={l.slug}><Link href={`/academy/tracks/${t.slug}/${l.slug}`} className="flex justify-between gap-2 hover:text-accent"><span>{i + 1}. {l.title}</span><span className="text-xs text-faint">{l.minutes} min</span></Link></li>)}</ol>
            <Link href={`/academy/tracks/${t.slug}/${t.lessons[0].slug}`} className="btn btn-primary btn-sm mt-4">Start track</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
