"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { rpcError } from "@/lib/account";
import type { ActionResult } from "../actions";

export async function issueKey(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/developer");
  const scopes = ["read", "trade", "funds", "alerts", "partner", "admin"].filter((s) => form.get(`scope_${s}`) === "on");
  const { data, error } = await supabase.rpc("issue_api_key", { p_name: String(form.get("name") || "key"), p_scopes: scopes.length ? scopes : ["read"] });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app/developer");
  return { ok: true, data };
}
export async function revokeKey(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/developer");
  const { error } = await supabase.rpc("revoke_api_key", { p_id: Number(form.get("id")) });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app/developer");
  return { ok: true };
}
export async function createAlert(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/developer");
  const { error } = await supabase.rpc("create_price_alert", { p_symbol: String(form.get("symbol") || "").toUpperCase(), p_condition: String(form.get("condition") || "ABOVE"), p_price: Number(form.get("price")), p_note: String(form.get("note") || "") || null });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app/developer");
  return { ok: true };
}
export async function cancelAlert(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/developer");
  const { error } = await supabase.rpc("cancel_price_alert", { p_id: Number(form.get("id")) });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app/developer");
  return { ok: true };
}
