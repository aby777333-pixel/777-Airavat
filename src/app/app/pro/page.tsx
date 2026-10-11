import Link from "next/link";
import clsx from "clsx";
import { requireUser } from "@/lib/auth";
import { getAccount, getFunds } from "@/lib/account";
import { getCandles, getMarketStatus, getQuotes } from "@/lib/market";
import { changeOf, money, pct, price } from "@/lib/format";
import { Badge, Empty, SimBadge } from "@/components/ui";
import AdvancedChart from "@/components/market/AdvancedChart";
import OrderTicket from "../markets/[symbol]/OrderTicket";
import AdvancedOrders from "../markets/[symbol]/AdvancedOrders";
import DepthLadder from "./DepthLadder";

// Terminal X: multi-panel professional workspace on the same authoritative engine.
export default async function TerminalX({ searchParams }: { searchParams: Promise<{ symbol?: string }> }) {
  const { symbol = "RELIANCE" } = await searchParams;
  const { supabase, user } = await requireUser("/app/pro");
  const account = await getAccount(supabase, user.id);
  if (!account) return <Empty title="No sandbox account" cta={{ href: "/app/onboarding", label: "Complete onboarding" }} />;
  const [quotes, ms, funds, { data: positions }, watch] = await Promise.all([getQuotes(), getMarketStatus(), getFunds(supabase, account.id), supabase.from("positions").select("*, instrument:instruments(symbol)").eq("account_id", account.id).neq("net_qty", 0), supabase.from("watchlist_items").select("instrument_id, watchlist:watchlists!inner(user_id)").eq("watchlist.user_id", user.id)]);
  const inst = quotes.find((q) => q.symbol === symbol.toUpperCase() && q.tradable) ?? quotes.find((q) => q.symbol === "RELIANCE")!;
  const [candles, intraday, holding] = await Promise.all([getCandles(inst.id, "1d", 200), getCandles(inst.id, "1m", 1200), supabase.from("holdings").select("qty").eq("account_id", account.id).eq("instrument_id", inst.id).maybeSingle()]);
  const ids = new Set((watch.data ?? []).map((w) => w.instrument_id));
  const list = quotes.filter((q) => q.segment === "EQ" && (ids.size === 0 || ids.has(q.id)));
  const qmap = new Map(quotes.map((q) => [q.id, q.quote.ltp]));
  return (
    <div className="-m-4 min-h-[calc(100dvh-4rem)] bg-bg p-3 lg:-m-6">
      <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-muted"><span className="font-display text-sm font-semibold text-text">Terminal X</span><SimBadge /><span>Session {ms.status}</span><span>Available {money(funds.available)}</span><span className="ml-auto">⌘K commands · B/S ticket · Esc close</span><Link href="/app" className="btn btn-ghost btn-sm">Investor view</Link></div>
      <div className="grid gap-3 xl:grid-cols-[280px_1fr_340px]">
        <aside className="glass max-h-[80vh] overflow-y-auto p-2">
          <div className="mb-1 px-2 text-[11px] uppercase tracking-wider text-faint">{ids.size ? "Watchlist" : "Universe"}</div>
          <table className="table text-xs"><tbody>{list.map((q) => { const c = changeOf(q.quote.ltp, q.quote.prev_close); return <tr key={q.id} className={clsx(q.id === inst.id && "bg-accent/10")}><td><Link href={`/app/pro?symbol=${q.symbol}`} className="font-semibold hover:text-accent">{q.symbol}</Link></td><td className="num">{price(q.quote.ltp)}</td><td className={clsx("num", c.change >= 0 ? "text-profit" : "text-loss")}>{pct(c.changePct)}</td></tr>; })}</tbody></table>
        </aside>
        <main className="space-y-3">
          <div className="glass p-3">
            <div className="mb-2 flex flex-wrap items-baseline gap-3"><span className="font-display text-xl font-bold">{inst.symbol}</span><span className="text-sm text-muted">{inst.name}</span><span className="tnum text-lg">{price(inst.quote.ltp)}</span>{(() => { const c = changeOf(inst.quote.ltp, inst.quote.prev_close); return <span className={clsx("tnum text-sm", c.change >= 0 ? "text-profit" : "text-loss")}>{pct(c.changePct)}</span>; })()}<Link href={`/app/markets/${inst.symbol}`} className="ml-auto text-xs text-accent">Full page →</Link></div>
            <AdvancedChart daily={candles} intraday={intraday} symbol={inst.symbol} height={340} compact />
          </div>
          <div className="glass p-3">
            <div className="mb-1 text-[11px] uppercase tracking-wider text-faint">Positions</div>
            {(positions ?? []).length === 0 ? <p className="text-xs text-muted">No open positions.</p> : (
              <table className="table text-xs"><thead><tr><th>Symbol</th><th>Product</th><th className="num">Qty</th><th className="num">Avg</th><th className="num">LTP</th><th className="num">P&L</th><th></th></tr></thead>
                <tbody>{(positions ?? []).map((p) => { const ltp = Number(qmap.get(p.instrument_id) ?? 0); const u = (ltp - Number(p.avg_price)) * p.net_qty + Number(p.realized_pnl); const sym = (p.instrument as unknown as { symbol: string })?.symbol; return <tr key={`${p.instrument_id}-${p.product}`}><td><Link href={`/app/pro?symbol=${sym}`} className="font-semibold">{sym}</Link></td><td>{p.product}</td><td className={clsx("num", p.net_qty > 0 ? "text-buy" : "text-sell")}>{p.net_qty}</td><td className="num">{price(p.avg_price)}</td><td className="num">{price(ltp)}</td><td className={clsx("num", u >= 0 ? "text-profit" : "text-loss")}>{money(u)}</td><td><Link href={`/app/positions/twin?symbol=${sym}&product=${p.product}`} className="text-accent">twin</Link></td></tr>; })}</tbody></table>
            )}
          </div>
        </main>
        <aside className="space-y-3">
          <DepthLadder ltp={Number(inst.quote.ltp)} bid={Number(inst.quote.bid ?? inst.quote.ltp)} ask={Number(inst.quote.ask ?? inst.quote.ltp)} tick={Number(inst.tick_size)} volume={Number(inst.quote.volume)} symbol={inst.symbol} />
          <OrderTicket symbol={inst.symbol} ltp={Number(inst.quote.ltp)} tick={Number(inst.tick_size)} lot={inst.lot_size} available={funds.available} holdingQty={holding.data?.qty ?? 0} accepting={ms.accepting_orders} defaultSide="BUY" />
          <AdvancedOrders symbol={inst.symbol} ltp={Number(inst.quote.ltp)} lot={inst.lot_size} holdingQty={holding.data?.qty ?? 0} />
          <div className="text-[11px] text-faint"><Badge tone="sim">simulated</Badge> depth, quotes and fills come from the sandbox engine.</div>
        </aside>
      </div>
    </div>
  );
}
