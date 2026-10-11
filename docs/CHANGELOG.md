# CHANGELOG.md

## 0.1.0 — 2026-10-11 — Sandbox foundation
- Repository created (Next.js 16, TypeScript, Tailwind 4, vitest, ESLint).
- Supabase schema: 32 tables, 30 functions, RLS, pg_cron simulated tick, hardening (migrations 0001–0004).
- Public website: cinematic home, platforms, pricing, markets (+instrument chart), calculators (tested), academy, trust centre, legal drafts, about, contact.
- Client app: sign-up/login, onboarding wizard, market watch + watchlist, order ticket with RMS preview, orders + ClearView passport, positions, holdings, portfolio, funds (simulated deposit, withdrawal request), ledger, consent vault, support, notifications, settings.
- Broker Core: control tower, clients & roles, KYC queue, orders, trades, payouts (maker-checker), ledger & reconciliation, risk limits + kill switch, settlement, support desk, audit log, AI operations, regulatory and requirements registers, system settings.
- AI: AIRAVAT LIVE gateway (Anthropic, no tools, logged) and BHASHA translation route (Sarvam).
- Docs: full control-file set in `docs/`.
- Deployed to Netlify.
