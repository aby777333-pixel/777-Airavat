import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { Notice, PageHeader } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { contentPage } from "@/content/pages";
import { savePage } from "../../actions";

const HEROES = ["home", "platforms", "markets", "research", "daily", "pricing", "showroom", "academy", "trust", "partners", "universe", "briefing", "calculators", "about", "contact", "legal", "instrument"];

// Page editor: starts from the registry page (when overriding) or an existing database row.
export default async function EditPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> }) {
  const [{ id }, { from }] = await Promise.all([params, searchParams]);
  const { supabase, profile } = await requireStaff("/admin/website");
  if (!["editor", "compliance", "admin", "super_admin"].includes(profile?.role ?? "")) return <Notice tone="warn">Editor, compliance or admin role required.</Notice>;
  let row: Record<string, unknown> | null = null;
  if (id !== "new") { const { data } = await supabase.from("site_pages").select("*").eq("id", Number(id)).maybeSingle(); if (!data) notFound(); row = data; }
  const reg = from ? contentPage(from) : null;
  const v = (k: string, fallback: unknown = "") => (row ? row[k] : fallback);
  const d = {
    path: String(v("path", reg?.path ?? "")), group_label: String(v("group_label", reg?.group ?? "Company")), title: String(v("title", reg?.title ?? "")), h1: String(v("h1", reg?.h1 ?? "")), dek: String(v("dek", reg?.dek ?? "") ?? ""), intro: String(v("intro", reg?.intro ?? "") ?? ""),
    keywords: ((v("keywords", reg?.keywords ?? []) as string[]) ?? []).join(", "), hero: String(v("hero", reg?.hero ?? "legal")), availability: String(v("availability", reg?.availability ?? "info")), availability_note: String(v("availability_note", reg?.availabilityNote ?? "") ?? ""),
    sections: JSON.stringify(v("sections", reg?.sections ?? []), null, 2), eligibility: ((v("eligibility", reg?.eligibility ?? []) as string[]) ?? []).join("\n"), risks: ((v("risks", reg?.risks ?? []) as string[]) ?? []).join("\n"), costs: ((v("costs", reg?.costs ?? []) as string[]) ?? []).join("\n"),
    tools: JSON.stringify(v("tools", reg?.tools ?? []), null, 2), faqs: JSON.stringify(v("faqs", reg?.faqs ?? []), null, 2), ctas: JSON.stringify(v("ctas", reg?.ctas ?? []), null, 2), related: ((v("related", reg?.related ?? []) as string[]) ?? []).join("\n"), requires_compliance: Boolean(v("requires_compliance", reg ? reg.availability !== "info" : false)),
  };
  return (
    <>
      <PageHeader eyebrow="Website CMS" title={row ? `Edit ${d.path}` : reg ? `Override ${reg.path}` : "New page"} subtitle="Saving creates a draft version. Pages that make product or availability claims should be flagged for compliance review." action={<Link href="/admin/website" className="btn btn-ghost btn-sm">← Website</Link>} />
      <ActionForm action={savePage} successText="Saved as draft version. Go back to the inventory to send it for review." className="glass grid gap-3 p-5 text-sm md:grid-cols-2">
        {row && <input type="hidden" name="id" value={String(row.id)} />}
        <label className="block"><span className="label">Path</span><input className="input font-mono" name="path" defaultValue={d.path} required pattern="^/[a-z0-9\-/]+$" readOnly={!!row} /></label>
        <label className="block"><span className="label">Group</span><select className="select" name="group_label" defaultValue={d.group_label}>{["Invest", "Trade", "Markets", "Intelligence", "Tools", "Learn", "Pricing", "Company"].map((g) => <option key={g}>{g}</option>)}</select></label>
        <label className="block"><span className="label">SEO title</span><input className="input" name="title" defaultValue={d.title} required maxLength={120} /></label>
        <label className="block"><span className="label">H1</span><input className="input" name="h1" defaultValue={d.h1} required /></label>
        <label className="block md:col-span-2"><span className="label">Dek (meta description)</span><input className="input" name="dek" defaultValue={d.dek} maxLength={300} /></label>
        <label className="block md:col-span-2"><span className="label">Intro (keyword-rich)</span><textarea className="input" name="intro" rows={3} defaultValue={d.intro} /></label>
        <label className="block"><span className="label">Keywords (comma separated)</span><input className="input" name="keywords" defaultValue={d.keywords} /></label>
        <label className="block"><span className="label">Hero variant</span><select className="select" name="hero" defaultValue={d.hero}>{HEROES.map((h) => <option key={h}>{h}</option>)}</select></label>
        <label className="block"><span className="label">Availability</span><select className="select" name="availability" defaultValue={d.availability}><option value="sandbox">sandbox</option><option value="soon">soon (designed, not enabled)</option><option value="research">research only</option><option value="info">information</option></select></label>
        <label className="block"><span className="label">Availability note</span><input className="input" name="availability_note" defaultValue={d.availability_note} /></label>
        <label className="block md:col-span-2"><span className="label">Sections (JSON: [{`{h, p[], bullets[], table{head[], rows[][]}}`}])</span><textarea className="input min-h-48 font-mono text-xs" name="sections" defaultValue={d.sections} /></label>
        <label className="block"><span className="label">Eligibility (one per line)</span><textarea className="input" name="eligibility" rows={3} defaultValue={d.eligibility} /></label>
        <label className="block"><span className="label">Risks (one per line)</span><textarea className="input" name="risks" rows={3} defaultValue={d.risks} /></label>
        <label className="block"><span className="label">Costs (one per line)</span><textarea className="input" name="costs" rows={3} defaultValue={d.costs} /></label>
        <label className="block"><span className="label">Related paths (one per line)</span><textarea className="input" name="related" rows={3} defaultValue={d.related} /></label>
        <label className="block"><span className="label">Tools (JSON [{`{href,label}`}])</span><textarea className="input font-mono text-xs" name="tools" rows={4} defaultValue={d.tools} /></label>
        <label className="block"><span className="label">CTAs (JSON [{`{href,label,primary}`}])</span><textarea className="input font-mono text-xs" name="ctas" rows={4} defaultValue={d.ctas} /></label>
        <label className="block md:col-span-2"><span className="label">FAQs (JSON [{`{q,a}`}])</span><textarea className="input min-h-32 font-mono text-xs" name="faqs" defaultValue={d.faqs} /></label>
        <label className="flex items-center gap-2"><input type="checkbox" name="requires_compliance" defaultChecked={d.requires_compliance} /> Requires compliance review before approval</label>
        <label className="block"><span className="label">Change note</span><input className="input" name="change_note" placeholder="What changed and why" /></label>
        <div className="md:col-span-2"><button className="btn btn-primary">{row ? "Save new version" : "Create draft"}</button></div>
      </ActionForm>
    </>
  );
}
