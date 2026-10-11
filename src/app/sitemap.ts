import type { MetadataRoute } from "next";
import { SEO, SITE } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import { CANDLE_PATTERNS, CHART_PATTERNS } from "@/lib/chart-school";
import { TRACKS } from "@/lib/academy-tracks";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const base: MetadataRoute.Sitemap = Object.keys(SEO).map((path) => ({ url: `${SITE.url}${path}`, lastModified: now, changeFrequency: path === "/" || path === "/daily" || path === "/briefing" ? "daily" : "weekly", priority: path === "/" ? 1 : 0.7 }));
  const school: MetadataRoute.Sitemap = [...CANDLE_PATTERNS, ...CHART_PATTERNS].map((p) => ({ url: `${SITE.url}/academy/chart-school/${p.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.5 }));
  const lessons: MetadataRoute.Sitemap = TRACKS.flatMap((t) => t.lessons.map((l) => ({ url: `${SITE.url}/academy/tracks/${t.slug}/${l.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.5 })));
  const extra: MetadataRoute.Sitemap = ["/open-account", "/signup", "/login", "/legal/terms-of-use", "/legal/risk-disclosure", "/legal/privacy-policy"].map((p) => ({ url: `${SITE.url}${p}`, lastModified: now, changeFrequency: "monthly", priority: 0.4 }));
  try {
    const supabase = await createClient();
    const [{ data: inst }, { data: arts }] = await Promise.all([
      supabase.from("instruments").select("symbol").eq("exchange", "NSE").order("symbol"),
      supabase.from("articles").select("slug,updated_at").eq("status", "published").order("published_at", { ascending: false }).limit(500),
    ]);
    const instruments: MetadataRoute.Sitemap = (inst ?? []).map((i) => ({ url: `${SITE.url}/markets/${encodeURIComponent(i.symbol)}`, lastModified: now, changeFrequency: "daily", priority: 0.5 }));
    const articles: MetadataRoute.Sitemap = (arts ?? []).map((a) => ({ url: `${SITE.url}/daily/${a.slug}`, lastModified: new Date(a.updated_at), changeFrequency: "weekly", priority: 0.6 }));
    return [...base, ...extra, ...school, ...lessons, ...instruments, ...articles];
  } catch {
    return [...base, ...extra, ...school, ...lessons];
  }
}
