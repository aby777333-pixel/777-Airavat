# FEATURE_MATRIX.md — directive coverage map

Status legend: ✅ working in sandbox · 🟡 partial · ⬜ not started · 🔒 externally dependent / blocked. This map exists so no directive section is silently omitted. Each ⬜ is a backlog item, not a deletion.

## Master directive (Parts I–XXVI)
| Part | Section | Status | Where |
|---|---|---|---|
| I | Isolation, commandments | ✅ | README, CLAUDE.md, separate infra |
| II | Competitor audit, feature matrix | 🟡 | COMPETITOR_RESEARCH.md (method + unverified list) |
| III | Business model, licensing, regulatory dashboard | 🟡 | regulatory_obligations table + admin page; financial models ⬜ |
| IV | 14 applications | 🟡 | Public website ✅, Web trading ✅ (ONE), Admin ✅ (Broker Core), Compliance/Risk/Back office 🟡 (inside Broker Core), Mobile/Pro/Dealer/Partners/Institutional/Developer/Academy(🟡 pages)/Intelligence(🟡 LIVE) |
| V | Onboarding | 🟡 | wizard, review queue, PAN/DOB/dup checks ✅; KRA/CKYC/DigiLocker/eSign/IPV/bank verification 🔒 |
| VI | Asset classes | 🟡 | NSE equity cash only; F&O/currency/commodity/MF/IPO/bonds ⬜ |
| VII | Market watch, charting, orders, workspace | 🟡 | watchlist ✅, candles ✅, MARKET/LIMIT/SL/SL-M ✅, CNC/MIS ✅; indicators/drawing/basket/GTT/iceberg/workspaces ⬜ |
| VIII | Options & futures | ⬜ | |
| IX | Portfolio | 🟡 | holdings, positions, P&L, sector allocation, concentration ✅; XIRR/benchmarks/tax ⬜ |
| X | OMS, RMS, exchange, market data | 🟡 | OMS state machine ✅, RMS ✅, simulated exchange ✅, feed handlers for real vendors 🔒 |
| XI | Funds, ledger, clearing, depository | 🟡 | double-entry ledger ✅, deposits/withdrawals ✅, EOD run ✅; clearing/DP integrations 🔒 |
| XII | IPO/MF/bonds | ⬜ | |
| XIII | Super admin, dealers, partners | 🟡 | super admin ✅; dealers/partners ⬜ |
| XIV | Compliance, surveillance, audit | 🟡 | audit ✅, obligation register ✅, complaints ✅; surveillance ⬜ |
| XV | Intelligence, AI governance | 🟡 | LIVE ✅, interaction log ✅, prompt versioning ✅; model registry/evals ⬜ |
| XVI | Algo & developer APIs | ⬜ | |
| XVII | Research & academy | 🟡 | academy lessons/glossary ✅; research data 🔒 |
| XVIII | CRM, support, internal ops | 🟡 | support tickets ✅; CRM/ops ⬜ |
| XIX | Design identity, UX, visualizations | 🟡 | design system, 5 themes, breadth/heatmap/charts ✅ |
| XX | Security & infrastructure | 🟡 | RLS, security-definer, headers, secrets ✅; MFA/WAF/SIEM/DR 🔒⬜ |
| XXI | Executive dashboard, financial planning | 🟡 | Control Tower ✅; financial model ⬜ |
| XXII | Architecture, API contracts, financial correctness | 🟡 | ARCHITECTURE.md, API_SPECIFICATIONS.md, numeric money ✅ |
| XXIII | QA, failure scenarios | 🟡 | unit + E2E SQL ✅; load/failover/DR ⬜ |
| XXIV | Phases, control files, DoD, audit | ✅ | docs/, requirements table |
| XXV | Innovation backlog | ⬜ | tracked |
| XXVI | First milestone | ✅ | TEST_RESULTS.md |

## Additive directives
| Directive | Status | Notes |
|---|---|---|
| Website master directive | 🟡 | homepage, sitemap subset (corporate/trading/pricing/calculators/academy/trust/legal), ticker, market pages; CMS/SEO dashboards/screenshot galleries ⬜ |
| Algo Universe | ⬜ | |
| Indian Market Universe 2.0 | ⬜ | tax desk, wealth, institutional |
| Broker Core (20 modules) | 🟡 | client back office, ledger, risk, settlement, audit, support present; rest ⬜ |
| Competitive superiority (COMMAND/GUARDIAN/FORGE/CLEARVIEW/LIFEWEALTH) | 🟡 | GUARDIAN (RMS) ✅, CLEARVIEW (order passport) ✅; others ⬜ |
| Market Data Hub | 🟡 | synthetic feed with provenance labels ✅; vendor adapters 🔒 |
| Completeness & mobile | ⬜ | native apps not started |
| Research ONE | ⬜ | |
| Divine Proportion design system | 🟡 | tokens + 5 of 22 themes |
| Living Financial Universe (LIVE, consent, trust centre) | 🟡 | LIVE ✅, Consent Vault ✅, Trust Centre ✅ |
| Sentinel & agents | ⬜ | |
| Sentient universe (BHASHA, VOICE, …) | 🟡 | BHASHA translation route ✅; voice/gesture/ambient ⬜ |
| Final AI & visual identity | 🟡 | orb ✅, personality prompt ✅, provider gateway ✅ |
| Regulatory Fortress | 🟡 | audit ledger + registers ✅; reporting/inspection ⬜ |
| Final universe completeness | ⬜ | |
| Growth Command (+ expansion) | ⬜ | |
| Cinematic web & search | 🟡 | design ✅; SEO tooling ⬜ |
| Screenshot engine | ⬜ | |
| Enterprise completeness (control tower …) | 🟡 | Control Tower ✅ |
