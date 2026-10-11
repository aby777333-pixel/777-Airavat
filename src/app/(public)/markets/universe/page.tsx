import PageHero from "@/components/site/PageHero";
import { seoFor, metadataFor } from "@/lib/seo";
import Link from "next/link";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/server";
import { getQuotes } from "@/lib/market";
import { changeOf, pct, price } from "@/lib/format";
import { Badge, Notice, PageHeader, SimBadge } from "@/components/ui";

export const metadata = { ...metadataFor("/markets/universe") };

const STAGES = ["research", "regulatory_assessment", "infrastructure", "development", "testing", "certification", "compliance_approval", "pilot", "sandbox_live", "production_live", "not_enabled"];
const label = (s: string) => s.replace(/_/g, " ");
const tone = (s: string) => (s === "sandbox_live" ? "ok" : s === "production_live" ? "ok" : s === "not_enabled" ? "bad" : s === "research" ? "default" : "info");

export default async function Universe() {
  const supabase = await createClient();
  const [{ data: matrix }, quotes] = await Promise.all([supabase.from("market_access_matrix").select("*").order("id"), getQuotes()]);
  const research = quotes.filter((q) => ["COMM", "CDS"].includes(q.segment));
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageHero variant="universe" intro={seoFor("/markets/universe").intro}><PageHeader eyebrow="Market Atlas" title="One architecture, many markets, regulated access" subtitle="Every market AIRAVAT is designed to serve, with its real stage. Only the simulated NSE equity sandbox is live. Nothing here is a claim of exchange membership or authorization." /></PageHero>
      <Notice tone="warn">Technology readiness is not legal permission. Offshore leveraged FX and CFDs are explicitly not enabled for Indian residents.</Notice>
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(matrix ?? []).map((m) => (
          <div key={m.id} className={clsx("p-5", m.stage === "sandbox_live" ? "m-sapphire-edge" : "glass")}>
            <div className="flex items-start justify-between gap-2"><div><div className="text-xs text-muted">{m.exchange} · {m.segment}</div><div className="font-display font-semibold">{m.name}</div></div><Badge tone={tone(m.stage)}>{label(m.stage)}</Badge></div>
            <div className="mt-3 flex flex-wrap gap-1 text-[11px]">
              <Badge tone={m.entity_authorized ? "ok" : "bad"}>entity {m.entity_authorized ? "authorized" : "not authorized"}</Badge>
              <Badge tone={m.exchange_membership ? "ok" : "bad"}>membership {m.exchange_membership ? "yes" : "no"}</Badge>
              <Badge tone={m.data_feed === "none" ? "bad" : "sim"}>feed: {m.data_feed}</Badge>
              <Badge tone={m.trading_enabled ? "ok" : "bad"}>trading {m.trading_enabled ? "sandbox" : "disabled"}</Badge>
            </div>
            {m.client_eligibility && <div className="mt-2 text-xs text-muted">Eligibility: {m.client_eligibility}</div>}
            {m.regulatory_notes && <div className="mt-1 text-xs text-faint">{m.regulatory_notes}</div>}
          </div>
        ))}
      </div>
      <div className="mt-10">
        <div className="flex items-center gap-3"><h2 className="font-display text-xl font-semibold">Research-only instruments</h2><SimBadge /><Badge tone="bad">not tradable</Badge></div>
        <p className="mt-1 text-sm text-muted">MCX commodities and currency derivatives appear for research and education only. Prices are synthetic.</p>
        <div className="glass mt-3 overflow-x-auto p-2"><table className="table"><thead><tr><th>Symbol</th><th>Name</th><th>Segment</th><th className="num">Price</th><th className="num">Change</th><th className="num">Lot</th></tr></thead>
          <tbody>{research.map((r) => { const c = changeOf(r.quote.ltp, r.quote.prev_close); return <tr key={r.id}><td><Link href={`/markets/${encodeURIComponent(r.symbol)}`} className="font-semibold hover:text-accent">{r.symbol}</Link></td><td className="text-muted">{r.name}</td><td>{r.exchange} {r.segment}</td><td className="num">{price(r.quote.ltp)}</td><td className={clsx("num", c.change >= 0 ? "text-profit" : "text-loss")}>{pct(c.changePct)}</td><td className="num">{r.lot_size}</td></tr>; })}</tbody></table></div>
      </div>
      <div className="mt-8 text-xs text-faint">Launch gates per market: legal eligibility → entity permissions → exchange/venue access → clearing and settlement → data licensing → instrument master → OMS/RMS controls → client eligibility → charges and taxes → regulatory reporting → certification → production approval. Stages advance only in Broker Core with an audit trail; the <code>STAGES</code> list has {STAGES.length} steps.</div>
    </div>
  );
}
