import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// AIRAVAT API v1 (sandbox). Authentication: X-API-Key header (keys issued in the app). Idempotency: Idempotency-Key header on POST.
// Every action executes in the database under the key owner's identity via api_call(), so RMS, holds, journal and audit apply.
const ROUTES: Record<string, { action: string; method: "GET" | "POST" | "DELETE" }> = {
  "GET auth/whoami": { action: "auth.whoami", method: "GET" },
  "GET instruments": { action: "instruments.list", method: "GET" },
  "GET quotes": { action: "quotes.get", method: "GET" },
  "GET candles": { action: "candles.get", method: "GET" },
  "POST orders": { action: "orders.place", method: "POST" },
  "GET orders": { action: "orders.list", method: "GET" },
  "GET orders/:id": { action: "orders.get", method: "GET" },
  "DELETE orders/:id": { action: "orders.cancel", method: "DELETE" },
  "POST conditional-orders": { action: "conditional.place", method: "POST" },
  "DELETE conditional-orders/:id": { action: "conditional.cancel", method: "DELETE" },
  "GET portfolio/holdings": { action: "portfolio.holdings", method: "GET" },
  "GET portfolio/positions": { action: "portfolio.positions", method: "GET" },
  "GET funds": { action: "funds.get", method: "GET" },
  "POST funds/deposit": { action: "funds.deposit", method: "POST" },
  "GET alerts": { action: "alerts.list", method: "GET" },
  "POST alerts": { action: "alerts.create", method: "POST" },
  "DELETE alerts/:id": { action: "alerts.cancel", method: "DELETE" },
  "GET partner/passport": { action: "partner.passport", method: "GET" },
  "GET partner/leads": { action: "partner.leads", method: "GET" },
  "POST partner/leads": { action: "partner.lead.create", method: "POST" },
  "GET admin/health": { action: "admin.health", method: "GET" },
  "GET admin/reconciliation": { action: "admin.reconciliation", method: "GET" },
};
const STATUS: Record<string, number> = { INVALID_KEY: 401, SCOPE_MISSING: 403, RATE_LIMITED: 429, UNKNOWN_ACTION: 404, ORDER_NOT_FOUND: 404, INSTRUMENT_NOT_FOUND: 404, NO_TRADING_ACCOUNT: 409, ACCOUNT_NOT_ACTIVE: 409 };

function match(method: string, path: string[]) {
  for (const [k, v] of Object.entries(ROUTES)) {
    const [m, pattern] = k.split(" "); if (m !== method) continue;
    const parts = pattern.split("/"); if (parts.length !== path.length) continue;
    const params: Record<string, string> = {}; let ok = true;
    parts.forEach((p, i) => { if (p.startsWith(":")) params[p.slice(1)] = path[i]; else if (p !== path[i]) ok = false; });
    if (ok) return { ...v, params };
  }
  return null;
}

async function handle(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const url = new URL(req.url);
  const route = match(req.method, path);
  if (!route) return NextResponse.json({ ok: false, error: "NOT_FOUND", hint: "See /api/v1/openapi.json" }, { status: 404 });
  const key = req.headers.get("x-api-key") ?? url.searchParams.get("api_key");
  if (!key) return NextResponse.json({ ok: false, error: "MISSING_API_KEY" }, { status: 401 });
  let body: Record<string, unknown> = {};
  if (req.method === "POST") { try { body = (await req.json()) ?? {}; } catch { return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 }); } }
  const params: Record<string, unknown> = { ...Object.fromEntries(url.searchParams.entries()), ...body };
  if (params.symbols && typeof params.symbols === "string") params.symbols = String(params.symbols).split(",");
  if (route.params.id) { params.order_id = route.params.id; params.id = route.params.id; }
  const idem = req.method === "POST" ? req.headers.get("idempotency-key") : null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("api_call", { p_key: key, p_action: route.action, p_params: params, p_idem: idem });
  if (error) return NextResponse.json({ ok: false, error: "GATEWAY_ERROR", detail: error.message }, { status: 500 });
  const res = data as { ok: boolean; error?: string };
  const status = res.ok ? (req.method === "POST" ? 201 : 200) : STATUS[res.error ?? ""] ?? 400;
  return NextResponse.json({ ...res, environment: "sandbox", simulated: true }, { status, headers: { "cache-control": "no-store", "x-airavat-api-version": "1" } });
}
export const GET = handle; export const POST = handle; export const DELETE = handle;
