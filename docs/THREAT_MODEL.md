# THREAT_MODEL.md (STRIDE, sandbox phase)

| Threat | Vector | Control today | Gap |
|---|---|---|---|
| Spoofing | Credential stuffing, session theft | Supabase Auth, HTTP-only cookies, HSTS | MFA/passkeys, device binding, anomaly detection |
| Tampering (orders/ledger) | Client manipulates order payload or balances | Server-side RPC only; RLS; revoked table writes; balanced-journal check; terminal-state guard | Per-account limits; field-level encryption |
| Tampering (privilege) | Client sets own role | RLS `with check role = current_app_role()`; `set_user_role` super_admin only | Access reviews |
| Repudiation | "I never placed that order" | `order_events` journal, `audit_events` with actor/role/correlation id, consents with hashes | Tamper-evident hashing chain, external log sink |
| Information disclosure | Cross-tenant reads | RLS per table; `account_funds` ownership check; internal functions revoked | Column masking for PAN in staff views (currently masked in UI only) |
| Information disclosure (AI) | Prompt leaks private data | LIVE receives no ledger/identity data; context limited to public simulated quote | Output filtering, DLP |
| Denial of service | API flood, tick storms | `sim_tick` throttle (3s), pg_cron cadence | Rate limiting, WAF, bot mitigation |
| Elevation of privilege | Calling internal RPCs | EXECUTE revoked from anon/authenticated (0004) | Periodic advisor scan in CI |
| Prompt injection | Instructions inside user text/page | No tools; system prompt treats content as data | Eval suite |
| Supply chain | Malicious dependency | Lockfile committed | SBOM, audit in CI |
| Insider misuse | Staff approves own payout | Maker-checker enforced in SQL | Dual control for role changes, access reviews |
| Market-data poisoning | Bad feed values | Band clamp in `sim_tick`; labels | Vendor validation, gap/sequence checks |

Failure scenarios from directive §58 covered now: duplicate order submission (idempotency), insufficient margin, price outside band, kill switch, market closed, cancellation of filled order (terminal guard), EOD with open orders. Not yet exercised: exchange disconnect, lost ack, partial fills from venue, DB failover, clock drift, stale caches.
