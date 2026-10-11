"use client";
import { useState } from "react";
import { subscribeNewsletter } from "./actions";

export default function NewsletterForm() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <form className="m-frost p-6" action={async (f) => { const r = await subscribeNewsletter(f); setMsg(r.ok ? { ok: true, text: r.note ?? "Recorded." } : { ok: false, text: r.error ?? "Failed" }); }}>
      <div className="font-display text-base font-semibold">Daily digest</div>
      <p className="mt-1 text-xs text-muted">Opt in to the AIRAVAT DAILY digest. Delivery requires an email provider that is not yet connected; your preference is stored with a confirmation token.</p>
      <div className="mt-3 flex gap-2"><input className="input" name="email" type="email" placeholder="you@example.com" required aria-label="Email" /><button className="btn btn-primary btn-sm">Subscribe</button></div>
      {msg && <p className={msg.ok ? "mt-2 text-xs text-profit" : "mt-2 text-xs text-loss"} role="status">{msg.text}</p>}
    </form>
  );
}
