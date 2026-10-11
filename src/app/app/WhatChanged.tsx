import Link from "next/link";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/server";
import { pct, price } from "@/lib/format";
import { Badge } from "@/components/ui";

type Digest = { since: string; watchlist_moves: { symbol: string; ltp: number; change_pct: number }[]; alerts: { severity: string; title: string; created_at: string }[]; orders: number; fills: number; open_positions: number; new_articles: number; market: { status: string } };
const sevTone = (s: string) => (s === "critical" ? "bad" : s === "warning" ? "info" : s === "opportunity" ? "ok" : "default");

// "What changed since yesterday": computed server-side from the user's own data; no narrative about causes.
export default async function WhatChanged() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("what_changed");
  const d = data as Digest | null;
  if (!d) return null;
  const moves = d.watchlist_moves.slice(0, 4);
  return (
    <div className="m-crystal relative mt-6 overflow-hidden p-5">
      <span className="aurora-ribbon" aria-hidden="true" />
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="font-display text-sm font-semibold">What changed since yesterday</div><div className="flex gap-2 text-xs text-muted"><span>{d.orders} orders</span><span>{d.fills} fills</span><span>{d.open_positions} open</span><span>{d.new_articles} new articles</span><Link href="/app/sentinel" className="text-accent">Sentinel →</Link></div></div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <div className="text-xs text-muted">Biggest watchlist moves</div>
          {moves.length === 0 ? <div className="text-sm text-muted">Watchlist empty.</div> : moves.map((m) => <div key={m.symbol} className="flex justify-between py-0.5 text-sm"><Link href={`/app/markets/${encodeURIComponent(m.symbol)}`} className="hover:text-accent">{m.symbol}</Link><span className="tnum">{price(m.ltp)} <span className={clsx(m.change_pct >= 0 ? "text-profit" : "text-loss")}>{pct(m.change_pct)}</span></span></div>)}
        </div>
        <div>
          <div className="text-xs text-muted">New alerts</div>
          {d.alerts.length === 0 ? <div className="text-sm text-muted">No new Sentinel alerts.</div> : d.alerts.slice(0, 4).map((a, i) => <div key={i} className="flex items-center gap-2 py-0.5 text-sm"><Badge tone={sevTone(a.severity)}>{a.severity}</Badge><span className="truncate">{a.title}</span></div>)}
        </div>
      </div>
    </div>
  );
}
