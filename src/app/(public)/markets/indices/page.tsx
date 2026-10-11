import Link from "next/link";
import clsx from "clsx";
import { getQuotes } from "@/lib/market";
import { changeOf, pct, price } from "@/lib/format";
import { PageHeader, SimBadge } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { MarketCrumbs, QuoteTable } from "../_shared";

export const metadata = { title: "Index pages: NIFTY 50, NIFTY BANK and constituents (simulated)", description: "Index levels, day change and constituent performance for NIFTY 50 and NIFTY BANK in the AIRAVAT sandbox.", keywords: ["Nifty 50 constituents", "Bank Nifty stocks", "index performance today", "Nifty 50 live"] };

export default async function Indices() {
  const rows = await getQuotes();
  const indices = rows.filter((r) => r.segment === "INDEX");
  const eq = rows.filter((r) => r.segment === "EQ" && r.tradable);
  const banks = eq.filter((r) => (r.sector ?? "").toLowerCase().includes("bank") || (r.sector ?? "").toLowerCase().includes("financ"));
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <MarketCrumbs label="Indices" />
      <PageHero variant="markets" intro="Index pages show the level and day change of each benchmark with the performance of its constituents. In the sandbox the NIFTY 50 universe is the tradable large-cap list and the NIFTY BANK constituents are the banking and financial names within it."><PageHeader eyebrow="Markets" title="Index pages" subtitle={<><SimBadge /> Index levels and constituents are simulated.</>} /></PageHero>
      <div className="grid gap-4 sm:grid-cols-2">
        {indices.map((i) => { const c = changeOf(i.quote.ltp, i.quote.prev_close); return (
          <Link key={i.id} href={`/markets/${encodeURIComponent(i.symbol)}`} className="m-crystal p-5"><div className="text-xs text-muted">{i.name}</div><div className="tnum font-display text-3xl font-bold">{price(i.quote.ltp)}</div><div className={clsx("tnum text-sm", c.change >= 0 ? "text-profit" : "text-loss")}>{c.change >= 0 ? "+" : ""}{price(c.change)} ({pct(c.changePct)})</div><div className="mt-1 text-xs text-faint">Open {price(i.quote.open)} · High {price(i.quote.high)} · Low {price(i.quote.low)}</div></Link>); })}
      </div>
      <h2 className="font-display mt-10 text-xl font-semibold">NIFTY 50 constituents (sandbox universe)</h2>
      <div className="mt-3"><QuoteTable rows={[...eq].sort((a, b) => changeOf(b.quote.ltp, b.quote.prev_close).changePct - changeOf(a.quote.ltp, a.quote.prev_close).changePct)} /></div>
      <h2 className="font-display mt-10 text-xl font-semibold">NIFTY BANK constituents (sandbox universe)</h2>
      <div className="mt-3"><QuoteTable rows={banks} /></div>
    </div>
  );
}
