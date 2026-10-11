# DEMO_LOGIN_VERIFICATION.md

Demo environment: the production sandbox at https://777-airavat.netlify.app (Supabase project `nscoslbooxtndhxlnyyv`). There is no separate demo database; demo accounts live beside the sandbox fixtures and carry the `.demo@airavat.sandbox` suffix.

**Credentials are not in this repository.** They live only in `demo/DEMO_ACCESS_MANIFEST.local.md` and `demo/demo-accounts.local.json` on the operator's machine (both git-ignored). Rotate them by re-running the seed with new passwords; nothing in the app depends on their values.

## Accounts (12 roles)
| Role | Email | Entry point | Seeded state |
|---|---|---|---|
| super_admin | superadmin.demo@airavat.sandbox | /admin | full Broker Core |
| admin | admin.demo@airavat.sandbox | /admin | approved the demo waiver and the demo article |
| compliance | compliance.demo@airavat.sandbox | /admin | approved the demo offer; KYC reviewer |
| risk | risk.demo@airavat.sandbox | /admin/risk | risk limits, kill switch |
| ops | ops.demo@airavat.sandbox | /admin | created the demo partner payout |
| finance | finance.demo@airavat.sandbox | /admin/revenue | created offer + waiver; approved the payout |
| dealer | dealer.demo@airavat.sandbox | /admin/orders | read-only desk views |
| editor | editor.demo@airavat.sandbox | /admin/editorial | authored and published the demo article |
| sales | sales.demo@airavat.sandbox | /admin/partners | assigned the demo lead |
| partner | partner.demo@airavat.sandbox | /app/partner | partner "Demo Introducer Services", code DEMO777, active, plan INTRO_FIXED_500, one activation accrual paid |
| client | client1.demo@airavat.sandbox | /app | referred by DEMO777; KYC approved; ₹5,00,000 simulated; 4 filled orders; research case; shadow portfolio; Sentinel prefs; enrolled in WELCOME50 |
| client | client2.demo@airavat.sandbox | /app/onboarding | fresh login, shows the KYC journey |

## Verification method
`python -I demo/verify-logins.py` signs in each account with the Supabase password grant using the public anon key, then reads its own `profiles.role` through PostgREST (RLS applies) and compares it with the expected role. Passwords are never printed.

## Result (2026-10-11)
```
12/12 accounts verified — every account signed in and returned the expected role.
```
The seeded client journey (KYC → funds → orders → research → shadow → promo), partner accrual/payout and the editorial workflow were executed through the real database functions under each role's JWT claims (see TEST_RESULTS.md, "Phase 2 E2E").
