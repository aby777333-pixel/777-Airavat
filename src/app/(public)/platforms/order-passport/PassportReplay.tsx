"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";

// Two order lifecycles replayed step by step. Scenario A is a real seeded sandbox order (ids are simulated exchange ids);
// scenario B is the rejection recorded in the 0.5.0 RMS end-to-end test. No live data is read.
type Step = { t: number; status: string; title: string; detail: string; data?: Record<string, string | number | boolean>; kind: "event" | "rms" | "fill" | "ledger" | "reject" };
type Scenario = { key: string; name: string; summary: string; steps: Step[] };
const SCENARIOS: Scenario[] = [
  { key: "filled", name: "Market buy, filled", summary: "BUY 50 SBIN · MARKET · MIS · seeded sandbox order", steps: [
    { t: 0, status: "RECEIVED", title: "Order received", detail: "The ticket reaches place_order() in the database. The session snapshot is written to the first event.", data: { market: "CLOSED (sandbox extended hours)", data_source: "SIMULATED", client_order_id: "demo-super-2" }, kind: "event" },
    { t: 0, status: "RMS_CHECK", title: "Risk checks begin", detail: "Nothing has been routed. Every check must pass or the order stops here with a reason.", kind: "event" },
    { t: 0, status: "RMS_CHECK", title: "static_validation · pass", detail: "Instrument tradable, lot and tick fine, reference price 691.20 inside the band, order value computed.", data: { reference_price: 691.2, order_value: 34560, lot: 1, band: "±10%" }, kind: "rms" },
    { t: 0, status: "RMS_CHECK", title: "margin · pass", detail: "MIS needs 20% of value upfront. Required 6,912.00 against available 9,84,102.64.", data: { required: 6912, available: 984102.64 }, kind: "rms" },
    { t: 1, status: "ROUTED", title: "Routed to the simulated exchange", detail: "The adapter is named in the event so nobody mistakes it for a real venue.", data: { adapter: "SIMULATED_EXCHANGE" }, kind: "event" },
    { t: 1, status: "ACKNOWLEDGED", title: "Exchange acknowledgement", detail: "A simulated exchange order id comes back and is stored on the order.", data: { exchange_order_id: "SIMX-20261011-0000100036", simulated: true }, kind: "event" },
    { t: 2, status: "FILLED", title: "Filled 50 @ 691.25", detail: "The fill creates a trade with every charge line computed from the published schedule.", data: { qty: 50, price: 691.25, value: 34562.5, brokerage: 10.37, stt: 0, exchange_txn: 1.06, sebi_fee: 0.03, stamp_duty: 1.04, gst: 2.06, total_charges: 14.56, exchange_trade_id: "SIMT-20261011-00100037" }, kind: "fill" },
    { t: 2, status: "FILLED", title: "Journal entry #22 posted", detail: "Double entry, balanced to the paisa: the client is debited value plus charges; clearing, levies, exchange and brokerage revenue are credited.", data: { "Dr C-AV100033 Client Funds Payable": 34577.06, "Cr 2100 Payable to Clearing (simulated)": 34562.5, "Cr 4000 Brokerage Revenue": 10.37, "Cr 2200 Statutory Levies Payable": 3.13, "Cr 2300 Exchange Charges Payable": 1.06 }, kind: "ledger" },
    { t: 3, status: "FILLED", title: "Position and audit", detail: "The MIS position opens, available funds fall by the margin, and an audit event records actor, order and outcome. The passport is complete and never edited again.", kind: "event" },
  ] },
  { key: "rejected", name: "Limit buy, rejected by RMS", summary: "BUY 1 RELIANCE · LIMIT 12% below LTP · from the 0.5.0 RMS test record", steps: [
    { t: 0, status: "RECEIVED", title: "Order received", detail: "Same entry point, same session snapshot.", data: { market: "OPEN (simulated)", data_source: "SIMULATED" }, kind: "event" },
    { t: 0, status: "RMS_CHECK", title: "Risk checks begin", detail: "Checks run in a fixed order: static validation first, then account limits, fat-finger, funds, exposure.", kind: "event" },
    { t: 0, status: "RMS_CHECK", title: "static_validation · fail", detail: "Limit price sits 12% below the last traded price, outside the ±10% daily band. The check fails and the chain stops; later checks are not run.", data: { reason: "PRICE_OUTSIDE_BAND", limit_price: "LTP × 0.88", band: "±10%" }, kind: "reject" },
    { t: 1, status: "REJECTED", title: "Rejected with a reason", detail: "The order is stored as REJECTED with rejection_reason PRICE_OUTSIDE_BAND. Nothing was routed, no funds moved, no ledger entry exists.", data: { rejection_reason: "PRICE_OUTSIDE_BAND", routed: false, ledger_lines: 0 }, kind: "reject" },
    { t: 2, status: "REJECTED", title: "Audit and client message", detail: "An audit event records the rejection; the client sees the same code in the order book and can read this page to understand it.", kind: "event" },
  ] },
];
const STATUS_FLOW = ["RECEIVED", "RMS_CHECK", "ROUTED", "ACKNOWLEDGED", "FILLED"];
const fmt = (v: string | number | boolean) => (typeof v === "number" ? v.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : String(v));

export default function PassportReplay() {
  const [sc, setSc] = useState(SCENARIOS[0]);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  useEffect(() => {
    if (!playing) return;
    if (i >= sc.steps.length - 1) { const stop = window.setTimeout(() => setPlaying(false), 0); return () => window.clearTimeout(stop); }
    const id = window.setTimeout(() => setI((x) => Math.min(x + 1, sc.steps.length - 1)), 1400 / speed);
    return () => window.clearTimeout(id);
  }, [playing, i, sc, speed]);
  const cur = sc.steps[i];
  const reached = new Set(sc.steps.slice(0, i + 1).map((s) => s.status));
  const rejected = sc.key === "rejected" && reached.has("REJECTED");
  return (
    <div className="grid gap-6 lg:grid-cols-[1.618fr_1fr]">
      <div className="space-y-4">
        <div className="glass p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {SCENARIOS.map((s) => <button key={s.key} type="button" onClick={() => { setSc(s); setI(0); setPlaying(false); }} className={clsx("badge !normal-case !tracking-normal", sc.key === s.key && "badge-accent")}>{s.name}</button>)}
            <span className="ml-auto text-muted">{sc.summary}</span>
          </div>
          <div className="mt-4 flex items-center gap-1 overflow-x-auto">{STATUS_FLOW.map((st, k) => { const on = reached.has(st); const failHere = rejected && st === "ROUTED"; return <div key={st} className="flex items-center gap-1"><div className={clsx("rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-500", on ? "border-profit bg-profit/15 text-profit" : failHere ? "border-loss bg-loss/15 text-loss" : "border-border text-muted")}>{failHere ? "REJECTED" : st}</div>{k < STATUS_FLOW.length - 1 && <span className={clsx("h-px w-5", reached.has(STATUS_FLOW[k + 1]) ? "bg-profit" : "bg-border")} />}</div>; })}</div>
          <div className="mt-4 flex items-center gap-2">
            <button type="button" onClick={() => { if (i >= sc.steps.length - 1) setI(0); setPlaying((p) => !p); }} className="btn btn-primary btn-sm">{playing ? "Pause" : i >= sc.steps.length - 1 ? "Replay" : "Play"}</button>
            <button type="button" onClick={() => { setPlaying(false); setI((x) => Math.max(0, x - 1)); }} className="btn btn-ghost btn-sm">◀</button>
            <button type="button" onClick={() => { setPlaying(false); setI((x) => Math.min(sc.steps.length - 1, x + 1)); }} className="btn btn-ghost btn-sm">▶</button>
            <span className="text-xs text-muted">Step {i + 1} of {sc.steps.length} · t+{cur.t} ms (illustrative)</span>
            <select className="select !w-auto ml-auto !text-xs" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="Speed"><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option></select>
          </div>
        </div>
        <ol className="space-y-2">{sc.steps.map((s, k) => (
          <li key={k} className={clsx("rounded-xl border p-4 transition-all duration-500", k > i ? "border-border opacity-35" : k === i ? (s.kind === "reject" ? "border-loss bg-loss/10" : s.kind === "rms" ? "border-profit bg-profit/10" : "border-accent bg-accent/10") : "border-border bg-bg/30")}>
            <button type="button" onClick={() => { setPlaying(false); setI(k); }} className="flex w-full items-start gap-3 text-left">
              <span className={clsx("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", s.kind === "reject" ? "bg-loss" : s.kind === "rms" ? "bg-profit" : s.kind === "fill" ? "bg-accent" : s.kind === "ledger" ? "bg-warn" : "bg-muted")} />
              <span className="flex-1"><span className="flex flex-wrap items-center gap-2"><span className="badge !text-[10px]">{s.status}</span><span className="font-semibold">{s.title}</span></span><span className="mt-1 block text-sm text-muted">{s.detail}</span>
                {s.data && k <= i && <span className="mt-2 grid gap-x-4 gap-y-0.5 text-xs sm:grid-cols-2">{Object.entries(s.data).map(([a, b]) => <span key={a} className="flex justify-between gap-2 border-b border-border/50 py-0.5"><span className="text-muted">{a}</span><span className="tnum font-mono">{fmt(b)}</span></span>)}</span>}
              </span>
            </button>
          </li>))}</ol>
      </div>
      <aside className="space-y-4">
        <div className="glass p-5 text-sm"><div className="font-display font-semibold">What a passport guarantees</div><ul className="mt-2 list-disc space-y-1 pl-5 text-muted"><li>Every status change is an append-only event with its payload</li><li>Risk checks are stored on the order with pass/fail and the numbers used</li><li>Fills carry every charge line from the published schedule</li><li>Ledger lines are posted in the same transaction and balance to the paisa</li><li>Nothing is edited later; corrections are reversal entries</li></ul></div>
        <div className="glass p-5 text-sm"><div className="font-display font-semibold">Where this comes from</div><p className="mt-1 text-muted">Scenario A is the seeded SBIN order in the sandbox, read from the order, order_events, trades and journal_lines tables (exchange ids are simulated). Scenario B follows the rejection recorded in the 0.5.0 RMS end-to-end test. Sign in to open any of your own passports.</p><div className="mt-2 flex flex-col gap-2"><Link href="/login?next=/app/orders" className="btn btn-primary btn-sm">Open my order book</Link><Link href="/platforms/terminal-demo" className="btn btn-ghost btn-sm">Try the pre-trade checks</Link><Link href="/company/policies#rms" className="btn btn-ghost btn-sm">RMS policy</Link></div></div>
      </aside>
    </div>
  );
}
