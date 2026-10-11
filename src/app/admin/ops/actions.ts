"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { rpcError } from "@/lib/account";
import type { AdminResult } from "../actions";

// Phase-2 Broker Core actions (RevenueOS, Partners/CRM, Markets, Editorial). Each database function enforces its own role matrix.
const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const n = (f: FormData, k: string) => { const v = s(f, k); return v === "" ? null : Number(v); };
const done = (error: { code?: string; message: string } | null, path: string, data?: unknown): AdminResult => { revalidatePath(path); return error ? { ok: false, error: rpcError(error) } : { ok: true, data }; };

// ---- RevenueOS ----
export async function submitFee(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/revenue");
  const p: Record<string, unknown> = { fee_code: s(form, "fee_code").toUpperCase(), name: s(form, "name") || null, description: s(form, "description") || null, rate: n(form, "rate"), cap: n(form, "cap"), min_amount: n(form, "min_amount"), effective_from: s(form, "effective_from") || null, source_url: s(form, "source_url") || null };
  for (const k of ["classification", "calc_method", "product", "side", "accounting_code", "authority"]) if (s(form, k)) p[k] = s(form, k);
  if (s(form, "category_id")) p.category_id = Number(s(form, "category_id"));
  if (form.has("gst_applicable")) p.gst_applicable = form.get("gst_applicable") === "on";
  const { data, error } = await supabase.rpc("submit_fee_version", { p });
  return done(error, "/admin/revenue", data);
}
export async function decideApproval(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/approvals");
  const { error } = await supabase.rpc("decide_approval", { p_request: Number(s(form, "id")), p_decision: s(form, "decision"), p_note: s(form, "note") || null });
  revalidatePath("/admin", "layout");
  return error ? { ok: false, error: rpcError(error) } : { ok: true };
}
export async function requestWaiver(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/revenue");
  const { data: acc } = await supabase.from("trading_accounts").select("id").eq("client_code", s(form, "client_code").toUpperCase()).maybeSingle();
  if (!acc) return { ok: false, error: "Unknown client code" };
  const { data, error } = await supabase.rpc("request_waiver", { p_account: acc.id, p_fee_code: s(form, "fee_code").toUpperCase(), p_type: s(form, "waiver_type"), p_value: Number(s(form, "value") || 0), p_max_total: n(form, "max_total"), p_valid_to: s(form, "valid_to") || null, p_reason: s(form, "reason") });
  return done(error, "/admin/revenue", data);
}
export async function createOffer(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/revenue");
  const { data, error } = await supabase.rpc("create_offer", { p: { code: s(form, "code"), name: s(form, "name"), description: s(form, "description") || null, fee_code: s(form, "fee_code").toUpperCase(), discount_type: s(form, "discount_type"), value: Number(s(form, "value") || 0), ends_at: s(form, "ends_at") || null, redemption_limit: n(form, "redemption_limit"), per_customer_cap: n(form, "per_customer_cap") ?? 100, budget: n(form, "budget"), disclosures: s(form, "disclosures") || null } });
  return done(error, "/admin/revenue", data);
}
export async function assignPlan(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/revenue");
  const { data: acc } = await supabase.from("trading_accounts").select("id").eq("client_code", s(form, "client_code").toUpperCase()).maybeSingle();
  if (!acc) return { ok: false, error: "Unknown client code" };
  const { error } = await supabase.rpc("assign_plan", { p_account: acc.id, p_plan_code: s(form, "plan_code").toUpperCase(), p_note: s(form, "note") || null });
  return done(error, "/admin/revenue");
}
export async function requestAdjustment(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/revenue");
  const { data, error } = await supabase.rpc("request_charge_adjustment", { p_trade: s(form, "trade_id"), p_fee_code: s(form, "fee_code").toUpperCase(), p_amount: Number(s(form, "amount") || 0), p_reason: s(form, "reason") });
  return done(error, "/admin/revenue", data);
}
export async function recordVendorCost(form: FormData): Promise<AdminResult> {
  const { supabase, user } = await requireStaff("/admin/revenue");
  const { error } = await supabase.from("vendor_costs").insert({ vendor: s(form, "vendor"), category: s(form, "category"), period_month: s(form, "period_month") || new Date().toISOString().slice(0, 7) + "-01", amount: Number(s(form, "amount") || 0), note: s(form, "note") || null, recorded_by: user.id });
  return done(error, "/admin/revenue");
}

// ---- Partners & CRM ----
export async function registerPartner(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/partners");
  const { data, error } = await supabase.rpc("register_partner", { p: { category: s(form, "category"), legal_name: s(form, "legal_name"), contact_email: s(form, "contact_email") || null, referral_code: s(form, "referral_code") || null, user_id: s(form, "user_id") || null, compliance_note: s(form, "compliance_note") || null } });
  return done(error, "/admin/partners", data);
}
export async function setPartnerStatus(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/partners");
  const { error } = await supabase.rpc("set_partner_status", { p_id: Number(s(form, "id")), p_status: s(form, "status"), p_note: s(form, "note") || null });
  return done(error, "/admin/partners");
}
export async function updatePartner(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/partners");
  const list = (k: string) => (s(form, k) ? s(form, k).split(",").map((x) => x.trim()).filter(Boolean) : null);
  const p: Record<string, unknown> = {};
  if (list("approved_activities")) p.approved_activities = list("approved_activities");
  if (list("permitted_channels")) p.permitted_channels = list("permitted_channels");
  if (s(form, "exchange_approval_ref")) p.exchange_approval_ref = s(form, "exchange_approval_ref");
  if (s(form, "training_valid_until")) p.training_valid_until = s(form, "training_valid_until");
  if (s(form, "user_id")) p.user_id = s(form, "user_id");
  const { error } = await supabase.rpc("update_partner", { p_id: Number(s(form, "id")), p });
  return done(error, "/admin/partners");
}
export async function createCommissionPlan(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/partners");
  const { data, error } = await supabase.rpc("create_commission_plan", { p: { code: s(form, "code"), name: s(form, "name"), partner_category: s(form, "partner_category"), basis: s(form, "basis"), rate: Number(s(form, "rate") || 0), cap_per_event: n(form, "cap_per_event"), monthly_cap: n(form, "monthly_cap"), valid_to: s(form, "valid_to") || null, legal_basis: s(form, "legal_basis") || null, tds_pct: n(form, "tds_pct") ?? 10 } });
  return done(error, "/admin/partners", data);
}
export async function assignCommissionPlan(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/partners");
  const { error } = await supabase.rpc("assign_commission_plan", { p_partner: Number(s(form, "partner_id")), p_plan_code: s(form, "plan_code").toUpperCase() });
  return done(error, "/admin/partners");
}
export async function createPayout(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/partners");
  const { data, error } = await supabase.rpc("create_partner_payout", { p_partner: Number(s(form, "partner_id")) });
  return done(error, "/admin/partners", data);
}
export async function settlePayout(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/partners");
  const { error } = await supabase.rpc("settle_partner_payout", { p_id: Number(s(form, "id")), p_decision: s(form, "decision") });
  return done(error, "/admin/partners");
}
export async function updateLead(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/partners");
  const { error } = await supabase.rpc("update_lead", { p_id: Number(s(form, "id")), p_status: s(form, "status"), p_note: s(form, "note") || null, p_assignee: s(form, "assignee") || null });
  return done(error, "/admin/partners");
}

// ---- Markets ----
export async function updateMarketStage(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/markets");
  const p: Record<string, unknown> = {};
  for (const k of ["stage", "regulatory_notes", "data_feed", "client_eligibility"]) if (s(form, k)) p[k] = s(form, k);
  p.trading_enabled = form.get("trading_enabled") === "on";
  const { error } = await supabase.rpc("update_market_stage", { p_id: Number(s(form, "id")), p });
  return done(error, "/admin/markets");
}

// ---- Editorial ----
export async function saveArticle(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/editorial");
  const sources = s(form, "sources").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => { const [title, url] = l.split("|").map((x) => x.trim()); return url ? { title, url } : { title }; });
  const p: Record<string, unknown> = { title: s(form, "title"), dek: s(form, "dek") || null, body_md: String(form.get("body_md") ?? ""), classification: s(form, "classification") || "education", seo_title: s(form, "seo_title") || null, seo_description: s(form, "seo_description") || null, sources, tags: s(form, "tags").split(",").map((t) => t.trim()).filter(Boolean), ai_assisted: form.get("ai_assisted") === "on", change_note: s(form, "change_note") || null };
  if (s(form, "id")) p.id = Number(s(form, "id"));
  if (s(form, "category_id")) p.category_id = Number(s(form, "category_id"));
  const { data, error } = await supabase.rpc("save_article", { p });
  revalidatePath("/admin/editorial"); revalidatePath("/daily");
  return error ? { ok: false, error: rpcError(error) } : { ok: true, data };
}
export async function transitionArticle(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/editorial");
  const { error } = await supabase.rpc("article_transition", { p_id: Number(s(form, "id")), p_to: s(form, "to"), p_note: s(form, "note") || null, p_scheduled_for: s(form, "scheduled_for") ? new Date(s(form, "scheduled_for")).toISOString() : null });
  revalidatePath("/admin/editorial", "layout"); revalidatePath("/daily"); revalidatePath("/briefing");
  return error ? { ok: false, error: rpcError(error) } : { ok: true };
}
