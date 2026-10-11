import { metadataFor, seoFor } from "@/lib/seo";
import { PageHeader } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/site/ContentPageView";
import Checklist from "./Checklist";

export const metadata = { ...metadataFor("/open-account/guide") };

const FAQS = [
  { q: "Is account opening free?", a: "Yes. There is no opening charge; demat AMC is nil under BSDA limits and ₹300 a year otherwise." },
  { q: "Do I need a physical signature?", a: "No for individuals: everything is e-signed with Aadhaar OTP. Some NRI, trust and corporate cases still need wet-signed originals, which a visit or courier handles." },
  { q: "What if my Aadhaar mobile is not linked?", a: "Use the alternate flow: upload address proof manually and complete video verification; approval takes a day longer." },
  { q: "Can I open an account for my company?", a: "Yes. Corporate accounts need the board resolution, incorporation documents, signatory KYC and beneficial-owner declarations listed under Company." },
  { q: "How long before I can trade?", a: "Individuals are typically active the same or next working day; entities within a week to ten days. Funds must clear before the first order." },
];

export default function OpenAccountGuide() {
  const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/signup", label: "Open account" }, { href: "/open-account/guide", label: "Guide and checklist" }]} />
      <PageHero variant="about" intro={seoFor("/open-account/guide").intro}><PageHeader eyebrow="Account opening" title="Guide and document checklist" subtitle="Pick your entity type, tick off the documents, see the steps and timelines, then start the sandbox onboarding" /></PageHero>
      <Checklist />
      <section className="mt-8"><h2 className="font-display text-xl font-semibold">Frequently asked questions</h2><div className="mt-3 grid gap-2 md:grid-cols-2">{FAQS.map((f) => <details key={f.q} className="glass p-4"><summary className="cursor-pointer font-medium">{f.q}</summary><p className="mt-2 text-sm text-muted">{f.a}</p></details>)}</div></section>
    </div>
  );
}
