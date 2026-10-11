"use server";
import { createClient } from "@/lib/supabase/server";
import { rpcError } from "@/lib/account";

export type EnquiryResult = { ok: boolean; error?: string; data?: { reference: string; sla_hours: number; kind: string } };

// Public enquiry: validated and rate-limited inside submit_enquiry(); anonymous visitors allowed.
export async function submitEnquiry(form: FormData): Promise<EnquiryResult> {
  const supabase = await createClient();
  const p = {
    website: String(form.get("website") || ""),
    kind: String(form.get("kind") || "other"),
    full_name: String(form.get("full_name") || "").trim(),
    email: String(form.get("email") || "").trim(),
    phone: String(form.get("phone") || "").trim(),
    city: String(form.get("city") || ""),
    state: String(form.get("state") || ""),
    country: String(form.get("country") || "IN"),
    preferred_language: String(form.get("preferred_language") || "en"),
    existing_client: form.get("existing_client") === "on",
    client_code: String(form.get("client_code") || ""),
    segments: form.getAll("segments").map(String),
    horizon: String(form.get("horizon") || ""),
    capital_range: String(form.get("capital_range") || ""),
    heard_from: String(form.get("heard_from") || ""),
    callback_slot: String(form.get("callback_slot") || ""),
    subject: String(form.get("subject") || ""),
    message: String(form.get("message") || "").trim(),
    consent_contact: form.get("consent_contact") === "on",
    consent_marketing: form.get("consent_marketing") === "on",
  };
  const { data, error } = await supabase.rpc("submit_enquiry", { p });
  if (error) return { ok: false, error: rpcError(error) };
  return { ok: true, data: data as EnquiryResult["data"] };
}
