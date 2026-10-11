import Link from "next/link";
import clsx from "clsx";
import { requireUser } from "@/lib/auth";
import { getAccount, getFunds, getKyc } from "@/lib/account";
import { getQuotes } from "@/lib/market";
import { changeOf, money, pct, price, istTime } from "@/lib/format";
import { Badge, Card, Empty, Notice, PageHeader, Stat, statusTone } from "@/components/ui";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const sp = await searchParams;
  const { supabase, user, profile } = await requireUser("/app");
  const [account, kyc] = await Promise.all([getAccount(supabase, user.id), getKyc(supabase, user.id)]);

  if (!account) {
    return (
      <>
        <PageHeader eyebrow="Welcome" title={`Namaste, ${profile?.full_name || "there"}`} subtitle="Your login is ready. Complete the simulated KYC application to open a sandbox trading account." />
        {kyc?.status === "under_review" ? (
          <Notice tone="info">Your application is under review by the compliance queue. Status: <strong>{kyc.status}</strong> · submitted {istTime(kyc.submitted_at)}.</Notice>
        ) : kyc?.status === "rejected" ? (
          <Notice tone="bad">Your application was rejected: {kyc.rejection_reason}. You can submit a corrected application.</Notice>
        ) : null}
        <div className="mt-4"><Empty title="Open your sandbox account" body="Two minutes. PAN format, date of birth, address, nominee and declarations. No documents are uploaded and no real KYC is performed." cta={{ href: "/app/onboarding", label: "Start onboarding" }} /></div>
      </>
    );
  }

  const [funds, { data: positions }, { data: holdings }, { data: orders }, watch] = await Promise.all([
    getFunds(supabase, account.id),
    supabase.from("positions").select("*, instrument:instruments(symbol)").eq("account_id", account.id).neq("net_qty", 0),
    supabase.from("holdings").select("*, instrument:instruments(symbol)").eq("account_id", account.id),
    supabase.from("orders").select("id,side,qty,status,created_at,order_type,product,instrument:instruments(symbol)").eq("account_id", account.id).order("created_at", { ascending: false }).limit(6),
    supabase.from("watchlist_items").select("instrument_id, watchlist:watchlists!inner(user_id)").eq("watchlist.user_id", user.id),
  ]);
  const ids = new Set((watch.data ?? []).map((w) => w.instrument_id));
  const quotes = (await getQuotes()).filter((q) => ids.has(q.id));
  const qmap = new Map((await getQuotes()).map((q) => [q.id, q.quote]));
  const holdingsValue = (holdings ?? []).reduce((s, h) => s + Number(h.qty) * Number(qmap.get(h.instrument_id)?.ltp ?? 0), 0);
  const holdingsCost = (holdings ?? []).reduce((s, h) => s + Number(h.qty) * Number(h.avg_price), 0);
  const dayPnl = (positions ?? []).reduce((s, p) => s + Number(p.realized_pnl) + (Number(qmap.get(p.instrument_id)?.ltp ?? 0) - Number(p.avg_price)) * Number(p.net_qty), 0);

  return (
    <>
      {sp.denied && <div className="mb-4"><Notice tone="bad">You do not have access to the admin console.</Notice></div>}
      <PageHeader eyebrow="Dashboard" title={`Namaste, ${profile?.full_name || user.email}`} subtitle={<>Client {account.client_code} · <Badge tone="sim">Sandbox</Badge></>} action={<Link href="/app/markets" className="btn btn-primary">Trade</Link>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Available funds" value={money(funds.available)} sub={`Ledger ${money(funds.ledger_balance)} · blocked ${money(funds.blocked_for_orders)}`} />
        <Stat label="Holdings value" value={money(holdingsValue)} sub={`Invested ${money(holdingsCost)}`} tone={holdingsValue - holdingsCost >= 0 ? "profit" : "loss"} />
        <Stat label="Today's P&L (open + realised)" value={money(dayPnl)} tone={dayPnl >= 0 ? "profit" : "loss"} sub="Marked to simulated LTP" />
        <Stat label="Open positions" value={(positions ?? []).length} sub={`${(holdings ?? []).length} holdings`} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.618fr_1fr]">
        <Card title="Watchlist" subtitle="Simulated quotes" action={<Link href="/app/markets" className="text-xs text-accent">Manage →</Link>}>
          {quotes.length === 0 ? <p className="text-sm text-muted">Your watchlist is empty.</p> : (
            <table className="table">
              <thead><tr><th>Symbol</th><th className="num">LTP</th><th className="num">Change</th><th></th></tr></thead>
              <tbody>{quotes.map((q) => { const c = changeOf(q.quote.ltp, q.quote.prev_close); return (
                <tr key={q.id}><td><Link href={`/app/markets/${encodeURIComponent(q.symbol)}`} className="font-semibold hover:text-accent">{q.symbol}</Link></td>
                  <td className="num">{price(q.quote.ltp)}</td><td className={clsx("num", c.change >= 0 ? "text-profit" : "text-loss")}>{pct(c.changePct)}</td>
                  <td className="text-right">{q.tradable && <Link href={`/app/markets/${encodeURIComponent(q.symbol)}`} className="btn btn-ghost btn-sm">Trade</Link>}</td></tr>); })}</tbody>
            </table>
          )}
        </Card>
        <Card title="Recent orders" action={<Link href="/app/orders" className="text-xs text-accent">All orders →</Link>}>
          {(orders ?? []).length === 0 ? <p className="text-sm text-muted">No orders yet. Place your first simulated order from Market watch.</p> : (
            <ul className="space-y-2 text-sm">
              {(orders ?? []).map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2">
                  <Link href={`/app/orders/${o.id}`} className="hover:text-accent"><span className={clsx("font-semibold", o.side === "BUY" ? "text-buy" : "text-sell")}>{o.side}</span> {o.qty} {(o.instrument as unknown as { symbol: string })?.symbol} · {o.order_type}/{o.product}</Link>
                  <Badge tone={statusTone(o.status)}>{o.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
