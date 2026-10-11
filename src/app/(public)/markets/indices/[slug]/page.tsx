import Link from "next/link";
import clsx from "clsx";
import { notFound } from "next/navigation";
import { getIndexDetail, INDEX_SLUGS, sectorSlug } from "@/lib/markets-hub";
import { changeOf, istTime, pct, price } from "@/lib/format";
import { Notice, PageHeader, SimBadge } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { MarketCrumbs } from "../../_shared";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const sym = INDEX_SLUGS[slug];
  return { title: `${sym ?? "Index"}: constituents, weights, sector split and contribution (simulated)`, description: `${sym ?? "Index"} level, day change, constituent stocks with index weights, sector composition and each stock's contribution to today's move. Sandbox data.` };
}

export default async function IndexPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const sym = INDEX_SLUGS[slug]; if (!sym) notFound();
  const d = await getIndexDetail(sym); if (!d || !d.index) notFound();
  const c = changeOf(d.index.ltp, d.index.prev_close);
  const gainers = [...d.constituents].sort((a, b) => b.chg_pct - a.chg_pct).slice(0, 5); const losers = [...d.constituents].sort((a, b) => a.chg_pct - b.chg_pct).slice(0, 5);
  const adv = d.constituents.filter((x) => x.chg_pct > 0).length; const dec = d.constituents.filter((x) => x.chg_pct < 0).length;
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <MarketCrumbs label={sym} />
      <PageHero variant="markets" intro={`${d.index.name}: level, constituents with their index weights, sector composition and the contribution of each stock to today's move. Weights are a simulated free-float proxy; a licensed index feed replaces them without changing the page.`}>
        <PageHeader eyebrow="Index" title={sym} subtitle={<span className="inline-flex flex-wrap items-center gap-3"><span className="tnum font-display text-2xl text-text">{price(d.index.ltp)}</span><span className={clsx("tnum", c.change >= 0 ? "text-profit" : "text-loss")}>{price(c.change)} ({pct(c.changePct)})</span><SimBadge /><span className="text-xs text-faint">updated {istTime(d.index.updated_at)}</span></span>} />
      </PageHero>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass p-4"><div className="text-xs text-muted">Open / High / Low</div><div className="tnum text-sm">{price(d.index.open)} / {price(d.index.high)} / {price(d.index.low)}</div></div>
        <div className="glass p-4"><div className="text-xs text-muted">Breadth</div><div className="tnum text-sm"><span className="text-profit">{adv} up</span> · <span className="text-loss">{dec} down</span> · {d.constituents.length} stocks</div></div>
        <div className="glass p-4"><div className="text-xs text-muted">Top contributor</div><div className="text-sm">{[...d.constituents].sort((a, b) => b.contribution - a.contribution)[0]?.symbol ?? "—"}</div></div>
        <div className="glass p-4"><div className="text-xs text-muted">Top drag</div><div className="text-sm">{[...d.constituents].sort((a, b) => a.contribution - b.contribution)[0]?.symbol ?? "—"}</div></div>
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.618fr]">
        <div className="glass p-5">
          <div className="font-display font-semibold">Sector composition</div>
          <div className="mt-3 space-y-2">{d.sectors.map((s) => <div key={s.sector}><div className="flex justify-between text-sm"><Link href={`/markets/sectors/${sectorSlug(s.sector)}`} className="hover:text-accent">{s.sector}</Link><span className="tnum text-muted">{s.weight_pct}%</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg"><div className="h-full bg-accent" style={{ width: `${s.weight_pct}%` }} /></div></div>)}</div>
          <div className="mt-5 grid grid-cols-2 gap-4 text-xs">
            <div><div className="mb-1 font-semibold text-profit">Top gainers</div>{gainers.map((g) => <div key={g.symbol} className="flex justify-between py-0.5"><Link href={`/markets/${g.symbol}`} className="hover:text-accent">{g.symbol}</Link><span className="tnum text-profit">{pct(g.chg_pct)}</span></div>)}</div>
            <div><div className="mb-1 font-semibold text-loss">Top losers</div>{losers.map((g) => <div key={g.symbol} className="flex justify-between py-0.5"><Link href={`/markets/${g.symbol}`} className="hover:text-accent">{g.symbol}</Link><span className="tnum text-loss">{pct(g.chg_pct)}</span></div>)}</div>
          </div>
        </div>
        <div className="glass overflow-x-auto p-2">
          <table className="table text-sm"><thead><tr><th>Stock</th><th>Sector</th><th className="num">Weight</th><th className="num">LTP</th><th className="num">Change</th><th className="num">Contribution</th></tr></thead>
            <tbody>{d.constituents.map((x) => <tr key={x.symbol}><td><Link href={`/markets/${x.symbol}`} className="font-semibold hover:text-accent">{x.symbol}</Link><div className="text-xs text-muted">{x.name}</div></td><td className="text-muted">{x.sector}</td><td className="num">{x.weight_pct}%</td><td className="num">{price(x.ltp)}</td><td className={clsx("num", x.chg_pct >= 0 ? "text-profit" : "text-loss")}>{pct(x.chg_pct)}</td><td className={clsx("num", x.contribution >= 0 ? "text-profit" : "text-loss")}>{x.contribution >= 0 ? "+" : ""}{x.contribution.toFixed(3)}</td></tr>)}</tbody></table>
        </div>
      </div>
      <div className="mt-5"><Notice tone="info">Levels are simulated by the sandbox engine; weights are a free-float proxy. {sym === "INDIA VIX" ? "India VIX measures expected 30-day volatility implied by NIFTY options; the sandbox value random-walks around a seed." : "Constituents are the sandbox universe for this index."}</Notice></div>
    </div>
  );
}
