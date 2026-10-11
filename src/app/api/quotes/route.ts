import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Public, read-only simulated quotes for the browser watchlist. Instruments and quotes are public-read tables (RLS).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const symbols = (url.searchParams.get("symbols") ?? "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 60);
  if (!symbols.length) return NextResponse.json({ ok: false, error: "SYMBOLS_REQUIRED" }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.from("instruments").select("id,symbol,name,segment,quote:quotes(ltp,prev_close,open,high,low,volume,updated_at)").in("symbol", symbols);
  if (error) return NextResponse.json({ ok: false, error: "UNAVAILABLE" }, { status: 503 });
  const quotes = (data ?? []).map((i) => { const q = (Array.isArray(i.quote) ? i.quote[0] : i.quote) as { ltp: number; prev_close: number; open: number; high: number; low: number; volume: number; updated_at: string } | null; return { symbol: i.symbol, name: i.name, segment: i.segment, ltp: Number(q?.ltp ?? 0), prev_close: Number(q?.prev_close ?? 0), high: Number(q?.high ?? 0), low: Number(q?.low ?? 0), volume: Number(q?.volume ?? 0), updated_at: q?.updated_at ?? null }; });
  return NextResponse.json({ ok: true, simulated: true, quotes }, { headers: { "cache-control": "no-store" } });
}
