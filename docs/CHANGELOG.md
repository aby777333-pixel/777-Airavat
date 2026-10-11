# CHANGELOG.md

## 0.2.0 — 2026-10-11 — RevenueOS, Partner OS, Research ONE, Sentinel X, AIRAVAT DAILY (additive)
- Database migrations 0006–0014: roles (finance, editor, sales, partner); RevenueOS (versioned fee catalogue, plans, waivers, offers, adjustments, subscriptions, approvals, revenue summary); partners/CRM (categories, commission plans, accruals, payouts, passport, referral attribution, leads); market access matrix + research-only MCX/CDS instruments; instrument metrics + scanners; research cases/evidence/findings; strategies + backtest runs; shadow portfolios; CMS (articles, revisions, transitions, newsletter, daily briefing); Sentinel (alerts, preferences, trade health, pre-mortem, decision twin, what-changed); fixes (internal funds access for cron, alias collisions, search_path pins).
- `apply_fill` now prices through `compute_charges_v2` (plan + waivers + offers) and posts contra-income for discounts; legacy `compute_charges` kept and verified identical.
- Public site: /daily, /daily/[slug], /briefing, /research, /markets/universe, /partners, /showroom; pricing page reads the live catalogue; homepage Morning Intelligence + Awakening intro; referral capture on signup.
- Client app: Scanner Matrix, Research cases + War Room, Strategy DNA (+ backtest engine `src/lib/backtest.ts`), Shadow Portfolio, Sentinel X, plan & offers, partner portal, Theme Studio, pre-mortem in order ticket, decision twin, what-changed digest.
- Broker Core: RevenueOS console, approvals queue, partners & CRM, editorial newsroom + article editor with AI copilot, market matrix console, Sentinel overview.
- Command Everywhere (Ctrl/Cmd+K) on every surface with LIVE hand-off; Materialverse palettes (15) and materials (12).
- Demo environment: 12 role accounts (credentials local only), login verification script, seeded journeys.
- Docs: AIRAVAT_MASTER_COMPLETION.md, SYSTEM_WIRING_MAP.md, DEMO_LOGIN_VERIFICATION.md, SHOWROOM_CAPTURE.md; control files updated.


## 0.1.0 — 2026-10-11 — Sandbox foundation
- Repository created (Next.js 16, TypeScript, Tailwind 4, vitest, ESLint).
- Supabase schema: 32 tables, 30 functions, RLS, pg_cron simulated tick, hardening (migrations 0001–0004).
- Public website: cinematic home, platforms, pricing, markets (+instrument chart), calculators (tested), academy, trust centre, legal drafts, about, contact.
- Client app: sign-up/login, onboarding wizard, market watch + watchlist, order ticket with RMS preview, orders + ClearView passport, positions, holdings, portfolio, funds (simulated deposit, withdrawal request), ledger, consent vault, support, notifications, settings.
- Broker Core: control tower, clients & roles, KYC queue, orders, trades, payouts (maker-checker), ledger & reconciliation, risk limits + kill switch, settlement, support desk, audit log, AI operations, regulatory and requirements registers, system settings.
- AI: AIRAVAT LIVE gateway (Anthropic, no tools, logged) and BHASHA translation route (Sarvam).
- Docs: full control-file set in `docs/`.
- Deployed to Netlify.
