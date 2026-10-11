import Link from "next/link";
import clsx from "clsx";
import { requireUser } from "@/lib/auth";
import { getAccount } from "@/lib/account";
import { istTime, money, price } from "@/lib/format";
import { Badge, Card, Empty, Notice, PageHeader, Stat } from "@/components/ui";

type GainRow = { symbol: string; qty: number; buy_date: string; buy_price: string; sell_date: string; sell_price: string; holding_days: number; class: "STCG" | "LTCG"; gain: number };
type Gains = { from: string; to: string; rows: GainRow[]; stcg: number; ltcg: number; speculative_intraday: number; note: string };
type NoteTrade = { time: string; order_id: number; exchange_trade_id: string; symbol: string; side: string; product: string; qty: number; price: string; value: string; total_charges: string };
type Note = { note_no: string; day: string; client_code: string; client_name: string; ucc: string | null; demat: string | null; trades: NoteTrade[]; totals: Record<string, string>; disclaimer: string };

function fyBounds(label: string) { const y = Number(label.slice(0, 4)); return { from: `${y}-04-01`, to: `${y + 1}-03-31` }; }
function currentFy(d = new Date()) { const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; return `${y}-${String(y + 1).slice(2)}`; }

export default async function Reports({ searchParams }: { searchParams: Promise<{ fy?: string; day?: string }> }) {
  const sp = await searchParams;
  const { supabase, user } = await requireUser("/app/reports");
  const account = await getAccount(supabase, user.id);
  if (!account) return <Empty title="No sandbox account" cta={{ href: "/app/onboarding", label: "Complete onboarding" }} />;
  const fy = /^\d{4}-\d{2}$/.test(sp.fy ?? "") ? sp.fy! : currentFy();
  const { from, to } = fyBounds(fy);
  const { data: days } = await supabase.from("trades").select("traded_at").eq("account_id", account.id).order("traded_at", { ascending: false }).limit(500);
  const tradeDays = [...new Set((days ?? []).map((d) => new Date(d.traded_at).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })))];
  const day = /^\d{4}-\d{2}-\d{2}$/.test(sp.day ?? "") ? sp.day! : tradeDays[0];
  const [{ data: gainsRaw }, { data: noteRaw }] = await Promise.all([
    supabase.rpc("capital_gains", { p_account: account.id, p_from: from, p_to: to }),
    day ? supabase.rpc("contract_note", { p_account: account.id, p_day: day }) : Promise.resolve({ data: null }),
  ]);
  const gains = gainsRaw as Gains | null; const note = noteRaw as Note | null;
  const fys = [currentFy(), currentFy(new Date(Date.UTC(new Date().getFullYear() - 1, 5, 1)))];
  return (
    <>
      <PageHeader eyebrow="Reports" title="Tax P&L, contract notes and statements" subtitle="Generated from the posted ledger and trade book. Every document is labelled as simulated." action={<Link href="/app/portfolio" className="btn btn-ghost btn-sm">← Portfolio</Link>} />
      <Card title="Statements (CSV)" subtitle="Download your records for the chosen financial year">
        <div className="flex flex-wrap gap-2 text-sm">
          {[["ledger", "Ledger statement"], ["trades", "Trade book"], ["holdings", "Holdings statement"], ["capital-gains", `Capital gains ${fy}`], ["pnl", "Realised P&L"]].map(([k, l]) => <a key={k} href={`/api/statements/${k}?fy=${fy}`} className="btn btn-ghost btn-sm">{l} ↓</a>)}
        </div>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <Card title={`Capital gains · FY ${fy}`} subtitle="FIFO matching on delivery trades, charges apportioned" action={<form className="flex gap-1"><select name="fy" defaultValue={fy} className="select text-xs">{fys.map((f) => <option key={f} value={f}>FY {f}</option>)}</select><button className="btn btn-ghost btn-sm">Go</button></form>}>
          {!gains ? <p className="text-sm text-muted">No data.</p> : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Short-term (STCG)" value={money(gains.stcg)} tone={gains.stcg >= 0 ? "profit" : "loss"} />
                <Stat label="Long-term (LTCG)" value={money(gains.ltcg)} tone={gains.ltcg >= 0 ? "profit" : "loss"} />
                <Stat label="Intraday (speculative)" value={money(gains.speculative_intraday)} tone={gains.speculative_intraday >= 0 ? "profit" : "loss"} />
              </div>
              {gains.rows.length === 0 ? <p className="mt-3 text-sm text-muted">No delivery sells in this financial year.</p> : (
                <div className="mt-3 overflow-x-auto"><table className="table text-xs"><thead><tr><th>Symbol</th><th className="num">Qty</th><th>Bought</th><th className="num">Buy</th><th>Sold</th><th className="num">Sell</th><th className="num">Days</th><th>Class</th><th className="num">Gain</th></tr></thead>
                  <tbody>{gains.rows.map((r, i) => <tr key={i}><td className="font-semibold">{r.symbol}</td><td className="num">{r.qty}</td><td>{r.buy_date}</td><td className="num">{price(r.buy_price)}</td><td>{r.sell_date}</td><td className="num">{price(r.sell_price)}</td><td className="num">{r.holding_days}</td><td><Badge tone={r.class === "LTCG" ? "ok" : "info"}>{r.class}</Badge></td><td className={clsx("num", r.gain >= 0 ? "text-profit" : "text-loss")}>{money(r.gain)}</td></tr>)}</tbody></table></div>
              )}
              <p className="mt-3 text-xs text-faint">{gains.note}</p>
            </>
          )}
        </Card>
        <Card title="Contract note" subtitle="One per trading day, numbered CN-SIM-YYYYMMDD" action={tradeDays.length > 0 ? <form className="flex gap-1"><select name="day" defaultValue={day} className="select text-xs">{tradeDays.slice(0, 60).map((d) => <option key={d} value={d}>{d}</option>)}</select><button className="btn btn-ghost btn-sm">Open</button></form> : undefined}>
          {!note ? <p className="text-sm text-muted">No trades yet, so no contract notes.</p> : (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm"><div><span className="font-mono text-xs">{note.note_no}</span> · {note.client_name} · {note.client_code}{note.ucc ? ` · UCC ${note.ucc}` : ""}</div><a href={`/api/statements/contract-note?day=${note.day}`} className="btn btn-ghost btn-sm">CSV ↓</a></div>
              <div className="mt-2 overflow-x-auto"><table className="table text-xs"><thead><tr><th>Time</th><th>Trade</th><th>Symbol</th><th>Side</th><th>Product</th><th className="num">Qty</th><th className="num">Price</th><th className="num">Value</th><th className="num">Charges</th></tr></thead>
                <tbody>{note.trades.map((t) => <tr key={t.exchange_trade_id}><td>{istTime(t.time, false)}</td><td className="font-mono">{t.exchange_trade_id}</td><td className="font-semibold">{t.symbol}</td><td className={t.side === "BUY" ? "text-buy" : "text-sell"}>{t.side}</td><td>{t.product}</td><td className="num">{t.qty}</td><td className="num">{price(t.price)}</td><td className="num">{money(t.value)}</td><td className="num">{money(t.total_charges)}</td></tr>)}</tbody></table></div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">{Object.entries(note.totals).map(([k, v]) => <div key={k}><dt className="text-faint">{k.replace(/_/g, " ")}</dt><dd className={clsx("tnum", k === "net_obligation" && (Number(v) >= 0 ? "text-profit" : "text-loss"))}>{money(v)}</dd></div>)}</dl>
              <p className="mt-3 text-xs text-faint">{note.disclaimer}</p>
            </>
          )}
        </Card>
      </div>
      <div className="mt-5"><Notice tone="warn">Educational reports from a simulated environment. They are not tax documents and do not apply exemptions, grandfathering, indexation or rates.</Notice></div>
    </>
  );
}
