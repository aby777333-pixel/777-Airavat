# IMPLEMENTATION_PLAN.md

Phases follow the master directive §59. Dates are absolute; the session that produced this plan ran on 2026-10-11.

| Phase | Scope | Status | Evidence |
|---|---|---|---|
| 0 Discovery & planning | Repo inspection, requirements matrix, registers, ADRs | Done (research partially pending) | docs/, requirements table |
| 1 Repository & infrastructure | Next.js 16 repo, lint/type/test, Supabase schema, pg_cron, Netlify | Done | build/lint/test green; deploy |
| 2 Design system & app shells | Tokens, 5 themes, glass system, public/app/admin shells | Done (5 of 22 themes) | globals.css, layouts |
| 3 Identity & onboarding | Auth, roles, RLS, KYC wizard + queue, audit | Done (sandbox) | migrations 0001/0004 |
| 4 Market data & instruments | Instrument master, synthetic feed, candles, charts | Done (simulated) | sim_tick, Chart |
| 5 OMS & RMS | Order lifecycle, risk checks, simulated exchange, recovery semantics | Done (sandbox) + E2E SQL | TEST_RESULTS.md |
| 6 Client trading app | Market watch, ticket, orders, passport, positions, holdings, funds, ledger, portfolio | Done (web) | /app |
| 7 Finance & settlement | Ledger, charges, deposits/withdrawals, EOD run, reconciliation | Done (sandbox) | /admin/ledger |
| 8 Administration & compliance | Broker Core, registers, audit, support | Done (core screens) | /admin |
| 9 Advanced markets | F&O, commodities, IPO, MF, bonds | Not started | |
| 10 Intelligence & analytics | LIVE ✅, BHASHA ✅; Research ONE, Sentinel, quant | Partial | |
| 11 Certification & hardening | Security assessment, exchange certification, DR | Externally dependent | |
| 12 Controlled production launch | Requires every regulatory gate | Blocked | |
| 13 Expansion | Institutional, developer cloud, mobile | Not started | |

## Next sprint (proposed order)
1. Rotate leaked keys; confirm Supabase auth email settings; MFA for staff.
2. Source-backed competitor and regulatory research (REQ-0004, verify REG entries).
3. Real-time quote updates in the client app (Supabase Realtime on `quotes`).
4. Per-account risk limits, daily-loss enforcement, position-value limit.
5. Watchlist folders/columns, chart indicators, basket orders.
6. Remaining themes + Theme Studio; CSP.
7. Developer sandbox API (REQ-0101) and paper-trading competitions.
