"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getAccount, rpcError } from "@/lib/account";
import type { ActionResult } from "../actions";

export async function raiseRefundRequest(form: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireUser("/app/risk");
  const account = await getAccount(supabase, user.id);
  if (!account) return { ok: false, error: "No sandbox account" };
  const kind = String(form.get("kind")) === "charge_dispute" ? "charge_dispute" : "refund";
  const { data, error } = await supabase.rpc("raise_backoffice_exception", { p_kind: kind, p_account: account.id, p_amount: form.get("amount") ? Number(form.get("amount")) : null, p_description: String(form.get("description") || "") });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app/risk");
  return { ok: true, data };
}
