import Link from "next/link";
import clsx from "clsx";
import { requireUser } from "@/lib/auth";
import { getAccount } from "@/lib/account";
import { getQuotes } from "@/lib/market";
import { money, price } from "@/lib/format";
import { Empty, PageHeader, Stat } from "@/components/ui";

export default async function Positions() {
  const { supabase, user } = await requireUser("/app/positions");
  const account = await getAccount(supabase, user.id);
  if (!account) return <Empty title="No sandbox account" cta={{ href: "/app/onboarding", label: "Complete onboarding" }} />;
  const [{ data: positions }, quotes] = await Promise.all([
    supabase.from("positions").select("*, instrument:instruments(symbol)").eq("account_id", account.id).order("updated_at", { ascending: false }),
    getQuotes(),
  ]);
  const q = new Map(quotes.map((x) => [x.id, x.quote]));
  const rows = (positions ?? []).map((p) => {
    const ltp = Number(q.get(p.instrument_id)?.ltp ?? 0);
    const unrealized = (ltp - Number(p.avg_price)) * Number(p.net_qty);
    return { ...p, ltp, unrealized, total: unrealized + Number(p.realized_pnl), symbol: (p.instrument as unknown as { symbol: string })?.symbol };
  });
  const open = rows.filter((r) => r.net_qty !== 0);
  const totalPnl = rows.reduce((s, r) => s + r.total, 0);
  return (
    <>
      <PageHeader eyebrow="Positions" title="Today's positions" subtitle="MIS positions are squared off in the end-of-day run. CNC buys also appear in Holdings." />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Stat label="Open positions" value={open.length} />
        <Stat label="Realised P&L" value={money(rows.reduce((s, r) => s + Number(r.realized_pnl), 0))} tone={rows.reduce((s, r) => s + Number(r.realized_pnl), 0) >= 0 ? "profit" : "loss"} />
        <Stat label="Total P&L (incl. unrealised)" value={money(totalPnl)} tone={totalPnl >= 0 ? "profit" : "loss"} sub="Marked to simulated LTP" />
      </div>
      {rows.length === 0 ? <Empty title="No positions today" cta={{ href: "/app/markets", label: "Go to market watch" }} /> : (
        <div className="glass overflow-x-auto p-2">
          <table className="table">
            <thead><tr><th>Symbol</th><th>Product</th><th className="num">Net qty</th><th className="num">Avg</th><th className="num">LTP</th><th className="num">Unrealised</th><th className="num">Realised</th><th className="num">Total</th><th></th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={`${r.instrument_id}-${r.product}-${r.trading_day}`}>
                <td className="font-semibold">{r.symbol}</td><td className="text-muted">{r.product}</td>
                <td className={clsx("num font-semibold", r.net_qty > 0 ? "text-buy" : r.net_qty < 0 ? "text-sell" : "text-muted")}>{r.net_qty}</td>
                <td className="num">{price(r.avg_price)}</td><td className="num">{price(r.ltp)}</td>
                <td className={clsx("num", r.unrealized >= 0 ? "text-profit" : "text-loss")}>{money(r.unrealized)}</td>
                <td className={clsx("num", Number(r.realized_pnl) >= 0 ? "text-profit" : "text-loss")}>{money(r.realized_pnl)}</td>
                <td className={clsx("num font-semibold", r.total >= 0 ? "text-profit" : "text-loss")}>{money(r.total)}</td>
                <td className="text-right whitespace-nowrap">{r.net_qty !== 0 && <><Link href={`/app/positions/twin?symbol=${encodeURIComponent(r.symbol)}&product=${r.product}`} className="btn btn-ghost btn-sm">Decision twin</Link> <Link href={`/app/markets/${encodeURIComponent(r.symbol)}?side=${r.net_qty > 0 ? "SELL" : "BUY"}`} className="btn btn-ghost btn-sm">Exit</Link></>}</td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}
