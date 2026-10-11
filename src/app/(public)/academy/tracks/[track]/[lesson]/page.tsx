import Link from "next/link";
import { notFound } from "next/navigation";
import { TRACKS } from "@/lib/academy-tracks";
import { SITE } from "@/lib/seo";
import { Badge, Notice, PageHeader } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/site/ContentPageView";
import LessonQuiz from "./LessonQuiz";

export function generateStaticParams() { return TRACKS.flatMap((t) => t.lessons.map((l) => ({ track: t.slug, lesson: l.slug }))); }
export async function generateMetadata({ params }: { params: Promise<{ track: string; lesson: string }> }) {
  const { track, lesson } = await params; const t = TRACKS.find((x) => x.slug === track); const l = t?.lessons.find((x) => x.slug === lesson);
  return l ? { title: `${l.title} · ${t!.name} · AIRAVAT Academy`, description: l.body[0], alternates: { canonical: `${SITE.url}/academy/tracks/${track}/${lesson}` } } : {};
}

export default async function LessonPage({ params }: { params: Promise<{ track: string; lesson: string }> }) {
  const { track, lesson } = await params;
  const t = TRACKS.find((x) => x.slug === track); const idx = t?.lessons.findIndex((x) => x.slug === lesson) ?? -1;
  if (!t || idx < 0) notFound();
  const l = t.lessons[idx]; const prev = t.lessons[idx - 1]; const next = t.lessons[idx + 1];
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/academy", label: "Academy" }, { href: "/academy/tracks", label: "Tracks" }, { href: `/academy/tracks/${t.slug}/${t.lessons[0].slug}`, label: t.name }, { href: "#", label: l.title }]} />
      <PageHero variant="academy" intro={l.body[0]}><PageHeader eyebrow={<span className="inline-flex items-center gap-2">{t.name} · lesson {idx + 1} of {t.lessons.length} <Badge tone="info">{l.minutes} min</Badge></span>} title={l.title} /></PageHero>
      <div className="grid gap-6 lg:grid-cols-[1.618fr_1fr]">
        <article className="glass p-6"><div className="prose max-w-none">{l.body.map((p, i) => <p key={i}>{p}</p>)}</div>
          {l.tryIt && <Link href={l.tryIt.href} className="btn btn-primary btn-sm mt-4">{l.tryIt.label}</Link>}
          <div className="mt-6 flex items-center justify-between text-sm">{prev ? <Link href={`/academy/tracks/${t.slug}/${prev.slug}`} className="hover:text-accent">← {prev.title}</Link> : <span />}{next ? <Link href={`/academy/tracks/${t.slug}/${next.slug}`} className="hover:text-accent">{next.title} →</Link> : <Link href="/academy/tracks" className="text-accent">Track complete · all tracks</Link>}</div>
        </article>
        <div className="space-y-4">
          <LessonQuiz track={t.slug} lesson={l.slug} questions={l.quiz} />
          <div className="glass p-5"><div className="text-xs font-semibold uppercase tracking-wider text-accent">In this track</div><ol className="mt-2 space-y-1 text-sm">{t.lessons.map((x, i) => <li key={x.slug}><Link href={`/academy/tracks/${t.slug}/${x.slug}`} className={x.slug === l.slug ? "font-semibold text-accent" : "hover:text-accent"}>{i + 1}. {x.title}</Link></li>)}</ol></div>
        </div>
      </div>
      <div className="mt-5"><Notice tone="info">Education only. Every try-it link opens the sandbox with simulated data; nothing here is investment advice.</Notice></div>
    </div>
  );
}
