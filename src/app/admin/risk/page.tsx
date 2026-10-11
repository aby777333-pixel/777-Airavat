import { requireStaff } from "@/lib/auth";
import { istTime } from "@/lib/format";
import { Card, Notice, PageHeader } from "@/components/ui";
import { updateRiskLimits } from "../actions";
import ActionForm from "@/components/ActionForm";

export default async function RiskPage() {
  const { supabase, profile } = await requireStaff("/admin/risk");
  const [{ data: rl }, { data: rejections }] = await Promise.all([
    supabase.from("risk_limits").select("*").eq("scope", "global").single(),
    supabase.from("orders").select("rejection_reason").eq("status", "RMS_REJECTED"),
  ]);
  const canEdit = !!profile && ["risk", "admin", "super_admin"].includes(profile.role);
  const counts = new Map<string, number>(); (rejections ?? []).forEach((r) => counts.set(r.rejection_reason ?? "?", (counts.get(r.rejection_reason ?? "?") ?? 0) + 1));
  return (
    <>
      <PageHeader eyebrow="RMS" title="Risk limits and emergency controls" subtitle="Global limits enforced inside place_order(). Changes are audited with before/after state. Per-account limits are modelled but not yet enforced." />
      {rl?.kill_switch && <div className="mb-4"><Notice tone="bad">KILL SWITCH ACTIVE: every new order is rejected with RMS_KILL_SWITCH_ACTIVE. Existing positions are not closed automatically.</Notice></div>}
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Card title="Global limits" subtitle={`Last updated ${istTime(rl?.updated_at)}`}>
          <ActionForm action={updateRiskLimits} successText="Limits saved and audited." className="grid gap-3 sm:grid-cols-2">
            {[["max_order_value", "Max order value (₹)"], ["max_order_qty", "Max order quantity"], ["max_position_value", "Max position value (₹)"], ["max_daily_loss", "Max daily loss (₹)"], ["mis_margin_pct", "MIS margin %"]].map(([k, l]) => (
              <label key={k} className="block"><span className="label">{l}</span><input className="input tnum" name={k} type="number" step="any" defaultValue={rl?.[k as "max_order_qty"] ?? ""} disabled={!canEdit} /></label>))}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="allow_mis" defaultChecked={rl?.allow_mis} disabled={!canEdit} /> Allow MIS (intraday)</label>
            <label className="flex items-center gap-2 text-sm text-loss"><input type="checkbox" name="kill_switch" defaultChecked={rl?.kill_switch} disabled={!canEdit} /> KILL SWITCH (block all new orders)</label>
            {canEdit ? <button className="btn btn-primary sm:col-span-2">Save limits</button> : <p className="text-xs text-muted sm:col-span-2">Your role can view limits only.</p>}
          </ActionForm>
        </Card>
        <Card title="RMS rejections by reason" subtitle="All-time">
          {counts.size === 0 ? <p className="text-sm text-muted">No rejections yet.</p> : <ul className="space-y-1 text-sm">{[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => <li key={k} className="flex justify-between"><span>{k}</span><span className="tnum">{v}</span></li>)}</ul>}
          <p className="mt-3 text-xs text-faint">Emergency semantics: the kill switch blocks new orders only. Cancelling open orders and squaring off positions are separate actions (Orders, Settlement).</p>
        </Card>
      </div>
    </>
  );
}
