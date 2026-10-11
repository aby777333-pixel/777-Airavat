import Link from "next/link";
import clsx from "clsx";
import { changeOf, integer, pct, price } from "@/lib/format";
import type { QuoteRow } from "@/lib/market";
import { Breadcrumbs } from "@/components/site/ContentPageView";

export function MarketCrumbs({ label }: { label: string }) {
  return <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/markets", label: "Markets" }, { href: "#", label }]} />;
}

export function QuoteTable({ rows, showSector = true }: { rows: QuoteRow[]; showSector?: boolean }) {
  return (
    <div className="glass overflow-x-auto p-2">
      <table className="table">
        <thead><tr><th>Symbol</th><th>Name</th>{showSector && <th>Sector</th>}<th className="num">LTP</th><th className="num">Change</th><th className="num">%</th><th className="num">Open</th><th className="num">High</th><th className="num">Low</th><th className="num">Volume</th></tr></thead>
        <tbody>{rows.map((r) => { const c = changeOf(r.quote.ltp, r.quote.prev_close); return (
          <tr key={r.id}>
            <td><Link className="font-semibold hover:text-accent" href={`/markets/${encodeURIComponent(r.symbol)}`}>{r.symbol}</Link>{r.segment === "INDEX" && <span className="ml-2 badge">Index</span>}{!r.tradable && r.segment !== "INDEX" && <span className="ml-2 badge">research</span>}</td>
            <td className="text-muted">{r.name}</td>{showSector && <td className="text-muted">{r.sector ?? "—"}</td>}
            <td className="num">{price(r.quote.ltp)}</td><td className={clsx("num", c.change >= 0 ? "text-profit" : "text-loss")}>{c.change >= 0 ? "+" : ""}{price(c.change)}</td><td className={clsx("num", c.change >= 0 ? "text-profit" : "text-loss")}>{pct(c.changePct)}</td>
            <td className="num">{price(r.quote.open)}</td><td className="num">{price(r.quote.high)}</td><td className="num">{price(r.quote.low)}</td><td className="num">{integer(r.quote.volume)}</td>
          </tr>); })}</tbody>
      </table>
    </div>
  );
}
