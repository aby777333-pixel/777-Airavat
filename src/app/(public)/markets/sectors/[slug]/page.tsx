import Link from "next/link";
import clsx from "clsx";
import { notFound } from "next/navigation";
import { getQuotes } from "@/lib/market";
import { createClient } from "@/lib/supabase/server";
import { sectorSlug, indexSlug } from "@/lib/markets-hub";
import { changeOf, money, pct } from "@/lib/format";
import { Notice, PageHeader, SimBadge } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { MarketCrumbs, QuoteTable } from "../../_shared";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const name = slug.replace(/-/g, " ");
  return { title: `${name} sector stocks: performance, breadth, valuation and leaders (simulated)`, description: `NSE ${name} sector: every stock with price, change, P/E, ROE and promoter holding, sector breadth and the sector index. Sandbox data.` };
}

export default async function SectorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const rows = await getQuotes();
  const list = rows.filter((r) => r.segment === "EQ" && sectorSlug(r.sector ?? "Other") === slug);
  if (list.length === 0) notFound();
  const sector = list[0].sector ?? "Other";
  const supabase = await createClient();
  const { data: f } = await supabase.from("instrument_fundamentals").select("instrument_id, eps, roe_pct, promoter_holding_pct, net_profit_cr, shares_cr").eq("fy", "FY2026").in("instrument_id", list.map((r) => r.id));
  const fm = new Map((f ?? []).map((x) => [x.instrument_id, x]));
  const chg = list.map((r) => changeOf(r.quote.ltp, r.quote.prev_close).changePct); const avg = chg.reduce((s, v) => s + v, 0) / chg.length;
  const { data: idx } = await supabase.from("index_constituents").select("index_symbol").in("instrument_id", list.map((r) => r.id));
  const indices = [...new Set((idx ?? []).map((i) => i.index_symbol))].filter((s) => s !== "NIFTY 50");
  const mcap = list.reduce((s, r) => s + Number(r.quote.ltp) * Number(fm.get(r.id)?.shares_cr ?? 0), 0);
  const pe = list.reduce((s, r) => s + Number(fm.get(r.id)?.net_profit_cr ?? 0), 0);
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <MarketCrumbs label={sector} />
      <PageHero variant="markets" intro={`${sector} stocks on NSE in the sandbox universe: price and day change, valuation from the simulated fundamentals, promoter holding and sector breadth. Indices covering this sector are linked.`}>
        <PageHeader eyebrow="Sector" title={sector} subtitle={<span className="inline-flex flex-wrap items-center gap-3"><span className={clsx("tnum font-display text-xl", avg >= 0 ? "text-profit" : "text-loss")}>{pct(avg)} today</span><SimBadge /></span>} />
      </PageHero>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass p-4"><div className="text-xs text-muted">Stocks</div><div className="tnum text-lg">{list.length}</div></div>
        <div className="glass p-4"><div className="text-xs text-muted">Breadth</div><div className="tnum text-lg"><span className="text-profit">{chg.filter((v) => v > 0).length}</span> / <span className="text-loss">{chg.filter((v) => v < 0).length}</span></div></div>
        <div className="glass p-4"><div className="text-xs text-muted">Sector market cap (sim)</div><div className="tnum text-lg">{money(mcap * 1e7, { compact: true })}</div></div>
        <div className="glass p-4"><div className="text-xs text-muted">Sector P/E (sim)</div><div className="tnum text-lg">{pe ? (mcap / pe).toFixed(1) : "—"}</div></div>
      </div>
      {indices.length > 0 && <div className="mt-4 flex flex-wrap gap-2 text-xs">{indices.map((s) => <Link key={s} href={`/markets/indices/${indexSlug(s)}`} className="badge badge-accent">{s}</Link>)}</div>}
      <h2 className="font-display mt-8 text-xl font-semibold">Stocks</h2>
      <div className="mt-3"><QuoteTable rows={[...list].sort((a, b) => changeOf(b.quote.ltp, b.quote.prev_close).changePct - changeOf(a.quote.ltp, a.quote.prev_close).changePct)} showSector={false} /></div>
      <h2 className="font-display mt-8 text-xl font-semibold">Valuation snapshot (FY2026, simulated sample)</h2>
      <div className="glass mt-3 overflow-x-auto p-2"><table className="table text-sm"><thead><tr><th>Stock</th><th className="num">LTP</th><th className="num">EPS</th><th className="num">P/E</th><th className="num">ROE</th><th className="num">Promoter</th></tr></thead>
        <tbody>{list.map((r) => { const x = fm.get(r.id); const pe2 = x && Number(x.eps) > 0 ? Number(r.quote.ltp) / Number(x.eps) : null; return <tr key={r.id}><td><Link href={`/markets/${r.symbol}`} className="font-semibold hover:text-accent">{r.symbol}</Link></td><td className="num">{Number(r.quote.ltp).toFixed(2)}</td><td className="num">{x ? Number(x.eps).toFixed(2) : "—"}</td><td className="num">{pe2 ? pe2.toFixed(1) : "—"}</td><td className="num">{x ? `${Number(x.roe_pct).toFixed(1)}%` : "—"}</td><td className="num">{x ? `${Number(x.promoter_holding_pct).toFixed(1)}%` : "—"}</td></tr>; })}</tbody></table></div>
      <div className="mt-5"><Notice tone="warn">Fundamentals are SIMULATED SAMPLE values generated for the sandbox; licensed company data replaces them before any live use.</Notice></div>
    </div>
  );
}
