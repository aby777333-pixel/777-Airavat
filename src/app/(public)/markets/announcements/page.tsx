import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { istTime, money } from "@/lib/format";
import { Badge, Notice, PageHeader } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { MarketCrumbs } from "../_shared";

export const metadata = { title: "Corporate announcements, insider disclosures and shareholding (sandbox)", description: "Company announcements, insider trading disclosures and shareholding patterns for the sandbox universe, with provenance on every row.", keywords: ["corporate announcements NSE", "insider trading disclosures", "shareholding pattern", "promoter holding", "FII DII holding"] };

export default async function Announcements() {
  const supabase = await createClient();
  const [{ data: ann }, { data: ins }, { data: shp }] = await Promise.all([
    supabase.from("corporate_announcements").select("*, instrument:instruments(symbol)").order("announced_at", { ascending: false }).limit(100),
    supabase.from("insider_disclosures").select("*, instrument:instruments(symbol)").order("disclosed_on", { ascending: false }).limit(100),
    supabase.from("shareholding_patterns").select("*, instrument:instruments(symbol,name)").order("quarter", { ascending: false }).limit(100),
  ]);
  const sym = (r: { instrument: unknown }) => ((Array.isArray(r.instrument) ? r.instrument[0] : r.instrument) as { symbol: string } | null)?.symbol;
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <MarketCrumbs label="Announcements & disclosures" />
      <PageHero variant="daily" intro="Corporate announcements, insider (SAST/PIT) disclosures and quarterly shareholding patterns tell you what companies and their insiders are doing. In production these come from exchange filings; in the sandbox the rows are staff-entered or labelled SIMULATED SAMPLE."><PageHeader eyebrow="Markets" title="Announcements, insider disclosures and shareholding" /></PageHero>
      <Notice tone="warn">No exchange filings feed is connected. Every row shows its source.</Notice>
      <section className="mt-6"><h2 className="font-display text-xl font-semibold">Corporate announcements</h2>
        <div className="glass mt-3 overflow-x-auto p-2"><table className="table text-sm"><thead><tr><th>When</th><th>Stock</th><th>Category</th><th>Title</th><th>Source</th></tr></thead><tbody>{(ann ?? []).map((a) => <tr key={a.id}><td className="text-xs text-muted">{istTime(a.announced_at)}</td><td><Link className="font-semibold hover:text-accent" href={`/markets/${sym(a)}`}>{sym(a)}</Link></td><td><Badge>{a.category}</Badge></td><td>{a.title}{a.body && <div className="text-xs text-muted">{a.body}</div>}</td><td className="text-xs text-faint">{a.source}</td></tr>)}{(ann ?? []).length === 0 && <tr><td colSpan={5} className="text-muted">None recorded.</td></tr>}</tbody></table></div></section>
      <section className="mt-8"><h2 className="font-display text-xl font-semibold">Insider disclosures</h2>
        <div className="glass mt-3 overflow-x-auto p-2"><table className="table text-sm"><thead><tr><th>Date</th><th>Stock</th><th>Person</th><th>Relation</th><th>Transaction</th><th className="num">Qty</th><th className="num">Value</th><th>Source</th></tr></thead><tbody>{(ins ?? []).map((i) => <tr key={i.id}><td>{i.disclosed_on}</td><td><Link className="font-semibold hover:text-accent" href={`/markets/${sym(i)}`}>{sym(i)}</Link></td><td>{i.person}</td><td className="text-muted">{i.relation}</td><td><Badge tone={i.transaction === "BUY" ? "ok" : i.transaction === "SELL" ? "bad" : "info"}>{i.transaction}</Badge></td><td className="num">{i.qty.toLocaleString("en-IN")}</td><td className="num">{i.value ? money(i.value) : "—"}</td><td className="text-xs text-faint">{i.source}</td></tr>)}{(ins ?? []).length === 0 && <tr><td colSpan={8} className="text-muted">None recorded.</td></tr>}</tbody></table></div></section>
      <section className="mt-8"><h2 className="font-display text-xl font-semibold">Shareholding patterns</h2>
        <div className="glass mt-3 overflow-x-auto p-2"><table className="table text-sm"><thead><tr><th>Stock</th><th>Quarter</th><th className="num">Promoters</th><th className="num">FII</th><th className="num">DII</th><th className="num">Public</th><th>Source</th></tr></thead><tbody>{(shp ?? []).map((s) => <tr key={s.id}><td><Link className="font-semibold hover:text-accent" href={`/markets/${sym(s)}`}>{sym(s)}</Link></td><td>{s.quarter}</td><td className="num">{s.promoters_pct}%</td><td className="num">{s.fii_pct}%</td><td className="num">{s.dii_pct}%</td><td className="num">{s.public_pct}%</td><td className="text-xs text-faint">{s.source}</td></tr>)}{(shp ?? []).length === 0 && <tr><td colSpan={7} className="text-muted">None recorded.</td></tr>}</tbody></table></div></section>
    </div>
  );
}
