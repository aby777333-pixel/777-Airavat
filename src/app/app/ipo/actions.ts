"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { rpcError } from "@/lib/account";
import type { ActionResult } from "../actions";

export async function applyIpo(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/ipo");
  const { data, error } = await supabase.rpc("apply_ipo", { p_ipo: Number(form.get("ipo_id")), p_lots: Number(form.get("lots")), p_bid: Number(form.get("bid")) });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app/ipo"); revalidatePath("/app/funds");
  return { ok: true, data };
}
export async function cancelIpo(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/ipo");
  const { error } = await supabase.rpc("cancel_ipo_application", { p_id: Number(form.get("id")) });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app/ipo"); revalidatePath("/app/funds");
  return { ok: true };
}
