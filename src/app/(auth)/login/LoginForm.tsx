"use client";
import { useActionState } from "react";
import { signIn, type AuthState } from "../actions";

export default function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, {});
  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block"><span className="label">Email</span><input className="input" name="email" type="email" autoComplete="email" required /></label>
      <label className="block"><span className="label">Password</span><input className="input" name="password" type="password" autoComplete="current-password" required minLength={10} /></label>
      {state.error && <p className="text-sm text-loss" role="alert">{state.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Signing in…" : "Log in"}</button>
    </form>
  );
}
