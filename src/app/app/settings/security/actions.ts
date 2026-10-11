"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Revokes every refresh token for the user (all devices), then returns to the login page.
export async function signOutEverywhere() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login?signedout=all");
}
