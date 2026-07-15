# Data Flow Diagram — Advisacor

Last updated: 2026-07-15

Text-based data flow for SOC 2 evidence collection.

## Primary flow: Customer question → CFO answer

```
Customer browser (any US location)
   │ HTTPS (TLS 1.2+)
   ▼
Vercel Edge Network (Anycast, global)
   │ Internal Vercel-managed TLS
   ▼
Vercel Functions (iad1 = AWS us-east-1)
   │
   ├─→ Supabase (us-east-1) — reads customer PII, financial data
   │       TLS 1.2+ direct
   │
   ├─→ AWS Bedrock (us-east-1) — Claude inference on question + context
   │       TLS 1.2+ direct (AWS IAM SigV4 auth)
   │
   ├─→ QuotaGuard Shield (us-east-1)
   │       │ TLS 1.2+ tunneled through zero-knowledge proxy
   │       ▼
   │   Intuit QuickBooks Online API
   │   Egress from: 52.54.159.237 or 52.73.143.252 (static)
   │
   ├─→ Stripe API — subscription/billing
   │       TLS 1.2+ direct
   │
   └─→ Postmark/Resend — outbound email
           TLS 1.2+ direct
```

## Notes

- All outbound Intuit API traffic — token exchange (`oauth.platform.intuit.com`), sandbox API (`sandbox-quickbooks.api.intuit.com`), and production API (`quickbooks.api.intuit.com`) — routes through QuotaGuard's static IP pair.
- QuotaGuard Shield uses zero-knowledge TLS: payload contents are opaque to QuotaGuard. Data-in-transit encryption is end-to-end from Vercel Function → Intuit.
- Inbound webhooks from Intuit and Stripe hit Vercel's Anycast IPs (public-facing endpoints); those receivers verify HMAC signatures before processing.
