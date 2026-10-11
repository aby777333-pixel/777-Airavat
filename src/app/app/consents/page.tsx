import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { istTime } from "@/lib/format";
import { Badge, PageHeader } from "@/components/ui";
import { acceptDocument } from "../actions";

export default async function Consents() {
  const { supabase, user } = await requireUser("/app/consents");
  const [{ data: docs }, { data: consents }] = await Promise.all([
    supabase.from("legal_documents").select("*").order("slug").order("version", { ascending: false }),
    supabase.from("consents").select("*").eq("user_id", user.id),
  ]);
  const latest = new Map<string, NonNullable<typeof docs>[number]>();
  (docs ?? []).forEach((d) => { if (!latest.has(d.slug)) latest.set(d.slug, d); });
  const byDoc = new Map((consents ?? []).map((c) => [c.document_id, c]));
  return (
    <>
      <PageHeader eyebrow="Consent vault" title="Your accepted documents" subtitle="Each acceptance stores the document version, a content hash and a timestamp. A material new version requires fresh affirmative acceptance." />
      <div className="glass overflow-x-auto p-2">
        <table className="table text-sm">
          <thead><tr><th>Document</th><th>Version</th><th>Status</th><th>Accepted</th><th>Hash</th><th></th></tr></thead>
          <tbody>{[...latest.values()].map((d) => { const c = byDoc.get(d.id); return (
            <tr key={d.id}><td><Link className="font-semibold hover:text-accent" href={`/legal/${d.slug}`} target="_blank">{d.title}</Link>{d.mandatory && <span className="ml-2 badge">Mandatory</span>}</td><td className="tnum">v{d.version}</td>
              <td>{c ? <Badge tone="ok">Accepted</Badge> : <Badge tone="bad">Not accepted</Badge>}</td><td className="text-xs text-muted">{c ? istTime(c.accepted_at) : "—"}</td><td className="text-xs text-faint">{(c?.content_hash ?? d.content_hash).slice(0, 12)}…</td>
              <td className="text-right">{!c && <form action={acceptDocument}><input type="hidden" name="slug" value={d.slug} /><button className="btn btn-primary btn-sm">I accept</button></form>}</td></tr>); })}</tbody>
        </table>
      </div>
    </>
  );
}
