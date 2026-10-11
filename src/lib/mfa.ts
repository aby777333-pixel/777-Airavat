import type { SupabaseClient, User } from "@supabase/supabase-js";

// Assurance level of the current session, computed from authoritative sources:
// the `aal` claim inside the access token (what the API enforces) and the verified factors on the user fetched from Auth.
// supabase-js's getAuthenticatorAssuranceLevel() relies on the cached session's user.factors, which can be stale right after enrolment.
export type MfaState = { current: "aal1" | "aal2"; enrolled: boolean; required: boolean };

function aalClaim(accessToken: string | undefined): "aal1" | "aal2" {
  try {
    if (!accessToken) return "aal1";
    const payload = JSON.parse(Buffer.from(accessToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")) as { aal?: string };
    return payload.aal === "aal2" ? "aal2" : "aal1";
  } catch { return "aal1"; }
}

export async function mfaState(supabase: SupabaseClient, user: User | null): Promise<MfaState> {
  if (!user) return { current: "aal1", enrolled: false, required: false };
  const { data: { session } } = await supabase.auth.getSession();
  const current = aalClaim(session?.access_token);
  const enrolled = (user.factors ?? []).some((f) => f.status === "verified");
  return { current, enrolled, required: enrolled && current !== "aal2" };
}
