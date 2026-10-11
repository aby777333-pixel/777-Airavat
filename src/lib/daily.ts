import { createClient } from "@/lib/supabase/server";

export type Briefing = {
  generated_at: string; ist: string; market: { status: string; accepting_orders: boolean }; data_source: string;
  indices: { symbol: string; ltp: number; change_pct: number }[]; breadth: { up: number; down: number; flat: number };
  gainers: { symbol: string; change_pct: number }[]; losers: { symbol: string; change_pct: number }[];
  sectors: { sector: string; avg_change_pct: number }[]; scanner_highlights: { scanner: string; symbol: string; at: string }[];
  upcoming_holidays: { day: string; description: string }[]; commodities_fx: { symbol: string; ltp: number; change_pct: number; segment: string }[];
  latest_articles: { slug: string; title: string; dek: string | null; published_at: string; category: string | null; classification: string }[];
};

export async function getBriefing(): Promise<Briefing | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("daily_briefing");
  return (data as Briefing) ?? null;
}

export async function getPublishedArticles(opts: { category?: string; limit?: number } = {}) {
  const supabase = await createClient();
  let q = supabase.from("articles").select("id,slug,title,dek,published_at,reading_minutes,classification,tags,ai_assisted,category:article_categories(slug,name)").eq("status", "published").order("published_at", { ascending: false }).limit(opts.limit ?? 30);
  if (opts.category) {
    const { data: cat } = await supabase.from("article_categories").select("id").eq("slug", opts.category).maybeSingle();
    if (cat) q = q.eq("category_id", cat.id);
  }
  const { data } = await q;
  return (data ?? []).map((a) => ({ ...a, category: (Array.isArray(a.category) ? a.category[0] : a.category) as { slug: string; name: string } | null }));
}

export async function getCategories() {
  const supabase = await createClient();
  const { data } = await supabase.from("article_categories").select("*").order("position");
  return data ?? [];
}
