import { requireStaff } from "@/lib/auth";
import { istTime } from "@/lib/format";
import { Badge, Card, Notice, PageHeader } from "@/components/ui";
import { updateSetting } from "../actions";
import ActionForm from "@/components/ActionForm";

const DESC: Record<string, string> = {
  bootstrap_admin_emails: "Emails that receive super_admin on first sign-up.",
  sandbox_auto_approve_kyc: "true: submitted applications are auto-approved with an audited SANDBOX note. false: they wait in the KYC queue.",
  sandbox_extended_hours: "true: the simulated market accepts orders and ticks outside NSE hours.",
  sandbox_max_deposit: "Cap on simulated ledger balance per client (₹).",
  sim_tick_interval_seconds: "Informational; pg_cron runs sim_tick() every minute.",
  live_trading_enabled: "Hard gate. Cannot be changed here; requires the regulatory approval workflow.",
};

export default async function SystemSettings() {
  const { supabase, profile } = await requireStaff("/admin/settings");
  const { data: rows } = await supabase.from("app_settings").select("*").order("key");
  const can = !!profile && ["admin", "super_admin"].includes(profile.role);
  return (
    <>
      <PageHeader eyebrow="System" title="Application settings" subtitle="Changes are audited with before/after values." />
      <Notice tone="info">Environment: <strong>{process.env.AIRAVAT_ENV ?? "sandbox"}</strong>. Supabase project nscoslbooxtndhxlnyyv (ap-south-1). Secrets are never shown here.</Notice>
      <div className="mt-5 space-y-3">{(rows ?? []).map((s) => (
        <Card key={s.key} title={<span className="font-mono text-sm">{s.key}</span>} subtitle={<>{DESC[s.key]} · updated {istTime(s.updated_at)}</>} action={s.key === "live_trading_enabled" ? <Badge tone="bad">gated</Badge> : undefined}>
          <ActionForm action={updateSetting} successText="Saved." className="flex gap-2"><input type="hidden" name="key" value={s.key} /><input className="input font-mono" name="value" defaultValue={JSON.stringify(s.value)} disabled={!can || s.key === "live_trading_enabled"} />{can && s.key !== "live_trading_enabled" && <button className="btn btn-ghost btn-sm">Save</button>}</ActionForm>
        </Card>))}</div>
    </>
  );
}
