"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { mfaState } from "@/lib/mfa";

const creds = z.object({
  email: z.string().email(),
  password: z.string().min(10, "Password must be at least 10 characters"),
});

export type AuthState = { error?: string; message?: string };

export async function signIn(_prev: AuthState, form: FormData): Promise<AuthState> {
  const parsed = creds.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const supabase = await createClient();
  const { data: signed, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Invalid email or password." };
  const next = String(form.get("next") || "/app");
  const safeNext = next.startsWith("/") ? next : "/app";
  // Users with a verified TOTP factor must present a code before the session reaches protected pages.
  const mfa = await mfaState(supabase, signed.user);
  if (mfa.required) redirect(`/auth/mfa?next=${encodeURIComponent(safeNext)}`);
  redirect(safeNext);
}

export async function signUp(_prev: AuthState, form: FormData): Promise<AuthState> {
  const parsed = creds.extend({ full_name: z.string().min(2).max(120), referral_code: z.string().max(24).optional() }).safeParse({
    email: form.get("email"), password: form.get("password"), full_name: form.get("full_name"), referral_code: String(form.get("referral_code") || "").toUpperCase().replace(/[^A-Z0-9]/g, "") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  if (form.get("accept_terms") !== "on") return { error: "You must accept the draft Terms of Use and Risk Disclosure to continue." };
  const supabase = await createClient();
  const h = await headers();
  const origin = h.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.full_name, ...(parsed.data.referral_code ? { referral_code: parsed.data.referral_code } : {}) }, emailRedirectTo: `${origin}/auth/callback?next=/app/onboarding` },
  });
  if (error) return { error: error.message };
  if (data.session) {
    await supabase.rpc("accept_document", { p_slug: "terms-of-use" });
    await supabase.rpc("accept_document", { p_slug: "risk-disclosure" });
    await supabase.rpc("accept_document", { p_slug: "privacy-policy" });
    redirect("/app/onboarding");
  }
  return { message: "Check your email to confirm your address, then log in to continue onboarding." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
