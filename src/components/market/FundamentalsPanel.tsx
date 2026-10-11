import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getFundamentals, getIndexMemberships, indexSlug } from "@/lib/markets-hub";
import { money } from "@/lib/format";
import { Badge } from "@/components/ui";

// Four financial years of simulated-sample fundamentals, derived ratios at the current price, index memberships and sector peers.
export default async function FundamentalsPanel({ instrumentId, symbol, sector, ltp }: { instrumentId: number; symbol: string; sector: string | null; ltp: number }) {
  const supabase = await createClient();
  const [rows, memberships, { data: peers }] = await Promise.all([getFundamentals(instrumentId), getIndexMemberships(instrumentId), sector ? supabase.from("instruments").select("id, symbol, name, quote:quotes(ltp, prev_close)").eq("segment", "EQ").eq("sector", sector).neq("id", instrumentId).limit(8) : Promise.resolve({ data: [] })]);
  if (rows.length === 0) return null;
  const latest = rows[0];
  const pe = Number(latest.eps) > 0 ? ltp / Number(latest.eps) : null; const pb = Number(latest.book_value_ps) > 0 ? ltp / Number(latest.book_value_ps) : null;
  const mcap = ltp * Number(latest.shares_cr); const dy = Number(latest.dividend_ps) / ltp * 100;
  const growth = rows.length > 1 ? ((Number(rows[0].net_profit_cr) / Number(rows[rows.length - 1].net_profit_cr)) ** (1 / (rows.length - 1)) - 1) * 100 : null;
  return (
    <div className="glass mt-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="font-display font-semibold">Fundamentals</div><Badge tone="sim">{latest.source}</Badge></div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        {[["Market cap", money(mcap * 1e7, { compact: true })], ["P/E (FY2026)", pe ? pe.toFixed(1) : "—"], ["P/B", pb ? pb.toFixed(2) : "—"], ["Dividend yield", `${dy.toFixed(2)}%`], ["ROE", `${Number(latest.roe_pct).toFixed(1)}%`], ["ROCE", `${Number(latest.roce_pct).toFixed(1)}%`], ["Debt / equity", latest.debt_to_equity === null ? "n/a (financial)" : Number(latest.debt_to_equity).toFixed(2)], ["Profit CAGR (3y)", growth === null ? "—" : `${growth.toFixed(1)}%`]].map(([k, v]) => <div key={k} className="rounded-lg border border-border bg-bg/40 p-3"><div className="text-xs text-muted">{k}</div><div className="tnum font-semibold">{v}</div></div>)}
      </div>
      <div className="mt-4 overflow-x-auto"><table className="table text-xs"><thead><tr><th>Year</th><th className="num">Revenue (₹ cr)</th><th className="num">EBITDA (₹ cr)</th><th className="num">Net profit (₹ cr)</th><th className="num">EPS</th><th className="num">Book value</th><th className="num">DPS</th><th className="num">ROE</th><th className="num">Promoter</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.fy}><td className="font-semibold">{r.fy}</td><td className="num">{Number(r.revenue_cr).toLocaleString("en-IN")}</td><td className="num">{Number(r.ebitda_cr).toLocaleString("en-IN")}</td><td className="num">{Number(r.net_profit_cr).toLocaleString("en-IN")}</td><td className="num">{Number(r.eps).toFixed(2)}</td><td className="num">{Number(r.book_value_ps).toFixed(2)}</td><td className="num">{Number(r.dividend_ps).toFixed(2)}</td><td className="num">{Number(r.roe_pct).toFixed(1)}%</td><td className="num">{Number(r.promoter_holding_pct).toFixed(1)}%</td></tr>)}</tbody></table></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div><div className="text-xs font-semibold uppercase tracking-wider text-faint">Index memberships</div><div className="mt-2 flex flex-wrap gap-2">{memberships.map((m) => <Link key={m.index_symbol} href={`/markets/indices/${indexSlug(m.index_symbol)}`} className="badge badge-accent">{m.index_symbol} · {m.weight_pct}%</Link>)}{memberships.length === 0 && <span className="text-xs text-muted">None</span>}</div></div>
        <div><div className="text-xs font-semibold uppercase tracking-wider text-faint">Sector peers</div><div className="mt-2 flex flex-wrap gap-2">{(peers ?? []).map((p) => { const q = (Array.isArray(p.quote) ? p.quote[0] : p.quote) as { ltp: number; prev_close: number } | null; const ch = q ? ((q.ltp - q.prev_close) / q.prev_close) * 100 : 0; return <Link key={p.id} href={`/markets/${p.symbol}`} className="badge">{p.symbol} <span className={ch >= 0 ? "text-profit" : "text-loss"}>{ch >= 0 ? "+" : ""}{ch.toFixed(2)}%</span></Link>; })}</div></div>
      </div>
      <p className="mt-3 text-xs text-faint">{symbol}: figures are generated for the sandbox from the simulated price and a stable per-company seed. They demonstrate the fact sheet, not the company.</p>
    </div>
  );
}
