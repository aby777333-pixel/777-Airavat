"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Second step of sign-in for users with a verified TOTP factor. Verifying upgrades the session to AAL2.
export default function MfaChallenge({ factorId, next }: { factorId: string; next: string }) {
  const supabase = createClient(); const router = useRouter();
  const [code, setCode] = useState(""); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    const { data: ch, error: e1 } = await supabase.auth.mfa.challenge({ factorId });
    if (e1 || !ch) { setBusy(false); return setErr(e1?.message ?? "Could not start the challenge."); }
    const { error: e2 } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code: code.trim() });
    setBusy(false);
    if (e2) return setErr("That code did not match. Wait for the next one and try again.");
    router.replace(next.startsWith("/") ? next : "/app"); router.refresh();
  }
  async function back() { await supabase.auth.signOut(); router.replace("/login"); }
  return (
    <form onSubmit={submit} className="mt-6 space-y-3">
      <label className="block"><span className="label">Six-digit code</span><input className="input tnum text-lg tracking-[0.3em]" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} autoFocus required /></label>
      {err && <p className="text-sm text-loss" role="alert">{err}</p>}
      <button className="btn btn-primary w-full" disabled={busy || code.length !== 6}>{busy ? "Checking…" : "Verify"}</button>
      <button type="button" onClick={back} className="btn btn-ghost w-full">Cancel and sign out</button>
    </form>
  );
}
