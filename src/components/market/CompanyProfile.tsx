import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { istTime, money } from "@/lib/format";
import { Badge } from "@/components/ui";

// Company profile block: corporate actions, announcements, insider disclosures, shareholding and delivery stats for one instrument.
export default async function CompanyProfile({ instrumentId, symbol }: { instrumentId: number; symbol: string }) {
  const supabase = await createClient();
  const [{ data: ca }, { data: ann }, { data: ins }, { data: shp }, { data: st }] = await Promise.all([
    supabase.from("corporate_actions").select("*").eq("instrument_id", instrumentId).order("ex_date", { ascending: false }).limit(5),
    supabase.from("corporate_announcements").select("*").eq("instrument_id", instrumentId).order("announced_at", { ascending: false }).limit(5),
    supabase.from("insider_disclosures").select("*").eq("instrument_id", instrumentId).order("disclosed_on", { ascending: false }).limit(5),
    supabase.from("shareholding_patterns").select("*").eq("instrument_id", instrumentId).order("quarter", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("market_stats_daily").select("*").eq("instrument_id", instrumentId).order("day", { ascending: false }).limit(5),
  ]);
  const empty = !ca?.length && !ann?.length && !ins?.length && !shp && !st?.length;
  return (
    <section className="glass mt-4 p-4 text-sm">
      <div className="mb-2 flex items-center justify-between"><div className="font-display font-semibold">Company profile · {symbol}</div><Link href="/markets/announcements" className="text-xs text-accent">All announcements →</Link></div>
      {empty ? <p className="text-xs text-muted">No corporate actions, announcements, insider disclosures, shareholding or delivery statistics are recorded for this instrument. No licensed filings feed is connected.</p> : (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">Corporate actions</div>
            <ul className="mt-1 space-y-1 text-xs">{(ca ?? []).map((c) => <li key={c.id}><Badge tone="accent">{c.kind}</Badge> ex {c.ex_date} · {c.amount ? `${money(c.amount)}/share` : c.ratio} {c.description} <span className="text-faint">({c.source})</span></li>)}{!ca?.length && <li className="text-muted">None.</li>}</ul>
            <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted">Announcements</div>
            <ul className="mt-1 space-y-1 text-xs">{(ann ?? []).map((a) => <li key={a.id}>{istTime(a.announced_at, false)} · {a.title} <span className="text-faint">({a.source})</span></li>)}{!ann?.length && <li className="text-muted">None.</li>}</ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">Shareholding {shp ? `· ${shp.quarter}` : ""}</div>
            {shp ? <div className="mt-1 flex h-3 overflow-hidden rounded-full bg-bg"><div className="bg-accent" style={{ width: `${shp.promoters_pct}%` }} title={`Promoters ${shp.promoters_pct}%`} /><div className="bg-info" style={{ width: `${shp.fii_pct}%` }} title={`FII ${shp.fii_pct}%`} /><div className="bg-profit" style={{ width: `${shp.dii_pct}%` }} title={`DII ${shp.dii_pct}%`} /><div className="bg-text/30" style={{ width: `${shp.public_pct}%` }} title={`Public ${shp.public_pct}%`} /></div> : <p className="text-xs text-muted">Not recorded.</p>}
            {shp && <div className="mt-1 text-xs text-muted">Promoters {shp.promoters_pct}% · FII {shp.fii_pct}% · DII {shp.dii_pct}% · Public {shp.public_pct}% <span className="text-faint">({shp.source})</span></div>}
            <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted">Insider disclosures</div>
            <ul className="mt-1 space-y-1 text-xs">{(ins ?? []).map((i) => <li key={i.id}>{i.disclosed_on} · {i.person} ({i.relation}) {i.transaction} {Number(i.qty).toLocaleString("en-IN")} <span className="text-faint">({i.source})</span></li>)}{!ins?.length && <li className="text-muted">None.</li>}</ul>
            <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted">Delivery %</div>
            <ul className="mt-1 flex flex-wrap gap-2 text-xs">{(st ?? []).map((s) => <li key={s.day} className="rounded border border-border px-2 py-0.5">{s.day}: <strong>{s.delivery_pct}%</strong></li>)}{!st?.length && <li className="text-muted">Computed during sessions.</li>}</ul>
          </div>
        </div>
      )}
    </section>
  );
}
