# AIRAVAT — working rules for Claude Code

- This is a regulated-financial-technology codebase in **sandbox** state. Never fabricate exchange connectivity, licences, market data or test results. Label simulation everywhere.
- Money: numeric in Postgres, never float. Ledger corrections are reversal entries, never updates to posted lines.
- All financial state changes go through security-definer functions in `supabase/migrations`. The browser and Next.js server are never the source of truth; server actions only call RPCs.
- Internal engine functions (`apply_fill`, `post_journal`, `order_transition`, `sim_tick`, ...) must stay non-executable by `anon`/`authenticated` (see migration 0004).
- Every sensitive action must call `audit(...)`.
- Staff authorization is enforced in SQL (`current_app_role()`), not only in the UI.
- AIRAVAT LIVE has no order tools. Keep it that way unless a separately authorized workflow exists.
- Keep the Master Requirements Register (`docs/MASTER_REQUIREMENTS.md` + `requirements` table) honest after every phase.
- Commands: `npm run typecheck && npm run lint && npm test && npm run build` before committing.
- Deploy: Netlify site `777-airavat` (see `docs/DEPLOYMENT_CHECKLIST.md`). Supabase project ref `nscoslbooxtndhxlnyyv`.
