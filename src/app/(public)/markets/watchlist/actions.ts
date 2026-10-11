"use server";
import { createClient } from "@/lib/supabase/server";

export type MigrateResult = { ok: boolean; error?: string; added?: number; alerts?: number; skipped?: string[] };

// Moves a visitor's browser watchlist and alerts into their account after sign-in. Non-financial tables; RLS scopes rows to the user; alerts go through create_price_alert.
export async function migrateWatchlist(symbols: string[], localAlerts: { symbol: string; condition: "ABOVE" | "BELOW"; price: number }[]): Promise<MigrateResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "AUTH_REQUIRED" };
  const syms = Array.from(new Set(symbols.map((s) => String(s).toUpperCase()))).slice(0, 60);
  const { data: inst } = await supabase.from("instruments").select("id,symbol").in("symbol", syms);
  const idBySym = new Map((inst ?? []).map((i) => [i.symbol, i.id as number]));
  const skipped = syms.filter((s) => !idBySym.has(s));
  let { data: wl } = await supabase.from("watchlists").select("id").eq("user_id", user.id).order("position").limit(1).maybeSingle();
  if (!wl) { const { data } = await supabase.from("watchlists").insert({ user_id: user.id, name: "My Watchlist" }).select("id").single(); wl = data; }
  if (!wl) return { ok: false, error: "WATCHLIST_UNAVAILABLE" };
  const { data: existing } = await supabase.from("watchlist_items").select("instrument_id").eq("watchlist_id", wl.id);
  const have = new Set((existing ?? []).map((e) => e.instrument_id as number));
  const rows = syms.filter((s) => idBySym.has(s) && !have.has(idBySym.get(s)!)).map((s, i) => ({ watchlist_id: wl!.id, instrument_id: idBySym.get(s)!, position: have.size + i }));
  if (rows.length) { const { error } = await supabase.from("watchlist_items").insert(rows); if (error) return { ok: false, error: "WATCHLIST_INSERT_FAILED" }; }
  let created = 0;
  for (const a of localAlerts.slice(0, 50)) {
    if (!idBySym.has(String(a.symbol).toUpperCase()) || !(a.condition === "ABOVE" || a.condition === "BELOW") || !(Number(a.price) > 0)) continue;
    const { error } = await supabase.rpc("create_price_alert", { p_symbol: a.symbol, p_condition: a.condition, p_price: Number(a.price), p_note: "Migrated from browser watchlist" });
    if (!error) created++;
  }
  return { ok: true, added: rows.length, alerts: created, skipped };
}
