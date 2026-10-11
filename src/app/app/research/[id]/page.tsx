import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { requireUser } from "@/lib/auth";
import { istTime } from "@/lib/format";
import { Badge, Card, PageHeader } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { addEvidence, closeCase, createShadow } from "../../intel/actions";
import WarRoom from "./WarRoom";

const classTone = (c: string) => (c === "fact" ? "ok" : c === "contradiction" ? "bad" : c === "estimate" ? "info" : "default");
const stanceLabel: Record<string, string> = { bull: "Bull analyst", bear: "Bear analyst", neutral: "Neutral analyst", auditor: "Auditor", summary: "Council summary" };

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser(`/app/research/${id}`);
  const { data: c } = await supabase.from("research_cases").select("*, instrument:instruments(symbol,name)").eq("id", Number(id)).maybeSingle();
  if (!c) notFound();
  const [{ data: evidence }, { data: findings }] = await Promise.all([
    supabase.from("research_evidence").select("*").eq("case_id", c.id).order("created_at"),
    supabase.from("research_findings").select("*").eq("case_id", c.id).order("created_at"),
  ]);
  const ins = (Array.isArray(c.instrument) ? c.instrument[0] : c.instrument) as { symbol: string; name: string } | null;
  const groups = ["fact", "estimate", "hypothesis", "contradiction"] as const;
  return (
    <>
      <PageHeader eyebrow={`Case #${c.id} · ${c.kind}`} title={c.title} subtitle={<>{ins?.symbol} · {ins?.name} · <Badge tone={c.status === "open" ? "info" : "default"}>{c.status}</Badge> · opened {istTime(c.created_at)}</>} action={<Link href="/app/research" className="btn btn-ghost btn-sm">← Cases</Link>} />
      {c.question && <p className="mb-5 text-sm text-muted">Question: {c.question}</p>}
      {c.summary && <div className="m-ceramic mb-5 p-5 text-sm text-[#1d1b17]"><strong>Closing summary.</strong> {c.summary}</div>}
      <div className="grid gap-5 lg:grid-cols-[1.618fr_1fr]">
        <div className="space-y-5">
          <Card title="Evidence board" subtitle="Facts, estimates, hypotheses and contradictions are kept apart. Every item names its source.">
            {groups.map((g) => {
              const rows = (evidence ?? []).filter((e) => e.classification === g);
              return (
                <div key={g} className="mb-4">
                  <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider"><Badge tone={classTone(g)}>{g}</Badge><span className="text-faint">{rows.length}</span></div>
                  {rows.length === 0 ? <p className="text-xs text-muted">None recorded.</p> : rows.map((e) => (
                    <div key={e.id} className={clsx("mb-2 rounded-lg border p-3 text-sm", g === "contradiction" ? "border-loss/40 bg-loss/5" : "border-border bg-bg/30")}>
                      <div className="font-medium">{e.title}</div>
                      {e.body && <p className="mt-1 text-muted">{e.body}</p>}
                      <div className="mt-1 text-xs text-faint">Source: {e.source_url ? <a className="underline" href={e.source_url} target="_blank" rel="noreferrer">{e.source}</a> : e.source} · {e.kind} · {istTime(e.observed_at)}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </Card>
          <Card title="AI Research Council" subtitle="Bull, bear and neutral analysts argue from the board; an auditor checks for contradictions and unsupported claims.">
            {(findings ?? []).length === 0 ? <p className="text-sm text-muted">No findings yet. Convene the War Room to generate the four stances from the current evidence.</p> : (
              <div className="grid gap-3 md:grid-cols-2">
                {(findings ?? []).map((f) => (
                  <div key={f.id} className={clsx("rounded-xl border p-3 text-sm", f.stance === "bull" ? "border-profit/40" : f.stance === "bear" ? "border-loss/40" : f.stance === "auditor" ? "border-warn/40 md:col-span-2" : "border-border")}>
                    <div className="flex items-center justify-between text-xs"><span className="font-semibold uppercase tracking-wider">{stanceLabel[f.stance] ?? f.stance}</span><span className="text-faint">{f.generated_by === "ai" ? `${f.model} · ${f.prompt_version}` : "user"} · {istTime(f.created_at, false)}</span></div>
                    <p className="mt-2 whitespace-pre-wrap text-muted">{f.body}</p>
                  </div>
                ))}
              </div>
            )}
            {c.status === "open" && <div className="mt-3"><WarRoom caseId={c.id} /></div>}
            <p className="mt-3 text-xs text-faint">AI output is generated from the evidence board only, labelled with model and prompt version, and reviewed by you. It is not a recommendation.</p>
          </Card>
        </div>
        <div className="space-y-5">
          {c.status === "open" && (
            <Card title="Add evidence">
              <ActionForm action={addEvidence} successText="Added. Refresh to see it on the board." className="space-y-2 text-sm">
                <input type="hidden" name="case_id" value={c.id} />
                <input className="input" name="title" placeholder="Title" required />
                <textarea className="input" name="body" rows={3} placeholder="What was observed, and where" />
                <input className="input" name="source" placeholder="Source (e.g. Annual report FY25 p.12)" required />
                <input className="input" name="source_url" placeholder="Source URL (optional)" />
                <select className="select" name="classification" defaultValue="hypothesis"><option value="fact">Fact (sourced)</option><option value="estimate">Estimate</option><option value="hypothesis">Hypothesis</option><option value="contradiction">Contradiction</option></select>
                <button className="btn btn-primary btn-sm">Add to board</button>
              </ActionForm>
            </Card>
          )}
          <Card title="Shadow it" subtitle="Test the thesis with simulated money, isolated from your account">
            <ActionForm action={createShadow} successText="Shadow portfolio created. Open Shadow Portfolio to trade it." className="space-y-2 text-sm">
              <input type="hidden" name="case_id" value={c.id} />
              <input className="input" name="name" defaultValue={`Shadow · ${c.title}`.slice(0, 60)} />
              <input className="input tnum" name="cash" type="number" defaultValue={1000000} min={10000} max={100000000} />
              <input className="input" name="thesis" placeholder="Thesis in one line" />
              <button className="btn btn-ghost btn-sm">Create shadow portfolio</button>
            </ActionForm>
          </Card>
          {c.status === "open" && (
            <Card title="Close case">
              <ActionForm action={closeCase} successText="Case closed." className="space-y-2 text-sm">
                <input type="hidden" name="case_id" value={c.id} />
                <textarea className="input" name="summary" rows={3} placeholder="What did the evidence support, what remained open?" required />
                <button className="btn btn-ghost btn-sm">Close with summary</button>
              </ActionForm>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
