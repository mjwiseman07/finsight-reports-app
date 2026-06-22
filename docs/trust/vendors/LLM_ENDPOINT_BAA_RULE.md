DRAFT — Founder-authored. NOT counsel-reviewed. NOT CPA-reviewed. BAA
templates and vendor-specific BAA execution deferred to Phase 42.6 (LOCK-42.6.4
counsel-reviewed BAA stack / LOCK-42.6.7 HIPAA counsel). Many entries below
will show baa-pending status; the registry DENIES PHI traffic for those
vendors until counsel-reviewed update flips status. This document is internal
preparation material only.

# LLM / AI Endpoint BAA Rule (Strengthened)

## Rule

For any LLM or AI endpoint serving a healthcare-overlay tenant, a BAA is **REQUIRED BY DEFAULT**. No exception is permitted unless ALL of the following conditions hold simultaneously:

1. The non-PHI flow guarantee is **TECHNICALLY ENFORCED** at the spine layer. Acceptable enforcement mechanisms:
   - 42.5M PHI ingestion detection/refusal gate (upstream classifier)
   - 42.5L breach-detection signal routing (downstream observation)
   - Per-call payload inspection at the spine boundary BEFORE the LLM endpoint is dispatched
2. The guarantee is part of the **D0 PHI-boundary proof** committed in this phase (42.5N PHI-boundary verification harness + 42.5O probe).
3. The `subprocessorRegistry` entry for this endpoint has `baaStatus: 'spine-enforced-non-phi'` AND `spineEnforcedNonPhiPath: true` AND `spineEnforcedNonPhiPathProofReference: '<path-to-real-D0-artifact>'`

## What is NOT acceptable

- "Vendor terms of service promise not to retain inputs"
- "Vendor blog post says they don't train on customer data"
- "Vendor account setting is configured to data-retention-off"
- Any policy-only assurance without spine-enforced check

## Examples

**ALLOWED (spine-enforced, healthcare-overlay tenant):** LLM endpoint serving non-PHI tagged payloads only; 42.5M classifies every payload before dispatch; registry status `spine-enforced-non-phi` with proof reference.

**ALLOWED (BAA executed, healthcare-overlay tenant):** LLM endpoint with executed BAA on file; counsel-reviewed at Phase 42.6F; registry status `baa-on-file`.

**DENIED (no BAA, no spine enforcement):** LLM endpoint claimed "we promise no PHI" via policy only; registry status `baa-required-no-baa`; PC-12 catches this.

**DENIED (BAA pending counsel review):** LLM endpoint negotiation in progress; registry status `baa-pending`; PHI traffic DENIED until status flips to `baa-on-file`.

## Audit Evidence

The registry emits an audit event (42.5D + 42.5T HIPAA retention tier) for every assertion. At Phase 42.6F counsel review, counsel samples the audit log for compliance with the rule.

---

DRAFT — Founder-authored. NOT counsel-reviewed. NOT CPA-reviewed. BAA
templates and vendor-specific BAA execution deferred to Phase 42.6 (LOCK-42.6.4
counsel-reviewed BAA stack / LOCK-42.6.7 HIPAA counsel). Many entries below
will show baa-pending status; the registry DENIES PHI traffic for those
vendors until counsel-reviewed update flips status. This document is internal
preparation material only.
