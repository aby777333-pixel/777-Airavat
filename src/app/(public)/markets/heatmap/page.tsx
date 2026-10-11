import Link from "next/link";
import clsx from "clsx";
import { getQuotes } from "@/lib/market";
import { changeOf, pct } from "@/lib/format";
import { PageHeader, SimBadge } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { MarketCrumbs } from "../_shared";

export const metadata = { title: "Sector heatmap: NSE sectors and stocks by day change (simulated)", description: "A sector and stock heatmap of the sandbox universe sized by traded value and coloured by day change.", keywords: ["sector heatmap NSE", "stock market heatmap India", "sector performance", "Nifty heatmap"] };

export default async function Heatmap() {
  const rows = (await getQuotes()).filter((r) => r.segment === "EQ").map((r) => ({ ...r, ...changeOf(r.quote.ltp, r.quote.prev_close), value: r.quote.volume * r.quote.ltp }));
  const sectors = new Map<string, typeof rows>();
  for (const r of rows) { const k = r.sector ?? "Other"; sectors.set(k, [...(sectors.get(k) ?? []), r]); }
  const order = [...sectors.entries()].map(([name, list]) => ({ name, list, avg: list.reduce((s, x) => s + x.changePct, 0) / list.length })).sort((a, b) => b.avg - a.avg);
  const cell = (v: number) => (v >= 2 ? "bg-profit/60" : v >= 0.5 ? "bg-profit/35" : v > -0.5 ? "bg-bg-2" : v > -2 ? "bg-loss/35" : "bg-loss/60");
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <MarketCrumbs label="Sector heatmap" />
      <PageHero variant="markets" intro="The heatmap groups stocks by sector, colours each tile by day change and sizes it by traded value, so you can see where money moved at a glance. Every figure is simulated."><PageHeader eyebrow="Markets" title="Sector heatmap" subtitle={<SimBadge />} /></PageHero>
      <div className="space-y-4">
        {order.map((s) => (
          <section key={s.name} className="glass p-3">
            <div className="mb-2 flex items-center justify-between text-sm"><span className="font-semibold">{s.name}</span><span className={clsx("tnum", s.avg >= 0 ? "text-profit" : "text-loss")}>{pct(s.avg)} avg</span></div>
            <div className="flex flex-wrap gap-1">{s.list.sort((a, b) => b.value - a.value).map((r) => <Link key={r.id} href={`/markets/${encodeURIComponent(r.symbol)}`} className={clsx("rounded-md p-2 text-xs", cell(r.changePct))} style={{ minWidth: `${Math.max(64, Math.min(180, Math.sqrt(r.value) / 40))}px` }} title={`${r.name}: ${pct(r.changePct)}`}><div className="font-semibold">{r.symbol}</div><div className="tnum">{pct(r.changePct)}</div></Link>)}</div>
          </section>
        ))}
      </div>
    </div>
  );
}
