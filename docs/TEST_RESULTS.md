# TEST_RESULTS.md — 2026-10-11

## Static and unit
- `npx tsc --noEmit`: pass (0 errors)
- `npx eslint`: pass (0 errors, 1 benign unused-arg warning)
- `npx vitest run`: 1 file, 17 tests passed (calculators)
- `npm run build`: pass (Next.js 16.4, 49 routes, proxy compiled)

## AI gateway
- Live Anthropic call with the configured key, model `claude-sonnet-5-5`: returned "OK" (18 in / 4 out tokens).
- Sarvam: not exercised against the vendor in this session.

## Engine end-to-end (live sandbox DB, transaction-scoped JWT claims for a synthetic client `e2e-client@airavat.sandbox`)
| Step | Expected | Observed |
|---|---|---|
| submit_kyc | approved (sandbox auto policy), account + ledger created | ✅ approved, auto_approved=true, account AV100001-series |
| sandbox_deposit 5,00,000 | ledger 5,00,000, Dr 1000 / Cr C-xxx | ✅ available 500000 |
| MARKET BUY 10 RELIANCE CNC | RMS pass; FILLED at ask; charges posted | ✅ FILLED @1296.75, margin check required 12982.39 |
| Replay same client_order_id | idempotent, same order id, no duplicate | ✅ `idempotent_replay: true` |
| LIMIT BUY 5 TCS at prev_close×0.95 | rests ACKNOWLEDGED; funds held | ✅ ACKNOWLEDGED, blocked_for_orders 15121.67 |
| LIMIT BUY at prev_close×0.80 | RMS reject PRICE_OUTSIDE_BAND | ✅ |
| MARKET SELL 4 RELIANCE CNC | FILLED at bid; holdings 6; realized P&L | ✅ FILLED @1296.65, realized −0.40 |
| SELL 100 RELIANCE CNC | reject INSUFFICIENT_HOLDINGS (free 6) | ✅ |
| BUY 10,000 TCS | reject MAX_ORDER_VALUE_EXCEEDED | ✅ |
| LIMIT at non-tick price | reject PRICE_NOT_TICK_MULTIPLE | ✅ |
| MARKET SELL 10 INFY MIS (short) | FILLED; margin_used = 20% | ✅ margin_used 3093.70 |
| cancel resting LIMIT | CANCELLED; hold released | ✅ holds_open 0 |
| cancel FILLED order | refused ORDER_NOT_OPEN | ✅ `ORDER_NOT_OPEN: FILLED` |
| Journal | Σdebit = Σcredit | ✅ 533,637.99 both sides |
| Audit | events recorded for actor | ✅ 11 events |
| Order journal | RECEIVED→RMS_CHECK→ROUTED→ACKNOWLEDGED→FILLED | ✅ |

The fixture client remains in the sandbox database for inspection in Broker Core (its PAN is a format-only test value).

## Deployment verification (Netlify, https://777-airavat.netlify.app)
- Build on Netlify Linux builders with `@netlify/plugin-nextjs` (declared in netlify.toml): plugin success, 1 function + 1 edge function (proxy).
- `/api/health` → `status: ok`, `live_trading: false`, `data_source: SIMULATED`, pg_cron tick fresh (last tick within the minute), AI gateway keys present.
- Public routes return 200: `/`, `/markets`, `/markets/RELIANCE`, `/calculators`, `/pricing`, `/platforms`, `/trust`, `/academy`, `/legal/terms-of-use`, `/login`, `/signup`, `/about`, `/contact`. `/app` and `/admin` redirect (307) to `/login?next=…`; `/open-account` → `/signup`.
- `/api/live` with an invalid body returns 400 (schema validation).
- Security headers present: HSTS, X-Frame-Options DENY, nosniff, referrer policy.
- Visual check in browser: home hero + market pulse, instrument page with candlestick chart, calculators.
- Found and fixed during verification: `market_status()` read `app_settings` under anon RLS and reported extended hours as off on public pages (migration 0005 makes it security definer).
- Sign-up probe: Supabase Auth rejects reserved/test email domains (`.sandbox`, `example.com`) as invalid, so the email-confirmation behaviour could not be verified without a real mailbox. To be confirmed by the owner on first real sign-up.

## Supabase security advisors
After migration 0004: no exposed internal `security definer` functions; `search_path` set on all functions.

## Not executed
Load, failover, DR, accessibility automation, mobile device matrix, email-confirmation flow, Sarvam vendor call.
