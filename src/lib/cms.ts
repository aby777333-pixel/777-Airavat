import { createClient } from "@/lib/supabase/server";
import type { ContentPage } from "@/content/types";
import type { NavGroup } from "@/lib/navigation";
import type { HeroVariant } from "@/lib/seo";

// Website CMS read helpers: published database overrides win over the code registry; everything degrades to the registry.
export async function publishedPageOverride(path: string): Promise<ContentPage | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("site_pages").select("*").eq("path", path).eq("status", "published").maybeSingle();
    if (!data) return null;
    return { path: data.path, group: data.group_label, title: data.title, h1: data.h1, dek: data.dek ?? "", intro: data.intro ?? "", keywords: data.keywords ?? [], hero: (data.hero as HeroVariant) ?? "legal", availability: data.availability, availabilityNote: data.availability_note ?? "", sections: data.sections ?? [], eligibility: data.eligibility ?? undefined, risks: data.risks ?? undefined, costs: data.costs ?? undefined, tools: data.tools ?? [], faqs: data.faqs ?? [], ctas: data.ctas ?? [], related: data.related ?? [], updated: (data.published_at ?? data.updated_at).slice(0, 10) };
  } catch { return null; }
}
export async function publishedFaqs(path: string): Promise<{ q: string; a: string }[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("site_faqs").select("question,answer").eq("path", path).eq("status", "published").order("position");
    return (data ?? []).map((f) => ({ q: f.question, a: f.answer }));
  } catch { return []; }
}
export async function publishedHero(path: string): Promise<{ variant: HeroVariant; headline: string | null; intro: string | null } | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("site_heroes").select("variant,headline,intro").eq("path", path).eq("status", "published").maybeSingle();
    return data ? { variant: data.variant as HeroVariant, headline: data.headline, intro: data.intro } : null;
  } catch { return null; }
}
export async function publishedMenu(key = "primary"): Promise<NavGroup[] | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("site_menus").select("structure").eq("key", key).eq("status", "published").maybeSingle();
    const s = data?.structure as NavGroup[] | undefined;
    return Array.isArray(s) && s.length ? s : null;
  } catch { return null; }
}
export async function siteSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("site_settings").select("value").eq("key", key).maybeSingle();
    return (data?.value as T) ?? fallback;
  } catch { return fallback; }
}
