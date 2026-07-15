# Sub-Processors — Advisacor (Wiseman Financial Technologies, LLC)

Last updated: 2026-07-15

This register lists all third-party sub-processors that handle Advisacor
customer data, in support of SOC 2 Type II readiness and customer
transparency requirements.

| Sub-processor | Purpose | Data types | Region | DPA / SOC 2 |
|---|---|---|---|---|
| **Vercel, Inc.** | Application hosting, edge network, serverless functions | Application logs, request metadata, deploy artifacts | US (iad1 / us-east-1) | [Vercel DPA](https://vercel.com/legal/dpa), SOC 2 Type II available on request |
| **Supabase, Inc.** | Postgres database, auth, storage | Customer PII, account records, financial data extracts, audit logs | US (us-east-1) | [Supabase DPA](https://supabase.com/legal/dpa), SOC 2 Type II available |
| **Stripe, Inc.** | Payment processing, subscription billing | Payment method tokens, subscription metadata, invoice records | US | [Stripe DPA](https://stripe.com/legal/dpa), SOC 1/SOC 2/PCI DSS Level 1 |
| **Amazon Web Services (Bedrock)** | AI / LLM inference (Claude, Titan) | Business questions, financial statement summaries — no raw transactions | US (us-east-1) | AWS BAA available on request, SOC 1/2/3 |
| **Intuit, Inc. (QuickBooks Online)** | ERP integration source system | Customer's QBO data (transactions, entities, reports) — customer directly authorizes via OAuth | US | [Intuit DPA](https://www.intuit.com/privacy/statement/), SOC 2 Type II |
| **QuotaGuard (Alpine Shark, LLC)** | Outbound HTTPS proxy for static egress IPs on QBO API traffic | Encrypted TLS traffic (Shield tier — zero-knowledge; QuotaGuard cannot decrypt payloads) | US (us-east-1) | QuotaGuard DPA and SOC 2 Type II available on request |
| **Postmark / Resend** | Transactional email delivery | Recipient email addresses, subject lines, email body content | US | [Postmark DPA](https://postmarkapp.com/dpa) / [Resend DPA](https://resend.com/legal/dpa) |

## Data Flow Summary

1. **Customer browsers** → Vercel (edge) → Vercel Functions (iad1 / us-east-1)
2. **Vercel Functions** → Supabase (us-east-1) for application data reads/writes
3. **Vercel Functions** → QuotaGuard Shield (us-east-1) → Intuit QuickBooks Online API for all outbound QBO calls (fixed egress: `52.54.159.237`, `52.73.143.252`)
4. **Vercel Functions** → AWS Bedrock (us-east-1) for AI inference
5. **Vercel Functions** → Stripe API for billing operations
6. **Vercel Functions** → Postmark/Resend API for outbound email

All in-transit data is TLS 1.2+ encrypted. QuotaGuard Shield uses
zero-knowledge TLS — proxy cannot decrypt payload contents; traffic
egresses to Intuit encrypted end-to-end.

## Change Management

Any addition, removal, or material change to sub-processors requires:

1. Update to this document
2. Update to https://www.advisacor.com/privacy (public-facing sub-processor list)
3. Notice to enterprise customers per DPA notification requirements (30 days)
4. Ticket in the security backlog for audit trail
