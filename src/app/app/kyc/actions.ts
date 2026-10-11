"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { rpcError } from "@/lib/account";
import type { ActionResult } from "../actions";

// Entity-aware onboarding and account lifecycle (sandbox verification adapters).
export async function submitKycEntity(payload: Record<string, unknown>): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/onboarding");
  const { data, error } = await supabase.rpc("submit_kyc_entity", { p_payload: payload });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app", "layout");
  return { ok: true, data };
}
export async function activateDerivatives(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/kyc");
  const { data, error } = await supabase.rpc("activate_derivatives", { p_income_proof: { type: String(form.get("type") || ""), reference: String(form.get("reference") || "") } });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app/kyc");
  return { ok: true, data };
}
export async function requestRekyc(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/kyc");
  const p: Record<string, unknown> = {};
  if (form.get("phone")) p.phone = String(form.get("phone"));
  if (form.get("occupation")) p.occupation = String(form.get("occupation"));
  if (form.get("income_range")) p.income_range = String(form.get("income_range"));
  if (form.get("line1")) p.address = { line1: String(form.get("line1")), city: String(form.get("city") || ""), state: String(form.get("state") || ""), pincode: String(form.get("pincode") || "") };
  const { data, error } = await supabase.rpc("request_rekyc", { p_updates: p });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app/kyc");
  return { ok: true, data };
}
export async function reactivateAccount(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/kyc");
  const { data, error } = await supabase.rpc("reactivate_account", { p_confirmation: { ipv: form.get("ipv") === "on" ? "true" : "false", details_confirmed: form.get("details_confirmed") === "on" ? "true" : "false" } });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app", "layout");
  return { ok: true, data };
}
