"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { rpcError } from "@/lib/account";
import type { AdminResult } from "../actions";

// Back office and independent RMS: every change is an audited RPC with role checks in SQL.
export async function runSettlementCycle(): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/backoffice");
  const { data, error } = await supabase.rpc("run_settlement_cycle");
  revalidatePath("/admin/backoffice");
  return error ? { ok: false, error: rpcError(error) } : { ok: true, data };
}
export async function callShortfall(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/backoffice");
  const { error } = await supabase.rpc("call_margin_shortfall", { p_id: Number(form.get("id")), p_note: String(form.get("note") || "") || null });
  revalidatePath("/admin/backoffice");
  return error ? { ok: false, error: rpcError(error) } : { ok: true };
}
export async function resolveShortfall(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/backoffice");
  const { error } = await supabase.rpc("resolve_margin_shortfall", { p_id: Number(form.get("id")), p_note: String(form.get("note") || "") || null });
  revalidatePath("/admin/backoffice");
  return error ? { ok: false, error: rpcError(error) } : { ok: true };
}
export async function raiseException(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/backoffice");
  const amount = form.get("amount") ? Number(form.get("amount")) : null;
  const { data, error } = await supabase.rpc("raise_backoffice_exception", { p_kind: String(form.get("kind")), p_account: String(form.get("account_id") || "") || null, p_amount: amount, p_description: String(form.get("description") || "") });
  revalidatePath("/admin/backoffice");
  return error ? { ok: false, error: rpcError(error) } : { ok: true, data };
}
export async function decideException(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/backoffice");
  const { data, error } = await supabase.rpc("decide_backoffice_exception", { p_id: Number(form.get("id")), p_decision: String(form.get("decision")), p_note: String(form.get("note") || "") || null });
  revalidatePath("/admin/backoffice");
  return error ? { ok: false, error: rpcError(error) } : { ok: true, data };
}
export async function setAccountLimits(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/rms");
  const p: Record<string, unknown> = {};
  for (const k of ["max_order_value", "max_order_qty", "max_position_value", "max_daily_loss", "mis_margin_pct", "fat_finger_price_pct", "fat_finger_volume_pct"]) { const v = form.get(k); if (v !== null && v !== "") p[k] = Number(v); }
  p.allow_mis = form.get("allow_mis") === "on";
  p.kill_switch = form.get("kill_switch") === "on";
  const { error } = await supabase.rpc("set_account_risk_limits", { p_account: String(form.get("account_id")), p });
  revalidatePath("/admin/rms");
  return error ? { ok: false, error: rpcError(error) } : { ok: true };
}
export async function reviewFlag(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/rms");
  const { error } = await supabase.rpc("review_surveillance_flag", { p_id: Number(form.get("id")), p_status: String(form.get("status")), p_note: String(form.get("note") || "") || null });
  revalidatePath("/admin/rms");
  return error ? { ok: false, error: rpcError(error) } : { ok: true };
}
