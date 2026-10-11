import { requireStaff } from "@/lib/auth";
import { istTime } from "@/lib/format";
import { Badge, PageHeader, statusTone } from "@/components/ui";
import { setRole } from "../actions";
import ActionForm from "@/components/ActionForm";

const ROLES = ["client", "dealer", "ops", "risk", "compliance", "admin", "super_admin"];

export default async function Clients({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { supabase, profile, user } = await requireStaff("/admin/clients");
  let query = supabase.from("profiles").select("*, accounts:trading_accounts(client_code,status,activated_at), kyc:kyc_applications(status)").order("created_at", { ascending: false }).limit(200);
  if (q) query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`);
  const { data: rows } = await query;
  const isSuper = profile?.role === "super_admin";
  return (
    <>
      <PageHeader eyebrow="Clients" title="Client master and staff roles" subtitle="Role changes are restricted to super_admin, audited, and cannot target your own account." />
      <form className="mb-4 flex gap-2"><input className="input max-w-sm" name="q" defaultValue={q ?? ""} placeholder="Search email or name" /><button className="btn btn-ghost">Search</button></form>
      <div className="glass overflow-x-auto p-2">
        <table className="table text-sm">
          <thead><tr><th>User</th><th>Role</th><th>Client code</th><th>Account</th><th>KYC</th><th>Registered</th>{isSuper && <th>Change role</th>}</tr></thead>
          <tbody>{(rows ?? []).map((p) => { const acc = (p.accounts as { client_code: string; status: string }[])[0]; const kyc = (p.kyc as { status: string }[])[0]; return (
            <tr key={p.id}><td><div className="font-medium">{p.full_name || "—"}</div><div className="text-xs text-muted">{p.email}</div></td><td><Badge tone={p.role === "client" ? "default" : "accent"}>{p.role}</Badge></td><td className="tnum">{acc?.client_code ?? "—"}</td>
              <td>{acc ? <Badge tone={statusTone(acc.status)}>{acc.status}</Badge> : <span className="text-faint">none</span>}</td><td>{kyc ? <Badge tone={statusTone(kyc.status)}>{kyc.status}</Badge> : <span className="text-faint">—</span>}</td><td className="text-xs text-muted">{istTime(p.created_at)}</td>
              {isSuper && <td>{p.id !== user.id && <ActionForm action={setRole} className="flex gap-1"><input type="hidden" name="user_id" value={p.id} /><select className="select !w-auto !py-1 !text-xs" name="role" defaultValue={p.role}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select><button className="btn btn-ghost btn-sm">Set</button></ActionForm>}</td>}</tr>); })}</tbody>
        </table>
      </div>
    </>
  );
}
