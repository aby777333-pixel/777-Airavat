import clsx from "clsx";
import { getQuotes } from "@/lib/market";
import { createClient } from "@/lib/supabase/server";
import { changeOf, money, pct } from "@/lib/format";
import { metadataFor, seoFor } from "@/lib/seo";
import { Notice, PageHeader, SimBadge } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { MarketCrumbs } from "../_shared";

export const metadata = { ...metadataFor("/markets/currency") };

export default async function Currency() {
  const supabase = await createClient();
  const [rows, { data: specs }, { data: macro }] = await Promise.all([getQuotes(), supabase.from("contract_specs").select("*"), supabase.from("macro_series").select("*").eq("series", "usdinr").order("period", { ascending: false }).limit(12)]);
  const sm = new Map((specs ?? []).map((s) => [s.instrument_id, s]));
  const list = rows.filter((r) => r.segment === "CDS");
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <MarketCrumbs label="Currency" />
      <PageHero variant="universe" intro={seoFor("/markets/currency").intro}><PageHeader eyebrow="Currency derivatives" title="USDINR, EURINR, GBPINR" subtitle={<span className="inline-flex items-center gap-2">Contract specifications and reference quotes <SimBadge /></span>} /></PageHero>
      <div className="grid gap-4 md:grid-cols-3">
        {list.map((r) => { const c = changeOf(r.quote.ltp, r.quote.prev_close); const s = sm.get(r.id); const cv = s ? Number(r.quote.ltp) * s.lot_size : null; return (
          <div key={r.id} className="glass p-5">
            <div className="flex items-start justify-between"><div><div className="font-display text-lg font-semibold">{r.symbol}</div><div className="text-xs text-muted">{r.name}</div></div><div className="text-right"><div className="tnum font-display text-xl">{Number(r.quote.ltp).toFixed(4)}</div><div className={clsx("tnum text-xs", c.change >= 0 ? "text-profit" : "text-loss")}>{pct(c.changePct)}</div></div></div>
            {s && <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs"><dt className="text-muted">Lot</dt><dd>{s.unit}</dd><dt className="text-muted">Contract value</dt><dd className="tnum">{cv ? money(cv) : "—"}</dd><dt className="text-muted">Margin (sim)</dt><dd>{s.margin_pct}% ≈ {cv ? money((cv * Number(s.margin_pct)) / 100) : "—"}</dd><dt className="text-muted">Tick</dt><dd>{Number(s.tick_size).toFixed(4)} (₹{(Number(s.tick_size) * s.lot_size).toFixed(2)} per tick)</dd><dt className="text-muted">Expiry</dt><dd>{s.expiry} (two days before month end)</dd><dt className="text-muted">Hours</dt><dd>{s.trading_hours}</dd><dt className="text-muted">Settlement</dt><dd>{s.delivery}</dd></dl>}
          </div>); })}
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="glass p-5"><div className="font-display font-semibold">USD/INR reference, last 12 months (sample)</div><table className="table mt-2 text-xs"><tbody>{(macro ?? []).map((m) => <tr key={m.period}><td>{m.period}</td><td className="num">{Number(m.value).toFixed(2)}</td></tr>)}</tbody></table></div>
        <div className="glass p-5"><div className="font-display font-semibold">How currency futures work</div><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted"><li>Contracts are for 1,000 units of the base currency, quoted in rupees to four decimals.</li><li>Cash settled on the RBI reference rate; no delivery of foreign currency.</li><li>Resident individuals can hedge or trade within position limits; FEMA rules govern non-residents.</li><li>Margins are low (around 2–3%), so leverage is high and the daily mark-to-market matters.</li></ul></div>
      </div>
      <div className="mt-5"><Notice tone="warn">Research only; SIMULATED SAMPLE quotes and specifications. Currency trading needs NSE CDS membership and clearing arrangements, listed on the Market Atlas as blockers.</Notice></div>
    </div>
  );
}
