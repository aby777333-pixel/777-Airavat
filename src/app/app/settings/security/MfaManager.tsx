"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui";
import { signOutEverywhere } from "./actions";

type Factor = { id: string; friendly_name?: string | null; factor_type: string; status: string; created_at: string };

// TOTP enrolment, verification and removal through Supabase Auth MFA. Secrets never touch our servers; the browser talks to Auth directly.
export default function MfaManager({ factors, aal }: { factors: Factor[]; aal: { current: string; next: string } }) {
  const supabase = createClient(); const router = useRouter();
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string; uri: string } | null>(null);
  const [code, setCode] = useState(""); const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null); const [busy, setBusy] = useState(false);
  const [name, setName] = useState("Authenticator app");
  const verified = factors.filter((f) => f.status === "verified");

  async function start() {
    setBusy(true); setMsg(null);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: name || "Authenticator app" });
    setBusy(false);
    if (error || !data) return setMsg({ ok: false, text: error?.message ?? "Could not start enrolment." });
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret, uri: data.totp.uri });
  }
  async function confirm() {
    if (!enroll) return; setBusy(true); setMsg(null);
    const { data: ch, error: e1 } = await supabase.auth.mfa.challenge({ factorId: enroll.id });
    if (e1 || !ch) { setBusy(false); return setMsg({ ok: false, text: e1?.message ?? "Challenge failed." }); }
    const { error: e2 } = await supabase.auth.mfa.verify({ factorId: enroll.id, challengeId: ch.id, code: code.trim() });
    setBusy(false);
    if (e2) return setMsg({ ok: false, text: "That code did not match. Check the time on your phone and try the next code." });
    setEnroll(null); setCode(""); setMsg({ ok: true, text: "Two-factor authentication is on. Every new sign-in now asks for a code." }); router.refresh();
  }
  async function remove(id: string) {
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: error.message.includes("AAL2") || error.message.toLowerCase().includes("aal") ? "Removing a factor needs a session verified with a code. Sign out, sign in with your code, then remove it." : error.message });
    setMsg({ ok: true, text: "Factor removed. Sign-in is password-only again." }); router.refresh();
  }
  async function cancel() { if (enroll) await supabase.auth.mfa.unenroll({ factorId: enroll.id }); setEnroll(null); setCode(""); }
  const qrSrc = enroll ? (enroll.qr.startsWith("data:") ? enroll.qr : `data:image/svg+xml;utf8,${encodeURIComponent(enroll.qr)}`) : "";

  return (
    <div className="space-y-5">
      <div className="glass p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><div className="font-display font-semibold">Two-factor authentication (TOTP)</div><Badge tone={verified.length ? "ok" : "default"}>{verified.length ? "On" : "Off"}</Badge></div>
        <p className="mt-1 text-sm text-muted">A six-digit code from an authenticator app (any RFC 6238 app) is required after the password. This session is at assurance level <b>{aal.current.toUpperCase()}</b>{aal.next !== aal.current && <> (needs {aal.next.toUpperCase()})</>}.</p>
        {verified.length > 0 && <ul className="mt-3 space-y-1 text-sm">{verified.map((f) => <li key={f.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2"><span>{f.friendly_name || "Authenticator app"} <span className="text-xs text-muted">· added {new Date(f.created_at).toLocaleDateString("en-IN")}</span></span><button type="button" disabled={busy} onClick={() => remove(f.id)} className="text-xs text-loss hover:underline">Remove</button></li>)}</ul>}
        {!enroll && verified.length < 3 && <div className="mt-3 flex flex-wrap items-end gap-2"><label className="block"><span className="label">Factor name</span><input className="input !w-56" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} /></label><button type="button" onClick={start} disabled={busy} className="btn btn-primary btn-sm">{verified.length ? "Add another device" : "Turn on"}</button></div>}
        {enroll && (
          <div className="mt-4 grid gap-4 sm:grid-cols-[180px_1fr]">
            <div className="rounded-lg bg-white p-2"><img src={qrSrc} alt="TOTP enrolment QR code" width={164} height={164} className="h-auto w-full" /></div>
            <div className="text-sm">
              <ol className="list-decimal space-y-1 pl-5 text-muted"><li>Scan the code with your authenticator app, or enter the key manually: <code className="select-all break-all text-xs">{enroll.secret}</code></li><li>Type the six-digit code it shows.</li></ol>
              <div className="mt-3 flex flex-wrap items-center gap-2"><input className="input !w-32 tnum" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} aria-label="Verification code" /><button type="button" onClick={confirm} disabled={busy || code.length !== 6} className="btn btn-primary btn-sm">Verify and enable</button><button type="button" onClick={cancel} disabled={busy} className="btn btn-ghost btn-sm">Cancel</button></div>
              <p className="mt-2 text-xs text-muted">Keep the key somewhere safe; there are no recovery codes yet. If you lose the device, support can remove the factor after identity verification.</p>
            </div>
          </div>
        )}
        {msg && <p className={msg.ok ? "mt-3 text-sm text-profit" : "mt-3 text-sm text-loss"} role="status">{msg.text}</p>}
      </div>
      <div className="glass p-5">
        <div className="font-display font-semibold">Sessions</div>
        <p className="mt-1 text-sm text-muted">Sign out on every device and browser, including this one. Use it if you logged in somewhere you no longer trust. A per-device list is not available yet.</p>
        <form action={signOutEverywhere}><button className="btn btn-ghost btn-sm mt-3">Sign out everywhere</button></form>
      </div>
    </div>
  );
}
