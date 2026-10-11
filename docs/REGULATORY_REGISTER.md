# REGULATORY_REGISTER.md

Authoritative copy: `regulatory_obligations` table (Broker Core → Regulatory register). All entries are **unverified placeholders** created to structure the workstream. Nothing here is a claim of compliance. Thresholds, dates and circular numbers must be confirmed against SEBI, exchange, depository and FIU-IND sources by qualified compliance personnel.

| ID | Authority | Obligation | Status |
|---|---|---|---|
| REG-SEBI-001 | SEBI | Stock broker registration | Not started |
| REG-NSE-001 / BSE-001 / MCX-001 | Exchanges | Trading memberships | Not started |
| REG-DP-001 | CDSL/NSDL | DP arrangement | Not started |
| REG-KYC-001 | SEBI | KYC/KRA/CKYC | Researching (format validation only in sandbox) |
| REG-AML-001 | FIU-IND/SEBI | PMLA: risk classification, screening, STR | Researching |
| REG-CYBER-001 | SEBI | CSCRF controls and audits | Researching |
| REG-ALGO-001 | SEBI/Exchanges | Retail algo framework | Researching |
| REG-MDATA-001 | Exchanges | Market data licensing/redistribution | Not started (synthetic only) |
| REG-FUNDS-001 | SEBI | Client fund segregation, running-account settlement | Designed (ledger segregates client sub-ledgers) |
| REG-GRIEV-001 | SEBI | SCORES/ODR, investor charter | Not started |
| REG-DPDP-001 | MeitY | DPDP Act 2023 | Researching |
| REG-TAX-001 | CBDT/MoF | STT, stamp duty, GST rates (date-effective) | Designed (versioned `charge_schedules`) |

## Release gate
`app_settings.live_trading_enabled` is refused by `update_app_setting()`. Enabling live trading requires a separate, documented approval workflow with evidence for every obligation above.
