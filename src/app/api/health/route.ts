import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const t0 = Date.now();
  const [{ data: ms, error }, { data: q }] = await Promise.all([
    supabase.rpc("market_status"),
    supabase.from("quotes").select("updated_at").order("updated_at", { ascending: false }).limit(1),
  ]);
  const lastTick = q?.[0]?.updated_at ?? null;
  const stale = lastTick ? Date.now() - new Date(lastTick).getTime() > 5 * 60 * 1000 : true;
  return NextResponse.json({
    status: error ? "degraded" : "ok",
    environment: process.env.AIRAVAT_ENV ?? "sandbox",
    live_trading: false,
    database_latency_ms: Date.now() - t0,
    market: ms ?? null,
    simulated_feed: { last_tick: lastTick, stale_if_market_accepting: stale && !!ms?.accepting_orders },
    ai_gateway: { anthropic: !!process.env.ANTHROPIC_API_KEY, sarvam: !!process.env.SARVAM_API_KEY },
    time: new Date().toISOString(),
  }, { headers: { "cache-control": "no-store" } });
}
