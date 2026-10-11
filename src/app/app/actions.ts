"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { rpcError } from "@/lib/account";

export type ActionResult = { ok: boolean; error?: string; data?: unknown };

const kycSchema = z.object({
  full_name: z.string().min(2).max(120),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number"),
  pan: z.string().regex(/^[A-Za-z]{5}\d{4}[A-Za-z]$/, "PAN must look like ABCDE1234F"),
  date_of_birth: z.string().min(10),
  account_type: z.enum(["individual"]),
  address: z.object({ line1: z.string().min(3), city: z.string().min(2), state: z.string().min(2), pincode: z.string().regex(/^\d{6}$/) }),
  occupation: z.string().min(2),
  income_range: z.string().min(1),
  trading_experience: z.string().min(1),
  segments: z.array(z.enum(["EQ"])).min(1),
  nominee: z.object({ name: z.string().min(2), relationship: z.string().min(2) }),
  risk_profile: z.string().min(1),
  declarations: z.object({ not_pep: z.literal(true), tax_resident_india: z.literal(true), info_true: z.literal(true), sandbox_ack: z.literal(true) }),
});

export async function submitKyc(payload: unknown): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/onboarding");
  const parsed = kycSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid form" };
  const { data, error } = await supabase.rpc("submit_kyc", { p_payload: parsed.data });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app", "layout");
  return { ok: true, data };
}

export async function sandboxDeposit(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/funds");
  const amount = Number(form.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Enter a valid amount" };
  const { error } = await supabase.rpc("sandbox_deposit", { p_amount: amount, p_reference: null });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function requestWithdrawal(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/funds");
  const amount = Number(form.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Enter a valid amount" };
  const { error } = await supabase.rpc("request_withdrawal", { p_amount: amount });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app", "layout");
  return { ok: true };
}

const orderSchema = z.object({
  client_order_id: z.string().uuid(),
  symbol: z.string().min(1).max(30),
  side: z.enum(["BUY", "SELL"]),
  order_type: z.enum(["MARKET", "LIMIT", "SL", "SL-M"]),
  product: z.enum(["CNC", "MIS"]),
  qty: z.number().int().positive(),
  price: z.number().positive().nullable(),
  trigger_price: z.number().positive().nullable(),
});
export type OrderInput = z.infer<typeof orderSchema>;

export async function placeOrder(input: OrderInput): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/markets");
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid order" };
  const o = parsed.data;
  const { data, error } = await supabase.rpc("place_order", {
    p_client_order_id: o.client_order_id, p_symbol: o.symbol, p_side: o.side, p_type: o.order_type, p_product: o.product,
    p_qty: o.qty, p_price: o.order_type === "MARKET" || o.order_type === "SL-M" ? null : o.price, p_trigger: o.order_type === "SL" || o.order_type === "SL-M" ? o.trigger_price : null, p_via: "web",
  });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app", "layout");
  return { ok: true, data };
}

export async function previewOrder(input: Omit<OrderInput, "client_order_id" | "trigger_price">): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/markets");
  const { data, error } = await supabase.rpc("preview_order", {
    p_symbol: input.symbol, p_side: input.side, p_type: input.order_type, p_product: input.product, p_qty: input.qty, p_price: input.price,
  });
  if (error) return { ok: false, error: rpcError(error) };
  return { ok: true, data };
}

export async function cancelOrder(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser("/app/orders");
  const id = String(form.get("order_id"));
  const { error } = await supabase.rpc("cancel_order", { p_order: id });
  if (error) return { ok: false, error: rpcError(error) };
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function toggleWatchlist(form: FormData): Promise<void> {
  const { supabase, user } = await requireUser("/app/markets");
  const instrumentId = Number(form.get("instrument_id"));
  const { data: wl } = await supabase.from("watchlists").select("id").eq("user_id", user.id).order("position").limit(1).maybeSingle();
  let wlId = wl?.id as string | undefined;
  if (!wlId) {
    const { data } = await supabase.from("watchlists").insert({ user_id: user.id, name: "My Watchlist" }).select("id").single();
    wlId = data?.id;
  }
  if (!wlId) return;
  const { data: existing } = await supabase.from("watchlist_items").select("instrument_id").eq("watchlist_id", wlId).eq("instrument_id", instrumentId).maybeSingle();
  if (existing) await supabase.from("watchlist_items").delete().eq("watchlist_id", wlId).eq("instrument_id", instrumentId);
  else await supabase.from("watchlist_items").insert({ watchlist_id: wlId, instrument_id: instrumentId, position: Date.now() % 100000 });
  revalidatePath("/app/markets");
}

export async function acceptDocument(form: FormData): Promise<void> {
  const { supabase } = await requireUser("/app/consents");
  await supabase.rpc("accept_document", { p_slug: String(form.get("slug")) });
  revalidatePath("/app/consents");
}

export async function createTicket(form: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireUser("/app/support");
  const subject = String(form.get("subject") || "").trim();
  const body = String(form.get("body") || "").trim();
  const category = String(form.get("category") || "general");
  if (subject.length < 4 || body.length < 10) return { ok: false, error: "Please describe the issue (subject and details)." };
  const { data: t, error } = await supabase.from("support_tickets").insert({ user_id: user.id, subject, category }).select("id").single();
  if (error || !t) return { ok: false, error: error?.message ?? "Could not create ticket" };
  await supabase.from("ticket_messages").insert({ ticket_id: t.id, author_id: user.id, is_staff: false, body });
  revalidatePath("/app/support");
  return { ok: true };
}

export async function replyTicket(form: FormData): Promise<void> {
  const { supabase, user, profile } = await requireUser("/app/support");
  const ticketId = String(form.get("ticket_id"));
  const body = String(form.get("body") || "").trim();
  if (body.length < 2) return;
  const isStaff = !!profile && ["dealer", "ops", "risk", "compliance", "admin", "super_admin"].includes(profile.role);
  await supabase.from("ticket_messages").insert({ ticket_id: ticketId, author_id: user.id, is_staff: isStaff, body });
  await supabase.from("support_tickets").update({ updated_at: new Date().toISOString(), status: isStaff ? "answered" : "open" }).eq("id", ticketId);
  revalidatePath("/app/support");
  revalidatePath("/admin/support");
}

export async function updatePreferences(form: FormData): Promise<void> {
  const { supabase, user } = await requireUser("/app/settings");
  const theme = String(form.get("theme") || "airavat-house");
  const language = String(form.get("language") || "en");
  const full_name = String(form.get("full_name") || "").trim();
  await supabase.from("profiles").update({ theme, language, ...(full_name ? { full_name } : {}), updated_at: new Date().toISOString() }).eq("id", user.id);
  revalidatePath("/app/settings");
}

export async function markAllRead(): Promise<void> {
  const { supabase, user } = await requireUser("/app/notifications");
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/app", "layout");
}

export async function goToOnboarding() {
  redirect("/app/onboarding");
}
