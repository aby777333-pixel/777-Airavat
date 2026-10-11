import { requireUser } from "@/lib/auth";
import { getAccount, getFunds } from "@/lib/account";
import { istTime, money } from "@/lib/format";
import { Badge, Card, Empty, PageHeader, Stat, statusTone } from "@/components/ui";
import FundsForms from "./FundsForms";

export default async function Funds() {
  const { supabase, user } = await requireUser("/app/funds");
  const account = await getAccount(supabase, user.id);
  if (!account) return <Empty title="No sandbox account" cta={{ href: "/app/onboarding", label: "Complete onboarding" }} />;
  const [funds, { data: txns }] = await Promise.all([getFunds(supabase, account.id), supabase.from("fund_transactions").select("*").eq("account_id", account.id).order("created_at", { ascending: false }).limit(100)]);
  return (
    <>
      <PageHeader eyebrow="Funds" title="Funds and margins" subtitle="Simulated deposits credit your client ledger instantly. Withdrawals require operations approval by a different staff member (maker-checker)." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Available to trade" value={money(funds.available)} />
        <Stat label="Ledger balance" value={money(funds.ledger_balance)} />
        <Stat label="Blocked (open orders + margin)" value={money(Number(funds.blocked_for_orders) + Number(funds.margin_used))} />
        <Stat label="Withdrawable" value={money(funds.withdrawable)} sub={Number(funds.pending_withdrawals) > 0 ? `Pending withdrawals ${money(funds.pending_withdrawals)}` : undefined} />
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.618fr]">
        <FundsForms withdrawable={Number(funds.withdrawable)} />
        <Card title="Fund transactions">
          {(txns ?? []).length === 0 ? <p className="text-sm text-muted">No transactions yet.</p> : (
            <table className="table text-sm"><thead><tr><th>Time</th><th>Type</th><th className="num">Amount</th><th>Status</th><th>Reference</th></tr></thead>
              <tbody>{(txns ?? []).map((t) => <tr key={t.id}><td className="text-xs text-muted">{istTime(t.created_at)}</td><td>{t.type}</td><td className="num">{money(t.amount)}</td><td><Badge tone={statusTone(t.status)}>{t.status}</Badge></td><td className="text-xs text-muted">{t.bank_reference ?? t.note}</td></tr>)}</tbody></table>
          )}
        </Card>
      </div>
    </>
  );
}
