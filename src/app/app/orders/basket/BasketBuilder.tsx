"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { placeConditional } from "../conditional-actions";
import { money } from "@/lib/format";

type Leg = { symbol: string; side: "BUY" | "SELL"; product: "CNC" | "MIS"; order_type: "MARKET" | "LIMIT"; qty: number; price: number | null };

export default function BasketBuilder({ symbols }: { symbols: { symbol: string; ltp: number; lot: number }[] }) {
  const router = useRouter();
  const first = symbols[0]?.symbol ?? "RELIANCE";
  const [legs, setLegs] = useState<Leg[]>([{ symbol: first, side: "BUY", product: "CNC", order_type: "MARKET", qty: 1, price: null }]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string; legs?: { symbol: string; side: string; qty: number; result?: { status?: string; reason?: string } }[] } | null>(null);
  const upd = (i: number, patch: Partial<Leg>) => setLegs((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const ltp = (s: string) => symbols.find((x) => x.symbol === s)?.ltp ?? 0;
  const est = legs.reduce((sum, l) => sum + l.qty * (l.order_type === "LIMIT" && l.price ? l.price : ltp(l.symbol)) * (l.side === "BUY" ? 1 : -1), 0);
  async function submit() {
    setBusy(true); setResult(null);
    const r = await placeConditional({ kind: "BASKET", legs: legs.map((l) => ({ ...l, price: l.order_type === "LIMIT" ? l.price : null })) });
    setBusy(false);
    if (!r.ok) { setResult({ ok: false, text: r.error ?? "Failed" }); return; }
    const d = r.data as { id: number; legs: { symbol: string; side: string; qty: number; result?: { status?: string; reason?: string } }[] };
    setResult({ ok: true, text: `Basket #${d.id} placed (simulated).`, legs: d.legs }); router.refresh();
  }
  return (
    <div className="glass p-5 text-sm">
      <table className="table"><thead><tr><th>Symbol</th><th>Side</th><th>Product</th><th>Type</th><th className="num">Qty</th><th className="num">Limit price</th><th className="num">Est. value</th><th></th></tr></thead>
        <tbody>{legs.map((l, i) => (
          <tr key={i}>
            <td><select className="select" value={l.symbol} onChange={(e) => upd(i, { symbol: e.target.value })}>{symbols.map((s) => <option key={s.symbol}>{s.symbol}</option>)}</select></td>
            <td><select className={clsx("select", l.side === "BUY" ? "text-buy" : "text-sell")} value={l.side} onChange={(e) => upd(i, { side: e.target.value as "BUY" })}><option>BUY</option><option>SELL</option></select></td>
            <td><select className="select" value={l.product} onChange={(e) => upd(i, { product: e.target.value as "CNC" })}><option>CNC</option><option>MIS</option></select></td>
            <td><select className="select" value={l.order_type} onChange={(e) => upd(i, { order_type: e.target.value as "MARKET" })}><option>MARKET</option><option>LIMIT</option></select></td>
            <td><input className="input tnum w-24" type="number" min={1} value={l.qty} onChange={(e) => upd(i, { qty: Math.max(1, Math.floor(Number(e.target.value))) })} /></td>
            <td><input className="input tnum w-28" type="number" step={0.05} disabled={l.order_type !== "LIMIT"} value={l.price ?? ltp(l.symbol)} onChange={(e) => upd(i, { price: Number(e.target.value) })} /></td>
            <td className="num text-muted">{money(l.qty * (l.order_type === "LIMIT" && l.price ? l.price : ltp(l.symbol)))}</td>
            <td><button type="button" className="btn btn-ghost btn-sm" disabled={legs.length === 1} onClick={() => setLegs((x) => x.filter((_, j) => j !== i))}>✕</button></td>
          </tr>))}</tbody></table>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-ghost btn-sm" disabled={legs.length >= 20} onClick={() => setLegs((x) => [...x, { symbol: first, side: "BUY", product: "CNC", order_type: "MARKET", qty: 1, price: null }])}>+ Leg</button>
        <span className="text-xs text-muted">Net cash impact estimate {money(est)} (buys positive) before charges</span>
        <button type="button" className="btn btn-primary btn-sm ml-auto" onClick={submit} disabled={busy}>{busy ? "Placing…" : `Place basket (${legs.length})`}</button>
      </div>
      {result && (
        <div className={clsx("mt-3 rounded-lg border p-3 text-xs", result.ok ? "border-profit/40 bg-profit/10" : "border-loss/40 bg-loss/10 text-loss")}>
          <div>{result.text}</div>
          {result.legs && <ul className="mt-1 space-y-0.5">{result.legs.map((l, i) => <li key={i}>{l.side} {l.qty} {l.symbol} → <strong>{l.result?.status}</strong>{l.result?.reason ? ` (${l.result.reason})` : ""}</li>)}</ul>}
        </div>
      )}
    </div>
  );
}
