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

## 3. Phase 2 RPC additions (authenticated session unless stated)
| Function | Caller | Purpose / errors |
|---|---|---|
| `compute_charges_v2(account, product, side, value, date?)` | staff (internal from `apply_fill`) | plan + waiver + offer aware charges; legacy `compute_charges` delegates with no account |
| `submit_fee_version(p jsonb)` | finance/admin/super_admin; statutory: compliance/super_admin | new pending version → `approval_requests` (`STATUTORY_CHANGE_REQUIRES_COMPLIANCE`) |
| `decide_approval(request, decision, note)` | per entity matrix | `MAKER_CHECKER_VIOLATION` if requester |
| `request_waiver(...)` · `create_offer(p)` · `apply_promo_code(code)` · `assign_plan(...)` · `request_charge_adjustment(...)` · `subscribe_plan(code)` · `cancel_subscription(id)` · `revenue_summary(from, to)` | see role checks in migration 0007 | `ONLY_BROKER_FEES_CAN_BE_WAIVED`, `OFFER_NOT_AVAILABLE`, `PLAN_NOT_AVAILABLE`, `ALREADY_SUBSCRIBED`, `INSUFFICIENT_FUNDS` |
| `register_partner(p)` · `set_partner_status(id, status, note)` · `update_partner(id, p)` · `create_commission_plan(p)` · `assign_commission_plan(partner, plan_code)` · `create_partner_payout(partner)` · `settle_partner_payout(id, decision)` · `partner_passport(partner)` · `update_lead(id, status, note, assignee?)` | sales/ops/compliance/finance/admin per function; passport also partner self | `AUTHORIZED_PERSON_NEEDS_EXCHANGE_APPROVAL_REF`, `PLAN_CATEGORY_MISMATCH`, `PARTNER_NOT_ELIGIBLE`, `NOTHING_TO_PAY`, `PARTNER_CANNOT_APPROVE_OWN_PAYOUT` |
| `create_lead(p)` | **anon allowed** (public form, honeypot + validation in `/api/leads`) | round-robin assignment to `sales` |
| `update_market_stage(id, p)` | compliance/admin/super_admin | `TRADING_ENABLE_GATE` |
| `save_scanner(p)` · `delete_scanner(id)` | user | `CONDITIONS_1_TO_8`, `UNKNOWN_METRIC`, `SCANNER_LIMIT` |
| `create_research_case(p)` · `add_research_evidence(case, p)` · `add_research_finding(...)` · `close_research_case(case, summary)` | owner | |
| `save_strategy(p)` · `record_backtest(p)` | owner | `UNKNOWN_STRATEGY_TYPE` |
| `create_shadow_portfolio(...)` · `shadow_place_order(...)` · `shadow_valuation(portfolio)` | owner | `CASH_OUT_OF_RANGE`, `PORTFOLIO_LIMIT`, `INSUFFICIENT_SHADOW_CASH`, `INSUFFICIENT_SHADOW_HOLDINGS` |
| `trade_health(account)` · `premortem(symbol, side, product, qty)` · `decision_twin(symbol, product)` · `what_changed(since?)` · `acknowledge_alert(id)` · `set_sentinel_preferences(p)` | owner (health also staff) | `NO_OPEN_POSITION` |
| `save_article(p)` · `article_transition(id, to, note?, scheduled_for?)` | editor/compliance/admin/super_admin | `COMPLIANCE_APPROVAL_REQUIRED`, `MAKER_CHECKER_VIOLATION`, `MUST_BE_APPROVED`, `MUST_BE_APPROVED_WITH_SCHEDULE`, `INVALID_TRANSITION` |
| `subscribe_newsletter(email)` · `daily_briefing()` | **anon allowed** | `INVALID_EMAIL` |

## 4. Phase 2 HTTP routes
- `GET /api/search?q=` → `{results[{kind,title,subtitle?,href}]}` (commands, instruments, published articles).
- `POST /api/leads` → `{ok, id}`; honeypot field `website`; 400 on validation failure.
- `POST /api/research/warroom` `{case_id}` → records four findings (bull, bear, neutral, auditor) with model + `warroom-v1.0`; 401/403/503 as appropriate.
- `POST /api/editorial` `{task, topic, body?, category?}` → `{ok, text, model, prompt_version:"editorial-v1.0", review_required:true}`; staff only.
