# PRODUCTION_READINESS.md

**Verdict: NOT production ready. Sandbox only.** This is by design and by regulation.

| Readiness dimension | State |
|---|---|
| Software development readiness (sandbox milestone) | Achieved: end-to-end simulated brokerage works and is tested |
| Internal testing readiness | Partial: unit + engine E2E; no load/failover/DR |
| Regulatory approval readiness | None: no registrations, memberships or licences |
| Exchange integration readiness | None: simulator only; no certification |
| Market-data licensing | None: synthetic data |
| Security assurance | Partial: RLS, SQL-side authz, hardened functions; no MFA, pen test, CSP, WAF |
| Operational readiness | Partial: health endpoint, Control Tower, audit; no on-call, runbooks, backups verified |
| Legal | Drafts only; counsel review outstanding |
| Customer production readiness | Blocked |

Live trading remains disabled by a code-level gate until every dimension above is evidenced and signed off.
