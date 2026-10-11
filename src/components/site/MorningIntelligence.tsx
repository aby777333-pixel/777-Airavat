import Link from "next/link";
import clsx from "clsx";
import { getBriefing } from "@/lib/daily";
import { istTime, pct } from "@/lib/format";
import { SimBadge } from "@/components/ui";

// Homepage "Morning Intelligence" strip: computed from the sandbox engine and published journal; never narrates causes.
export default async function MorningIntelligence() {
  const b = await getBriefing();
  if (!b) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="m-crystal relative overflow-hidden p-6">
        <span className="aurora-ribbon" aria-hidden="true" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><div className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Morning Intelligence</div><div className="font-display mt-1 text-xl font-semibold">What the sandbox tape says today</div></div>
          <div className="flex items-center gap-2 text-xs text-faint"><SimBadge />Generated {istTime(b.generated_at, false)} IST · session {b.market.status}</div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <div><div className="text-xs text-muted">Breadth</div><div className="mt-1 text-lg"><span className="text-profit">▲ {b.breadth.up}</span> <span className="text-loss">▼ {b.breadth.down}</span></div></div>
          <div><div className="text-xs text-muted">Leading sector</div>{b.sectors[0] && <div className="mt-1 text-lg">{b.sectors[0].sector} <span className={clsx("tnum text-sm", b.sectors[0].avg_change_pct >= 0 ? "text-profit" : "text-loss")}>{pct(b.sectors[0].avg_change_pct)}</span></div>}</div>
          <div><div className="text-xs text-muted">Top gainer / loser</div><div className="mt-1 text-sm">{b.gainers[0] && <span>{b.gainers[0].symbol} <span className="text-profit">{pct(b.gainers[0].change_pct)}</span></span>} · {b.losers[0] && <span>{b.losers[0].symbol} <span className="text-loss">{pct(b.losers[0].change_pct)}</span></span>}</div></div>
          <div><div className="text-xs text-muted">Scanner highlights</div><div className="mt-1 text-sm">{b.scanner_highlights.length === 0 ? <span className="text-muted">none yet</span> : b.scanner_highlights.slice(0, 3).map((s) => s.symbol).join(" · ")}</div></div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <Link href="/briefing" className="btn btn-primary btn-sm">Full briefing</Link>
          <Link href="/daily" className="btn btn-ghost btn-sm">AIRAVAT DAILY</Link>
          <Link href="/research" className="btn btn-ghost btn-sm">Research ONE</Link>
          <Link href="/markets/universe" className="btn btn-ghost btn-sm">Market Atlas</Link>
          <Link href="/showroom" className="btn btn-ghost btn-sm">Showroom</Link>
        </div>
      </div>
    </section>
  );
}
