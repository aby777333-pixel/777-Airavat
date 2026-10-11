# API_SPECIFICATIONS.md

AIRAVAT exposes two API surfaces in this phase. No public developer API exists yet (REQ-0101 / Developer platform: Not started). Versioning: RPC signatures are migration-versioned; HTTP routes are unversioned sandbox routes.

## 1. Postgres RPC (via Supabase PostgREST, authenticated session)
| Function | Input | Output | Auth | Idempotency / errors |
|---|---|---|---|---|
| `submit_kyc(p_payload jsonb)` | name, phone, pan, dob, address{}, occupation, income_range, trading_experience, segments[], nominee{}, declarations{}, risk_profile | `{application_id,status,account_id?,auto_approved}` | user | raises INVALID_PAN_FORMAT, MUST_BE_ADULT, DUPLICATE_PAN_APPLICATION, APPLICATION_ALREADY_EXISTS |
| `sandbox_deposit(p_amount numeric, p_reference text)` | amount | `{transaction_id, funds}` | user, active account | AMOUNT_OUT_OF_RANGE, SANDBOX_BALANCE_CAP_EXCEEDED |
| `request_withdrawal(p_amount)` | amount | `{transaction_id,status:PENDING}` | user | INSUFFICIENT_WITHDRAWABLE_BALANCE |
| `preview_order(symbol, side, type, product, qty, price?)` | — | `{ok, reference_price, order_value, charges{}, margin_required, available, sufficient, holdings_qty, kill_switch, market{}}` | user | read-only |
| `place_order(client_order_id, symbol, side, type, product, qty, price?, trigger?, via)` | — | `{order_id,status,exchange_order_id?,filled_qty,avg_fill_price,rms[],simulated:true}` or `{status:RMS_REJECTED,reason,rms[]}` | user | **idempotent on client_order_id** (replay returns existing order) |
| `cancel_order(p_order uuid)` | — | `{order_id,status:CANCELLED}` | owner or staff | ORDER_NOT_OPEN |
| `account_funds(p_account)` | — | funds object | owner or staff | FORBIDDEN otherwise |
| `accept_document(p_slug)` | — | void | user | DOCUMENT_NOT_FOUND |
| `review_kyc(p_app, decision, note)` | approve/reject | void | compliance/ops/admin/super_admin | |
| `review_withdrawal(p_txn, decision, note)` | approve/reject | void | ops/admin/super_admin, ≠ requester | MAKER_CHECKER_VIOLATION |
| `update_risk_limits(p jsonb)` | limits, allow_mis, kill_switch | void | risk/admin/super_admin | audited |
| `run_eod_settlement()` | — | `{run_id, mis_squared_off, orders_expired}` | ops/risk/admin/super_admin | |
| `trial_balance()` / `reconciliation_report()` | — | rows / jsonb | staff | |
| `set_user_role(p_user, p_role)` | — | void | super_admin, not self | |
| `update_app_setting(key, value)` | — | void | admin/super_admin | refuses `live_trading_enabled` |
| `market_status()` | — | `{status, ist, accepting_orders, sandbox_extended_hours, data_source:"SIMULATED"}` | anyone | |
| `compute_charges(product, side, value)` | — | charges jsonb | anyone | |

Error contract: Postgres `raise exception 'CODE[: detail]'`; the app maps `CODE` to user text in `src/lib/account.ts`.

## 2. HTTP routes (Next.js)
- `POST /api/live` — body `{messages[≤8], context{surface,symbol?,page?}, language}` → `{reply, model, prompt_version, latency_ms, simulated:true}`. 503 if not configured, 502 on provider failure. No tools; interactions logged to `ai_interactions` (metadata only).
- `POST /api/bhasha/translate` — auth required; `{text, target, source?}` → `{translated, provider:"sarvam"}`.
- `GET /api/health` — `{status, environment, live_trading:false, database_latency_ms, market, simulated_feed{last_tick, stale_if_market_accepting}, ai_gateway{anthropic,sarvam}}`.
- `GET /auth/callback?code=…&next=…` — PKCE exchange, records mandatory consents.

## Webhooks / streaming
None yet. Real-time quote streaming (WebSocket) is a backlog item; pages currently read `quotes` on render.
