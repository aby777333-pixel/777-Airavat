import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { getCandles, getInstrument, getMarketStatus } from "@/lib/market";
import { changeOf, integer, istTime, pct, price } from "@/lib/format";
import { getSession } from "@/lib/auth";
import Chart from "@/components/market/Chart";
import { SimBadge, Notice } from "@/components/ui";

export default async function InstrumentPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const sym = decodeURIComponent(symbol);
  const [inst, ms, { user }] = await Promise.all([getInstrument(sym), getMarketStatus(), getSession()]);
  if (!inst) notFound();
  const candles = await getCandles(inst.id, "1d", 300);
  const c = changeOf(inst.quote.ltp, inst.quote.prev_close);
  const band = { lo: inst.quote.prev_close * (1 - inst.price_band_pct / 100), hi: inst.quote.prev_close * (1 + inst.price_band_pct / 100) };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs text-muted">{inst.exchange} · {inst.segment} · {inst.sector}{inst.isin && ` · ${inst.isin}`}</div>
          <h1 className="font-display text-3xl font-bold">{inst.symbol} <span className="text-lg font-normal text-muted">{inst.name}</span></h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="tnum font-display text-3xl font-semibold">{price(inst.quote.ltp)}</span>
            <span className={clsx("tnum text-base", c.change >= 0 ? "text-profit" : "text-loss")}>{price(c.change)} ({pct(c.changePct)})</span>
            <SimBadge />
            <span className="text-xs text-faint">updated {istTime(inst.quote.updated_at)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {user ? (
            inst.tradable ? <Link href={`/app/markets/${encodeURIComponent(inst.symbol)}`} className="btn btn-primary">Trade in sandbox</Link> : <span className="badge">Not tradable</span>
          ) : (
            <Link href={`/login?next=/app/markets/${encodeURIComponent(inst.symbol)}`} className="btn btn-primary">Log in to trade (sandbox)</Link>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.618fr_1fr]">
        <div className="glass p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-muted"><span>Daily candles · synthetic history</span><span>Session {ms.status}</span></div>
          <Chart candles={candles} />
        </div>
        <div className="space-y-4">
          <div className="glass p-5">
            <div className="text-xs uppercase tracking-wider text-muted">Quote</div>
            <table className="table mt-2 text-sm">
              <tbody>
                <tr><td>Open</td><td className="num">{price(inst.quote.open)}</td></tr>
                <tr><td>High</td><td className="num">{price(inst.quote.high)}</td></tr>
                <tr><td>Low</td><td className="num">{price(inst.quote.low)}</td></tr>
                <tr><td>Previous close</td><td className="num">{price(inst.quote.prev_close)}</td></tr>
                <tr><td>Bid / Ask</td><td className="num">{price(inst.quote.bid)} / {price(inst.quote.ask)}</td></tr>
                <tr><td>Volume</td><td className="num">{integer(inst.quote.volume)}</td></tr>
                <tr><td>Price band (±{inst.price_band_pct}%)</td><td className="num">{price(band.lo)} – {price(band.hi)}</td></tr>
                <tr><td>Lot / Tick</td><td className="num">{inst.lot_size} / {inst.tick_size}</td></tr>
              </tbody>
            </table>
          </div>
          <Notice tone="info">Fundamentals, shareholding, corporate actions and news require licensed data feeds and are not yet connected. See the <Link className="underline" href="/trust">Trust Centre</Link>.</Notice>
        </div>
      </div>
    </div>
  );
}
