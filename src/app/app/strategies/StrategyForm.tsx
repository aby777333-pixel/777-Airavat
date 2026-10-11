"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveStrategy } from "../intel/actions";
import type { Rules } from "@/lib/backtest";

export default function StrategyForm({ symbols }: { symbols: string[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<Rules["type"]>("ema_cross");
  const [fast, setFast] = useState(20); const [slow, setSlow] = useState(50); const [lookback, setLookback] = useState(20);
  const [rsiP, setRsiP] = useState(14); const [rsiBuy, setRsiBuy] = useState(30); const [rsiSell, setRsiSell] = useState(60);
  const [stop, setStop] = useState<number | "">(5); const [target, setTarget] = useState<number | "">(""); const [hold, setHold] = useState<number | "">(60);
  const [universe, setUniverse] = useState<string[]>(symbols.slice(0, 5));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true); setMsg(null);
    const rules: Rules = { type, fast, slow, lookback, rsi_period: rsiP, rsi_buy: rsiBuy, rsi_sell: rsiSell, stop_pct: stop === "" ? null : stop, target_pct: target === "" ? null : target, max_hold_days: hold === "" ? null : hold, sizing_pct: 100 };
    const r = await saveStrategy({ name, rules, universe });
    setBusy(false);
    if (!r.ok) { setMsg({ ok: false, text: r.error ?? "Failed" }); return; }
    setMsg({ ok: true, text: "Saved." }); router.push(`/app/strategies/${r.data}`);
  }
  const toggle = (s: string) => setUniverse((u) => (u.includes(s) ? u.filter((x) => x !== s) : u.length < 12 ? [...u, s] : u));
  return (
    <div className="space-y-3 text-sm">
      <input className="input" placeholder="Strategy name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
      <label className="block"><span className="label">Rule type</span><select className="select" value={type} onChange={(e) => setType(e.target.value as Rules["type"])}><option value="ema_cross">EMA cross (fast above slow → long)</option><option value="breakout">Breakout (close above N-day high)</option><option value="rsi_reversion">RSI reversion (buy oversold, exit on recovery)</option></select></label>
      {type === "ema_cross" && <div className="grid grid-cols-2 gap-2"><label className="block"><span className="label">Fast EMA</span><input className="input tnum" type="number" min={2} max={100} value={fast} onChange={(e) => setFast(Number(e.target.value))} /></label><label className="block"><span className="label">Slow EMA</span><input className="input tnum" type="number" min={3} max={300} value={slow} onChange={(e) => setSlow(Number(e.target.value))} /></label></div>}
      {type === "breakout" && <label className="block"><span className="label">Lookback (days)</span><input className="input tnum" type="number" min={5} max={120} value={lookback} onChange={(e) => setLookback(Number(e.target.value))} /></label>}
      {type === "rsi_reversion" && <div className="grid grid-cols-3 gap-2"><label className="block"><span className="label">RSI period</span><input className="input tnum" type="number" min={5} max={30} value={rsiP} onChange={(e) => setRsiP(Number(e.target.value))} /></label><label className="block"><span className="label">Buy below</span><input className="input tnum" type="number" min={5} max={50} value={rsiBuy} onChange={(e) => setRsiBuy(Number(e.target.value))} /></label><label className="block"><span className="label">Exit above</span><input className="input tnum" type="number" min={50} max={95} value={rsiSell} onChange={(e) => setRsiSell(Number(e.target.value))} /></label></div>}
      <div className="grid grid-cols-3 gap-2">
        <label className="block"><span className="label">Stop %</span><input className="input tnum" type="number" step="0.5" value={stop} onChange={(e) => setStop(e.target.value === "" ? "" : Number(e.target.value))} /></label>
        <label className="block"><span className="label">Target %</span><input className="input tnum" type="number" step="0.5" value={target} onChange={(e) => setTarget(e.target.value === "" ? "" : Number(e.target.value))} /></label>
        <label className="block"><span className="label">Max hold days</span><input className="input tnum" type="number" value={hold} onChange={(e) => setHold(e.target.value === "" ? "" : Number(e.target.value))} /></label>
      </div>
      <div><span className="label">Universe ({universe.length}/12)</span><div className="mt-1 flex flex-wrap gap-1">{symbols.map((s) => <button type="button" key={s} onClick={() => toggle(s)} className={universe.includes(s) ? "badge badge-accent" : "badge"}>{s}</button>)}</div></div>
      <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={busy || name.trim().length < 2 || universe.length === 0}>{busy ? "Saving…" : "Save strategy"}</button>
      {msg && <p className={msg.ok ? "text-xs text-profit" : "text-xs text-loss"} role="status">{msg.text}</p>}
    </div>
  );
}
