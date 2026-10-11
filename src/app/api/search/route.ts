import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { COMMANDS } from "@/lib/commands";

// AIRAVAT Command Everywhere — deterministic search over routes, tools, instruments and published articles.
// Permission-aware: private areas are only suggested to signed-in users; data reads go through RLS.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  if (q.length < 1) return NextResponse.json({ results: [] });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const results: { kind: string; title: string; subtitle?: string; href: string }[] = [];

  for (const c of COMMANDS) {
    if (c.auth && !user) continue;
    const hay = `${c.title} ${c.keywords.join(" ")}`.toLowerCase();
    if (q.split(/\s+/).every((w) => hay.includes(w))) results.push({ kind: c.kind, title: c.title, subtitle: c.subtitle, href: c.href });
  }
  const [{ data: inst }, { data: arts }] = await Promise.all([
    supabase.from("instruments").select("symbol,name,segment,tradable").or(`symbol.ilike.%${q}%,name.ilike.%${q}%`).limit(6),
    supabase.from("articles").select("slug,title,dek").eq("status", "published").or(`title.ilike.%${q}%,dek.ilike.%${q}%`).limit(5),
  ]);
  for (const i of inst ?? []) results.push({ kind: "instrument", title: i.symbol, subtitle: `${i.name} · ${i.segment}${i.tradable ? "" : " · not tradable"} · simulated`, href: user && i.tradable ? `/app/markets/${encodeURIComponent(i.symbol)}` : `/markets/${encodeURIComponent(i.symbol)}` });
  for (const a of arts ?? []) results.push({ kind: "article", title: a.title, subtitle: a.dek ?? "AIRAVAT DAILY", href: `/daily/${a.slug}` });
  return NextResponse.json({ results: results.slice(0, 20) }, { headers: { "cache-control": "no-store" } });
}
