import { requireUser } from "@/lib/auth";
import { getAccount } from "@/lib/account";
import { istTime, money } from "@/lib/format";
import { Empty, PageHeader } from "@/components/ui";

export default async function Ledger() {
  const { supabase, user } = await requireUser("/app/ledger");
  const account = await getAccount(supabase, user.id);
  if (!account) return <Empty title="No sandbox account" cta={{ href: "/app/onboarding", label: "Complete onboarding" }} />;
  const { data: la } = await supabase.from("ledger_accounts").select("id,code,name").eq("trading_account_id", account.id).maybeSingle();
  const { data: lines } = la ? await supabase.from("journal_lines").select("*, entry:journal_entries(id,narration,posted_at,ref_type,ref_id)").eq("ledger_account_id", la.id).order("id", { ascending: false }).limit(300) : { data: [] };
  const ordered = [...(lines ?? [])].reverse();
  const rows = ordered
    .reduce<{ bal: number; out: (typeof ordered[number] & { bal: number })[] }>((acc, l) => {
      const bal = acc.bal + Number(l.credit) - Number(l.debit);
      return { bal, out: [...acc.out, { ...l, bal }] };
    }, { bal: 0, out: [] }).out.reverse();
  return (
    <>
      <PageHeader eyebrow="Ledger" title={`Client ledger ${la?.code ?? ""}`} subtitle="Your account is a liability sub-ledger of the broker: credits increase what AIRAVAT owes you, debits reduce it. Nothing is ever overwritten." />
      {rows.length === 0 ? <Empty title="No ledger entries yet" cta={{ href: "/app/funds", label: "Add simulated funds" }} /> : (
        <div className="glass overflow-x-auto p-2">
          <table className="table text-sm">
            <thead><tr><th>Entry</th><th>Time</th><th>Narration</th><th className="num">Debit</th><th className="num">Credit</th><th className="num">Balance</th></tr></thead>
            <tbody>{rows.map((l) => { const e = l.entry as unknown as { id: number; narration: string; posted_at: string; ref_type: string }; return (
              <tr key={l.id}><td className="text-xs text-muted">#{e.id} <span className="badge">{e.ref_type}</span></td><td className="text-xs text-muted">{istTime(e.posted_at)}</td><td>{e.narration}</td>
                <td className="num text-loss">{Number(l.debit) ? money(l.debit) : ""}</td><td className="num text-profit">{Number(l.credit) ? money(l.credit) : ""}</td><td className="num font-semibold">{money(l.bal)}</td></tr>); })}</tbody>
          </table>
        </div>
      )}
    </>
  );
}
