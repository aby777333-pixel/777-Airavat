"use client";
import { useState } from "react";

export default function TicketForm({ action }: { action: (f: FormData) => Promise<{ ok: boolean; error?: string }> }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  return (
    <form className="glass p-5" action={async (f) => { setMsg(null); setErr(null); const r = await action(f); if (r.ok) setMsg("Ticket created."); else setErr(r.error ?? "Failed"); }}>
      <div className="font-display text-sm font-semibold">Raise a ticket</div>
      <label className="mt-3 block"><span className="label">Category</span><select className="select" name="category"><option value="general">General query</option><option value="account">Account / KYC</option><option value="funds">Funds</option><option value="orders">Orders / trades</option><option value="complaint">Complaint (grievance)</option><option value="security">Security</option></select></label>
      <label className="mt-3 block"><span className="label">Subject</span><input className="input" name="subject" required minLength={4} /></label>
      <label className="mt-3 block"><span className="label">Details</span><textarea className="textarea" name="body" rows={5} required minLength={10} /></label>
      {msg && <p className="mt-3 text-sm text-profit" role="status">{msg}</p>}{err && <p className="mt-3 text-sm text-loss" role="alert">{err}</p>}
      <button className="btn btn-primary mt-4">Submit</button>
    </form>
  );
}
