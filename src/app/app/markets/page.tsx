import Link from "next/link";
import clsx from "clsx";
import { requireUser } from "@/lib/auth";
import { getMarketStatus, getQuotes } from "@/lib/market";
import { changeOf, integer, istTime, pct, price } from "@/lib/format";
import { PageHeader, SimBadge } from "@/components/ui";
import { toggleWatchlist } from "../actions";

export default async function MarketWatch({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { supabase, user } = await requireUser("/app/markets");
  const [rows, ms, watch] = await Promise.all([
    getQuotes(), getMarketStatus(),
    supabase.from("watchlist_items").select("instrument_id, watchlist:watchlists!inner(user_id)").eq("watchlist.user_id", user.id),
  ]);
  const ids = new Set((watch.data ?? []).map((w) => w.instrument_id));
  const term = (q ?? "").trim().toUpperCase();
  const filtered = term ? rows.filter((r) => r.symbol.includes(term) || r.name.toUpperCase().includes(term)) : rows;
  const watchRows = filtered.filter((r) => ids.has(r.id));
  const otherRows = filtered.filter((r) => !ids.has(r.id));
  const latest = rows[0]?.quote.updated_at;

  const Row = ({ r }: { r: (typeof rows)[number] }) => {
    const c = changeOf(r.quote.ltp, r.quote.prev_close);
    return (
      <tr>
        <td>
          <form action={toggleWatchlist} className="inline"><input type="hidden" name="instrument_id" value={r.id} />
            <button className="mr-2 text-accent" aria-label={ids.has(r.id) ? `Remove ${r.symbol} from watchlist` : `Add ${r.symbol} to watchlist`}>{ids.has(r.id) ? "★" : "☆"}</button></form>
          <Link href={`/app/markets/${encodeURIComponent(r.symbol)}`} className="font-semibold hover:text-accent">{r.symbol}</Link>
          <span className="ml-2 text-xs text-faint">{r.name}</span>
        </td>
        <td className="num">{price(r.quote.ltp)}</td>
        <td className={clsx("num", c.change >= 0 ? "text-profit" : "text-loss")}>{pct(c.changePct)}</td>
        <td className="num text-muted">{price(r.quote.bid)} / {price(r.quote.ask)}</td>
        <td className="num text-muted">{integer(r.quote.volume)}</td>
        <td className="text-right">{r.tradable ? (
          <span className="inline-flex gap-1">
            <Link href={`/app/markets/${encodeURIComponent(r.symbol)}?side=BUY`} className="btn btn-buy btn-sm">B</Link>
            <Link href={`/app/markets/${encodeURIComponent(r.symbol)}?side=SELL`} className="btn btn-sell btn-sm">S</Link>
          </span>) : <span className="badge">Index</span>}</td>
      </tr>
    );
  };

  return (
    <>
      <PageHeader eyebrow="Market watch" title="Instruments" subtitle={<>Session {ms.status} · updated {istTime(latest)} · <SimBadge /></>} />
      <form className="mb-4 flex gap-2"><input className="input max-w-sm" name="q" defaultValue={q ?? ""} placeholder="Search symbol or name" aria-label="Search" /><button className="btn btn-ghost">Search</button></form>
      <div className="glass overflow-x-auto p-2">
        <table className="table">
          <thead><tr><th>Symbol</th><th className="num">LTP</th><th className="num">%</th><th className="num">Bid / Ask</th><th className="num">Volume</th><th></th></tr></thead>
          <tbody>
            {watchRows.length > 0 && <tr><td colSpan={6} className="!border-0 bg-accent/5 text-xs font-semibold uppercase tracking-wider text-accent">My watchlist</td></tr>}
            {watchRows.map((r) => <Row key={r.id} r={r} />)}
            {otherRows.length > 0 && <tr><td colSpan={6} className="!border-0 bg-bg/40 text-xs font-semibold uppercase tracking-wider text-muted">All instruments</td></tr>}
            {otherRows.map((r) => <Row key={r.id} r={r} />)}
          </tbody>
        </table>
      </div>
    </>
  );
}
