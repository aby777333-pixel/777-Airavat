import Link from "next/link";
import clsx from "clsx";
import { getQuotes } from "@/lib/market";
import { createClient } from "@/lib/supabase/server";
import { upcomingExpiries } from "@/lib/markets-hub";
import { isoAgo } from "@/lib/time";
import { changeOf, money, pct, price } from "@/lib/format";
import { metadataFor, seoFor } from "@/lib/seo";
import { Notice, PageHeader, SimBadge } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { MarketCrumbs } from "../_shared";
import FoHub from "./FoHub";

export const metadata = { ...metadataFor("/markets/derivatives") };

export default async function Derivatives() {
  const supabase = await createClient();
  const [rows, { data: fii }] = await Promise.all([getQuotes(), supabase.from("fii_dii_activity").select("*").order("day", { ascending: false }).limit(10)]);
  const indices = rows.filter((r) => r.segment === "INDEX" && ["NIFTY 50", "NIFTY BANK", "NIFTY FIN SERVICE", "NIFTY IT"].includes(r.symbol)).map((r) => ({ symbol: r.symbol, ltp: Number(r.quote.ltp), prev_close: Number(r.quote.prev_close) }));
  const vix = rows.find((r) => r.symbol === "INDIA VIX");
  const expiries = upcomingExpiries();
  const stockFo = rows.filter((r) => r.segment === "EQ").slice(0, 50);
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <MarketCrumbs label="F&O hub" />
      <PageHero variant="research" intro={seoFor("/markets/derivatives").intro}><PageHeader eyebrow="Derivatives" title="Futures &amp; Options hub" subtitle={<span className="inline-flex flex-wrap items-center gap-3">Index option chain · OI analytics · expiries · FII positioning <SimBadge /></span>} /></PageHero>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {indices.map((i) => { const c = changeOf(i.ltp, i.prev_close); return <div key={i.symbol} className="glass p-4"><div className="text-xs text-muted">{i.symbol}</div><div className="tnum font-display text-xl">{price(i.ltp)}</div><div className={clsx("tnum text-xs", c.change >= 0 ? "text-profit" : "text-loss")}>{pct(c.changePct)}</div></div>; })}
        {vix && <div className="glass p-4"><div className="text-xs text-muted">INDIA VIX</div><div className="tnum font-display text-xl">{Number(vix.quote.ltp).toFixed(2)}</div><div className={clsx("tnum text-xs", changeOf(vix.quote.ltp, vix.quote.prev_close).change >= 0 ? "text-loss" : "text-profit")}>{pct(changeOf(vix.quote.ltp, vix.quote.prev_close).changePct)} · expected 30-day volatility</div></div>}
      </div>
      <h2 className="font-display mt-8 text-xl font-semibold">Option chain (simulated)</h2>
      <div className="mt-3"><FoHub indices={indices} expiries={expiries} nowMs={new Date(isoAgo(0)).getTime()} /></div>
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <div className="glass p-5">
          <div className="font-display font-semibold">Expiry ladder</div>
          <ul className="mt-2 divide-y divide-border text-sm">{expiries.map((e) => <li key={e.date} className="flex justify-between py-1.5"><span>{e.label}</span><span className="tnum text-muted">{e.date}</span></li>)}</ul>
          <p className="mt-2 text-xs text-faint">Weekly index expiries fall on Thursday and monthly contracts on the last Thursday; a holiday moves the expiry to the previous trading day.</p>
        </div>
        <div className="glass p-5">
          <div className="font-display font-semibold">FII derivative positioning (net, ₹ crore)</div>
          <table className="table mt-2 text-xs"><thead><tr><th>Day</th><th className="num">Index futures</th><th className="num">Index options</th><th className="num">Stock futures</th></tr></thead>
            <tbody>{(fii ?? []).map((f) => <tr key={f.day}><td>{f.day}</td>{[f.fii_index_fut_net_cr, f.fii_index_opt_net_cr, f.fii_stock_fut_net_cr].map((v, i) => <td key={i} className={clsx("num", Number(v) >= 0 ? "text-profit" : "text-loss")}>{Number(v).toFixed(0)}</td>)}</tr>)}</tbody></table>
          <Link href="/markets/fii-dii" className="mt-2 inline-block text-xs text-accent">Full FII/DII page →</Link>
        </div>
      </div>
      <h2 className="font-display mt-8 text-xl font-semibold">Stock F&O universe and rollover tracker</h2>
      <div className="glass mt-3 overflow-x-auto p-2"><table className="table text-xs"><thead><tr><th>Stock</th><th className="num">Spot</th><th className="num">Lot (sim)</th><th className="num">Contract value</th><th className="num">Rollover % (sim)</th><th className="num">Cost of carry</th></tr></thead>
        <tbody>{stockFo.map((r, i) => { const lot = Math.max(50, Math.round(500000 / Number(r.quote.ltp) / 25) * 25); const roll = 55 + ((i * 37) % 40); const coc = 0.3 + ((i * 13) % 50) / 100; return <tr key={r.id}><td><Link href={`/markets/${r.symbol}`} className="font-semibold hover:text-accent">{r.symbol}</Link></td><td className="num">{price(r.quote.ltp)}</td><td className="num">{lot}</td><td className="num">{money(lot * Number(r.quote.ltp), { compact: true })}</td><td className="num">{roll}%</td><td className="num">{coc.toFixed(2)}%</td></tr>; })}</tbody></table></div>
      <div className="mt-5"><Notice tone="warn">Research only. The chain is priced by Black-Scholes from the simulated index level and a volatility surface; OI, rollover and cost-of-carry are SIMULATED SAMPLE values. F&O trading is not enabled in the sandbox. Try strategies in the <Link href="/tools/options-payoff-calculator" className="underline">Options Lab</Link>.</Notice></div>
    </div>
  );
}
