import Link from "next/link";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/format";
import { metadataFor, seoFor } from "@/lib/seo";
import { Badge, Notice, PageHeader, SimBadge } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/site/ContentPageView";

export const metadata = { ...metadataFor("/invest/mutual-funds") };
const GROUPS: [string, string[]][] = [["Equity", ["Large Cap", "Flexi Cap", "Mid Cap", "Small Cap", "ELSS", "Index"]], ["Debt", ["Liquid", "Short Duration", "Corporate Bond", "Gilt"]], ["Hybrid", ["Aggressive Hybrid", "Balanced Advantage"]], ["Commodity", ["Gold FoF"]]];

export default async function MutualFunds({ searchParams }: { searchParams: Promise<{ category?: string; sort?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("mutual_funds").select("*").order("ret_3y_pct", { ascending: false, nullsFirst: false });
  const all = data ?? [];
  const cat = sp.category && all.some((f) => f.category === sp.category) ? sp.category : "";
  let rows = cat ? all.filter((f) => f.category === cat) : all;
  if (sp.sort === "expense") rows = [...rows].sort((a, b) => Number(a.expense_ratio_pct) - Number(b.expense_ratio_pct));
  if (sp.sort === "aum") rows = [...rows].sort((a, b) => Number(b.aum_cr) - Number(a.aum_cr));
  if (sp.sort === "1y") rows = [...rows].sort((a, b) => Number(b.ret_1y_pct ?? -99) - Number(a.ret_1y_pct ?? -99));
  const catAvg = (c: string) => { const l = all.filter((f) => f.category === c); return l.length ? l.reduce((s, f) => s + Number(f.expense_ratio_pct), 0) / l.length : 0; };
  const r = (v: number | null) => (v === null ? "—" : `${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(1)}%`);
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/invest/mutual-funds", label: "Invest" }, { href: "#", label: "Mutual funds" }]} />
      <PageHero variant="calculators" intro={seoFor("/invest/mutual-funds").intro}><PageHeader eyebrow="Invest" title="Mutual funds and SIP" subtitle={<span className="inline-flex items-center gap-2">Direct plans · growth option · {all.length} sample schemes <SimBadge /></span>} action={<Link href="/tools/sip-calculator" className="btn btn-ghost btn-sm">SIP calculator</Link>} /></PageHero>
      <div className="flex flex-wrap gap-2 text-xs">
        <Link href="/invest/mutual-funds" className={clsx("badge", !cat && "badge-accent")}>All</Link>
        {GROUPS.map(([g, cats]) => cats.map((c) => <Link key={c} href={`/invest/mutual-funds?category=${encodeURIComponent(c)}`} className={clsx("badge", cat === c && "badge-accent")}>{g}: {c}</Link>))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">Sort by {[["3y", "3-year return"], ["1y", "1-year return"], ["expense", "lowest expense"], ["aum", "largest AUM"]].map(([k, l]) => <Link key={k} href={`/invest/mutual-funds?${cat ? `category=${encodeURIComponent(cat)}&` : ""}sort=${k}`} className={clsx("badge", (sp.sort ?? "3y") === k && "badge-accent")}>{l}</Link>)}</div>
      <div className="glass mt-4 overflow-x-auto p-2">
        <table className="table text-sm"><thead><tr><th>Scheme</th><th>Category</th><th className="num">NAV</th><th className="num">1y</th><th className="num">3y</th><th className="num">5y</th><th className="num">Expense</th><th className="num">AUM (₹ cr)</th><th>Risk</th><th className="num">Min SIP</th></tr></thead>
          <tbody>{rows.map((f) => <tr key={f.id}><td><Link href={`/invest/mutual-funds/${f.scheme_code}`} className="font-semibold hover:text-accent">{f.name}</Link><div className="text-xs text-muted">{f.amc}{f.lock_in ? ` · lock-in ${f.lock_in}` : ""}</div></td><td className="text-muted">{f.category}</td><td className="num">{Number(f.nav).toFixed(2)}</td><td className={clsx("num", Number(f.ret_1y_pct) >= 0 ? "text-profit" : "text-loss")}>{r(f.ret_1y_pct)}</td><td className={clsx("num", Number(f.ret_3y_pct) >= 0 ? "text-profit" : "text-loss")}>{r(f.ret_3y_pct)}</td><td className="num">{r(f.ret_5y_pct)}</td><td className="num">{Number(f.expense_ratio_pct).toFixed(2)}% <span className="text-xs text-faint">(cat {catAvg(f.category).toFixed(2)}%)</span></td><td className="num">{Number(f.aum_cr).toLocaleString("en-IN")}</td><td><Badge tone={f.riskometer.startsWith("Very") ? "bad" : f.riskometer === "High" ? "info" : "ok"}>{f.riskometer}</Badge></td><td className="num">{money(f.min_sip)}</td></tr>)}</tbody></table>
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        <div className="glass p-5"><div className="font-display font-semibold">Direct vs regular</div><p className="mt-2 text-sm text-muted">A regular plan pays the distributor from your money every year (often 0.5–1.5% more expense). Over 20 years that difference compounds into a large share of the final corpus. AIRAVAT lists direct plans only.</p></div>
        <div className="glass p-5"><div className="font-display font-semibold">ELSS and Section 80C</div><p className="mt-2 text-sm text-muted">ELSS schemes qualify for the ₹1.5 lakh 80C deduction under the old tax regime, with a 3-year lock-in per instalment. Gains above ₹1.25 lakh a year are taxed as long-term capital gains (illustrative, verify current rates).</p><Link href="/invest/mutual-funds?category=ELSS" className="mt-2 inline-block text-xs text-accent">See ELSS schemes →</Link></div>
        <div className="glass p-5"><div className="font-display font-semibold">How to read the table</div><p className="mt-2 text-sm text-muted">Returns are annualised for 3 and 5 years and absolute for 1 year. Expense ratio is compared with the category average. Riskometer is the scheme&apos;s own label. Past returns do not predict future returns.</p></div>
      </div>
      <div className="mt-5"><Notice tone="warn">SIMULATED SAMPLE schemes from fictional AMCs, with generated NAV history, for the sandbox. Transactions in mutual funds require an AMFI registration and an RTA or exchange platform integration, listed as blockers on the Market Atlas.</Notice></div>
    </div>
  );
}
