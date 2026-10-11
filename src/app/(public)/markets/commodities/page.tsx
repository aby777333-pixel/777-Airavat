import clsx from "clsx";
import Link from "next/link";
import { getQuotes } from "@/lib/market";
import { createClient } from "@/lib/supabase/server";
import { changeOf, money, pct, price } from "@/lib/format";
import { metadataFor, seoFor } from "@/lib/seo";
import { Notice, PageHeader, SimBadge } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { MarketCrumbs } from "../_shared";

export const metadata = { ...metadataFor("/markets/commodities") };

export default async function Commodities() {
  const supabase = await createClient();
  const [rows, { data: specs }] = await Promise.all([getQuotes(), supabase.from("contract_specs").select("*")]);
  const sm = new Map((specs ?? []).map((s) => [s.instrument_id, s]));
  const list = rows.filter((r) => r.segment === "COMM");
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <MarketCrumbs label="Commodities" />
      <PageHero variant="universe" intro={seoFor("/markets/commodities").intro}><PageHeader eyebrow="MCX" title="Commodity derivatives" subtitle={<span className="inline-flex items-center gap-2">Contract specifications and reference prices <SimBadge /></span>} /></PageHero>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((r) => { const c = changeOf(r.quote.ltp, r.quote.prev_close); const s = sm.get(r.id); const cv = s ? Number(r.quote.ltp) * s.lot_size : null; return (
          <div key={r.id} className="glass p-5">
            <div className="flex items-start justify-between gap-2"><div><div className="font-display text-lg font-semibold">{r.symbol}</div><div className="text-xs text-muted">{r.name} · {r.sector}</div></div><div className="text-right"><div className="tnum font-display text-xl">{price(r.quote.ltp)}</div><div className={clsx("tnum text-xs", c.change >= 0 ? "text-profit" : "text-loss")}>{pct(c.changePct)}</div></div></div>
            {s && <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs"><dt className="text-muted">Lot</dt><dd>{s.lot_size} · {s.unit}</dd><dt className="text-muted">Contract value</dt><dd className="tnum">{cv ? money(cv, { compact: true }) : "—"}</dd><dt className="text-muted">Margin (sim)</dt><dd>{s.margin_pct}% ≈ {cv ? money((cv * Number(s.margin_pct)) / 100, { compact: true }) : "—"}</dd><dt className="text-muted">Tick</dt><dd>{s.tick_size}</dd><dt className="text-muted">Expiry</dt><dd>{s.expiry}</dd><dt className="text-muted">Hours</dt><dd>{s.trading_hours}</dd><dt className="text-muted">Settlement</dt><dd>{s.delivery}</dd></dl>}
            <div className="mt-3 text-[11px] text-faint">Research only · {s?.source ?? "no spec"}</div>
          </div>); })}
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="glass p-5"><div className="font-display font-semibold">How commodity futures work</div><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted"><li>Each contract covers a fixed lot; margin is a percentage of contract value set by the exchange and raised in volatile periods.</li><li>Metals contracts move to compulsory delivery in the tender period; energy contracts are cash settled.</li><li>Commodity Transaction Tax (CTT) applies on the sell side of non-agricultural futures; see the <Link className="underline" href="/pricing">charges page</Link>.</li><li>Evening sessions track international benchmarks (COMEX, NYMEX, LME) and the rupee.</li></ul></div>
        <div className="glass p-5"><div className="font-display font-semibold">What AIRAVAT publishes now</div><p className="mt-2 text-sm text-muted">Contract specifications, simulated reference prices and the charge schedule. Trading in this segment requires MCX membership and clearing arrangements, which are listed as blockers on the <Link className="underline" href="/markets/universe">Market Atlas</Link>.</p></div>
      </div>
      <div className="mt-5"><Notice tone="warn">Prices and specifications are SIMULATED SAMPLE values; exchange contract specifications and margins replace them before any live use.</Notice></div>
    </div>
  );
}
