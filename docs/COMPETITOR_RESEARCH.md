# COMPETITOR_RESEARCH.md

**Status: Researching.** No live, source-backed audit of competitor websites was performed in this build session, so no feature is recorded as verified. The directive requires a current, source-backed matrix before any public comparative claim is made.

## Method (to execute next)
1. For each broker, open official product pages, help centres, pricing schedules and API docs. Record URL + retrieval date.
2. Capture features in `docs/research/competitor-feature-matrix.md` with columns: competitor, product/module, feature, availability, platform, free/paid, source URL, verification date, implications, AIRAVAT priority, regulatory dependencies.
3. Mark anything not directly observed as **unverified**.
4. Never claim a competitor lacks a feature without evidence.

## Scope list
Zerodha (Kite, Console, Coin, Varsity, Kite Connect), Groww, Dhan, Angel One (SmartAPI), Upstox, FYERS, ICICI Direct, Kotak Neo, 5paisa, Motilal Oswal, HDFC Securities, Sharekhan, m.Stock, Alice Blue, Shoonya, Definedge, Tradejini; tool benchmarks Sensibull, Streak, Tradetron, AlgoTest, TradingView, Screener.in, Trendlyne, Tickertape, StockEdge.

## Working hypotheses (unverified, from the master prompt's own synthesis)
These are strategic assumptions, not findings: beginner simplicity (Groww), ecosystem depth (Zerodha), trader tooling and APIs (Dhan, Upstox, FYERS), research and distribution breadth (Angel One, ICICI Direct). AIRAVAT's intended differentiators remain GUARDIAN (risk transparency), CLEARVIEW (order→ledger traceability), explainable AI (LIVE), and honest readiness disclosure.

## Charges reference (sourced, 2026-10-11)
Source: https://zerodha.com/charges/ (equities, currency, commodities tabs) and the Zerodha support articles on AMC and BSDA, retrieved 2026-10-11. AIRAVAT's published schedule (`src/lib/charges-schedule.ts`, /pricing) adopts these values as its market reference; statutory and exchange figures are set by law and exchanges, and are re-verified against official notifications before live use.

| Segment | Brokerage | STT/CTT | Txn (NSE / BSE / MCX) | SEBI | Stamp (buy) |
|---|---|---|---|---|---|
| Equity delivery | ₹0 | 0.1% both sides | 0.00307% / 0.00375% | ₹10/cr | 0.015% |
| Equity intraday | 0.03% or ₹20 | 0.025% sell | 0.00307% / 0.00375% | ₹10/cr | 0.003% |
| Equity futures | 0.03% or ₹20 | 0.05% sell | 0.00183% / 0% | ₹10/cr | 0.002% |
| Equity options | ₹20 flat | 0.15% premium sell; 0.15% intrinsic on exercise | 0.03553% / 0.0325% of premium | ₹10/cr | 0.003% |
| Currency futures | 0.03% or ₹20 | none | 0.00035% / 0.00045% | ₹10/cr | 0.0001% |
| Currency options | ₹20 flat | none | 0.0311% / 0.001% of premium | ₹10/cr | 0.0001% |
| Commodity futures | 0.03% or ₹20 | 0.01% sell (non-agri) | MCX 0.0021% / NSE 0.0001% | agri ₹1/cr, non-agri ₹10/cr | 0.002% |
| Commodity options | ₹20 flat | 0.05% premium sell | MCX 0.0418% / NSE 0.001% of premium | ₹10/cr | 0.003% |

Other charges: DP ₹15.34 per scrip on sell; pledge ₹30 + GST; call & trade ₹50; delayed payment 18% p.a.; off-market ₹25; payment gateway ₹9 + GST (nil UPI); corporate action ₹20 + GST; account opening free for individuals (₹500 NRI/HUF offline/corporate). AMC: ₹300 + GST per year (quarterly ₹75) non-BSDA individuals, NRI ₹500, corporates ₹1,000; BSDA nil up to ₹4 lakh, ₹25/quarter to ₹10 lakh; first year free for resident individuals opened on or after 1 June 2026.
