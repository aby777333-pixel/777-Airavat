"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { placeConditional, type ConditionalInput } from "../../orders/conditional-actions";
import { price as fmtPrice } from "@/lib/format";

type Mode = "GTT" | "AMO" | "BRACKET" | "COVER" | "ICEBERG" | "TRAILING_STOP" | "OCO";
const MODES: [Mode, string, string][] = [
  ["GTT", "GTT", "Good-till-triggered: places a market/limit order when the price crosses your trigger (valid up to a year)."],
  ["AMO", "After-market", "Queued now, sent to the simulated exchange when the next session opens."],
  ["BRACKET", "Bracket", "Entry now, then a target and a stop armed as one-cancels-other once filled."],
  ["COVER", "Cover", "Entry now with a compulsory stop-loss armed on fill."],
  ["ICEBERG", "Iceberg", "Large quantity worked in disclosed slices; the next slice goes out when the previous one fills."],
  ["TRAILING_STOP", "Trailing stop", "Exit that follows the price by a percentage or amount and fires when it reverses."],
  ["OCO", "OCO exit", "Target and stop for an existing position; whichever triggers first cancels the other."],
];

// Broker-managed conditional orders. Exchange-native types (MARKET/LIMIT/SL/SL-M) stay in the main ticket.
export default function AdvancedOrders({ symbol, ltp, lot, holdingQty }: { symbol: string; ltp: number; lot: number; holdingQty: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("GTT");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [product, setProduct] = useState<"CNC" | "MIS">("CNC");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [qty, setQty] = useState(lot);
  const [price, setPrice] = useState(ltp);
  const [trigger, setTrigger] = useState(Math.round(ltp * 0.98 * 20) / 20);
  const [target, setTarget] = useState(Math.round(ltp * 1.02 * 20) / 20);
  const [stop, setStop] = useState(Math.round(ltp * 0.98 * 20) / 20);
  const [trailPct, setTrailPct] = useState(1.5);
  const [disclosed, setDisclosed] = useState(lot);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const exitMode = mode === "TRAILING_STOP" || mode === "OCO";
  const needsPrice = orderType === "LIMIT" && !exitMode;

  async function submit() {
    setBusy(true); setMsg(null);
    const input: ConditionalInput = { kind: mode, symbol, side: exitMode ? (holdingQty > 0 ? "SELL" : side) : side, product, order_type: exitMode ? "MARKET" : orderType, qty, price: needsPrice ? price : null };
    if (mode === "GTT") input.trigger_price = trigger;
    if (mode === "BRACKET") { input.target_price = target; input.stop_price = stop; }
    if (mode === "COVER") input.stop_price = stop;
    if (mode === "ICEBERG") input.disclosed_qty = disclosed;
    if (mode === "TRAILING_STOP") input.trail_pct = trailPct;
    if (mode === "OCO") { input.target_price = target; input.stop_price = stop; }
    const r = await placeConditional(input);
    setBusy(false);
    if (!r.ok) { setMsg({ ok: false, text: r.error ?? "Failed" }); return; }
    const d = r.data as { id: number; status: string; reason?: string };
    setMsg({ ok: d.status !== "FAILED", text: d.status === "FAILED" ? `Entry rejected by RMS: ${d.reason}` : `${mode.replace("_", " ")} #${d.id} ${d.status.toLowerCase()} (simulated). Track it under Orders → Conditional.` });
    router.refresh();
  }
  const desc = MODES.find((m) => m[0] === mode)?.[2];
  return (
    <div id="advanced" className="glass mt-4 p-4">
      <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => setOpen((o) => !o)}>
        <span className="font-display text-sm font-semibold">Advanced orders <span className="badge ml-1">broker-managed</span></span><span className="text-xs text-muted">{open ? "Hide" : "GTT · AMO · bracket · cover · iceberg · trailing · OCO"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3 text-sm">
          <div className="flex flex-wrap gap-1">{MODES.map(([m, l]) => <button key={m} type="button" className={clsx("btn btn-sm", mode === m ? "btn-primary" : "btn-ghost")} onClick={() => setMode(m)}>{l}</button>)}</div>
          <p className="text-xs text-muted">{desc} Triggers are evaluated every minute against the simulated LTP; the resulting order passes the full risk engine.</p>
          <div className="grid grid-cols-2 gap-2">
            {!exitMode && <div className="col-span-2 grid grid-cols-2 gap-2"><button type="button" className={clsx("btn btn-sm", side === "BUY" ? "btn-buy" : "btn-ghost")} onClick={() => setSide("BUY")}>BUY</button><button type="button" className={clsx("btn btn-sm", side === "SELL" ? "btn-sell" : "btn-ghost")} onClick={() => setSide("SELL")}>SELL</button></div>}
            <label className="block"><span className="label">Product</span><select className="select" value={product} onChange={(e) => setProduct(e.target.value as "CNC")}><option value="CNC">CNC</option><option value="MIS">MIS</option></select></label>
            <label className="block"><span className="label">Quantity (lot {lot})</span><input className="input tnum" type="number" min={lot} step={lot} value={qty} onChange={(e) => setQty(Math.max(lot, Math.floor(Number(e.target.value))))} /></label>
            {!exitMode && <label className="block"><span className="label">Entry type</span><select className="select" value={orderType} onChange={(e) => setOrderType(e.target.value as "MARKET")}><option>MARKET</option><option>LIMIT</option></select></label>}
            {needsPrice && <label className="block"><span className="label">Limit price</span><input className="input tnum" type="number" step={0.05} value={price} onChange={(e) => setPrice(Number(e.target.value))} /></label>}
            {mode === "GTT" && <label className="block"><span className="label">Trigger price (LTP {fmtPrice(ltp)})</span><input className="input tnum" type="number" step={0.05} value={trigger} onChange={(e) => setTrigger(Number(e.target.value))} /></label>}
            {(mode === "BRACKET" || mode === "OCO") && <label className="block"><span className="label">Target price</span><input className="input tnum" type="number" step={0.05} value={target} onChange={(e) => setTarget(Number(e.target.value))} /></label>}
            {(mode === "BRACKET" || mode === "COVER" || mode === "OCO") && <label className="block"><span className="label">Stop price (SL-M)</span><input className="input tnum" type="number" step={0.05} value={stop} onChange={(e) => setStop(Number(e.target.value))} /></label>}
            {mode === "ICEBERG" && <label className="block"><span className="label">Disclosed quantity per slice</span><input className="input tnum" type="number" min={lot} step={lot} value={disclosed} onChange={(e) => setDisclosed(Number(e.target.value))} /></label>}
            {mode === "TRAILING_STOP" && <label className="block"><span className="label">Trail (%)</span><input className="input tnum" type="number" step={0.1} min={0.1} value={trailPct} onChange={(e) => setTrailPct(Number(e.target.value))} /></label>}
          </div>
          {exitMode && <p className="text-xs text-faint">Exit orders act on your existing position in {symbol} (holding {holdingQty}). They fire as MARKET orders.</p>}
          {msg && <div className={clsx("rounded-lg border p-2 text-xs", msg.ok ? "border-profit/40 bg-profit/10 text-profit" : "border-loss/40 bg-loss/10 text-loss")}>{msg.text}</div>}
          <button type="button" className="btn btn-primary btn-sm w-full" onClick={submit} disabled={busy || qty <= 0}>{busy ? "Placing…" : `Place ${mode.replace("_", " ").toLowerCase()} order`}</button>
        </div>
      )}
    </div>
  );
}
