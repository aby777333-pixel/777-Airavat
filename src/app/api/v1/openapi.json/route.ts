import { NextResponse } from "next/server";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://777-airavat.netlify.app";
const sec = [{ ApiKeyAuth: [] }];
const r = (summary: string, scope: string, extra: Record<string, unknown> = {}) => ({ summary, description: `Scope: ${scope}. Sandbox: simulated data and funds.`, security: sec, responses: { "200": { description: "OK" }, "401": { description: "Invalid or missing key" }, "403": { description: "Scope missing" }, "429": { description: "Rate limited (per-key per-minute)" } }, ...extra });
const spec = {
  openapi: "3.1.0",
  info: { title: "AIRAVAT API", version: "1.0.0", description: "Sandbox REST API for AIRAVAT. Keys are issued in the app (Developer Hub). Every order placed by API passes the same risk engine, holds, journal and audit as the web app. Streaming: GET /api/v1/stream (server-sent events). All data is SIMULATED." },
  servers: [{ url: `${SITE}/api/v1` }],
  components: { securitySchemes: { ApiKeyAuth: { type: "apiKey", in: "header", name: "X-API-Key" } }, parameters: { Idem: { name: "Idempotency-Key", in: "header", schema: { type: "string" }, description: "Replay-safe POSTs: same key returns the original response for 24h." } } },
  paths: {
    "/auth/whoami": { get: r("Key owner, scopes and remaining rate budget", "read") },
    "/instruments": { get: r("List instruments", "read") },
    "/quotes": { get: r("Quotes (optional ?symbols=A,B)", "read") },
    "/candles": { get: r("Candles ?symbol=&timeframe=1d|1m&limit=", "read") },
    "/orders": { get: r("List orders (?limit=)", "read"), post: r("Place order", "trade", { parameters: [{ $ref: "#/components/parameters/Idem" }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["symbol", "side", "qty"], properties: { client_order_id: { type: "string" }, symbol: { type: "string" }, side: { enum: ["BUY", "SELL"] }, order_type: { enum: ["MARKET", "LIMIT", "SL", "SL-M"] }, product: { enum: ["CNC", "MIS"] }, qty: { type: "integer" }, price: { type: "number" }, trigger_price: { type: "number" } } } } } } }) },
    "/orders/{id}": { get: r("Order with lifecycle events and RMS trail", "read", { parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }] }), delete: r("Cancel an open order", "trade", { parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }] }) },
    "/conditional-orders": { post: r("Place a broker-managed conditional order (GTT, AMO, OCO, TRAILING_STOP, BRACKET, COVER, ICEBERG, BASKET)", "trade", { requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["kind"], properties: { kind: { type: "string" }, symbol: { type: "string" }, side: { type: "string" }, product: { type: "string" }, order_type: { type: "string" }, qty: { type: "integer" }, price: { type: "number" }, trigger_price: { type: "number" }, target_price: { type: "number" }, stop_price: { type: "number" }, trail_pct: { type: "number" }, disclosed_qty: { type: "integer" }, legs: { type: "array" } } } } } } }) },
    "/conditional-orders/{id}": { delete: r("Cancel a conditional order", "trade", { parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }] }) },
    "/portfolio/holdings": { get: r("Holdings with simulated marks", "read") },
    "/portfolio/positions": { get: r("Open positions", "read") },
    "/funds": { get: r("Funds and margin", "funds") },
    "/funds/deposit": { post: r("Simulated deposit (sandbox only)", "funds") },
    "/alerts": { get: r("List price alerts", "alerts"), post: r("Create a price alert {symbol, condition: ABOVE|BELOW, price, note}", "alerts") },
    "/alerts/{id}": { delete: r("Cancel a price alert", "alerts", { parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }] }) },
    "/partner/passport": { get: r("Partner eligibility passport", "partner") },
    "/partner/leads": { get: r("Partner leads", "partner"), post: r("Create a lead {full_name, email, phone, consent_marketing}", "partner") },
    "/admin/health": { get: r("Engine health", "admin") },
    "/admin/reconciliation": { get: r("Reconciliation report", "admin") },
    "/stream": { get: { summary: "Server-sent events: simulated quotes every 2s for up to 55s per connection (?symbols=)", security: sec, responses: { "200": { description: "text/event-stream" } } } },
  },
};
export function GET() { return NextResponse.json(spec, { headers: { "cache-control": "public, max-age=300" } }); }
