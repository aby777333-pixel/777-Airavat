import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/format";
import { Notice, PageHeader } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/site/ContentPageView";
import { estimateCharges } from "@/lib/charges-schedule";

export const metadata = { title: "Plan comparison: what each trade costs under every approved plan", description: "Side-by-side cost of typical trades under each approved AIRAVAT brokerage plan, including all statutory levies.", keywords: ["brokerage comparison", "plan comparison broker", "cost per trade comparison"] };

const samples = [["Delivery buy ₹50,000", "CNC", "BUY", 50000], ["Delivery sell ₹50,000", "CNC", "SELL", 50000], ["Intraday buy ₹1,00,000", "MIS", "BUY", 100000], ["Intraday sell ₹1,00,000", "MIS", "SELL", 100000], ["Intraday buy ₹10,000", "MIS", "BUY", 10000]] as const;

export default async function Compare() {
  const supabase = await createClient();
  const { data: plans } = await supabase.from("pricing_plans").select("*").eq("status", "approved").order("id");
  const cost = (plan: { brokerage: Record<string, { pct: number; cap: number }> }, product: "CNC" | "MIS", side: "BUY" | "SELL", value: number) => {
    const base = estimateCharges(product === "CNC" ? "equity_delivery" : "equity_intraday", side, value);
    const b = plan.brokerage[product]; const brokerage = b ? (Number(b.pct) === 0 ? 0 : Math.min(Math.round(value * Number(b.pct)) / 100, Number(b.cap) > 0 ? Number(b.cap) : Infinity)) : base.brokerage;
    const gst = Math.round((brokerage + base.exchange + base.sebi) * 18) / 100;
    return { brokerage, total: Math.round((brokerage + base.stt + base.exchange + base.sebi + base.stamp + gst) * 100) / 100 };
  };
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/pricing", label: "Pricing" }, { href: "/pricing/compare", label: "Compare" }]} />
      <PageHero variant="pricing" intro="Compare the all-in cost of typical trades under each approved plan. Statutory levies are the same in every column; only the brokerage line changes."><PageHeader eyebrow="Pricing" title="Plan comparison" /></PageHero>
      <Notice tone="info">Figures use the published schedule (NSE equity) and the plan&apos;s brokerage rule. Use the calculator for any other size.</Notice>
      <div className="glass mt-4 overflow-x-auto p-2"><table className="table text-sm"><thead><tr><th>Trade</th>{(plans ?? []).map((p) => <th key={p.id} className="num">{p.name}</th>)}</tr></thead>
        <tbody>{samples.map(([label, product, side, value]) => <tr key={label}><td className="font-medium">{label}</td>{(plans ?? []).map((p) => { const c = cost(p as never, product, side, value); return <td key={p.id} className="num">{money(c.total)}<div className="text-xs text-faint">brokerage {money(c.brokerage)}</div></td>; })}</tr>)}</tbody></table></div>
      <div className="mt-6 flex gap-2"><Link href="/tools/brokerage-calculator" className="btn btn-primary">Calculate any trade</Link><Link href="/pricing/plans" className="btn btn-ghost">Plan details</Link></div>
    </div>
  );
}
