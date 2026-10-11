import Link from "next/link";
import clsx from "clsx";
import { getIndexDetail, INDEX_SLUGS, indexSlug } from "@/lib/markets-hub";
import { metadataFor, seoFor } from "@/lib/seo";
import { Badge, Notice, PageHeader, SimBadge } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/site/ContentPageView";
import Treemap, { type Tile } from "@/components/market/Treemap";

export const metadata = { ...metadataFor("/markets/heatmap") };
export const dynamic = "force-dynamic";

const fmt = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default async function Heatmap({ searchParams }: { searchParams: Promise<{ i?: string }> }) {
  const { i } = await searchParams;
  const symbol = INDEX_SLUGS[i ?? "nifty-50"] ?? "NIFTY 50";
  const d = await getIndexDetail(symbol);
  const tiles: Tile[] = (d?.constituents ?? []).map((c) => ({ symbol: c.symbol, name: c.name, sector: c.sector ?? "Other", weight: Number(c.weight_pct), chg: Number(c.chg_pct), ltp: Number(c.ltp) }));
  const adv = tiles.filter((t) => t.chg > 0).length; const dec = tiles.filter((t) => t.chg < 0).length;
  const sectors = (d?.sectors ?? []).map((s) => { const m = tiles.filter((t) => t.sector === s.sector); const w = m.reduce((a, t) => a + t.weight, 0) || 1; return { sector: s.sector, weight: Number(s.weight_pct), chg: m.reduce((a, t) => a + t.chg * t.weight, 0) / w, n: m.length }; });
  const idxChg = d?.index ? ((d.index.ltp - d.index.prev_close) / d.index.prev_close) * 100 : 0;
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/markets", label: "Markets" }, { href: "/markets/heatmap", label: "Heatmap" }]} />
      <PageHero variant="markets" intro={seoFor("/markets/heatmap").intro}><PageHeader eyebrow="Markets" title="Market heatmap" subtitle={<>Every constituent as a tile: size by index weight, colour by the day&apos;s change <SimBadge /></>} /></PageHero>
      <div className="mb-4 flex flex-wrap gap-1 text-xs">{Object.entries(INDEX_SLUGS).map(([slug, sym]) => <Link key={slug} href={`/markets/heatmap?i=${slug}`} className={clsx("badge !normal-case !tracking-normal", sym === symbol && "badge-accent")}>{sym}</Link>)}</div>
      {d?.index ? (
        <div className="grid gap-6 lg:grid-cols-[1.618fr_1fr]">
          <div className="glass p-4">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><div className="font-display text-lg font-semibold">{d.index.name}</div><div className="tnum text-2xl">{fmt(d.index.ltp)} <span className={clsx("text-sm", idxChg >= 0 ? "text-profit" : "text-loss")}>{idxChg >= 0 ? "+" : ""}{idxChg.toFixed(2)}%</span></div></div><div className="text-right text-xs text-muted">Advances <span className="text-profit">{adv}</span> · Declines <span className="text-loss">{dec}</span> · Unchanged {tiles.length - adv - dec}<br />Updated {new Date(d.index.updated_at).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })} IST</div></div>
            <Treemap tiles={tiles} />
          </div>
          <aside className="space-y-4">
            <div className="glass p-5"><div className="font-display font-semibold">Sectors today</div><table className="table mt-2 text-sm"><thead><tr><th>Sector</th><th className="text-right">Weight</th><th className="text-right">Change</th></tr></thead><tbody>{sectors.sort((a, b) => b.chg - a.chg).map((s) => <tr key={s.sector}><td><Link href={`/markets/sectors/${s.sector.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} className="hover:text-accent">{s.sector}</Link> <span className="text-xs text-muted">({s.n})</span></td><td className="tnum text-right">{s.weight.toFixed(1)}%</td><td className={clsx("tnum text-right", s.chg >= 0 ? "text-profit" : "text-loss")}>{s.chg >= 0 ? "+" : ""}{s.chg.toFixed(2)}%</td></tr>)}</tbody></table></div>
            <div className="glass p-5"><div className="font-display font-semibold">Biggest movers</div><ul className="mt-2 space-y-1 text-sm">{[...tiles].sort((a, b) => Math.abs(b.chg) - Math.abs(a.chg)).slice(0, 8).map((t) => <li key={t.symbol} className="flex justify-between"><Link href={`/markets/${encodeURIComponent(t.symbol)}`} className="hover:text-accent">{t.symbol}</Link><span className={clsx("tnum", t.chg >= 0 ? "text-profit" : "text-loss")}>{t.chg >= 0 ? "+" : ""}{t.chg.toFixed(2)}%</span></li>)}</ul></div>
            <div className="glass p-5 text-sm text-muted"><div className="font-display font-semibold text-text">How to read it</div><p className="mt-1">Tile area is the stock&apos;s weight in the index, so the picture shows what moved the index, not just what moved. Toggle &quot;equal&quot; sizing to see breadth instead. Click a tile for the instrument page; the sector label shows the weighted sector change.</p><Link href={`/markets/indices/${indexSlug(symbol)}`} className="mt-2 inline-block text-xs text-accent">Index detail and contributions →</Link></div>
            <Notice tone="info">Simulated quotes and sample weights. <Badge tone="sim">SIMULATED</Badge></Notice>
          </aside>
        </div>
      ) : <div className="glass p-6 text-sm text-muted">No constituents are loaded for {symbol}.</div>}
    </div>
  );
}
