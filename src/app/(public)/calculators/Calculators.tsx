"use client";
import { useState } from "react";
import clsx from "clsx";
import { cagr, inflationAdjusted, lumpsumFutureValue, marginEstimate, positionSize, riskReward, roundTrip, sipFutureValue, type Product } from "@/lib/calculators";
import { SEGMENTS, estimateCharges, type SegmentKey, type Side } from "@/lib/charges-schedule";
import { money } from "@/lib/format";

const tabs = ["Brokerage", "All segments", "SIP", "Lumpsum", "CAGR", "Position size", "Risk / Reward", "Margin", "Inflation"] as const;
type Tab = (typeof tabs)[number];

function Field({ label, value, onChange, step = "any", min = 0 }: { label: string; value: number; onChange: (v: number) => void; step?: string; min?: number }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input tnum" type="number" inputMode="decimal" step={step} min={min} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return <div className={clsx("flex justify-between py-1.5 text-sm", strong ? "font-semibold" : "text-muted")}><span>{k}</span><span className="tnum">{v}</span></div>;
}

export default function Calculators() {
  const [tab, setTab] = useState<Tab>("Brokerage");
  // brokerage
  const [product, setProduct] = useState<Product>("CNC");
  const [qty, setQty] = useState(100); const [buy, setBuy] = useState(1000); const [sell, setSell] = useState(1010);
  // all segments
  const [segKey, setSegKey] = useState<SegmentKey>("equity_options"); const [segSide, setSegSide] = useState<Side>("BUY"); const [segValue, setSegValue] = useState(500000); const [segPremium, setSegPremium] = useState(25000); const [segExchange, setSegExchange] = useState("NSE"); const [segAgri, setSegAgri] = useState(false);
  // sip
  const [sipAmt, setSipAmt] = useState(5000); const [sipRate, setSipRate] = useState(12); const [sipYears, setSipYears] = useState(10);
  // lumpsum
  const [lsAmt, setLsAmt] = useState(100000); const [lsRate, setLsRate] = useState(12); const [lsYears, setLsYears] = useState(10);
  // cagr
  const [cStart, setCStart] = useState(100000); const [cEnd, setCEnd] = useState(250000); const [cYears, setCYears] = useState(5);
  // position size
  const [cap, setCap] = useState(500000); const [riskPct, setRiskPct] = useState(1); const [entry, setEntry] = useState(100); const [stop, setStop] = useState(95); const [target, setTarget] = useState(110);
  // margin
  const [mProduct, setMProduct] = useState<Product>("MIS"); const [mQty, setMQty] = useState(100); const [mPrice, setMPrice] = useState(1000);
  // inflation
  const [infAmt, setInfAmt] = useState(1000000); const [infRate, setInfRate] = useState(6); const [infYears, setInfYears] = useState(10);

  const rt = roundTrip(product, qty, buy, sell);
  const seg = SEGMENTS.find((x) => x.key === segKey)!;
  const isOpt = segKey.endsWith("_options");
  const est = estimateCharges(segKey, segSide, segValue, { exchange: segExchange, premium: isOpt ? segPremium : undefined, agri: segAgri });
  const sip = sipFutureValue(sipAmt, sipRate, sipYears);
  const ls = lumpsumFutureValue(lsAmt, lsRate, lsYears);
  const ps = positionSize(cap, riskPct, entry, stop);
  const rr = riskReward(entry, stop, target);
  const me = marginEstimate(mProduct, mQty, mPrice);

  return (
    <div className="glass p-5">
      <div className="flex flex-wrap gap-2" role="tablist">
        {tabs.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={clsx("btn btn-sm", tab === t ? "btn-primary" : "btn-ghost")}>{t}</button>
        ))}
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_1.618fr]">
        <div className="space-y-3">
          {tab === "Brokerage" && (<>
            <label className="block"><span className="label">Product</span>
              <select className="select" value={product} onChange={(e) => setProduct(e.target.value as Product)}><option value="CNC">Delivery (CNC)</option><option value="MIS">Intraday (MIS)</option></select></label>
            <Field label="Quantity" value={qty} onChange={setQty} step="1" />
            <Field label="Buy price (₹)" value={buy} onChange={setBuy} />
            <Field label="Sell price (₹)" value={sell} onChange={setSell} />
          </>)}
          {tab === "All segments" && (<>
            <label className="block"><span className="label">Segment</span>
              <select className="select" value={segKey} onChange={(e) => { const k = e.target.value as SegmentKey; setSegKey(k); setSegExchange(Object.keys(SEGMENTS.find((x) => x.key === k)!.txn)[0]); }}>{SEGMENTS.map((x) => <option key={x.key} value={x.key}>{x.group} · {x.name}</option>)}</select></label>
            <label className="block"><span className="label">Side</span><select className="select" value={segSide} onChange={(e) => setSegSide(e.target.value as Side)}><option>BUY</option><option>SELL</option></select></label>
            <label className="block"><span className="label">Exchange</span><select className="select" value={segExchange} onChange={(e) => setSegExchange(e.target.value)}>{Object.keys(seg.txn).map((ex) => <option key={ex}>{ex}</option>)}</select></label>
            <Field label={isOpt ? "Contract value (₹)" : "Turnover / contract value (₹)"} value={segValue} onChange={setSegValue} />
            {isOpt && <Field label="Premium value (₹)" value={segPremium} onChange={setSegPremium} />}
            {segKey === "commodity_futures" && <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={segAgri} onChange={(e) => setSegAgri(e.target.checked)} /> Agri commodity (SEBI ₹1 per crore)</label>}
          </>)}
          {tab === "SIP" && (<><Field label="Monthly investment (₹)" value={sipAmt} onChange={setSipAmt} /><Field label="Expected annual return (%)" value={sipRate} onChange={setSipRate} /><Field label="Years" value={sipYears} onChange={setSipYears} /></>)}
          {tab === "Lumpsum" && (<><Field label="Investment (₹)" value={lsAmt} onChange={setLsAmt} /><Field label="Expected annual return (%)" value={lsRate} onChange={setLsRate} /><Field label="Years" value={lsYears} onChange={setLsYears} /></>)}
          {tab === "CAGR" && (<><Field label="Starting value (₹)" value={cStart} onChange={setCStart} /><Field label="Ending value (₹)" value={cEnd} onChange={setCEnd} /><Field label="Years" value={cYears} onChange={setCYears} /></>)}
          {(tab === "Position size" || tab === "Risk / Reward") && (<>
            {tab === "Position size" && <><Field label="Capital (₹)" value={cap} onChange={setCap} /><Field label="Risk per trade (%)" value={riskPct} onChange={setRiskPct} /></>}
            <Field label="Entry price (₹)" value={entry} onChange={setEntry} /><Field label="Stop-loss (₹)" value={stop} onChange={setStop} />
            {tab === "Risk / Reward" && <Field label="Target (₹)" value={target} onChange={setTarget} />}
          </>)}
          {tab === "Margin" && (<>
            <label className="block"><span className="label">Product</span>
              <select className="select" value={mProduct} onChange={(e) => setMProduct(e.target.value as Product)}><option value="CNC">Delivery (CNC)</option><option value="MIS">Intraday (MIS)</option></select></label>
            <Field label="Quantity" value={mQty} onChange={setMQty} step="1" /><Field label="Price (₹)" value={mPrice} onChange={setMPrice} />
          </>)}
          {tab === "Inflation" && (<><Field label="Amount today (₹)" value={infAmt} onChange={setInfAmt} /><Field label="Inflation (%)" value={infRate} onChange={setInfRate} /><Field label="Years" value={infYears} onChange={setInfYears} /></>)}
        </div>
        <div className="rounded-xl border border-border bg-bg/40 p-4">
          {tab === "Brokerage" && (<>
            <Row k="Buy value" v={money(rt.buyValue)} /><Row k="Sell value" v={money(rt.sellValue)} />
            <Row k="Brokerage (both legs)" v={money(rt.buy.brokerage + rt.sell.brokerage)} />
            <Row k="STT" v={money(rt.buy.stt + rt.sell.stt)} /><Row k="Exchange transaction charges" v={money(rt.buy.exchange + rt.sell.exchange)} />
            <Row k="SEBI fee" v={money(rt.buy.sebi + rt.sell.sebi)} /><Row k="Stamp duty" v={money(rt.buy.stamp)} /><Row k="GST" v={money(rt.buy.gst + rt.sell.gst)} />
            <Row k="Total charges" v={money(rt.totalCharges)} strong />
            <Row k="Gross P&L" v={money(rt.gross)} /><Row k="Net P&L" v={money(rt.net)} strong />
            <Row k="Break-even move per share" v={money(rt.breakEvenMove)} />
            <p className="mt-3 text-xs text-faint">Formula: charges = brokerage + STT + exchange + SEBI + stamp + GST(brokerage+exchange+SEBI). Sandbox schedule; verify before live use.</p>
          </>)}
          {tab === "All segments" && (<>
            <Row k="Brokerage (one executed order)" v={money(est.brokerage)} />
            <Row k={seg.group === "Commodity" ? "CTT" : "STT"} v={money(est.stt)} /><Row k={`Transaction charges (${segExchange})`} v={money(est.exchange)} />
            <Row k="SEBI charges" v={money(est.sebi)} /><Row k="Stamp charges" v={money(est.stamp)} /><Row k="GST (18%)" v={money(est.gst)} />
            <Row k="Total charges for this order" v={money(est.total)} strong />
            <p className="mt-3 text-xs text-faint">Rates from the published schedule ({seg.name}). {est.notes.join(" ")} Options are charged on premium; IPFT contributions are not included.</p>
          </>)}
          {tab === "SIP" && (<><Row k="Total invested" v={money(sip.invested)} /><Row k="Estimated value" v={money(sip.value)} strong /><Row k="Estimated gain" v={money(sip.gain)} />
            <p className="mt-3 text-xs text-faint">FV = P × [((1+i)^n − 1) / i] × (1+i), i = annual rate / 12, n = months. Returns are assumptions, not promises.</p></>)}
          {tab === "Lumpsum" && (<><Row k="Invested" v={money(ls.invested)} /><Row k="Estimated value" v={money(ls.value)} strong /><Row k="Estimated gain" v={money(ls.gain)} />
            <p className="mt-3 text-xs text-faint">A = P × (1 + r)^t with annual compounding.</p></>)}
          {tab === "CAGR" && (<><Row k="CAGR" v={`${cagr(cStart, cEnd, cYears)}%`} strong /><p className="mt-3 text-xs text-faint">CAGR = (End / Start)^(1/years) − 1</p></>)}
          {tab === "Position size" && (<><Row k="Risk amount" v={money(ps.riskAmount)} /><Row k="Risk per share" v={money(ps.perShareRisk)} /><Row k="Suggested quantity" v={String(ps.qty)} strong /><Row k="Exposure" v={money(ps.exposure)} />
            <p className="mt-3 text-xs text-faint">qty = floor(capital × risk% ÷ |entry − stop|). Educational only.</p></>)}
          {tab === "Risk / Reward" && (<><Row k="Risk per share" v={money(rr.risk)} /><Row k="Reward per share" v={money(rr.reward)} /><Row k="Ratio" v={`1 : ${rr.ratio}`} strong /></>)}
          {tab === "Margin" && (<><Row k="Order value" v={money(me.value)} /><Row k="Estimated requirement" v={money(me.margin)} strong /><Row k="Leverage" v={`${me.leverage}x`} />
            <p className="mt-3 text-xs text-faint">Sandbox rule: CNC requires full value plus charges; MIS requires 20% margin. Real margins follow exchange SPAN/VaR and peak-margin rules.</p></>)}
          {tab === "Inflation" && (<><Row k="Purchasing power after period" v={money(inflationAdjusted(infAmt, infRate, infYears))} strong /><p className="mt-3 text-xs text-faint">PV = FV ÷ (1 + inflation)^years</p></>)}
        </div>
      </div>
    </div>
  );
}
