import Link from "next/link";
import clsx from "clsx";
import { requireUser } from "@/lib/auth";
import { money, price } from "@/lib/format";
import { Badge, Card, Empty, Notice, PageHeader, Stat } from "@/components/ui";

type Fam = { owner: string; client_code: string; funds: { ledger_balance: string }; holdings: { symbol: string; qty: number; avg_price: string; ltp: string; value: string }[]; positions: { symbol: string; product: string; net_qty: number; avg_price: string; ltp: string }[]; read_only: boolean };

// Read-only family / authorised view. Authorisation is enforced by family_portfolio() in SQL.
export default async function FamilyView({ params }: { params: Promise<{ owner: string }> }) {
  const { owner } = await params;
  const { supabase } = await requireUser(`/app/family/${owner}`);
  const { data, error } = await supabase.rpc("family_portfolio", { p_owner: owner });
  if (error || !data) return <Empty title="Not authorised" body="The owner has not granted you access to this portfolio, or the grant was revoked." cta={{ href: "/app/portfolio", label: "Back to portfolio" }} />;
  const f = data as Fam;
  const equity = f.holdings.reduce((s, h) => s + Number(h.value), 0);
  return (
    <>
      <PageHeader eyebrow="Family view" title={`${f.owner} · ${f.client_code}`} subtitle="Read-only. You cannot place orders, move funds or change settings on this account." action={<Link href="/app/portfolio" className="btn btn-ghost btn-sm">← My portfolio</Link>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Cash (ledger)" value={money(f.funds.ledger_balance)} />
        <Stat label="Holdings value" value={money(equity)} />
        <Stat label="Net worth (sandbox)" value={money(equity + Number(f.funds.ledger_balance))} />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title="Holdings" action={<Badge tone="sim">simulated</Badge>}>
          {f.holdings.length === 0 ? <p className="text-sm text-muted">None.</p> : <table className="table text-sm"><thead><tr><th>Symbol</th><th className="num">Qty</th><th className="num">Avg</th><th className="num">LTP</th><th className="num">P&L</th></tr></thead>
            <tbody>{f.holdings.map((h) => { const pnl = (Number(h.ltp) - Number(h.avg_price)) * h.qty; return <tr key={h.symbol}><td className="font-semibold">{h.symbol}</td><td className="num">{h.qty}</td><td className="num">{price(h.avg_price)}</td><td className="num">{price(h.ltp)}</td><td className={clsx("num", pnl >= 0 ? "text-profit" : "text-loss")}>{money(pnl)}</td></tr>; })}</tbody></table>}
        </Card>
        <Card title="Open positions">
          {f.positions.length === 0 ? <p className="text-sm text-muted">None.</p> : <table className="table text-sm"><thead><tr><th>Symbol</th><th>Product</th><th className="num">Net qty</th><th className="num">Avg</th><th className="num">LTP</th></tr></thead>
            <tbody>{f.positions.map((p) => <tr key={`${p.symbol}-${p.product}`}><td className="font-semibold">{p.symbol}</td><td>{p.product}</td><td className="num">{p.net_qty}</td><td className="num">{price(p.avg_price)}</td><td className="num">{price(p.ltp)}</td></tr>)}</tbody></table>}
        </Card>
      </div>
      <div className="mt-5"><Notice tone="info">Access can be revoked by the owner at any time from their portfolio page; every grant and revocation is audited.</Notice></div>
    </>
  );
}
