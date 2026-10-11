# DEPENDENCIES.md

## External services (configured)
| Dependency | Purpose | Status | Credentials |
|---|---|---|---|
| Supabase project `nscoslbooxtndhxlnyyv` (ap-south-1) | Postgres, Auth, pg_cron | Active | anon key public; service role not used |
| Netlify site `777-airavat` (team Abetrex) | Hosting, env vars | Active | Netlify CLI auth |
| GitHub `aby777333-pixel/777-Airavat` | Source | Active | gh CLI |
| Anthropic API | AIRAVAT LIVE | Verified live call (claude-sonnet-5-5) | `ANTHROPIC_API_KEY` server env |
| Sarvam API | AIRAVAT BHASHA translation | Configured, not verified against vendor | `SARVAM_API_KEY` server env |

## External dependencies (unresolved, required before live)
SEBI registration · NSE/BSE/MCX memberships · clearing membership/agreement · CDSL/NSDL DP · KRA/CKYC/PAN verification providers · DigiLocker/eSign/IPV · bank/payment gateway and nodal/segregated accounts · market-data vendor contracts (TrueData/Global Datafeeds/Accelpix/exchange direct) · exchange connectivity and certification · fundamentals/corporate-action data (Capitaline/ACE/others) · SMS/WhatsApp/email providers · legal counsel review of all documents.

## Software
Next 16.4, React 19.3, Tailwind 4, @supabase/ssr 0.12, supabase-js 2.117, lightweight-charts 5.2, @anthropic-ai/sdk 0.133, zod 4.6, vitest 5. Node 24.
