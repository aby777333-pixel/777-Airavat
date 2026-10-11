import { requireStaff } from "@/lib/auth";
import { istTime, money } from "@/lib/format";
import { Badge, Notice, PageHeader, statusTone } from "@/components/ui";
import { reviewWithdrawal } from "../actions";
import ActionForm from "@/components/ActionForm";

export default async function AdminFunds() {
  const { supabase, profile, user } = await requireStaff("/admin/funds");
  const { data: txns } = await supabase.from("fund_transactions").select("*, account:trading_accounts(client_code)").order("created_at", { ascending: false }).limit(200);
  const canApprove = !!profile && ["ops", "admin", "super_admin"].includes(profile.role);
  return (
    <>
      <PageHeader eyebrow="Funds" title="Deposits and payout approvals" subtitle="Maker-checker: the staff member who requested a withdrawal (or the client) can never be the approver. Approvals post a journal entry and are audited." />
      {!canApprove && <div className="mb-4"><Notice tone="info">Your role ({profile?.role}) can view but not approve payouts.</Notice></div>}
      <div className="glass overflow-x-auto p-2">
        <table className="table text-sm">
          <thead><tr><th>Time</th><th>Client</th><th>Type</th><th className="num">Amount</th><th>Status</th><th>Reference / note</th><th>Journal</th><th></th></tr></thead>
          <tbody>{(txns ?? []).map((t) => (
            <tr key={t.id}><td className="text-xs text-muted">{istTime(t.created_at)}</td><td className="tnum">{(t.account as unknown as { client_code: string })?.client_code}</td><td>{t.type}</td><td className="num">{money(t.amount)}</td><td><Badge tone={statusTone(t.status)}>{t.status}</Badge></td><td className="text-xs text-muted">{t.bank_reference ?? ""} {t.note}</td><td className="text-xs text-faint">{t.journal_entry_id ? `#${t.journal_entry_id}` : "—"}</td>
              <td>{t.status === "PENDING" && canApprove && t.requested_by !== user.id && (
                <ActionForm action={reviewWithdrawal} className="flex gap-1"><input type="hidden" name="id" value={t.id} /><input className="input !w-40 !py-1 !text-xs" name="note" placeholder="Note" /><button className="btn btn-primary btn-sm" name="decision" value="approve">Approve</button><button className="btn btn-ghost btn-sm" name="decision" value="reject">Reject</button></ActionForm>)}
                {t.status === "PENDING" && t.requested_by === user.id && <span className="text-xs text-warn">You requested this; another approver is required.</span>}</td></tr>))}</tbody>
        </table>
      </div>
    </>
  );
}
