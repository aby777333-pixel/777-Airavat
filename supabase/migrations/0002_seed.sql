-- AIRAVAT | Migration 0002: Seed reference data (SIMULATED market universe, drafts, registers)
-- All prices are synthetic starting points for the sandbox random-walk engine. They are not market data.

insert into instruments(symbol,exchange,segment,name,isin,sector,tick_size,price_band_pct,tradable) values
 ('NIFTY 50','NSE','INDEX','Nifty 50 Index (simulated)',null,'Index',0.05,20,false),
 ('NIFTY BANK','NSE','INDEX','Nifty Bank Index (simulated)',null,'Index',0.05,20,false),
 ('RELIANCE','NSE','EQ','Reliance Industries','INE002A01018','Energy',0.05,10,true),
 ('TCS','NSE','EQ','Tata Consultancy Services','INE467B01029','IT Services',0.05,10,true),
 ('HDFCBANK','NSE','EQ','HDFC Bank','INE040A01034','Banking',0.05,10,true),
 ('ICICIBANK','NSE','EQ','ICICI Bank','INE090A01021','Banking',0.05,10,true),
 ('INFY','NSE','EQ','Infosys','INE009A01021','IT Services',0.05,10,true),
 ('SBIN','NSE','EQ','State Bank of India','INE062A01020','Banking',0.05,10,true),
 ('BHARTIARTL','NSE','EQ','Bharti Airtel','INE397D01024','Telecom',0.05,10,true),
 ('ITC','NSE','EQ','ITC','INE154A01025','FMCG',0.05,10,true),
 ('LT','NSE','EQ','Larsen & Toubro','INE018A01030','Infrastructure',0.05,10,true),
 ('KOTAKBANK','NSE','EQ','Kotak Mahindra Bank','INE237A01028','Banking',0.05,10,true),
 ('AXISBANK','NSE','EQ','Axis Bank','INE238A01034','Banking',0.05,10,true),
 ('HINDUNILVR','NSE','EQ','Hindustan Unilever','INE030A01027','FMCG',0.05,10,true),
 ('BAJFINANCE','NSE','EQ','Bajaj Finance','INE296A01024','NBFC',0.05,10,true),
 ('MARUTI','NSE','EQ','Maruti Suzuki India','INE585B01010','Automobiles',0.05,10,true),
 ('ASIANPAINT','NSE','EQ','Asian Paints','INE021A01026','Consumer',0.05,10,true),
 ('TITAN','NSE','EQ','Titan Company','INE280A01028','Consumer',0.05,10,true),
 ('SUNPHARMA','NSE','EQ','Sun Pharmaceutical','INE044A01036','Pharma',0.05,10,true),
 ('WIPRO','NSE','EQ','Wipro','INE075A01022','IT Services',0.05,10,true),
 ('HCLTECH','NSE','EQ','HCL Technologies','INE860A01027','IT Services',0.05,10,true),
 ('ULTRACEMCO','NSE','EQ','UltraTech Cement','INE481G01011','Cement',0.05,10,true),
 ('TATAMOTORS','NSE','EQ','Tata Motors','INE155A01022','Automobiles',0.05,10,true),
 ('TATASTEEL','NSE','EQ','Tata Steel','INE081A01020','Metals',0.05,10,true),
 ('POWERGRID','NSE','EQ','Power Grid Corporation','INE752E01010','Utilities',0.05,10,true),
 ('NTPC','NSE','EQ','NTPC','INE733E01010','Utilities',0.05,10,true),
 ('ONGC','NSE','EQ','Oil & Natural Gas Corporation','INE213A01029','Energy',0.05,10,true),
 ('ADANIENT','NSE','EQ','Adani Enterprises','INE423A01024','Conglomerate',0.05,10,true),
 ('ADANIPORTS','NSE','EQ','Adani Ports & SEZ','INE742F01042','Infrastructure',0.05,10,true),
 ('JSWSTEEL','NSE','EQ','JSW Steel','INE019A01038','Metals',0.05,10,true),
 ('M&M','NSE','EQ','Mahindra & Mahindra','INE101A01026','Automobiles',0.05,10,true),
 ('NESTLEIND','NSE','EQ','Nestle India','INE239A01024','FMCG',0.05,10,true),
 ('TECHM','NSE','EQ','Tech Mahindra','INE669C01036','IT Services',0.05,10,true),
 ('BAJAJFINSV','NSE','EQ','Bajaj Finserv','INE918I01026','Financial Services',0.05,10,true),
 ('HDFCLIFE','NSE','EQ','HDFC Life Insurance','INE795G01014','Insurance',0.05,10,true),
 ('DRREDDY','NSE','EQ','Dr. Reddys Laboratories','INE089A01031','Pharma',0.05,10,true),
 ('CIPLA','NSE','EQ','Cipla','INE059A01026','Pharma',0.05,10,true),
 ('GRASIM','NSE','EQ','Grasim Industries','INE047A01021','Cement',0.05,10,true),
 ('COALINDIA','NSE','EQ','Coal India','INE522F01014','Mining',0.05,10,true),
 ('INDUSINDBK','NSE','EQ','IndusInd Bank','INE095A01012','Banking',0.05,10,true),
 ('EICHERMOT','NSE','EQ','Eicher Motors','INE066A01021','Automobiles',0.05,10,true),
 ('DIVISLAB','NSE','EQ','Divis Laboratories','INE361B01024','Pharma',0.05,10,true),
 ('HEROMOTOCO','NSE','EQ','Hero MotoCorp','INE158A01026','Automobiles',0.05,10,true),
 ('BPCL','NSE','EQ','Bharat Petroleum','INE029A01011','Energy',0.05,10,true),
 ('TATACONSUM','NSE','EQ','Tata Consumer Products','INE192A01025','FMCG',0.05,10,true),
 ('APOLLOHOSP','NSE','EQ','Apollo Hospitals','INE437A01024','Healthcare',0.05,10,true),
 ('SBILIFE','NSE','EQ','SBI Life Insurance','INE123W01016','Insurance',0.05,10,true),
 ('BRITANNIA','NSE','EQ','Britannia Industries','INE216A01030','FMCG',0.05,10,true),
 ('HINDALCO','NSE','EQ','Hindalco Industries','INE038A01020','Metals',0.05,10,true),
 ('SHRIRAMFIN','NSE','EQ','Shriram Finance','INE721A01047','NBFC',0.05,10,true),
 ('TRENT','NSE','EQ','Trent','INE849A01020','Retail',0.05,10,true),
 ('BEL','NSE','EQ','Bharat Electronics','INE263A01024','Defence',0.05,10,true);

-- Synthetic base prices (NOT market data). The history seeder random-walks from 85% of these.
insert into quotes(instrument_id, ltp, open, high, low, prev_close, bid, ask)
select i.id, p.px, p.px, p.px, p.px, p.px, p.px - 0.05, p.px + 0.05
from instruments i join (values
 ('NIFTY 50',24800),('NIFTY BANK',54200),('RELIANCE',1420),('TCS',3350),('HDFCBANK',1960),('ICICIBANK',1410),('INFY',1520),
 ('SBIN',820),('BHARTIARTL',1880),('ITC',410),('LT',3600),('KOTAKBANK',2100),('AXISBANK',1150),('HINDUNILVR',2500),
 ('BAJFINANCE',930),('MARUTI',14500),('ASIANPAINT',2400),('TITAN',3500),('SUNPHARMA',1650),('WIPRO',250),('HCLTECH',1480),
 ('ULTRACEMCO',12200),('TATAMOTORS',700),('TATASTEEL',165),('POWERGRID',290),('NTPC',340),('ONGC',245),('ADANIENT',2450),
 ('ADANIPORTS',1400),('JSWSTEEL',1080),('M&M',3400),('NESTLEIND',1200),('TECHM',1500),('BAJAJFINSV',2000),('HDFCLIFE',760),
 ('DRREDDY',1260),('CIPLA',1520),('GRASIM',2800),('COALINDIA',390),('INDUSINDBK',780),('EICHERMOT',6800),('DIVISLAB',6100),
 ('HEROMOTOCO',5200),('BPCL',330),('TATACONSUM',1100),('APOLLOHOSP',7600),('SBILIFE',1800),('BRITANNIA',5800),('HINDALCO',760),
 ('SHRIRAMFIN',640),('TRENT',5300),('BEL',410)
) as p(sym, px) on p.sym = i.symbol;

-- Fixed national holidays only. The full NSE/BSE/MCX trading-holiday calendar must be loaded from the official exchange notices.
insert into market_holidays(day, description) values
 ('2026-10-02','Mahatma Gandhi Jayanti (national holiday; verify exchange notice)'),
 ('2027-01-26','Republic Day (national holiday; verify exchange notice)'),
 ('2027-08-15','Independence Day (falls on Sunday in 2027; verify exchange notice)'),
 ('2027-10-02','Mahatma Gandhi Jayanti (falls on Saturday in 2027; verify exchange notice)')
on conflict do nothing;

-- Draft legal documents. These are placeholders requiring review by qualified Indian securities counsel before production.
insert into legal_documents(slug,title,version,body_md,content_hash,mandatory) values
 ('terms-of-use','Terms of Use (Sandbox Draft)',1,
$md$# Terms of Use — DRAFT, NOT LEGALLY REVIEWED

**Status:** Draft template for the AIRAVAT sandbox. Must be reviewed and approved by qualified Indian securities counsel and the compliance officer before any production use.

1. **Nature of this environment.** AIRAVAT currently operates a SIMULATED trading environment. No real securities are bought or sold, no real money is deposited or withdrawn, and no exchange, bank, clearing corporation or depository connectivity exists.
2. **No regulatory authorization is claimed.** AIRAVAT has not represented that it holds any SEBI registration, exchange membership or depository participant arrangement. Registered legal name, registration numbers and addresses are configuration placeholders until verified.
3. **No investment advice.** Information, analytics, calculators and AI-generated content are educational and general in nature. They are not personalized investment advice or research recommendations.
4. **Simulated market data.** All prices shown are synthetic. They must never be relied upon as actual market prices.
5. **Account security.** You are responsible for keeping your credentials confidential and for all activity in your account.
6. **Changes.** A new version of this document will require fresh affirmative acceptance where material.
$md$, encode(sha256('terms-of-use-v1'::bytea),'hex'), true),
 ('risk-disclosure','Risk Disclosure Document (Sandbox Draft)',1,
$md$# Risk Disclosure — DRAFT, NOT LEGALLY REVIEWED

**Status:** Illustrative draft. The prescribed SEBI/exchange Risk Disclosure Document must replace this text before any live trading is enabled.

- Trading and investing in securities involves risk of loss, including loss of the entire capital invested.
- Derivatives and leveraged products can produce losses greater than the initial margin.
- Intraday products may be squared off by the broker's risk management system without further notice.
- Past performance, backtests and simulated results do not guarantee future results.
- Simulated environments do not reproduce real liquidity, slippage, rejections or outages.
- AI-generated explanations may contain errors and must not be treated as advice.
- System, connectivity and data-feed failures can prevent order placement or cancellation.
$md$, encode(sha256('risk-disclosure-v1'::bytea),'hex'), true),
 ('privacy-policy','Privacy Policy (Sandbox Draft)',1,
$md$# Privacy Policy — DRAFT, NOT LEGALLY REVIEWED

**Status:** Draft. Requires review against the Digital Personal Data Protection Act, 2023 and SEBI/exchange record-keeping obligations.

- We collect the information you provide during registration and simulated onboarding (name, email, phone, PAN, date of birth, address).
- Sandbox data is used only to operate this simulated environment and to maintain audit records.
- AI assistant requests are sent to third-party model providers through a server-side gateway with data minimization. We do not send your ledger or identity documents to AI providers.
- You may request export or deletion of optional data; mandatory records are retained per applicable law.
$md$, encode(sha256('privacy-policy-v1'::bytea),'hex'), true),
 ('ai-assistant-terms','AIRAVAT LIVE Assistant Terms (Sandbox Draft)',1,
$md$# AIRAVAT LIVE — Assistant Terms (DRAFT)

- AIRAVAT LIVE is an AI assistant. It is not a human analyst, research analyst or investment adviser.
- It cannot place, modify or cancel orders. Trading actions always require your explicit action through the order ticket and pass through risk controls.
- It may make mistakes. Verify important information against primary sources.
- It only sees the context you explicitly share (for example the instrument you have open).
$md$, encode(sha256('ai-assistant-terms-v1'::bytea),'hex'), false);

-- Regulatory obligation register: entries are placeholders to be verified against official sources. Nothing here is a claim of compliance.
insert into regulatory_obligations(regulation_id,authority,circular_reference,applicability,requirement,owner,status,source_url,verified) values
 ('REG-SEBI-001','SEBI','SEBI (Stock Brokers) Regulations, 1992','Entity','Obtain SEBI stock broker registration before any live client trading.','Compliance Officer (TBD)','Not started','https://www.sebi.gov.in',false),
 ('REG-NSE-001','NSE','NSE membership norms','Entity','Obtain NSE trading membership (CM, F&O segments as applicable).','Management (TBD)','Not started','https://www.nseindia.com',false),
 ('REG-BSE-001','BSE','BSE membership norms','Entity','Obtain BSE trading membership.','Management (TBD)','Not started','https://www.bseindia.com',false),
 ('REG-MCX-001','MCX','MCX membership norms','Entity','Obtain MCX membership before offering commodity derivatives.','Management (TBD)','Not started','https://www.mcxindia.com',false),
 ('REG-DP-001','CDSL/NSDL','Depository participant arrangements','Entity','Establish DP registration or DP arrangement before demat services.','Operations (TBD)','Not started','https://www.cdslindia.com',false),
 ('REG-KYC-001','SEBI','KYC / KRA / CKYC framework','Onboarding','Implement KRA and CKYC verification; sandbox currently performs format validation only.','Compliance Officer (TBD)','Researching','https://www.sebi.gov.in',false),
 ('REG-AML-001','FIU-IND / SEBI','PMLA 2002 obligations','Onboarding, Surveillance','Implement AML risk classification, PEP/sanctions screening and STR reporting.','Principal Officer (TBD)','Researching','https://fiuindia.gov.in',false),
 ('REG-CYBER-001','SEBI','Cybersecurity and Cyber Resilience Framework (CSCRF)','Technology','Implement CSCRF controls applicable to stock brokers; conduct audits.','CISO (TBD)','Researching','https://www.sebi.gov.in',false),
 ('REG-ALGO-001','SEBI / Exchanges','Retail algorithmic trading framework (Feb 2025 circular and exchange implementation notices)','Algo','Algo registration, API controls, static IP and order-rate thresholds must be verified before any live automation.','Compliance Officer (TBD)','Researching','https://www.sebi.gov.in',false),
 ('REG-MDATA-001','NSE/BSE/MCX','Market data licensing','Market data','Obtain exchange-authorized real-time data and redistribution rights; sandbox uses synthetic data only.','Technology (TBD)','Not started','https://www.nseindia.com',false),
 ('REG-FUNDS-001','SEBI','Client fund segregation and settlement of running account','Funds','Segregate client funds; run quarterly/monthly settlement as applicable; daily reconciliation.','Finance (TBD)','Designed','https://www.sebi.gov.in',false),
 ('REG-GRIEV-001','SEBI','Investor grievance redressal (SCORES / ODR)','Support','Register on SCORES; publish investor charter; track complaint TATs.','Compliance Officer (TBD)','Not started','https://scores.sebi.gov.in',false),
 ('REG-DPDP-001','MeitY','Digital Personal Data Protection Act, 2023','Privacy','Consent, purpose limitation, retention and breach notification obligations.','DPO (TBD)','Researching','https://www.meity.gov.in',false),
 ('REG-TAX-001','CBDT / Finance Ministry','STT, stamp duty, GST','Charges','Statutory charge rates must be date-effective and verified against current notifications; sandbox values are illustrative.','Finance (TBD)','Designed','https://incometaxindia.gov.in',false);

-- Master requirements register seed (statuses reflect what exists in the repository at this migration)
insert into requirements(req_id,title,module,source,priority,status,notes) values
 ('REQ-0001','Project isolation: independent repo, DB, auth, secrets','Foundation','Master directive §2','P0','Implemented','Separate GitHub repo, Supabase project, Netlify site.'),
 ('REQ-0002','Master requirements register with unique IDs and statuses','Governance','Master directive §60','P0','Implemented','Table requirements + admin view + docs/MASTER_REQUIREMENTS.md'),
 ('REQ-0003','Regulatory obligation register','Compliance','Master directive §7','P0','Implemented','Table regulatory_obligations, entries unverified.'),
 ('REQ-0004','Competitor feature matrix (source-backed)','Research','Master directive §4','P1','Researching','Pending internet-verified audit; docs/COMPETITOR_RESEARCH.md lists method.'),
 ('REQ-0010','Public website: cinematic homepage','Website','Website directive §3','P1','Implemented','Midnight Sovereign theme, glass system, reduced motion.'),
 ('REQ-0011','Public website: pricing, platforms, trust centre, legal pages','Website','Website directive §4','P1','Implemented','Only sandbox facts published; no registrations claimed.'),
 ('REQ-0012','Interactive calculators with tests','Website','Website directive §8','P1','Tested','Brokerage, SIP, lumpsum, CAGR, position size, risk-reward, break-even; vitest.'),
 ('REQ-0013','Public simulated market pages with data-source labels','Website','Website directive §5','P1','Implemented','Every quote labelled SIMULATED.'),
 ('REQ-0020','Authentication (email/password) with secure session cookies','Identity','Master directive §49','P0','Implemented','Supabase Auth + @supabase/ssr; MFA/passkeys pending.'),
 ('REQ-0021','Role model and RLS (client, dealer, ops, risk, compliance, admin, super_admin)','Identity','Master directive §31','P0','Implemented','RLS on all tables; staff functions check role.'),
 ('REQ-0030','Client onboarding wizard with PAN/DOB validation, nominee, declarations','Onboarding','Master directive §10','P0','Implemented','KRA/CKYC/DigiLocker/eSign/IPV not integrated (external dependency).'),
 ('REQ-0031','KYC manual review queue with approve/reject and audit','Onboarding','Master directive §10','P0','Implemented','Sandbox auto-approval policy flag documented.'),
 ('REQ-0040','Instrument master','Market data','Master directive §23','P0','Implemented','52 simulated NSE instruments; ISIN/lot/tick/band.'),
 ('REQ-0041','Simulated market data engine with session awareness','Market data','Master directive §22-23','P0','Implemented','sim_tick random walk; pg_cron schedule; data labelled SIMULATED.'),
 ('REQ-0042','Historical candles and charting','Market data','Master directive §13','P1','Implemented','Daily synthetic history + 1m candles; lightweight-charts.'),
 ('REQ-0043','Licensed real-time feed adapters (TrueData/GDF/Accelpix/exchange)','Market data','Market data hub','P1','Externally dependent','No vendor contract; adapter boundary defined in docs.'),
 ('REQ-0050','OMS: order intake, idempotency, state machine, durable event journal','OMS','Master directive §20','P0','Tested','place_order/cancel_order/order_events; terminal-state guard.'),
 ('REQ-0051','RMS: fail-closed pre-trade checks (limits, funds, holdings, band, tick, lot, kill switch)','RMS','Master directive §21','P0','Tested','Global limits; per-account limits schema present, not yet enforced.'),
 ('REQ-0052','Simulated exchange adapter with fills for MARKET/LIMIT/SL/SL-M','Exchange','Master directive §22','P0','Implemented','No real exchange connectivity; certification is a separate gate.'),
 ('REQ-0053','Positions, holdings, realized/unrealized P&L','Portfolio','Master directive §18','P0','Implemented','Weighted average cost; MTM from simulated LTP.'),
 ('REQ-0060','Double-entry ledger with balanced journal enforcement','Finance','Master directive §25,§56','P0','Tested','post_journal raises on imbalance; numeric money.'),
 ('REQ-0061','Simulated deposits, withdrawal requests with maker-checker approval','Funds','Master directive §24','P0','Implemented','Requester cannot approve own withdrawal.'),
 ('REQ-0062','Charges engine (brokerage, STT, exchange, SEBI, stamp, GST) versioned','Finance','Master directive §25','P0','Implemented','Illustrative rates flagged for verification.'),
 ('REQ-0063','EOD settlement run: expire open orders, square off MIS','Settlement','Master directive §26','P1','Implemented','Sandbox same-day; T+1 obligations not modelled.'),
 ('REQ-0064','Reconciliation report and trial balance','Back office','Master directive §25-26','P0','Implemented','Admin ledger page.'),
 ('REQ-0070','Audit log for every sensitive event','Audit','Master directive §36','P0','Implemented','audit_events append-only; staff-only read.'),
 ('REQ-0071','Consent vault with versioned documents and hashes','Legal','Living universe §6','P1','Implemented','Draft documents flagged for counsel review.'),
 ('REQ-0080','Super admin console: clients, KYC, orders, funds, ledger, risk, audit, registers','Admin','Master directive §31','P0','Implemented','Role-gated; maker-checker on withdrawals.'),
 ('REQ-0081','Risk limits administration with kill switch','Admin','Master directive §21','P0','Implemented','update_risk_limits audited.'),
 ('REQ-0090','AIRAVAT LIVE assistant via server-side AI gateway (Anthropic)','Intelligence','Final AI spec Part III-IV','P1','Implemented','No order tools; context-scoped; interactions logged.'),
 ('REQ-0091','AIRAVAT BHASHA translation via Sarvam gateway','Intelligence','Sentient universe §2','P2','Implemented','Server route; language list; legal text not auto-translated.'),
 ('REQ-0092','AI operations console (model registry, prompt versions, costs)','Intelligence','Final AI spec §32','P2','Designed','ai_interactions table; console pending.'),
 ('REQ-0100','Options chain, Greeks, strategy builder','Derivatives','Master directive §16','P1','Not started','Requires derivatives instrument master and pricing models.'),
 ('REQ-0101','Algo Studio, backtesting, paper trading','Algo','Algo Universe','P1','Not started','Paper environment partially covered by sandbox.'),
 ('REQ-0102','Mutual funds, IPO, bonds','Investment products','Master directive §28-30','P2','Not started','External integrations required.'),
 ('REQ-0103','Mobile applications (Android/iOS)','Mobile','Completeness directive §3','P1','Not started','Responsive web shipped; native apps not started.'),
 ('REQ-0104','Growth Command (CRM, campaigns, messaging)','Growth','Growth Command','P2','Not started',''),
 ('REQ-0105','Regulatory Fortress: event ledger, reporting, inspection workspace','Compliance','Regulatory Fortress','P1','Designed','audit_events is the seed of the event ledger.'),
 ('REQ-0106','Multi-theme design system (22 palettes) and Theme Studio','Design','Divine proportion §4-5','P2','In development','5 themes shipped; remaining palettes pending.'),
 ('REQ-0110','Exchange certification, security assessment, DR drills','Launch','Master directive §59 Phase 11','P0','Externally dependent','Cannot be done by software alone.'),
 ('REQ-0111','Live trading enablement gate','Launch','All directives','P0','Blocked','Blocked until registrations, memberships, certifications and sign-offs exist.');
