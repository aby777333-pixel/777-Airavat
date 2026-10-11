import { GLOSSARY } from "@/lib/glossary";
import { metadataFor, seoFor } from "@/lib/seo";
import { PageHeader } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/site/ContentPageView";
import GlossaryList from "./GlossaryList";

export const metadata = { ...metadataFor("/academy/glossary") };

export default function GlossaryPage() {
  const jsonLd = { "@context": "https://schema.org", "@type": "DefinedTermSet", name: "AIRAVAT market glossary", hasDefinedTerm: GLOSSARY.slice(0, 60).map((t) => ({ "@type": "DefinedTerm", name: t.term, description: t.def })) };
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/academy", label: "Academy" }, { href: "/academy/glossary", label: "Glossary" }]} />
      <PageHero variant="academy" intro={seoFor("/academy/glossary").intro}><PageHeader eyebrow="AIRAVAT Academy" title="Market glossary" subtitle={`${GLOSSARY.length} terms across orders, charges, settlement, derivatives, funds, regulation, analysis, accounts, IPOs and risk`} /></PageHero>
      <GlossaryList />
    </div>
  );
}
