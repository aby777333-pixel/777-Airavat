import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "client" | "dealer" | "ops" | "risk" | "compliance" | "admin" | "super_admin";
export const STAFF_ROLES: AppRole[] = ["dealer", "ops", "risk", "compliance", "admin", "super_admin"];

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: AppRole;
  language: string;
  theme: string;
};

export async function getSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null as Profile | null };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return { supabase, user, profile: (profile as Profile | null) ?? null };
}

export async function requireUser(nextPath = "/app") {
  const s = await getSession();
  if (!s.user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return { supabase: s.supabase, user: s.user, profile: s.profile };
}

export async function requireStaff(nextPath = "/admin") {
  const s = await requireUser(nextPath);
  if (!s.profile || !STAFF_ROLES.includes(s.profile.role)) redirect("/app?denied=admin");
  return s;
}

export function hasRole(profile: Profile | null, roles: AppRole[]) {
  return !!profile && roles.includes(profile.role);
}
