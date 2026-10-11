"use client";
import { useState } from "react";
import clsx from "clsx";
import { xirr } from "@/lib/calculators";
import { money, pct } from "@/lib/format";
import { resolveSymbols, type Resolved } from "./actions";

type Line = { symbol: string; qty: number; avg: number; date?: string };
const SAMPLE = `symbol,qty,avg_price,buy_date
RELIANCE,20,2450,2024-03-12
TCS,10,3800,2024-06-02
HDFCBANK,40,1520,2023-11-20
INFY,30,1480,2025-01-15
ITC,100,420,2024-08-08`;

function parse(text: string): Line[] {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).filter((l) => !/^symbol/i.test(l)).map((l) => { const [s, q, a, d] = l.split(/[,\t;]/).map((x) => x.trim()); return { symbol: (s || "").toUpperCase(), qty: Number(q), avg: Number(a), date: d }; }).filter((x) => x.symbol && x.qty > 0 && x.avg > 0);
}

export default function Analyser() {
  const [text, setText] = useState(SAMPLE);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ lines: Line[]; resolved: Resolved[] } | null>(null);
  async function run() {
    setBusy(true);
    const lines = parse(text);
    const resolved = await resolveSymbols(lines.map((l) => l.symbol));
    setRes({ lines, resolved }); setBusy(false);
  }
  const rows = res ? res.lines.map((l) => { const r = res.resolved.find((x) => x.symbol === l.symbol); const ltp = r ? Number(r.ltp) : 0; return { ...l, found: !!r, sector: r?.sector ?? "Unknown", ltp, invested: l.qty * l.avg, value: l.qty * ltp, pnl: l.qty * (ltp - l.avg), dayChg: r ? l.qty * (ltp - Number(r.prev_close)) : 0, n50: r?.nifty50_weight ?? null }; }) : [];
  const invested = rows.reduce((s, r) => s + r.invested, 0); const value = rows.reduce((s, r) => s + r.value, 0);
  const sectors = new Map<string, number>(); rows.forEach((r) => sectors.set(r.sector, (sectors.get(r.sector) ?? 0) + r.value));
  const top = [...rows].sort((a, b) => b.value - a.value)[0];
  const overlap = rows.filter((r) => r.n50 !== null).reduce((s, r) => s + r.value, 0);
  const flows = rows.filter((r) => r.date && r.found).map((r) => ({ date: r.date!, amount: -r.invested }));
  const rate = flows.length ? xirr([...flows, { date: new Date().toISOString().slice(0, 10), amount: rows.filter((r) => r.date && r.found).reduce((s, r) => s + r.value, 0) }]) : null;
  const missing = rows.filter((r) => !r.found).map((r) => r.symbol);
  const herf = value ? rows.reduce((s, r) => s + Math.pow(r.value / value, 2), 0) : 0;
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.618fr]">
      <div className="glass p-5">
        <div className="font-display font-semibold">Paste your holdings</div>
        <p className="mt-1 text-xs text-muted">CSV with symbol, quantity, average price and an optional buy date (YYYY-MM-DD). Export from any broker&apos;s holdings page, or edit the sample. Nothing is uploaded or stored; symbols are resolved against the sandbox universe.</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} className="input mt-3 w-full font-mono text-xs" spellCheck={false} />
        <div className="mt-3 flex items-center gap-2"><button type="button" onClick={run} disabled={busy} className="btn btn-primary btn-sm">{busy ? "Analysing…" : "Analyse"}</button><button type="button" onClick={() => setText(SAMPLE)} className="btn btn-ghost btn-sm">Reset sample</button></div>
      </div>
      <div className="space-y-4">
        {!res ? <div className="glass p-5 text-sm text-muted">Results appear here: allocation by sector, concentration, P&L, XIRR (when dates are given) and overlap with the NIFTY 50.</div> : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[["Invested", money(invested)], ["Current value", money(value)], ["Unrealised P&L", money(value - invested)], ["XIRR", rate === null ? "add dates" : `${rate.toFixed(2)}%`], ["Largest holding", top ? `${top.symbol} · ${((top.value / value) * 100).toFixed(1)}%` : "—"], ["Concentration (HHI)", herf.toFixed(2)], ["NIFTY 50 overlap", value ? `${((overlap / value) * 100).toFixed(0)}%` : "—"], ["Day change", money(rows.reduce((s, r) => s + r.dayChg, 0))]].map(([k, v]) => <div key={k} className="glass p-3"><div className="text-xs text-muted">{k}</div><div className="tnum font-semibold">{v}</div></div>)}
            </div>
            {missing.length > 0 && <div className="rounded-lg border border-warn/40 bg-warn/10 p-3 text-xs">Not in the sandbox universe (ignored in values): {missing.join(", ")}</div>}
            <div className="glass p-5"><div className="font-display font-semibold">Sector allocation</div><div className="mt-2 space-y-2">{[...sectors.entries()].sort((a, b) => b[1] - a[1]).map(([s, v]) => <div key={s}><div className="flex justify-between text-sm"><span>{s}</span><span className="tnum text-muted">{money(v)} · {value ? ((v / value) * 100).toFixed(1) : 0}%</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg"><div className="h-full bg-accent" style={{ width: `${value ? (v / value) * 100 : 0}%` }} /></div></div>)}</div></div>
            <div className="glass overflow-x-auto p-2"><table className="table text-xs"><thead><tr><th>Stock</th><th>Sector</th><th className="num">Qty</th><th className="num">Avg</th><th className="num">LTP</th><th className="num">Value</th><th className="num">P&L</th><th className="num">Weight</th></tr></thead>
              <tbody>{rows.map((r) => <tr key={r.symbol}><td className="font-semibold">{r.symbol}</td><td className="text-muted">{r.sector}</td><td className="num">{r.qty}</td><td className="num">{r.avg.toFixed(2)}</td><td className="num">{r.found ? r.ltp.toFixed(2) : "—"}</td><td className="num">{money(r.value)}</td><td className={clsx("num", r.pnl >= 0 ? "text-profit" : "text-loss")}>{money(r.pnl)} ({r.invested ? pct((r.pnl / r.invested) * 100) : "—"})</td><td className="num">{value ? ((r.value / value) * 100).toFixed(1) : 0}%</td></tr>)}</tbody></table></div>
            <p className="text-xs text-faint">Prices are simulated sandbox quotes. HHI above 0.25 indicates heavy concentration. For the full analytics on your AIRAVAT holdings (benchmark, tax P&amp;L, statements) sign in and open Portfolio.</p>
          </>
        )}
      </div>
    </div>
  );
}
