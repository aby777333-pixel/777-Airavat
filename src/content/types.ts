import type { HeroVariant } from "@/lib/seo";

export type Availability = "sandbox" | "soon" | "research" | "info";
export type Faq = { q: string; a: string };
export type Section = { h: string; p?: string[]; bullets?: string[]; table?: { head: string[]; rows: string[][] } };
export type Cta = { href: string; label: string; primary?: boolean };
export type ContentPage = {
  path: string; group: string; title: string; h1: string; dek: string; intro: string; keywords: string[]; hero: HeroVariant; availability: Availability; availabilityNote: string;
  sections: Section[]; eligibility?: string[]; risks?: string[]; costs?: string[]; tools?: Cta[]; faqs: Faq[]; ctas: Cta[]; related: string[]; updated: string;
};
