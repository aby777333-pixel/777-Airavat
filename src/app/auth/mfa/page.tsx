import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mfaState } from "@/lib/mfa";
import { Logo } from "@/components/site/Header";
import MfaChallenge from "./MfaChallenge";

export const metadata = { title: "Verify your sign-in" };

export default async function MfaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/app" } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  const [mfa, { data: f }] = await Promise.all([mfaState(supabase, user), supabase.auth.mfa.listFactors()]);
  const factor = (f?.totp ?? []).find((x) => x.status === "verified");
  if (!factor || !mfa.required) redirect(next.startsWith("/") ? next : "/app");
  return (
    <div className="bg-atmosphere flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="glass-strong w-full max-w-md p-8">
        <Link href="/" className="flex items-center gap-2"><Logo size={38} /></Link>
        <h1 className="font-display mt-6 text-2xl font-bold">One more step</h1>
        <p className="mt-1 text-sm text-muted">Enter the code from your authenticator app ({factor.friendly_name || "Authenticator app"}) for {user.email}.</p>
        <MfaChallenge factorId={factor.id} next={next} />
      </div>
    </div>
  );
}
