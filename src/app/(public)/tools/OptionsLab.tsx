"use client";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { bsPrice, breakevens, greeks, marginEstimate, maxPain, maxProfitLoss, monthlyExpiries, netPremium, payoffCurve, putCallRatio, simulatedChain, weeklyExpiries, type Leg } from "@/lib/options";
import { money, price } from "@/lib/format";

const UNDERLYINGS = [{ symbol: "NIFTY 50", lot: 50 }, { symbol: "NIFTY BANK", lot: 15 }, { symbol: "RELIANCE", lot: 250 }, { symbol: "TCS", lot: 175 }, { symbol: "HDFCBANK", lot: 550 }];
const PRESETS: Record<string, (atm: number, st: number, chain: ReturnType<typeof simulatedChain>) => Leg[]> = {
  "Long call": (atm, st, c) => [{ type: "CE", strike: atm, qty: 1, premium: c.find((x) => x.strike === atm)!.ce }],
  "Bull call spread": (atm, st, c) => [{ type: "CE", strike: atm, qty: 1, premium: c.find((x) => x.strike === atm)!.ce }, { type: "CE", strike: atm + 2 * st, qty: -1, premium: c.find((x) => x.strike === atm + 2 * st)!.ce }],
  "Short straddle": (atm, st, c) => [{ type: "CE", strike: atm, qty: -1, premium: c.find((x) => x.strike === atm)!.ce }, { type: "PE", strike: atm, qty: -1, premium: c.find((x) => x.strike === atm)!.pe }],
  "Long strangle": (atm, st, c) => [{ type: "CE", strike: atm + 2 * st, qty: 1, premium: c.find((x) => x.strike === atm + 2 * st)!.ce }, { type: "PE", strike: atm - 2 * st, qty: 1, premium: c.find((x) => x.strike === atm - 2 * st)!.pe }],
  "Iron condor": (atm, st, c) => [{ type: "PE", strike: atm - 4 * st, qty: 1, premium: c.find((x) => x.strike === atm - 4 * st)!.pe }, { type: "PE", strike: atm - 2 * st, qty: -1, premium: c.find((x) => x.strike === atm - 2 * st)!.pe }, { type: "CE", strike: atm + 2 * st, qty: -1, premium: c.find((x) => x.strike === atm + 2 * st)!.ce }, { type: "CE", strike: atm + 4 * st, qty: 1, premium: c.find((x) => x.strike === atm + 4 * st)!.ce }],
  "Covered call": (atm, st, c) => [{ type: "FUT", strike: atm, qty: 1, premium: 0 }, { type: "CE", strike: atm + 2 * st, qty: -1, premium: c.find((x) => x.strike === atm + 2 * st)!.ce }],
};

// Options strategy builder on a simulated chain. Educational: no orders, assumptions disclosed.
export default function OptionsLab({ spots, today }: { spots: Record<string, number>; today: string }) {
  const now = useMemo(() => new Date(today), [today]);
  const [sym, setSym] = useState("NIFTY 50");
  const [days, setDays] = useState(7);
  const lot = UNDERLYINGS.find((u) => u.symbol === sym)?.lot ?? 1;
  const spot = spots[sym] ?? 22000;
  const chain = useMemo(() => simulatedChain(sym, spot, days), [sym, spot, days]);
  const atm = chain[Math.floor(chain.length / 2)].strike; const st = chain[1].strike - chain[0].strike;
  const [legs, setLegs] = useState<Leg[]>(() => PRESETS["Bull call spread"](atm, st, chain).map((l) => ({ ...l, lot })));
  const [scenSpot, setScenSpot] = useState(0); const [scenIv, setScenIv] = useState(0); const [scenDays, setScenDays] = useState(0);
  const withLot = legs.map((l) => ({ ...l, lot }));
  const curve = payoffCurve(withLot, spot, 0.12);
  const be = breakevens(withLot, spot); const mpl = maxProfitLoss(withLot, spot); const prem = netPremium(withLot);
  const T = Math.max(days, 1) / 365;
  const net = withLot.reduce((acc, l) => { if (l.type === "FUT") return { ...acc, delta: acc.delta + l.qty * lot }; const g = greeks(l.type, spot, l.strike, T, (l.iv ?? chain.find((c) => c.strike === l.strike)?.iv ?? 15) / 100); return { delta: acc.delta + g.delta * l.qty * lot, gamma: acc.gamma + g.gamma * l.qty * lot, theta: acc.theta + g.theta * l.qty * lot, vega: acc.vega + g.vega * l.qty * lot }; }, { delta: 0, gamma: 0, theta: 0, vega: 0 });
  const avgIv = chain[Math.floor(chain.length / 2)].iv;
  const margin = marginEstimate(withLot, spot, days, avgIv);
  const scen = (() => { const S = spot * (1 + scenSpot / 100); const Tn = Math.max(days - scenDays, 0) / 365; return withLot.reduce((s, l) => { if (l.type === "FUT") return s + l.qty * lot * (S - l.strike); const iv = Math.max(0.05, ((l.iv ?? chain.find((c) => c.strike === l.strike)?.iv ?? 15) + scenIv) / 100); const px = Tn <= 0 ? Math.max(l.type === "CE" ? S - l.strike : l.strike - S, 0) : bsPrice(l.type as "CE", S, l.strike, Tn, iv); return s + l.qty * lot * (px - l.premium); }, 0); })();
  const W = 640, H = 240; const xs = curve.map((c) => c.S); const ys = curve.map((c) => c.pnl); const minY = Math.min(...ys, 0), maxY = Math.max(...ys, 0);
  const sx = (x: number) => ((x - xs[0]) / (xs[xs.length - 1] - xs[0])) * W; const sy = (y: number) => H - ((y - minY) / (maxY - minY || 1)) * H;
  const path = curve.map((c, i) => `${i ? "L" : "M"}${sx(c.S).toFixed(1)},${sy(c.pnl).toFixed(1)}`).join(" ");
  const mp = maxPain(chain), pcr = putCallRatio(chain);
  const upd = (i: number, patch: Partial<Leg>) => setLegs((x) => x.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.618fr]">
      <div className="space-y-4">
        <div className="glass p-4 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <label className="block"><span className="label">Underlying (simulated)</span><select className="select" value={sym} onChange={(e) => { setSym(e.target.value); setLegs([]); }}>{UNDERLYINGS.map((u) => <option key={u.symbol}>{u.symbol}</option>)}</select></label>
            <label className="block"><span className="label">Days to expiry</span><input className="input tnum" type="number" min={1} max={90} value={days} onChange={(e) => setDays(Math.max(1, Number(e.target.value)))} /></label>
          </div>
          <div className="mt-2 text-xs text-muted">Spot {price(spot)} · lot {lot} · ATM {atm} · PCR {pcr} · max pain {mp} · ATM IV {avgIv}%</div>
          <div className="mt-2 flex flex-wrap gap-1">{Object.keys(PRESETS).map((k) => <button key={k} type="button" className="btn btn-ghost btn-sm" onClick={() => setLegs(PRESETS[k](atm, st, chain).map((l) => ({ ...l, lot })))}>{k}</button>)}</div>
        </div>
        <div className="glass p-4 text-sm">
          <div className="mb-2 font-display font-semibold">Legs</div>
          {legs.map((l, i) => (
            <div key={i} className="mb-1 grid grid-cols-[auto_1fr_1fr_1fr_auto] items-center gap-1">
              <select className="select w-auto" value={l.type} onChange={(e) => upd(i, { type: e.target.value as "CE", premium: e.target.value === "FUT" ? 0 : (chain.find((c) => c.strike === l.strike)?.[e.target.value === "CE" ? "ce" : "pe"] ?? l.premium) })}><option>CE</option><option>PE</option><option>FUT</option></select>
              <select className="select" value={l.strike} onChange={(e) => { const k = Number(e.target.value); const row = chain.find((c) => c.strike === k); upd(i, { strike: k, premium: l.type === "FUT" ? 0 : (row ? (l.type === "CE" ? row.ce : row.pe) : l.premium) }); }}>{chain.map((c) => <option key={c.strike} value={c.strike}>{c.strike}</option>)}</select>
              <input className="input tnum" type="number" value={l.qty} onChange={(e) => upd(i, { qty: Number(e.target.value) })} title="lots (+ long / − short)" />
              <input className="input tnum" type="number" step={0.05} value={l.premium} onChange={(e) => upd(i, { premium: Number(e.target.value) })} title="premium" disabled={l.type === "FUT"} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLegs((x) => x.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" disabled={legs.length >= 6} onClick={() => setLegs((x) => [...x, { type: "CE", strike: atm, qty: 1, premium: chain.find((c) => c.strike === atm)!.ce, lot }])}>+ Leg</button>
          <div className="mt-2 text-xs text-muted">Qty in lots: positive buys, negative sells. Premiums default to model prices from the simulated chain and can be edited.</div>
        </div>
        <div className="glass p-4 text-sm">
          <div className="mb-2 font-display font-semibold">Scenario</div>
          <label className="block text-xs">Spot {scenSpot >= 0 ? "+" : ""}{scenSpot}% <input type="range" min={-10} max={10} step={0.5} value={scenSpot} onChange={(e) => setScenSpot(Number(e.target.value))} className="w-full" /></label>
          <label className="block text-xs">IV {scenIv >= 0 ? "+" : ""}{scenIv} pts <input type="range" min={-10} max={10} step={1} value={scenIv} onChange={(e) => setScenIv(Number(e.target.value))} className="w-full" /></label>
          <label className="block text-xs">Days passed {scenDays} <input type="range" min={0} max={days} step={1} value={scenDays} onChange={(e) => setScenDays(Number(e.target.value))} className="w-full" /></label>
          <div className={clsx("tnum mt-1 font-semibold", scen >= 0 ? "text-profit" : "text-loss")}>Mark-to-model P&L: {money(scen)}</div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="glass p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm"><span className="font-display font-semibold">Payoff at expiry</span><span className="text-xs text-muted">net premium {prem >= 0 ? `debit ${money(prem)}` : `credit ${money(-prem)}`}</span></div>
          <svg viewBox={`0 0 ${W} ${H}`} className="h-60 w-full" role="img" aria-label="Payoff diagram">
            <line x1="0" x2={W} y1={sy(0)} y2={sy(0)} stroke="var(--text-faint)" strokeDasharray="4 4" />
            <line x1={sx(spot)} x2={sx(spot)} y1="0" y2={H} stroke="var(--accent)" strokeDasharray="2 4" />
            <path d={`${path} L${W},${sy(0)} L0,${sy(0)} Z`} fill="rgba(var(--glow),0.12)" />
            <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" />
            {be.map((b) => <circle key={b} cx={sx(b)} cy={sy(0)} r="4" fill="var(--warn)" />)}
          </svg>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div><div className="text-muted">Breakevens</div><div className="tnum">{be.length ? be.map((b) => price(b)).join(" / ") : "—"}</div></div>
            <div><div className="text-muted">Max profit</div><div className="tnum text-profit">{mpl.maxProfit === Infinity ? "Unlimited" : money(mpl.maxProfit)}</div></div>
            <div><div className="text-muted">Max loss</div><div className="tnum text-loss">{mpl.maxLoss === -Infinity ? "Unlimited" : money(mpl.maxLoss)}</div></div>
            <div><div className="text-muted">Margin est.</div><div className="tnum">{money(margin.total)}</div></div>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 text-xs"><div><div className="text-muted">Delta</div><div className="tnum">{net.delta.toFixed(1)}</div></div><div><div className="text-muted">Gamma</div><div className="tnum">{net.gamma.toFixed(3)}</div></div><div><div className="text-muted">Theta / day</div><div className="tnum">{money(net.theta)}</div></div><div><div className="text-muted">Vega / 1%</div><div className="tnum">{money(net.vega)}</div></div></div>
          <p className="mt-3 text-xs text-faint">Assumptions: Black-Scholes, European exercise, risk-free 6.5%, simulated spot and volatility smile, no dividends, no liquidity or slippage. {margin.note} Educational; nothing here places an order.</p>
        </div>
        <div className="glass overflow-x-auto p-2">
          <div className="px-2 pb-1 text-xs text-muted">Simulated option chain · expiries: weekly {weeklyExpiries(now, 3).map((d) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })).join(", ")} · monthly {monthlyExpiries(now, 2).map((d) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })).join(", ")}</div>
          <table className="table text-xs"><thead><tr><th className="num">CE OI</th><th className="num">CE Δ</th><th className="num">CE</th><th>Strike</th><th className="num">PE</th><th className="num">PE Δ</th><th className="num">PE OI</th><th className="num">IV</th></tr></thead>
            <tbody>{chain.map((c) => <tr key={c.strike} className={clsx(c.strike === atm && "bg-accent/10")}><td className="num">{(c.ceOI / 1000).toFixed(0)}k</td><td className="num">{c.ceGreeks.delta.toFixed(2)}</td><td className="num">{price(c.ce)}</td><td className="text-center font-semibold">{c.strike}</td><td className="num">{price(c.pe)}</td><td className="num">{c.peGreeks.delta.toFixed(2)}</td><td className="num">{(c.peOI / 1000).toFixed(0)}k</td><td className="num">{c.iv}%</td></tr>)}</tbody></table>
        </div>
      </div>
    </div>
  );
}
