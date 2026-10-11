# MASTER_REQUIREMENTS.md

The authoritative register lives in the `requirements` table (Broker Core → Requirements register) so statuses can be updated with an audit trail. This file is the human-readable snapshot as of the Phase 1 completion (2026-10-11).

Allowed statuses: Not started · Researching · Designed · In development · Implemented · Tested · Blocked · Externally dependent · Certified · Production ready. **Implemented ≠ production ready.**

| ID | Requirement | Module | Status | Notes |
|---|---|---|---|---|
| REQ-0001 | Project isolation (repo, DB, auth, secrets) | Foundation | Implemented | GitHub `aby777333-pixel/777-Airavat`, Supabase `nscoslbooxtndhxlnyyv`, Netlify `777-airavat` |
| REQ-0002 | Master requirements register with IDs/statuses | Governance | Implemented | table + admin UI + this file |
| REQ-0003 | Regulatory obligation register | Compliance | Implemented | 14 entries, all `verified=false` |
| REQ-0004 | Source-backed competitor feature matrix | Research | Researching | method in COMPETITOR_RESEARCH.md; no live web audit performed in this session |
| REQ-0010 | Cinematic homepage | Website | Implemented | Midnight Sovereign, glass, reduced-motion safe |
| REQ-0011 | Pricing, platforms, trust centre, legal, about, contact, academy | Website | Implemented | only sandbox facts; no registrations claimed |
| REQ-0012 | Calculators with unit tests | Website | Tested | 17 vitest cases pass |
| REQ-0013 | Public simulated market pages with labels | Website | Implemented | ticker, overview, breadth, sector heatmap, instrument page + chart |
| REQ-0020 | Authentication with secure cookies | Identity | Implemented | Supabase Auth + @supabase/ssr; MFA/passkeys not started |
| REQ-0021 | Roles + RLS | Identity | Implemented | 7 roles; RLS on 32 tables; SQL-side checks |
| REQ-0030 | Onboarding wizard (PAN/DOB/address/nominee/declarations) | Onboarding | Implemented | no KRA/CKYC/DigiLocker/eSign/IPV (external) |
| REQ-0031 | KYC review queue, approve/reject, audit | Onboarding | Implemented | sandbox auto-approval flag documented |
| REQ-0040 | Instrument master | Market data | Implemented | 52 NSE symbols, ISIN/lot/tick/band, 2 indices |
| REQ-0041 | Simulated market engine, session-aware | Market data | Implemented | `sim_tick()` via pg_cron every minute |
| REQ-0042 | Historical candles + charting | Market data | Implemented | 260-day synthetic daily history, 1-minute live candles |
| REQ-0043 | Licensed feed adapters | Market data | Externally dependent | adapter boundary: replace `quotes`/`candles` writers |
| REQ-0050 | OMS intake, idempotency, state machine, journal | OMS | Tested | E2E SQL test in TEST_RESULTS.md |
| REQ-0051 | RMS fail-closed checks | RMS | Tested | funds, holdings, band, tick, lot, qty, value, kill switch, session |
| REQ-0052 | Simulated exchange adapter | Exchange | Implemented | MARKET immediate, LIMIT/SL/SL-M rest and match on tick |
| REQ-0053 | Positions, holdings, P&L | Portfolio | Implemented | weighted avg; MTM to simulated LTP |
| REQ-0060 | Double-entry ledger, balanced enforcement | Finance | Tested | `post_journal` raises on imbalance |
| REQ-0061 | Simulated deposits; withdrawals with maker-checker | Funds | Implemented | requester ≠ approver enforced in SQL |
| REQ-0062 | Versioned charges engine | Finance | Implemented | illustrative rates flagged |
| REQ-0063 | EOD settlement run | Settlement | Implemented | expires open orders, squares MIS |
| REQ-0064 | Trial balance + reconciliation report | Back office | Implemented | admin Ledger page, Control Tower |
| REQ-0070 | Audit log | Audit | Implemented | append-only, staff read only |
| REQ-0071 | Consent vault | Legal | Implemented | version + hash + timestamp; drafts flagged |
| REQ-0080 | Broker Core admin console | Admin | Implemented | 15 screens, role-gated |
| REQ-0081 | Risk limits + kill switch | Admin | Implemented | audited before/after |
| REQ-0090 | AIRAVAT LIVE via Anthropic gateway | Intelligence | Implemented | no order tools; interactions logged; verified live call |
| REQ-0091 | AIRAVAT BHASHA via Sarvam | Intelligence | Implemented | translation route; untested against vendor in this session |
| REQ-0092 | AI operations console | Intelligence | Designed | metadata view shipped; prompt/model registry pending |
| REQ-0100 | Options chain, Greeks, strategy builder | Derivatives | Not started | |
| REQ-0101 | Algo Studio, backtesting, paper trading | Algo | Not started | |
| REQ-0102 | Mutual funds, IPO, bonds | Investment products | Not started | |
| REQ-0103 | Android/iOS apps | Mobile | Not started | responsive web only |
| REQ-0104 | Growth Command | Growth | Not started | |
| REQ-0105 | Regulatory Fortress | Compliance | Designed | audit_events is the seed |
| REQ-0106 | 22-palette theme system + Theme Studio | Design | In development | 5 themes shipped |
| REQ-0110 | Exchange certification, security assessment, DR drills | Launch | Externally dependent | |
| REQ-0111 | Live trading enablement gate | Launch | Blocked | hard-coded refusal in `update_app_setting` |

Everything in the master prompt not listed above (PRO terminal, dealer, institutional, developer APIs, research ONE, Sentinel, voice, gesture, mobile, CRM, partner network, Regulatory Fortress modules, etc.) is **Not started** and is tracked in FEATURE_MATRIX.md by directive section so nothing is silently omitted.

## Phase 2 requirements (added 2026-10-11; mirrored in the `requirements` table)
| REQ | Title | Module | Status | Notes |
|---|---|---|---|---|
| REQ-0201 | RevenueOS versioned fee catalogue with maker-checker | RevenueOS | Tested | compute_charges_v2 identical to legacy for the standard plan |
| REQ-0202 | Plans, waivers, offers, adjustments, subscriptions | RevenueOS | Tested | offer halved MIS brokerage 4.62 → 2.31; contra-income 4100 |
| REQ-0203 | Revenue intelligence | RevenueOS | Implemented | revenue_summary() |
| REQ-0204 | Partner network, commission plans, accruals, payouts | Partners | Tested | 500 gross / 50 TDS / 450 net paid |
| REQ-0205 | Partner Earnings & Eligibility Passport | Partners | Tested | four independent flags |
| REQ-0206 | CRM leads with consent and round-robin | Sales | Implemented | /api/leads |
| REQ-0207 | Market Access Matrix + Launch Console | Markets | Implemented | TRADING_ENABLE_GATE |
| REQ-0208 | Research-only commodity/currency instruments | Markets | Implemented | non-tradable |
| REQ-0209 | Scanner Matrix | Research | Tested | 10 system scanners, builder |
| REQ-0210 | Market Detective + AI Research Council | Research | Implemented | War Room |
| REQ-0211 | Strategy DNA backtesting, fingerprint, robustness | Quant | Tested | 10 unit tests |
| REQ-0212 | Shadow Portfolio isolation | Research | Tested | |
| REQ-0213 | Sentinel X | Risk | Tested | cron fixed in 0013 |
| REQ-0214 | AIRAVAT DAILY CMS | Editorial | Tested | demo article via full workflow |
| REQ-0215 | AI editorial copilot | Editorial | Implemented | review_required |
| REQ-0216 | Command Everywhere | UX | Implemented | |
| REQ-0217 | Living Product Showroom | Website | In development | captures pending |
| REQ-0218 | Daily Briefing / Morning Intelligence | Website | Implemented | |
| REQ-0219 | Materialverse | Design | Implemented | 15/22 palettes |
| REQ-0220 | Project Majesty intro and heroes | Website | Implemented | |
| REQ-0221 | Demo environment, verified logins | Operations | Tested | 12/12 |
| REQ-0222 | Partner programme page + lead capture | Website | Implemented | |
| REQ-0223 | Signup referral attribution | Partners | Tested | |
| REQ-0224 | Replay, visual builder, Evidence Graph, Digital Twin, MRI | Research | Designed | licensed data needed |
| REQ-0225 | Employees, HR, incentives, dealer allocation | Sales | Designed | |
| REQ-0226 | Complete published charge schedule (all segments, other charges, AMC/BSDA) aligned to market reference | RevenueOS | Tested | /pricing, charges-schedule.ts, migration 0015 |

## Release 0.3.0–0.4.0 requirements (added 2026-10-11; mirrored in the `requirements` table)
| ID | Requirement | Module | Status | Evidence |
|---|---|---|---|---|
| REQ-0227 | Website CMS: pages, menus, heroes, FAQs, media, settings, approvals, versions, scheduling, audit | Website | Tested | migration 0021; /admin/website; E2E: draft→review→approve (other user)→publish; maker-checker on menus |
| REQ-0228 | Project Navigator: 8 mega-menu groups, utility nav, keyword-rich pages, SEO metadata, JSON-LD, sitemap, breadcrumbs | Website | Implemented | src/lib/navigation.ts, src/content/*, sitemap.ts; CMS override per path |
| REQ-0229 | Unique hero animations per page | Design | Implemented | PageHero + HeroFx variants (materialverse.css fx-* keyframes) |
| REQ-0230 | Entity onboarding: individual/NRI/HUF/company/partnership/LLP/trust with document requirements | Onboarding | Tested | migration 0022/0025; E2E company + NRI approved; minor and unknown entity rejected |
| REQ-0231 | Verification adapters: PAN, CKYC, KRA, DigiLocker, Aadhaar offline, bank, IPV, eSign, FATCA/CRS, nomination, income proof, UCC, demat | Onboarding | Implemented | simulated adapters record provider, reference and production blocker; /app/kyc and admin badges |
| REQ-0232 | Re-KYC, dormancy and reactivation | Onboarding | Implemented | request_rekyc, mark_dormant_accounts (cron 01:30), reactivate_account |
| REQ-0233 | Advanced charting: indicators, chart types, drawings, replay, templates, trade annotations, chart-to-order | Trading | Tested | src/lib/indicators.ts (9 tests), AdvancedChart on instrument page and Terminal X |
| REQ-0234 | Market-data extras: delivery %, announcements, insider, shareholding, bulk/block deals, institutional flows | Markets | Implemented | migration 0023 (simulated samples); /markets/announcements, /markets/deals |
| REQ-0235 | Portfolio: XIRR, benchmark comparison, dividends, snapshots | Portfolio | Tested | migration 0024; /app/portfolio; snapshot job 16:05 IST |
| REQ-0236 | Tax P&L (FIFO STCG/LTCG/intraday), contract notes, CSV statements | Portfolio | Tested | capital_gains, contract_note, /app/reports, /api/statements/* |
| REQ-0237 | Pledge/unpledge, collateral valuation with haircut | Portfolio | Tested | pledge_holdings/unpledge_holdings; pledged qty leaves free holdings; not yet usable as margin (no F&O) |
| REQ-0238 | Margin Trading Facility: funding book, daily interest to ledger, agreement consent gate, repayment | Portfolio | Tested | mtf_convert/mtf_close/accrue_mtf_interest; ledger 1300/4300; journal balanced |
| REQ-0239 | Family / authorised read-only portfolio views | Portfolio | Tested | grant/revoke_portfolio_view, family_portfolio; FORBIDDEN after revoke verified |
| REQ-0240 | Public independence: no third-party broker named on public surfaces | Website | Tested | grep of src/ shows none; pricing cites AIRAVAT schedule |

Status of remaining Independence directive items (honest): back office settlement obligations/margin shortfall/refund exceptions (Designed: payouts maker-checker and settlement page exist; T+1 obligations not modelled), independent RMS per-account limits and stress tests (Designed: global limits enforced), options backtesting and futures rollover (Designed), PWA manifest/service worker (Designed), FIX connectivity (Blocked: no counterparty; documented in API_SPECIFICATIONS.md).

## Release 0.5.0 requirements (added 2026-10-11; mirrored in the `requirements` table)
| ID | Requirement | Module | Status | Evidence |
|---|---|---|---|---|
| REQ-0241 | Back office: T+1 settlement obligations generated from trades and settled by cycle | Back office | Tested | migration 0026; run_settlement_cycle; /admin/backoffice |
| REQ-0242 | Margin shortfall detection, margin calls and resolution | Back office | Tested | detect_margin_shortfalls (hourly), call/resolve RPCs; client notification |
| REQ-0243 | Exceptions and refunds with maker-checker posting to the ledger | Back office | Tested | raise/decide_backoffice_exception; refund journal Dr 4000 / Cr client; journal balanced |
| REQ-0244 | Independent RMS: per-account limits enforced in place_order, fat-finger guards, exposure and daily-loss limits | RMS | Tested | set_account_risk_limits; rejection codes ACCOUNT_*, FAT_FINGER_*, MAX_POSITION_VALUE_EXCEEDED, DAILY_LOSS_LIMIT_BREACHED |
| REQ-0245 | Real-time MTM scan with auto-block, surveillance flags, stress test | RMS | Tested | rms_mtm_scan (*/5 market hours), run_surveillance, stress_test; /admin/rms, /app/risk |
| REQ-0246 | PWA: manifest, icons, service worker with no caching of account or market data, install prompt | Platform | Implemented | src/app/manifest.ts, public/sw.js, PwaRegister |

Remaining after 0.5.0: options backtesting and futures rollover (Designed), native mobile apps (Designed), FIX connectivity (Blocked), vendor KYC/exchange/depository/lender rails (Blocked).
