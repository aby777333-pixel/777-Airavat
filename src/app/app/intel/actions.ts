"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { rpcError } from "@/lib/account";
import { getCandles } from "@/lib/market";
import { fingerprint, robustness, runBacktest, ENGINE_VERSION, type Rules } from "@/lib/backtest";
import type { ActionResult } from "../actions";

// ---------------- Research ONE / Market Detective ----------------
export async function createCase(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/research");
  const { data, error } = await supabase.rpc("create_research_case", { p: { title: String(form.get("title") || ""), question: String(form.get("question") || ""), symbol: String(form.get("symbol") || ""), kind: String(form.get("kind") || "investigation") } });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app/research");
  return { ok: true, data };
}
export async function addEvidence(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/research");
  const caseId = Number(form.get("case_id"));
  const { error } = await supabase.rpc("add_research_evidence", { p_case: caseId, p: { title: String(form.get("title") || ""), body: String(form.get("body") || ""), source: String(form.get("source") || "User note"), source_url: String(form.get("source_url") || "") || null, classification: String(form.get("classification") || "hypothesis"), kind: "user_note" } });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath(`/app/research/${caseId}`);
  return { ok: true };
}
export async function closeCase(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/research");
  const caseId = Number(form.get("case_id"));
  const { error } = await supabase.rpc("close_research_case", { p_case: caseId, p_summary: String(form.get("summary") || "") });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath(`/app/research/${caseId}`);
  return { ok: true };
}

// ---------------- Scanner Matrix ----------------
const condSchema = z.object({ metric: z.string(), op: z.enum([">", ">=", "<", "<=", "="]), value: z.number().optional(), metric2: z.string().optional() });
export async function saveScanner(input: { name: string; description?: string; logic: "AND" | "OR"; conditions: z.infer<typeof condSchema>[] }): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/scanners");
  const parsed = z.object({ name: z.string().min(2).max(80), description: z.string().max(300).optional(), logic: z.enum(["AND", "OR"]), conditions: z.array(condSchema).min(1).max(8) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid scan" };
  const { data, error } = await supabase.rpc("save_scanner", { p: parsed.data });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app/scanners");
  return { ok: true, data };
}
export async function deleteScanner(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/scanners");
  const { error } = await supabase.rpc("delete_scanner", { p_id: Number(form.get("id")) });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app/scanners");
  return { ok: true };
}

// ---------------- Strategy DNA ----------------
const rulesSchema = z.object({
  type: z.enum(["ema_cross", "breakout", "rsi_reversion"]),
  fast: z.number().int().min(2).max(100).optional(), slow: z.number().int().min(3).max(300).optional(),
  lookback: z.number().int().min(5).max(120).optional(),
  rsi_period: z.number().int().min(5).max(30).optional(), rsi_buy: z.number().min(5).max(50).optional(), rsi_sell: z.number().min(50).max(95).optional(),
  stop_pct: z.number().min(0.5).max(50).nullable().optional(), target_pct: z.number().min(0.5).max(200).nullable().optional(),
  max_hold_days: z.number().int().min(1).max(250).nullable().optional(), sizing_pct: z.number().min(1).max(100).optional(),
});
export async function saveStrategy(input: { id?: number; name: string; description?: string; rules: Rules; universe: string[] }): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/strategies");
  const parsed = z.object({ id: z.number().optional(), name: z.string().min(2).max(80), description: z.string().max(400).optional(), rules: rulesSchema, universe: z.array(z.string()).min(1).max(12) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid strategy" };
  const { data, error } = await supabase.rpc("save_strategy", { p: parsed.data });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app/strategies");
  return { ok: true, data };
}

export async function runStrategyBacktest(strategyId: number, withRobustness: boolean): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/strategies");
  const { data: s } = await supabase.from("strategies").select("*").eq("id", strategyId).maybeSingle();
  if (!s) return { ok: false, error: "Strategy not found" };
  const { data: insts } = await supabase.from("instruments").select("id,symbol").in("symbol", s.universe as string[]);
  const universe = await Promise.all((insts ?? []).map(async (i) => ({ symbol: i.symbol, candles: await getCandles(i.id, "1d", 300) })));
  const rules = s.rules as Rules;
  const cost = { brokerage_product: "CNC" as const, slippage_bps: 5, multiplier: 1 };
  const res = runBacktest(universe, rules, 1_000_000, cost);
  const fp = fingerprint(res, universe, rules);
  const rb = withRobustness ? robustness(universe, rules, 1_000_000, cost) : null;
  const first = res.equity[0]?.time, last = res.equity[res.equity.length - 1]?.time;
  const { data, error } = await supabase.rpc("record_backtest", {
    p: {
      strategy_id: strategyId, engine_version: ENGINE_VERSION, params: rules, cost_model: cost,
      start_date: first ? new Date(first * 1000).toISOString().slice(0, 10) : null, end_date: last ? new Date(last * 1000).toISOString().slice(0, 10) : null,
      metrics: res.metrics, fingerprint: fp, robustness: rb, trades_count: res.trades.length,
      equity_curve: res.equity.filter((_, i) => i % 2 === 0).map((e) => [e.time, e.value]),
    },
  });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath(`/app/strategies/${strategyId}`);
  return { ok: true, data: { run_id: data, metrics: res.metrics, trades: res.trades.slice(-20) } };
}

// ---------------- Shadow Portfolio ----------------
export async function createShadow(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/shadow");
  const { data, error } = await supabase.rpc("create_shadow_portfolio", { p_name: String(form.get("name") || "Shadow portfolio"), p_cash: Number(form.get("cash") || 1000000), p_thesis: String(form.get("thesis") || "") || null, p_case: form.get("case_id") ? Number(form.get("case_id")) : null });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app/shadow");
  return { ok: true, data };
}
export async function shadowOrder(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/shadow");
  const pid = Number(form.get("portfolio_id"));
  const { data, error } = await supabase.rpc("shadow_place_order", { p_portfolio: pid, p_symbol: String(form.get("symbol") || "").toUpperCase(), p_side: String(form.get("side") || "BUY"), p_qty: Number(form.get("qty") || 0), p_note: String(form.get("note") || "") || null, p_case: null });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath(`/app/shadow/${pid}`);
  return { ok: true, data };
}

// ---------------- Sentinel X ----------------
export async function ackAlert(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/sentinel");
  const { error } = await supabase.rpc("acknowledge_alert", { p_id: Number(form.get("id")) });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app/sentinel"); revalidatePath("/app");
  return { ok: true };
}
export async function savePrefs(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/sentinel");
  const { error } = await supabase.rpc("set_sentinel_preferences", { p: { concentration_warn_pct: Number(form.get("concentration_warn_pct")), position_drawdown_warn_pct: Number(form.get("position_drawdown_warn_pct")), funds_utilization_warn_pct: Number(form.get("funds_utilization_warn_pct")), opportunity_alerts: form.get("opportunity_alerts") === "on" } });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app/sentinel");
  return { ok: true };
}
export async function premortemCheck(input: { symbol: string; side: "BUY" | "SELL"; product: "CNC" | "MIS"; qty: number }): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/markets");
  const { data, error } = await supabase.rpc("premortem", { p_symbol: input.symbol, p_side: input.side, p_product: input.product, p_qty: input.qty });
  if (error) return { ok: false, error: rpcError(error) };
  return { ok: true, data };
}

// ---------------- RevenueOS (client side) ----------------
export async function applyPromo(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/plan");
  const { data, error } = await supabase.rpc("apply_promo_code", { p_code: String(form.get("code") || "") });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app/plan");
  return { ok: true, data };
}
export async function subscribe(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/plan");
  const { data, error } = await supabase.rpc("subscribe_plan", { p_code: String(form.get("code") || "") });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app", "layout");
  return { ok: true, data };
}
export async function unsubscribe(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/plan");
  const { error } = await supabase.rpc("cancel_subscription", { p_id: Number(form.get("id")) });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app/plan");
  return { ok: true };
}

// ---------------- Partner portal ----------------
export async function partnerLead(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/partner");
  const { error } = await supabase.rpc("create_lead", { p: { full_name: String(form.get("full_name") || ""), email: String(form.get("email") || "") || null, phone: String(form.get("phone") || "") || null, source: "partner", consent_marketing: form.get("consent") === "on", notes: String(form.get("notes") || "") || null } });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app/partner");
  return { ok: true };
}
export async function partnerLeadUpdate(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/partner");
  const { error } = await supabase.rpc("update_lead", { p_id: Number(form.get("id")), p_status: String(form.get("status")), p_note: String(form.get("note") || "") || null });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app/partner");
  return { ok: true };
}

// ---------------- Theme Studio ----------------
export async function saveThemePrefs(form: FormData): Promise<void> {
  const { supabase, user } = await requireUser("/app/theme");
  await supabase.from("profiles").update({ theme: String(form.get("theme") || "midnight-sovereign"), updated_at: new Date().toISOString() }).eq("id", user.id);
  revalidatePath("/app/theme");
}
