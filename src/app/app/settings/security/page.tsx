import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { mfaState } from "@/lib/mfa";
import { Badge, Card, PageHeader } from "@/components/ui";
import MfaManager from "./MfaManager";

export const metadata = { title: "Security settings" };

export default async function SecuritySettings() {
  const { supabase, user } = await requireUser("/app/settings/security");
  const [{ data: f }, a] = await Promise.all([supabase.auth.mfa.listFactors(), mfaState(supabase, user)]);
  const factors = (f?.totp ?? []).map((x) => ({ id: x.id, friendly_name: x.friendly_name, factor_type: x.factor_type, status: x.status, created_at: x.created_at }));
  const aal = { current: a.current, next: a.enrolled ? "aal2" : "aal1" };
  return (
    <>
      <PageHeader eyebrow="Settings" title="Security" subtitle={<>Two-factor authentication and sessions · <Link href="/app/settings" className="text-accent">back to settings</Link></>} />
      <div className="grid gap-5 lg:grid-cols-[1.618fr_1fr]">
        <MfaManager factors={factors} aal={aal} />
        <div className="space-y-5">
          <Card title="What protects your account" subtitle="Beyond the password">
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
              <li>HTTP-only session cookies; the browser never holds a long-lived token in script-readable storage</li>
              <li>TOTP second factor, enforced on every sign-in once enabled: <Badge tone={factors.some((x) => x.status === "verified") ? "ok" : "default"}>{factors.some((x) => x.status === "verified") ? "on" : "off"}</Badge></li>
              <li>Protected pages require the verified level; a password-only session is sent to the code screen</li>
              <li>Money never moves from the browser; every change is an audited database function</li>
              <li>Not yet: passkeys, device list, recovery codes, login alerts</li>
            </ul>
          </Card>
          <Card title="Good habits" subtitle="For a shared or new phone">
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted"><li>Use a device lock and an authenticator app that backs up encrypted</li><li>Never share OTPs or codes; AIRAVAT never asks for them on a call</li><li>Sign out everywhere if a device is lost</li></ul>
          </Card>
        </div>
      </div>
    </>
  );
}
