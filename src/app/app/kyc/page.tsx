import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getAccount, getKyc } from "@/lib/account";
import { istTime } from "@/lib/format";
import { Badge, Card, Notice, PageHeader } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { activateDerivatives, reactivateAccount, requestRekyc } from "./actions";

export default async function KycStatus() {
  const { supabase, user } = await requireUser("/app/kyc");
  const [account, kyc] = await Promise.all([getAccount(supabase, user.id), getKyc(supabase, user.id)]);
  const [{ data: ver }, { data: banks }, { data: events }, { data: acct }] = await Promise.all([
    kyc ? supabase.rpc("kyc_verification_summary", { p_app: kyc.id }) : Promise.resolve({ data: [] }),
    supabase.from("client_bank_accounts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("kyc_events").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    account ? supabase.from("trading_accounts").select("status,kyc_valid_until,derivatives_enabled,ucc,demat_id,last_activity_at,segments").eq("id", account.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const steps = (ver as { step: string; status: string; provider: string; reference: string; detail: Record<string, unknown>; checked_at: string }[] | null) ?? [];
  return (
    <>
      <PageHeader eyebrow="Account" title="KYC, verification and account status" subtitle="Every verification step is recorded with its provider and result. In the sandbox all providers are simulated; the production blocker for each is shown in its detail." action={!kyc ? <Link href="/app/onboarding" className="btn btn-primary btn-sm">Start onboarding</Link> : undefined} />
      {!kyc && <Notice tone="info">No application yet.</Notice>}
      {kyc && (
        <div className="grid gap-5 lg:grid-cols-[1.618fr_1fr]">
          <div className="space-y-5">
            <Card title={`Application · ${kyc.status}`} subtitle={`${(kyc as { entity_type?: string }).entity_type ?? "individual"} · submitted ${istTime(kyc.submitted_at)}`}>
              <table className="table text-sm"><thead><tr><th>Step</th><th>Result</th><th>Provider</th><th>Reference</th><th>Detail</th></tr></thead>
                <tbody>{steps.map((s) => <tr key={s.step}><td className="font-medium">{s.step.replace(/_/g, " ")}</td><td><Badge tone={s.status === "passed" ? "ok" : s.status === "failed" ? "bad" : "info"}>{s.status}</Badge></td><td className="text-xs text-muted">{s.provider}</td><td className="font-mono text-xs">{s.reference}</td><td className="text-xs text-muted">{s.detail && Object.entries(s.detail).filter(([k]) => k !== "note").map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}{s.detail?.note ? <div className="text-faint">{String(s.detail.note)}</div> : null}</td></tr>)}{steps.length === 0 && <tr><td colSpan={5} className="text-muted">Legacy application without step records.</td></tr>}</tbody></table>
              <div className="mt-2 text-xs text-faint">Documents: {((kyc as { documents?: { name: string; status: string }[] }).documents ?? []).map((d) => `${d.name} (${d.status})`).join(", ") || "—"}</div>
            </Card>
            <Card title="Bank accounts" subtitle="Pay-ins and pay-outs only to verified accounts in your name">
              {(banks ?? []).length === 0 ? <p className="text-sm text-muted">None on file.</p> : (banks ?? []).map((b) => <div key={b.id} className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0"><span>{b.bank_name} · {b.account_number_masked} · {b.ifsc}</span><Badge tone={b.status === "verified" ? "ok" : b.status === "rejected" ? "bad" : "info"}>{b.status}</Badge></div>)}
            </Card>
          </div>
          <div className="space-y-5">
            {acct && (
              <Card title="Account">
                <dl className="grid grid-cols-2 gap-1 text-sm"><dt className="text-muted">Status</dt><dd><Badge tone={acct.status === "active" ? "ok" : "bad"}>{acct.status}</Badge></dd><dt className="text-muted">UCC</dt><dd className="font-mono text-xs">{acct.ucc ?? "—"}</dd><dt className="text-muted">Demat</dt><dd className="font-mono text-xs">{acct.demat_id ?? "—"}</dd><dt className="text-muted">Segments</dt><dd>{(acct.segments as string[]).join(", ")}</dd><dt className="text-muted">Derivatives</dt><dd>{acct.derivatives_enabled ? "enabled (sandbox flag)" : "not enabled"}</dd><dt className="text-muted">KYC valid until</dt><dd>{acct.kyc_valid_until ?? "—"}</dd><dt className="text-muted">Last activity</dt><dd>{istTime(acct.last_activity_at, false)}</dd></dl>
                {acct.status === "dormant" && <ActionForm action={reactivateAccount} successText="Reactivated." className="mt-3 space-y-2 text-sm"><label className="flex items-start gap-2"><input type="checkbox" name="details_confirmed" /> My KYC details are unchanged.</label><label className="flex items-start gap-2"><input type="checkbox" name="ipv" /> IPV completed (simulated).</label><button className="btn btn-primary btn-sm">Reactivate dormant account</button></ActionForm>}
              </Card>
            )}
            {acct && !acct.derivatives_enabled && acct.status === "active" && (
              <Card title="Activate derivatives segment" subtitle="Income proof is mandatory for F&O">
                <ActionForm action={activateDerivatives} successText="Income proof accepted; segment flag enabled." className="space-y-2 text-sm"><select className="select" name="type" required><option value="">Income proof type</option><option value="salary_slip">Salary slip</option><option value="itr">ITR</option><option value="form16">Form 16</option><option value="bank_statement">Bank statement</option><option value="holdings_statement">Holdings statement</option><option value="net_worth">Net worth certificate</option></select><input className="input" name="reference" placeholder="Document reference" /><button className="btn btn-primary btn-sm">Submit (simulated check)</button></ActionForm>
              </Card>
            )}
            {acct && acct.status === "active" && (
              <Card title="Re-KYC / update details" subtitle="Periodic re-KYC extends validity by two years">
                <ActionForm action={requestRekyc} successText="Details updated and KYC validity extended." className="grid grid-cols-2 gap-2 text-sm"><input className="input" name="phone" placeholder="New mobile" /><select className="select" name="income_range"><option value="">Income range (unchanged)</option>{["< 1 lakh", "1-5 lakh", "5-10 lakh", "10-25 lakh", "25 lakh - 1 crore", "> 1 crore"].map((o) => <option key={o}>{o}</option>)}</select><input className="input" name="line1" placeholder="New address line" /><input className="input" name="city" placeholder="City" /><input className="input" name="state" placeholder="State" /><input className="input" name="pincode" placeholder="PIN" /><button className="btn btn-ghost btn-sm col-span-2">Submit re-KYC</button></ActionForm>
              </Card>
            )}
            <Card title="Account events"><ul className="text-xs text-muted">{(events ?? []).map((e) => <li key={e.id} className="py-0.5">{istTime(e.created_at, false)} · {e.kind.replace(/_/g, " ")}</li>)}{(events ?? []).length === 0 && <li>—</li>}</ul></Card>
          </div>
        </div>
      )}
    </>
  );
}
