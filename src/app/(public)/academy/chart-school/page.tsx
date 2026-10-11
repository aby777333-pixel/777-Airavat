import Link from "next/link";
import clsx from "clsx";
import { CANDLE_PATTERNS, CHART_PATTERNS, ESSENTIALS, INDICATORS, QUIZZES } from "@/lib/chart-school";
import { metadataFor, seoFor } from "@/lib/seo";
import { Badge, Notice, PageHeader } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/site/ContentPageView";
import { CandleFx, ChartFx } from "@/components/academy/PatternFx";
import Quiz from "@/components/academy/Quiz";

export const metadata = { ...metadataFor("/academy/chart-school") };
const tone = (b: string) => (b === "bullish" ? "ok" : b === "bearish" ? "bad" : b === "continuation" ? "accent" : "info");

export default function ChartSchool() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/academy", label: "Academy" }, { href: "/academy/chart-school", label: "Chart School" }]} />
      <PageHero variant="academy" intro={seoFor("/academy/chart-school").intro}><PageHeader eyebrow="AIRAVAT Academy" title="Chart School" subtitle={`${CANDLE_PATTERNS.length} candlestick patterns · ${CHART_PATTERNS.length} chart patterns · ${INDICATORS.length} indicators · ${ESSENTIALS.length} Indian-market essentials, each animated`} /></PageHero>
      <nav className="flex flex-wrap gap-2 text-xs" aria-label="Sections">{[["#candles", "Candlestick patterns"], ["#charts", "Chart patterns"], ["#indicators", "Indicators"], ["#india", "Indian market essentials"], ["#quiz", "Quizzes"]].map(([h, l]) => <a key={h} href={h} className="badge !normal-case !tracking-normal">{l}</a>)}</nav>

      <h2 id="candles" className="font-display mt-8 scroll-mt-24 text-2xl font-semibold">Candlestick patterns</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted">Faded candles show the trend the pattern needs; the highlighted box is the pattern itself. Hover a card for the psychology, open it for confirmation rules and failure modes.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {CANDLE_PATTERNS.map((p) => (
          <Link key={p.slug} href={`/academy/chart-school/${p.slug}`} className="glass group block p-4 transition hover:-translate-y-0.5">
            <CandleFx lead={p.lead} body={p.body} />
            <div className="mt-2 flex items-start justify-between gap-2"><div><div className="font-display font-semibold">{p.name}</div>{p.hindi && <div className="text-xs text-faint">{p.hindi}</div>}</div><Badge tone={tone(p.bias) as "ok" | "bad" | "info"}>{p.bias}</Badge></div>
            <div className="mt-1 text-xs text-muted">{p.candles} candle{p.candles > 1 ? "s" : ""} · after {p.context === "any" ? "any move" : `a ${p.context}`}</div>
            <p className="mt-2 line-clamp-2 text-xs text-muted group-hover:text-text">{p.what}</p>
          </Link>
        ))}
      </div>

      <h2 id="charts" className="font-display mt-12 scroll-mt-24 text-2xl font-semibold">Chart patterns</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CHART_PATTERNS.map((p) => (
          <Link key={p.slug} href={`/academy/chart-school/${p.slug}`} className="glass group block p-4 transition hover:-translate-y-0.5">
            <ChartFx pattern={p} />
            <div className="mt-2 flex items-start justify-between gap-2"><div className="font-display font-semibold">{p.name}</div><Badge tone={tone(p.bias) as "ok" | "bad" | "info" | "accent"}>{p.bias}</Badge></div>
            <p className="mt-2 line-clamp-2 text-xs text-muted group-hover:text-text">{p.what}</p>
          </Link>
        ))}
      </div>

      <h2 id="indicators" className="font-display mt-12 scroll-mt-24 text-2xl font-semibold">Indicators, read the Indian way</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {INDICATORS.map((i) => (
          <div key={i.slug} className="glass p-5">
            <div className="flex items-start justify-between gap-2"><div className="font-display font-semibold">{i.name}</div><Badge tone="info">{i.family}</Badge></div>
            <p className="mt-2 text-sm text-muted"><strong className="text-text">What: </strong>{i.what}</p>
            <p className="mt-1 text-sm text-muted"><strong className="text-text">How to read: </strong>{i.read}</p>
            <p className="mt-1 text-sm text-muted"><strong className="text-text">On Indian charts: </strong>{i.indian}</p>
            <Link href="/markets/RELIANCE" className="mt-2 inline-block text-xs text-accent">Try it on the advanced chart →</Link>
          </div>
        ))}
      </div>

      <h2 id="india" className="font-display mt-12 scroll-mt-24 text-2xl font-semibold">Indian market essentials</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {ESSENTIALS.map((e, i) => (
          <div key={e.slug} className={clsx("glass p-5 fx-fade")} style={{ animationDelay: `${i * 80}ms` }}>
            <div className="text-2xl">{e.icon}</div>
            <div className="font-display mt-2 font-semibold">{e.title}</div>
            <p className="mt-1 text-sm text-muted">{e.body}</p>
            <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-faint">{e.detail.map((d) => <li key={d}>{d}</li>)}</ul>
          </div>
        ))}
      </div>

      <h2 id="quiz" className="font-display mt-12 scroll-mt-24 text-2xl font-semibold">Check yourself</h2>
      <div className="mt-4 grid gap-5 lg:grid-cols-3">
        <Quiz title="Candlesticks" questions={QUIZZES.candles} />
        <Quiz title="Chart patterns" questions={QUIZZES.charts} />
        <Quiz title="Indian market rules" questions={QUIZZES.india} />
      </div>
      <div className="mt-6"><Notice tone="info">Patterns describe probabilities, not promises. Confirm with volume, the index trend and your position size, and practise on <Link href="/tools/replay" className="underline">market replay</Link> before risking money. Education only, not investment advice.</Notice></div>
    </div>
  );
}
