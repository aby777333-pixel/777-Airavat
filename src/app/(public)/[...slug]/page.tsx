import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { contentPage, CONTENT_PAGES } from "@/content/pages";
import ContentPageView from "@/components/site/ContentPageView";
import { SITE } from "@/lib/seo";
import { NAV_GROUPS } from "@/lib/navigation";

const groupHref = (group: string) => NAV_GROUPS.find((g) => g.label === group)?.links[0].href ?? "/";

export function generateStaticParams() {
  return CONTENT_PAGES.map((p) => ({ slug: p.path.slice(1).split("/") }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = contentPage("/" + slug.join("/"));
  if (!page) return {};
  return { title: page.title, description: page.dek, keywords: page.keywords, alternates: { canonical: `${SITE.url}${page.path}` }, openGraph: { title: page.title, description: page.dek, url: `${SITE.url}${page.path}`, siteName: SITE.name, type: "article" } };
}

export default async function RegistryPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const page = contentPage("/" + slug.join("/"));
  if (!page) notFound();
  return <ContentPageView page={page} groupHref={groupHref(page.group)} />;
}
