import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getMarketStatus } from "@/lib/market";
import { istTime, money } from "@/lib/format";
import { isoAgo, isStale } from "@/lib/time";
import { Badge, Card, PageHeader, Stat } from "@/components/ui";

export default async function ControlTower() {
  const { supabase } = await requireStaff("/admin");
  const head = { count: "exact" as const, head: true };
  const [clients, active, kycQ, ordersToday, openOrders, rejected, pendingWd, tickets, recon, ms, lastTick, risk, settle] = await Promise.all([
    supabase.from("profiles").select("*", head),
    supabase.from("trading_accounts").select("*", head).eq("status", "active"),
    supabase.from("kyc_applications").select("*", head).eq("status", "under_review"),
    supabase.from("orders").select("*", head).gte("created_at", isoAgo(86400000)),
    supabase.from("orders").select("*", head).in("status", ["ACKNOWLEDGED", "PARTIALLY_FILLED"]),
    supabase.from("orders").select("*", head).eq("status", "RMS_REJECTED"),
    supabase.from("fund_transactions").select("*", head).eq("status", "PENDING"),
    supabase.from("support_tickets").select("*", head).neq("status", "resolved"),
    supabase.rpc("reconciliation_report"),
    getMarketStatus(),
    supabase.from("quotes").select("updated_at").order("updated_at", { ascending: false }).limit(1),
    supabase.from("risk_limits").select("*").eq("scope", "global").single(),
    supabase.from("settlement_runs").select("*").order("created_at", { ascending: false }).limit(1),
  ]);
  const r = recon.data as { journal_balanced: boolean; client_funds_liability: number; client_bank_asset: number; order_trade_breaks: unknown[]; negative_client_balances: unknown[] } | null;
  const tick = lastTick.data?.[0]?.updated_at;
  const stale = isStale(tick, 3 * 60 * 1000);

  return (
    <>
      <PageHeader eyebrow="AIRAVAT Control Tower" title="Operations overview" subtitle="Real-time view of clients, orders, funds, ledger integrity and system health for the sandbox." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Registered users" value={clients.count ?? 0} sub={`${active.count ?? 0} active sandbox accounts`} />
        <Stat label="KYC awaiting review" value={kycQ.count ?? 0} sub={<Link className="text-accent" href="/admin/kyc">Open queue →</Link>} />
        <Stat label="Orders (24h)" value={ordersToday.count ?? 0} sub={`${openOrders.count ?? 0} open · ${rejected.count ?? 0} RMS rejections all-time`} />
        <Stat label="Payouts pending approval" value={pendingWd.count ?? 0} sub={<Link className="text-accent" href="/admin/funds">Review →</Link>} />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card title="Ledger integrity" subtitle="From reconciliation_report()">
          {r ? (
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between"><span>Journal balanced</span><Badge tone={r.journal_balanced ? "ok" : "bad"}>{r.journal_balanced ? "yes" : "NO"}</Badge></li>
              <li className="flex justify-between"><span>Client funds liability</span><span className="tnum">{money(r.client_funds_liability)}</span></li>
              <li className="flex justify-between"><span>Client bank asset (simulated)</span><span className="tnum">{money(r.client_bank_asset)}</span></li>
              <li className="flex justify-between"><span>Order/trade breaks</span><Badge tone={r.order_trade_breaks.length ? "bad" : "ok"}>{r.order_trade_breaks.length}</Badge></li>
              <li className="flex justify-between"><span>Negative client balances</span><Badge tone={r.negative_client_balances.length ? "bad" : "ok"}>{r.negative_client_balances.length}</Badge></li>
            </ul>
          ) : <p className="text-sm text-loss">Reconciliation unavailable.</p>}
          <Link href="/admin/ledger" className="mt-3 inline-block text-xs text-accent">Trial balance →</Link>
        </Card>
        <Card title="Market & feed" subtitle="Simulated engine">
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span>Session</span><Badge tone={ms.status === "OPEN" ? "ok" : "info"}>{ms.status}</Badge></li>
            <li className="flex justify-between"><span>Accepting orders</span><Badge tone={ms.accepting_orders ? "ok" : "bad"}>{ms.accepting_orders ? "yes" : "no"}</Badge></li>
            <li className="flex justify-between"><span>Last tick</span><span className="text-xs">{istTime(tick)}</span></li>
            <li className="flex justify-between"><span>Feed health</span><Badge tone={stale && ms.accepting_orders ? "bad" : "ok"}>{stale && ms.accepting_orders ? "STALE" : "ok"}</Badge></li>
            <li className="flex justify-between"><span>Exchange connectivity</span><Badge tone="sim">simulated</Badge></li>
          </ul>
        </Card>
        <Card title="Risk & operations">
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span>Kill switch</span><Badge tone={risk.data?.kill_switch ? "bad" : "ok"}>{risk.data?.kill_switch ? "ACTIVE" : "off"}</Badge></li>
            <li className="flex justify-between"><span>MIS allowed</span><Badge tone={risk.data?.allow_mis ? "ok" : "bad"}>{risk.data?.allow_mis ? "yes" : "no"}</Badge></li>
            <li className="flex justify-between"><span>Max order value</span><span className="tnum">{money(risk.data?.max_order_value)}</span></li>
            <li className="flex justify-between"><span>Open support tickets</span><span>{tickets.count ?? 0}</span></li>
            <li className="flex justify-between"><span>Last EOD settlement</span><span className="text-xs">{settle.data?.[0] ? istTime(settle.data[0].created_at) : "never"}</span></li>
            <li className="flex justify-between"><span>Live trading</span><Badge tone="bad">disabled by gate</Badge></li>
          </ul>
        </Card>
      </div>
    </>
  );
}
