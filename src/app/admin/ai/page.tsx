import { requireStaff } from "@/lib/auth";
import { istTime } from "@/lib/format";
import { Badge, Card, PageHeader, Stat } from "@/components/ui";

export default async function AiOps() {
  const { supabase } = await requireStaff("/admin/ai");
  const { data: rows } = await supabase.from("ai_interactions").select("*").order("id", { ascending: false }).limit(200);
  const all = rows ?? [];
  const tokensIn = all.reduce((s, r) => s + (r.tokens_in ?? 0), 0); const tokensOut = all.reduce((s, r) => s + (r.tokens_out ?? 0), 0);
  const errors = all.filter((r) => r.outcome !== "success").length;
  const models = new Map<string, number>(); all.forEach((r) => models.set(`${r.provider}/${r.model}`, (models.get(`${r.provider}/${r.model}`) ?? 0) + 1));
  return (
    <>
      <PageHeader eyebrow="AI operations" title="AIRAVAT LIVE / BHASHA governance" subtitle="Provider usage, prompt versions and outcomes. Transcripts are not stored; only metadata. Model and prompt changes are made via environment configuration and recorded here by version." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Interactions (last 200)" value={all.length} /><Stat label="Tokens in / out" value={`${tokensIn} / ${tokensOut}`} /><Stat label="Errors" value={errors} tone={errors ? "loss" : "default"} />
        <Stat label="Anthropic / Sarvam keys" value={`${process.env.ANTHROPIC_API_KEY ? "set" : "missing"} / ${process.env.SARVAM_API_KEY ? "set" : "missing"}`} sub="Server-side only" />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.618fr]">
        <Card title="Model registry (observed)"><ul className="space-y-1 text-sm">{[...models.entries()].map(([m, n]) => <li key={m} className="flex justify-between"><span>{m}</span><span className="tnum">{n}</span></li>)}{models.size === 0 && <li className="text-muted">No usage yet.</li>}</ul>
          <ul className="mt-4 list-disc pl-5 text-xs text-muted"><li>Order tools: none (by design)</li><li>Context: surface + instrument symbol + session only</li><li>Regulated advice: blocked by system prompt; separate licensed service required</li><li>Prompt injection: user content treated as data; no tool execution</li></ul></Card>
        <Card title="Recent interactions">
          <table className="table text-xs"><thead><tr><th>Time</th><th>User</th><th>Provider/model</th><th>Prompt</th><th>Class</th><th className="num">In/Out chars</th><th>Outcome</th></tr></thead>
            <tbody>{all.slice(0, 60).map((r) => <tr key={r.id}><td className="text-muted">{istTime(r.created_at)}</td><td>{r.user_id?.slice(0, 8) ?? "anon"}</td><td>{r.provider}/{r.model}</td><td>{r.prompt_version}</td><td>{r.classification}</td><td className="num">{r.input_chars ?? 0}/{r.output_chars ?? 0}</td><td><Badge tone={r.outcome === "success" ? "ok" : "bad"}>{r.outcome}</Badge></td></tr>)}</tbody></table>
        </Card>
      </div>
    </>
  );
}
