# DECISIONS.md — Architecture Decision Records

## ADR-001 Single Next.js application with route groups (not a monorepo yet)
Context: the directive suggests apps/packages/services. Decision: ship one Next.js 16 app with `(public)`, `app`, `admin`, `api` route groups and `src/lib` modules, deployable on Netlify in one unit. Consequence: faster first milestone; split into packages when a second deployable (mobile, pro terminal, workers) exists.

## ADR-002 Postgres functions are the execution core
Decision: OMS, RMS, ledger, settlement and onboarding are `security definer` PL/pgSQL functions in Supabase; Next.js server actions only call RPCs. Rationale: transactional atomicity, one authoritative state, RLS-compatible, no service-role key in the web tier. Trade-off: PL/pgSQL is harder to unit-test than TypeScript; mitigated by SQL E2E blocks and future contract tests. Replaceable later by a Rust/Java execution core behind the same tables.

## ADR-003 Simulated market engine in-database with pg_cron
Decision: `sim_tick()` random-walks quotes each minute, clamped to price bands, session-aware with a sandbox extended-hours flag. Rationale: no vendor licence exists; the directive requires an exchange simulator. Every surface labels data SIMULATED.

## ADR-004 Sandbox auto-approval of KYC as an explicit policy flag
Decision: `app_settings.sandbox_auto_approve_kyc` (default true) approves applications with an audited note; set false to exercise the manual queue. Rationale: demonstrable milestone without pretending KRA/CKYC exists.

## ADR-005 Money as numeric, immutable journal
Decision: `numeric(18,2)` money, `numeric(18,4)` prices, `post_journal()` enforces balance; corrections via reversal entries. Rationale: directive §56.

## ADR-006 AI assistant has no tools
Decision: AIRAVAT LIVE is explanation-only; context is explicit and narrow; interactions logged as metadata. Rationale: directive §38 and AI safety parts; avoids any pathway from LLM output to order placement.

## ADR-007 Live trading gate is code, not config
Decision: `update_app_setting` refuses `live_trading_enabled`; `trading_accounts.environment='live'` is never created. Rationale: no regulatory approvals exist.

## ADR-008 Hosting on Netlify with the OpenNext adapter
Decision: `netlify.toml` with `next build`; env vars set in Netlify with secret scope. Rationale: user requirement.

## ADR-009 Default theme Midnight Sovereign; 5 themes now, 22 later
Decision: CSS variable themes switched with `data-theme`, persisted locally and in `profiles.theme`.
