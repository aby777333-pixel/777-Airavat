# DEPLOYMENT_CHECKLIST.md

## Environments
- **Database**: Supabase `nscoslbooxtndhxlnyyv`. Apply migrations in order from `supabase/migrations/` (via Supabase MCP `apply_migration` or `supabase db push`). After DDL, run security advisors.
- **Web**: Netlify site `777-airavat`, build `npm run build`, publish `.next`, Node 24.

## Netlify environment variables
| Key | Scope | Secret |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | all | no |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | all | no (public key) |
| ANTHROPIC_API_KEY | builds + functions/runtime | yes |
| SARVAM_API_KEY | builds + functions/runtime | yes |
| AIRAVAT_ENV | all | no (`sandbox`) |
| AIRAVAT_LIVE_MODEL | optional | no (default claude-sonnet-5-5) |
| NEXT_PUBLIC_SITE_URL | all | no |

Env changes require a redeploy.

## Pre-deploy gates
- [ ] `npm run typecheck && npm run lint && npm test && npm run build`
- [ ] Migrations applied; advisors clean of ERROR level
- [ ] No secrets in git (`git grep -n "sk-ant\|sk_" -- . ':!docs/DEPLOYMENT_CHECKLIST.md'` returns nothing)
- [ ] `/api/health` returns `status: ok`, `live_trading: false`
- [ ] Trust Centre still shows all registrations as not obtained (until they are)

## Deploy
```bash
netlify deploy --build --prod
```
Or connect the GitHub repo in the Netlify UI for CI deploys.

## Post-deploy
- [ ] Open `/`, `/markets`, `/calculators`, `/signup`, `/login`, `/app`, `/admin`
- [ ] Supabase Auth → URL configuration: Site URL and `https://<site>/auth/callback` redirect
- [ ] Check Control Tower feed health; confirm pg_cron job active
