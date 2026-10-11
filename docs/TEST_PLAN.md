# TEST_PLAN.md

| Layer | What | How | Status |
|---|---|---|---|
| Unit | Calculators (charges, SIP, lumpsum, CAGR, sizing, R:R, margin, inflation, average) | `npm test` (vitest) | 17 cases passing |
| Static | TypeScript strict, ESLint (React compiler rules) | `npm run typecheck`, `npm run lint` | passing |
| Build | Next.js production build (Turbopack) | `npm run build` | passing |
| Engine E2E | KYC → deposit → MARKET fill → idempotent replay → resting LIMIT → CNC sell → oversell reject → oversize reject → tick-size reject → MIS short → cancel → funds/holdings/positions/journal balance | SQL block against the live sandbox DB with transaction-scoped JWT claims | see TEST_RESULTS.md |
| Security | Supabase advisors (RLS, search_path, definer exposure) | MCP `get_advisors` after each migration | 0004 resolves function exposure |
| Manual UI | Home, markets, instrument, calculators, sign-up, onboarding, order ticket, orders passport, admin screens | Browser pass on the deployed site | performed on deploy |
| Failure scenarios (§58) | Duplicate submission, insufficient margin, price band, kill switch, closed market, cancel after fill, EOD with open orders | SQL E2E + admin kill switch | partially covered |

## Not yet covered
Load/stress, soak, failover, DR, accessibility automation (axe), visual regression, mobile device matrix, contract tests for RPC signatures, property-based ledger tests, Sarvam vendor call, email confirmation flow end-to-end.
