"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { rpcError } from "@/lib/account";

export type AdminResult = { ok: boolean; error?: string; data?: unknown };

export async function reviewKyc(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/kyc");
  const { error } = await supabase.rpc("review_kyc", { p_app: String(form.get("id")), p_decision: String(form.get("decision")), p_note: String(form.get("note") || "") });
  revalidatePath("/admin", "layout");
  return error ? { ok: false, error: rpcError(error) } : { ok: true };
}

export async function reviewWithdrawal(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/funds");
  const { error } = await supabase.rpc("review_withdrawal", { p_txn: String(form.get("id")), p_decision: String(form.get("decision")), p_note: String(form.get("note") || "") });
  revalidatePath("/admin", "layout");
  return error ? { ok: false, error: rpcError(error) } : { ok: true };
}

export async function updateRiskLimits(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/risk");
  const p: Record<string, unknown> = {};
  for (const k of ["max_order_value", "max_order_qty", "max_position_value", "max_daily_loss", "mis_margin_pct"]) {
    const v = form.get(k); if (v !== null && v !== "") p[k] = Number(v);
  }
  p.allow_mis = form.get("allow_mis") === "on";
  p.kill_switch = form.get("kill_switch") === "on";
  const { error } = await supabase.rpc("update_risk_limits", { p });
  revalidatePath("/admin", "layout");
  return error ? { ok: false, error: rpcError(error) } : { ok: true };
}

export async function runSettlement(_form?: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/settlement");
  const { data, error } = await supabase.rpc("run_eod_settlement");
  revalidatePath("/admin", "layout");
  return error ? { ok: false, error: rpcError(error) } : { ok: true, data };
}

export async function cancelAnyOrder(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/orders");
  const { error } = await supabase.rpc("cancel_order", { p_order: String(form.get("order_id")) });
  revalidatePath("/admin", "layout");
  return error ? { ok: false, error: rpcError(error) } : { ok: true };
}

export async function setRole(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/clients");
  const { error } = await supabase.rpc("set_user_role", { p_user: String(form.get("user_id")), p_role: String(form.get("role")) });
  revalidatePath("/admin/clients");
  return error ? { ok: false, error: rpcError(error) } : { ok: true };
}

export async function updateSetting(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/settings");
  const key = String(form.get("key"));
  const raw = String(form.get("value") ?? "");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { value = raw; }
  const { error } = await supabase.rpc("update_app_setting", { p_key: key, p_value: value });
  revalidatePath("/admin", "layout");
  return error ? { ok: false, error: rpcError(error) } : { ok: true };
}

export async function updateRequirement(form: FormData): Promise<void> {
  const { supabase } = await requireStaff("/admin/requirements");
  await supabase.from("requirements").update({ status: String(form.get("status")), notes: String(form.get("notes") ?? ""), updated_at: new Date().toISOString() }).eq("req_id", String(form.get("req_id")));
  revalidatePath("/admin/requirements");
}

export async function updateObligation(form: FormData): Promise<void> {
  const { supabase } = await requireStaff("/admin/regulatory");
  await supabase.from("regulatory_obligations").update({ status: String(form.get("status")), owner: String(form.get("owner") ?? ""), evidence: String(form.get("evidence") ?? ""), updated_at: new Date().toISOString() }).eq("regulation_id", String(form.get("regulation_id")));
  revalidatePath("/admin/regulatory");
}

export async function resolveTicket(form: FormData): Promise<void> {
  const { supabase } = await requireStaff("/admin/support");
  await supabase.from("support_tickets").update({ status: String(form.get("status")), updated_at: new Date().toISOString() }).eq("id", String(form.get("ticket_id")));
  revalidatePath("/admin/support");
}
