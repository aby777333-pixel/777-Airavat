# CHANGELOG.md

## 0.8.1 — 2026-10-11 — Option chain explorer
- /markets/option-chain: public chain for four indices and twelve F&O stocks across weekly and monthly expiries: OI bars with change in OI versus a simulated previous session and build-up classification, IV, delta, ATM highlight, PCR, max pain, OI-based support and resistance, expected move from the ATM straddle; charts for OI by strike, IV smile and the max-pain curve; click premiums to build a quick strategy with payoff, breakevens, net premium and max profit/loss, then hand off to the Options Lab.
- The 0.8.0 treemap replaced the earlier simple sector tile list at /markets/heatmap; the Markets menu entry is relabelled "Market Heatmap".

## 0.8.0 — 2026-10-11 — Market heatmap
- /markets/heatmap: squarified treemap of every constituent of NIFTY 50, NIFTY BANK and the sector indices (?i=slug), sized by index weight (or equal), coloured by the day's change, grouped by sector with weighted sector labels, staggered fade-in, hover card, click-through to instrument pages; sector table, advances/declines and biggest movers beside it. Component `src/components/market/Treemap.tsx`. Simulated data labelled.

## 0.7.8 — 2026-10-11 — Company & trust block
- /status: live sandbox status (engine latency, simulated feed freshness, order routing session, risk and surveillance jobs, AI gateways, and the honest "None/Disabled" rows for exchange, bank rails and the live trading gate), auto-refresh every 30 s, linked to /api/health.
- /company/policies: policy register of twelve policies (RMS, PMLA, surveillance, conduct, error trades, BCP, data retention, conflicts, advertising, outsourcing, information security, MTF) each marked "Enforced in software", "Published document" or "Drafted", linked to the versioned legal documents.
- /company/security plus /.well-known/security.txt: controls in place, responsible-disclosure scope, safe harbour, response commitments, known limitations stated.
- /company/press: downloadable logo lockups and mark, boilerplate, facts (sandbox, no registration claimed), usage rules; media enquiries pre-select the topic via /contact?kind=media (the enquiry form now accepts an initial topic from the URL).
- /company/careers/roles: eight fully written roles marked "Pipeline", talent-pool form through `submit_enquiry` (kind careers); no opening claimed.
- /company/newsletter: archive of published market briefs with a consent-based subscription (lead source "newsletter").
- Registry pages: /company/governance (controls enforced in code, planned committees, disclosures, conflicts; no names) and /company/csr (product-level commitments; statutory CSR after incorporation).
- Company menu, utility bar (Status), Trust Centre and About links, SEO and sitemap updated.

## 0.7.7 — 2026-10-11 — Trading platforms block
- /platforms/terminal-demo: public, read-only Terminal X demo with the simulated watchlist (?s=SYMBOL), daily and one-minute AdvancedChart, instrument facts and an order ticket that runs illustrative pre-trade checks (lot, tick, band, stop direction, fat-finger, funds/holdings) in the browser and cannot place orders.
- /platforms/mobile: PWA install guide for Android, iOS and desktop, what works installed, what is never cached, native roadmap (no store listing claimed).
- /developers/docs: API v1 reference generated from the actual route map (auth, envelope, idempotency, scopes, every route, error table with risk-engine codes) with snippets in curl, Python, Node/TypeScript and Go; linked from the Developer Hub.
- Registry pages: /trade/basket-gtt (eight smart order types and how RMS treats each), /trade/algo-marketplace (listing-format showcase, SIMULATED SAMPLE, research only).
- Trade menu, platforms hub cards, SEO and sitemap updated.

## 0.7.6 — 2026-10-11 — Account & service block
- /open-account/guide: interactive document checklist by entity type (individual, NRI, HUF, company, partnership/LLP, trust, minor), the eight onboarding steps, typical timelines, after-approval notes, FAQ JSON-LD; /open-account still goes straight to signup.
- /contact/callback: callback or documentation-visit scheduler (next seven working days, two-hour IST windows, nine languages) stored through the existing `submit_enquiry` RPC with reference and SLA.
- Registry pages: /company/service-network (digital-first, service points marked SIMULATED SAMPLE, no branches claimed), /company/referral (published design, credits not cash, not enabled), /company/loyalty (AIRAVAT Circle tiers by tenure and conduct, not enabled), /pricing/industry-comparison (our schedule vs typical discount and full-service ranges, no broker named).
- Company and Pricing menus, utility bar (Callback), contact page links, SEO and sitemap updated.

## 0.7.5 — 2026-10-11 — Learn block, part 2: glossary, learning tracks, regulation explained; hero card more transparent
- /academy/glossary: 120+ Indian-market terms (STT, CTT, UCC, DP, BSDA, CKYC, KRA, ASBA, T+1, MTF, SLB, ASM/GSM, SPAN, GTT, VWAP …) in ten categories with search, category filter, A–Z jump links, DefinedTermSet JSON-LD and "see it" links to the screen where each term appears.
- /academy/tracks: three structured tracks (First steps · 7 lessons, Long-term investor · 6, F&O foundations · 5) at /academy/tracks/[track]/[lesson], each with a try-it link into the sandbox and a quiz; completion stored per browser with a progress bar (no account needed).
- /learn/regulations: twelve plain-language digests (peak margin, T+1/T+0, running-account settlement, pledge/re-pledge, investor charter, SCORES/SMART ODR, KYC/nomination, F&O risk disclosure, ASM/GSM, algo rules, charges transparency, authorised persons) with official-source links and a "how AIRAVAT applies these" box.
- Learn menu, academy hub cards, SEO entries and sitemap (18 lesson URLs) updated. Hero copy card transparency raised again (28% night, light blur).

## 0.7.4 — 2026-10-11 — Chart School (Learn block, part 1), bigger logo, scroll arrows
- /academy/chart-school: 24 animated candlestick patterns (with Hindi names where common), 14 animated chart patterns, 10 indicators read the Indian way, 16 Indian-market essentials (timings, circuits, lots, expiry, T+1, STT/CTT, pledge, ASM/GSM, bulk/block, FII/DII, regulators, ASBA, MF cut-offs, tax basics, Muhurat) and three self-check quizzes; one SEO page per pattern (/academy/chart-school/[slug], 38 pages in the sitemap). Animations use the hero FX keyframes and respect reduced motion.
- Header logo enlarged (76 px) and floating scroll-to-top/bottom arrows on public pages.

## 0.7.3 — 2026-10-11 — Tools block: planners, screener, portfolio analyser
- `src/lib/planners.ts` (7 tests): equity capital gains tax, gain harvesting, futures SPAN+exposure margin, pledge haircut with the cash rule, ELSS vs PPF vs NPS, retirement corpus, goal planner, HRA exemption; eight new tool pages under /tools/*.
- Migration 0030: `screener_metrics()` (valuation, SMA 50/200, RSI 14, 52-week range, volume ratio in one call) and `resolve_symbols()`.
- /tools/screener with eight presets and combinable filters; /tools/portfolio-analyser (paste a holdings CSV: sector allocation, concentration, P&L, XIRR, NIFTY 50 overlap, computed in the browser).

## 0.7.2 — 2026-10-11 — Business TV, header and hero polish
- Home: Business TV panel beside the market pulse with the official YouTube live streams of CNBC-TV18, ET Now, NDTV Profit, Zee Business, CNBC Awaaz and Business Today; nothing loads until the viewer presses play (youtube-nocookie embed), with a broadcaster disclaimer. Market pulse indices in a three-column grid.
- Header: Search and the theme selector moved to the utility bar so the main row stays inside the content edge. Hero copy card is more transparent (45% night with blur).

## 0.7.1 — 2026-10-11 — Invest hub (block 2): mutual funds, bonds, ETFs/REITs, IPO centre
- Migration 0029: 17 sample direct-plan schemes across 13 categories with 60 months of generated NAV history and 1/3/5-year returns; bond catalogue (G-Secs, T-bills, SDLs, corporate bonds, an NCD public issue, two SGB tranches) with coupons, YTM, ratings, tax notes and how-to-buy; ETF, REIT and InvIT instruments with iNAV, expense ratio, tracking error and distribution yield; IPO listing outcomes and a note that grey-market premium is never published.
- Pages: /invest/mutual-funds (category filters, sort, expense vs category average, direct-vs-regular and ELSS explainers), /invest/mutual-funds/[code] (NAV chart, drawdown, peers, per-scheme SIP projection), /invest/bonds (kinds, catalogue, RBI Retail Direct, duration and credit-risk notes), /invest/etfs-reits (premium/discount to iNAV, trust yields, income-per-lakh). IPO calendar gains day-wise subscription, a retail allotment helper and listing-day performance.
- Invest menu points at the hubs; SEO entries added.

## 0.7.0 — 2026-10-11 — Markets hub (block 1 of the Indian-market build-out)
- Migration 0028: sector indices (NIFTY IT, PHARMA, AUTO, FMCG, METAL, ENERGY, FIN SERVICE) and INDIA VIX as simulated index instruments; `index_constituents` with free-float-proxy weights; `instrument_fundamentals` (four FYs per company, SIMULATED SAMPLE); `fii_dii_activity` (45 sessions); fixed national holidays; `macro_series` (CPI, WPI, repo, 10Y, USDINR, IIP, PMI, Brent, GDP); `corporate_events` (results, AGMs); `ipo_subscriptions`; `contract_specs` for MCX and CDS; SQL `market_pulse()` and `index_detail()`.
- Pages: /markets/indices/[slug] (constituents, weights, sector split, contributions), /markets/sectors and /markets/sectors/[slug] (breadth, valuation snapshot), /markets/derivatives (simulated option chain with OI, PCR, max pain, build-up, expiry ladder, FII positioning, stock F&O universe), /markets/commodities, /markets/currency, /markets/fii-dii (flows chart and table), /markets/calendar (holidays, results, ex-dates, expiries, macro), /markets/economy (indicator cards with sparklines), /markets/pulse (breadth, 52-week extremes, volume shockers, circuits, delivery, sector breadth). Instrument pages gain a fundamentals fact sheet, index memberships, sector peers and the company profile.
- Navigation: eight new Markets links; SEO entries and sitemap coverage for each.
- Home hero: translucent copy card with equal padding, people image aligned to the content edge.

## 0.6.8 — 2026-10-11 — Contact enquiries
- Migration 0027 `site_enquiries` + `submit_enquiry` (anonymous allowed; name/contact/consent/message validation, honeypot, 5-per-hour rate limit per email or phone, reference ENQ-YYYYMMDD-xxxxxx, optional CRM lead with marketing consent, audit) and `update_enquiry` (staff). Detailed general-enquiry form on /contact (11 enquiry kinds with kind-specific questions, segments, horizon, capital, language, state, callback slot, consents) plus support hours, escalation matrix (support → compliance → SEBI SCORES / exchange IG / SMART ODR) and office placeholders. Console /admin/enquiries with status workflow.

## 0.6.0 — 2026-10-11 — AIRAVAT House look, wider content
- New default theme `airavat-house` (Default: paper & night): paper body (#eaede5) with night chrome, hero and footer (#0c1116), TT Norms display face (Manrope stays for the other palettes), rectangular uppercase buttons with the off-white primary and emerald glow, white hairline panels, 3–8px radii, tracked uppercase table headers and eyebrows. Scoped `.on-night` token override gives night sections inside a light page. All 15 earlier palettes remain in Theme Studio.
- Content width: public pages and site components use a 1400px container (was 1280/1152). The app shell stays at 1600px.
- Theme storage key bumped to `airavat-theme-v2` so every visitor sees the new default until they choose another palette; saved profile default is now `airavat-house`.
- Fix: a stylesheet insertion split the opaque-menu rule; repaired and verified (menu panels, glass panels, theme tokens all resolve).
- Mega-menu and mobile-menu featured cards carry a distinct animation per group (sunrise, candlesticks, atlas, radar, abacus, constellation, ledger, timeline), reduced-motion aware.
- Brand: the AIRAVAT elephant lockup (keyed from the supplied artwork; light and dark variants) replaces the placeholder mark in the header, auth pages, app and admin sidebars; favicon and app icons regenerated from the elephant.
- Home hero: the people cutout stands on the right where the market card was; the market pulse card moved below the hero. The hero carries the Mumbai fintech skyline artwork behind the copy (web-optimised JPEG, gradient for legibility); the paper body and night sections carry a fine 12px/96px mesh.
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
