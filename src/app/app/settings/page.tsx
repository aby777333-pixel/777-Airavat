import { requireUser } from "@/lib/auth";
import { getAccount } from "@/lib/account";
import { istTime } from "@/lib/format";
import { Badge, Card, PageHeader } from "@/components/ui";
import { THEMES } from "@/components/ThemeSwitcher";
import { updatePreferences } from "../actions";
import ApplyTheme from "./ApplyTheme";

const LANGS = [["en", "English"], ["hi", "Hindi"], ["ta", "Tamil"], ["ml", "Malayalam"], ["te", "Telugu"], ["kn", "Kannada"], ["mr", "Marathi"], ["bn", "Bengali"], ["gu", "Gujarati"]];

export default async function Settings() {
  const { supabase, user, profile } = await requireUser("/app/settings");
  const [account, { data: ai }] = await Promise.all([getAccount(supabase, user.id), supabase.from("ai_interactions").select("id,provider,model,prompt_version,classification,created_at,outcome").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10)]);
  return (
    <>
      <PageHeader eyebrow="Settings" title="Profile and preferences" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Profile">
          <form action={updatePreferences} className="space-y-3">
            <label className="block"><span className="label">Display name</span><input className="input" name="full_name" defaultValue={profile?.full_name ?? ""} /></label>
            <label className="block"><span className="label">Theme</span><select className="select" name="theme" defaultValue={profile?.theme ?? "gio4x"}>{THEMES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
            <label className="block"><span className="label">Preferred language (AIRAVAT BHASHA)</span><select className="select" name="language" defaultValue={profile?.language ?? "en"}>{LANGS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></label>
            <button className="btn btn-primary">Save</button>
          </form>
          <ApplyTheme theme={profile?.theme ?? "gio4x"} />
          <dl className="mt-5 grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted">Email</dt><dd>{user.email}</dd>
            <dt className="text-muted">Role</dt><dd><Badge tone="info">{profile?.role}</Badge></dd>
            <dt className="text-muted">Client code</dt><dd>{account?.client_code ?? "—"}</dd>
            <dt className="text-muted">Account status</dt><dd>{account?.status ?? "no account"}</dd>
            <dt className="text-muted">Environment</dt><dd><Badge tone="sim">sandbox</Badge></dd>
          </dl>
        </Card>
        <div className="space-y-5">
          <Card title="Security" subtitle="What exists and what does not">
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
              <li>Password login with HTTP-only session cookies: <Badge tone="ok">active</Badge></li>
              <li>Email confirmation on sign-up: depends on project auth settings</li>
              <li>MFA / passkeys / device binding: <Badge tone="bad">not implemented</Badge></li>
              <li>Session revocation from other devices: <Badge tone="bad">not implemented</Badge></li>
            </ul>
          </Card>
          <Card title="AI interaction log" subtitle="Every AIRAVAT LIVE request is recorded (no transcript stored)">
            {(ai ?? []).length === 0 ? <p className="text-sm text-muted">No AI interactions yet.</p> : (
              <table className="table text-sm"><thead><tr><th>Time</th><th>Provider</th><th>Model</th><th>Prompt</th><th>Outcome</th></tr></thead>
                <tbody>{(ai ?? []).map((a) => <tr key={a.id}><td className="text-xs text-muted">{istTime(a.created_at)}</td><td>{a.provider}</td><td className="text-xs">{a.model}</td><td className="text-xs">{a.prompt_version}</td><td><Badge tone={a.outcome === "success" ? "ok" : "bad"}>{a.outcome}</Badge></td></tr>)}</tbody></table>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
