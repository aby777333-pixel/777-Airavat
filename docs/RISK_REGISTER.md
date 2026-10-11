# RISK_REGISTER.md

| ID | Risk | Likelihood | Impact | Mitigation / owner | Status |
|---|---|---|---|---|---|
| RSK-01 | Users mistake simulated data for live prices | Medium | High | SIMULATED labels on every surface, banner, legal drafts | Mitigated (sandbox) |
| RSK-02 | Regulatory claims implied by UI | Low | High | Trust Centre shows "Not obtained" for every registration; no badges | Mitigated |
| RSK-03 | API keys leaked via the shared spec document | High | High | Keys never committed; `.docx` ignored; **rotate keys** | Open — action for owner |
| RSK-04 | Illustrative statutory rates used as fact | Medium | Medium | Flagged in UI, schedules versioned | Open until verified |
| RSK-05 | Email confirmation blocks first login | Medium | Low | Sign-up explains; callback route; admin can review | Open — confirm auth settings |
| RSK-06 | pg_cron tick stops | Low | Medium | Control Tower feed-health badge; `/api/health` | Monitored |
| RSK-07 | Order engine bug corrupts ledger | Low | High | Balanced-journal enforcement; reconciliation report; E2E tests | Mitigated; add property tests |
| RSK-08 | Scope creep vs. honest status | High | Medium | Requirements register with strict statuses | Ongoing |
| RSK-09 | No MFA on staff accounts | High | High | Backlog REQ: MFA for staff before any non-sandbox data | Open |
| RSK-10 | Single-region Supabase, no DR | Medium | High | Document RTO/RPO; backups; DR drill before live | Open |
