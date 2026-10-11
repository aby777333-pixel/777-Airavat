import { requireStaff } from "@/lib/auth";
import { istTime, money } from "@/lib/format";
import { Badge, Card, PageHeader } from "@/components/ui";

export default async function AdminLedger() {
  const { supabase } = await requireStaff("/admin/ledger");
  const [{ data: tb }, { data: recon }, { data: entries }] = await Promise.all([
    supabase.rpc("trial_balance"), supabase.rpc("reconciliation_report"),
    supabase.from("journal_entries").select("*, lines:journal_lines(debit,credit,account:ledger_accounts(code))").order("id", { ascending: false }).limit(50),
  ]);
  const rows = (tb ?? []) as { code: string; name: string; type: string; debit: number; credit: number; balance: number }[];
  const totDr = rows.reduce((s, r) => s + Number(r.debit), 0); const totCr = rows.reduce((s, r) => s + Number(r.credit), 0);
  const r = recon as { journal_balanced: boolean; journal_debits: number; journal_credits: number; client_funds_liability: number; client_bank_asset: number; order_trade_breaks: { order_id: string }[]; negative_client_balances: { account: string; balance: number }[]; generated_at: string } | null;
  return (
    <>
      <PageHeader eyebrow="Finance" title="Trial balance and reconciliation" subtitle="Double-entry journal. Every trade, deposit and payout posts a balanced entry; corrections are reversal entries, never edits." />
      <div className="grid gap-5 lg:grid-cols-[1.618fr_1fr]">
        <Card title="Trial balance" subtitle={`Σ debits ${money(totDr)} · Σ credits ${money(totCr)}`}>
          <table className="table text-sm"><thead><tr><th>Code</th><th>Account</th><th>Type</th><th className="num">Debit</th><th className="num">Credit</th><th className="num">Balance</th></tr></thead>
            <tbody>{rows.map((a) => <tr key={a.code}><td className="tnum">{a.code}</td><td>{a.name}</td><td><Badge>{a.type}</Badge></td><td className="num">{money(a.debit)}</td><td className="num">{money(a.credit)}</td><td className="num font-semibold">{money(a.balance)}</td></tr>)}</tbody></table>
        </Card>
        <div className="space-y-5">
          <Card title="Reconciliation" subtitle={r ? `Generated ${istTime(r.generated_at)}` : ""}>
            {r ? (<ul className="space-y-2 text-sm">
              <li className="flex justify-between"><span>Journal balanced</span><Badge tone={r.journal_balanced ? "ok" : "bad"}>{r.journal_balanced ? "yes" : "NO"}</Badge></li>
              <li className="flex justify-between"><span>Client funds payable (Σ sub-ledgers)</span><span className="tnum">{money(r.client_funds_liability)}</span></li>
              <li className="flex justify-between"><span>Client bank (simulated)</span><span className="tnum">{money(r.client_bank_asset)}</span></li>
              <li className="flex justify-between"><span>Order vs trade qty breaks</span><Badge tone={r.order_trade_breaks.length ? "bad" : "ok"}>{r.order_trade_breaks.length}</Badge></li>
              <li className="flex justify-between"><span>Negative client balances</span><Badge tone={r.negative_client_balances.length ? "bad" : "ok"}>{r.negative_client_balances.length}</Badge></li>
              {r.negative_client_balances.map((n) => <li key={n.account} className="text-xs text-loss">{n.account}: {money(n.balance)}</li>)}
              {r.order_trade_breaks.map((b) => <li key={b.order_id} className="text-xs text-loss">Break on order {b.order_id}</li>)}
            </ul>) : <p className="text-sm text-loss">Unavailable</p>}
            <p className="mt-3 text-xs text-faint">Bank statement, exchange obligation and depository reconciliations require real integrations and are listed as external dependencies.</p>
          </Card>
          <Card title="Recent journal entries">
            <ul className="space-y-2 text-xs">{(entries ?? []).map((e) => { const ls = e.lines as { debit: number; credit: number; account: { code: string } }[]; return (
              <li key={e.id} className="rounded-lg bg-bg/40 p-2"><div className="flex justify-between"><span>#{e.id} <Badge>{e.ref_type}</Badge></span><span className="text-faint">{istTime(e.posted_at)}</span></div><div className="mt-1">{e.narration}</div><div className="mt-1 text-faint">{ls.map((l) => `${l.account.code} ${Number(l.debit) ? "Dr " + money(l.debit) : "Cr " + money(l.credit)}`).join(" · ")}</div></li>); })}</ul>
          </Card>
        </div>
      </div>
    </>
  );
}
