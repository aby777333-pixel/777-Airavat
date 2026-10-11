# KNOWN_LIMITATIONS.md

- **Everything is simulated.** Prices, fills, deposits, settlement and KYC approval are synthetic. No exchange, bank, clearing or depository connectivity exists.
- **No regulatory status.** No SEBI registration, exchange membership, DP arrangement or market-data licence. The Trust Centre says so.
- Quotes update only when a page renders; there is no WebSocket streaming yet.
- Only NSE equity cash (CNC/MIS). No F&O, currency, commodity, MF, IPO, bonds.
- Per-account risk limits and daily-loss limits are modelled but not enforced; only global limits apply.
- Holdings settle immediately on CNC fills (no T+1 obligations, no auctions/short delivery).
- KYC collects data and validates formats only; no document upload, KRA/CKYC, PAN verification, bank verification, eSign or IPV.
- Legal documents are drafts, not counsel-reviewed. Statutory charge rates are illustrative.
- Sarvam translation route is wired but was not exercised against the vendor in this build.
- Security gaps: no MFA/passkeys, CSP, rate limiting, WAF, SIEM, pen test, DR drills.
- Email confirmation behaviour depends on Supabase auth settings, which were not changed in this session.
- Competitor research is a method, not a verified matrix.
- Only 5 of the 22 specified themes; no Theme Studio editor; no voice/gesture/avatar modes.
- Mobile apps, PRO terminal, dealer, partner, institutional, developer API, Growth Command, Regulatory Fortress reporting, Sentinel: not started.
