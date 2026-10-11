import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// CSV export: the signed-in user's watchlist, or the full simulated universe for anonymous visitors.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let rows: { symbol: string; name: string; exchange: string; segment: string; ltp: number | null }[] = [];
  if (user) {
    const { data } = await supabase.from("watchlist_items").select("instrument:instruments(symbol,name,exchange,segment,quote:quotes(ltp)), watchlist:watchlists!inner(user_id)").eq("watchlist.user_id", user.id);
    rows = (data ?? []).map((r) => { const i = (Array.isArray(r.instrument) ? r.instrument[0] : r.instrument) as { symbol: string; name: string; exchange: string; segment: string; quote: { ltp: number } | { ltp: number }[] | null }; const q = Array.isArray(i.quote) ? i.quote[0] : i.quote; return { symbol: i.symbol, name: i.name, exchange: i.exchange, segment: i.segment, ltp: q?.ltp ?? null }; });
  }
  if (rows.length === 0) {
    const { data } = await supabase.from("instruments").select("symbol,name,exchange,segment,quote:quotes(ltp)").order("symbol");
    rows = (data ?? []).map((i) => { const q = Array.isArray(i.quote) ? i.quote[0] : i.quote; return { symbol: i.symbol, name: i.name, exchange: i.exchange, segment: i.segment, ltp: (q as { ltp: number } | null)?.ltp ?? null }; });
  }
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = ["symbol,name,exchange,segment,ltp_simulated", ...rows.map((r) => [r.symbol, r.name, r.exchange, r.segment, r.ltp].map(esc).join(","))].join("\n");
  return new NextResponse(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="airavat-watchlist.csv"` } });
}
