import { getQuotes } from "@/lib/market";
import { changeOf } from "@/lib/format";
import { PageHeader, SimBadge } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { MarketCrumbs, QuoteTable } from "../_shared";

export const metadata = { title: "Top gainers and losers today (simulated NSE universe)", description: "Biggest percentage gainers and losers in the AIRAVAT sandbox universe, with volume leaders.", keywords: ["top gainers today NSE", "top losers today", "volume shockers", "most active stocks"] };

export default async function GainersLosers() {
  const rows = (await getQuotes()).filter((r) => r.segment === "EQ" && r.tradable);
  const sorted = [...rows].sort((a, b) => changeOf(b.quote.ltp, b.quote.prev_close).changePct - changeOf(a.quote.ltp, a.quote.prev_close).changePct);
  const active = [...rows].sort((a, b) => b.quote.volume * b.quote.ltp - a.quote.volume * a.quote.ltp).slice(0, 10);
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <MarketCrumbs label="Gainers & losers" />
      <PageHero variant="markets" intro="Gainers and losers rank the sandbox universe by day change against the previous close; most active ranks by traded value. Movers are observations, not recommendations."><PageHeader eyebrow="Markets" title="Gainers & losers" subtitle={<SimBadge />} /></PageHero>
      <h2 className="font-display text-xl font-semibold text-profit">Top gainers</h2><div className="mt-3"><QuoteTable rows={sorted.slice(0, 10)} /></div>
      <h2 className="font-display mt-10 text-xl font-semibold text-loss">Top losers</h2><div className="mt-3"><QuoteTable rows={sorted.slice(-10).reverse()} /></div>
      <h2 className="font-display mt-10 text-xl font-semibold">Most active by value</h2><div className="mt-3"><QuoteTable rows={active} /></div>
    </div>
  );
}
