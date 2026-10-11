import Link from "next/link";
import clsx from "clsx";
import { requireUser } from "@/lib/auth";
import { getAccount } from "@/lib/account";
import { getQuotes } from "@/lib/market";
import { money, pct, price } from "@/lib/format";
import { Empty, PageHeader, Stat } from "@/components/ui";

export default async function Holdings() {
  const { supabase, user } = await requireUser("/app/holdings");
  const account = await getAccount(supabase, user.id);
  if (!account) return <Empty title="No sandbox account" cta={{ href: "/app/onboarding", label: "Complete onboarding" }} />;
  const [{ data: holdings }, quotes] = await Promise.all([supabase.from("holdings").select("*, instrument:instruments(symbol,name,sector)").eq("account_id", account.id).gt("qty", 0), getQuotes()]);
  const q = new Map(quotes.map((x) => [x.id, x.quote]));
  const rows = (holdings ?? []).map((h) => {
    const ltp = Number(q.get(h.instrument_id)?.ltp ?? 0); const prev = Number(q.get(h.instrument_id)?.prev_close ?? ltp);
    const inst = h.instrument as unknown as { symbol: string; name: string; sector: string };
    const invested = Number(h.qty) * Number(h.avg_price); const value = Number(h.qty) * ltp;
    return { ...h, ltp, invested, value, pnl: value - invested, dayChange: (ltp - prev) * Number(h.qty), ...inst };
  });
  const invested = rows.reduce((s, r) => s + r.invested, 0); const value = rows.reduce((s, r) => s + r.value, 0);
  return (
    <>
      <PageHeader eyebrow="Holdings" title="Demat holdings (simulated)" subtitle="In the sandbox, CNC buys settle to holdings immediately. Real settlement is T+1 through a depository." />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Stat label="Invested" value={money(invested)} />
        <Stat label="Current value" value={money(value)} />
        <Stat label="Overall P&L" value={money(value - invested)} tone={value - invested >= 0 ? "profit" : "loss"} sub={invested ? pct(((value - invested) / invested) * 100) : "—"} />
      </div>
      {rows.length === 0 ? <Empty title="No holdings" body="Buy with product CNC to add delivery holdings." cta={{ href: "/app/markets", label: "Go to market watch" }} /> : (
        <div className="glass overflow-x-auto p-2">
          <table className="table">
            <thead><tr><th>Symbol</th><th className="num">Qty</th><th className="num">Avg cost</th><th className="num">LTP</th><th className="num">Invested</th><th className="num">Value</th><th className="num">P&L</th><th className="num">Day</th><th></th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.instrument_id}><td><div className="font-semibold">{r.symbol}</div><div className="text-xs text-faint">{r.sector}</div></td><td className="num">{r.qty}</td><td className="num">{price(r.avg_price)}</td><td className="num">{price(r.ltp)}</td><td className="num">{money(r.invested)}</td><td className="num">{money(r.value)}</td>
                <td className={clsx("num font-semibold", r.pnl >= 0 ? "text-profit" : "text-loss")}>{money(r.pnl)}</td><td className={clsx("num", r.dayChange >= 0 ? "text-profit" : "text-loss")}>{money(r.dayChange)}</td>
                <td className="text-right"><Link href={`/app/markets/${encodeURIComponent(r.symbol)}?side=SELL`} className="btn btn-ghost btn-sm">Sell</Link></td></tr>))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}
