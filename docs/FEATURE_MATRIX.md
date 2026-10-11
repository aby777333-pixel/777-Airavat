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
| VI | Asset classes | 🟡 | NSE equity cash tradable; MCX/CDS research-only instruments ✅; Market Access Matrix ✅; F&O/MF/IPO/bonds trading ⬜ |
| VII | Market watch, charting, orders, workspace | 🟡 | watchlist ✅, candles ✅, MARKET/LIMIT/SL/SL-M ✅, CNC/MIS ✅; indicators/drawing/basket/GTT/iceberg/workspaces ⬜ |
| VIII | Options & futures | ⬜ | |
| IX | Portfolio | 🟡 | holdings, positions, P&L, sector allocation, concentration ✅; XIRR/benchmarks/tax ⬜ |
| X | OMS, RMS, exchange, market data | 🟡 | OMS state machine ✅, RMS ✅, simulated exchange ✅, feed handlers for real vendors 🔒 |
| XI | Funds, ledger, clearing, depository | 🟡 | double-entry ledger ✅, deposits/withdrawals ✅, EOD run ✅; clearing/DP integrations 🔒 |
| XII | IPO/MF/bonds | ⬜ | |
| XIII | Super admin, dealers, partners | 🟡 | super admin ✅; partner network, commission ledger, payouts, passport ✅; dealer desk ⬜ |
| XIV | Compliance, surveillance, audit | 🟡 | audit ✅, obligation register ✅, complaints ✅; surveillance ⬜ |
| XV | Intelligence, AI governance | 🟡 | LIVE ✅, interaction log ✅, prompt versioning ✅; model registry/evals ⬜ |
| XVI | Algo & developer APIs | 🟡 | Strategy DNA backtesting + Shadow paper trading ✅; live algo/developer API ⬜ |
| XVII | Research & academy | 🟡 | academy ✅; Market Detective, Scanner Matrix, War Room ✅ (sandbox data); fundamentals 🔒 |
| XVIII | CRM, support, internal ops | 🟡 | support tickets ✅; CRM leads/allocation ✅; HR/incentives ⬜ |
| XIX | Design identity, UX, visualizations | 🟡 | design system, 15 themes, 12 materials, Theme Studio, Command Everywhere ✅ |
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
| Research ONE | 🟡 | Market Detective, Scanner Matrix, Strategy DNA, Shadow Portfolio, War Room ✅; Evidence Graph/Digital Twin/MRI 🔒 |
| Divine Proportion design system | 🟡 | tokens + 15 of 22 themes + Materialverse |
| Living Financial Universe (LIVE, consent, trust centre) | 🟡 | LIVE ✅, Consent Vault ✅, Trust Centre ✅ |
| Sentinel & agents | 🟡 | Sentinel X (alerts, trade health, pre-mortem, decision twin, digest) ✅; autonomous agents ⬜ |
| Sentient universe (BHASHA, VOICE, …) | 🟡 | BHASHA translation route ✅; voice/gesture/ambient ⬜ |
| Final AI & visual identity | 🟡 | orb ✅, personality prompt ✅, provider gateway ✅ |
| Regulatory Fortress | 🟡 | audit ledger + registers ✅; reporting/inspection ⬜ |
| Final universe completeness | ⬜ | |
| Growth Command (+ expansion) | 🟡 | RevenueOS, Partner OS, CRM ✅; marketing automation ⬜ |
| Cinematic web & search | 🟡 | design ✅; SEO tooling ⬜ |
| Screenshot engine | 🟡 | Showroom registry with honest pending state; captures manual |
| Enterprise completeness (control tower …) | 🟡 | Control Tower ✅ |

## Phase 2 additive directives (2026-10-11)
| Directive | Status | Where |
|---|---|---|
| RevenueOS | ✅ | /admin/revenue, /admin/approvals, /app/plan, /pricing; migration 0007 |
| Salesforce & Partner Network OS | 🟡 | partners/commissions/payouts/CRM ✅; employees/HR/incentives ⬜ |
| Universal Markets Expansion | 🟡 | matrix + console ✅; non-equity trading 🔒 |
| Research ONE Intelligence Supremacy | 🟡 | cases, council, scanners, strategies, shadow ✅; evidence graph, digital twin, forensic lab, valuation studio 🔒 |
| Terminal X & Scanner Matrix & Quant | 🟡 | scanners + builder + backtests ✅; visual AI builder, replay ⬜ |
| Intelligence Trinity | ✅ | Strategy DNA, Market Detective, Shadow Portfolio |
| Project Aurora | 🟡 | functional sheen/aurora/edge-lit helpers; full cinematic effects ⬜ |
| Sentinel X | ✅ | /app/sentinel, order ticket, positions twin, /admin/sentinel |
| Project Majesty | 🟡 | Awakening intro, new heroes; older pages unchanged |
| Materialverse | 🟡 | 15 palettes, 12 materials, Theme Studio |
| Editorial Empire / AIRAVAT DAILY | ✅ | /daily, /briefing, /admin/editorial; email delivery 🔒 |
| Project Infinity (zero-omission audit) | ✅ | AIRAVAT_MASTER_COMPLETION.md |
| Project Trinity | ✅ | ⌘K, showroom, briefing |
| Operation Absolute Completion | ✅ | demo accounts verified, wiring map, evidence |
