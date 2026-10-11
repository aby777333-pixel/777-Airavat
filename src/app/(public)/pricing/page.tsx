import Link from "next/link";
import { PageHeader, Notice, Badge } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/format";
import { isoAgo } from "@/lib/time";

export const metadata = { title: "Pricing" };

type Fee = { id: number; fee_code: string; version: number; name: string; description: string | null; classification: string; product: string | null; side: string | null; calc_method: string; rate: number; cap: number | null; min_amount: number | null; gst_applicable: boolean; authority: string | null; source_url: string | null; effective_from: string; status: string };
type Plan = { id: number; code: string; name: string; description: string | null; brokerage: Record<string, { pct: number; cap: number }>; eligibility: string | null };
type Sub = { id: number; code: string; name: string; description: string | null; price_month: number; features: string[] };

function rateLabel(f: Fee) {
  if (f.calc_method === "FLAT") return `${money(f.rate)} flat`;
  if (f.calc_method === "PCT_CAPPED") return `${f.rate}% capped at ${money(f.cap ?? 0)}`;
  if (f.calc_method === "PCT_OF_BASE") return `${f.rate}% of taxable charges`;
  return `${f.rate}%`;
}

export default async function Pricing() {
  const supabase = await createClient();
  const today = isoAgo(0).slice(0, 10);
  const [{ data: schedules }, { data: fees }, { data: plans }, { data: subs }] = await Promise.all([
    supabase.from("charge_schedules").select("*").order("product"),
    supabase.from("fee_definitions").select("*").eq("status", "approved").lte("effective_from", today).or(`effective_to.is.null,effective_to.gte.${today}`).order("fee_code").order("version", { ascending: false }),
    supabase.from("pricing_plans").select("*").eq("status", "approved").order("id"),
    supabase.from("subscription_plans").select("*").eq("status", "approved").order("id"),
  ]);
  // Latest approved version per fee code.
  const latest = new Map<string, Fee>();
  for (const f of (fees ?? []) as Fee[]) if (!latest.has(f.fee_code)) latest.set(f.fee_code, f);
  const catalogue = [...latest.values()];
  const broker = catalogue.filter((f) => f.classification === "broker_fee");
  const statutory = catalogue.filter((f) => f.classification !== "broker_fee");
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <PageHeader eyebrow="Pricing" title="Transparent charges, nothing hidden" subtitle="The sandbox pricing below is exactly what the simulated ledger applies to every trade, read live from the versioned fee catalogue. Statutory levies are illustrative and are re-verified against official notifications before any live use." />
      <Notice tone="warn">This is a sandbox schedule. AIRAVAT is not yet a registered broker and does not charge real money.</Notice>

      <h2 className="font-display mt-10 text-2xl font-bold">Plans</h2>
      <p className="mt-1 text-sm text-muted">Only compliance-approved plans are shown. Plans change broker fees only; statutory levies are identical for everyone.</p>
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        {((plans ?? []) as Plan[]).map((p) => (
          <div key={p.id} className="m-crystal p-6">
            <div className="flex items-center justify-between"><div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{p.name}</div><Badge tone="ok">approved</Badge></div>
            <p className="mt-2 text-sm text-muted">{p.description}</p>
            <table className="table mt-4 text-sm"><tbody>
              {Object.entries(p.brokerage).map(([prod, b]) => <tr key={prod}><td>{prod === "CNC" ? "Equity delivery (CNC)" : prod === "MIS" ? "Equity intraday (MIS)" : prod}</td><td className="num">{Number(b.pct) === 0 && Number(b.cap) === 0 ? "₹0" : `${b.pct}% or ₹${b.cap}, whichever is lower`}</td></tr>)}
            </tbody></table>
            {p.eligibility && <p className="mt-3 text-xs text-faint">Eligibility: {p.eligibility}</p>}
          </div>
        ))}
        {(plans ?? []).length === 0 && (schedules ?? []).map((s) => (
          <div key={s.id} className="glass p-6"><div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{s.product === "CNC" ? "Equity delivery (CNC)" : "Equity intraday (MIS)"}</div><div className="font-display mt-2 text-3xl font-bold">{Number(s.brokerage_pct) === 0 ? "₹0" : `${s.brokerage_pct}% or ₹${s.brokerage_cap}`}</div></div>
        ))}
      </div>

      <h2 className="font-display mt-12 text-2xl font-bold">Fee catalogue</h2>
      <p className="mt-1 text-sm text-muted">Every line the ledger can charge, with its current approved version. Broker fees can be waived or discounted under approval; statutory levies never can.</p>
      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <div className="glass overflow-x-auto p-4"><div className="mb-2 font-display font-semibold">Broker fees</div>
          <table className="table text-sm"><thead><tr><th>Charge</th><th>Applies to</th><th className="num">Rate</th><th>GST</th></tr></thead><tbody>
            {broker.map((f) => <tr key={f.id}><td><div className="font-medium">{f.name}</div><div className="text-xs text-faint">{f.fee_code} v{f.version} · from {f.effective_from}</div></td><td className="text-xs text-muted">{f.product ?? "all"} {f.side ?? ""}</td><td className="num">{rateLabel(f)}</td><td>{f.gst_applicable ? "yes" : "no"}</td></tr>)}
          </tbody></table></div>
        <div className="glass overflow-x-auto p-4"><div className="mb-2 font-display font-semibold">Statutory and exchange levies <Badge tone="info">pass-through</Badge></div>
          <table className="table text-sm"><thead><tr><th>Levy</th><th>Applies to</th><th className="num">Rate</th><th>Authority</th></tr></thead><tbody>
            {statutory.map((f) => <tr key={f.id}><td><div className="font-medium">{f.name}</div><div className="text-xs text-faint">{f.fee_code} v{f.version}</div></td><td className="text-xs text-muted">{f.product ?? "all"} {f.side ?? ""}</td><td className="num">{rateLabel(f)}</td><td className="text-xs text-muted">{f.source_url ? <a className="underline" href={f.source_url} target="_blank" rel="noreferrer">{f.authority}</a> : f.authority}</td></tr>)}
          </tbody></table></div>
      </div>

      {(subs ?? []).length > 0 && (
        <>
          <h2 className="font-display mt-12 text-2xl font-bold">Subscriptions</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            {((subs ?? []) as Sub[]).map((s) => <div key={s.id} className="glass p-6"><div className="flex items-center justify-between"><div className="font-display font-semibold">{s.name}</div><div className="tnum text-xl font-bold">{money(s.price_month)}<span className="text-xs font-normal text-muted">/month</span></div></div><p className="mt-2 text-sm text-muted">{s.description}</p><ul className="mt-3 list-disc pl-5 text-sm text-muted">{s.features.map((f) => <li key={f}>{f}</li>)}</ul><Link href="/login?next=/app/plan" className="btn btn-ghost btn-sm mt-4">Manage in app</Link></div>)}
          </div>
        </>
      )}

      <div className="glass mt-8 p-6">
        <div className="font-display text-lg font-semibold">Other charges and how pricing changes</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Demat AMC, pledge charges, API and terminal subscriptions are drafted in the catalogue and appear here only once approved.</li>
          <li>Every fee change is a new version with an effective date and an approval record; historical trades keep the version that applied at the time.</li>
          <li>Try the <Link className="text-accent underline" href="/calculators">brokerage calculator</Link> for an exact breakdown of any trade.</li>
        </ul>
      </div>
    </div>
  );
}
