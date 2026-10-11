"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveArticle } from "../../ops/actions";
import { Markdown } from "@/lib/markdown";

type Article = { id: number; title: string; dek: string | null; body_md: string; category_id: number | null; classification: string; seo_title: string | null; seo_description: string | null; sources: { title: string; url?: string }[]; tags: string[]; ai_assisted: boolean } | null;
const TASKS: [string, string][] = [["outline", "Outline"], ["draft", "Draft"], ["headlines", "Headlines"], ["seo", "SEO pack"], ["summary", "Summary & dek"], ["factcheck", "Fact-check flags"]];

export default function ArticleEditor({ article, categories, readOnly }: { article: Article; categories: { id: number; name: string }[]; readOnly: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState(article?.title ?? "");
  const [body, setBody] = useState(article?.body_md ?? "");
  const [ai, setAi] = useState(article?.ai_assisted ?? false);
  const [preview, setPreview] = useState(false);
  const [copilot, setCopilot] = useState<{ busy: boolean; text: string | null; error: string | null }>({ busy: false, text: null, error: null });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function runCopilot(task: string) {
    setCopilot({ busy: true, text: null, error: null });
    try {
      const r = await fetch("/api/editorial", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ task, topic: title || "Untitled", body: body || undefined }) });
      const d = await r.json();
      if (!r.ok) setCopilot({ busy: false, text: null, error: d.error ?? "Copilot unavailable" }); else setCopilot({ busy: false, text: d.text ?? JSON.stringify(d), error: null });
    } catch { setCopilot({ busy: false, text: null, error: "Network error" }); }
  }
  return (
    <form className="glass space-y-3 p-5 text-sm" action={async (f) => { setMsg(null); const r = await saveArticle(f); if (!r.ok) setMsg({ ok: false, text: r.error ?? "Save failed" }); else { setMsg({ ok: true, text: "Saved as revision." }); if (!article) router.push(`/admin/editorial/${r.data}`); else router.refresh(); } }}>
      {article && <input type="hidden" name="id" value={article.id} />}
      <fieldset disabled={readOnly} className="contents">
        <label className="block"><span className="label">Title</span><input className="input" name="title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={4} /></label>
        <label className="block"><span className="label">Dek (one-sentence summary)</span><input className="input" name="dek" defaultValue={article?.dek ?? ""} /></label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block"><span className="label">Category</span><select className="select" name="category_id" defaultValue={article?.category_id ?? ""}><option value="">—</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="block"><span className="label">Classification</span><select className="select" name="classification" defaultValue={article?.classification ?? "education"}><option value="education">education</option><option value="tutorial">tutorial</option><option value="company_update">company update</option><option value="market_commentary">market commentary (compliance)</option><option value="news_summary">news summary (compliance)</option><option value="research">research (compliance)</option></select></label>
        </div>
        <div className="flex items-center justify-between"><span className="label">Body (Markdown)</span><div className="flex gap-1"><button type="button" className={preview ? "btn btn-ghost btn-sm" : "btn btn-primary btn-sm"} onClick={() => setPreview(false)}>Write</button><button type="button" className={preview ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"} onClick={() => setPreview(true)}>Preview</button></div></div>
        {preview ? <div className="m-ceramic prose max-h-[32rem] overflow-auto p-5 text-[#1d1b17]"><Markdown source={body || "_Nothing yet._"} /></div> : <textarea className="input min-h-[28rem] font-mono text-xs" name="body_md" value={body} onChange={(e) => setBody(e.target.value)} />}
        {preview && <input type="hidden" name="body_md" value={body} />}
        <label className="block"><span className="label">Sources (one per line: Title | URL)</span><textarea className="input" name="sources" rows={3} defaultValue={(article?.sources ?? []).map((s) => (s.url ? `${s.title} | ${s.url}` : s.title)).join("\n")} /></label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block"><span className="label">Tags (comma separated)</span><input className="input" name="tags" defaultValue={(article?.tags ?? []).join(", ")} /></label>
          <label className="block"><span className="label">Change note</span><input className="input" name="change_note" placeholder="What changed in this revision" /></label>
          <label className="block"><span className="label">SEO title</span><input className="input" name="seo_title" defaultValue={article?.seo_title ?? ""} maxLength={70} /></label>
          <label className="block"><span className="label">SEO description</span><input className="input" name="seo_description" defaultValue={article?.seo_description ?? ""} maxLength={160} /></label>
        </div>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="ai_assisted" checked={ai} onChange={(e) => setAi(e.target.checked)} /> AI assisted (label shown publicly; still human-reviewed)</label>
        <div className="flex flex-wrap items-center gap-2"><button className="btn btn-primary">{article ? "Save revision" : "Create draft"}</button>{msg && <span className={msg.ok ? "text-xs text-profit" : "text-xs text-loss"} role="status">{msg.text}</span>}</div>
      </fieldset>
      {!readOnly && (
        <div className="m-dichroic p-4">
          <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold uppercase tracking-wider">AI editorial copilot</span><span className="text-xs text-muted">Suggestions only; nothing publishes without human edits and approvals.</span></div>
          <div className="mt-2 flex flex-wrap gap-1">{TASKS.map(([t, l]) => <button type="button" key={t} className="btn btn-ghost btn-sm" disabled={copilot.busy || title.length < 3} onClick={() => runCopilot(t)}>{l}</button>)}</div>
          {copilot.busy && <div className="mt-2 text-xs text-muted">Thinking…</div>}
          {copilot.error && <div className="mt-2 text-xs text-loss">{copilot.error}</div>}
          {copilot.text && <div className="mt-2"><pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-bg/50 p-2 text-xs">{copilot.text}</pre><div className="mt-1 flex gap-1"><button type="button" className="btn btn-ghost btn-sm" onClick={() => { setBody((b) => (b ? b + "\n\n" : "") + copilot.text); setAi(true); }}>Insert into body</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard?.writeText(copilot.text ?? "")}>Copy</button></div></div>}
        </div>
      )}
    </form>
  );
}
