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

---
# Phase 2 — 2026-10-11 (release 0.2.0)

## Static and unit
- `npx tsc --noEmit`: pass (0 errors)
- `npm run lint`: pass (0 errors; 1 pre-existing unused-arg warning). Local `.netlify/` build output is now ignored by ESLint.
- `npm test`: 2 files, 27 tests passed (calculators 17, backtest engine 10)
- `npm run build`: pass (Next.js 16.4, 82 routes)

## Regression of Phase 1 (unchanged behaviour)
- `compute_charges('CNC','BUY',100000)` = 118.62, `('MIS','SELL',100000)` = 52.22, MIS buy 10,000 brokerage 3.00: identical before and after RevenueOS; `compute_charges_v2` with an account on the STANDARD plan returns the same totals.
- After all Phase 2 activity the ledger stays balanced: trial balance 14 rows, Σdebit = Σcredit = 11,09,246.42; `reconciliation_report()` journal_balanced = true, 0 order/trade breaks, 0 negative client balances; 0 unbalanced journal entries.

## Phase 2 E2E (live sandbox DB, transaction-scoped JWT claims per role, real engine functions)
| Step | Expected | Observed |
|---|---|---|
| Sign-up with referral DEMO777 (client1.demo) | attribution row for the active partner | ✅ `referral_attributions.referral_code = DEMO777` |
| submit_kyc (client) → sandbox auto policy | account created, activation accrual for partner | ✅ approved, accrual 500 gross / 50 TDS / 450 net |
| sandbox_deposit 5,00,000 | ledger 5,00,000 | ✅ |
| 3 MARKET orders (RELIANCE CNC, TCS CNC, INFY MIS) | FILLED with RMS trail and charges | ✅ all FILLED (e.g. INFY MIS brokerage 9.26 on 30,882) |
| finance creates offer WELCOME50 (50% off BRK_MIS) → compliance approves → client applies | enrolment | ✅ |
| MARKET BUY 10 INFY MIS after enrolment | brokerage halved; redemption and contra-income posted | ✅ 2.31 vs 4.62 expected without offer; `offer_redemptions` 1 row; `offer_campaigns.spent` 2.31; account 4100 debits 2.31 |
| finance requests FULL waiver on BRK_CNC → admin approves | approved grant | ✅ |
| ops creates partner payout → finance approves | journal entry, accrual paid | ✅ payout id 2 approved, journal entry 18; passport paid_net 450, pending 0 |
| partner_passport | four flags true with plan | ✅ |
| revenue_summary (finance) | turnover, brokerage, levies, partner cost | ✅ 6 trades, turnover 93,274.85, brokerage 13.90, levies 61.12, partner remuneration 500 |
| Editorial: editor drafts → in_review → admin approves → editor publishes | published article visible publicly and in briefing | ✅ `daily_briefing().latest_articles` lists it |
| create_research_case + evidence; shadow portfolio + order; Sentinel preferences | rows for client1 | ✅ case 1, shadow order 1 (HDFCBANK 25 @ 1593.65, charges 47.26) |
| create_lead (website) | assigned round-robin to sales | ✅ status new, assigned true |
| trade_health / premortem / decision_twin / what_changed / daily_briefing under client claims | JSON shapes | ✅ (e.g. pre-mortem flagged concentration 87.4% for 50 TCS) |
| sentinel_scan() | runs without JWT (cron) | ✅ after migration 0013 (7 prior cron failures recorded) |
| run_scanners() | matches with evidence | ✅ 53 matches today across 10 scanners |

## Defects found and fixed
- `sentinel_scan` cron failures (FORBIDDEN from `account_funds`) → 0013.
- `accrue_partner_commission` / `partner_passport` ambiguous alias → 0014 (would have blocked KYC approval for referred clients).
- Advisor: three functions without pinned `search_path` → 0013.

## Demo logins
`python -I demo/verify-logins.py` → 12/12 accounts signed in with the expected role (DEMO_LOGIN_VERIFICATION.md).

## Supabase security advisors (after Phase 2)
No exposed internal functions. Remaining WARN items are intentional: `create_lead`, `daily_briefing`, `market_status`, `subscribe_newsletter` are callable by anon by design (validated, no sensitive output); authenticated-callable SECURITY DEFINER functions each enforce ownership/role inside. Leaked-password protection remains an owner setting in the Supabase dashboard.

## Not executed
Load, failover, DR, accessibility automation, mobile device matrix, email delivery, Sarvam vendor call, War Room/editorial copilot against the vendor in this session (routes validated for auth and schema only).

---
# 0.2.1 — 2026-10-11 — charge schedule alignment
- Catalogue: `EXCH_TXN` v2 (0.00307%) submitted by the compliance demo user and approved by the super_admin demo user through `decide_approval`; v1 retired automatically.
- `compute_charges('CNC','BUY',100000)` now 118.74 (exchange 3.07, GST 0.57); `('MIS','SELL',100000)` 52.34. Calculator unit tests updated to the same numbers; 6 new schedule tests (equity options, futures, currency, commodity, agri SEBI fee).
- Migration 0015 adds the `segment = 'EQ'` guard: after inserting 23 approved reference rows for FO/CDS/COMM, equity charges are unchanged (re-run of the two figures above: 118.74 / 52.34).
- `npm run typecheck && npm run lint && npm test && npm run build`: pass (see commit).

## Release 0.4.0 — 2026-10-11
### Static and unit
- `npx tsc --noEmit`: pass · `npm run lint`: 0 errors (3 benign warnings) · `npx vitest run`: 5 files, 55 tests passed (calculators, backtest, charges-schedule, options, indicators) · `npm run build`: pass.

### Portfolio & wealth engine E2E (live sandbox DB, transaction-scoped JWT claims as client1, rolled back)
| Step | Expected | Observed |
|---|---|---|
| capital_gains FY2025-26 | FIFO rows for delivery sells; totals | ✅ 0 sells in window → rows 0, stcg 0, intraday 0 |
| contract_note (last trade day) | numbered note with 12 trades, net obligation | ✅ CN-SIM-20261011-0024, n=12, net −97,119.09 |
| pledge 1 share | holdings −1, collateral = ltp×0.8 | ✅ collateral 271.76, holdings −1 |
| pledge 100,000 | INSUFFICIENT_FREE_HOLDINGS | ✅ |
| collateral_summary | 271.76 | ✅ |
| unpledge; unpledge again | holdings restored; ALREADY_RELEASED | ✅ / ✅ |
| mtf_convert without consent | MTF_AGREEMENT_REQUIRED | ✅ |
| mtf_convert after consent | funded 50% of value; journal Dr 1300 / Cr client | ✅ funded 169.85 |
| accrue_mtf_interest same day / next day | 0 / 1 row, interest 0.08 | ✅ / ✅ |
| mtf_close | repaid, holdings restored | ✅ repaid 169.85, interest 0.08 |
| grant_portfolio_view(client2) → family_portfolio as client2 | owner name + 6 holdings | ✅ |
| family_portfolio of self without grant; after revoke | FORBIDDEN / FORBIDDEN | ✅ / ✅ |

### Website CMS E2E (editor → admin → client, rolled back)
| Step | Expected | Observed |
|---|---|---|
| save_site_page as editor | draft | ✅ |
| in_review; self-approve | ok; MAKER_CHECKER_VIOLATION | ✅ / ✅ |
| approve + publish as admin | approved → published; 4 transitions | ✅ |
| menu: editor publishes own; admin publishes | MAKER_CHECKER_VIOLATION; published | ✅ / ✅ |
| client reads published page; client save/publish | 1 row; FORBIDDEN | ✅ / ✅ |

### Entity onboarding E2E (fresh users, rolled back)
| Step | Expected | Observed |
|---|---|---|
| company with 7 required documents, signatories, ITR income proof | approved, UCC/demat assigned, derivatives flag | ✅ (first run exposed MUST_BE_ADULT for a 2020 incorporation → migration 0025) |
| NRI with PIS type, FATCA AE + TIN | approved; FATCA step passed | ✅ |
| company missing documents | DOCUMENTS_MISSING listing all 7 | ✅ |
| unknown entity; minor individual | UNKNOWN_ENTITY_TYPE; MUST_BE_ADULT | ✅ / ✅ |

## Release 0.5.0 — 2026-10-11
### Static and unit
- `npx tsc --noEmit`: pass · `npm run lint`: 0 errors · `npx vitest run`: 55 tests passed · `npm run build`: pass (manifest route emitted).

### Independent RMS and back office E2E (live sandbox DB, JWT claims per role, rolled back)
| Step | Expected | Observed |
|---|---|---|
| baseline LIMIT 3% below LTP | ACKNOWLEDGED (unchanged behaviour) | ✅ |
| LIMIT 12% below LTP | rejected (band check precedes fat-finger) | ✅ PRICE_OUTSIDE_BAND |
| risk desk sets account max_order_value 1000, MIS off | row created | ✅ |
| MARKET BUY 1 RELIANCE (value > 1000) | ACCOUNT_MAX_ORDER_VALUE_EXCEEDED | ✅ |
| client sets own limits | FORBIDDEN | ✅ |
| daily loss limit 1 + realised −500 → rms_mtm_scan | account auto-blocked, critical alert, audit | ✅ kill_switch=true auto_blocked=true, 1 alert |
| order while auto-blocked | RMS_ACCOUNT_AUTO_BLOCKED | ✅ |
| risk desk unblocks | kill_switch=false, auto_blocked=false | ✅ |
| stress_test as owner (−10%) / as staff (defaults) | scenario with P&L and post-shock available / 4 scenarios | ✅ pnl −9,743.36 / ✅ |
| run_surveillance | 0 flags on demo activity | ✅ |
| generate obligations for last trade day | 3 accounts; client1 pay-in 40,745.12, 6 securities, settles next weekday | ✅ |
| settle_due_obligations (forced due) | settled 1, short 0 | ✅ |
| margin call → resolve | called (notification) → resolved | ✅ |
| client raises refund 25.50; client raises reconciliation; client decides | id / FORBIDDEN / FORBIDDEN | ✅ |
| ops decides own exception | MAKER_CHECKER_VIOLATION | ✅ |
| finance approves refund | approved, journal entry; ledger +25.50; decide twice → ALREADY_DECIDED | ✅ |
| journal | Σdebit = Σcredit | ✅ |
| fat-finger proof: account guard 2%, LIMIT 4% below LTP / 1% below / MARKET 20,000 qty | FAT_FINGER_PRICE_DEVIATION / accepted / global qty cap | ✅ / ✅ / ✅ MAX_ORDER_QTY_EXCEEDED (10,000 global cap precedes the volume guard) |

## Releases 0.7.0–0.7.8 — 2026-10-11
### Static and unit (run before every one of the nine commits)
- `npx tsc --noEmit`: pass · `npm run lint`: 0 errors (pre-existing warnings only) · `npx vitest run`: 62 tests passed (planners.test.ts added 7) · `npm run build`: pass.

### Local production render (next start, curl, content grep)
| Route group | Routes checked | Result |
|---|---|---|
| Platforms (0.7.7) | /platforms/terminal-demo (+?s=TCS), /platforms/mobile, /developers/docs, /trade/basket-gtt, /trade/algo-marketplace | 200, expected markers present, no server errors |
| Company (0.7.8) | /status, /company/{policies,security,press,newsletter,careers/roles,governance,csr}, /contact?kind=media, /.well-known/security.txt, /trust, /about | 200, expected markers present, no server errors |

### Live verification after each cache-cleared Netlify deploy (curl, HTTP 200)
- 0.7.5: /academy/glossary, /academy/tracks, two lesson pages, /learn/regulations, /academy, /.
- 0.7.6: /open-account/guide, /contact/callback, /company/{service-network,referral,loyalty}, /pricing/industry-comparison, /contact, /.
- 0.7.7: /platforms/terminal-demo (+?s=TCS), /platforms/mobile, /developers/docs, /trade/{basket-gtt,algo-marketplace}, /platforms, /developers.
- 0.7.8: see CHANGELOG; verified the same way (recorded in the deploy log of the session).

### Not executed
- Browser-level interaction tests of the demo ticket, lesson quizzes, callback and talent-pool forms (manual only). The forms reuse `submit_enquiry`, whose validation E2E ran in 0.6.8.

## Releases 0.8.0–0.8.5 — 2026-10-11
### Static and unit (before each of the six commits)
- `npx tsc --noEmit`: pass · `npm run lint`: 0 errors · `npx vitest run`: 62 passed · `npm run build`: pass.

### Local production render (next start, curl, content grep)
- /markets/heatmap (NIFTY 50: 98 SVG rects; NIFTY BANK: 35; NIFTY IT: 34), /markets/option-chain, /markets/watchlist, /api/quotes, /markets/RELIANCE (Watch star), /pricing/explainer, /platforms/order-passport: all 200 with expected markers.

### MFA end-to-end (Node script against sandbox Auth + local production server; demo client account; factor removed afterwards)
| Step | Expected | Observed |
|---|---|---|
| Password sign-in, no factor | AAL aal1/aal1; /app 200 | ✅ |
| Enrol TOTP, verify code | AAL aal2/aal2 | ✅ (QR data-url, otpauth URI) |
| Fresh password sign-in with factor enrolled, GET /app | 307 → /auth/mfa?next=/app | ✅ (after fix: first run returned 200 because supabase-js read factors from the cached session) |
| GET /auth/mfa with that session | 200 challenge page | ✅ |
| Verify code at sign-in, GET /app and /app/settings/security | 200 | ✅ |
| Wrong code | rejected | ✅ |
| Unenrol with AAL2 session; list factors | ok; 0 | ✅ |
| Global sign-out | ok | ✅ |

### Live verification after each cache-cleared deploy
- 0.8.0–0.8.4: new routes 200 (heatmap, option-chain, watchlist, quotes API, explainer, order-passport).
