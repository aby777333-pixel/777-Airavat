import Link from "next/link";
import clsx from "clsx";
import { getBriefing } from "@/lib/daily";
import { istTime, pct, price } from "@/lib/format";
import { Badge, Card, PageHeader, SimBadge } from "@/components/ui";

export const metadata = { title: "Daily Briefing", description: "AIRAVAT Morning Intelligence: session status, breadth, movers, scanner highlights, upcoming holidays and the latest journal articles. Simulated data." };

export default async function Briefing() {
  const b = await getBriefing();
  if (!b) return <div className="mx-auto max-w-5xl px-4 py-12 text-muted">Briefing unavailable.</div>;
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <PageHeader eyebrow="AIRAVAT Morning Intelligence" title="Daily briefing" subtitle={<>Generated {istTime(b.generated_at)} · session <strong>{b.market.status}</strong> · <SimBadge label="Simulated sandbox data" /></>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {b.indices.map((i) => <div key={i.symbol} className="m-crystal p-4"><div className="text-xs text-muted">{i.symbol}</div><div className="tnum font-display text-2xl font-semibold">{price(i.ltp)}</div><div className={clsx("tnum text-sm", i.change_pct >= 0 ? "text-profit" : "text-loss")}>{pct(i.change_pct)}</div></div>)}
        <div className="m-crystal p-4"><div className="text-xs text-muted">Breadth (NSE EQ, simulated)</div><div className="mt-1 flex gap-3 text-lg"><span className="text-profit">▲ {b.breadth.up}</span><span className="text-loss">▼ {b.breadth.down}</span><span className="text-muted">= {b.breadth.flat}</span></div></div>
        <div className="m-crystal p-4"><div className="text-xs text-muted">Next holidays</div>{b.upcoming_holidays.length === 0 ? <div className="text-sm text-muted">None within 60 days in the loaded calendar</div> : b.upcoming_holidays.slice(0, 2).map((h) => <div key={h.day} className="text-sm">{h.day} · {h.description}</div>)}</div>
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Card title="Top movers" subtitle="Simulated session">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>{b.gainers.map((g) => <Link key={g.symbol} href={`/markets/${g.symbol}`} className="tnum flex justify-between py-1 hover:text-accent"><span>{g.symbol}</span><span className="text-profit">{pct(g.change_pct)}</span></Link>)}</div>
            <div>{b.losers.map((g) => <Link key={g.symbol} href={`/markets/${g.symbol}`} className="tnum flex justify-between py-1 hover:text-accent"><span>{g.symbol}</span><span className="text-loss">{pct(g.change_pct)}</span></Link>)}</div>
          </div>
        </Card>
        <Card title="Sector pulse">{b.sectors.map((s) => <div key={s.sector} className="flex justify-between py-1 text-sm"><span>{s.sector}</span><span className={clsx("tnum", s.avg_change_pct >= 0 ? "text-profit" : "text-loss")}>{pct(s.avg_change_pct)}</span></div>)}</Card>
        <Card title="Scanner highlights" subtitle="Observations, not recommendations">
          {b.scanner_highlights.length === 0 ? <p className="text-sm text-muted">No scanner matches recorded today yet.</p> : b.scanner_highlights.map((s, i) => <div key={i} className="flex justify-between py-1 text-sm"><span>{s.symbol}</span><span className="text-xs text-muted">{s.scanner}</span></div>)}
          <Link href="/login?next=/app/scanners" className="mt-3 inline-block text-xs text-accent">Open Scanner Matrix →</Link>
        </Card>
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.618fr]">
        <Card title="Commodities & currency" subtitle="Research-only simulated instruments; trading not enabled">
          {b.commodities_fx.map((c) => <div key={c.symbol} className="flex justify-between py-1 text-sm"><span>{c.symbol} <Badge>{c.segment}</Badge></span><span className="tnum">{price(c.ltp)} <span className={c.change_pct >= 0 ? "text-profit" : "text-loss"}>{pct(c.change_pct)}</span></span></div>)}
        </Card>
        <Card title="From AIRAVAT DAILY" action={<Link href="/daily" className="text-xs text-accent">All articles →</Link>}>
          {b.latest_articles.length === 0 ? <p className="text-sm text-muted">No published articles yet. The newsroom publishes after editorial and compliance approval.</p> : (
            <ul className="space-y-3">{b.latest_articles.map((a) => <li key={a.slug}><Link href={`/daily/${a.slug}`} className="font-medium hover:text-accent">{a.title}</Link><div className="text-xs text-faint">{a.category ?? "Journal"} · {istTime(a.published_at)}</div></li>)}</ul>
          )}
        </Card>
      </div>
      <p className="mt-6 text-xs text-faint">This briefing is computed from AIRAVAT&apos;s sandbox engine and published journal content. No external news or disclosure feeds are connected; nothing here explains causes of market moves.</p>
    </div>
  );
}
