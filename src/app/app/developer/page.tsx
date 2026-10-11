import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { istTime, price } from "@/lib/format";
import { Badge, Card, Notice, PageHeader } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { cancelAlert, createAlert, issueKey, revokeKey } from "./actions";
import KeyReveal from "./KeyReveal";

export default async function DeveloperSettings() {
  const { supabase, user } = await requireUser("/app/developer");
  const [{ data: keys }, { data: alerts }] = await Promise.all([supabase.from("api_keys").select("*").eq("user_id", user.id).order("created_at", { ascending: false }), supabase.from("price_alerts").select("*, instrument:instruments(symbol)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50)]);
  return (
    <>
      <PageHeader eyebrow="Developer" title="API keys and price alerts" subtitle="Sandbox keys call the same engine as this app. The full key is shown once; only a hash is stored." action={<Link href="/developers" className="btn btn-ghost btn-sm">API docs</Link>} />
      <Notice tone="info">Up to 5 active keys, 120 requests per minute each. Scopes limit what a key may do; revoke a key at any time.</Notice>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title="Issue a key"><KeyReveal action={issueKey} /></Card>
        <Card title={`Your keys (${(keys ?? []).filter((k) => !k.revoked_at).length} active)`}>
          {(keys ?? []).length === 0 ? <p className="text-sm text-muted">No keys yet.</p> : (keys ?? []).map((k) => <div key={k.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 text-sm last:border-0"><div><span className="font-mono">{k.key_prefix}…</span> <span className="text-muted">{k.name}</span><div className="text-xs text-faint">{(k.scopes as string[]).join(", ")} · created {istTime(k.created_at, false)}{k.last_used_at ? ` · used ${istTime(k.last_used_at, false)}` : ""}</div></div>{k.revoked_at ? <Badge tone="bad">revoked</Badge> : <ActionForm action={revokeKey}><input type="hidden" name="id" value={k.id} /><button className="btn btn-ghost btn-sm">Revoke</button></ActionForm>}</div>)}
        </Card>
        <Card title="Price alerts" subtitle="Evaluated every minute against the simulated LTP; delivered to Notifications">
          <ActionForm action={createAlert} successText="Alert created." className="grid grid-cols-4 gap-2 text-sm"><input className="input" name="symbol" placeholder="Symbol" required /><select className="select" name="condition"><option>ABOVE</option><option>BELOW</option></select><input className="input tnum" name="price" type="number" step="0.05" placeholder="Price" required /><button className="btn btn-primary btn-sm">Add</button><input className="input col-span-4" name="note" placeholder="Note (optional)" /></ActionForm>
          <ul className="mt-3 space-y-1 text-sm">{(alerts ?? []).map((a) => <li key={a.id} className="flex items-center justify-between"><span>{(a.instrument as unknown as { symbol: string })?.symbol} {a.condition.toLowerCase()} {price(a.price)}{a.note ? <span className="text-xs text-muted"> · {a.note}</span> : null}</span><span className="flex items-center gap-2"><Badge tone={a.status === "active" ? "info" : a.status === "triggered" ? "ok" : "default"}>{a.status}</Badge>{a.status === "active" && <ActionForm action={cancelAlert}><input type="hidden" name="id" value={a.id} /><button className="btn btn-ghost btn-sm">Cancel</button></ActionForm>}</span></li>)}{(alerts ?? []).length === 0 && <li className="text-muted">No alerts.</li>}</ul>
        </Card>
      </div>
    </>
  );
}
