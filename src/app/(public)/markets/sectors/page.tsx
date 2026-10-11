import Link from "next/link";
import clsx from "clsx";
import { getQuotes } from "@/lib/market";
import { sectorSlug } from "@/lib/markets-hub";
import { changeOf, pct, price } from "@/lib/format";
import { metadataFor, seoFor } from "@/lib/seo";
import { PageHeader, SimBadge } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { MarketCrumbs } from "../_shared";

export const metadata = { ...metadataFor("/markets/sectors") };
const SECTOR_INDEX: Record<string, string> = { "IT Services": "NIFTY IT", Pharma: "NIFTY PHARMA", Healthcare: "NIFTY PHARMA", Automobiles: "NIFTY AUTO", FMCG: "NIFTY FMCG", Consumer: "NIFTY FMCG", Metals: "NIFTY METAL", Mining: "NIFTY METAL", Energy: "NIFTY ENERGY", Utilities: "NIFTY ENERGY", Banking: "NIFTY BANK", NBFC: "NIFTY FIN SERVICE", "Financial Services": "NIFTY FIN SERVICE", Insurance: "NIFTY FIN SERVICE" };

export default async function Sectors() {
  const rows = await getQuotes();
  const eq = rows.filter((r) => r.segment === "EQ");
  const idx = new Map(rows.filter((r) => r.segment === "INDEX").map((r) => [r.symbol, r]));
  const sectors = new Map<string, typeof eq>();
  eq.forEach((r) => { const k = r.sector ?? "Other"; sectors.set(k, [...(sectors.get(k) ?? []), r]); });
  const cards = [...sectors.entries()].map(([sector, list]) => { const chg = list.map((r) => changeOf(r.quote.ltp, r.quote.prev_close).changePct); const avg = chg.reduce((s, v) => s + v, 0) / chg.length; const adv = chg.filter((v) => v > 0).length; const leader = [...list].sort((a, b) => changeOf(b.quote.ltp, b.quote.prev_close).changePct - changeOf(a.quote.ltp, a.quote.prev_close).changePct)[0]; const index = idx.get(SECTOR_INDEX[sector] ?? ""); return { sector, list, avg, adv, dec: chg.filter((v) => v < 0).length, leader, index }; }).sort((a, b) => b.avg - a.avg);
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <MarketCrumbs label="Sectors" />
      <PageHero variant="markets" intro={seoFor("/markets/sectors").intro}><PageHeader eyebrow="Markets" title="Sectors and industries" subtitle={<span className="inline-flex items-center gap-2">NSE sector classification of the sandbox universe <SimBadge /></span>} /></PageHero>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.sector} href={`/markets/sectors/${sectorSlug(c.sector)}`} className="glass block p-5 transition hover:-translate-y-0.5">
            <div className="flex items-start justify-between gap-2"><div className="font-display font-semibold">{c.sector}</div><span className={clsx("tnum text-sm font-semibold", c.avg >= 0 ? "text-profit" : "text-loss")}>{pct(c.avg)}</span></div>
            <div className="mt-1 text-xs text-muted">{c.list.length} stocks · <span className="text-profit">{c.adv} up</span> · <span className="text-loss">{c.dec} down</span></div>
            {c.index && <div className="mt-3 text-xs text-muted">{c.index.symbol} <span className="tnum text-text">{price(c.index.quote.ltp)}</span> <span className={changeOf(c.index.quote.ltp, c.index.quote.prev_close).change >= 0 ? "text-profit" : "text-loss"}>{pct(changeOf(c.index.quote.ltp, c.index.quote.prev_close).changePct)}</span></div>}
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-bg"><div className={clsx("h-full", c.avg >= 0 ? "bg-profit" : "bg-loss")} style={{ width: `${Math.min(100, Math.abs(c.avg) * 25)}%` }} /></div>
            {c.leader && <div className="mt-3 text-xs text-faint">Leader: <span className="text-text">{c.leader.symbol}</span> {pct(changeOf(c.leader.quote.ltp, c.leader.quote.prev_close).changePct)}</div>}
          </Link>
        ))}
      </div>
    </div>
  );
}
