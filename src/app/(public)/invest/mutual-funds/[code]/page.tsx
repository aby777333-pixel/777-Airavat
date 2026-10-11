import Link from "next/link";
import clsx from "clsx";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/format";
import { Badge, Notice, PageHeader, SimBadge } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/site/ContentPageView";
import SchemeSip from "./SchemeSip";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params; const supabase = await createClient();
  const { data } = await supabase.from("mutual_funds").select("name, category").eq("scheme_code", code).maybeSingle();
  return { title: data ? `${data.name}: NAV, returns, expense ratio, SIP calculator (sample)` : "Scheme", description: data ? `${data.name}, a ${data.category} direct plan: NAV history, 1/3/5-year returns, expense ratio versus category, riskometer and a SIP projection. Sample scheme in the AIRAVAT sandbox.` : "" };
}

export default async function Scheme({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data: f } = await supabase.from("mutual_funds").select("*").eq("scheme_code", code).maybeSingle();
  if (!f) notFound();
  const [{ data: nav }, { data: peers }] = await Promise.all([supabase.from("mf_nav_history").select("*").eq("scheme_id", f.id).order("nav_date"), supabase.from("mutual_funds").select("scheme_code, name, ret_3y_pct, expense_ratio_pct").eq("category", f.category).neq("id", f.id)]);
  const series = nav ?? []; const vals = series.map((n) => Number(n.nav)); const min = Math.min(...vals), max = Math.max(...vals);
  const r = (v: number | null) => (v === null ? "—" : `${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(2)}%`);
  const drawdown = (() => { let peak = -Infinity, dd = 0; for (const v of vals) { peak = Math.max(peak, v); dd = Math.min(dd, (v - peak) / peak); } return dd * 100; })();
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/invest/mutual-funds", label: "Mutual funds" }, { href: "#", label: f.name }]} />
      <PageHero variant="calculators" intro={`${f.name} is a ${f.category.toLowerCase()} scheme from ${f.amc}, benchmarked to ${f.benchmark}. Below: NAV history, returns over 1, 3 and 5 years, drawdown, cost versus category and a SIP projection using the scheme's own 3-year return.`}>
        <PageHeader eyebrow={`${f.asset_class} · ${f.category}`} title={f.name} subtitle={<span className="inline-flex flex-wrap items-center gap-3"><span className="tnum font-display text-2xl text-text">NAV {Number(f.nav).toFixed(4)}</span><span className="text-xs text-faint">as of {f.nav_date}</span><Badge tone={f.riskometer.startsWith("Very") ? "bad" : "info"}>{f.riskometer}</Badge><SimBadge /></span>} />
      </PageHero>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[["1-year return", r(f.ret_1y_pct)], ["3-year CAGR", r(f.ret_3y_pct)], ["5-year CAGR", r(f.ret_5y_pct)], ["Max drawdown (5y)", `${drawdown.toFixed(1)}%`], ["Expense ratio", `${Number(f.expense_ratio_pct).toFixed(2)}%`], ["AUM", `₹${Number(f.aum_cr).toLocaleString("en-IN")} cr`], ["Exit load", f.exit_load], ["Minimum SIP / lumpsum", `${money(f.min_sip)} / ${money(f.min_lumpsum)}`]].map(([k, v]) => <div key={k} className="glass p-4"><div className="text-xs text-muted">{k}</div><div className="tnum font-semibold">{v}</div></div>)}
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.618fr_1fr]">
        <div className="glass p-5">
          <div className="font-display font-semibold">NAV history (monthly, 5 years)</div>
          <svg viewBox="0 0 600 180" className="mt-3 h-48 w-full" aria-label="NAV chart"><polyline fill="none" stroke="var(--accent)" strokeWidth="2" points={vals.map((v, i) => `${(i / Math.max(1, vals.length - 1)) * 600},${170 - ((v - min) / Math.max(1e-6, max - min)) * 160}`).join(" ")} /></svg>
          <div className="flex justify-between text-[11px] text-faint"><span>{series[0]?.nav_date}</span><span>{series[series.length - 1]?.nav_date}</span></div>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm"><dt className="text-muted">Benchmark</dt><dd>{f.benchmark}</dd><dt className="text-muted">Fund manager</dt><dd>{f.fund_manager}</dd><dt className="text-muted">Plan / option</dt><dd>{f.plan} / {f.option}</dd><dt className="text-muted">Lock-in</dt><dd>{f.lock_in ?? "None"}</dd><dt className="text-muted">Scheme code</dt><dd className="font-mono text-xs">{f.scheme_code}</dd><dt className="text-muted">Source</dt><dd>{f.source}</dd></dl>
        </div>
        <div className="space-y-5">
          <SchemeSip ratePct={Number(f.ret_3y_pct ?? 10)} minSip={Number(f.min_sip)} />
          <div className="glass p-5"><div className="font-display font-semibold">Peers in {f.category}</div><ul className="mt-2 space-y-1 text-sm">{(peers ?? []).map((p) => <li key={p.scheme_code} className="flex justify-between gap-2"><Link href={`/invest/mutual-funds/${p.scheme_code}`} className="hover:text-accent">{p.name}</Link><span className={clsx("tnum", Number(p.ret_3y_pct) >= 0 ? "text-profit" : "text-loss")}>{r(p.ret_3y_pct)} · {Number(p.expense_ratio_pct).toFixed(2)}%</span></li>)}{(peers ?? []).length === 0 && <li className="text-muted">No peers in this category.</li>}</ul></div>
        </div>
      </div>
      <div className="mt-5"><Notice tone="warn">SIMULATED SAMPLE scheme with generated NAVs. Mutual fund investments are subject to market risks; read all scheme-related documents carefully. Transactions are not enabled in the sandbox.</Notice></div>
    </div>
  );
}
