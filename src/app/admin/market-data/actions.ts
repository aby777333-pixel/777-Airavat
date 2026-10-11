"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { rpcError } from "@/lib/account";
import type { AdminResult } from "../actions";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const n = (f: FormData, k: string) => (s(f, k) === "" ? null : Number(s(f, k)));
const refresh = () => { revalidatePath("/admin/market-data"); revalidatePath("/markets/corporate-actions"); revalidatePath("/markets/economic-calendar"); revalidatePath("/markets/ipo-calendar"); };

export async function addCorporateAction(form: FormData): Promise<AdminResult> {
  const { supabase, user } = await requireStaff("/admin/market-data");
  const { error } = await supabase.from("corporate_actions").insert({ instrument_id: Number(s(form, "instrument_id")), kind: s(form, "kind"), ex_date: s(form, "ex_date"), record_date: s(form, "record_date") || null, amount: n(form, "amount"), ratio: s(form, "ratio") || null, description: s(form, "description") || null, source: s(form, "source") || "Staff entry", created_by: user.id });
  refresh(); return error ? { ok: false, error: error.message } : { ok: true };
}
export async function applyCorporateActionsNow(): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/market-data");
  const { data, error } = await supabase.rpc("apply_corporate_actions");
  refresh(); return error ? { ok: false, error: rpcError(error) } : { ok: true, data };
}
export async function addEconomicEvent(form: FormData): Promise<AdminResult> {
  const { supabase, user } = await requireStaff("/admin/market-data");
  const { error } = await supabase.from("economic_events").insert({ event_date: s(form, "event_date"), event_time: s(form, "event_time") || null, title: s(form, "title"), category: s(form, "category"), importance: s(form, "importance"), expected: s(form, "expected") || null, previous: s(form, "previous") || null, source: s(form, "source") || "Staff entry", created_by: user.id });
  refresh(); return error ? { ok: false, error: error.message } : { ok: true };
}
export async function addIpo(form: FormData): Promise<AdminResult> {
  const { supabase, user } = await requireStaff("/admin/market-data");
  const { error } = await supabase.from("ipos").insert({ name: s(form, "name"), symbol: s(form, "symbol").toUpperCase() || null, board: s(form, "board"), price_band_low: n(form, "price_band_low"), price_band_high: n(form, "price_band_high"), lot_size: n(form, "lot_size"), issue_size_cr: n(form, "issue_size_cr"), open_date: s(form, "open_date") || null, close_date: s(form, "close_date") || null, allotment_date: s(form, "allotment_date") || null, listing_date: s(form, "listing_date") || null, description: s(form, "description") || null, source: "Staff entry (sandbox)", created_by: user.id });
  refresh(); return error ? { ok: false, error: error.message } : { ok: true };
}
export async function setIpoStatus(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/market-data");
  const { error } = await supabase.from("ipos").update({ status: s(form, "status") }).eq("id", Number(s(form, "id")));
  refresh(); return error ? { ok: false, error: error.message } : { ok: true };
}
export async function allotIpo(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/market-data");
  const { data, error } = await supabase.rpc("allot_ipo", { p_ipo: Number(s(form, "id")) });
  refresh(); revalidatePath("/app/ipo"); return error ? { ok: false, error: rpcError(error) } : { ok: true, data };
}
