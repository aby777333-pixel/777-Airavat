import Image from "next/image";
import Link from "next/link";
import { metadataFor, seoFor } from "@/lib/seo";
import { Badge, Notice, PageHeader } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/site/ContentPageView";

export const metadata = { ...metadataFor("/company/press") };

const ASSETS: [string, string, string][] = [
  ["/brand/airavat-logo.png", "Primary lockup, for light backgrounds", "PNG, transparent"],
  ["/brand/airavat-logo-dark.png", "Primary lockup, for dark backgrounds", "PNG, transparent"],
  ["/brand/airavat-mark.png", "Elephant mark, light backgrounds", "PNG, transparent"],
  ["/brand/airavat-mark-dark.png", "Elephant mark, dark backgrounds", "PNG, transparent"],
  ["/icons/icon-512.png", "App icon", "PNG 512×512"],
];
const FACTS: [string, string][] = [
  ["Name", "AIRAVAT (always upper case in running text; '777 Airavat' is the project name)"],
  ["What it is", "An independent Indian broker technology platform in sandbox: full broking stack with simulated market data, no exchange membership, no live trading"],
  ["Named after", "Airavata, the white elephant of Indian tradition: strength without aggression"],
  ["Languages", "English plus Hindi, Tamil, Telugu, Kannada, Malayalam, Marathi, Bengali and Gujarati for editorial content"],
  ["Status line", "Sandbox. No SEBI registration, exchange membership or licence is held or claimed."],
];

export default function Press() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/about", label: "About" }, { href: "/company/press", label: "Press kit" }]} />
      <PageHero variant="about" intro={seoFor("/company/press").intro}><PageHeader eyebrow="Company" title="Press kit" subtitle={<>Logos, boilerplate, facts and usage rules <Badge tone="info">No spokesperson until incorporation</Badge></>} /></PageHero>
      <div className="grid gap-6 lg:grid-cols-[1.618fr_1fr]">
        <div className="space-y-6">
          <section className="glass p-5"><h2 className="font-display text-lg font-semibold">Logo files</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">{ASSETS.map(([src, label, meta]) => <a key={src} href={src} download className="group rounded-xl border border-border p-3 hover:border-accent"><div className={`flex h-24 items-center justify-center rounded-lg ${src.includes("dark") ? "bg-[#0c1116]" : "bg-white"}`}><Image src={src} alt={label} width={160} height={60} className="max-h-16 w-auto object-contain" /></div><div className="mt-2 text-sm font-medium">{label}</div><div className="text-xs text-muted">{meta} · click to download</div></a>)}</div></section>
          <section className="glass p-5"><h2 className="font-display text-lg font-semibold">Boilerplate</h2><p className="mt-2 text-sm text-muted">AIRAVAT is an independent Indian broker technology platform built in the open. It runs a complete broking stack, from onboarding and order management to an independent risk engine, double-entry ledger, back office and investor education, on simulated market data in a sandbox. It holds no SEBI registration or exchange membership and offers no live trading. Its stated principle is strength without aggression: honest labelling, fail-closed controls and education that matches what the platform actually does.</p></section>
          <section className="glass p-5"><h2 className="font-display text-lg font-semibold">Facts</h2><dl className="mt-2 grid gap-2 text-sm sm:grid-cols-[180px_1fr]">{FACTS.map(([k, v]) => <div key={k} className="contents"><dt className="font-semibold">{k}</dt><dd className="text-muted">{v}</dd></div>)}</dl></section>
          <section className="glass p-5"><h2 className="font-display text-lg font-semibold">Usage rules</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted"><li>Do not alter the colours, proportions or the elephant mark; use the dark variant on dark backgrounds</li><li>Keep clear space equal to the height of the letter A around the lockup</li><li>Do not imply endorsement by any exchange, regulator or other broker</li><li>When quoting figures from the site, keep the SIMULATED label</li><li>Do not use the name for any product that places real orders</li></ul></section>
        </div>
        <aside className="space-y-4">
          <div className="m-crystal p-5"><div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Media enquiries</div><p className="mt-2 text-sm text-muted">Use the enquiry form with the media topic; replies within 72 hours. Interviews and quotes attributed to named people begin after the legal entity is formed.</p><Link href="/contact?kind=media" className="btn btn-primary mt-3">Media enquiry</Link></div>
          <div className="glass p-5"><div className="font-display font-semibold">Colours and type</div><ul className="mt-2 space-y-1 text-sm text-muted"><li>Night: #0c1116 · Paper: #f4f1ea · Accent: brand gold from the mark</li><li>Typeface: TT Norms (licensed); fall back to system sans</li><li>Theme name in the product: Default (paper and night)</li></ul></div>
          <div className="glass p-5"><div className="font-display font-semibold">Screenshots</div><p className="mt-1 text-sm text-muted">Any public page may be screenshotted. The <Link href="/platforms/terminal-demo" className="text-accent">terminal demo</Link> and <Link href="/showroom" className="text-accent">showroom</Link> are designed for it; both show simulated data.</p></div>
          <Notice tone="info">There are no press releases yet. The <Link href="/daily" className="underline">journal</Link> carries dated editorial content.</Notice>
        </aside>
      </div>
    </div>
  );
}
