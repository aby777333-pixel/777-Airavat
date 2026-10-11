"use server";
import { createClient } from "@/lib/supabase/server";
import { rpcError } from "@/lib/account";

export async function subscribeNewsletter(form: FormData): Promise<{ ok: boolean; error?: string; note?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("subscribe_newsletter", { p_email: String(form.get("email") || "") });
  if (error) return { ok: false, error: rpcError(error) };
  return { ok: true, note: (data as { note?: string })?.note };
}
