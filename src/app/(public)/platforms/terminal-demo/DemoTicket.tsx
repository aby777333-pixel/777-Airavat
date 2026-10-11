"use client";
import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";

// Public, read-only replica of the Terminal X order ticket. It runs the same style of pre-trade checks the
// server-side risk engine performs, purely for illustration. It cannot place an order: there is no account.
type Props = { symbol: string; ltp: number; tick: number; lot: number; bandPct: number; prevClose: number };
const DEMO_FUNDS = 100000; // illustrative sandbox balance shown on the ticket
const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DemoTicket({ symbol, ltp, tick, lot, bandPct, prevClose }: Props) {
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [type, setType] = useState<"MARKET" | "LIMIT" | "SL" | "SL-M">("LIMIT");
  const [product, setProduct] = useState<"CNC" | "MIS">("CNC");
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(ltp.toFixed(2));
  const [trigger, setTrigger] = useState((ltp * (side === "BUY" ? 1.01 : 0.99)).toFixed(2));
  const [trail, setTrail] = useState<{ check: string; ok: boolean; note: string }[] | null>(null);

  const p = Number(price) || 0; const t = Number(trigger) || 0;
  const lo = +(prevClose * (1 - bandPct / 100)).toFixed(2); const hi = +(prevClose * (1 + bandPct / 100)).toFixed(2);
  const refPrice = type === "MARKET" || type === "SL-M" ? ltp : p;
  const value = refPrice * qty; const margin = product === "MIS" ? value * 0.2 : value;

  function check() {
    const rows: { check: string; ok: boolean; note: string }[] = [];
    rows.push({ check: "Instrument tradable and session open (simulated)", ok: true, note: `${symbol} · simulated session` });
    rows.push({ check: `Quantity is a multiple of the lot size (${lot})`, ok: qty > 0 && qty % lot === 0, note: `qty ${qty}` });
    if (type === "LIMIT" || type === "SL") rows.push({ check: `Price on the tick grid (${tick})`, ok: p > 0 && Math.abs(Math.round(p / tick) * tick - p) < 1e-6, note: `₹${fmt(p)}` });
    if (type === "LIMIT" || type === "SL") rows.push({ check: `Price inside the daily band ₹${fmt(lo)} to ₹${fmt(hi)} (±${bandPct}%)`, ok: p >= lo && p <= hi, note: p < lo || p > hi ? "PRICE_OUTSIDE_BAND" : "within band" });
    if (type === "SL" || type === "SL-M") rows.push({ check: side === "BUY" ? "Trigger above LTP for a buy stop" : "Trigger below LTP for a sell stop", ok: side === "BUY" ? t > ltp : t < ltp, note: `trigger ₹${fmt(t)} vs LTP ₹${fmt(ltp)}` });
    const dev = Math.abs(refPrice - ltp) / ltp * 100;
    rows.push({ check: "Fat-finger guard: price within 5% of LTP", ok: dev <= 5, note: `${dev.toFixed(2)}% from LTP` });
    if (side === "BUY") rows.push({ check: `${product === "MIS" ? "Margin" : "Funds"} available (illustrative ₹${fmt(DEMO_FUNDS)})`, ok: margin <= DEMO_FUNDS, note: `needs ₹${fmt(margin)}` });
    else rows.push({ check: "Holdings available to sell (illustrative: none)", ok: product === "MIS", note: product === "MIS" ? "intraday short allowed" : "INSUFFICIENT_HOLDINGS" });
    rows.push({ check: "Account not blocked, kill switch off, within per-order limits", ok: true, note: "simulated" });
    setTrail(rows);
  }
  const passed = trail ? trail.every((r) => r.ok) : null;

  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between"><div className="font-display font-semibold">Order ticket · {symbol}</div><span className="badge">DEMO · cannot place orders</span></div>
      <div className="mt-3 grid grid-cols-2 gap-1 text-xs">{(["BUY", "SELL"] as const).map((s) => <button key={s} type="button" onClick={() => { setSide(s); setTrail(null); }} className={clsx("rounded-md border py-1.5 font-semibold", side === s ? (s === "BUY" ? "border-profit bg-profit/15 text-profit" : "border-loss bg-loss/15 text-loss") : "border-border text-muted")}>{s}</button>)}</div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <label className="block"><span className="label">Type</span><select className="select" value={type} onChange={(e) => { setType(e.target.value as typeof type); setTrail(null); }}>{["MARKET", "LIMIT", "SL", "SL-M"].map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="block"><span className="label">Product</span><select className="select" value={product} onChange={(e) => { setProduct(e.target.value as typeof product); setTrail(null); }}><option value="CNC">CNC (delivery)</option><option value="MIS">MIS (intraday)</option></select></label>
        <label className="block"><span className="label">Quantity</span><input className="input" type="number" min={1} step={lot} value={qty} onChange={(e) => { setQty(Number(e.target.value)); setTrail(null); }} /></label>
        <label className="block"><span className="label">Price</span><input className="input" type="number" step={tick} value={price} disabled={type === "MARKET" || type === "SL-M"} onChange={(e) => { setPrice(e.target.value); setTrail(null); }} /></label>
        {(type === "SL" || type === "SL-M") && <label className="block col-span-2"><span className="label">Trigger</span><input className="input" type="number" step={tick} value={trigger} onChange={(e) => { setTrigger(e.target.value); setTrail(null); }} /></label>}
      </div>
      <div className="mt-3 flex justify-between text-xs text-muted"><span>Order value</span><span className="font-mono text-text">₹{fmt(value)}</span></div>
      <div className="flex justify-between text-xs text-muted"><span>{product === "MIS" ? "Margin (20%, illustrative)" : "Funds needed"}</span><span className="font-mono text-text">₹{fmt(margin)}</span></div>
      <button type="button" onClick={check} className="btn btn-primary mt-3 w-full">Run pre-trade checks</button>
      {trail && (
        <div className="mt-3">
          <div className={clsx("text-xs font-semibold", passed ? "text-profit" : "text-loss")}>{passed ? "All checks passed · in the sandbox this order would now be sent to the simulated exchange" : "Rejected · the order would not leave the risk engine"}</div>
          <ul className="mt-2 space-y-1 text-xs">{trail.map((r) => <li key={r.check} className="flex items-start gap-2"><span className={r.ok ? "text-profit" : "text-loss"}>{r.ok ? "✔" : "✘"}</span><span className="flex-1">{r.check}<span className="block text-faint">{r.note}</span></span></li>)}</ul>
          <Link href="/login?next=/app/pro" className="btn btn-ghost btn-sm mt-3 w-full">Sign in to place it in the sandbox</Link>
        </div>
      )}
    </div>
  );
}
