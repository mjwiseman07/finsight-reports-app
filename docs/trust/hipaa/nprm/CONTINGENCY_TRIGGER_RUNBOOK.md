> **DRAFT — FOUNDER-AUTHORED. NOT COUNSEL-REVIEWED. NOT A CERTIFICATION.**
> **NPRM gap-analysis only. NOT a final-rule build. NOT a compliance claim.**
> **HIPAA counsel Q4 posture review deferred to Phase 42.6G / LOCK-42.6.5.**
> **This document does not constitute legal advice and may not be relied upon by any party as such.**

> **NPRM STATUS — NOT FINAL.** The HIPAA Security Rule Notice of Proposed Rulemaking (RIN 0945-AA22, 90 FR 800, published Jan 6 2025) is a PROPOSED rule. NO final rule has been published as of the LOCK-time status capture (see `NPRM_LOCK_TIME_STATUS.json`). The current Security Rule (45 CFR Part 164 Subparts A/C, addressed in 42.5V) remains in effect. NPRM provisions are PROPOSED — direction-of-travel only — and may change materially before finalization, be modified, be delayed, or be withdrawn. **Nothing in this gap register is a current legal obligation.**

# NPRM Contingency Trigger Runbook

**5-business-day response** when NPRM status changes in a publication of record.

## Trigger events (any one fires this runbook)

1. Federal Register publishes a HIPAA Security Rule **FINAL** rule.
2. Federal Register publishes a **withdrawal** of the NPRM.
3. Federal Register publishes a **replacement** NPRM.
4. OCR announces a finalization date in a publication of record.

## Day-by-day actions

| Day | Action | Owner |
|---|---|---|
| Day 1 | Capture published text. Update `ops/compliance/overlays/hipaa/nprm/NPRM_LOCK_TIME_STATUS.json` with new status (`isFinal`, URLs, notes). | Matthew Wiseman |
| Day 2 | Re-run gap register against published final/replacement text. Identify materially changed provisions. | Janice |
| Day 3 | Re-size every changed row (S/M/L). Update `triggerDate` and `status` in [`NPRM_GAP_REGISTER.md`](NPRM_GAP_REGISTER.md). | Matthew Wiseman + Janice |
| Day 4 | Engage HIPAA counsel (Phase 42.6G escalation if not yet engaged) for posture validation. | Matthew Wiseman |
| Day 5 | Publish updated register; notify any customer with healthcare overlay active. | Janice |

## Two-owner on-call compensating control

**Gap:** No dedicated regulatory-affairs team.

**Compensating control:** Both founders (Matthew Wiseman, Janice) receive Federal Register / reginfo monitoring alerts. Either founder may start Day 1 actions; the other confirms within 24 hours. On-call coverage is **best-effort within business hours** — not 24/7 hotline.

## Evidence retention

Runbook execution notes retained per **42.5T** HIPAA documentation floor (2191 days).

---
> **END DRAFT.** Counsel review and HIPAA legal sign-off required before this gap register may inform any external positioning, customer commitment, or compliance representation. Provisions sourced ONLY from primary sources (Federal Register, HHS OCR fact sheet, reginfo.gov). Secondary sources discarded for sizing.
> **Phase 42.5W (Wave 5 module 2 of 4).** Founder: Matthew Wiseman, Wiseman Financial Technologies LLC.
