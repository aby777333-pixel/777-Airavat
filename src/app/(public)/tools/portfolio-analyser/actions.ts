"use server";
import { createClient } from "@/lib/supabase/server";

export type Resolved = { symbol: string; name: string; sector: string; segment: string; ltp: number; prev_close: number; nifty50_weight: number | null };

// Resolves pasted symbols against the sandbox universe (public RPC, read-only).
export async function resolveSymbols(symbols: string[]): Promise<Resolved[]> {
  const list = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))].slice(0, 200);
  if (list.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase.rpc("resolve_symbols", { p_symbols: list });
  return (data as Resolved[] | null) ?? [];
}
