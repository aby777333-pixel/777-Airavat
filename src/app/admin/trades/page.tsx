import clsx from "clsx";
import { requireStaff } from "@/lib/auth";
import { istTime, money, price } from "@/lib/format";
import { PageHeader, Stat } from "@/components/ui";

export default async function AdminTrades() {
  const { supabase } = await requireStaff("/admin/trades");
  const { data: trades } = await supabase.from("trades").select("*, instrument:instruments(symbol), account:trading_accounts(client_code)").order("traded_at", { ascending: false }).limit(300);
  const turnover = (trades ?? []).reduce((s, t) => s + Number(t.value), 0);
  const brokerage = (trades ?? []).reduce((s, t) => s + Number(t.brokerage), 0);
  const levies = (trades ?? []).reduce((s, t) => s + Number(t.total_charges) - Number(t.brokerage), 0);
  return (
    <>
      <PageHeader eyebrow="Trade book" title="Executions (simulated exchange)" />
      <div className="mb-5 grid gap-4 sm:grid-cols-3"><Stat label="Turnover (last 300)" value={money(turnover, { compact: true })} /><Stat label="Brokerage revenue" value={money(brokerage)} /><Stat label="Statutory & exchange levies collected" value={money(levies)} /></div>
      <div className="glass overflow-x-auto p-2">
        <table className="table text-sm">
          <thead><tr><th>Time</th><th>Trade id</th><th>Client</th><th>Symbol</th><th>Side</th><th className="num">Qty</th><th className="num">Price</th><th className="num">Value</th><th className="num">Charges</th><th>Journal</th></tr></thead>
          <tbody>{(trades ?? []).map((t) => (
            <tr key={t.id}><td className="text-xs text-muted">{istTime(t.traded_at)}</td><td className="text-xs">{t.exchange_trade_id}</td><td className="tnum">{(t.account as unknown as { client_code: string })?.client_code}</td><td className="font-semibold">{(t.instrument as unknown as { symbol: string })?.symbol}</td>
              <td className={clsx("font-semibold", t.side === "BUY" ? "text-buy" : "text-sell")}>{t.side} <span className="text-xs text-muted">{t.product}</span></td><td className="num">{t.qty}</td><td className="num">{price(t.price)}</td><td className="num">{money(t.value)}</td><td className="num">{money(t.total_charges)}</td><td className="text-xs text-faint">#{t.journal_entry_id}</td></tr>))}</tbody>
        </table>
      </div>
    </>
  );
}
