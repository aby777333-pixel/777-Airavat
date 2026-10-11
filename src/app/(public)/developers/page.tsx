import Link from "next/link";
import { Notice, PageHeader } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/site/ContentPageView";

export const metadata = { title: "Developer Hub: AIRAVAT trading API v1 (sandbox)", description: "REST API for instruments, quotes, candles, orders, conditional orders, portfolio, funds, alerts, partner and admin endpoints, with sandbox API keys, scopes, rate limits, idempotency and an OpenAPI spec.", keywords: ["trading API documentation", "broker API India", "sandbox API key", "OpenAPI trading", "SSE quotes stream"] };

const endpoints = [
  ["GET", "/auth/whoami", "read", "Key owner, scopes, rate budget"], ["GET", "/instruments", "read", "Instrument master"], ["GET", "/quotes?symbols=", "read", "Simulated quotes"], ["GET", "/candles?symbol=&timeframe=1d&limit=", "read", "Simulated candles"],
  ["POST", "/orders", "trade", "Place MARKET/LIMIT/SL/SL-M (Idempotency-Key supported)"], ["GET", "/orders", "read", "Order list"], ["GET", "/orders/{id}", "read", "Order passport: events + RMS trail"], ["DELETE", "/orders/{id}", "trade", "Cancel open order"],
  ["POST", "/conditional-orders", "trade", "GTT, AMO, OCO, trailing, bracket, cover, iceberg, basket"], ["DELETE", "/conditional-orders/{id}", "trade", "Cancel conditional"],
  ["GET", "/portfolio/holdings", "read", "Holdings"], ["GET", "/portfolio/positions", "read", "Positions"], ["GET", "/funds", "funds", "Funds and margin"], ["POST", "/funds/deposit", "funds", "Simulated deposit"],
  ["GET/POST", "/alerts", "alerts", "Price alerts"], ["DELETE", "/alerts/{id}", "alerts", "Cancel alert"], ["GET", "/partner/passport", "partner", "Partner passport"], ["GET/POST", "/partner/leads", "partner", "Leads"],
  ["GET", "/admin/health", "admin", "Engine health (staff keys)"], ["GET", "/admin/reconciliation", "admin", "Reconciliation (staff keys)"], ["GET", "/stream?symbols=", "read", "Server-sent events, 2s cadence, 55s per connection"],
];

export default function Developers() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/calculators", label: "Tools" }, { href: "/developers", label: "Developer Hub" }]} />
      <PageHero variant="contact" intro="The AIRAVAT API exposes the same engine the apps use. Issue a sandbox key in the app, call the versioned REST endpoints with an X-API-Key header, and every order you place passes the identical risk engine, fund holds, journal postings and audit trail. Streaming uses server-sent events; the OpenAPI document is machine-readable."><PageHeader eyebrow="Developer Hub" title="AIRAVAT API v1" subtitle="Sandbox keys · scopes · 120 requests per minute per key · idempotent POSTs · OpenAPI 3.1" /></PageHero>
      <Notice tone="warn">Sandbox only: simulated market data and funds. Production API access, FIX connectivity and WebSocket streaming require exchange approvals and certified infrastructure that do not exist yet.</Notice>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.618fr_1fr]">
        <div className="space-y-5">
          <div className="glass p-5">
            <h2 className="font-display text-lg font-semibold">Quick start</h2>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-bg/60 p-3 text-xs">{`# 1. Issue a key in the app (Developer settings) with the scopes you need.
# 2. Who am I?
curl -H "X-API-Key: avsb_..." https://777-airavat.netlify.app/api/v1/auth/whoami

# 3. Quotes
curl -H "X-API-Key: avsb_..." "https://777-airavat.netlify.app/api/v1/quotes?symbols=RELIANCE,TCS"

# 4. Place a simulated delivery order (idempotent)
curl -X POST -H "X-API-Key: avsb_..." -H "Idempotency-Key: my-order-1" -H "content-type: application/json" \\
  -d '{"symbol":"RELIANCE","side":"BUY","qty":1,"order_type":"MARKET","product":"CNC"}' \\
  https://777-airavat.netlify.app/api/v1/orders

# 5. Stream quotes (SSE)
curl -N -H "X-API-Key: avsb_..." "https://777-airavat.netlify.app/api/v1/stream?symbols=RELIANCE"`}</pre>
          </div>
          <div className="glass overflow-x-auto p-2"><table className="table text-sm"><thead><tr><th>Method</th><th>Path (prefix /api/v1)</th><th>Scope</th><th>Purpose</th></tr></thead><tbody>{endpoints.map((e) => <tr key={e[1] + e[0]}><td className="font-mono text-xs">{e[0]}</td><td className="font-mono text-xs">{e[1]}</td><td><span className="badge">{e[2]}</span></td><td className="text-muted">{e[3]}</td></tr>)}</tbody></table></div>
        </div>
        <aside className="space-y-5">
          <div className="m-crystal p-5"><div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Get started</div><div className="mt-3 flex flex-col gap-2"><Link href="/login?next=/app/developer" className="btn btn-primary">Issue a sandbox key</Link><a href="/api/v1/openapi.json" className="btn btn-ghost">OpenAPI 3.1 document</a><Link href="/trade/trading-apis" className="btn btn-ghost">API product page</Link></div></div>
          <div className="glass p-5 text-sm text-muted"><div className="font-display font-semibold text-text">Conventions</div><ul className="mt-2 list-disc space-y-1 pl-5"><li>Errors: <code>{`{ok:false, error:CODE, detail}`}</code> with HTTP 401/403/404/409/429.</li><li>Rate limit: 120 calls per minute per key; <code>rate_remaining</code> on whoami.</li><li>Idempotency: send <code>Idempotency-Key</code> on POST; replays return the original response for 24 hours.</li><li>Scopes: read, trade, funds, alerts, partner, admin (staff only).</li><li>Every response carries <code>environment: sandbox</code> and <code>simulated: true</code>.</li></ul></div>
          <div className="glass p-5 text-sm text-muted"><div className="font-display font-semibold text-text">Institutional connectivity</div><p className="mt-1">A FIX 4.4 session specification (order, execution report, cancel, market data) is maintained for approved institutions. It is not hosted in the sandbox because the hosting platform is serverless; it is a production infrastructure item recorded in the blockers register.</p></div>
        </aside>
      </div>
    </div>
  );
}
