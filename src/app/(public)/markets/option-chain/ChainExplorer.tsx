"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { simulatedChain, maxPain, putCallRatio, payoffCurve, breakevens, maxProfitLoss, netPremium, type Leg } from "@/lib/options";

type Under = { symbol: string; ltp: number; prev_close: number; lot: number; kind: "index" | "stock" };
type Expiry = { label: string; date: string; kind: "weekly" | "monthly" };
const fmt = (n: number, d = 2) => n.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
const lakh = (n: number) => (n >= 1e7 ? `${(n / 1e7).toFixed(2)} Cr` : n >= 1e5 ? `${(n / 1e5).toFixed(1)} L` : `${Math.round(n / 1000)}k`);

export default function ChainExplorer({ unders, expiries, nowMs }: { unders: Under[]; expiries: Expiry[]; nowMs: number }) {
  const [sym, setSym] = useState(unders[0]?.symbol ?? "NIFTY 50");
  const u = unders.find((x) => x.symbol === sym) ?? unders[0];
  const exps = expiries.filter((e) => u.kind === "index" || e.kind === "monthly");
  const [exp, setExp] = useState(exps[0]?.date ?? "");
  const expSel = exps.find((e) => e.date === exp) ?? exps[0];
  const days = Math.max(1, Math.round((new Date(expSel?.date ?? nowMs).getTime() - nowMs) / 86400000));
  const [legs, setLegs] = useState<Leg[]>([]);
  const [view, setView] = useState<"oi" | "iv" | "pain">("oi");

  const chain = useMemo(() => simulatedChain(u.symbol, u.ltp, days, 12), [u, days]);
  const prev = useMemo(() => simulatedChain(u.symbol, u.prev_close, days + 1, 12, chain[1].strike - chain[0].strike, 11), [u, days, chain]);
  const rows = chain.map((c) => { const p = prev.find((x) => x.strike === c.strike); return { ...c, dCe: p ? c.ceOI - p.ceOI : 0, dPe: p ? c.peOI - p.peOI : 0 }; });
  const atm = chain[Math.floor(chain.length / 2)].strike; const st = chain[1].strike - chain[0].strike;
  const pcr = putCallRatio(chain); const mp = maxPain(chain);
  const maxOI = Math.max(1, ...rows.map((r) => Math.max(r.ceOI, r.peOI)));
  const res = [...rows].sort((a, b) => b.ceOI - a.ceOI)[0]; const sup = [...rows].sort((a, b) => b.peOI - a.peOI)[0];
  const atmRow = rows.find((r) => r.strike === atm)!; const straddle = atmRow.ce + atmRow.pe;
  const buildup = (dOi: number, dPx: number) => (dOi > 0 && dPx > 0 ? "Long build-up" : dOi > 0 && dPx < 0 ? "Short build-up" : dOi < 0 && dPx > 0 ? "Short covering" : "Long unwinding");
  const pain = chain.map((k) => ({ strike: k.strike, loss: chain.reduce((s, c) => s + Math.max(k.strike - c.strike, 0) * c.ceOI + Math.max(c.strike - k.strike, 0) * c.peOI, 0) }));
  const maxPainLoss = Math.max(1, ...pain.map((p) => p.loss));

  const withLot = legs.map((l) => ({ ...l, lot: u.lot }));
  const curve = withLot.length ? payoffCurve(withLot, u.ltp, 0.1) : [];
  const be = withLot.length ? breakevens(withLot, u.ltp) : []; const mpl = withLot.length ? maxProfitLoss(withLot, u.ltp) : null; const net = withLot.length ? netPremium(withLot) : 0;
  const addLeg = (type: "CE" | "PE", strike: number, qty: 1 | -1, premium: number) => setLegs((ls) => [...ls.filter((l) => !(l.type === type && l.strike === strike)), { type, strike, qty, premium }]);

  const W = 560, H = 180;
  const chart = () => {
    if (view === "iv") { const ivs = chain.map((c) => c.iv); const lo = Math.min(...ivs) - 1, hi = Math.max(...ivs) + 1; const pts = chain.map((c, i) => `${(i / (chain.length - 1)) * (W - 40) + 30},${H - 20 - ((c.iv - lo) / (hi - lo)) * (H - 40)}`).join(" "); return <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full"><polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth={2} className="fx-draw" pathLength={1} />{chain.map((c, i) => <g key={c.strike}><circle cx={(i / (chain.length - 1)) * (W - 40) + 30} cy={H - 20 - ((c.iv - lo) / (hi - lo)) * (H - 40)} r={3} fill={c.strike === atm ? "var(--accent)" : "currentColor"} />{i % 3 === 0 && <text x={(i / (chain.length - 1)) * (W - 40) + 30} y={H - 4} fontSize={9} textAnchor="middle" fill="currentColor" opacity={0.6}>{c.strike}</text>}</g>)}<text x={6} y={14} fontSize={10} fill="currentColor" opacity={0.7}>IV smile (%) · ATM {atmRow.iv}%</text></svg>; }
    if (view === "pain") return <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">{pain.map((p, i) => { const bw = (W - 40) / pain.length; const h = (p.loss / maxPainLoss) * (H - 40); return <g key={p.strike}><rect x={30 + i * bw + 1} y={H - 20 - h} width={bw - 2} height={h} fill={p.strike === mp ? "var(--accent)" : "rgba(127,127,127,0.45)"} className="fx-rise" style={{ transformOrigin: `0 ${H - 20}px`, animationDelay: `${i * 25}ms` }} />{i % 3 === 0 && <text x={30 + i * bw + bw / 2} y={H - 4} fontSize={9} textAnchor="middle" fill="currentColor" opacity={0.6}>{p.strike}</text>}</g>; })}<text x={6} y={14} fontSize={10} fill="currentColor" opacity={0.7}>Option writers&apos; total loss by expiry level · max pain {mp}</text></svg>;
    return <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">{rows.map((r, i) => { const bw = (W - 40) / rows.length; const hc = (r.ceOI / maxOI) * (H - 40), hp = (r.peOI / maxOI) * (H - 40); return <g key={r.strike}><rect x={30 + i * bw + 1} y={H - 20 - hc} width={bw / 2 - 1} height={hc} fill="rgba(226,74,74,0.75)" className="fx-rise" style={{ transformOrigin: `0 ${H - 20}px`, animationDelay: `${i * 25}ms` }} /><rect x={30 + i * bw + bw / 2} y={H - 20 - hp} width={bw / 2 - 1} height={hp} fill="rgba(63,184,114,0.75)" className="fx-rise" style={{ transformOrigin: `0 ${H - 20}px`, animationDelay: `${i * 25}ms` }} />{i % 3 === 0 && <text x={30 + i * bw + bw / 2} y={H - 4} fontSize={9} textAnchor="middle" fill="currentColor" opacity={0.6}>{r.strike}</text>}</g>; })}<text x={6} y={14} fontSize={10} fill="currentColor" opacity={0.7}>Open interest by strike · red CE · green PE</text></svg>;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.618fr_1fr]">
      <div className="space-y-4">
        <div className="glass p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select className="select !w-auto" value={sym} onChange={(e) => { setSym(e.target.value); setLegs([]); const nu = unders.find((x) => x.symbol === e.target.value); const ne = expiries.filter((x) => nu?.kind === "index" || x.kind === "monthly"); setExp(ne[0]?.date ?? ""); }}>{unders.map((x) => <option key={x.symbol} value={x.symbol}>{x.symbol}</option>)}</select>
            <div className="flex flex-wrap gap-1">{exps.map((e) => <button key={e.date} type="button" onClick={() => setExp(e.date)} className={clsx("badge !normal-case !tracking-normal", e.date === expSel?.date && "badge-accent")}>{e.label}</button>)}</div>
            <span className="ml-auto text-muted">Spot <b className="tnum text-text">{fmt(u.ltp)}</b> · lot {u.lot} · {days} day{days === 1 ? "" : "s"} to expiry</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-6">
            {[["PCR (OI)", pcr.toFixed(2), pcr > 1.2 ? "text-profit" : pcr < 0.8 ? "text-loss" : ""], ["Max pain", String(mp), ""], ["Resistance (CE OI)", String(res.strike), "text-loss"], ["Support (PE OI)", String(sup.strike), "text-profit"], ["ATM IV", `${atmRow.iv}%`, ""], ["Expected move", `±${fmt(straddle, 0)} (${((straddle / u.ltp) * 100).toFixed(1)}%)`, ""]].map(([k, v, c]) => <div key={k} className="rounded-lg border border-border p-2"><div className="text-muted">{k}</div><div className={clsx("tnum font-semibold", c)}>{v}</div></div>)}
          </div>
        </div>
        <div className="glass overflow-x-auto p-2">
          <table className="table text-xs"><thead><tr><th className="text-right">CE OI (Δ)</th><th className="text-right">CE IV</th><th className="text-right">CE Δ</th><th className="text-right">CE LTP</th><th className="text-center">Strike</th><th>PE LTP</th><th>PE Δ</th><th>PE IV</th><th>PE OI (Δ)</th></tr></thead>
            <tbody>{rows.map((r) => { const itmCe = r.strike < u.ltp; const isAtm = r.strike === atm; return (
              <tr key={r.strike} className={clsx(isAtm && "bg-accent/10")}>
                <td className={clsx("relative text-right tnum", itmCe && "bg-loss/5")}><span className="absolute inset-y-1 right-0 rounded-l bg-loss/25" style={{ width: `${(r.ceOI / maxOI) * 100}%` }} /><span className="relative">{lakh(r.ceOI)} <span className={r.dCe >= 0 ? "text-profit" : "text-loss"}>{r.dCe >= 0 ? "+" : ""}{lakh(r.dCe)}</span></span></td>
                <td className="text-right tnum">{r.iv}%</td><td className="text-right tnum">{r.ceGreeks.delta.toFixed(2)}</td>
                <td className="text-right"><button type="button" title="Buy CE" onClick={() => addLeg("CE", r.strike, 1, r.ce)} className="tnum hover:text-profit">{fmt(r.ce)}</button> <button type="button" title="Sell CE" onClick={() => addLeg("CE", r.strike, -1, r.ce)} className="text-[10px] text-muted hover:text-loss">S</button></td>
                <td className="text-center font-semibold">{r.strike}{isAtm && <span className="ml-1 badge !text-[9px]">ATM</span>}</td>
                <td><button type="button" title="Buy PE" onClick={() => addLeg("PE", r.strike, 1, r.pe)} className="tnum hover:text-profit">{fmt(r.pe)}</button> <button type="button" title="Sell PE" onClick={() => addLeg("PE", r.strike, -1, r.pe)} className="text-[10px] text-muted hover:text-loss">S</button></td>
                <td className="tnum">{r.peGreeks.delta.toFixed(2)}</td><td className="tnum">{r.iv}%</td>
                <td className={clsx("relative tnum", !itmCe && "bg-profit/5")}><span className="absolute inset-y-1 left-0 rounded-r bg-profit/25" style={{ width: `${(r.peOI / maxOI) * 100}%` }} /><span className="relative">{lakh(r.peOI)} <span className={r.dPe >= 0 ? "text-profit" : "text-loss"}>{r.dPe >= 0 ? "+" : ""}{lakh(r.dPe)}</span></span></td>
              </tr>); })}</tbody></table>
          <p className="p-2 text-[11px] text-muted">Click a premium to buy that leg, &quot;S&quot; to sell it. CE {buildup(rows.reduce((s, r) => s + r.dCe, 0), u.ltp - u.prev_close).toLowerCase()}, PE {buildup(rows.reduce((s, r) => s + r.dPe, 0), u.prev_close - u.ltp).toLowerCase()} versus the previous session (simulated).</p>
        </div>
      </div>
      <aside className="space-y-4">
        <div className="glass p-4"><div className="flex gap-1 text-xs">{(["oi", "iv", "pain"] as const).map((v) => <button key={v} type="button" onClick={() => setView(v)} className={clsx("badge !normal-case !tracking-normal", view === v && "badge-accent")}>{v === "oi" ? "OI by strike" : v === "iv" ? "IV smile" : "Max pain"}</button>)}</div><div className="mt-2">{chart()}</div></div>
        <div className="glass p-4">
          <div className="flex items-center justify-between"><div className="font-display font-semibold">Quick strategy</div>{legs.length > 0 && <button type="button" onClick={() => setLegs([])} className="text-xs text-muted hover:text-loss">Clear</button>}</div>
          {legs.length === 0 ? <p className="mt-1 text-sm text-muted">Pick legs from the chain. Payoff at expiry, breakevens and max profit/loss appear here; open the Options Lab for Greeks, scenarios and margin.</p> : (
            <div className="mt-2">
              <ul className="space-y-1 text-xs">{withLot.map((l) => <li key={l.type + l.strike} className="flex justify-between"><span>{l.qty > 0 ? "Buy" : "Sell"} {l.strike} {l.type} × {u.lot}</span><span className="tnum">₹{fmt(l.premium)}</span></li>)}</ul>
              <svg viewBox="0 0 320 120" className="mt-2 h-auto w-full">{(() => { const lo = Math.min(...curve.map((p) => p.pnl)), hi = Math.max(...curve.map((p) => p.pnl)); const span = hi - lo || 1; const y = (v: number) => 110 - ((v - lo) / span) * 100; const x = (i: number) => (i / (curve.length - 1)) * 300 + 10; const zero = y(0); return <><line x1={10} x2={310} y1={zero} y2={zero} stroke="currentColor" opacity={0.3} /><polyline points={curve.map((p, i) => `${x(i)},${y(p.pnl)}`).join(" ")} fill="none" stroke="var(--accent)" strokeWidth={2} /><line x1={160} x2={160} y1={10} y2={110} stroke="currentColor" opacity={0.2} strokeDasharray="3 3" /></>; })()}</svg>
              <div className="mt-2 grid grid-cols-2 gap-1 text-xs"><div className="text-muted">Net premium</div><div className={clsx("tnum text-right", net > 0 ? "text-loss" : "text-profit")}>{net > 0 ? "Debit" : "Credit"} ₹{fmt(Math.abs(net), 0)}</div><div className="text-muted">Max profit</div><div className="tnum text-right text-profit">{mpl && (mpl.maxProfit === Infinity ? "Unlimited" : `₹${fmt(mpl.maxProfit, 0)}`)}</div><div className="text-muted">Max loss</div><div className="tnum text-right text-loss">{mpl && (mpl.maxLoss === -Infinity ? "Unlimited" : `₹${fmt(Math.abs(mpl.maxLoss), 0)}`)}</div><div className="text-muted">Breakevens</div><div className="tnum text-right">{be.length ? be.map((b) => fmt(b, 0)).join(" · ") : "none in range"}</div></div>
            </div>)}
          <Link href="/tools/options-payoff-calculator" className="btn btn-ghost btn-sm mt-3 w-full">Open the Options Lab</Link>
        </div>
        <div className="glass p-4 text-xs text-muted"><div className="font-display text-sm font-semibold text-text">Reading the chain</div><ul className="mt-1 list-disc space-y-1 pl-4"><li>Highest call OI is where writers expect a ceiling; highest put OI a floor. They move.</li><li>Max pain is the expiry level at which option buyers lose the most in aggregate.</li><li>ATM straddle price is the market&apos;s expected move to expiry.</li><li>IV smile: far strikes price in fatter tails; puts usually carry a skew.</li></ul><Link href="/academy/tracks/derivatives/options-basics" className="mt-2 inline-block text-accent">Options lesson →</Link></div>
      </aside>
    </div>
  );
}
