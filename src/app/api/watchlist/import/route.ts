import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// CSV/text import into the signed-in user's default watchlist: one symbol per line or comma-separated; unknown symbols are reported.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const text = await req.text();
  const symbols = Array.from(new Set(text.split(/[\s,;]+/).map((s) => s.trim().toUpperCase().replace(/^"|"$/g, "")).filter((s) => /^[A-Z0-9&.\-]{1,20}$/.test(s) && s !== "SYMBOL"))).slice(0, 200);
  if (symbols.length === 0) return NextResponse.json({ error: "No symbols found" }, { status: 400 });
  const { data: inst } = await supabase.from("instruments").select("id,symbol").in("symbol", symbols);
  const known = new Map((inst ?? []).map((i) => [i.symbol, i.id]));
  let { data: wl } = await supabase.from("watchlists").select("id").eq("user_id", user.id).order("position").limit(1).maybeSingle();
  if (!wl) { const { data: created } = await supabase.from("watchlists").insert({ user_id: user.id, name: "Imported" }).select("id").single(); wl = created; }
  if (!wl) return NextResponse.json({ error: "Could not create watchlist" }, { status: 500 });
  const rows = symbols.filter((s) => known.has(s)).map((s, i) => ({ watchlist_id: wl!.id, instrument_id: known.get(s)!, position: i }));
  if (rows.length) await supabase.from("watchlist_items").upsert(rows, { onConflict: "watchlist_id,instrument_id", ignoreDuplicates: true });
  return NextResponse.json({ ok: true, added: rows.length, unknown: symbols.filter((s) => !known.has(s)) });
}
