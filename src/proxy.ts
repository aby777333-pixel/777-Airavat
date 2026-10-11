import { createServerClient } from "@supabase/ssr";
import { mfaState } from "@/lib/mfa";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 proxy (formerly middleware): refreshes the Supabase session cookie and
// gates authenticated areas. Authorization for staff areas is enforced again server-side.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  // Auth links that land outside /auth/callback (e.g. when the Supabase Site URL fallback is used) still complete sign-in.
  const authCode = request.nextUrl.searchParams.get("code");
  if (authCode && path !== "/auth/callback" && !path.startsWith("/api/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    url.search = "";
    url.searchParams.set("code", authCode);
    url.searchParams.set("next", request.nextUrl.searchParams.get("next") ?? (user ? "/app" : "/app/onboarding"));
    return NextResponse.redirect(url);
  }
  const protectedArea = path.startsWith("/app") || path.startsWith("/admin");
  if (protectedArea && user) {
    // Enrolled users must have verified their second factor in this session (AAL2) before reaching protected pages.
    const mfa = await mfaState(supabase, user);
    if (mfa.required) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/mfa";
      url.search = "";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }
  }
  if (protectedArea && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  if ((path === "/login" || path === "/signup") && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)"],
};
