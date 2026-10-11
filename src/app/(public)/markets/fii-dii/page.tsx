import clsx from "clsx";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/format";
import { metadataFor, seoFor } from "@/lib/seo";
import { Notice, PageHeader, SimBadge } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { MarketCrumbs } from "../_shared";

export const metadata = { ...metadataFor("/markets/fii-dii") };

export default async function FiiDii() {
  const supabase = await createClient();
  const { data } = await supabase.from("fii_dii_activity").select("*").order("day", { ascending: false }).limit(45);
  const rows = (data ?? []).map((r) => ({ ...r, fii_net: Number(r.fii_buy_cr) - Number(r.fii_sell_cr), dii_net: Number(r.dii_buy_cr) - Number(r.dii_sell_cr) }));
  const sum = (k: "fii_net" | "dii_net", n: number) => rows.slice(0, n).reduce((s, r) => s + r[k], 0);
  const maxAbs = Math.max(1, ...rows.map((r) => Math.max(Math.abs(r.fii_net), Math.abs(r.dii_net))));
  const chart = [...rows].reverse();
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <MarketCrumbs label="FII / DII activity" />
      <PageHero variant="briefing" intro={seoFor("/markets/fii-dii").intro}><PageHeader eyebrow="Flows" title="FII and DII activity" subtitle={<span className="inline-flex items-center gap-2">Cash market net buying and FII derivative positions <SimBadge /></span>} /></PageHero>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[["FII net · today", sum("fii_net", 1)], ["DII net · today", sum("dii_net", 1)], ["FII net · 5 days", sum("fii_net", 5)], ["DII net · 5 days", sum("dii_net", 5)], ["FII net · month (20d)", sum("fii_net", 20)], ["DII net · month (20d)", sum("dii_net", 20)], ["FII index futures net · today", Number(rows[0]?.fii_index_fut_net_cr ?? 0)], ["FII index options net · today", Number(rows[0]?.fii_index_opt_net_cr ?? 0)]].map(([k, v]) => <div key={String(k)} className="glass p-4"><div className="text-xs text-muted">{k}</div><div className={clsx("tnum text-lg font-semibold", Number(v) >= 0 ? "text-profit" : "text-loss")}>{Number(v) >= 0 ? "+" : ""}{money(Number(v) * 1e7, { compact: true })}</div></div>)}
      </div>
      <div className="glass mt-6 p-5">
        <div className="font-display font-semibold">Net cash activity, last {chart.length} sessions (₹ crore)</div>
        <svg viewBox={`0 0 ${chart.length * 16} 160`} className="mt-3 h-44 w-full" aria-label="FII and DII net activity bars">
          <line x1="0" x2={chart.length * 16} y1="80" y2="80" stroke="var(--border-strong)" />
          {chart.map((r, i) => { const hf = (r.fii_net / maxAbs) * 70; const hd = (r.dii_net / maxAbs) * 70; return (<g key={r.day}><rect x={i * 16 + 2} width="5" y={hf >= 0 ? 80 - hf : 80} height={Math.abs(hf)} fill={hf >= 0 ? "var(--profit)" : "var(--loss)"} opacity="0.9"><title>{r.day} FII {r.fii_net.toFixed(0)}</title></rect><rect x={i * 16 + 8} width="5" y={hd >= 0 ? 80 - hd : 80} height={Math.abs(hd)} fill="var(--accent)" opacity="0.8"><title>{r.day} DII {r.dii_net.toFixed(0)}</title></rect></g>); })}
        </svg>
        <div className="mt-1 flex gap-4 text-xs text-muted"><span><span className="inline-block h-2 w-3 bg-profit" /> FII net (red when selling)</span><span><span className="inline-block h-2 w-3 bg-accent" /> DII net</span></div>
      </div>
      <div className="glass mt-6 overflow-x-auto p-2">
        <table className="table text-sm"><thead><tr><th>Date</th><th className="num">FII buy</th><th className="num">FII sell</th><th className="num">FII net</th><th className="num">DII buy</th><th className="num">DII sell</th><th className="num">DII net</th><th className="num">FII idx fut</th><th className="num">FII idx opt</th><th className="num">FII stk fut</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.day}><td>{r.day}</td><td className="num">{Number(r.fii_buy_cr).toLocaleString("en-IN")}</td><td className="num">{Number(r.fii_sell_cr).toLocaleString("en-IN")}</td><td className={clsx("num font-semibold", r.fii_net >= 0 ? "text-profit" : "text-loss")}>{r.fii_net.toFixed(0)}</td><td className="num">{Number(r.dii_buy_cr).toLocaleString("en-IN")}</td><td className="num">{Number(r.dii_sell_cr).toLocaleString("en-IN")}</td><td className={clsx("num font-semibold", r.dii_net >= 0 ? "text-profit" : "text-loss")}>{r.dii_net.toFixed(0)}</td><td className="num">{Number(r.fii_index_fut_net_cr).toFixed(0)}</td><td className="num">{Number(r.fii_index_opt_net_cr).toFixed(0)}</td><td className="num">{Number(r.fii_stock_fut_net_cr).toFixed(0)}</td></tr>)}</tbody></table>
      </div>
      <div className="mt-5"><Notice tone="warn">SIMULATED SAMPLE figures in ₹ crore. Provisional FII/DII data is published daily by the exchanges and SEBI; the feed replaces these rows without changing the page.</Notice></div>
    </div>
  );
}
