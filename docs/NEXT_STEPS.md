# NEXT_STEPS.md

## Owner actions (cannot be done by code)
1. **Rotate the Anthropic and Sarvam API keys** that were pasted into the shared Word document, then update Netlify env vars and `.env.local`.
2. Decide on Supabase Auth email confirmation (Authentication → Providers → Email) for the sandbox; set the Site URL and redirect URL to the Netlify domain so confirmation links work.
3. Sign up on the deployed site with the bootstrap admin email to receive `super_admin`.
4. Engage counsel/compliance to begin verifying the regulatory register and legal drafts.

## Engineering backlog (ordered)
1. Supabase Realtime subscription for `quotes` in the client app; stale-data warnings.
2. Per-account risk limits + daily loss enforcement; position-value limit; order throttling.
3. Property-based tests for ledger and position math; contract tests for RPC signatures.
4. MFA for staff; CSP with nonces; API rate limiting.
5. Chart indicators (EMA/SMA/RSI/VWAP), drawing tools, intraday timeframes from 1m candles.
6. Watchlist folders/columns/alerts; basket orders; GTT.
7. Source-backed competitor matrix and regulatory verification (REQ-0004, REG-*).
8. Remaining 17 themes + Theme Studio.
9. Developer sandbox API keys and docs (REQ-0101).
10. Tax desk foundations (date-effective rates, capital-gains classification).
