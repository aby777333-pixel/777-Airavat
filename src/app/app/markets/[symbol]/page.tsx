import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { requireUser } from "@/lib/auth";
import { getAccount, getFunds } from "@/lib/account";
import { getCandles, getInstrument, getMarketStatus } from "@/lib/market";
import { changeOf, istTime, pct, price } from "@/lib/format";
import Chart from "@/components/market/Chart";
import { Notice, SimBadge } from "@/components/ui";
import OrderTicket from "./OrderTicket";
import AdvancedOrders from "./AdvancedOrders";

export default async function TradePage({ params, searchParams }: { params: Promise<{ symbol: string }>; searchParams: Promise<{ side?: string }> }) {
  const [{ symbol }, sp] = await Promise.all([params, searchParams]);
  const sym = decodeURIComponent(symbol);
  const { supabase, user } = await requireUser(`/app/markets/${symbol}`);
  const [inst, ms, account] = await Promise.all([getInstrument(sym), getMarketStatus(), getAccount(supabase, user.id)]);
  if (!inst) notFound();
  const [candles, funds, holding, position] = await Promise.all([
    getCandles(inst.id, "1d", 300),
    account ? getFunds(supabase, account.id) : null,
    account ? supabase.from("holdings").select("qty,avg_price").eq("account_id", account.id).eq("instrument_id", inst.id).maybeSingle() : null,
    account ? supabase.from("positions").select("product,net_qty,avg_price,realized_pnl").eq("account_id", account.id).eq("instrument_id", inst.id).neq("net_qty", 0) : null,
  ]);
  const c = changeOf(inst.quote.ltp, inst.quote.prev_close);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/app/markets" className="text-xs text-accent">← Market watch</Link>
          <h1 className="font-display text-2xl font-bold">{inst.symbol} <span className="text-base font-normal text-muted">{inst.name}</span></h1>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <span className="tnum font-display text-2xl font-semibold">{price(inst.quote.ltp)}</span>
            <span className={clsx("tnum", c.change >= 0 ? "text-profit" : "text-loss")}>{price(c.change)} ({pct(c.changePct)})</span>
            <SimBadge /><span className="text-xs text-faint">{istTime(inst.quote.updated_at)}</span>
          </div>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.618fr_1fr]">
        <div className="space-y-4">
          <div className="glass p-4"><Chart candles={candles} height={360} /></div>
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <div className="glass p-3"><div className="text-xs text-muted">Bid / Ask</div><div className="tnum">{price(inst.quote.bid)} / {price(inst.quote.ask)}</div></div>
            <div className="glass p-3"><div className="text-xs text-muted">Day range</div><div className="tnum">{price(inst.quote.low)} – {price(inst.quote.high)}</div></div>
            <div className="glass p-3"><div className="text-xs text-muted">Price band</div><div className="tnum">{price(inst.quote.prev_close * (1 - inst.price_band_pct / 100))} – {price(inst.quote.prev_close * (1 + inst.price_band_pct / 100))}</div></div>
          </div>
          {(holding?.data || (position?.data ?? []).length > 0) && (
            <div className="glass p-4 text-sm">
              <div className="mb-2 text-xs uppercase tracking-wider text-muted">Your exposure</div>
              {holding?.data && <div>Holdings: <strong className="tnum">{holding.data.qty}</strong> @ {price(holding.data.avg_price)}</div>}
              {(position?.data ?? []).map((p) => <div key={p.product}>{p.product} position: <strong className="tnum">{p.net_qty}</strong> @ {price(p.avg_price)} · realised {price(p.realized_pnl)}</div>)}
            </div>
          )}
        </div>
        <div>
          {!account ? (
            <Notice tone="warn">Complete <Link className="underline" href="/app/onboarding">onboarding</Link> to trade in the sandbox.</Notice>
          ) : !inst.tradable ? (
            <Notice tone="info">Indices are not tradable in the cash segment.</Notice>
          ) : (
            <>
              <OrderTicket symbol={inst.symbol} ltp={Number(inst.quote.ltp)} tick={Number(inst.tick_size)} lot={inst.lot_size} available={funds?.available ?? 0} holdingQty={holding?.data?.qty ?? 0} accepting={ms.accepting_orders} defaultSide={sp.side === "SELL" ? "SELL" : "BUY"} />
              <AdvancedOrders symbol={inst.symbol} ltp={Number(inst.quote.ltp)} lot={inst.lot_size} holdingQty={holding?.data?.qty ?? 0} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
