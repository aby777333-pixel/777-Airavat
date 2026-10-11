# SECURITY_MODEL.md

## Identity and sessions
- Supabase Auth (email + password, min 10 chars). Sessions are HTTP-only cookies refreshed in `src/proxy.ts`. Protected areas (`/app`, `/admin`) redirect unauthenticated users at the edge **and** re-check in server components.
- Roles: `client, dealer, ops, risk, compliance, admin, super_admin` stored in `profiles.role`. Clients cannot change their own role (RLS `with check`). Only `super_admin` may change roles via `set_user_role()` (audited; cannot target self).
- Bootstrap: emails in `app_settings.bootstrap_admin_emails` become `super_admin` on first sign-up.

## Authorization
- Row Level Security on every table. Own-row policies for client data; `is_staff()` for staff reads; registers writable by staff.
- Financial tables have INSERT/UPDATE/DELETE revoked from `anon` and `authenticated`. All mutations go through `security definer` functions with explicit role checks (`current_app_role()`), `search_path = public`.
- Internal engine functions are not executable from the API (migration 0004). Internal-only functions: `audit`, `post_journal`, `order_transition`, `apply_fill`, `approve_kyc_internal`, `sim_tick`, `sim_seed_history`, `account_ledger_balance`, `handle_new_user`.
- `account_funds()` verifies ownership or staff role.

## Segregation of duties
- Withdrawal approval: approver must differ from requester (`MAKER_CHECKER_VIOLATION`). Clients request; ops/admin/super_admin approve.
- KYC: compliance/ops/admin/super_admin review. Sandbox auto-approval is a documented policy flag and writes an explicit audit note.
- Risk limits and kill switch: risk/admin/super_admin.
- Live trading flag: refused by `update_app_setting` regardless of role.

## Secrets
- Anthropic and Sarvam keys live only in server env (`.env.local`, Netlify env with secret scope). No `NEXT_PUBLIC_` secrets. The Supabase anon key is public by design.
- The source `.docx` and `.env*` are git-ignored. The keys that appeared in the shared document should be rotated.

## Transport and headers
- HSTS, X-Frame-Options DENY, nosniff, referrer policy, permissions policy set in `next.config.ts`. CSP is a backlog item (needs nonce plumbing for Next inline scripts).

## AI safety
- AIRAVAT LIVE: no tools, no order capability, narrow explicit context (surface + symbol + session), system prompt forbids advice/licence claims, user content treated as data. Interactions logged as metadata only. Provider failure never affects trading paths.

## Not implemented (tracked)
MFA, passkeys, device binding, session revocation UI, CSP, WAF, rate limiting on API routes, SIEM, dependency/SBOM scanning in CI, penetration testing, backup/restore drills, DR.
