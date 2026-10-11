import { requireStaff } from "@/lib/auth";
import { istTime } from "@/lib/format";
import { isoAgo } from "@/lib/time";
import { Badge, Card, Notice, PageHeader, Stat } from "@/components/ui";

export default async function SentinelAdmin() {
  const { supabase } = await requireStaff("/admin/sentinel");
  const since = isoAgo(86400000);
  const [{ data: alerts }, { data: results }, { data: metrics }] = await Promise.all([
    supabase.from("sentinel_alerts").select("severity,kind,title,created_at,acknowledged_at,user:profiles(email)").gte("created_at", since).order("created_at", { ascending: false }).limit(200),
    supabase.from("scanner_results").select("scanner_id,as_of_day").gte("matched_at", since),
    supabase.from("instrument_metrics").select("as_of").order("as_of", { ascending: false }).limit(1),
  ]);
  const bySev = (s: string) => (alerts ?? []).filter((a) => a.severity === s).length;
  const byKind = new Map<string, number>();
  for (const a of alerts ?? []) byKind.set(a.kind, (byKind.get(a.kind) ?? 0) + 1);
  return (
    <>
      <PageHeader eyebrow="Sentinel X" title="Alert operations (last 24h)" subtitle="Volume and mix of deterministic alerts across all sandbox accounts, plus scanner and metric freshness. Alert content is only visible to the client it concerns." />
      <Notice tone="info">Sentinel is read-only and never acts on accounts. Scans run every five minutes by database schedule; opportunity alerts come from system scanners on watchlists.</Notice>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Alerts (24h)" value={(alerts ?? []).length} sub={`${(alerts ?? []).filter((a) => a.acknowledged_at).length} acknowledged`} />
        <Stat label="Critical" value={bySev("critical")} tone={bySev("critical") ? "loss" : "default"} />
        <Stat label="Warnings" value={bySev("warning")} />
        <Stat label="Opportunities" value={bySev("opportunity")} />
        <Stat label="Scanner matches (24h)" value={(results ?? []).length} sub={metrics?.[0] ? `metrics as of ${istTime(metrics[0].as_of)}` : "metrics not computed"} />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.618fr]">
        <Card title="Mix by kind"><ul className="text-sm">{[...byKind.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => <li key={k} className="flex justify-between py-1"><span>{k.replace(/_/g, " ")}</span><span className="tnum">{v}</span></li>)}{byKind.size === 0 && <li className="text-muted">No alerts in the window.</li>}</ul></Card>
        <Card title="Recent alerts"><div className="max-h-96 overflow-auto"><table className="table text-xs"><thead><tr><th>Time</th><th>Severity</th><th>Kind</th><th>Title</th><th>Client</th><th>Ack</th></tr></thead><tbody>{(alerts ?? []).slice(0, 80).map((a, i) => <tr key={i}><td className="text-muted">{istTime(a.created_at, false)}</td><td><Badge tone={a.severity === "critical" ? "bad" : a.severity === "opportunity" ? "ok" : "info"}>{a.severity}</Badge></td><td>{a.kind}</td><td>{a.title}</td><td className="text-muted">{((Array.isArray(a.user) ? a.user[0] : a.user) as { email: string } | null)?.email}</td><td>{a.acknowledged_at ? "✓" : ""}</td></tr>)}</tbody></table></div></Card>
      </div>
    </>
  );
}
