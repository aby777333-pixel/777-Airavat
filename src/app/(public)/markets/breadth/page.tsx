import clsx from "clsx";
import { createClient } from "@/lib/supabase/server";
import { getQuotes } from "@/lib/market";
import { changeOf, istTime, pct } from "@/lib/format";
import { PageHeader, SimBadge } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { MarketCrumbs } from "../_shared";

export const metadata = { title: "Market breadth: advance-decline, 52-week highs and lows, trend (simulated)", description: "Advance-decline ratio, new 52-week highs and lows, stocks above the 50-day average and other breadth measures for the sandbox universe.", keywords: ["market breadth India", "advance decline ratio", "52 week high stocks", "stocks above 50 DMA", "breadth indicator"] };

function Stat({ k, v, sub }: { k: string; v: string; sub?: string }) { return <div className="m-crystal p-4"><div className="text-xs text-muted">{k}</div><div className="tnum font-display text-2xl font-semibold">{v}</div>{sub && <div className="text-xs text-faint">{sub}</div>}</div>; }

export default async function Breadth() {
  const supabase = await createClient();
  const [rows, { data: metrics }] = await Promise.all([getQuotes(), supabase.from("instrument_metrics").select("*")]);
  const eq = rows.filter((r) => r.segment === "EQ" && r.tradable).map((r) => ({ ...r, ...changeOf(r.quote.ltp, r.quote.prev_close), m: (metrics ?? []).find((x) => x.instrument_id === r.id) }));
  const up = eq.filter((r) => r.change > 0).length, down = eq.filter((r) => r.change < 0).length, flat = eq.length - up - down;
  const above50 = eq.filter((r) => r.m && Number(r.m.sma_50) > 0 && r.quote.ltp > Number(r.m.sma_50)).length;
  const above20 = eq.filter((r) => r.m && Number(r.m.sma_20) > 0 && r.quote.ltp > Number(r.m.sma_20)).length;
  const near52h = eq.filter((r) => r.m && Number(r.m.dist_52w_high_pct) <= 3);
  const near52l = eq.filter((r) => r.m && Number(r.m.low_52w) > 0 && r.quote.ltp <= Number(r.m.low_52w) * 1.03);
  const asOf = metrics?.[0]?.as_of;
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <MarketCrumbs label="Market breadth" />
      <PageHero variant="briefing" intro="Breadth measures how many stocks participate in a move. An index can rise while most stocks fall; the advance-decline line, the share of stocks above their moving averages and new highs versus new lows show whether a trend is broad or narrow."><PageHeader eyebrow="Markets" title="Market breadth" subtitle={<><SimBadge /> metrics as of {istTime(asOf)}</>} /></PageHero>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat k="Advances / declines" v={`${up} / ${down}`} sub={`${flat} unchanged · A/D ratio ${down ? (up / down).toFixed(2) : "∞"}`} />
        <Stat k="Above 50-day average" v={`${eq.length ? Math.round((above50 / eq.length) * 100) : 0}%`} sub={`${above50} of ${eq.length}`} />
        <Stat k="Above 20-day average" v={`${eq.length ? Math.round((above20 / eq.length) * 100) : 0}%`} sub={`${above20} of ${eq.length}`} />
        <Stat k="Near 52-week high / low" v={`${near52h.length} / ${near52l.length}`} sub="within 3%" />
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="glass p-4"><div className="font-display font-semibold">Near 52-week highs</div><ul className="mt-2 text-sm">{near52h.map((r) => <li key={r.id} className="flex justify-between py-0.5"><span>{r.symbol}</span><span className={clsx("tnum", r.changePct >= 0 ? "text-profit" : "text-loss")}>{pct(r.changePct)}</span></li>)}{near52h.length === 0 && <li className="text-muted">None today.</li>}</ul></div>
        <div className="glass p-4"><div className="font-display font-semibold">Near 52-week lows</div><ul className="mt-2 text-sm">{near52l.map((r) => <li key={r.id} className="flex justify-between py-0.5"><span>{r.symbol}</span><span className={clsx("tnum", r.changePct >= 0 ? "text-profit" : "text-loss")}>{pct(r.changePct)}</span></li>)}{near52l.length === 0 && <li className="text-muted">None today.</li>}</ul></div>
      </div>
      <p className="mt-4 text-xs text-faint">52-week levels are computed from roughly 260 simulated daily candles.</p>
    </div>
  );
}
