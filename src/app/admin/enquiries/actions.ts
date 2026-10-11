"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { rpcError } from "@/lib/account";
import type { AdminResult } from "../actions";

export async function updateEnquiry(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/enquiries");
  const { error } = await supabase.rpc("update_enquiry", { p_id: Number(form.get("id")), p_status: String(form.get("status")), p_note: String(form.get("note") || "") || null });
  revalidatePath("/admin/enquiries");
  return error ? { ok: false, error: rpcError(error) } : { ok: true };
}
