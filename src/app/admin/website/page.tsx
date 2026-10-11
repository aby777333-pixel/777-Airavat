import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { istTime } from "@/lib/format";
import { Badge, Card, Notice, PageHeader } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { CONTENT_PAGES } from "@/content/pages";
import { NAV_GROUPS } from "@/lib/navigation";
import { deleteFaq, publishMenu, registerMedia, saveFaq, saveHero, saveMenu, saveSetting, transitionPage } from "./actions";
import MediaUpload from "./MediaUpload";

const tone = (st: string) => (st === "published" ? "ok" : st === "archived" ? "default" : st === "compliance_review" ? "bad" : "info");
const HEROES = ["home", "platforms", "markets", "research", "daily", "pricing", "showroom", "academy", "trust", "partners", "universe", "briefing", "calculators", "about", "contact", "legal", "instrument"];

export default async function WebsiteCms({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "pages" } = await searchParams;
  const { supabase, profile } = await requireStaff("/admin/website");
  const editorial = ["editor", "compliance", "admin", "super_admin"].includes(profile?.role ?? "");
  const [{ data: pages }, { data: menus }, { data: heroes }, { data: faqs }, { data: media }, { data: settings }] = await Promise.all([
    supabase.from("site_pages").select("id,path,title,status,version,updated_at,requires_compliance,scheduled_for").order("path"),
    supabase.from("site_menus").select("*"), supabase.from("site_heroes").select("*").order("path"), supabase.from("site_faqs").select("*").order("path").order("position"),
    supabase.from("site_media").select("*").order("created_at", { ascending: false }).limit(60), supabase.from("site_settings").select("*"),
  ]);
  const overrides = new Map((pages ?? []).map((p) => [p.path, p]));
  const tabs = ["pages", "menu", "heroes", "faqs", "media", "settings"];
  return (
    <>
      <PageHeader eyebrow="Website CMS" title="Pages, menus, heroes, FAQs, media and SEO" subtitle="Code-registry pages ship by default; database overrides go through draft → review → approval → publish with versions, scheduling and audit. Authors cannot approve their own work." action={editorial ? <Link href="/admin/website/edit/new" className="btn btn-primary btn-sm">New page</Link> : undefined} />
      {!editorial && <Notice tone="warn">Read-only for your role. Editor, compliance or admin can edit.</Notice>}
      <div className="my-4 flex flex-wrap gap-2">{tabs.map((t) => <Link key={t} href={`/admin/website?tab=${t}`} className={t === tab ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}>{t}</Link>)}</div>

      {tab === "pages" && (
        <Card title="Page inventory" subtitle={`${CONTENT_PAGES.length} registry pages · ${(pages ?? []).length} database overrides`}>
          <div className="max-h-[70vh] overflow-auto"><table className="table text-xs"><thead><tr><th>Path</th><th>Title</th><th>Source</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead>
            <tbody>
              {CONTENT_PAGES.map((p) => { const o = overrides.get(p.path); return (
                <tr key={p.path}><td className="font-mono">{p.path}</td><td>{o?.title ?? p.h1}</td><td>{o ? <Badge tone="accent">override v{o.version}</Badge> : <Badge>registry</Badge>}</td><td>{o ? <Badge tone={tone(o.status)}>{o.status}</Badge> : <Badge tone="ok">live (code)</Badge>}</td><td className="text-muted">{o ? istTime(o.updated_at, false) : p.updated}</td>
                  <td className="flex flex-wrap gap-1"><Link className="btn btn-ghost btn-sm" href={p.path} target="_blank">View</Link>{editorial && <Link className="btn btn-ghost btn-sm" href={`/admin/website/edit/${o ? o.id : "new"}?from=${encodeURIComponent(p.path)}`}>{o ? "Edit" : "Override"}</Link>}
                    {editorial && o && <ActionForm action={transitionPage} className="flex gap-1"><input type="hidden" name="id" value={o.id} /><input type="hidden" name="path" value={o.path} />{o.status === "draft" && <button className="btn btn-ghost btn-sm" name="to" value="in_review">Review</button>}{o.status === "in_review" && <><button className="btn btn-ghost btn-sm" name="to" value={o.requires_compliance ? "compliance_review" : "approved"}>{o.requires_compliance ? "To compliance" : "Approve"}</button></>}{o.status === "compliance_review" && <button className="btn btn-ghost btn-sm" name="to" value="approved">Compliance approve</button>}{o.status === "approved" && <><button className="btn btn-primary btn-sm" name="to" value="published">Publish</button><input className="input !w-40 !py-1 !text-xs" type="datetime-local" name="scheduled_for" /><button className="btn btn-ghost btn-sm" name="to" value="scheduled">Schedule</button></>}{o.status === "published" && <button className="btn btn-ghost btn-sm" name="to" value="archived">Archive (revert to code)</button>}{["in_review", "compliance_review", "approved", "scheduled", "archived"].includes(o.status) && <button className="btn btn-ghost btn-sm" name="to" value="draft">Draft</button>}</ActionForm>}</td></tr>); })}
              {(pages ?? []).filter((o) => !CONTENT_PAGES.some((p) => p.path === o.path)).map((o) => (
                <tr key={o.path}><td className="font-mono">{o.path}</td><td>{o.title}</td><td><Badge tone="accent">new page v{o.version}</Badge></td><td><Badge tone={tone(o.status)}>{o.status}</Badge></td><td className="text-muted">{istTime(o.updated_at, false)}</td>
                  <td className="flex flex-wrap gap-1"><Link className="btn btn-ghost btn-sm" href={o.path} target="_blank">View</Link>{editorial && <Link className="btn btn-ghost btn-sm" href={`/admin/website/edit/${o.id}`}>Edit</Link>}{editorial && <ActionForm action={transitionPage} className="flex gap-1"><input type="hidden" name="id" value={o.id} /><input type="hidden" name="path" value={o.path} />{o.status === "draft" && <button className="btn btn-ghost btn-sm" name="to" value="in_review">Review</button>}{o.status === "in_review" && <button className="btn btn-ghost btn-sm" name="to" value={o.requires_compliance ? "compliance_review" : "approved"}>{o.requires_compliance ? "To compliance" : "Approve"}</button>}{o.status === "compliance_review" && <button className="btn btn-ghost btn-sm" name="to" value="approved">Compliance approve</button>}{o.status === "approved" && <button className="btn btn-primary btn-sm" name="to" value="published">Publish</button>}{o.status === "published" && <button className="btn btn-ghost btn-sm" name="to" value="archived">Archive</button>}</ActionForm>}</td></tr>
              ))}
            </tbody></table></div>
        </Card>
      )}

      {tab === "menu" && (
        <Card title="Primary menu" subtitle="JSON structure of groups and links. Saving creates a draft version; publishing needs a different editor than the author (or super_admin).">
          {(menus ?? []).map((m) => <div key={m.key} className="mb-2 text-xs text-muted">Stored menu <strong>{m.key}</strong> v{m.version} · <Badge tone={tone(m.status)}>{m.status}</Badge> · updated {istTime(m.updated_at)}</div>)}
          {editorial && <ActionForm action={saveMenu} successText="Saved as draft." className="space-y-2 text-sm"><input type="hidden" name="key" value="primary" /><textarea className="input min-h-[28rem] font-mono text-xs" name="structure" defaultValue={JSON.stringify((menus ?? []).find((m) => m.key === "primary")?.structure ?? NAV_GROUPS, null, 2)} /><button className="btn btn-primary btn-sm">Save draft</button></ActionForm>}
          {editorial && (menus ?? []).some((m) => m.key === "primary") && <div className="mt-3 flex gap-2"><ActionForm action={publishMenu} successText="Published."><input type="hidden" name="key" value="primary" /><input type="hidden" name="publish" value="1" /><button className="btn btn-primary btn-sm">Publish override</button></ActionForm><ActionForm action={publishMenu} successText="Reverted to code menu."><input type="hidden" name="key" value="primary" /><input type="hidden" name="publish" value="0" /><button className="btn btn-ghost btn-sm">Revert to code menu</button></ActionForm></div>}
        </Card>
      )}

      {tab === "heroes" && (
        <Card title="Hero content" subtitle="Override the animation variant, headline and intro of any public page">
          {editorial && <ActionForm action={saveHero} successText="Saved." className="grid grid-cols-4 gap-2 text-sm"><input className="input" name="path" placeholder="/invest/stocks" required /><select className="select" name="variant">{HEROES.map((h) => <option key={h}>{h}</option>)}</select><input className="input col-span-2" name="headline" placeholder="Headline override (optional)" /><textarea className="input col-span-3" name="intro" rows={2} placeholder="Intro override (optional)" /><label className="flex items-center gap-2 text-xs"><input type="checkbox" name="publish" /> Publish now</label><button className="btn btn-primary btn-sm col-span-4">Save hero</button></ActionForm>}
          <table className="table mt-3 text-xs"><thead><tr><th>Path</th><th>Variant</th><th>Headline</th><th>Status</th><th>Updated</th></tr></thead><tbody>{(heroes ?? []).map((h) => <tr key={h.path}><td className="font-mono">{h.path}</td><td>{h.variant}</td><td>{h.headline}</td><td><Badge tone={tone(h.status)}>{h.status}</Badge></td><td className="text-muted">{istTime(h.updated_at, false)}</td></tr>)}{(heroes ?? []).length === 0 && <tr><td colSpan={5} className="text-muted">No overrides; code heroes apply.</td></tr>}</tbody></table>
        </Card>
      )}

      {tab === "faqs" && (
        <Card title="FAQs" subtitle="Published FAQs are appended to the page's registry FAQs and emitted as FAQPage structured data">
          {editorial && <ActionForm action={saveFaq} successText="Saved." className="grid grid-cols-4 gap-2 text-sm"><input className="input" name="path" placeholder="/pricing/faqs" required /><input className="input col-span-2" name="question" placeholder="Question" required /><input className="input tnum" name="position" type="number" defaultValue={0} /><textarea className="input col-span-3" name="answer" rows={2} placeholder="Answer" required /><select className="select" name="status"><option value="draft">draft</option><option value="published">published</option></select><button className="btn btn-primary btn-sm col-span-4">Add FAQ</button></ActionForm>}
          <table className="table mt-3 text-xs"><thead><tr><th>Path</th><th>Question</th><th>Status</th><th></th></tr></thead><tbody>{(faqs ?? []).map((f) => <tr key={f.id}><td className="font-mono">{f.path}</td><td>{f.question}<div className="text-muted">{f.answer}</div></td><td><Badge tone={tone(f.status)}>{f.status}</Badge></td><td className="flex gap-1">{editorial && <ActionForm action={saveFaq}><input type="hidden" name="id" value={f.id} /><input type="hidden" name="path" value={f.path} /><input type="hidden" name="question" value={f.question} /><input type="hidden" name="answer" value={f.answer} /><input type="hidden" name="status" value={f.status === "published" ? "draft" : "published"} /><button className="btn btn-ghost btn-sm">{f.status === "published" ? "Unpublish" : "Publish"}</button></ActionForm>}{editorial && <ActionForm action={deleteFaq}><input type="hidden" name="id" value={f.id} /><button className="btn btn-ghost btn-sm">Delete</button></ActionForm>}</td></tr>)}</tbody></table>
        </Card>
      )}

      {tab === "media" && (
        <Card title="Media library" subtitle="Upload to the site-media bucket (staff session) or register an external URL. Alt text is mandatory.">
          {editorial && <MediaUpload />}
          {editorial && <ActionForm action={registerMedia} successText="Registered." className="mt-3 grid grid-cols-4 gap-2 text-sm"><input className="input col-span-2" name="url" placeholder="https://… or /showroom/home.jpg" required /><input className="input" name="alt" placeholder="Alt text" required /><select className="select" name="kind"><option>image</option><option>document</option><option>video</option></select><input className="input col-span-3" name="tags" placeholder="tags, comma separated" /><button className="btn btn-ghost btn-sm">Register URL</button></ActionForm>}
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">{(media ?? []).map((m) => <figure key={m.id} className="glass overflow-hidden text-xs">{m.kind === "image" ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={m.url} alt={m.alt} className="aspect-video w-full object-cover" loading="lazy" /> : <div className="aspect-video bg-bg/40 p-3">{m.kind}</div>}<figcaption className="p-2"><div className="truncate font-mono">{m.url}</div><div className="text-muted">{m.alt}</div></figcaption></figure>)}</div>
        </Card>
      )}

      {tab === "settings" && (
        <Card title="SEO defaults and product availability" subtitle="product_availability changes require compliance; they gate what product pages claim">
          {(settings ?? []).map((st) => (
            <ActionForm key={st.key} action={saveSetting} successText="Saved." className="mb-4 text-sm"><div className="mb-1 font-mono text-xs">{st.key}</div><input type="hidden" name="key" value={st.key} /><textarea className="input min-h-28 font-mono text-xs" name="value" defaultValue={JSON.stringify(st.value, null, 2)} disabled={!editorial} />{editorial && <button className="btn btn-ghost btn-sm mt-1">Save</button>}<div className="text-[11px] text-faint">updated {istTime(st.updated_at)}</div></ActionForm>
          ))}
          <div className="text-xs text-muted">Sitemap: <a className="underline" href="/sitemap.xml" target="_blank">/sitemap.xml</a> · Robots: <a className="underline" href="/robots.txt" target="_blank">/robots.txt</a> · Structured data: Organization, WebSite, BreadcrumbList, FAQPage. Search analytics integration requires a verified property in a search console (owner action).</div>
        </Card>
      )}
    </>
  );
}
