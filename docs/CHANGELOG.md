# CHANGELOG.md

## 0.6.0 — 2026-10-11 — AIRAVAT House look, wider content
- New default theme `airavat-house` (Default: paper & night): paper body (#eaede5) with night chrome, hero and footer (#0c1116), TT Norms display face (Manrope stays for the other palettes), rectangular uppercase buttons with the off-white primary and emerald glow, white hairline panels, 3–8px radii, tracked uppercase table headers and eyebrows. Scoped `.on-night` token override gives night sections inside a light page. All 15 earlier palettes remain in Theme Studio.
- Content width: public pages and site components use a 1400px container (was 1280/1152). The app shell stays at 1600px.
- Theme storage key bumped to `airavat-theme-v2` so every visitor sees the new default until they choose another palette; saved profile default is now `airavat-house`.
- Fix: a stylesheet insertion split the opaque-menu rule; repaired and verified (menu panels, glass panels, theme tokens all resolve).
- Mega-menu and mobile-menu featured cards carry a distinct animation per group (sunrise, candlesticks, atlas, radar, abacus, constellation, ledger, timeline), reduced-motion aware.
- Home hero carries the Mumbai fintech skyline artwork behind the card and copy (web-optimised JPEG, gradient for legibility); the paper body and night sections carry a fine 12px/96px mesh.
- AIRAVAT LIVE is now labelled next to its orb ("AIRAVAT LIVE · Ask · BHASHA …") and reachable from the utility bar; the panel states that answers come from Anthropic Claude through the AIRAVAT gateway and are translated by BHASHA (Sarvam).
- Fix: /app/settings returned a server error because the theme registry was exported from a client module and read by a server page; the registry now lives in `src/lib/themes.ts`. Page heroes align with the content edges; related links deduplicated.

## 0.5.0 — 2026-10-11 — Back office, independent RMS, PWA, opaque menus
- Migration 0026 back office: `settlement_obligations` (T+1 pay-in/pay-out and securities per account per trading day, generated from the trade book, settled by the 18:30 IST cycle or on demand; a negative ledger on settlement day becomes a shortfall), `margin_shortfalls` (hourly detection in market hours, margin call with client notification, resolution), `backoffice_exceptions` (refund, charge dispute, reversal, reconciliation, other; raiser cannot decide; approved refunds post Dr 4000 brokerage / Cr client). Console `/admin/backoffice`; clients raise refund requests from `/app/risk`.
- Migration 0026 independent RMS: per-account `risk_limits` rows set by the risk desk (`set_account_risk_limits`) and enforced inside `place_order` (account max order value/qty, MIS switch, account block); fat-finger guards (limit price deviation from LTP, quantity versus day volume); exposure and daily-loss limits now enforced (global defaults, account override); `rms_mtm_scan` every 5 minutes in market hours records realised + unrealised MTM, warns at 80% and auto-blocks new orders at 100% of the daily loss limit (sentinel alert + notification + audit); `run_surveillance` flags order-to-trade ratio, excessive cancellations, repeated RMS rejections and rapid round trips; `stress_test` for owners and staff. Console `/admin/rms`; client page `/app/risk`.
- PWA: `manifest.webmanifest` (standalone, shortcuts, maskable icon), icon set, service worker `public/sw.js` (static shell only; API, app, admin and market routes are never cached; offline fallback page), install prompt component.
- UI: the mega-menu dropdown is now fully opaque (`.menu-panel`), fixing see-through menus reported on the Pricing menu.
- Verified: 31-step RMS/back-office E2E (rolled back) and fat-finger proof; typecheck, lint, 55 tests, build clean.

## 0.4.0 — 2026-10-11 — Website CMS, entity onboarding, portfolio & wealth, advanced charting, market-data extras
- Migration 0021 Website CMS: `site_pages` (versions, maker-checker transitions, scheduled publish via `publish_scheduled_site_pages` cron), `site_menus` (+versions, author cannot publish own menu), `site_heroes`, `site_faqs`, `site_media` (storage bucket `site-media`), `site_settings`; `/admin/website` console with editor and media upload; public catch-all route and header read published overrides (`src/lib/cms.ts`).
- Migration 0022 entity onboarding: 7 entity types (individual, NRI, HUF, company, partnership, LLP, trust) with per-entity document requirements; verification records for PAN, CKYC, KRA, DigiLocker, Aadhaar offline, bank penny-drop, IPV, eSign, FATCA/CRS, nomination, income proof, UCC and demat link (simulated adapters, each naming its production blocker); re-KYC, dormancy job (01:30 daily) and reactivation; `/app/kyc`; admin KYC queue shows verification badges. Migration 0025 limits the 18-year rule to natural persons (companies were wrongly rejected as minors; found by the entity E2E).
- Migration 0023 market-data extras: delivery percentage and market-stats job, corporate announcements, insider disclosures, shareholding patterns, bulk/block deals, institutional flows (SIMULATED SAMPLE rows); `/markets/announcements`, `/markets/deals`; market-access matrix rows for ETF, REIT/InvIT, MF, IPO, G-sec/T-bill/SDL, corporate bonds, SGB, SLB, MTF, pledge.
- Migration 0024 portfolio & wealth: daily `portfolio_snapshots` with NIFTY 50 benchmark (job 16:05 IST), FIFO `capital_gains` (STCG/LTCG/intraday, charges apportioned), `contract_note` per trading day, pledge/unpledge with 20% haircut and collateral summary, Margin Trading Facility book (`mtf_convert`/`mtf_close`, 50% funded, 18% p.a. accrued daily to ledger accounts 1300/4300, gated on the MTF agreement consent), family read-only views (`grant_portfolio_view`, `family_portfolio`), CSV statements route `/api/statements/{ledger,trades,holdings,capital-gains,pnl,contract-note}`; `/app/portfolio` (XIRR, benchmark, pledge, MTF, family), `/app/reports`, `/app/family/[owner]`.
- Advanced charting: `src/lib/indicators.ts` (aggregate, Heikin-Ashi, Renko, SMA/EMA/WMA, Bollinger, RSI, MACD, ATR, Supertrend, VWAP, volume profile, Fibonacci, sandboxed custom expressions; 9 tests) and `AdvancedChart` (intervals 1m–1d, chart types, indicator overlays, drawings, replay, saved templates, trade annotations, click-to-prefill the order ticket) on the instrument page and Terminal X; `CompanyProfile` panel.
- Independence: the public pricing page no longer names or links any other broker; the schedule is published as AIRAVAT's own, benchmarked against prevailing market rates. Internal research docs keep their sources.
- Quality: React-compiler lint rules satisfied in the onboarding form and chart; 55 unit tests; typecheck, lint, build clean.

## 0.2.1 — 2026-10-11 — Published charge schedule aligned to the market reference
- Full charge schedule for equity delivery/intraday, equity F&O, currency and commodity derivatives, other charges, AMC and BSDA, published on /pricing and encoded in `src/lib/charges-schedule.ts` (schedule version 2026-10-11, reference https://zerodha.com/charges/).
- Exchange transaction charge for NSE equity corrected from 0.00297% to 0.00307% through the maker-checker flow (fee version EXCH_TXN v2, compliance submitted, super_admin approved, source URL recorded). Calculator rates and tests updated (CNC buy of ₹1,00,000 now 118.74; MIS sell 52.34).
- Migration 0015: engine guard restricting equity charge computation to segment `EQ`; approved reference catalogue rows for F&O, currency and commodity segments (inert in the engine; published for transparency).
- Reference entries for DP sell charge, pledge, call & trade, delayed payment, off-market transfer, payment gateway, corporate action and AMC recorded as pending catalogue items (not applied: no depository or dealer desk in the sandbox).
- Calculators: new "All segments" charge estimator.


## 0.2.0 — 2026-10-11 — RevenueOS, Partner OS, Research ONE, Sentinel X, AIRAVAT DAILY (additive)
- Database migrations 0006–0014: roles (finance, editor, sales, partner); RevenueOS (versioned fee catalogue, plans, waivers, offers, adjustments, subscriptions, approvals, revenue summary); partners/CRM (categories, commission plans, accruals, payouts, passport, referral attribution, leads); market access matrix + research-only MCX/CDS instruments; instrument metrics + scanners; research cases/evidence/findings; strategies + backtest runs; shadow portfolios; CMS (articles, revisions, transitions, newsletter, daily briefing); Sentinel (alerts, preferences, trade health, pre-mortem, decision twin, what-changed); fixes (internal funds access for cron, alias collisions, search_path pins).
- `apply_fill` now prices through `compute_charges_v2` (plan + waivers + offers) and posts contra-income for discounts; legacy `compute_charges` kept and verified identical.
- Public site: /daily, /daily/[slug], /briefing, /research, /markets/universe, /partners, /showroom; pricing page reads the live catalogue; homepage Morning Intelligence + Awakening intro; referral capture on signup.
- Client app: Scanner Matrix, Research cases + War Room, Strategy DNA (+ backtest engine `src/lib/backtest.ts`), Shadow Portfolio, Sentinel X, plan & offers, partner portal, Theme Studio, pre-mortem in order ticket, decision twin, what-changed digest.
- Broker Core: RevenueOS console, approvals queue, partners & CRM, editorial newsroom + article editor with AI copilot, market matrix console, Sentinel overview.
- Command Everywhere (Ctrl/Cmd+K) on every surface with LIVE hand-off; Materialverse palettes (15) and materials (12).
- Demo environment: 12 role accounts (credentials local only), login verification script, seeded journeys.
- Docs: AIRAVAT_MASTER_COMPLETION.md, SYSTEM_WIRING_MAP.md, DEMO_LOGIN_VERIFICATION.md, SHOWROOM_CAPTURE.md; control files updated.


## 0.1.0 — 2026-10-11 — Sandbox foundation
- Repository created (Next.js 16, TypeScript, Tailwind 4, vitest, ESLint).
- Supabase schema: 32 tables, 30 functions, RLS, pg_cron simulated tick, hardening (migrations 0001–0004).
- Public website: cinematic home, platforms, pricing, markets (+instrument chart), calculators (tested), academy, trust centre, legal drafts, about, contact.
- Client app: sign-up/login, onboarding wizard, market watch + watchlist, order ticket with RMS preview, orders + ClearView passport, positions, holdings, portfolio, funds (simulated deposit, withdrawal request), ledger, consent vault, support, notifications, settings.
- Broker Core: control tower, clients & roles, KYC queue, orders, trades, payouts (maker-checker), ledger & reconciliation, risk limits + kill switch, settlement, support desk, audit log, AI operations, regulatory and requirements registers, system settings.
- AI: AIRAVAT LIVE gateway (Anthropic, no tools, logged) and BHASHA translation route (Sarvam).
- Docs: full control-file set in `docs/`.
- Deployed to Netlify.
