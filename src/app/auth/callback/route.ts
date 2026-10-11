import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await supabase.rpc("accept_document", { p_slug: "terms-of-use" });
      await supabase.rpc("accept_document", { p_slug: "risk-disclosure" });
      await supabase.rpc("accept_document", { p_slug: "privacy-policy" });
      return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/app"}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?confirmed=1`);
}
