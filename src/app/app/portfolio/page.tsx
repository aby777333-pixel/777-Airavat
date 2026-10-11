import { requireUser } from "@/lib/auth";
import { getAccount, getFunds } from "@/lib/account";
import { getQuotes } from "@/lib/market";
import { money, pct } from "@/lib/format";
import { Card, Empty, PageHeader, Stat, Notice } from "@/components/ui";
import clsx from "clsx";

export default async function Portfolio() {
  const { supabase, user } = await requireUser("/app/portfolio");
  const account = await getAccount(supabase, user.id);
  if (!account) return <Empty title="No sandbox account" cta={{ href: "/app/onboarding", label: "Complete onboarding" }} />;
  const [funds, { data: holdings }, { data: trades }, quotes] = await Promise.all([
    getFunds(supabase, account.id),
    supabase.from("holdings").select("*, instrument:instruments(symbol,sector)").eq("account_id", account.id).gt("qty", 0),
    supabase.from("trades").select("value,total_charges,side,traded_at").eq("account_id", account.id),
    getQuotes(),
  ]);
  const q = new Map(quotes.map((x) => [x.id, x.quote]));
  const rows = (holdings ?? []).map((h) => ({ sector: (h.instrument as unknown as { sector: string }).sector ?? "Other", symbol: (h.instrument as unknown as { symbol: string }).symbol, value: Number(h.qty) * Number(q.get(h.instrument_id)?.ltp ?? 0), invested: Number(h.qty) * Number(h.avg_price) }));
  const equity = rows.reduce((s, r) => s + r.value, 0);
  const total = equity + Number(funds.ledger_balance);
  const sectors = new Map<string, number>(); rows.forEach((r) => sectors.set(r.sector, (sectors.get(r.sector) ?? 0) + r.value));
  const top = [...rows].sort((a, b) => b.value - a.value).slice(0, 5);
  const concentration = equity ? (top[0]?.value ?? 0) / equity : 0;
  const charges = (trades ?? []).reduce((s, t) => s + Number(t.total_charges), 0);
  const turnover = (trades ?? []).reduce((s, t) => s + Number(t.value), 0);

  return (
    <>
      <PageHeader eyebrow="Portfolio" title="Portfolio health" subtitle="Allocation, concentration and cost of trading, computed from your simulated ledger and holdings." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Net worth (sandbox)" value={money(total)} sub={`Cash ${money(funds.ledger_balance)} + equity ${money(equity)}`} />
        <Stat label="Equity allocation" value={total ? pct((equity / total) * 100, 1).replace("+", "") : "0%"} />
        <Stat label="Largest single holding" value={pct(concentration * 100, 1).replace("+", "")} tone={concentration > 0.4 ? "loss" : "default"} sub={concentration > 0.4 ? "Concentration risk: above 40%" : top[0]?.symbol ?? "—"} />
        <Stat label="Charges paid / turnover" value={money(charges)} sub={turnover ? `${((charges / turnover) * 100).toFixed(3)}% of ${money(turnover, { compact: true })}` : "No trades yet"} />
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card title="Sector allocation">
          {rows.length === 0 ? <p className="text-sm text-muted">No holdings yet.</p> : (
            <div className="space-y-2">{[...sectors.entries()].sort((a, b) => b[1] - a[1]).map(([s, v]) => (
              <div key={s}><div className="flex justify-between text-sm"><span>{s}</span><span className="tnum text-muted">{money(v)} · {((v / equity) * 100).toFixed(1)}%</span></div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-bg"><div className="h-full bg-accent" style={{ width: `${(v / equity) * 100}%` }} /></div></div>))}</div>
          )}
        </Card>
        <Card title="Top holdings">
          {top.length === 0 ? <p className="text-sm text-muted">No holdings yet.</p> : (
            <table className="table text-sm"><thead><tr><th>Symbol</th><th className="num">Value</th><th className="num">Weight</th><th className="num">P&L</th></tr></thead>
              <tbody>{top.map((r) => <tr key={r.symbol}><td className="font-semibold">{r.symbol}</td><td className="num">{money(r.value)}</td><td className="num">{((r.value / equity) * 100).toFixed(1)}%</td><td className={clsx("num", r.value - r.invested >= 0 ? "text-profit" : "text-loss")}>{money(r.value - r.invested)}</td></tr>)}</tbody></table>
          )}
        </Card>
      </div>
      <div className="mt-5"><Notice tone="info">XIRR, benchmark comparison, dividend income, corporate actions and tax P&L require licensed reference data and a settlement history; they are tracked as open requirements.</Notice></div>
    </>
  );
}
