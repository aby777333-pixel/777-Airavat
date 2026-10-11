import { createClient } from "@/lib/supabase/server";
import { metadataFor, seoFor } from "@/lib/seo";
import { Notice, PageHeader, SimBadge } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { MarketCrumbs } from "../_shared";

export const metadata = { ...metadataFor("/markets/economy") };
const ORDER = ["cpi_yoy", "wpi_yoy", "repo_rate", "gsec_10y", "usdinr", "gdp_yoy", "iip_yoy", "pmi_mfg", "brent"];
const EXPLAIN: Record<string, string> = { cpi_yoy: "Retail inflation; the RBI targets 4% with a 2–6% band. Higher prints push yields up and rate-sensitive stocks down.", wpi_yoy: "Wholesale inflation; leads producer margins and, with a lag, CPI.", repo_rate: "The rate at which the RBI lends to banks; sets the floor for borrowing costs across the economy.", gsec_10y: "Benchmark government bond yield; the risk-free reference for equity valuation and bank treasury books.", usdinr: "Rupee per dollar; a weaker rupee helps exporters (IT, pharma) and hurts importers (oil, electronics).", gdp_yoy: "Real output growth, quarterly; the broadest read on earnings potential.", iip_yoy: "Factory output growth; tracks capital goods, consumer durables and mining.", pmi_mfg: "Survey of purchasing managers; above 50 means expansion.", brent: "Crude oil in dollars; India imports most of its oil, so Brent drives the trade deficit, inflation and OMC margins." };

export default async function Economy() {
  const supabase = await createClient();
  const { data } = await supabase.from("macro_series").select("*").order("period", { ascending: true });
  const by = new Map<string, NonNullable<typeof data>>();
  (data ?? []).forEach((r) => by.set(r.series, [...(by.get(r.series) ?? []), r]));
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <MarketCrumbs label="Economy dashboard" />
      <PageHero variant="briefing" intro={seoFor("/markets/economy").intro}><PageHeader eyebrow="Macro" title="India economy dashboard" subtitle={<span className="inline-flex items-center gap-2">Indicators with a 12-period trend <SimBadge /></span>} /></PageHero>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ORDER.filter((k) => by.has(k)).map((k) => { const s = by.get(k)!; const last = s[s.length - 1]; const prev = s[s.length - 2]; const vals = s.map((x) => Number(x.value)); const min = Math.min(...vals), max = Math.max(...vals); const d = Number(last.value) - Number(prev?.value ?? last.value); return (
          <div key={k} className="glass p-5">
            <div className="text-xs text-muted">{last.label}</div>
            <div className="mt-1 flex items-baseline gap-2"><span className="tnum font-display text-2xl font-semibold">{Number(last.value).toFixed(k === "pmi_mfg" ? 1 : 2)}<span className="ml-1 text-sm font-normal text-muted">{last.unit}</span></span><span className={`tnum text-xs ${d >= 0 ? "text-profit" : "text-loss"}`}>{d >= 0 ? "+" : ""}{d.toFixed(2)} vs prior</span></div>
            <svg viewBox="0 0 240 60" className="mt-3 h-14 w-full" aria-hidden="true"><polyline fill="none" stroke="var(--accent)" strokeWidth="2" points={vals.map((v, i) => `${(i / Math.max(1, vals.length - 1)) * 240},${55 - ((v - min) / Math.max(1e-6, max - min)) * 48}`).join(" ")} /></svg>
            <div className="flex justify-between text-[11px] text-faint"><span>{s[0].period}</span><span>{last.period}</span></div>
            <p className="mt-2 text-xs text-muted">{EXPLAIN[k]}</p>
            <div className="mt-2 text-[11px] text-faint">Source: {last.source}</div>
          </div>); })}
      </div>
      <div className="mt-5"><Notice tone="warn">Indicative SIMULATED SAMPLE series for the sandbox. Official releases come from MOSPI, RBI, the Office of the Economic Adviser and S&amp;P Global; the feed replaces these rows without changing the page.</Notice></div>
    </div>
  );
}
