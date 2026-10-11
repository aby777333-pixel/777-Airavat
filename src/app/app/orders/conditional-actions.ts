"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { rpcError } from "@/lib/account";
import type { ActionResult } from "../actions";

// Broker-managed conditional orders: every trigger still goes through place_order (RMS, holds, journal) in the database.
const leg = z.object({ symbol: z.string().min(1).max(20), side: z.enum(["BUY", "SELL"]), product: z.enum(["CNC", "MIS"]).default("CNC"), order_type: z.enum(["MARKET", "LIMIT"]).default("MARKET"), qty: z.number().int().positive(), price: z.number().positive().nullable().optional() });
const schema = z.object({
  kind: z.enum(["GTT", "AMO", "OCO", "TRAILING_STOP", "BRACKET", "COVER", "ICEBERG", "BASKET"]),
  symbol: z.string().max(20).optional(), side: z.enum(["BUY", "SELL"]).optional(), product: z.enum(["CNC", "MIS"]).optional(), order_type: z.enum(["MARKET", "LIMIT"]).optional(),
  qty: z.number().int().positive().optional(), price: z.number().positive().nullable().optional(), trigger_price: z.number().positive().optional(),
  target_price: z.number().positive().optional(), stop_price: z.number().positive().optional(), trail_pct: z.number().positive().max(50).optional(), trail_amount: z.number().positive().optional(),
  disclosed_qty: z.number().int().positive().optional(), valid_till: z.string().optional(), note: z.string().max(200).optional(), legs: z.array(leg).min(1).max(20).optional(),
});
export type ConditionalInput = z.infer<typeof schema>;

export async function placeConditional(input: ConditionalInput): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/orders");
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid order" };
  const { data, error } = await supabase.rpc("place_conditional_order", { p: parsed.data });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app/orders"); revalidatePath("/app"); revalidatePath("/app/positions");
  return { ok: true, data };
}
export async function cancelConditional(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/orders");
  const { error } = await supabase.rpc("cancel_conditional_order", { p_id: Number(form.get("id")) });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app/orders");
  return { ok: true };
}
