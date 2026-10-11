import Link from "next/link";
import clsx from "clsx";
import { getPulse } from "@/lib/markets-hub";
import { integer, istTime, pct, price } from "@/lib/format";
import { metadataFor, seoFor } from "@/lib/seo";
import { Notice, PageHeader, SimBadge } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { MarketCrumbs } from "../_shared";

export const metadata = { ...metadataFor("/markets/pulse") };
export const dynamic = "force-dynamic";

export default async function Pulse() {
  const p = await getPulse();
  if (!p) return <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6"><Notice tone="warn">Pulse unavailable.</Notice></div>;
  const total = p.advances + p.declines + p.unchanged;
  const Sym = ({ s }: { s: string }) => <Link href={`/markets/${s}`} className="font-semibold hover:text-accent">{s}</Link>;
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <MarketCrumbs label="Market pulse" />
      <PageHero variant="markets" intro={seoFor("/markets/pulse").intro}><PageHeader eyebrow="Internals" title="Market pulse" subtitle={<span className="inline-flex items-center gap-2">as of {istTime(p.as_of)} <SimBadge /></span>} /></PageHero>
      <div className="glass p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="font-display font-semibold">Breadth</div><div className="text-sm"><span className="text-profit">{p.advances} advances</span> · <span className="text-loss">{p.declines} declines</span> · {p.unchanged} unchanged</div></div>
        <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-bg"><div className="bg-profit" style={{ width: `${(p.advances / total) * 100}%` }} /><div className="bg-loss" style={{ width: `${(p.declines / total) * 100}%` }} /></div>
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <div className="glass p-5"><div className="font-display font-semibold">New 52-week highs</div>{p.new_highs.length === 0 ? <p className="mt-2 text-sm text-muted">None today.</p> : <ul className="mt-2 space-y-1 text-sm">{p.new_highs.map((x) => <li key={x.symbol} className="flex justify-between"><Sym s={x.symbol} /><span className="tnum">{price(x.ltp)}</span></li>)}</ul>}</div>
        <div className="glass p-5"><div className="font-display font-semibold">New 52-week lows</div>{p.new_lows.length === 0 ? <p className="mt-2 text-sm text-muted">None today.</p> : <ul className="mt-2 space-y-1 text-sm">{p.new_lows.map((x) => <li key={x.symbol} className="flex justify-between"><Sym s={x.symbol} /><span className="tnum">{price(x.ltp)}</span></li>)}</ul>}</div>
        <div className="glass p-5"><div className="font-display font-semibold">Volume shockers</div><p className="text-xs text-muted">Today&apos;s volume versus the 1-year daily average</p>{p.volume_shockers.length === 0 ? <p className="mt-2 text-sm text-muted">No unusual volume.</p> : <ul className="mt-2 space-y-1 text-sm">{p.volume_shockers.map((x) => <li key={x.symbol} className="flex justify-between"><Sym s={x.symbol} /><span className="tnum">{x.ratio}× · {integer(x.volume)}</span></li>)}</ul>}</div>
        <div className="glass p-5"><div className="font-display font-semibold">Circuit filter hits</div><p className="text-xs text-muted">Moves at or near the daily price band</p>{p.circuit_hits.length === 0 ? <p className="mt-2 text-sm text-muted">No circuit hits.</p> : <ul className="mt-2 space-y-1 text-sm">{p.circuit_hits.map((x) => <li key={x.symbol} className="flex justify-between"><Sym s={x.symbol} /><span className={clsx("tnum", x.chg >= 0 ? "text-profit" : "text-loss")}>{pct(x.chg)} (band {x.band}%)</span></li>)}</ul>}</div>
        <div className="glass p-5"><div className="font-display font-semibold">Delivery leaders</div><p className="text-xs text-muted">Deliverable quantity as a share of traded quantity</p><ul className="mt-2 space-y-1 text-sm">{p.top_delivery.map((x) => <li key={x.symbol} className="flex justify-between"><Sym s={x.symbol} /><span className="tnum">{Number(x.delivery_pct).toFixed(1)}%</span></li>)}</ul></div>
        <div className="glass p-5"><div className="font-display font-semibold">Sector breadth</div><ul className="mt-2 space-y-1 text-sm">{p.sector_breadth.map((x) => <li key={x.sector} className="flex justify-between"><span>{x.sector}</span><span className="tnum"><span className="text-profit">{x.advances}</span>/<span className="text-loss">{x.declines}</span> · <span className={x.avg_chg >= 0 ? "text-profit" : "text-loss"}>{pct(x.avg_chg)}</span></span></li>)}</ul></div>
      </div>
      <div className="mt-5"><Notice tone="info">Computed live from the sandbox engine&apos;s quotes and daily candles on every page load. 52-week extremes use the simulated daily history.</Notice></div>
    </div>
  );
}
