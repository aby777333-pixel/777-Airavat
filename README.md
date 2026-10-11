# AIRAVAT

Independent Indian securities brokerage technology platform. **Status: sandbox foundation.** Simulated market data, simulated funds, no exchange / bank / depository connectivity, no regulatory registrations. Nothing here is a claim of authorization.

- Public site, client app and Broker Core admin: Next.js 16 (App Router, TypeScript, Tailwind v4)
- Authoritative backend: Supabase Postgres (`supabase/migrations`) with RLS, security-definer engine functions, pg_cron tick
- AI: AIRAVAT LIVE via a server-side Anthropic gateway; AIRAVAT BHASHA via Sarvam (translation)
- Hosting: Netlify (OpenNext adapter)

## First milestone (working)
Client opens a sandbox account → receives simulated funds → sees labelled simulated quotes → places an order → RMS validates → simulated exchange fills → position & P&L update → every rupee is reconciled in the double-entry ledger and visible in the back office.

## Run locally
```bash
cp .env.example .env.local   # fill values
npm install
npm run dev
```
`npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

## Control files
See `docs/` for the master requirements register, architecture, database design, API contracts, security and threat models, regulatory register, test plan and results, decisions, known limitations and next steps. The original master prompt (credentials removed) is in `docs/spec/MASTER_PROMPT.txt`.

## Bootstrap admin
The email listed in `app_settings.bootstrap_admin_emails` receives the `super_admin` role on first sign-up. Other roles are assigned from Broker Core → Clients & roles (audited).

## Never
- Commit secrets. `.env*` is ignored; the spec `.docx` is ignored because it contained keys.
- Present sandbox data as live. Every quote is labelled SIMULATED.
- Toggle live trading. `live_trading_enabled` is a hard gate that refuses changes from settings.
