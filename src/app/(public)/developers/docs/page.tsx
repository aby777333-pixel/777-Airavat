import Link from "next/link";
import { metadataFor, seoFor } from "@/lib/seo";
import { Badge, Notice, PageHeader } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/site/ContentPageView";
import Snippets from "./Snippets";

export const metadata = { ...metadataFor("/developers/docs") };
const BASE = "https://777-airavat.netlify.app/api/v1";

const ROUTES: [string, string, string, string][] = [
  ["GET", "/auth/whoami", "read", "Key owner, scopes, rate budget"],
  ["GET", "/instruments", "read", "Instrument master (symbol, exchange, lot, tick, band)"],
  ["GET", "/quotes?symbols=A,B", "read", "Simulated quotes for up to 50 symbols"],
  ["GET", "/candles?symbol=&timeframe=1d|1m&limit=", "read", "Synthetic candle history"],
  ["POST", "/orders", "trade", "Place MARKET, LIMIT, SL or SL-M; Idempotency-Key honoured"],
  ["GET", "/orders", "read", "Order list"],
  ["GET", "/orders/{id}", "read", "Order passport: lifecycle events and RMS trail"],
  ["DELETE", "/orders/{id}", "trade", "Cancel an open order"],
  ["POST", "/conditional-orders", "trade", "GTT, AMO, OCO, trailing, bracket, cover, iceberg, basket"],
  ["DELETE", "/conditional-orders/{id}", "trade", "Cancel a conditional instruction"],
  ["GET", "/portfolio/holdings", "read", "Holdings"],
  ["GET", "/portfolio/positions", "read", "Positions"],
  ["GET", "/funds", "funds", "Funds, blocked margin, available"],
  ["POST", "/funds/deposit", "funds", "Simulated deposit"],
  ["GET · POST", "/alerts", "alerts", "List or create price alerts"],
  ["DELETE", "/alerts/{id}", "alerts", "Cancel an alert"],
  ["GET", "/partner/passport", "partner", "Partner passport"],
  ["GET · POST", "/partner/leads", "partner", "Partner leads"],
  ["GET", "/admin/health", "admin", "Engine health (staff keys only)"],
  ["GET", "/admin/reconciliation", "admin", "Reconciliation (staff keys only)"],
  ["GET", "/stream?symbols=A,B", "read", "Server-sent events: quotes every two seconds"],
];
const ERRORS: [string, string, string][] = [
  ["401", "MISSING_API_KEY · INVALID_KEY", "No or unknown X-API-Key header"],
  ["403", "SCOPE_MISSING", "Key lacks the scope the route needs (read, trade, funds, alerts, partner, admin)"],
  ["404", "NOT_FOUND · UNKNOWN_ACTION · ORDER_NOT_FOUND · INSTRUMENT_NOT_FOUND", "Bad path or unknown id"],
  ["409", "NO_TRADING_ACCOUNT · ACCOUNT_NOT_ACTIVE", "Key owner has no active trading account"],
  ["400", "INVALID_JSON and every risk-engine rejection code", "Body not JSON, or the order failed a check (e.g. PRICE_OUTSIDE_BAND, INSUFFICIENT_FUNDS, LOT_SIZE, FAT_FINGER_PRICE_DEVIATION, RMS_ACCOUNT_BLOCKED)"],
  ["429", "RATE_LIMITED", "Per-key budget exhausted; the whoami response shows the remaining budget"],
  ["500", "GATEWAY_ERROR", "Engine unavailable; retry with the same Idempotency-Key"],
];

export default function DevDocs() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/developers", label: "Developer Hub" }, { href: "/developers/docs", label: "API reference" }]} />
      <PageHero variant="contact" intro={seoFor("/developers/docs").intro}><PageHeader eyebrow="AIRAVAT API v1" title="API reference and SDK snippets" subtitle={<>REST plus server-sent events, one envelope, one key header <Badge tone="ok">Sandbox live</Badge> <Badge tone="info">No production access</Badge></>} /></PageHero>
      <Notice tone="warn">Every response carries <code>environment: &quot;sandbox&quot;</code> and <code>simulated: true</code>. Market data and funds are simulated; production trading APIs need exchange approvals that do not exist yet.</Notice>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.618fr_1fr]">
        <div className="space-y-6">
          <section id="auth" className="glass p-5"><h2 className="font-display text-lg font-semibold">Authentication and conventions</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted"><li>Base URL <code>{BASE}</code>. Keys are issued in the app under Settings → API keys with a scope set; send them as <code>X-API-Key</code>. Query-string keys are accepted for quick tests only.</li><li>Envelope: <code>{"{ ok: true, ...data, environment, simulated }"}</code> or <code>{"{ ok: false, error, detail?, hint? }"}</code>. POST returns 201 on success.</li><li>Idempotency: send <code>Idempotency-Key</code> on any POST; a replay returns the original result without placing a second order.</li><li>Rate limits are per key; <code>/auth/whoami</code> reports the remaining budget. Responses are <code>cache-control: no-store</code> and carry <code>x-airavat-api-version: 1</code>.</li><li>Money fields are decimal strings; quantities are integers; times are ISO 8601 in UTC.</li></ul></section>
          <Snippets base={BASE} />
          <section id="routes" className="glass overflow-x-auto p-5"><h2 className="font-display text-lg font-semibold">Routes</h2><table className="table mt-3 text-sm"><thead><tr><th>Method</th><th>Path</th><th>Scope</th><th>What it does</th></tr></thead><tbody>{ROUTES.map((r) => <tr key={r[0] + r[1]}><td className="font-mono text-xs">{r[0]}</td><td className="font-mono text-xs">{r[1]}</td><td><Badge tone="default">{r[2]}</Badge></td><td className="text-muted">{r[3]}</td></tr>)}</tbody></table></section>
          <section id="errors" className="glass overflow-x-auto p-5"><h2 className="font-display text-lg font-semibold">Errors</h2><table className="table mt-3 text-sm"><thead><tr><th>HTTP</th><th>Code</th><th>Meaning</th></tr></thead><tbody>{ERRORS.map((e) => <tr key={e[0] + e[1]}><td className="font-mono text-xs">{e[0]}</td><td className="font-mono text-xs">{e[1]}</td><td className="text-muted">{e[2]}</td></tr>)}</tbody></table><p className="mt-2 text-xs text-muted">Risk-engine rejections return 400 with the same code you would see in the order passport; the <Link href="/trade/basket-gtt" className="text-accent">smart order page</Link> and <Link href="/learn/regulations" className="text-accent">regulation digest</Link> explain the rules behind them.</p></section>
        </div>
        <aside className="space-y-4">
          <div className="m-crystal p-5"><div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Machine-readable</div><div className="mt-3 flex flex-col gap-2"><a href="/api/v1/openapi.json" className="btn btn-primary">OpenAPI 3 document</a><Link href="/login?next=/app/settings" className="btn btn-ghost">Issue a sandbox key</Link><Link href="/developers" className="btn btn-ghost">Developer Hub</Link></div></div>
          <div className="glass p-5"><div className="font-display font-semibold">Scopes</div><ul className="mt-2 space-y-1 text-sm text-muted"><li><b>read</b> instruments, quotes, candles, orders, portfolio, stream</li><li><b>trade</b> place and cancel orders and conditional instructions</li><li><b>funds</b> funds and simulated deposits</li><li><b>alerts</b> price alerts</li><li><b>partner</b> partner passport and leads</li><li><b>admin</b> staff keys only</li></ul></div>
          <div className="glass p-5"><div className="font-display font-semibold">Good citizenship</div><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted"><li>Poll quotes no faster than every two seconds, or use the stream</li><li>Always send an Idempotency-Key when placing orders</li><li>Read the order passport after a rejection instead of retrying blindly</li><li>Keys are secrets: rotate them from the app if they leak</li></ul></div>
          <p className="text-[11px] text-faint">Algorithmic order flow in production is subject to exchange algo approval, order tagging and broker risk controls (see Regulation explained). Nothing on this page grants production access.</p>
        </aside>
      </div>
    </div>
  );
}
