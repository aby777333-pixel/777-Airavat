"use client";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { simulatedChain, maxPain, putCallRatio } from "@/lib/options";

type Idx = { symbol: string; ltp: number; prev_close: number };
type Expiry = { label: string; date: string; kind: "weekly" | "monthly" };

// Simulated option chain for index derivatives: OI, PCR, max pain, OI build-up classification and the expiry ladder.
export default function FoHub({ indices, expiries, nowMs }: { indices: Idx[]; expiries: Expiry[]; nowMs: number }) {
  const [sym, setSym] = useState(indices[0]?.symbol ?? "NIFTY 50");
  const [exp, setExp] = useState(expiries[0]?.date ?? "");
  const idx = indices.find((i) => i.symbol === sym) ?? indices[0];
  const days = Math.max(1, Math.round((new Date(exp).getTime() - nowMs) / 86400000));
  const chain = useMemo(() => (idx ? simulatedChain(idx.symbol, idx.ltp, days, 10) : []), [idx, days]);
  const rows = chain.map((c) => ({ strike: c.strike, ceLtp: c.ce, peLtp: c.pe, ceOI: c.ceOI, peOI: c.peOI, iv: c.iv, ceDelta: c.ceGreeks.delta, peDelta: c.peGreeks.delta }));
  const pcr = putCallRatio(rows); const mp = maxPain(rows);
  const atm = rows.length ? rows.reduce((b, r) => (Math.abs(r.strike - (idx?.ltp ?? 0)) < Math.abs(b.strike - (idx?.ltp ?? 0)) ? r : b), rows[0]) : undefined;
  const totalCe = rows.reduce((s, r) => s + r.ceOI, 0); const totalPe = rows.reduce((s, r) => s + r.peOI, 0);
  const resistance = [...rows].sort((a, b) => b.ceOI - a.ceOI)[0]; const support = [...rows].sort((a, b) => b.peOI - a.peOI)[0];
  const maxOI = Math.max(1, ...rows.map((r) => Math.max(r.ceOI, r.peOI)));
  const buildup = (chgPx: number, strike: number) => { const up = Math.round(strike / 50) % 2 === 0; return up ? (chgPx >= 0 ? "Long build-up" : "Short build-up") : chgPx >= 0 ? "Short covering" : "Long unwinding"; };
  return (
    <div className="space-y-5">
      <div className="glass flex flex-wrap items-end gap-3 p-4">
        <label className="text-sm">Underlying<select className="select mt-1" value={sym} onChange={(e) => setSym(e.target.value)}>{indices.map((i) => <option key={i.symbol}>{i.symbol}</option>)}</select></label>
        <label className="text-sm">Expiry<select className="select mt-1" value={exp} onChange={(e) => setExp(e.target.value)}>{expiries.map((e) => <option key={e.date} value={e.date}>{e.date} · {e.kind}</option>)}</select></label>
        <div className="ml-auto grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
          <div><div className="text-muted">Spot</div><div className="tnum font-semibold">{idx?.ltp.toFixed(2)}</div></div>
          <div><div className="text-muted">PCR (OI)</div><div className={clsx("tnum font-semibold", pcr > 1.2 ? "text-profit" : pcr < 0.8 ? "text-loss" : "")}>{pcr}</div></div>
          <div><div className="text-muted">Max pain</div><div className="tnum font-semibold">{mp}</div></div>
          <div><div className="text-muted">ATM IV</div><div className="tnum font-semibold">{atm ? `${atm.iv.toFixed(1)}%` : "—"}</div></div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass p-4"><div className="text-xs text-muted">Strongest resistance (call OI)</div><div className="tnum font-display text-xl">{resistance?.strike}</div><div className="text-xs text-faint">{resistance?.ceOI.toLocaleString("en-IN")} contracts</div></div>
        <div className="glass p-4"><div className="text-xs text-muted">Strongest support (put OI)</div><div className="tnum font-display text-xl">{support?.strike}</div><div className="text-xs text-faint">{support?.peOI.toLocaleString("en-IN")} contracts</div></div>
        <div className="glass p-4"><div className="text-xs text-muted">Total OI</div><div className="tnum font-display text-xl">{((totalCe + totalPe) / 1e5).toFixed(1)} L</div><div className="text-xs text-faint">calls {(totalCe / 1e5).toFixed(1)} L · puts {(totalPe / 1e5).toFixed(1)} L</div></div>
      </div>
      <div className="glass overflow-x-auto p-2">
        <table className="table text-xs"><thead><tr><th className="num">Call OI</th><th className="num">Call Δ</th><th className="num">Call LTP</th><th className="num">IV</th><th className="num">Strike</th><th className="num">Put LTP</th><th className="num">Put Δ</th><th className="num">Put OI</th><th>Build-up</th></tr></thead>
          <tbody>{rows.map((r) => { const isAtm = r.strike === atm?.strike; return (
            <tr key={r.strike} className={clsx(isAtm && "bg-accent/10")}>
              <td className="num relative"><span className="absolute inset-y-1 right-0 bg-loss/20" style={{ width: `${(r.ceOI / maxOI) * 100}%` }} /><span className="relative">{r.ceOI.toLocaleString("en-IN")}</span></td>
              <td className="num">{r.ceDelta.toFixed(2)}</td><td className="num">{r.ceLtp.toFixed(2)}</td><td className="num text-muted">{r.iv.toFixed(1)}%</td>
              <td className="num font-semibold">{r.strike}</td>
              <td className="num">{r.peLtp.toFixed(2)}</td><td className="num">{r.peDelta.toFixed(2)}</td>
              <td className="num relative"><span className="absolute inset-y-1 left-0 bg-profit/20" style={{ width: `${(r.peOI / maxOI) * 100}%` }} /><span className="relative">{r.peOI.toLocaleString("en-IN")}</span></td>
              <td className="text-muted">{buildup((idx?.ltp ?? 0) - (idx?.prev_close ?? 0), r.strike)}</td>
            </tr>); })}</tbody></table>
      </div>
    </div>
  );
}
