"use client";
import Link from "next/link";
import { useActionState } from "react";
import { signUp, type AuthState } from "../actions";

export default function SignupForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, {});
  if (state.message) return <p className="mt-6 rounded-lg border border-info/40 bg-info/10 p-4 text-sm text-info">{state.message}</p>;
  return (
    <form action={action} className="mt-6 space-y-4">
      <label className="block"><span className="label">Full name (as on PAN)</span><input className="input" name="full_name" autoComplete="name" required minLength={2} /></label>
      <label className="block"><span className="label">Email</span><input className="input" name="email" type="email" autoComplete="email" required /></label>
      <label className="block"><span className="label">Password (min 10 characters)</span><input className="input" name="password" type="password" autoComplete="new-password" required minLength={10} /></label>
      <label className="flex items-start gap-2 text-xs text-muted">
        <input type="checkbox" name="accept_terms" className="mt-0.5" />
        <span>I have read the draft <Link className="text-accent underline" href="/legal/terms-of-use" target="_blank">Terms of Use</Link>, <Link className="text-accent underline" href="/legal/risk-disclosure" target="_blank">Risk Disclosure</Link> and <Link className="text-accent underline" href="/legal/privacy-policy" target="_blank">Privacy Policy</Link>, and I understand this is a simulated environment.</span>
      </label>
      {state.error && <p className="text-sm text-loss" role="alert">{state.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Creating…" : "Create account"}</button>
    </form>
  );
}
