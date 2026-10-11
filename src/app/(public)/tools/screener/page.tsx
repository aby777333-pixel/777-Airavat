import Link from "next/link";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/server";
import { metadataFor, seoFor } from "@/lib/seo";
import { Badge, Notice, PageHeader, SimBadge } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/site/ContentPageView";

export const metadata = { ...metadataFor("/tools/screener") };
export const dynamic = "force-dynamic";
type Row = { id: number; symbol: string; name: string; sector: string; ltp: number; chg_pct: number; mcap_cr: number; pe: number | null; pb: number | null; roe: number; roce: number; de: number | null; promoter: number; div_yield: number; profit_cagr_3y: number | null; sma50: number; sma200: number; above_sma50: boolean; above_sma200: boolean; rsi14: number; hi52: number; lo52: number; pct_from_hi52: number; breakout_52w: boolean; vol_ratio: number };
const PRESETS: Record<string, { label: string; q: Record<string, string>; blurb: string }> = {
  value: { label: "Value", q: { pe_max: "15", roe_min: "12", de_max: "1" }, blurb: "Cheap on earnings, decent return on equity, modest debt." },
  quality: { label: "Quality growth", q: { roe_min: "18", growth_min: "12", de_max: "0.5" }, blurb: "High ROE, growing profits, light balance sheet." },
  dividend: { label: "Dividend", q: { dy_min: "1.5", promoter_min: "40" }, blurb: "Yield with a committed promoter." },
  momentum: { label: "Momentum", q: { above50: "1", above200: "1", rsi_min: "55", rsi_max: "75" }, blurb: "Above both moving averages, strong but not overbought." },
  breakout: { label: "52-week breakout", q: { breakout: "1" }, blurb: "Trading at or above the 52-week high." },
  oversold: { label: "Oversold", q: { rsi_max: "35" }, blurb: "RSI below 35: potential mean reversion." },
  volume: { label: "Volume surge", q: { vol_min: "1.8" }, blurb: "Today's volume at least 1.8× the 20-day average." },
  promoter: { label: "Promoter heavy", q: { promoter_min: "60" }, blurb: "Promoters hold 60% or more." },
};

export default async function Screener({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const preset = sp.preset && PRESETS[sp.preset] ? PRESETS[sp.preset] : null;
  const q = { ...(preset?.q ?? {}), ...Object.fromEntries(Object.entries(sp).filter(([k, v]) => k !== "preset" && v)) } as Record<string, string>;
  const n = (k: string) => (q[k] !== undefined && q[k] !== "" ? Number(q[k]) : null);
  const supabase = await createClient();
  const { data } = await supabase.rpc("screener_metrics");
  const all = ((data as Row[] | null) ?? []);
  const rows = all.filter((r) => {
    if (n("pe_max") !== null && !(r.pe !== null && r.pe <= n("pe_max")!)) return false;
    if (n("pe_min") !== null && !(r.pe !== null && r.pe >= n("pe_min")!)) return false;
    if (n("roe_min") !== null && !(Number(r.roe) >= n("roe_min")!)) return false;
    if (n("de_max") !== null && !(r.de === null || Number(r.de) <= n("de_max")!)) return false;
    if (n("promoter_min") !== null && !(Number(r.promoter) >= n("promoter_min")!)) return false;
    if (n("growth_min") !== null && !(r.profit_cagr_3y !== null && Number(r.profit_cagr_3y) >= n("growth_min")!)) return false;
    if (n("dy_min") !== null && !(Number(r.div_yield) >= n("dy_min")!)) return false;
    if (n("rsi_min") !== null && !(Number(r.rsi14) >= n("rsi_min")!)) return false;
    if (n("rsi_max") !== null && !(Number(r.rsi14) <= n("rsi_max")!)) return false;
    if (n("vol_min") !== null && !(Number(r.vol_ratio) >= n("vol_min")!)) return false;
    if (n("mcap_min") !== null && !(Number(r.mcap_cr) >= n("mcap_min")!)) return false;
    if (q.above50 === "1" && !r.above_sma50) return false;
    if (q.above200 === "1" && !r.above_sma200) return false;
    if (q.breakout === "1" && !r.breakout_52w) return false;
    if (q.sector && r.sector !== q.sector) return false;
    return true;
  });
  const sectors = [...new Set(all.map((r) => r.sector))].sort();
  const f = (name: string, label: string) => <label key={name} className="block text-xs"><span className="text-muted">{label}</span><input name={name} type="number" step="any" defaultValue={q[name] ?? ""} className="input mt-1 !py-1 !text-xs" /></label>;
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/calculators", label: "Tools" }, { href: "/tools/screener", label: "Stock screener" }]} />
      <PageHero variant="research" intro={seoFor("/tools/screener").intro}><PageHeader eyebrow="Tools" title="Stock screener" subtitle={<span className="inline-flex items-center gap-2">Fundamental, technical and dividend filters on the sandbox universe <SimBadge /></span>} action={<Link href="/login?next=/app/scanners" className="btn btn-ghost btn-sm">Save screens in Scanner Matrix</Link>} /></PageHero>
      <div className="flex flex-wrap gap-2 text-xs">{Object.entries(PRESETS).map(([k, p]) => <Link key={k} href={`/tools/screener?preset=${k}`} className={clsx("badge !normal-case !tracking-normal", sp.preset === k && "badge-accent")} title={p.blurb}>{p.label}</Link>)}</div>
      <form className="glass mt-4 grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6">
        {f("pe_max", "P/E ≤")}{f("pe_min", "P/E ≥")}{f("roe_min", "ROE % ≥")}{f("de_max", "Debt/equity ≤")}{f("promoter_min", "Promoter % ≥")}{f("growth_min", "3y profit CAGR % ≥")}
        {f("dy_min", "Dividend yield % ≥")}{f("rsi_min", "RSI ≥")}{f("rsi_max", "RSI ≤")}{f("vol_min", "Volume ratio ≥")}{f("mcap_min", "Market cap ₹ cr ≥")}
        <label className="block text-xs"><span className="text-muted">Sector</span><select name="sector" defaultValue={q.sector ?? ""} className="select mt-1 !py-1 !text-xs"><option value="">Any</option>{sectors.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="above50" value="1" defaultChecked={q.above50 === "1"} /> Above 50-day SMA</label>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="above200" value="1" defaultChecked={q.above200 === "1"} /> Above 200-day SMA</label>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="breakout" value="1" defaultChecked={q.breakout === "1"} /> 52-week breakout</label>
        <div className="flex items-end gap-2 sm:col-span-3"><button className="btn btn-primary btn-sm">Run screen</button><Link href="/tools/screener" className="btn btn-ghost btn-sm">Clear</Link><span className="text-xs text-muted">{rows.length} of {all.length} stocks match</span></div>
      </form>
      <div className="glass mt-4 overflow-x-auto p-2">
        <table className="table text-xs"><thead><tr><th>Stock</th><th>Sector</th><th className="num">LTP</th><th className="num">Chg</th><th className="num">Mcap ₹cr</th><th className="num">P/E</th><th className="num">P/B</th><th className="num">ROE</th><th className="num">D/E</th><th className="num">Promoter</th><th className="num">Div yld</th><th className="num">Profit CAGR</th><th className="num">RSI</th><th>Trend</th><th className="num">From 52w hi</th><th className="num">Vol ×</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id}><td><Link href={`/markets/${r.symbol}`} className="font-semibold hover:text-accent">{r.symbol}</Link></td><td className="text-muted">{r.sector}</td><td className="num">{Number(r.ltp).toFixed(2)}</td><td className={clsx("num", Number(r.chg_pct) >= 0 ? "text-profit" : "text-loss")}>{Number(r.chg_pct).toFixed(2)}%</td><td className="num">{Number(r.mcap_cr).toLocaleString("en-IN")}</td><td className="num">{r.pe ?? "—"}</td><td className="num">{r.pb ?? "—"}</td><td className="num">{Number(r.roe).toFixed(1)}%</td><td className="num">{r.de ?? "n/a"}</td><td className="num">{Number(r.promoter).toFixed(1)}%</td><td className="num">{Number(r.div_yield).toFixed(2)}%</td><td className="num">{r.profit_cagr_3y ?? "—"}%</td><td className={clsx("num", Number(r.rsi14) >= 70 ? "text-loss" : Number(r.rsi14) <= 30 ? "text-profit" : "")}>{r.rsi14}</td><td>{r.above_sma50 && r.above_sma200 ? <Badge tone="ok">up</Badge> : !r.above_sma50 && !r.above_sma200 ? <Badge tone="bad">down</Badge> : <Badge tone="info">mixed</Badge>}{r.breakout_52w && <Badge tone="accent">52w</Badge>}</td><td className="num">{Number(r.pct_from_hi52).toFixed(1)}%</td><td className="num">{r.vol_ratio ?? "—"}</td></tr>)}{rows.length === 0 && <tr><td colSpan={16} className="text-muted">No stock matches these filters.</td></tr>}</tbody></table>
      </div>
      <div className="mt-5"><Notice tone="warn">Fundamentals are SIMULATED SAMPLE values and technicals come from simulated candles. The screener demonstrates the filters; licensed data replaces the inputs without changing the page. Not investment advice.</Notice></div>
    </div>
  );
}
