import Link from "next/link";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/server";
import { money, price } from "@/lib/format";
import { Badge, Notice, PageHeader } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { MarketCrumbs } from "../_shared";

export const metadata = { title: "Bulk and block deals, FII/DII activity, delivery percentages (sandbox)", description: "Bulk and block deals, daily FII and DII buy/sell activity and delivery percentages for the sandbox universe, with provenance on every row.", keywords: ["bulk deals NSE", "block deals today", "FII DII activity", "delivery percentage stocks", "institutional buying selling"] };

export default async function Deals() {
  const supabase = await createClient();
  const [{ data: deals }, { data: flows }, { data: stats }] = await Promise.all([
    supabase.from("bulk_block_deals").select("*, instrument:instruments(symbol)").order("deal_date", { ascending: false }).limit(100),
    supabase.from("institutional_flows").select("*").order("day", { ascending: false }).limit(30),
    supabase.from("market_stats_daily").select("*, instrument:instruments(symbol)").order("day", { ascending: false }).order("delivery_pct", { ascending: false }).limit(60),
  ]);
  const sym = (r: { instrument: unknown }) => ((Array.isArray(r.instrument) ? r.instrument[0] : r.instrument) as { symbol: string } | null)?.symbol;
  const today = stats?.[0]?.day;
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <MarketCrumbs label="Deals, flows and delivery" />
      <PageHero variant="markets" intro="Bulk and block deals show large negotiated trades; FII and DII activity shows the net direction of institutional money; delivery percentage shows how much of a day's volume was actually taken into demat rather than squared off intraday."><PageHeader eyebrow="Markets" title="Bulk & block deals, FII/DII activity, delivery %" /></PageHero>
      <Notice tone="warn">No exchange deals or institutional flow feed is connected. Delivery percentages derive from the simulated engine; other rows show their source.</Notice>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section><h2 className="font-display text-xl font-semibold">FII / DII activity (₹ crore)</h2>
          <div className="glass mt-3 overflow-x-auto p-2"><table className="table text-sm"><thead><tr><th>Day</th><th className="num">FII net</th><th className="num">DII net</th><th>Source</th></tr></thead><tbody>{(flows ?? []).map((f) => { const fii = Number(f.fii_buy_cr) - Number(f.fii_sell_cr), dii = Number(f.dii_buy_cr) - Number(f.dii_sell_cr); return <tr key={f.day}><td>{f.day}</td><td className={clsx("num", fii >= 0 ? "text-profit" : "text-loss")}>{fii.toFixed(1)}</td><td className={clsx("num", dii >= 0 ? "text-profit" : "text-loss")}>{dii.toFixed(1)}</td><td className="text-xs text-faint">{f.source}</td></tr>; })}{(flows ?? []).length === 0 && <tr><td colSpan={4} className="text-muted">None recorded.</td></tr>}</tbody></table></div></section>
        <section><h2 className="font-display text-xl font-semibold">Bulk and block deals</h2>
          <div className="glass mt-3 overflow-x-auto p-2"><table className="table text-sm"><thead><tr><th>Date</th><th>Stock</th><th>Kind</th><th>Client</th><th>Side</th><th className="num">Qty</th><th className="num">Price</th></tr></thead><tbody>{(deals ?? []).map((d) => <tr key={d.id}><td>{d.deal_date}</td><td><Link className="font-semibold hover:text-accent" href={`/markets/${sym(d)}`}>{sym(d)}</Link></td><td><Badge>{d.kind}</Badge></td><td className="text-muted">{d.client_name}<div className="text-xs text-faint">{d.source}</div></td><td className={d.side === "BUY" ? "text-buy" : "text-sell"}>{d.side}</td><td className="num">{Number(d.qty).toLocaleString("en-IN")}</td><td className="num">{price(d.price)}<div className="text-xs text-faint">{money(Number(d.qty) * Number(d.price), { compact: true })}</div></td></tr>)}{(deals ?? []).length === 0 && <tr><td colSpan={7} className="text-muted">None recorded.</td></tr>}</tbody></table></div></section>
      </div>
      <section className="mt-8"><h2 className="font-display text-xl font-semibold">Delivery percentage {today ? `· ${today}` : ""}</h2>
        <div className="glass mt-3 overflow-x-auto p-2"><table className="table text-sm"><thead><tr><th>Stock</th><th className="num">Traded qty</th><th className="num">Deliverable qty</th><th className="num">Delivery %</th><th className="num">Pre-open price</th><th>Source</th></tr></thead><tbody>{(stats ?? []).filter((s) => s.day === today).map((s) => <tr key={s.instrument_id}><td><Link className="font-semibold hover:text-accent" href={`/markets/${sym(s)}`}>{sym(s)}</Link></td><td className="num">{Number(s.traded_qty).toLocaleString("en-IN")}</td><td className="num">{Number(s.deliverable_qty).toLocaleString("en-IN")}</td><td className="num">{s.delivery_pct}%</td><td className="num">{s.pre_open_price ? price(s.pre_open_price) : "—"}</td><td className="text-xs text-faint">{s.source}</td></tr>)}{(stats ?? []).length === 0 && <tr><td colSpan={6} className="text-muted">Computed every 15 minutes during the session.</td></tr>}</tbody></table></div></section>
    </div>
  );
}
