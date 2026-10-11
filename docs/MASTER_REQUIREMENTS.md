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
