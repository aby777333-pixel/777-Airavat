import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { requireUser } from "@/lib/auth";
import { getQuotes } from "@/lib/market";
import { istTime, money, price } from "@/lib/format";
import { Badge, Card, PageHeader, Stat } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { shadowOrder } from "../../intel/actions";

type Val = { cash: number; market_value: number; total: number; starting_cash: number; unrealized_pnl: number; realized_pnl: number; return_pct: number; benchmark: string; benchmark_level: number | null };

export default async function ShadowPortfolio({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser(`/app/shadow/${id}`);
  const { data: pf } = await supabase.from("shadow_portfolios").select("*").eq("id", Number(id)).maybeSingle();
  if (!pf) notFound();
  const [{ data: val }, { data: positions }, { data: orders }, quotes] = await Promise.all([
    supabase.rpc("shadow_valuation", { p_portfolio: pf.id }),
    supabase.from("shadow_positions").select("*, instrument:instruments(symbol)").eq("portfolio_id", pf.id),
    supabase.from("shadow_orders").select("*, instrument:instruments(symbol)").eq("portfolio_id", pf.id).order("created_at", { ascending: false }).limit(30),
    getQuotes(),
  ]);
  const v = val as Val;
  const q = new Map(quotes.map((x) => [x.id, x.quote.ltp]));
  const sym = (r: { instrument: unknown }) => ((Array.isArray(r.instrument) ? r.instrument[0] : r.instrument) as { symbol: string } | null)?.symbol;
  return (
    <>
      <PageHeader eyebrow="Shadow Portfolio · hypothetical" title={pf.name} subtitle={<>{pf.thesis || "No thesis"} · benchmark {v.benchmark}{v.benchmark_level ? ` at ${price(v.benchmark_level)}` : ""} · <Badge tone="sim">Simulated</Badge></>} action={<Link href="/app/shadow" className="btn btn-ghost btn-sm">← Portfolios</Link>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total value" value={money(v.total)} sub={`Started ${money(v.starting_cash)}`} tone={v.total >= v.starting_cash ? "profit" : "loss"} />
        <Stat label="Return" value={`${v.return_pct}%`} tone={v.return_pct >= 0 ? "profit" : "loss"} />
        <Stat label="Cash" value={money(v.cash)} sub={`Invested ${money(v.market_value)}`} />
        <Stat label="P&L" value={money(v.unrealized_pnl + v.realized_pnl)} sub={`Unrealised ${money(v.unrealized_pnl)} · realised ${money(v.realized_pnl)}`} tone={v.unrealized_pnl + v.realized_pnl >= 0 ? "profit" : "loss"} />
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.618fr]">
        <Card title="Simulated order" subtitle="Fills at the current simulated quote with sandbox charges">
          <ActionForm action={shadowOrder} successText="Recorded in the shadow ledger." className="space-y-2 text-sm">
            <input type="hidden" name="portfolio_id" value={pf.id} />
            <input className="input" name="symbol" placeholder="Symbol (e.g. TCS)" required />
            <div className="grid grid-cols-2 gap-2"><select className="select" name="side"><option>BUY</option><option>SELL</option></select><input className="input tnum" name="qty" type="number" min={1} defaultValue={10} /></div>
            <input className="input" name="note" placeholder="Why (optional)" />
            <button className="btn btn-primary btn-sm">Place shadow order</button>
          </ActionForm>
        </Card>
        <Card title="Positions">
          {(positions ?? []).filter((p) => p.qty !== 0).length === 0 ? <p className="text-sm text-muted">No open positions.</p> : (
            <table className="table text-sm"><thead><tr><th>Symbol</th><th className="num">Qty</th><th className="num">Avg</th><th className="num">LTP</th><th className="num">Unrealised</th><th className="num">Realised</th></tr></thead>
              <tbody>{(positions ?? []).filter((p) => p.qty !== 0).map((p) => { const ltp = Number(q.get(p.instrument_id) ?? 0); const u = (ltp - Number(p.avg_price)) * p.qty; return <tr key={p.instrument_id}><td className="font-semibold">{sym(p)}</td><td className="num">{p.qty}</td><td className="num">{price(p.avg_price)}</td><td className="num">{price(ltp)}</td><td className={clsx("num", u >= 0 ? "text-profit" : "text-loss")}>{money(u)}</td><td className="num">{money(p.realized_pnl)}</td></tr>; })}</tbody></table>
          )}
        </Card>
      </div>
      <Card title="Order journal" className="mt-5">
        {(orders ?? []).length === 0 ? <p className="text-sm text-muted">No shadow orders yet.</p> : (
          <table className="table text-sm"><thead><tr><th>Time</th><th>Side</th><th>Symbol</th><th className="num">Qty</th><th className="num">Price</th><th className="num">Charges</th><th>Note</th></tr></thead>
            <tbody>{(orders ?? []).map((o) => <tr key={o.id}><td className="text-muted">{istTime(o.created_at)}</td><td className={o.side === "BUY" ? "text-buy" : "text-sell"}>{o.side}</td><td className="font-semibold">{sym(o)}</td><td className="num">{o.qty}</td><td className="num">{price(o.price)}</td><td className="num">{money(o.charges)}</td><td className="text-muted">{o.note}</td></tr>)}</tbody></table>
        )}
      </Card>
    </>
  );
}
