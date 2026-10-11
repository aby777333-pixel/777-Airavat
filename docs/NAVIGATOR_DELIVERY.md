# NAVIGATOR_DELIVERY.md — Project Navigator delivery pack (2026-10-11)

Generated from `src/lib/navigation.ts`, the `src/app/(public)` route tree and the content registry (`src/content/*`). Every public path renders from the registry and can be overridden page-by-page by the Website CMS once a page is published.

## 1. Menu hierarchy (mega-menu groups + utility nav)

### Invest
- Stocks → `/invest/stocks`
- Mutual Funds & SIP → `/invest/mutual-funds-sip`
- ETFs → `/invest/etfs`
- IPO & SME IPO → `/invest/ipo`
- Bonds & G-Secs → `/invest/bonds-government-securities`
- REITs & InvITs → `/invest/reits-invits`
- Gold & Silver → `/invest/gold-silver`
- Portfolio & Wealth → `/invest/portfolio-wealth`

### Trade
- Terminal X → `/trade/terminal-x`
- Equity Trading → `/trade/equity-trading`
- Futures & Options → `/trade/futures-options`
- Commodity Derivatives → `/trade/commodity-derivatives`
- Currency Derivatives → `/trade/currency-derivatives`
- Options Strategy Builder → `/trade/options-strategy-builder`
- Advanced Charting → `/trade/advanced-charting`
- Algo Studio → `/trade/algo-studio`
- Trading APIs → `/trade/trading-apis`

### Markets
- Market Overview → `/markets`
- Market Watch → `/markets/watch`
- Index Pages → `/markets/indices`
- Gainers & Losers → `/markets/gainers-losers`
- Sector Heatmaps → `/markets/heatmap`
- Corporate Actions → `/markets/corporate-actions`
- Economic Calendar → `/markets/economic-calendar`
- Market News → `/markets/news`
- Market Breadth → `/markets/breadth`
- IPO Calendar → `/markets/ipo-calendar`
- Announcements & Insiders → `/markets/announcements`
- Deals, Flows & Delivery → `/markets/deals`
- Market Atlas → `/markets/universe`

### Intelligence
- Research ONE → `/research`
- Scanner Matrix → `/intelligence/scanner-matrix`
- Market Detective → `/intelligence/market-detective`
- Sentinel X → `/intelligence/sentinel-x`
- Strategy DNA → `/intelligence/strategy-dna`
- Shadow Portfolio → `/intelligence/shadow-portfolio`
- Opportunity Radar → `/intelligence/opportunity-radar`
- AI Research Council → `/intelligence/ai-research-council`

### Tools
- Brokerage Calculator → `/tools/brokerage-calculator`
- Margin Calculator → `/tools/margin-calculator`
- SIP Calculator → `/tools/sip-calculator`
- CAGR Calculator → `/tools/cagr-calculator`
- XIRR Calculator → `/tools/xirr-calculator`
- EMI Calculator → `/tools/emi-calculator`
- Inflation Calculator → `/tools/inflation-calculator`
- Options Payoff → `/tools/options-payoff-calculator`
- Risk Calculator → `/tools/risk-calculator`
- Portfolio Analytics → `/tools/portfolio-analytics`
- Market Replay → `/tools/market-replay`
- Developer Hub → `/developers`

### Learn
- AIRAVAT Academy → `/academy`
- AIRAVAT DAILY → `/daily`
- Morning Intelligence → `/briefing`
- Beginner Guides → `/learn/beginner-guides`
- Trading Courses → `/learn/courses`
- Financial Glossary → `/learn/glossary`
- Webinars → `/learn/webinars`
- Market History → `/learn/market-history`
- Interactive Tutorials → `/learn/tutorials`
- Investor Protection → `/learn/investor-protection`

### Pricing
- Brokerage Plans → `/pricing/plans`
- All Charges → `/pricing`
- Plan Comparison → `/pricing/compare`
- Charges Calculator → `/tools/brokerage-calculator`
- Margin & Interest → `/pricing/margin-interest`
- Statutory & Exchange Charges → `/pricing#equity`
- Pricing FAQs → `/pricing/faqs`

### Company
- About AIRAVAT → `/about`
- Why AIRAVAT → `/company/why-airavat`
- Trust & Security → `/trust`
- Technology → `/company/technology`
- Partners → `/partners`
- Careers → `/company/careers`
- Contact → `/contact`
- Support → `/company/support`
- Grievance Redressal → `/company/grievance-redressal`
- Legal & Regulatory → `/legal`

### Utility nav
- Support → `/company/support`
- Downloads → `/downloads`
- Accessibility → `/accessibility`

## 2. Sitemap / page inventory

Static route files (36):
- `/`
- `/[...slug]`
- `/about`
- `/academy`
- `/briefing`
- `/calculators`
- `/contact`
- `/daily`
- `/daily/[slug]`
- `/developers`
- `/legal/[slug]`
- `/markets`
- `/markets/[symbol]`
- `/markets/announcements`
- `/markets/breadth`
- `/markets/corporate-actions`
- `/markets/deals`
- `/markets/economic-calendar`
- `/markets/gainers-losers`
- `/markets/heatmap`
- `/markets/indices`
- `/markets/ipo-calendar`
- `/markets/news`
- `/markets/universe`
- `/markets/watch`
- `/open-account`
- `/partners`
- `/platforms`
- `/pricing`
- `/pricing/compare`
- `/pricing/plans`
- `/research`
- `/showroom`
- `/tools/[tool]`
- `/tools/replay`
- `/trust`

Registry pages served by `(public)/[...slug]` (41):
- `/accessibility`
- `/company/careers`
- `/company/grievance-redressal`
- `/company/support`
- `/company/technology`
- `/company/why-airavat`
- `/downloads`
- `/intelligence/ai-research-council`
- `/intelligence/market-detective`
- `/intelligence/opportunity-radar`
- `/intelligence/scanner-matrix`
- `/intelligence/sentinel-x`
- `/intelligence/shadow-portfolio`
- `/intelligence/strategy-dna`
- `/invest/bonds-government-securities`
- `/invest/etfs`
- `/invest/gold-silver`
- `/invest/ipo`
- `/invest/mutual-funds-sip`
- `/invest/portfolio-wealth`
- `/invest/reits-invits`
- `/invest/stocks`
- `/learn/beginner-guides`
- `/learn/courses`
- `/learn/glossary`
- `/learn/investor-protection`
- `/learn/market-history`
- `/learn/tutorials`
- `/learn/webinars`
- `/legal`
- `/pricing/faqs`
- `/pricing/margin-interest`
- `/trade/advanced-charting`
- `/trade/algo-studio`
- `/trade/commodity-derivatives`
- `/trade/currency-derivatives`
- `/trade/equity-trading`
- `/trade/futures-options`
- `/trade/options-strategy-builder`
- `/trade/terminal-x`
- `/trade/trading-apis`

## 3. Content matrix
Every registry page carries: title, H1, dek, intro, keyword list (meta keywords and the command-palette search index), hero variant (unique FX), availability badge (sandbox / info / coming), sections (heading + body), eligibility, risks, costs, tools (links to calculators and labs), FAQs (rendered with FAQPage JSON-LD), CTAs, related pages and `requires_compliance`. SEO: `metadataFor(path)` sets title, description, canonical, Open Graph and Twitter cards; breadcrumbs emit BreadcrumbList JSON-LD; `sitemap.ts` and `robots.ts` enumerate every public path.

## 4. Route-to-backend map
| Route family | Data source | Write path |
|---|---|---|
| `/`, `/invest/*`, `/trade/*`, `/intelligence/*`, `/tools/*`, `/learn/*`, `/company/*` | content registry + `site_pages` published override + `site_faqs` + `site_heroes` | Website CMS RPCs (`save_site_page` …) |
| `/pricing`, `/pricing/plans`, `/pricing/compare` | `fee_catalogue` (approved versions), `plans`, `charges-schedule.ts` | RevenueOS maker-checker |
| `/markets/*` | `instruments`, `quotes`, `candles`, `market_stats_daily`, `corporate_actions`, `economic_events`, `ipos`, `corporate_announcements`, `insider_disclosures`, `shareholding_patterns`, `bulk_block_deals`, `institutional_flows` | sim engine + cron jobs; admin market-data console |
| `/daily`, `/briefing`, `/research` | `articles`, daily briefings, research cases | editorial newsroom |
| `/developers` | OpenAPI document | `api_keys` via `/app/developer` |
| `/showroom` | showroom registry + captures | capture script |
| `/legal/[slug]` | `legal_documents` | migrations (counsel review pending) |

## 5. CMS configuration
Tables `site_pages` (status draft → in_review → approved → published/archived, `scheduled_for`, `version`), `site_page_versions`, `site_page_transitions`, `site_menus` (+ `site_menu_versions`, author ≠ publisher), `site_heroes`, `site_faqs`, `site_media` (bucket `site-media`), `site_settings`. Roles: editor creates/edits/submits; admin/compliance approve and publish; super_admin all. Cron `airavat-publish-site-pages` publishes scheduled pages each minute. Every transition is audited.

## 6. Feature register
See FEATURE_MATRIX.md (section "Operation Complete Independence / Project Navigator") and MASTER_REQUIREMENTS.md REQ-0227–0240.

## 7. Test evidence
TEST_RESULTS.md → "Release 0.4.0": CMS maker-checker E2E, entity onboarding E2E, portfolio & wealth E2E; static checks (typecheck, lint, 55 unit tests, build); live route verification after deploy.

## 8. Unresolved dependency report
| Dependency | Why it blocks | Sandbox equivalent |
|---|---|---|
| KRA/CKYC/PAN/DigiLocker/Aadhaar/bank/IPV/eSign vendors | regulatory onboarding rails | simulated adapters recording provider + reference |
| Exchange membership, market-data licence | real quotes, depth, option chains | sim engine, simulated chain |
| Depository (DP) arrangement | holdings, pledge, DP charges | immediate settlement, pledge book |
| Lender / NBFC for MTF | real funding | sandbox funding book with ledger interest |
| Email/SMS provider | newsletters, alerts, OTP | stored opt-ins and notifications table |
| Counsel review | legal documents, MTF agreement, commission plans | drafts labelled as such |
| FIX counterparty | FIX connectivity | REST + SSE API v1 on the same engine |
