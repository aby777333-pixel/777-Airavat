import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isoAgo } from "@/lib/time";
import { metadataFor, seoFor } from "@/lib/seo";
import { Badge, Notice, PageHeader } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { upcomingExpiries } from "@/lib/markets-hub";
import { MarketCrumbs } from "../_shared";

export const metadata = { ...metadataFor("/markets/calendar") };
type Item = { date: string; kind: string; title: string; detail?: string; href?: string; source: string };

export default async function MarketCalendar() {
  const supabase = await createClient();
  const from = isoAgo(86400000).slice(0, 10);
  const [{ data: hol }, { data: ev }, { data: ce }, { data: ca }] = await Promise.all([
    supabase.from("market_holidays").select("*").gte("day", from).order("day"),
    supabase.from("economic_events").select("*").gte("event_date", from).order("event_date").limit(100),
    supabase.from("corporate_events").select("*, instrument:instruments(symbol)").gte("event_date", from).order("event_date").limit(150),
    supabase.from("corporate_actions").select("*, instrument:instruments(symbol)").gte("ex_date", from).order("ex_date").limit(100),
  ]);
  const items: Item[] = [
    ...(hol ?? []).map((h) => ({ date: h.day, kind: "holiday", title: `Exchanges closed: ${h.description}`, detail: "All segments", source: "Sandbox exchange calendar" })),
    ...(ev ?? []).map((e) => ({ date: e.event_date, kind: e.category ?? "macro", title: e.title, detail: [e.event_time, e.importance ? `importance ${e.importance}` : null, e.expected ? `expected ${e.expected}` : null].filter(Boolean).join(" · "), source: e.source ?? "staff" })),
    ...(ce ?? []).map((c) => ({ date: c.event_date, kind: c.kind, title: `${(c.instrument as { symbol: string } | null)?.symbol}: ${c.note ?? c.kind}`, href: `/markets/${(c.instrument as { symbol: string } | null)?.symbol}`, source: c.source })),
    ...(ca ?? []).map((a) => ({ date: a.ex_date, kind: `ex-${a.kind}`, title: `${(a.instrument as { symbol: string } | null)?.symbol}: ${a.kind} ${a.amount ? `₹${a.amount}` : a.ratio ?? ""}`, detail: a.record_date ? `record date ${a.record_date}` : undefined, href: `/markets/${(a.instrument as { symbol: string } | null)?.symbol}`, source: a.source ?? "staff" })),
    ...upcomingExpiries().map((x) => ({ date: x.date, kind: "expiry", title: `${x.label} expiry`, detail: x.kind === "monthly" ? "Last Thursday of the month" : "Thursday", source: "Exchange convention" })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const byDate = new Map<string, Item[]>(); items.forEach((i) => byDate.set(i.date, [...(byDate.get(i.date) ?? []), i]));
  const tone = (k: string) => (k === "holiday" ? "bad" : k === "results" ? "info" : k.startsWith("ex-") ? "ok" : k === "expiry" ? "accent" : "default");
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <MarketCrumbs label="Market calendar" />
      <PageHero variant="briefing" intro={seoFor("/markets/calendar").intro}><PageHeader eyebrow="Calendar" title="Market calendar" subtitle="Holidays · results and AGMs · ex-dates · F&O expiries · RBI and macro events" /></PageHero>
      <div className="mb-4 flex flex-wrap gap-2 text-xs">{["holiday", "results", "agm", "ex-dividend", "expiry", "macro"].map((k) => <span key={k} className={`badge badge-${tone(k) === "default" ? "" : tone(k)}`}>{k}</span>)}</div>
      <div className="space-y-4">
        {[...byDate.entries()].map(([d, list]) => (
          <div key={d} className="glass p-4">
            <div className="font-display text-sm font-semibold">{new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
            <ul className="mt-2 divide-y divide-border">{list.map((i, n) => <li key={n} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"><span className="flex items-center gap-2"><Badge tone={tone(i.kind) as "ok" | "bad" | "info" | "accent" | "default"}>{i.kind}</Badge>{i.href ? <Link href={i.href} className="hover:text-accent">{i.title}</Link> : <span>{i.title}</span>}{i.detail && <span className="text-xs text-muted">{i.detail}</span>}</span><span className="text-[11px] text-faint">{i.source}</span></li>)}</ul>
          </div>
        ))}
        {byDate.size === 0 && <p className="text-sm text-muted">Nothing scheduled.</p>}
      </div>
      <div className="mt-5"><Notice tone="warn">Fixed national holidays are listed; festival holidays follow the exchange&apos;s annual circular and are entered by staff. Results dates, ex-dates and macro events are SIMULATED SAMPLE rows until licensed calendars are connected.</Notice></div>
    </div>
  );
}
