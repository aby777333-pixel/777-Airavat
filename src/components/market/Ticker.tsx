import Link from "next/link";
import { getMarketStatus, getQuotes } from "@/lib/market";
import { changeOf, price, pct, istTime } from "@/lib/format";
import clsx from "clsx";

export default async function Ticker() {
  const [rows, ms] = await Promise.all([
    getQuotes(["NIFTY 50", "NIFTY BANK", "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "SBIN", "BHARTIARTL", "ITC", "LT", "TATAMOTORS"]),
    getMarketStatus(),
  ]);
  const items = [...rows, ...rows];
  const latest = rows[0]?.quote.updated_at;
  return (
    <div className="border-y border-border bg-bg-2/60">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2 text-xs sm:px-6">
        <span className="badge badge-sim shrink-0">Simulated</span>
        <span className="shrink-0 text-faint">
          Session: <strong className={clsx(ms.status === "OPEN" ? "text-profit" : "text-muted")}>{ms.status}</strong>
          {ms.sandbox_extended_hours && ms.status !== "OPEN" && <span> · sandbox extended hours</span>}
          {latest && <span> · updated {istTime(latest, false)}</span>}
        </span>
        <div className="relative flex-1 overflow-hidden" aria-live="off">
          <div className="ticker-track flex w-max gap-8 whitespace-nowrap">
            {items.map((r, i) => {
              const { change, changePct } = changeOf(r.quote.ltp, r.quote.prev_close);
              return (
                <Link key={`${r.symbol}-${i}`} href={`/markets/${encodeURIComponent(r.symbol)}`} className="tnum flex items-center gap-2">
                  <span className="font-semibold">{r.symbol}</span>
                  <span>{price(r.quote.ltp)}</span>
                  <span className={clsx(change >= 0 ? "text-profit" : "text-loss")}>{pct(changePct)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
