import Link from "next/link";
import { notFound } from "next/navigation";
import { CANDLE_PATTERNS, CHART_PATTERNS } from "@/lib/chart-school";
import { SITE } from "@/lib/seo";
import { Badge, Notice, PageHeader } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/site/ContentPageView";
import { CandleFx, ChartFx } from "@/components/academy/PatternFx";

export function generateStaticParams() { return [...CANDLE_PATTERNS.map((p) => ({ slug: p.slug })), ...CHART_PATTERNS.map((p) => ({ slug: p.slug }))]; }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const c = CANDLE_PATTERNS.find((p) => p.slug === slug); const ch = CHART_PATTERNS.find((p) => p.slug === slug);
  const name = c?.name ?? ch?.name ?? "Pattern";
  return { title: `${name} candlestick/chart pattern: meaning, psychology, confirmation and failure`, description: `${name} explained with an animated illustration: what it looks like, the trader psychology behind it, how to confirm it and when it fails, with notes for Indian markets.`, alternates: { canonical: `${SITE.url}/academy/chart-school/${slug}` } };
}

export default async function PatternPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = CANDLE_PATTERNS.find((p) => p.slug === slug); const ch = CHART_PATTERNS.find((p) => p.slug === slug);
  if (!c && !ch) notFound();
  const name = c?.name ?? ch!.name; const bias = c?.bias ?? ch!.bias;
  const idx = c ? CANDLE_PATTERNS.findIndex((p) => p.slug === slug) : CHART_PATTERNS.findIndex((p) => p.slug === slug);
  const list = c ? CANDLE_PATTERNS : CHART_PATTERNS; const prev = list[(idx - 1 + list.length) % list.length]; const next = list[(idx + 1) % list.length];
  const jsonLd = { "@context": "https://schema.org", "@type": "Article", headline: `${name} pattern`, about: "Technical analysis", inLanguage: "en-IN", publisher: { "@type": "Organization", name: "AIRAVAT" } };
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/academy", label: "Academy" }, { href: "/academy/chart-school", label: "Chart School" }, { href: "#", label: name }]} />
      <PageHero variant="academy" intro={c ? c.what : ch!.what}><PageHeader eyebrow={c ? `Candlestick pattern · ${c.candles} candle${c.candles > 1 ? "s" : ""}` : "Chart pattern"} title={<span className="inline-flex flex-wrap items-center gap-3">{name}{c?.hindi && <span className="text-lg font-normal text-muted">{c.hindi}</span>}<Badge tone={bias === "bullish" ? "ok" : bias === "bearish" ? "bad" : "info"}>{bias}</Badge></span>} /></PageHero>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="glass p-5">{c ? <CandleFx lead={c.lead} body={c.body} large /> : <ChartFx pattern={ch!} large />}<p className="mt-2 text-xs text-faint">Animated illustration; reload the page to replay. Faded candles show the context the pattern requires.</p></div>
        <div className="space-y-4">
          {c ? (
            <>
              <div className="glass p-5"><div className="text-xs font-semibold uppercase tracking-wider text-accent">Psychology</div><p className="mt-1 text-sm text-muted">{c.psychology}</p></div>
              <div className="glass p-5"><div className="text-xs font-semibold uppercase tracking-wider text-accent">Confirmation</div><p className="mt-1 text-sm text-muted">{c.confirm}</p></div>
              <div className="glass p-5"><div className="text-xs font-semibold uppercase tracking-wider text-accent">Caution</div><p className="mt-1 text-sm text-muted">{c.caution}</p></div>
            </>
          ) : (
            <>
              <div className="glass p-5"><div className="text-xs font-semibold uppercase tracking-wider text-accent">How to trade it</div><p className="mt-1 text-sm text-muted">{ch!.trade}</p></div>
              <div className="glass p-5"><div className="text-xs font-semibold uppercase tracking-wider text-accent">Target</div><p className="mt-1 text-sm text-muted">{ch!.target}</p></div>
              <div className="glass p-5"><div className="text-xs font-semibold uppercase tracking-wider text-accent">Failure</div><p className="mt-1 text-sm text-muted">{ch!.failure}</p></div>
            </>
          )}
          <div className="glass p-5"><div className="text-xs font-semibold uppercase tracking-wider text-accent">On Indian charts</div><p className="mt-1 text-sm text-muted">Check the index direction, the stock&apos;s price band and whether results or expiry fall in the next sessions. Patterns on NIFTY 50 constituents are more reliable than on thinly traded small caps, and a candle capped by a circuit filter is not a true pattern.</p><Link href="/tools/screener?preset=momentum" className="mt-2 inline-block text-xs text-accent">Find stocks in trend with the screener →</Link></div>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between text-sm"><Link href={`/academy/chart-school/${prev.slug}`} className="hover:text-accent">← {prev.name}</Link><Link href="/academy/chart-school" className="text-accent">All patterns</Link><Link href={`/academy/chart-school/${next.slug}`} className="hover:text-accent">{next.name} →</Link></div>
      <div className="mt-5"><Notice tone="info">Education only. Practise spotting this pattern on <Link href="/tools/replay" className="underline">market replay</Link> with simulated candles.</Notice></div>
    </div>
  );
}
