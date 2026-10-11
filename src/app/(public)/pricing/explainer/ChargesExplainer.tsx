"use client";
import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { SCHEDULE_VERSION, SEGMENTS, estimateCharges, type SegmentKey, type Side } from "@/lib/charges-schedule";

const fmt = (n: number, d = 2) => n.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
const MIN = 3, MAX = 7; // slider is log10 of trade value: ₹1,000 to ₹1,00,00,000
const COLORS: Record<string, string> = { brokerage: "var(--accent)", stt: "rgba(226,74,74,0.85)", exchange: "rgba(63,184,114,0.85)", sebi: "rgba(127,127,127,0.8)", stamp: "rgba(240,180,41,0.85)", gst: "rgba(90,176,232,0.85)" };
const LABELS: Record<string, string> = { brokerage: "Brokerage", stt: "STT / CTT", exchange: "Exchange txn", sebi: "SEBI fee", stamp: "Stamp duty", gst: "GST (18%)" };

export default function ChargesExplainer() {
  const [key, setKey] = useState<SegmentKey>("equity_delivery");
  const [side, setSide] = useState<Side>("BUY");
  const [logv, setLogv] = useState(5); // ₹1,00,000
  const [exchange, setExchange] = useState<string | undefined>(undefined);
  const [premPct, setPremPct] = useState(2); // option premium as % of contract value
  const seg = SEGMENTS.find((s) => s.key === key)!;
  const value = Math.round(Math.pow(10, logv));
  const isOption = key.endsWith("_options");
  const premium = isOption ? Math.round((value * premPct) / 100) : undefined;
  const exch = exchange && seg.txn[exchange] !== undefined ? exchange : Object.keys(seg.txn)[0];
  const e = estimateCharges(key, side, value, { exchange: exch, premium });
  const other = estimateCharges(key, side === "BUY" ? "SELL" : "BUY", value, { exchange: exch, premium });
  const round = e.total + other.total;
  const basis = e.basis;
  const parts = (["brokerage", "stt", "exchange", "sebi", "stamp", "gst"] as const).map((k) => ({ k, v: e[k] }));
  const sttRule = seg.stt.find((r) => r.basis !== "intrinsic" && (r.side === "BOTH" || r.side === side));
  const sebiRate = typeof seg.sebiPerCrore === "number" ? seg.sebiPerCrore : seg.sebiPerCrore.nonAgri;
  const formulas: { k: string; f: string; v: number }[] = [
    { k: "brokerage", f: seg.brokerage.type === "zero" ? "₹0 (zero brokerage on delivery)" : seg.brokerage.type === "flat" ? `flat ₹${seg.brokerage.amount} per executed order` : `min(${seg.brokerage.pct}% × ₹${fmt(value, 0)}, ₹${seg.brokerage.cap})`, v: e.brokerage },
    { k: "stt", f: sttRule ? `${sttRule.pct}% × ${sttRule.basis === "premium" ? "premium" : "value"} ₹${fmt(basis, 0)} (${sttRule.side === "BOTH" ? "both sides" : sttRule.side.toLowerCase() + " side only"})` : side === "BUY" && seg.stt.length ? "nil on the buy side in this segment" : "nil in this segment", v: e.stt },
    { k: "exchange", f: `${seg.txn[exch]}% × ₹${fmt(basis, 0)} on ${exch}`, v: e.exchange },
    { k: "sebi", f: `₹${sebiRate} per crore × ₹${fmt(basis, 0)}`, v: e.sebi },
    { k: "stamp", f: side === "BUY" ? `${seg.stampPct}% × ₹${fmt(basis, 0)} (buy side only)` : "nil on the sell side", v: e.stamp },
    { k: "gst", f: `18% × (brokerage ₹${fmt(e.brokerage)} + exchange ₹${fmt(e.exchange)} + SEBI ₹${fmt(e.sebi)})`, v: e.gst },
  ];
  const beMovePct = basis ? (round / basis) * 100 : 0;
  return (
    <div className="grid gap-6 lg:grid-cols-[1.618fr_1fr]">
      <div className="space-y-4">
        <div className="glass p-5">
          <div className="flex flex-wrap gap-1 text-xs">{SEGMENTS.map((s) => <button key={s.key} type="button" onClick={() => { setKey(s.key); setExchange(undefined); }} className={clsx("badge !normal-case !tracking-normal", key === s.key && "badge-accent")}>{s.name}</button>)}</div>
          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto_auto]">
            <label className="block"><span className="label">Trade value: <b className="tnum text-text">₹{fmt(value, 0)}</b></span><input type="range" min={MIN} max={MAX} step={0.01} value={logv} onChange={(ev) => setLogv(Number(ev.target.value))} className="w-full accent-[var(--accent)]" aria-label="Trade value" /><div className="flex justify-between text-[10px] text-muted"><span>₹1,000</span><span>₹1 lakh</span><span>₹10 lakh</span><span>₹1 crore</span></div></label>
            <div><span className="label">Side</span><div className="flex gap-1">{(["BUY", "SELL"] as const).map((s) => <button key={s} type="button" onClick={() => setSide(s)} className={clsx("rounded-md border px-3 py-1.5 text-sm font-semibold", side === s ? (s === "BUY" ? "border-profit bg-profit/15 text-profit" : "border-loss bg-loss/15 text-loss") : "border-border text-muted")}>{s}</button>)}</div></div>
            <div><span className="label">Exchange</span><div className="flex gap-1">{Object.keys(seg.txn).map((x) => <button key={x} type="button" onClick={() => setExchange(x)} className={clsx("badge !normal-case", exch === x && "badge-accent")}>{x}</button>)}</div></div>
          </div>
          {isOption && <label className="mt-3 block"><span className="label">Option premium as % of contract value: <b className="tnum text-text">{premPct}%</b> (premium ₹{fmt(premium ?? 0, 0)})</span><input type="range" min={0.2} max={15} step={0.1} value={premPct} onChange={(ev) => setPremPct(Number(ev.target.value))} className="w-full" aria-label="Premium percent" /></label>}
          <div className="mt-5">
            <div className="flex h-7 w-full overflow-hidden rounded-lg bg-bg">{parts.filter((p) => p.v > 0).map((p) => <div key={p.k} title={`${LABELS[p.k]} ₹${fmt(p.v)}`} className="h-full transition-all duration-500" style={{ width: `${(p.v / (e.total || 1)) * 100}%`, background: COLORS[p.k] }} />)}</div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs">{parts.map((p) => <span key={p.k} className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COLORS[p.k] }} />{LABELS[p.k]} <b className="tnum">₹{fmt(p.v)}</b></span>)}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted">This order</div><div className="tnum font-display text-xl">₹{fmt(e.total)}</div><div className="text-[11px] text-muted">{basis ? ((e.total / basis) * 100).toFixed(3) : "0"}% of {isOption ? "premium" : "value"}</div></div>
            <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted">Round trip (buy + sell)</div><div className="tnum font-display text-xl">₹{fmt(round)}</div><div className="text-[11px] text-muted">both legs at this value</div></div>
            <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted">Breakeven move</div><div className="tnum font-display text-xl">{beMovePct.toFixed(3)}%</div><div className="text-[11px] text-muted">price must move this much to cover charges</div></div>
            <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted">Broker&apos;s share</div><div className="tnum font-display text-xl">{e.total ? ((e.brokerage / e.total) * 100).toFixed(0) : 0}%</div><div className="text-[11px] text-muted">rest is statutory and exchange</div></div>
          </div>
        </div>
        <div className="glass p-5">
          <div className="font-display font-semibold">Every line, with its formula</div>
          <table className="table mt-2 text-sm"><tbody>{formulas.map((f) => <tr key={f.k}><td className="whitespace-nowrap"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COLORS[f.k] }} /> {LABELS[f.k]}</td><td className="font-mono text-xs text-muted">{f.f}</td><td className="tnum text-right">₹{fmt(f.v)}</td></tr>)}<tr><td className="font-semibold">Total</td><td></td><td className="tnum text-right font-semibold">₹{fmt(e.total)}</td></tr></tbody></table>
          {e.notes.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted">{e.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
          {seg.ipft && <p className="mt-2 text-xs text-muted">Also levied by the exchange: IPFT {seg.ipft}; DP charges on delivery sells are separate (see the schedule).</p>}
        </div>
      </div>
      <aside className="space-y-4">
        <div className="glass p-5 text-sm"><div className="font-display font-semibold">What changes the bill</div><ul className="mt-2 list-disc space-y-1 pl-5 text-muted"><li><b>Delivery vs intraday:</b> delivery has zero brokerage but STT on both sides at 0.1%; intraday pays brokerage but STT only on the sell at 0.025%.</li><li><b>Options:</b> brokerage is flat per order, and STT, exchange fees and SEBI fee are on the premium, not the contract value.</li><li><b>Buy vs sell:</b> stamp duty is on buys only; STT in most segments on sells only.</li><li><b>GST</b> applies to brokerage, exchange and SEBI fees, never to STT or stamp duty.</li></ul></div>
        <div className="glass p-5 text-sm"><div className="font-display font-semibold">Try these</div><div className="mt-2 flex flex-col gap-1">{[["₹10,000 delivery buy", "equity_delivery", "BUY", 4], ["₹5 lakh intraday sell", "equity_intraday", "SELL", Math.log10(500000)], ["₹12 lakh futures lot", "equity_futures", "BUY", Math.log10(1200000)], ["Options, premium ₹3,000 on ₹15 lakh", "equity_options", "SELL", Math.log10(1500000)]].map(([l, k, s, v]) => <button key={String(l)} type="button" onClick={() => { setKey(k as SegmentKey); setSide(s as Side); setLogv(Number(v)); if (k === "equity_options") setPremPct(0.2); }} className="rounded-md border border-border px-3 py-1.5 text-left text-xs hover:border-accent">{l}</button>)}</div></div>
        <div className="glass p-5 text-xs text-muted">Rates are from the AIRAVAT published schedule, version {SCHEDULE_VERSION}, the same table the ledger uses; unit tests in the repository check the estimator. <Link href="/pricing" className="text-accent">Full schedule →</Link> · <Link href="/tools/brokerage-calculator" className="text-accent">Brokerage calculator</Link></div>
      </aside>
    </div>
  );
}
