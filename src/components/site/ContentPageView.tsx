import Link from "next/link";
import clsx from "clsx";
import type { ContentPage } from "@/content/types";
import { Badge, PageHeader } from "@/components/ui";
import PageHero from "./PageHero";
import { contentPage } from "@/content/pages";
import { SITE } from "@/lib/seo";

const availBadge: Record<string, { tone: "ok" | "info" | "default" | "bad"; label: string }> = { sandbox: { tone: "ok", label: "Sandbox live" }, soon: { tone: "info", label: "Designed, not enabled" }, research: { tone: "default", label: "Research only" }, info: { tone: "default", label: "Information" } };

export function Breadcrumbs({ items }: { items: { href: string; label: string }[] }) {
  const ld = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.label, item: `${SITE.url}${it.href}` })) };
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted">
      <ol className="flex flex-wrap items-center gap-1">{items.map((it, i) => <li key={it.href} className="flex items-center gap-1">{i > 0 && <span aria-hidden="true">/</span>}{i === items.length - 1 ? <span aria-current="page" className="text-text">{it.label}</span> : <Link className="hover:text-text" href={it.href}>{it.label}</Link>}</li>)}</ol>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </nav>
  );
}

// Renders a registry page: hero, availability, sections, eligibility/risks/costs, tools, FAQs (with FAQPage JSON-LD), CTAs, related links.
export default function ContentPageView({ page, groupHref }: { page: ContentPage; groupHref: string }) {
  const b = availBadge[page.availability];
  const faqLd = page.faqs.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: page.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) } : null;
  const related = [...new Set(page.related)].filter((r) => r !== page.path).map((r) => ({ href: r, label: contentPage(r)?.h1 ?? r.split("/").pop()?.replace(/-/g, " ") ?? r }));
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: groupHref, label: page.group }, { href: page.path, label: page.h1 }]} />
      <PageHero variant={page.hero} intro={page.intro}>
        <PageHeader eyebrow={page.group} title={page.h1} subtitle={<>{page.dek} <Badge tone={b.tone}>{b.label}</Badge></>} />
      </PageHero>
      <div className={clsx("mb-6 rounded-xl border p-4 text-sm", page.availability === "sandbox" ? "border-profit/40 bg-profit/10" : page.availability === "soon" ? "border-info/40 bg-info/10" : "border-border bg-bg/30")}><strong>Availability.</strong> {page.availabilityNote}</div>
      <div className="grid gap-8 lg:grid-cols-[1.618fr_1fr]">
        <article className="space-y-8">
          {page.sections.map((s) => (
            <section key={s.h}>
              <h2 className="font-display text-xl font-semibold">{s.h}</h2>
              {s.p?.map((p, i) => <p key={i} className="mt-2 text-sm leading-relaxed text-muted">{p}</p>)}
              {s.bullets && <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">{s.bullets.map((x) => <li key={x}>{x}</li>)}</ul>}
              {s.table && <div className="glass mt-3 overflow-x-auto p-2"><table className="table text-sm"><thead><tr>{s.table.head.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{s.table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={j === 0 ? "font-medium" : "text-muted"}>{c}</td>)}</tr>)}</tbody></table></div>}
            </section>
          ))}
          {page.faqs.length > 0 && (
            <section id="faqs"><h2 className="font-display text-xl font-semibold">Frequently asked questions</h2>
              <div className="mt-3 space-y-2">{page.faqs.map((f) => <details key={f.q} className="glass p-4"><summary className="cursor-pointer font-medium">{f.q}</summary><p className="mt-2 text-sm text-muted">{f.a}</p></details>)}</div>
              {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}
            </section>
          )}
        </article>
        <aside className="space-y-5">
          <div className="m-crystal p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Next steps</div>
            <div className="mt-3 flex flex-col gap-2">{page.ctas.map((c) => <Link key={c.href} href={c.href} className={clsx("btn", c.primary ? "btn-primary" : "btn-ghost")}>{c.label}</Link>)}</div>
          </div>
          {page.eligibility && <div className="glass p-5"><div className="font-display font-semibold">Eligibility</div><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">{page.eligibility.map((x) => <li key={x}>{x}</li>)}</ul></div>}
          {page.costs && <div className="glass p-5"><div className="font-display font-semibold">Costs</div><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">{page.costs.map((x) => <li key={x}>{x}</li>)}</ul><Link href="/pricing" className="mt-2 inline-block text-xs text-accent">Full schedule →</Link></div>}
          {page.risks && <div className="rounded-xl border border-warn/40 bg-warn/10 p-5"><div className="font-display font-semibold text-warn">Risks</div><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">{page.risks.map((x) => <li key={x}>{x}</li>)}</ul></div>}
          {page.tools && page.tools.length > 0 && <div className="glass p-5"><div className="font-display font-semibold">Tools</div><ul className="mt-2 space-y-1 text-sm">{page.tools.map((t) => <li key={t.href}><Link className="text-accent hover:underline" href={t.href}>{t.label} →</Link></li>)}</ul></div>}
          {related.length > 0 && <div className="glass p-5"><div className="font-display font-semibold">Related</div><ul className="mt-2 space-y-1 text-sm capitalize">{related.map((r) => <li key={r.href}><Link className="text-muted hover:text-text" href={r.href}>{r.label}</Link></li>)}</ul></div>}
          <p className="text-[11px] text-faint">Last reviewed {page.updated}. Educational content; not investment advice. Sandbox data is simulated.</p>
        </aside>
      </div>
    </div>
  );
}
