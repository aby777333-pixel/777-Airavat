import { createClient } from "@/lib/supabase/server";
import { isoAgo } from "@/lib/time";
import { Badge, Notice, PageHeader } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { MarketCrumbs } from "../_shared";

export const metadata = { title: "Economic calendar: RBI policy, inflation, GDP, holidays", description: "Upcoming economic events and market holidays that matter for Indian markets, with importance, expected and previous values where available.", keywords: ["economic calendar India", "RBI policy date", "CPI inflation date", "market holidays NSE", "FOMC date"] };

export default async function EconomicCalendar() {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("economic_events").select("*").gte("event_date", isoAgo(86400000).slice(0, 10)).order("event_date").order("event_time").limit(200);
  const byDate = new Map<string, NonNullable<typeof rows>>();
  for (const r of rows ?? []) byDate.set(r.event_date, [...(byDate.get(r.event_date) ?? []), r]);
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <MarketCrumbs label="Economic calendar" />
      <PageHero variant="briefing" intro="Scheduled economic releases move markets: RBI policy decisions set rates, CPI and IIP shape expectations, global central bank meetings move flows, and exchange holidays change settlement dates. The calendar lists them with importance and, where known, expected and previous values."><PageHeader eyebrow="Markets" title="Economic calendar" /></PageHero>
      <Notice tone="warn">No licensed economic data feed is connected. Holidays come from the sandbox exchange calendar; other rows are labelled SIMULATED SAMPLE and maintained by staff.</Notice>
      <div className="mt-4 space-y-4">
        {[...byDate.entries()].map(([d, list]) => (
          <section key={d} className="glass p-4"><div className="font-display font-semibold">{new Date(d).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
            <ul className="mt-2 divide-y divide-border text-sm">{list.map((e) => <li key={e.id} className="flex flex-wrap items-center gap-3 py-2"><span className="tnum w-14 text-xs text-muted">{e.event_time ? String(e.event_time).slice(0, 5) : "—"}</span><Badge tone={e.importance === "high" ? "bad" : e.importance === "medium" ? "info" : "default"}>{e.importance}</Badge><span className="font-medium">{e.title}</span><span className="text-xs text-muted">{e.category} · {e.country}</span>{(e.expected || e.previous) && <span className="ml-auto text-xs text-muted">exp {e.expected ?? "—"} · prev {e.previous ?? "—"}{e.actual ? ` · actual ${e.actual}` : ""}</span>}<span className="text-[11px] text-faint">{e.source}</span></li>)}</ul></section>
        ))}
        {byDate.size === 0 && <p className="text-sm text-muted">No upcoming events recorded.</p>}
      </div>
    </div>
  );
}
