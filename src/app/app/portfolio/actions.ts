"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { rpcError } from "@/lib/account";
import type { ActionResult } from "../actions";

// Wealth actions: every state change is an RPC on the engine (pledge book, MTF funding book, authorised views).
export async function pledgeHoldings(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/portfolio");
  const { data, error } = await supabase.rpc("pledge_holdings", { p_symbol: String(form.get("symbol") || "").toUpperCase(), p_qty: Number(form.get("qty") || 0) });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app/portfolio"); revalidatePath("/app/holdings");
  return { ok: true, data };
}
export async function unpledgeHoldings(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/portfolio");
  const { data, error } = await supabase.rpc("unpledge_holdings", { p_pledge: Number(form.get("id")) });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app/portfolio"); revalidatePath("/app/holdings");
  return { ok: true, data };
}
export async function mtfConvert(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/portfolio");
  const { data, error } = await supabase.rpc("mtf_convert", { p_symbol: String(form.get("symbol") || "").toUpperCase(), p_qty: Number(form.get("qty") || 0) });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app", "layout");
  return { ok: true, data };
}
export async function mtfClose(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/portfolio");
  const { data, error } = await supabase.rpc("mtf_close", { p_id: Number(form.get("id")) });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app", "layout");
  return { ok: true, data };
}
export async function grantPortfolioView(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/portfolio");
  const { data, error } = await supabase.rpc("grant_portfolio_view", { p_email: String(form.get("email") || "").trim() });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app/portfolio");
  return { ok: true, data };
}
export async function revokePortfolioView(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/portfolio");
  const { error } = await supabase.rpc("revoke_portfolio_view", { p_id: Number(form.get("id")) });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app/portfolio");
  return { ok: true };
}
