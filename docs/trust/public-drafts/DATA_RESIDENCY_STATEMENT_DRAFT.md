> **DRAFT — NOT PUBLISHED. PUBLISH PROHIBITED UNTIL PHASE 42.6J (GL-5).**
> **No SOC / HIPAA / certification claim is current. Reports not yet issued.**
> **This document lives at docs/trust/public-drafts/ intentionally — public/ is reserved for post-issuance publishing.**
> **Benchmark-not-target framing per LOCK-42.5.9 binds every comparative statement here.**
> **This document does not constitute legal advice or a representation of compliance status.**

# Data Residency Statement — Draft

## Launch posture (US-only)

At Advisacor launch, **PHI and non-PHI customer data** for production tenants are processed and stored with **US-only residency** for primary subprocessors documented in the **42.5U** subprocessor inventory.

## Primary subprocessors (reference)

Inventory source: `docs/trust/vendors/SUBPROCESSOR_INVENTORY_DOC.md` and `ops/compliance/vendors/SUBPROCESSOR_INVENTORY.json`.

Categories include cloud hosting, database, authentication, email, monitoring, error tracking, backup/DR, and LLM/AI endpoints — each row documents residency and PHI authorization status.

**D0 evidence:** `ops/compliance/vendors/D0_EVIDENCE.json`

## Broader residency (deferred)

EU, UK, or multi-region residency postures are **deferred** to HIPAA counsel + customer contract review at Phase 42.6 engagement. This draft does not commit to non-US regions.

## Two-owner compensating control

Subprocessor residency review is performed by founder + designated alternate before any new vendor contract; no dedicated vendor-risk team at two-owner scale.

---
> **END DRAFT.** Trust package publication occurs ONLY at Phase 42.6J after (a) SOC reports issued at 42.6C, (b) HIPAA counsel sign-off at 42.6E, and (c) GL-5 full-launch gate satisfied. Until then, no public-facing surface may claim attestation, certification, "audit underway," "SOC in progress," "HIPAA ready," or equivalent.
> **Phase 42.5X (Wave 5 module 3 of 4).** Founder: Matthew Wiseman, Wiseman Financial Technologies LLC.
