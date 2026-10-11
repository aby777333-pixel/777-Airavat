import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui";

export default async function KycVerifications({ appId }: { appId: string }) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("kyc_verification_summary", { p_app: appId });
  const steps = (data as { step: string; status: string; provider: string; reference: string; detail: Record<string, unknown> }[] | null) ?? [];
  if (!steps.length) return <div className="mt-2 text-xs text-muted">No verification steps recorded (legacy application).</div>;
  return (
    <div className="mt-3 flex flex-wrap gap-1 text-xs">{steps.map((s) => <span key={s.step} title={`${s.provider} · ${s.reference}${s.detail?.note ? ` · ${String(s.detail.note)}` : ""}`}><Badge tone={s.status === "passed" ? "ok" : s.status === "failed" ? "bad" : "info"}>{s.step.replace(/_/g, " ")}: {s.status}</Badge></span>)}</div>
  );
}
