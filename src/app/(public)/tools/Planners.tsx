"use client";
import { useState } from "react";
import clsx from "clsx";
import { money } from "@/lib/format";
import { TAX_RATES, equityCapitalGainsTax, futuresMargin, goalPlanner, harvestPlan, hraExemption, pledgeCollateral, retirementCorpus, taxSaverComparison } from "@/lib/planners";

export const PLANNER_TABS = ["Capital gains tax", "Gain harvesting", "Futures margin", "Pledge haircut", "80C: ELSS vs PPF vs NPS", "Retirement corpus", "Goal planner", "HRA exemption"] as const;
export type PlannerTab = (typeof PLANNER_TABS)[number];

function Field({ label, value, onChange, step = "any", min = 0 }: { label: string; value: number; onChange: (v: number) => void; step?: string; min?: number }) {
  return <label className="block"><span className="label">{label}</span><input className="input tnum" type="number" step={step} min={min} value={value} onChange={(e) => onChange(Number(e.target.value))} /></label>;
}
function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return <div className={clsx("flex justify-between gap-4 py-1.5 text-sm", strong ? "font-semibold" : "text-muted")}><span>{k}</span><span className="tnum text-right">{v}</span></div>;
}

export default function Planners({ initialTab = "Capital gains tax" }: { initialTab?: PlannerTab }) {
  const [tab, setTab] = useState<PlannerTab>(initialTab);
  const [stcg, setStcg] = useState(100000); const [ltcg, setLtcg] = useState(200000);
  const [unreal, setUnreal] = useState(300000); const [booked, setBooked] = useState(0);
  const [cv, setCv] = useState(1500000); const [spanPct, setSpanPct] = useState(8); const [expPct, setExpPct] = useState(2);
  const [mv, setMv] = useState(500000); const [hc, setHc] = useState(20); const [cash, setCash] = useState(200000);
  const [yearly, setYearly] = useState(150000); const [yrs80, setYrs80] = useState(15); const [elss, setElss] = useState(12); const [ppf, setPpf] = useState(7.1); const [nps, setNps] = useState(10);
  const [exp, setExp] = useState(60000); const [ytr, setYtr] = useState(25); const [yir, setYir] = useState(25); const [inf, setInf] = useState(6); const [pre, setPre] = useState(11); const [post, setPost] = useState(7); const [corpus0, setCorpus0] = useState(1000000);
  const [goal, setGoal] = useState(2500000); const [gy, setGy] = useState(12); const [ginf, setGinf] = useState(8); const [gret, setGret] = useState(12); const [gex, setGex] = useState(0);
  const [basic, setBasic] = useState(720000); const [hra, setHra] = useState(288000); const [rent, setRent] = useState(300000); const [metro, setMetro] = useState(true);
  const cg = equityCapitalGainsTax(stcg, ltcg); const hp = harvestPlan(unreal, booked); const fm = futuresMargin(cv, spanPct, expPct); const pc = pledgeCollateral(mv, hc, cash);
  const ts = taxSaverComparison(yearly, yrs80, elss, ppf, nps); const rc = retirementCorpus(exp, ytr, yir, inf, pre, post, corpus0); const gp = goalPlanner(goal, gy, ginf, gret, gex); const hx = hraExemption(basic, hra, rent, metro);
  return (
    <div className="glass p-5">
      <div className="mb-4 flex flex-wrap gap-1">{PLANNER_TABS.map((t) => <button key={t} type="button" onClick={() => setTab(t)} className={clsx("badge !normal-case !tracking-normal", tab === t && "badge-accent")}>{t}</button>)}</div>
      <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
        <div className="grid gap-3">
          {tab === "Capital gains tax" && <><Field label="Short-term gains this year (₹)" value={stcg} onChange={setStcg} /><Field label="Long-term gains this year (₹)" value={ltcg} onChange={setLtcg} /></>}
          {tab === "Gain harvesting" && <><Field label="Unrealised long-term gains (₹)" value={unreal} onChange={setUnreal} /><Field label="LTCG already booked this year (₹)" value={booked} onChange={setBooked} /></>}
          {tab === "Futures margin" && <><Field label="Contract value (₹)" value={cv} onChange={setCv} /><Field label="SPAN %" value={spanPct} onChange={setSpanPct} /><Field label="Exposure %" value={expPct} onChange={setExpPct} /></>}
          {tab === "Pledge haircut" && <><Field label="Market value of shares pledged (₹)" value={mv} onChange={setMv} /><Field label="Haircut %" value={hc} onChange={setHc} /><Field label="Cash available (₹)" value={cash} onChange={setCash} /></>}
          {tab === "80C: ELSS vs PPF vs NPS" && <><Field label="Yearly investment (₹)" value={yearly} onChange={setYearly} /><Field label="Years" value={yrs80} onChange={setYrs80} /><Field label="ELSS return % p.a." value={elss} onChange={setElss} /><Field label="PPF rate % p.a." value={ppf} onChange={setPpf} /><Field label="NPS return % p.a." value={nps} onChange={setNps} /></>}
          {tab === "Retirement corpus" && <><Field label="Monthly expense today (₹)" value={exp} onChange={setExp} /><Field label="Years to retirement" value={ytr} onChange={setYtr} /><Field label="Years in retirement" value={yir} onChange={setYir} /><Field label="Inflation %" value={inf} onChange={setInf} /><Field label="Return before retirement %" value={pre} onChange={setPre} /><Field label="Return after retirement %" value={post} onChange={setPost} /><Field label="Existing corpus (₹)" value={corpus0} onChange={setCorpus0} /></>}
          {tab === "Goal planner" && <><Field label="Goal cost today (₹)" value={goal} onChange={setGoal} /><Field label="Years to goal" value={gy} onChange={setGy} /><Field label="Cost inflation %" value={ginf} onChange={setGinf} /><Field label="Expected return %" value={gret} onChange={setGret} /><Field label="Already saved (₹)" value={gex} onChange={setGex} /></>}
          {tab === "HRA exemption" && <><Field label="Basic salary (annual, ₹)" value={basic} onChange={setBasic} /><Field label="HRA received (annual, ₹)" value={hra} onChange={setHra} /><Field label="Rent paid (annual, ₹)" value={rent} onChange={setRent} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={metro} onChange={(e) => setMetro(e.target.checked)} /> Metro city (Delhi, Mumbai, Kolkata, Chennai)</label></>}
        </div>
        <div>
          {tab === "Capital gains tax" && <><Row k={`STCG tax @ ${TAX_RATES.stcgEquityPct}%`} v={money(cg.stTax)} /><Row k={`LTCG exemption used (₹${TAX_RATES.ltcgExemption.toLocaleString("en-IN")})`} v={money(cg.exemptionUsed)} /><Row k="Taxable LTCG" v={money(cg.taxableLtcg)} /><Row k={`LTCG tax @ ${TAX_RATES.ltcgEquityPct}%`} v={money(cg.ltTax)} /><Row k="Total tax" v={money(cg.total)} strong /><p className="mt-3 text-xs text-faint">{TAX_RATES.note} Losses set off per the Act are not modelled.</p></>}
          {tab === "Gain harvesting" && <><Row k="Exemption room left this year" v={money(hp.exemptionRoom)} /><Row k="Book now (sell and rebuy)" v={money(hp.bookNow)} strong /><Row k="Tax saved versus booking later" v={money(hp.taxSaved)} /><Row k="Unrealised gain left" v={money(hp.remainingUnrealised)} /><p className="mt-3 text-xs text-faint">Rebuying resets the holding period; charges on the sell and buy apply. Only for long-term holdings in listed equity or equity funds.</p></>}
          {tab === "Futures margin" && <><Row k="SPAN margin" v={money(fm.span)} /><Row k="Exposure margin" v={money(fm.exposure)} /><Row k="Total upfront margin" v={money(fm.total)} strong /><Row k="Effective leverage" v={`${fm.leverage}×`} /><p className="mt-3 text-xs text-faint">Exchanges publish SPAN risk arrays several times a day; margins rise with volatility and around events. Peak margin is collected upfront.</p></>}
          {tab === "Pledge haircut" && <><Row k="Collateral value after haircut" v={money(pc.collateral)} /><Row k="Haircut" v={money(pc.haircut)} /><Row k="Margin you can use (cash rule)" v={money(pc.usableWithCashRule)} strong /><p className="mt-3 text-xs text-faint">{pc.note}</p></>}
          {tab === "80C: ELSS vs PPF vs NPS" && <><table className="table text-sm"><thead><tr><th>Option</th><th>Lock-in</th><th className="num">Value after {yrs80}y</th><th>Tax on exit</th></tr></thead><tbody>{ts.map((t) => <tr key={t.name}><td className="font-semibold">{t.name}<div className="text-xs text-faint">{t.risk}</div></td><td className="text-xs text-muted">{t.lockIn}</td><td className="num">{money(t.value)}</td><td className="text-xs text-muted">{t.taxOnExit}</td></tr>)}</tbody></table><p className="mt-3 text-xs text-faint">Section 80C deduction up to ₹1.5 lakh applies under the old regime only. Returns are assumptions.</p></>}
          {tab === "Retirement corpus" && <><Row k="Monthly expense at retirement" v={money(rc.expenseAtRetirement)} /><Row k="Corpus needed" v={money(rc.corpus)} strong /><Row k="Existing corpus grows to" v={money(rc.corpusFromExisting)} /><Row k="Gap" v={money(rc.gap)} /><Row k="Monthly SIP to close the gap" v={money(rc.monthlySip)} strong /><p className="mt-3 text-xs text-faint">Corpus funds an inflation-indexed monthly withdrawal for the retirement years at the post-retirement real return.</p></>}
          {tab === "Goal planner" && <><Row k="Goal cost at the time" v={money(gp.target)} strong /><Row k="Existing savings grow to" v={money(gp.fromExisting)} /><Row k="Gap" v={money(gp.gap)} /><Row k="Monthly SIP needed" v={money(gp.monthlySip)} strong /></>}
          {tab === "HRA exemption" && <><Row k="Actual HRA received" v={money(hx.components.actualHra)} /><Row k="Rent paid minus 10% of basic" v={money(hx.components.rentMinus10pct)} /><Row k={`${metro ? "50" : "40"}% of basic`} v={money(hx.components.pctOfBasic)} /><Row k="Exempt HRA (least of the three)" v={money(hx.exempt)} strong /><Row k="Taxable HRA" v={money(hx.taxable)} /><p className="mt-3 text-xs text-faint">Old regime only; rent above ₹1 lakh a year needs the landlord&apos;s PAN.</p></>}
        </div>
      </div>
    </div>
  );
}
