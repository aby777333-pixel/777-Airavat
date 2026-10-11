import PageHero from "@/components/site/PageHero";
import { seoFor, metadataFor } from "@/lib/seo";
import Link from "next/link";
import clsx from "clsx";
import { PageHeader, Notice, Badge } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/format";
import { isoAgo } from "@/lib/time";
import { AMC, OTHER_CHARGES, REFERENCE, SCHEDULE_VERSION, SEGMENTS, type Segment } from "@/lib/charges-schedule";

export const metadata = { ...metadataFor("/pricing") };

type Fee = { id: number; fee_code: string; version: number; name: string; description: string | null; classification: string; product: string | null; side: string | null; calc_method: string; rate: number; cap: number | null; min_amount: number | null; gst_applicable: boolean; authority: string | null; source_url: string | null; effective_from: string; status: string; segment: string };
type Plan = { id: number; code: string; name: string; description: string | null; brokerage: Record<string, { pct: number; cap: number }>; eligibility: string | null };
type Sub = { id: number; code: string; name: string; description: string | null; price_month: number; features: string[] };

function rateLabel(f: Fee) {
  if (f.calc_method === "FLAT_PER_ORDER") return `${money(f.rate)} per order`;
  if (f.calc_method === "PCT_CAPPED") return `${f.rate}% capped at ${money(f.cap ?? 0)}`;
  return `${f.rate}%`;
}
const brokerageText = (s: Segment) => (s.brokerage.type === "zero" ? "₹0 (free)" : s.brokerage.type === "flat" ? `Flat ₹${s.brokerage.amount} per executed order` : `${s.brokerage.pct}% or ₹${s.brokerage.cap} per executed order, whichever is lower`);
const sttText = (s: Segment) => (s.stt.length === 0 ? "No STT" : s.stt.map((r) => `${r.pct}% ${r.basis === "value" ? "" : `of ${r.basis} `}${r.side === "BOTH" ? "on buy and sell" : `on the ${r.side.toLowerCase()} side`}${r.note ? ` (${r.note})` : ""}`).join("; "));
const txnText = (s: Segment) => Object.entries(s.txn).map(([ex, pct]) => `${ex}: ${pct}%`).join(" · ") + (s.txnBasis === "premium" ? " of premium" : "");
const sebiText = (s: Segment) => (typeof s.sebiPerCrore === "number" ? `₹${s.sebiPerCrore} per crore` : `Agri ₹${s.sebiPerCrore.agri} per crore · non-agri ₹${s.sebiPerCrore.nonAgri} per crore`);

export default async function Pricing() {
  const supabase = await createClient();
  const today = isoAgo(0).slice(0, 10);
  const [{ data: fees }, { data: plans }, { data: subs }, { data: matrix }] = await Promise.all([
    supabase.from("fee_definitions").select("*").eq("status", "approved").eq("segment", "EQ").lte("effective_from", today).or(`effective_to.is.null,effective_to.gte.${today}`).order("fee_code").order("version", { ascending: false }),
    supabase.from("pricing_plans").select("*").eq("status", "approved").order("id"),
    supabase.from("subscription_plans").select("*").eq("status", "approved").order("id"),
    supabase.from("market_access_matrix").select("segment,stage,trading_enabled"),
  ]);
  const latest = new Map<string, Fee>();
  for (const f of (fees ?? []) as Fee[]) if (!latest.has(f.fee_code)) latest.set(f.fee_code, f);
  const catalogue = [...latest.values()];
  const broker = catalogue.filter((f) => f.classification === "BROKER_FEE");
  const statutory = catalogue.filter((f) => f.classification !== "BROKER_FEE");
  const live = new Set((matrix ?? []).filter((m) => m.trading_enabled).map((m) => m.segment));
  const groups = ["Equity", "F&O", "Currency", "Commodity"] as const;
  const rows: [string, (s: Segment) => string][] = [["Brokerage", brokerageText], ["STT / CTT", sttText], ["Transaction charges", txnText], ["GST", () => "18% on brokerage + SEBI charges + transaction charges"], ["SEBI charges", sebiText], ["Stamp charges", (s) => s.stampNote], ["Investor protection fund (IPFT)", (s) => s.ipft ?? "—"]];
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
      <PageHero variant="pricing" intro={seoFor("/pricing").intro}><PageHeader eyebrow="Charges" title="Every charge, published in full" subtitle={`AIRAVAT's complete charge schedule across equity, F&O, currency and commodity segments, plus account, depository and maintenance charges. Schedule version ${SCHEDULE_VERSION}.`} /></PageHero>
      <Notice tone="warn">Sandbox: only NSE equity cash (delivery and intraday) is tradable, with simulated money. Every other segment is published for transparency and marked as not enabled. Statutory and exchange rates are re-verified against official notifications before any live use.</Notice>

      <nav className="mt-6 flex flex-wrap gap-2 text-sm">{[...groups, "Other charges", "AMC & BSDA", "Plans & catalogue", "Charges explained"].map((g) => <a key={g} href={`#${g.replace(/[^a-z]/gi, "-").toLowerCase()}`} className="btn btn-ghost btn-sm">{g}</a>)}</nav>

      {groups.map((g) => {
        const segs = SEGMENTS.filter((s) => s.group === g);
        return (
          <section key={g} id={g.replace(/[^a-z]/gi, "-").toLowerCase()} className="mt-10">
            <div className="flex flex-wrap items-center gap-3"><h2 className="font-display text-2xl font-bold">{g}</h2>{segs.map((s) => <Badge key={s.key} tone={live.has(s.matrixSegment) ? "ok" : "bad"}>{s.name}: {live.has(s.matrixSegment) ? "sandbox live" : "not enabled"}</Badge>)}</div>
            <div className="glass mt-3 overflow-x-auto p-2">
              <table className="table text-sm"><thead><tr><th>Charge</th>{segs.map((s) => <th key={s.key}>{s.name}</th>)}</tr></thead>
                <tbody>{rows.map(([label, fn]) => <tr key={label}><td className="font-medium">{label}</td>{segs.map((s) => <td key={s.key} className={clsx("text-muted", label === "Brokerage" && "font-semibold text-text")}>{fn(s)}</td>)}</tr>)}</tbody></table>
            </div>
            {segs.some((s) => s.notes?.length) && <ul className="mt-2 list-disc pl-5 text-xs text-faint">{segs.flatMap((s) => (s.notes ?? []).map((n) => <li key={s.key + n}>{s.name}: {n}</li>))}</ul>}
          </section>
        );
      })}

      <section id="other-charges" className="mt-12">
        <h2 className="font-display text-2xl font-bold">Other charges</h2>
        <div className="glass mt-3 overflow-x-auto p-2"><table className="table text-sm"><thead><tr><th>Item</th><th>Charge</th><th>In the sandbox</th></tr></thead>
          <tbody>{OTHER_CHARGES.map((o) => <tr key={o.item}><td className="font-medium">{o.item}</td><td className="text-muted">{o.amount}{o.note && <div className="text-xs text-faint">{o.note}</div>}</td><td className="text-xs text-faint">{o.sandbox}</td></tr>)}</tbody></table></div>
      </section>

      <section id="amc-bsda" className="mt-12">
        <h2 className="font-display text-2xl font-bold">Demat annual maintenance (AMC) and BSDA</h2>
        <p className="mt-2 text-sm text-muted">{AMC.billing} {AMC.firstYear}</p>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div className="glass p-4"><div className="font-display font-semibold">Basic Service Demat Account</div><p className="mt-1 text-xs text-muted">{AMC.bsdaEligibility}</p>
            <table className="table mt-3 text-sm"><thead><tr><th>Holdings</th><th>Resident</th><th>NRI</th></tr></thead><tbody>{AMC.bsda.map((r) => <tr key={r.slab}><td>{r.slab}</td><td className="num">{r.resident}</td><td className="num">{r.nri}</td></tr>)}</tbody></table></div>
          <div className="glass p-4"><div className="font-display font-semibold">Non-BSDA accounts</div><p className="mt-1 text-xs text-muted">{AMC.secondary}</p>
            <table className="table mt-3 text-sm"><thead><tr><th>Account type</th><th>Annual</th><th>Quarterly</th></tr></thead><tbody>{AMC.nonBsda.map((r) => <tr key={r.type}><td>{r.type}</td><td className="num">{r.annual}</td><td className="num">{r.quarterly}</td></tr>)}</tbody></table></div>
        </div>
        <p className="mt-2 text-xs text-faint">{AMC.sandbox}</p>
      </section>

      <section id="plans-catalogue" className="mt-12">
        <h2 className="font-display text-2xl font-bold">Plans and the live catalogue (what the sandbox ledger applies)</h2>
        <p className="mt-1 text-sm text-muted">Only compliance-approved plans are shown. Plans change broker fees only; statutory levies are identical for everyone and are read live from the versioned fee catalogue.</p>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          {((plans ?? []) as Plan[]).map((p) => (
            <div key={p.id} className="m-crystal p-6">
              <div className="flex items-center justify-between"><div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{p.name}</div><Badge tone="ok">approved</Badge></div>
              <p className="mt-2 text-sm text-muted">{p.description}</p>
              <table className="table mt-4 text-sm"><tbody>{Object.entries(p.brokerage).map(([prod, b]) => <tr key={prod}><td>{prod === "CNC" ? "Equity delivery (CNC)" : prod === "MIS" ? "Equity intraday (MIS)" : prod}</td><td className="num">{Number(b.pct) === 0 && Number(b.cap) === 0 ? "₹0" : `${b.pct}% or ₹${b.cap}, whichever is lower`}</td></tr>)}</tbody></table>
              {p.eligibility && <p className="mt-3 text-xs text-faint">Eligibility: {p.eligibility}</p>}
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="glass overflow-x-auto p-4"><div className="mb-2 font-display font-semibold">Broker fees (equity, current versions)</div>
            <table className="table text-sm"><thead><tr><th>Charge</th><th>Applies to</th><th className="num">Rate</th><th>GST</th></tr></thead><tbody>
              {broker.map((f) => <tr key={f.id}><td><div className="font-medium">{f.name}</div><div className="text-xs text-faint">{f.fee_code} v{f.version} · from {f.effective_from}</div></td><td className="text-xs text-muted">{f.product ?? "all"} {f.side ?? ""}</td><td className="num">{rateLabel(f)}</td><td>{f.gst_applicable ? "yes" : "no"}</td></tr>)}
            </tbody></table></div>
          <div className="glass overflow-x-auto p-4"><div className="mb-2 font-display font-semibold">Statutory and exchange levies (equity) <Badge tone="info">pass-through</Badge></div>
            <table className="table text-sm"><thead><tr><th>Levy</th><th>Applies to</th><th className="num">Rate</th><th>Authority</th></tr></thead><tbody>
              {statutory.map((f) => <tr key={f.id}><td><div className="font-medium">{f.name}</div><div className="text-xs text-faint">{f.fee_code} v{f.version}</div></td><td className="text-xs text-muted">{f.product ?? "all"} {f.side ?? ""}</td><td className="num">{rateLabel(f)}</td><td className="text-xs text-muted">{f.source_url ? <a className="underline" href={f.source_url} target="_blank" rel="noreferrer">{f.authority}</a> : f.authority}</td></tr>)}
            </tbody></table></div>
        </div>
        {(subs ?? []).length > 0 && (
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {((subs ?? []) as Sub[]).map((s) => <div key={s.id} className="glass p-6"><div className="flex items-center justify-between"><div className="font-display font-semibold">{s.name}</div><div className="tnum text-xl font-bold">{money(s.price_month)}<span className="text-xs font-normal text-muted">/month</span></div></div><p className="mt-2 text-sm text-muted">{s.description}</p><ul className="mt-3 list-disc pl-5 text-sm text-muted">{s.features.map((f) => <li key={f}>{f}</li>)}</ul><Link href="/login?next=/app/plan" className="btn btn-ghost btn-sm mt-4">Manage in app</Link></div>)}
          </div>
        )}
      </section>

      <section id="charges-explained" className="mt-12 glass p-6 text-sm text-muted">
        <h2 className="font-display text-xl font-semibold text-text">Charges explained</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><strong className="text-text">Brokerage</strong> is the only line AIRAVAT sets. It is charged per executed order (one order filled in several trades is still one order).</li>
          <li><strong className="text-text">STT / CTT</strong> are central government taxes on the value traded, collected by the exchange. Delivery is taxed on both sides; intraday, futures and options are taxed on the sell side only.</li>
          <li><strong className="text-text">Transaction charges</strong> are set by each exchange and passed through unchanged. Options are charged on premium.</li>
          <li><strong className="text-text">SEBI charges</strong> are a regulatory turnover fee. <strong className="text-text">Stamp duty</strong> is a state levy on the buy side at the published uniform rates.</li>
          <li><strong className="text-text">GST</strong> at 18% applies to brokerage, SEBI charges and transaction charges, never to STT or stamp duty.</li>
          <li><strong className="text-text">Investor protection fund</strong> contributions are tiny per-crore amounts collected by NSE and shown separately on contract notes.</li>
          <li>Every fee in the catalogue is versioned with an effective date, an approval record and a source; historical trades keep the version that applied at the time. Use the <Link className="text-accent underline" href="/calculators">calculators</Link> for an exact breakdown.</li>
        </ul>
        <p className="mt-3 text-xs text-faint">{REFERENCE.label}; benchmark date {REFERENCE.retrieved}. Official exchange and statutory notifications take precedence; they are cited on each catalogue line before live use.</p>
      </section>
    </div>
  );
}
