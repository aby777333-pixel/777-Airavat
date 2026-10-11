import { createClient } from "@/lib/supabase/server";

export type Instrument = {
  id: number; symbol: string; exchange: string; segment: string; name: string; isin: string | null;
  sector: string | null; lot_size: number; tick_size: number; price_band_pct: number; tradable: boolean; is_simulated: boolean;
};
export type Quote = {
  instrument_id: number; ltp: number; open: number; high: number; low: number; prev_close: number; volume: number;
  bid: number | null; ask: number | null; source: string; updated_at: string;
};
export type QuoteRow = Instrument & { quote: Quote };

export async function getMarketStatus() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("market_status");
  return (data ?? { status: "UNKNOWN", accepting_orders: false, data_source: "SIMULATED" }) as {
    status: string; ist: string; exchange_session_live: boolean; sandbox_extended_hours: boolean; accepting_orders: boolean; data_source: string;
  };
}

export async function getQuotes(symbols?: string[]): Promise<QuoteRow[]> {
  const supabase = await createClient();
  let q = supabase.from("instruments").select("*, quote:quotes(*)").order("segment").order("symbol");
  if (symbols?.length) q = q.in("symbol", symbols);
  const { data } = await q;
  return ((data ?? []) as unknown as (Instrument & { quote: Quote | Quote[] | null })[])
    .map((r) => ({ ...r, quote: (Array.isArray(r.quote) ? r.quote[0] : r.quote) as Quote }))
    .filter((r) => r.quote);
}

export async function getInstrument(symbol: string): Promise<QuoteRow | null> {
  const rows = await getQuotes([symbol]);
  return rows[0] ?? null;
}

export async function getCandles(instrumentId: number, timeframe: "1d" | "1m" = "1d", limit = 300) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("candles").select("ts,o,h,l,c,v")
    .eq("instrument_id", instrumentId).eq("timeframe", timeframe)
    .order("ts", { ascending: false }).limit(limit);
  return (data ?? []).reverse().map((c) => ({
    time: Math.floor(new Date(c.ts).getTime() / 1000),
    open: Number(c.o), high: Number(c.h), low: Number(c.l), close: Number(c.c), volume: Number(c.v),
  }));
}
