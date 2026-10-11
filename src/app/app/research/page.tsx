import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { istTime } from "@/lib/format";
import { Badge, Card, Notice, PageHeader } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { createCase } from "../intel/actions";

export default async function Research() {
  const { supabase, user } = await requireUser("/app/research");
  const { data: cases } = await supabase.from("research_cases").select("*, instrument:instruments(symbol)").eq("owner_id", user.id).order("created_at", { ascending: false });
  return (
    <>
      <PageHeader eyebrow="Research ONE · Market Detective" title="Investigation cases" subtitle="Open a case on an instrument. The evidence board is seeded with sourced sandbox facts and an explicit list of what is missing; the AI Research Council then argues both sides and audits itself." />
      <Notice tone="info">Research output is educational. It is not a recommendation, and nothing on these screens can place an order.</Notice>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.618fr]">
        <Card title="Open a case">
          <ActionForm action={createCase} successText="Case opened. Refresh to see it in the list." className="space-y-3 text-sm">
            <label className="block"><span className="label">Title</span><input className="input" name="title" required minLength={3} placeholder="Why is RELIANCE breaking out?" /></label>
            <label className="block"><span className="label">Instrument symbol</span><input className="input" name="symbol" placeholder="RELIANCE" required /></label>
            <label className="block"><span className="label">Question</span><textarea className="input" name="question" rows={3} placeholder="What would have to be true for the move to continue? What contradicts it?" /></label>
            <label className="block"><span className="label">Kind</span><select className="select" name="kind" defaultValue="investigation"><option value="investigation">Investigation</option><option value="thesis">Thesis review</option><option value="event">Event study</option><option value="forensic">Forensic review</option></select></label>
            <button className="btn btn-primary btn-sm">Open case</button>
          </ActionForm>
        </Card>
        <Card title={`Your cases (${(cases ?? []).length})`}>
          {(cases ?? []).length === 0 ? <p className="text-sm text-muted">No cases yet.</p> : (
            <ul className="divide-y divide-border">
              {(cases ?? []).map((c) => { const ins = (Array.isArray(c.instrument) ? c.instrument[0] : c.instrument) as { symbol: string } | null; return (
                <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                  <div><Link href={`/app/research/${c.id}`} className="font-semibold hover:text-accent">{c.title}</Link><div className="text-xs text-muted">{ins?.symbol} · {c.kind} · opened {istTime(c.created_at)}</div></div>
                  <Badge tone={c.status === "open" ? "info" : "default"}>{c.status}</Badge>
                </li>); })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
