import Link from "next/link";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/server";
import { changeOf, money, pct, price } from "@/lib/format";
import { metadataFor, seoFor } from "@/lib/seo";
import { Notice, PageHeader, SimBadge } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/site/ContentPageView";

export const metadata = { ...metadataFor("/invest/etfs-reits") };
type Row = { instrument_id: number; kind: string; underlying: string; expense_ratio_pct: number | null; inav: number | null; distribution_yield_pct: number | null; aum_cr: number; tracking_error_pct: number | null; source: string; instrument: { symbol: string; name: string; quote: { ltp: number; prev_close: number; volume: number } | { ltp: number; prev_close: number; volume: number }[] | null } | null };

export default async function EtfsReits() {
  const supabase = await createClient();
  const { data } = await supabase.from("etf_reit_meta").select("*, instrument:instruments(symbol, name, quote:quotes(ltp, prev_close, volume))");
  const rows = ((data ?? []) as unknown as Row[]).map((r) => { const q = Array.isArray(r.instrument?.quote) ? r.instrument?.quote[0] : r.instrument?.quote; return { ...r, symbol: r.instrument?.symbol ?? "", name: r.instrument?.name ?? "", ltp: Number(q?.ltp ?? 0), prev: Number(q?.prev_close ?? 0), volume: Number(q?.volume ?? 0) }; });
  const etfs = rows.filter((r) => r.kind === "etf"); const trusts = rows.filter((r) => r.kind !== "etf");
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/invest/etfs-reits", label: "Invest" }, { href: "#", label: "ETFs, REITs & InvITs" }]} />
      <PageHero variant="universe" intro={seoFor("/invest/etfs-reits").intro}><PageHeader eyebrow="Invest" title="ETFs, REITs and InvITs" subtitle={<span className="inline-flex items-center gap-2">Exchange-traded funds and listed trusts <SimBadge /></span>} /></PageHero>
      <h2 className="font-display text-xl font-semibold">Exchange-traded funds</h2>
      <div className="glass mt-3 overflow-x-auto p-2">
        <table className="table text-sm"><thead><tr><th>ETF</th><th>Tracks</th><th className="num">Price</th><th className="num">Change</th><th className="num">iNAV</th><th className="num">Premium / discount</th><th className="num">Expense</th><th className="num">Tracking error</th><th className="num">AUM (₹ cr)</th><th className="num">Yield</th></tr></thead>
          <tbody>{etfs.map((r) => { const c = changeOf(r.ltp, r.prev); const prem = r.inav ? ((r.ltp - Number(r.inav)) / Number(r.inav)) * 100 : null; return <tr key={r.instrument_id}><td><Link href={`/markets/${r.symbol}`} className="font-semibold hover:text-accent">{r.symbol}</Link><div className="text-xs text-muted">{r.name}</div></td><td className="text-muted">{r.underlying}</td><td className="num">{price(r.ltp)}</td><td className={clsx("num", c.change >= 0 ? "text-profit" : "text-loss")}>{pct(c.changePct)}</td><td className="num">{r.inav ? Number(r.inav).toFixed(2) : "—"}</td><td className={clsx("num", prem !== null && Math.abs(prem) > 0.5 ? "text-warn" : "")}>{prem === null ? "—" : `${prem >= 0 ? "+" : ""}${prem.toFixed(2)}%`}</td><td className="num">{r.expense_ratio_pct !== null ? `${Number(r.expense_ratio_pct).toFixed(2)}%` : "—"}</td><td className="num">{r.tracking_error_pct !== null ? `${Number(r.tracking_error_pct).toFixed(2)}%` : "—"}</td><td className="num">{Number(r.aum_cr).toLocaleString("en-IN")}</td><td className="num">{r.distribution_yield_pct !== null ? `${Number(r.distribution_yield_pct).toFixed(2)}%` : "—"}</td></tr>; })}</tbody></table>
      </div>
      <h2 id="reits" className="font-display mt-8 text-xl font-semibold">REITs and InvITs</h2>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {trusts.map((r) => { const c = changeOf(r.ltp, r.prev); const units = Math.floor(100000 / r.ltp); return (
          <div key={r.instrument_id} className="glass p-5">
            <div className="flex items-start justify-between gap-2"><div><div className="font-display font-semibold">{r.name}</div><div className="text-xs text-muted">{r.kind.toUpperCase()} · {r.underlying}</div></div><div className="text-right"><div className="tnum font-display text-xl">{price(r.ltp)}</div><div className={clsx("tnum text-xs", c.change >= 0 ? "text-profit" : "text-loss")}>{pct(c.changePct)}</div></div></div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm"><dt className="text-muted">Distribution yield</dt><dd className="tnum">{Number(r.distribution_yield_pct).toFixed(2)}%</dd><dt className="text-muted">Market cap (sim)</dt><dd className="tnum">{money(Number(r.aum_cr) * 1e7, { compact: true })}</dd><dt className="text-muted">₹1 lakh buys</dt><dd className="tnum">{units} units → {money((units * r.ltp * Number(r.distribution_yield_pct)) / 100)} a year</dd></dl>
            <Link href={`/markets/${r.symbol}`} className="mt-3 inline-block text-xs text-accent">Instrument page →</Link>
          </div>); })}
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        <div className="glass p-5"><div className="font-display font-semibold">Price vs iNAV</div><p className="mt-2 text-sm text-muted">An ETF&apos;s indicative NAV is published through the day. Buying far above iNAV means paying a premium the index will not return; limit orders near iNAV avoid this.</p></div>
        <div className="glass p-5"><div className="font-display font-semibold">REIT and InvIT income</div><p className="mt-2 text-sm text-muted">Trusts must distribute at least 90% of net distributable cash flows. Distributions are split into interest, dividend and capital return, each taxed differently.</p></div>
        <div className="glass p-5"><div className="font-display font-semibold">Liquidity</div><p className="mt-2 text-sm text-muted">Spreads on thinly traded ETFs can exceed the expense ratio; check volume before trading.</p></div>
      </div>
      <div className="mt-5"><Notice tone="warn">Research-only SIMULATED SAMPLE instruments from fictional issuers. ETF, REIT and InvIT trading uses the equity segment once membership exists.</Notice></div>
    </div>
  );
}
