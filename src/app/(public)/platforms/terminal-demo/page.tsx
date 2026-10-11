import Link from "next/link";
import { metadataFor, seoFor } from "@/lib/seo";
import { getCandles, getInstrument, getMarketStatus, getQuotes } from "@/lib/market";
import { Badge, Notice, PageHeader, SimBadge } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/site/ContentPageView";
import AdvancedChart from "@/components/market/AdvancedChart";
import DemoTicket from "./DemoTicket";

export const metadata = { ...metadataFor("/platforms/terminal-demo") };
export const dynamic = "force-dynamic";

const WATCH = ["NIFTY 50", "BANKNIFTY", "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "ITC", "SBIN", "LT"];
const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function TerminalDemo({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s } = await searchParams;
  const symbol = (s ?? "RELIANCE").toUpperCase();
  const [inst, ms, watch] = await Promise.all([getInstrument(symbol), getMarketStatus(), getQuotes(WATCH)]);
  const active = inst ?? (await getInstrument("RELIANCE"));
  const [daily, intraday] = active ? await Promise.all([getCandles(active.id, "1d", 200), getCandles(active.id, "1m", 600)]) : [[], []];
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/platforms", label: "Platforms" }, { href: "/platforms/terminal-demo", label: "Terminal demo" }]} />
      <PageHero variant="platforms" intro={seoFor("/platforms/terminal-demo").intro}><PageHeader eyebrow="Terminal X · public demo" title="Try the terminal without an account" subtitle={<>Live simulated watchlist, chart and the real pre-trade check list <SimBadge /> <Badge tone="info">Read-only</Badge></>} /></PageHero>
      <Notice tone="warn">Everything on this page is simulated and public. The ticket runs illustrative checks in your browser and cannot place orders; the sandbox version of the same screen is behind sign-in.</Notice>
      {active ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-[260px_1fr_320px]">
          <div className="glass p-3"><div className="flex items-center justify-between px-1 text-xs text-muted"><span>Watchlist</span><span>Session {ms.status}</span></div>
            <ul className="mt-2 space-y-0.5 text-sm">{watch.map((w) => { const ch = w.quote.ltp - w.quote.prev_close; const pct = w.quote.prev_close ? (ch / w.quote.prev_close) * 100 : 0; return <li key={w.symbol}><Link href={`/platforms/terminal-demo?s=${encodeURIComponent(w.symbol)}`} className={`flex items-center justify-between rounded-md px-2 py-1 hover:bg-bg ${w.symbol === active.symbol ? "bg-bg font-semibold" : ""}`}><span>{w.symbol}</span><span className={`font-mono text-xs ${ch >= 0 ? "text-profit" : "text-loss"}`}>{fmt(w.quote.ltp)} <span className="text-[10px]">{pct >= 0 ? "+" : ""}{pct.toFixed(2)}%</span></span></Link></li>; })}</ul>
          </div>
          <div className="glass p-3">
            <div className="flex flex-wrap items-end justify-between gap-2 px-1"><div><div className="font-display text-lg font-semibold">{active.symbol} <span className="text-xs font-normal text-muted">{active.exchange} · {active.name}</span></div><div className="font-mono text-2xl">₹{fmt(active.quote.ltp)} <span className={`text-sm ${active.quote.ltp >= active.quote.prev_close ? "text-profit" : "text-loss"}`}>{active.quote.ltp >= active.quote.prev_close ? "+" : ""}{fmt(active.quote.ltp - active.quote.prev_close)}</span></div></div><div className="grid grid-cols-4 gap-3 text-right text-xs text-muted"><div>Open<br /><span className="font-mono text-text">{fmt(active.quote.open)}</span></div><div>High<br /><span className="font-mono text-text">{fmt(active.quote.high)}</span></div><div>Low<br /><span className="font-mono text-text">{fmt(active.quote.low)}</span></div><div>Prev<br /><span className="font-mono text-text">{fmt(active.quote.prev_close)}</span></div></div></div>
            <div className="mt-3"><AdvancedChart daily={daily} intraday={intraday} symbol={active.symbol} height={380} /></div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted"><div className="glass p-2">Lot size <span className="float-right font-mono text-text">{active.lot_size}</span></div><div className="glass p-2">Tick <span className="float-right font-mono text-text">{active.tick_size}</span></div><div className="glass p-2">Band <span className="float-right font-mono text-text">±{active.price_band_pct}%</span></div></div>
          </div>
          <DemoTicket symbol={active.symbol} ltp={active.quote.ltp} tick={active.tick_size} lot={active.lot_size} bandPct={active.price_band_pct} prevClose={active.quote.prev_close} />
        </div>
      ) : <div className="glass mt-6 p-6 text-sm text-muted">The simulated market is not reachable right now. Try again shortly.</div>}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="glass p-5"><div className="font-display font-semibold">What the real terminal adds</div><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted"><li>Simulated market depth and one-click tickets</li><li>Positions, holdings and funds beside the chart</li><li>Order passport with every RMS check recorded server-side</li><li>Drawings, indicator templates and custom formulas</li></ul></div>
        <div className="glass p-5"><div className="font-display font-semibold">Why the checks are server-side</div><p className="mt-2 text-sm text-muted">The browser can only illustrate. In the sandbox every order goes through <code>place_order</code> in the database, where funds, holdings, bands, lots, fat-finger, exposure and daily-loss rules are enforced and audited. Nothing the UI does can skip them.</p></div>
        <div className="glass p-5"><div className="font-display font-semibold">Next</div><div className="mt-2 flex flex-col gap-2"><Link href="/open-account" className="btn btn-primary btn-sm">Open a sandbox account</Link><Link href="/trade/terminal-x" className="btn btn-ghost btn-sm">Terminal X overview</Link><Link href="/trade/basket-gtt" className="btn btn-ghost btn-sm">Smart order types</Link></div></div>
      </div>
    </div>
  );
}
