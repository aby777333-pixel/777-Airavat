import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/format";
import { Badge, Notice, PageHeader } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { MarketCrumbs } from "../_shared";

export const metadata = { title: "Corporate actions: dividends, splits, bonuses, record dates", description: "Upcoming and applied corporate actions for the sandbox universe: dividends, splits, bonus issues, results and record dates, with provenance on every row.", keywords: ["corporate actions calendar", "dividend record date", "bonus issue", "stock split", "ex dividend date India"] };

export default async function CorporateActions() {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("corporate_actions").select("*, instrument:instruments(symbol,name)").order("ex_date").limit(200);
  const list = (rows ?? []).map((r) => ({ ...r, instrument: (Array.isArray(r.instrument) ? r.instrument[0] : r.instrument) as { symbol: string; name: string } | null }));
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <MarketCrumbs label="Corporate actions" />
      <PageHero variant="daily" intro="Corporate actions change what you own or receive: dividends pay cash per share to holders on the record date, splits and bonuses change the number of shares and adjust historical prices, buybacks and rights give you a choice. AIRAVAT posts each action to your ledger and holdings on the ex-date and adjusts candle history for splits and bonuses."><PageHeader eyebrow="Markets" title="Corporate actions" subtitle="Provenance is shown on every row." /></PageHero>
      <Notice tone="warn">No exchange corporate-action feed is connected. Rows marked SIMULATED SAMPLE exist so the posting workflow can be demonstrated; staff can enter actions in Broker Core.</Notice>
      <div className="glass mt-4 overflow-x-auto p-2"><table className="table text-sm"><thead><tr><th>Ex-date</th><th>Stock</th><th>Action</th><th>Detail</th><th>Record date</th><th>Status</th><th>Source</th></tr></thead>
        <tbody>{list.map((r) => <tr key={r.id}><td>{r.ex_date}</td><td><Link className="font-semibold hover:text-accent" href={`/markets/${r.instrument?.symbol}`}>{r.instrument?.symbol}</Link><div className="text-xs text-muted">{r.instrument?.name}</div></td><td><Badge tone="accent">{r.kind}</Badge></td><td className="text-muted">{r.kind === "DIVIDEND" && r.amount ? `${money(r.amount)} per share` : r.ratio ?? ""} {r.description}</td><td>{r.record_date ?? "—"}</td><td><Badge tone={r.status === "applied" ? "ok" : "info"}>{r.status}</Badge></td><td className="text-xs text-faint">{r.source}</td></tr>)}{list.length === 0 && <tr><td colSpan={7} className="text-muted">No corporate actions recorded.</td></tr>}</tbody></table></div>
    </div>
  );
}
