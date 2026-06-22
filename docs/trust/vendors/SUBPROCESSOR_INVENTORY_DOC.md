DRAFT — Founder-authored. NOT counsel-reviewed. NOT CPA-reviewed. BAA
templates and vendor-specific BAA execution deferred to Phase 42.6 (LOCK-42.6.4
counsel-reviewed BAA stack / LOCK-42.6.7 HIPAA counsel). Many entries below
will show baa-pending status; the registry DENIES PHI traffic for those
vendors until counsel-reviewed update flips status. This document is internal
preparation material only.

# Subprocessor Inventory Documentation

## 1. Purpose

Document every subprocessor receiving production data flow from Advisacor (Wiseman Financial Technologies, LLC). Machine-readable inventory: `ops/compliance/vendors/SUBPROCESSOR_INVENTORY.json`. Enforcement: `ops/compliance/vendors/subprocessorRegistry.ts`.

## 2. Inventory categories present

- Cloud hosting + database + authentication (Vercel, Supabase)
- Email + monitoring + error tracking (Resend, Vercel observability, Sentry)
- Backup / DR (Supabase backup)
- Payment processing (Stripe)
- LLM/AI endpoints (OpenAI, Anthropic, Eleven Labs)
- Source code hosting (GitHub)
- Accounting integrations (QuickBooks, Xero)

## 3. LLM RULE (strengthened)

For any LLM/AI endpoint serving healthcare-overlay tenants, a BAA is REQUIRED BY DEFAULT. A non-PHI flow guarantee is acceptable ONLY IF (a) the flow is TECHNICALLY ENFORCED at the spine layer (42.5M PHI ingestion gate + 42.5L breach-detection routing), AND (b) the guarantee is part of the D0 PHI-boundary proof. NO soft policy "we promise no PHI" is acceptable.

## 4. BAA Status taxonomy

| Status | Meaning |
|---|---|
| `baa-on-file` | Executed, current, document on file |
| `baa-pending` | Counsel negotiation in progress (Phase 42.6F); registry DENIES PHI |
| `baa-not-applicable` | Non-PHI vendor with no data flow; registry DENIES any detected data flow |
| `baa-required-no-baa` | ERROR state; registry DENIES |
| `spine-enforced-non-phi` | Non-PHI path technically enforced + D0 proof; ALLOW only when 42.5M confirms no PHI |

## 5. Per-subprocessor inventory table

See `SUBPROCESSOR_INVENTORY.json` for the authoritative table. At 42.5U commit, most entries are `baa-pending` by design.

## 6. SOC 2 CC9.2 mapping

Assesses and manages risks from vendors and business partners. Evidence: `SUBPROCESSOR_INVENTORY.json` + this document + counsel-reviewed BAA stack at LOCK-42.6.4.

## 7. HIPAA 164.308(b) mapping

Business associate contracts and other arrangements. Evidence: BAA execution per subprocessor with `dataAccessScope: 'phi-possible'`.

## 8. HIPAA 164.314(a) mapping

Business associate contracts — implementation specifications. Evidence: BAA templates + execution tracking + annual subprocessor review cadence.

## 9. Review cadence

Annual minimum per record; quarterly for LLM/AI endpoints. `lastReviewedDate` populated at Phase 42.6F counsel review.

## 10. Phase 42.6F deferral

Counsel reviews every BAA template + executed BAA + spine-enforced non-PHI proof at LOCK-42.6.4. Until then, `baa-pending` entries correctly DENY PHI traffic.

---

DRAFT — Founder-authored. NOT counsel-reviewed. NOT CPA-reviewed. BAA
templates and vendor-specific BAA execution deferred to Phase 42.6 (LOCK-42.6.4
counsel-reviewed BAA stack / LOCK-42.6.7 HIPAA counsel). Many entries below
will show baa-pending status; the registry DENIES PHI traffic for those
vendors until counsel-reviewed update flips status. This document is internal
preparation material only.
