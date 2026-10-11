import Link from "next/link";
import clsx from "clsx";
import { requireUser } from "@/lib/auth";
import { getAccount, getFunds } from "@/lib/account";
import { getQuotes } from "@/lib/market";
import { xirr } from "@/lib/calculators";
import { istTime, money, pct } from "@/lib/format";
import { Badge, Card, Empty, Notice, PageHeader, Stat } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { grantPortfolioView, mtfClose, mtfConvert, pledgeHoldings, revokePortfolioView, unpledgeHoldings } from "./actions";

type Snap = { day: string; cash: string; holdings_value: string; positions_mtm: string; total: string; benchmark_level: string | null };

export default async function Portfolio() {
  const { supabase, user } = await requireUser("/app/portfolio");
  const account = await getAccount(supabase, user.id);
  if (!account) return <Empty title="No sandbox account" cta={{ href: "/app/onboarding", label: "Complete onboarding" }} />;
  const [funds, { data: holdings }, { data: trades }, quotes, { data: la }, { data: snaps }, { data: pledges }, { data: mtf }, { data: viewers }, { data: viewing }, { data: mtfDoc }, { data: dividends }] = await Promise.all([
    getFunds(supabase, account.id),
    supabase.from("holdings").select("*, instrument:instruments(symbol,sector)").eq("account_id", account.id).gt("qty", 0),
    supabase.from("trades").select("value,total_charges,side,traded_at").eq("account_id", account.id),
    getQuotes(),
    supabase.from("ledger_accounts").select("id").eq("trading_account_id", account.id).maybeSingle(),
    supabase.from("portfolio_snapshots").select("day,cash,holdings_value,positions_mtm,total,benchmark_level").eq("account_id", account.id).order("day", { ascending: true }).limit(400),
    supabase.from("pledges").select("*, instrument:instruments(symbol)").eq("account_id", account.id).eq("status", "pledged").order("pledged_at", { ascending: false }),
    supabase.from("mtf_positions").select("*, instrument:instruments(symbol)").eq("account_id", account.id).order("opened_at", { ascending: false }),
    supabase.from("portfolio_viewers").select("*").eq("owner_id", user.id).neq("status", "revoked").order("created_at"),
    supabase.from("portfolio_viewers").select("id, owner_id, status, owner:profiles!portfolio_viewers_owner_id_fkey(full_name,email)").eq("viewer_id", user.id).eq("status", "active"),
    supabase.from("consents").select("id, document:legal_documents!inner(slug)").eq("user_id", user.id).eq("document.slug", "mtf-agreement").maybeSingle(),
    supabase.from("journal_entries").select("id,narration,posted_at,ref_type").eq("ref_type", "corporate_action").order("posted_at", { ascending: false }).limit(50),
  ]);
  const flows = la ? (await supabase.from("journal_lines").select("debit,credit, entry:journal_entries!inner(ref_type,posted_at)").eq("ledger_account_id", la.id).eq("entry.ref_type", "fund_transaction")).data ?? [] : [];
  const q = new Map(quotes.map((x) => [x.id, x.quote]));
  const rows = (holdings ?? []).map((h) => ({ sector: (h.instrument as unknown as { sector: string }).sector ?? "Other", symbol: (h.instrument as unknown as { symbol: string }).symbol, qty: Number(h.qty), value: Number(h.qty) * Number(q.get(h.instrument_id)?.ltp ?? 0), invested: Number(h.qty) * Number(h.avg_price) }));
  const equity = rows.reduce((s, r) => s + r.value, 0);
  const pledgedValue = (pledges ?? []).reduce((s, p) => s + Number(p.qty) * Number(q.get(p.instrument_id)?.ltp ?? 0), 0);
  const mtfOpen = (mtf ?? []).filter((m) => m.status === "open");
  const mtfValue = mtfOpen.reduce((s, m) => s + Number(m.qty) * Number(q.get(m.instrument_id)?.ltp ?? 0), 0);
  const mtfFunded = mtfOpen.reduce((s, m) => s + Number(m.funded_amount), 0);
  const total = equity + pledgedValue + mtfValue - mtfFunded + Number(funds.ledger_balance);
  const sectors = new Map<string, number>(); rows.forEach((r) => sectors.set(r.sector, (sectors.get(r.sector) ?? 0) + r.value));
  const top = [...rows].sort((a, b) => b.value - a.value).slice(0, 5);
  const concentration = equity ? (top[0]?.value ?? 0) / equity : 0;
  const charges = (trades ?? []).reduce((s, t) => s + Number(t.total_charges), 0);
  const turnover = (trades ?? []).reduce((s, t) => s + Number(t.value), 0);
  // XIRR over pay-ins (credits to the client ledger) and pay-outs (debits), with today's net worth as the terminal value.
  const cashFlows = flows.map((f) => ({ date: (f.entry as unknown as { posted_at: string }).posted_at, amount: Number(f.debit) - Number(f.credit) })).filter((f) => f.amount !== 0).sort((a, b) => a.date.localeCompare(b.date));
  const rate = cashFlows.length ? xirr([...cashFlows, { date: new Date(), amount: total }]) : null;
  const series = ((snaps ?? []) as Snap[]);
  const first = series[0]; const last = series[series.length - 1];
  const portRet = first && last && Number(first.total) ? ((Number(last.total) - Number(first.total)) / Number(first.total)) * 100 : null;
  const benchRet = first?.benchmark_level && last?.benchmark_level ? ((Number(last.benchmark_level) - Number(first.benchmark_level)) / Number(first.benchmark_level)) * 100 : null;
  const divs = (dividends ?? []).filter((d) => /dividend/i.test(d.narration) && d.narration.includes(account.client_code));
  const spark = series.slice(-60);
  const minT = Math.min(...spark.map((s) => Number(s.total)), Infinity); const maxT = Math.max(...spark.map((s) => Number(s.total)), -Infinity);

  return (
    <>
      <PageHeader eyebrow="Portfolio" title="Portfolio and wealth" subtitle="Allocation, XIRR, benchmark comparison, collateral, margin funding and family access, computed from your simulated ledger and holdings." action={<Link href="/app/reports" className="btn btn-primary btn-sm">Reports, tax P&L and statements</Link>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Net worth (sandbox)" value={money(total)} sub={`Cash ${money(funds.ledger_balance)} + equity ${money(equity + pledgedValue + mtfValue)}${mtfFunded ? ` − MTF ${money(mtfFunded)}` : ""}`} />
        <Stat label="XIRR since first pay-in" value={rate === null ? "—" : `${rate.toFixed(2)}%`} sub={cashFlows.length ? `${cashFlows.length} cash flow${cashFlows.length === 1 ? "" : "s"} · money-weighted` : "Add funds to compute"} tone={rate === null ? "default" : rate >= 0 ? "profit" : "loss"} />
        <Stat label="Largest single holding" value={pct(concentration * 100, 1).replace("+", "")} tone={concentration > 0.4 ? "loss" : "default"} sub={concentration > 0.4 ? "Concentration risk: above 40%" : top[0]?.symbol ?? "—"} />
        <Stat label="Charges paid / turnover" value={money(charges)} sub={turnover ? `${((charges / turnover) * 100).toFixed(3)}% of ${money(turnover, { compact: true })}` : "No trades yet"} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card title="Portfolio vs benchmark" subtitle="Daily snapshots at 16:05 IST against the simulated NIFTY 50 level" action={<Badge tone="sim">simulated</Badge>}>
          {series.length < 2 ? <p className="text-sm text-muted">The first snapshot was taken today; the comparison appears from the second trading day. Snapshots so far: {series.length}.</p> : (
            <>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div><div className="text-xs text-muted">Portfolio</div><div className={clsx("tnum font-semibold", (portRet ?? 0) >= 0 ? "text-profit" : "text-loss")}>{portRet === null ? "—" : pct(portRet)}</div></div>
                <div><div className="text-xs text-muted">NIFTY 50 (sim)</div><div className={clsx("tnum font-semibold", (benchRet ?? 0) >= 0 ? "text-profit" : "text-loss")}>{benchRet === null ? "—" : pct(benchRet)}</div></div>
                <div><div className="text-xs text-muted">Alpha</div><div className={clsx("tnum font-semibold", (portRet ?? 0) - (benchRet ?? 0) >= 0 ? "text-profit" : "text-loss")}>{portRet === null || benchRet === null ? "—" : pct(portRet - benchRet)}</div></div>
              </div>
              <svg viewBox="0 0 300 80" className="mt-3 h-20 w-full" aria-label="Net worth sparkline">
                <polyline fill="none" stroke="var(--accent)" strokeWidth="1.5" points={spark.map((s, i) => `${(i / Math.max(1, spark.length - 1)) * 300},${80 - ((Number(s.total) - minT) / Math.max(1, maxT - minT)) * 70 - 5}`).join(" ")} />
              </svg>
              <div className="mt-1 flex justify-between text-[11px] text-faint"><span>{first.day}</span><span>{last.day}</span></div>
            </>
          )}
        </Card>
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
        <Card title="Dividend and corporate-action credits" subtitle="Posted by the corporate-actions job to your ledger">
          {divs.length === 0 ? <p className="text-sm text-muted">No dividend credits yet. Simulated dividends post on their record dates (see Markets → Corporate actions).</p> : (
            <ul className="space-y-1 text-sm">{divs.slice(0, 8).map((d) => <li key={d.id} className="flex justify-between gap-3"><span>{d.narration}</span><span className="text-xs text-muted">{istTime(d.posted_at, true)}</span></li>)}</ul>
          )}
        </Card>
      </div>

      <h2 className="mt-8 font-display text-lg font-semibold">Collateral, margin funding and access</h2>
      <div className="mt-3 grid gap-5 lg:grid-cols-3">
        <Card title="Pledge for collateral" subtitle="Pledged shares leave free holdings and count after a 20% haircut">
          <ActionForm action={pledgeHoldings} successText="Pledged." className="flex flex-wrap items-end gap-2 text-sm">
            <label className="flex-1">Symbol<select name="symbol" className="select mt-1 w-full">{rows.map((r) => <option key={r.symbol} value={r.symbol}>{r.symbol} ({r.qty})</option>)}</select></label>
            <label className="w-24">Qty<input name="qty" type="number" min={1} defaultValue={1} className="input mt-1 w-full" /></label>
            <button className="btn btn-primary btn-sm" disabled={rows.length === 0}>Pledge</button>
          </ActionForm>
          <div className="mt-3 text-xs text-muted">Collateral value {money(pledgedValue * 0.8)} on {money(pledgedValue)} pledged.</div>
          {(pledges ?? []).length > 0 && (
            <table className="table mt-2 text-xs"><thead><tr><th>Ref</th><th>Symbol</th><th className="num">Qty</th><th></th></tr></thead>
              <tbody>{(pledges ?? []).map((p) => <tr key={p.id}><td className="font-mono">{p.reference}</td><td>{(p.instrument as unknown as { symbol: string }).symbol}</td><td className="num">{p.qty}</td><td className="text-right"><ActionForm action={unpledgeHoldings}><input type="hidden" name="id" value={p.id} /><button className="btn btn-ghost btn-sm">Unpledge</button></ActionForm></td></tr>)}</tbody></table>
          )}
        </Card>
        <Card title="Margin Trading Facility (sandbox)" subtitle="50% broker-funded against the shares; 18% p.a. accrued daily to your ledger">
          {!mtfDoc ? <Notice tone="info">Accept the <Link href="/app/consents" className="underline">MTF agreement</Link> in the consent vault to enable funding.</Notice> : (
            <ActionForm action={mtfConvert} successText="Converted to MTF." className="flex flex-wrap items-end gap-2 text-sm">
              <label className="flex-1">Symbol<select name="symbol" className="select mt-1 w-full">{rows.map((r) => <option key={r.symbol} value={r.symbol}>{r.symbol} ({r.qty})</option>)}</select></label>
              <label className="w-24">Qty<input name="qty" type="number" min={1} defaultValue={1} className="input mt-1 w-full" /></label>
              <button className="btn btn-primary btn-sm" disabled={rows.length === 0}>Fund</button>
            </ActionForm>
          )}
          {(mtf ?? []).length > 0 && (
            <table className="table mt-3 text-xs"><thead><tr><th>Symbol</th><th className="num">Qty</th><th className="num">Funded</th><th className="num">Interest</th><th>Status</th><th></th></tr></thead>
              <tbody>{(mtf ?? []).slice(0, 10).map((m) => <tr key={m.id}><td>{(m.instrument as unknown as { symbol: string }).symbol}</td><td className="num">{m.qty}</td><td className="num">{money(m.funded_amount)}</td><td className="num">{money(m.interest_accrued)}</td><td><Badge tone={m.status === "open" ? "info" : "default"}>{m.status}</Badge></td><td className="text-right">{m.status === "open" && <ActionForm action={mtfClose}><input type="hidden" name="id" value={m.id} /><button className="btn btn-ghost btn-sm">Repay</button></ActionForm>}</td></tr>)}</tbody></table>
          )}
        </Card>
        <Card title="Family and authorised views" subtitle="Read-only access to your portfolio for a trusted person">
          <ActionForm action={grantPortfolioView} successText="Access granted (active once they sign in)." className="flex items-end gap-2 text-sm">
            <label className="flex-1">Email<input name="email" type="email" required className="input mt-1 w-full" placeholder="family@example.com" /></label>
            <button className="btn btn-primary btn-sm">Grant</button>
          </ActionForm>
          {(viewers ?? []).length > 0 && <ul className="mt-3 space-y-1 text-sm">{(viewers ?? []).map((v) => <li key={v.id} className="flex items-center justify-between gap-2"><span>{v.viewer_email} <Badge tone={v.status === "active" ? "ok" : "info"}>{v.status}</Badge></span><ActionForm action={revokePortfolioView}><input type="hidden" name="id" value={v.id} /><button className="btn btn-ghost btn-sm">Revoke</button></ActionForm></li>)}</ul>}
          {(viewing ?? []).length > 0 && <div className="mt-4 border-t border-border pt-3 text-sm"><div className="mb-1 text-xs uppercase tracking-wider text-faint">Portfolios shared with you</div>{(viewing ?? []).map((v) => { const o = v.owner as unknown as { full_name: string; email: string } | null; return <Link key={v.id} href={`/app/family/${v.owner_id}`} className="block hover:text-accent">{o?.full_name ?? o?.email ?? v.owner_id} →</Link>; })}</div>}
        </Card>
      </div>
      <div className="mt-5"><Notice tone="info">All figures derive from the sandbox ledger. Pledge, MTF and family views follow the same authorisation rules in SQL as production would; depository and lender integrations are simulated.</Notice></div>
    </>
  );
}
