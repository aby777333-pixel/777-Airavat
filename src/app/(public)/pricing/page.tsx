import Link from "next/link";
import { PageHeader, Notice } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Pricing" };

export default async function Pricing() {
  const supabase = await createClient();
  const { data: schedules } = await supabase.from("charge_schedules").select("*").order("product");
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <PageHeader eyebrow="Pricing" title="Transparent charges, nothing hidden" subtitle="The sandbox pricing schedule below is what the simulated ledger applies to every trade. Statutory levies are illustrative and will be re-verified against official notifications before any live use." />
      <Notice tone="warn">This is a sandbox schedule. AIRAVAT is not yet a registered broker and does not charge real money.</Notice>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {(schedules ?? []).map((s) => (
          <div key={s.id} className="glass p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{s.product === "CNC" ? "Equity delivery (CNC)" : "Equity intraday (MIS)"}</div>
            <div className="font-display mt-2 text-3xl font-bold">
              {Number(s.brokerage_pct) === 0 ? "₹0" : `${s.brokerage_pct}% or ₹${s.brokerage_cap}`}
              <span className="text-base font-normal text-muted"> {Number(s.brokerage_pct) === 0 ? "brokerage" : "whichever is lower"}</span>
            </div>
            <table className="table mt-4 text-sm">
              <tbody>
                <tr><td>STT (buy / sell)</td><td className="num">{s.stt_buy_pct}% / {s.stt_sell_pct}%</td></tr>
                <tr><td>Exchange transaction charge</td><td className="num">{s.exchange_txn_pct}%</td></tr>
                <tr><td>SEBI turnover fee</td><td className="num">{s.sebi_fee_pct}%</td></tr>
                <tr><td>Stamp duty (buy)</td><td className="num">{s.stamp_buy_pct}%</td></tr>
                <tr><td>GST on brokerage + exchange + SEBI</td><td className="num">{s.gst_pct}%</td></tr>
              </tbody>
            </table>
            <p className="mt-3 text-xs text-faint">Effective from {s.effective_from}. {s.note}</p>
          </div>
        ))}
      </div>
      <div className="glass mt-6 p-6">
        <div className="font-display text-lg font-semibold">Other charges</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Account opening, demat AMC, pledge charges, API and terminal subscriptions: not defined yet. They will be published here before any live launch.</li>
          <li>Try the <Link className="text-accent underline" href="/calculators">brokerage calculator</Link> to see the exact charge breakdown for any trade.</li>
        </ul>
      </div>
    </div>
  );
}
