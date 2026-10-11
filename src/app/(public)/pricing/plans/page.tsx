import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, Notice, PageHeader } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/site/ContentPageView";

export const metadata = { title: "Brokerage plans: approved plans and eligibility", description: "AIRAVAT brokerage plans read live from RevenueOS: only compliance-approved plans are shown, with eligibility and the brokerage each applies by product.", keywords: ["brokerage plans", "trading plan comparison", "zero brokerage plan", "active trader plan"] };

export default async function Plans() {
  const supabase = await createClient();
  const { data: plans } = await supabase.from("pricing_plans").select("*").eq("status", "approved").order("id");
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/pricing", label: "Pricing" }, { href: "/pricing/plans", label: "Plans" }]} />
      <PageHero variant="pricing" intro="A brokerage plan changes only the broker fee lines; statutory and exchange levies are identical for everyone. Plans are versioned in RevenueOS and appear here only after approval, so this page never shows a tariff that is not actually applied by the ledger."><PageHeader eyebrow="Pricing" title="Brokerage plans" /></PageHero>
      <Notice tone="info">Plans are assigned by the broker with a recorded eligibility note. The STANDARD plan applies to every account by default.</Notice>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        {(plans ?? []).map((p) => (
          <div key={p.id} className="m-crystal p-6"><div className="flex items-center justify-between"><div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{p.name}</div><Badge tone="ok">approved</Badge></div><p className="mt-2 text-sm text-muted">{p.description}</p>
            <table className="table mt-4 text-sm"><tbody>{Object.entries(p.brokerage as Record<string, { pct: number; cap: number }>).map(([k, b]) => <tr key={k}><td>{k === "CNC" ? "Equity delivery" : k === "MIS" ? "Equity intraday" : k}</td><td className="num">{Number(b.pct) === 0 && Number(b.cap) === 0 ? "₹0" : `${b.pct}% or ₹${b.cap}, whichever is lower`}</td></tr>)}</tbody></table>
            {p.eligibility && <p className="mt-3 text-xs text-faint">Eligibility: {p.eligibility}</p>}<p className="mt-1 text-xs text-faint">Effective from {p.effective_from}</p></div>
        ))}
        {(plans ?? []).length === 0 && <p className="text-sm text-muted">No approved plans.</p>}
      </div>
      <div className="mt-6 flex gap-2"><Link href="/pricing/compare" className="btn btn-primary">Compare plans</Link><Link href="/pricing" className="btn btn-ghost">All charges</Link></div>
    </div>
  );
}
