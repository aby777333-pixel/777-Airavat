import Link from "next/link";
import { getQuotes } from "@/lib/market";
import { monthlyExpiries, weeklyExpiries } from "@/lib/options";
import { isoAgo } from "@/lib/time";
import { metadataFor, seoFor } from "@/lib/seo";
import { Notice, PageHeader, SimBadge } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/site/ContentPageView";
import ChainExplorer from "./ChainExplorer";

export const metadata = { ...metadataFor("/markets/option-chain") };
export const dynamic = "force-dynamic";

const LOTS: Record<string, number> = { "NIFTY 50": 50, "NIFTY BANK": 15, "NIFTY FIN SERVICE": 25, "NIFTY IT": 40, RELIANCE: 250, TCS: 175, HDFCBANK: 550, INFY: 400, ICICIBANK: 700, SBIN: 750, ITC: 1600, LT: 150, AXISBANK: 625, KOTAKBANK: 400, BAJFINANCE: 125, TATAMOTORS: 550 };

export default async function OptionChain() {
  const rows = await getQuotes(Object.keys(LOTS));
  const unders = Object.keys(LOTS).map((s) => rows.find((r) => r.symbol === s)).filter((r): r is NonNullable<typeof r> => !!r).map((r) => ({ symbol: r.symbol, ltp: Number(r.quote.ltp), prev_close: Number(r.quote.prev_close), lot: LOTS[r.symbol], kind: (r.segment === "INDEX" ? "index" : "stock") as "index" | "stock" }));
  const now = new Date(isoAgo(0));
  const weekly = weeklyExpiries(now, 4).map((d) => ({ label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), date: d.toISOString(), kind: "weekly" as const }));
  const monthly = monthlyExpiries(now, 3).map((d) => ({ label: `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} (M)`, date: d.toISOString(), kind: "monthly" as const }));
  const expiries = [...weekly, ...monthly.filter((m) => !weekly.some((w) => w.date === m.date))].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/markets", label: "Markets" }, { href: "/markets/option-chain", label: "Option chain" }]} />
      <PageHero variant="research" intro={seoFor("/markets/option-chain").intro}><PageHeader eyebrow="Derivatives" title="Option chain explorer" subtitle={<>Open interest, change in OI, IV smile, Greeks, max pain and a one-click strategy, no account needed <SimBadge /></>} /></PageHero>
      {unders.length ? <ChainExplorer unders={unders} expiries={expiries} nowMs={now.getTime()} /> : <div className="glass p-6 text-sm text-muted">The simulated market is not reachable right now.</div>}
      <div className="mt-5"><Notice tone="info">Simulated chain: strikes, premiums, IV and open interest are generated from a volatility smile around the simulated spot with synthetic OI; change in OI is versus a simulated previous session. Education only. The <Link href="/markets/derivatives" className="underline">F&amp;O hub</Link> has the expiry ladder, rollover and FII/DII data.</Notice></div>
    </div>
  );
}
