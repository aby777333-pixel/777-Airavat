"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { placeOrder, previewOrder } from "../../actions";
import { money, price as fmtPrice } from "@/lib/format";
import PremortemPanel from "./PremortemPanel";

type Preview = { ok: boolean; reason?: string; order_value?: number; charges?: { total: number; brokerage: number; stt: number; exchange_txn: number; sebi_fee: number; stamp_duty: number; gst: number }; margin_required?: number; available?: number; sufficient?: boolean; kill_switch?: boolean; holdings_qty?: number };

export default function OrderTicket(p: { symbol: string; ltp: number; tick: number; lot: number; available: number; holdingQty: number; accepting: boolean; defaultSide: "BUY" | "SELL" }) {
  const router = useRouter();
  const [side, setSide] = useState<"BUY" | "SELL">(p.defaultSide);
  const [product, setProduct] = useState<"CNC" | "MIS">("CNC");
  const [type, setType] = useState<"MARKET" | "LIMIT" | "SL" | "SL-M">("MARKET");
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(p.ltp);
  const [trigger, setTrigger] = useState(p.ltp);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string; orderId?: string } | null>(null);
  // Idempotency key: generated once per order attempt, rotated after each submission result (in the event handler).
  const [clientOrderId, setClientOrderId] = useState<string>(() => crypto.randomUUID());

  useEffect(() => {
    const onPrefill = (e: Event) => { const d = (e as CustomEvent<{ symbol: string; price: number }>).detail; if (!d || d.symbol !== p.symbol) return; setType("LIMIT"); setPrice(d.price); };
    window.addEventListener("airavat:prefill-price", onPrefill);
    return () => window.removeEventListener("airavat:prefill-price", onPrefill);
  }, [p.symbol]);
  const needsPrice = type === "LIMIT" || type === "SL";
  const needsTrigger = type === "SL" || type === "SL-M";
  const key = useMemo(() => JSON.stringify({ side, product, type, qty, price: needsPrice ? price : null }), [side, product, type, qty, price, needsPrice]);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      if (qty <= 0) return;
      const r = await previewOrder({ symbol: p.symbol, side, order_type: type, product, qty, price: needsPrice ? price : null });
      if (alive) setPreview(r.ok ? (r.data as Preview) : { ok: false, reason: r.error });
    }, 250);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, p.symbol]);

  async function submit() {
    setBusy(true); setResult(null);
    const r = await placeOrder({ client_order_id: clientOrderId, symbol: p.symbol, side, order_type: type, product, qty, price: needsPrice ? price : null, trigger_price: needsTrigger ? trigger : null });
    setBusy(false); setConfirm(false);
    setClientOrderId(crypto.randomUUID());
    if (!r.ok) { setResult({ ok: false, text: r.error ?? "Order failed" }); return; }
    const d = r.data as { order_id: string; status: string; reason?: string; avg_fill_price?: number; filled_qty?: number };
    if (d.status === "RMS_REJECTED") setResult({ ok: false, text: `Rejected by risk engine: ${d.reason}`, orderId: d.order_id });
    else setResult({ ok: true, text: d.status === "FILLED" ? `Filled ${d.filled_qty} @ ${fmtPrice(d.avg_fill_price)} (simulated)` : `Order ${d.status.toLowerCase()} (simulated exchange)`, orderId: d.order_id });
    router.refresh();
  }

  const roundTick = (v: number) => Math.round(v / p.tick) * p.tick;

  return (
    <div className="glass-strong p-5">
      <div className="mb-3 flex items-center justify-between"><div className="font-display text-sm font-semibold">Order ticket</div><span className="badge badge-sim">Simulated</span></div>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Side">
        <button className={clsx("btn", side === "BUY" ? "btn-buy" : "btn-ghost")} onClick={() => setSide("BUY")}>BUY</button>
        <button className={clsx("btn", side === "SELL" ? "btn-sell" : "btn-ghost")} onClick={() => setSide("SELL")}>SELL</button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block"><span className="label">Product</span>
          <select className="select" value={product} onChange={(e) => setProduct(e.target.value as "CNC")}><option value="CNC">CNC (delivery)</option><option value="MIS">MIS (intraday)</option></select></label>
        <label className="block"><span className="label">Order type</span>
          <select className="select" value={type} onChange={(e) => setType(e.target.value as "MARKET")}><option>MARKET</option><option>LIMIT</option><option>SL</option><option>SL-M</option></select></label>
        <label className="block"><span className="label">Quantity (lot {p.lot})</span><input className="input tnum" type="number" min={p.lot} step={p.lot} value={qty} onChange={(e) => setQty(Math.max(0, Math.floor(Number(e.target.value))))} /></label>
        <label className="block"><span className="label">Price {needsPrice ? "" : "(market)"}</span><input className="input tnum" type="number" step={p.tick} value={needsPrice ? price : p.ltp} disabled={!needsPrice} onChange={(e) => setPrice(Number(e.target.value))} onBlur={() => setPrice(roundTick(price))} /></label>
        {needsTrigger && <label className="block col-span-2"><span className="label">Trigger price</span><input className="input tnum" type="number" step={p.tick} value={trigger} onChange={(e) => setTrigger(Number(e.target.value))} onBlur={() => setTrigger(roundTick(trigger))} /></label>}
      </div>

      <div className="mt-4 rounded-xl border border-border bg-bg/40 p-3 text-xs">
        {!preview ? <div className="skeleton h-10 rounded" /> : !preview.ok ? <div className="text-loss">{preview.reason}</div> : (
          <>
            <div className="flex justify-between"><span className="text-muted">Order value</span><span className="tnum">{money(preview.order_value)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Estimated charges</span><span className="tnum">{money(preview.charges?.total)}</span></div>
            <div className="flex justify-between font-semibold"><span>{side === "SELL" && product === "CNC" ? "Holdings required" : "Margin required"}</span><span className="tnum">{side === "SELL" && product === "CNC" ? `${qty} (have ${preview.holdings_qty})` : money(preview.margin_required)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Available</span><span className={clsx("tnum", preview.sufficient ? "text-profit" : "text-loss")}>{money(preview.available)}</span></div>
            {preview.kill_switch && <div className="mt-1 text-loss">Risk desk kill switch is active. Orders will be rejected.</div>}
            {!p.accepting && <div className="mt-1 text-warn">Market closed; orders will be rejected.</div>}
          </>
        )}
      </div>

      {result && <div className={clsx("mt-3 rounded-xl border p-3 text-sm", result.ok ? "border-profit/40 bg-profit/10 text-profit" : "border-loss/40 bg-loss/10 text-loss")}>{result.text}{result.orderId && <a className="ml-2 underline" href={`/app/orders/${result.orderId}`}>View order</a>}</div>}

      {!confirm ? (
        <button className={clsx("btn mt-4 w-full", side === "BUY" ? "btn-buy" : "btn-sell")} disabled={busy || qty <= 0 || !preview?.ok} onClick={() => setConfirm(true)}>Review {side.toLowerCase()} order</button>
      ) : (
        <div className="mt-4 rounded-xl border border-border-strong p-3 text-sm">
          <div className="mb-2 font-medium">Confirm: {side} {qty} {p.symbol} · {type} · {product}{needsPrice ? ` @ ${fmtPrice(price)}` : ""}{needsTrigger ? ` trig ${fmtPrice(trigger)}` : ""}</div>
          <p className="mb-3 text-xs text-muted">This is a simulated order. It will pass through the risk engine and the simulated exchange adapter. Idempotency key {clientOrderId.slice(0, 8)}…</p>
          <PremortemPanel symbol={p.symbol} side={side} product={product} qty={qty} />
          <div className="flex gap-2"><button className="btn btn-ghost btn-sm" onClick={() => setConfirm(false)} disabled={busy}>Edit</button><button className={clsx("btn btn-sm flex-1", side === "BUY" ? "btn-buy" : "btn-sell")} onClick={submit} disabled={busy}>{busy ? "Sending…" : "Place order"}</button></div>
        </div>
      )}
    </div>
  );
}
