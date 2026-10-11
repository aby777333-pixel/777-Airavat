"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { rpcError } from "@/lib/account";
import type { AdminResult } from "../actions";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const lines = (f: FormData, k: string) => s(f, k).split("\n").map((x) => x.trim()).filter(Boolean);
const json = (f: FormData, k: string, fallback: unknown) => { const v = s(f, k); if (!v) return fallback; try { return JSON.parse(v); } catch { throw new Error(`Invalid JSON in ${k}`); } };
const refresh = (path?: string) => { revalidatePath("/admin/website", "layout"); if (path) revalidatePath(path); revalidatePath("/", "layout"); };

export async function savePage(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/website");
  try {
    const p: Record<string, unknown> = { path: s(form, "path"), group_label: s(form, "group_label") || "Company", title: s(form, "title"), h1: s(form, "h1") || s(form, "title"), dek: s(form, "dek") || null, intro: s(form, "intro") || null, keywords: s(form, "keywords").split(",").map((x) => x.trim()).filter(Boolean), hero: s(form, "hero") || "legal", availability: s(form, "availability") || "info", availability_note: s(form, "availability_note") || null, sections: json(form, "sections", []), eligibility: lines(form, "eligibility"), risks: lines(form, "risks"), costs: lines(form, "costs"), tools: json(form, "tools", []), faqs: json(form, "faqs", []), ctas: json(form, "ctas", []), related: lines(form, "related"), requires_compliance: form.get("requires_compliance") === "on", change_note: s(form, "change_note") || null };
    if (s(form, "id")) p.id = Number(s(form, "id"));
    const { data, error } = await supabase.rpc("save_site_page", { p });
    refresh(String(p.path)); return error ? { ok: false, error: rpcError(error) } : { ok: true, data };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
export async function transitionPage(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/website");
  const { error } = await supabase.rpc("site_page_transition", { p_id: Number(s(form, "id")), p_to: s(form, "to"), p_note: s(form, "note") || null, p_scheduled_for: s(form, "scheduled_for") ? new Date(s(form, "scheduled_for")).toISOString() : null });
  refresh(s(form, "path")); return error ? { ok: false, error: rpcError(error) } : { ok: true };
}
export async function saveMenu(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/website");
  try {
    const structure = json(form, "structure", null);
    if (!Array.isArray(structure)) return { ok: false, error: "Menu must be a JSON array of groups" };
    for (const g of structure) if (!g.key || !g.label || !Array.isArray(g.links)) return { ok: false, error: "Each group needs key, label and links[]" };
    const { error } = await supabase.rpc("save_site_menu", { p_key: s(form, "key") || "primary", p_structure: structure });
    refresh(); return error ? { ok: false, error: rpcError(error) } : { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
export async function publishMenu(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/website");
  const { error } = await supabase.rpc("publish_site_menu", { p_key: s(form, "key") || "primary", p_publish: s(form, "publish") === "1" });
  refresh(); return error ? { ok: false, error: rpcError(error) } : { ok: true };
}
export async function saveHero(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/website");
  const { error } = await supabase.rpc("save_site_hero", { p_path: s(form, "path"), p_variant: s(form, "variant"), p_headline: s(form, "headline") || null, p_intro: s(form, "intro") || null, p_publish: form.get("publish") === "on" });
  refresh(s(form, "path")); return error ? { ok: false, error: rpcError(error) } : { ok: true };
}
export async function saveFaq(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/website");
  const { error } = await supabase.rpc("save_site_faq", { p_id: s(form, "id") ? Number(s(form, "id")) : null, p_path: s(form, "path"), p_q: s(form, "question"), p_a: s(form, "answer"), p_position: Number(s(form, "position") || 0), p_status: s(form, "status") || "draft" });
  refresh(s(form, "path")); return error ? { ok: false, error: rpcError(error) } : { ok: true };
}
export async function deleteFaq(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/website");
  const { error } = await supabase.rpc("delete_site_faq", { p_id: Number(s(form, "id")) });
  refresh(); return error ? { ok: false, error: rpcError(error) } : { ok: true };
}
export async function registerMedia(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/website");
  const { error } = await supabase.rpc("register_site_media", { p_url: s(form, "url"), p_alt: s(form, "alt"), p_kind: s(form, "kind") || "image", p_tags: s(form, "tags").split(",").map((x) => x.trim()).filter(Boolean) });
  refresh(); return error ? { ok: false, error: rpcError(error) } : { ok: true };
}
export async function saveSetting(form: FormData): Promise<AdminResult> {
  const { supabase } = await requireStaff("/admin/website");
  try {
    const { error } = await supabase.rpc("save_site_setting", { p_key: s(form, "key"), p_value: json(form, "value", {}) });
    refresh(); return error ? { ok: false, error: rpcError(error) } : { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
