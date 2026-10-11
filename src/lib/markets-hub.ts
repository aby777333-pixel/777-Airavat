import { createClient } from "@/lib/supabase/server";

// Markets hub data access (server side). Every dataset here is labelled by its `source`; sandbox rows say SIMULATED SAMPLE.
export const INDEX_SLUGS: Record<string, string> = { "nifty-50": "NIFTY 50", "nifty-bank": "NIFTY BANK", "nifty-it": "NIFTY IT", "nifty-pharma": "NIFTY PHARMA", "nifty-auto": "NIFTY AUTO", "nifty-fmcg": "NIFTY FMCG", "nifty-metal": "NIFTY METAL", "nifty-energy": "NIFTY ENERGY", "nifty-fin-service": "NIFTY FIN SERVICE", "india-vix": "INDIA VIX" };
export const indexSlug = (symbol: string) => symbol.toLowerCase().replace(/\s+/g, "-");
export const sectorSlug = (sector: string) => sector.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export type IndexDetail = { index: { symbol: string; name: string; ltp: number; prev_close: number; open: number; high: number; low: number; updated_at: string } | null; constituents: { symbol: string; name: string; sector: string; weight_pct: number; ltp: number; prev_close: number; chg_pct: number; contribution: number }[]; sectors: { sector: string; weight_pct: number }[] };
export async function getIndexDetail(symbol: string): Promise<IndexDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("index_detail", { p_symbol: symbol });
  const d = data as IndexDetail | null;
  return d && d.index ? d : null;
}
export type Pulse = { advances: number; declines: number; unchanged: number; new_highs: { symbol: string; ltp: number; hi52: number }[]; new_lows: { symbol: string; ltp: number; lo52: number }[]; volume_shockers: { symbol: string; volume: number; avg: number; ratio: number }[]; circuit_hits: { symbol: string; chg: number; band: number }[]; top_delivery: { symbol: string; delivery_pct: number; day: string }[]; sector_breadth: { sector: string; advances: number; declines: number; avg_chg: number }[]; as_of: string };
export async function getPulse(): Promise<Pulse | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("market_pulse");
  return (data as Pulse | null) ?? null;
}
export type Fundamental = { instrument_id: number; fy: string; revenue_cr: number; ebitda_cr: number; net_profit_cr: number; eps: number; book_value_ps: number; dividend_ps: number; roe_pct: number; roce_pct: number; debt_to_equity: number | null; promoter_holding_pct: number; shares_cr: number; source: string };
export async function getFundamentals(instrumentId: number): Promise<Fundamental[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("instrument_fundamentals").select("*").eq("instrument_id", instrumentId).order("fy", { ascending: false });
  return (data as Fundamental[] | null) ?? [];
}
export async function getIndexMemberships(instrumentId: number): Promise<{ index_symbol: string; weight_pct: number }[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("index_constituents").select("index_symbol, weight_pct").eq("instrument_id", instrumentId).order("weight_pct", { ascending: false });
  return data ?? [];
}
export function lastThursday(year: number, month: number) {
  const d = new Date(Date.UTC(year, month + 1, 0));
  while (d.getUTCDay() !== 4) d.setUTCDate(d.getUTCDate() - 1);
  return d;
}
export function upcomingExpiries(from = new Date(), months = 3) {
  const out: { label: string; date: string; kind: "weekly" | "monthly" }[] = [];
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  for (let i = 0; i < 8; i++) { const w = new Date(d); w.setUTCDate(w.getUTCDate() + ((4 - w.getUTCDay() + 7) % 7) + i * 7); out.push({ label: "NIFTY weekly", date: w.toISOString().slice(0, 10), kind: "weekly" }); }
  for (let m = 0; m < months; m++) { const t = lastThursday(from.getUTCFullYear(), from.getUTCMonth() + m); if (t >= d) out.push({ label: "Monthly (index and stock F&O)", date: t.toISOString().slice(0, 10), kind: "monthly" }); }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
