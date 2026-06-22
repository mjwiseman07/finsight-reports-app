> **DRAFT — FOUNDER-AUTHORED. NOT COUNSEL-REVIEWED. NOT A CERTIFICATION.**
> **NPRM gap-analysis only. NOT a final-rule build. NOT a compliance claim.**
> **HIPAA counsel Q4 posture review deferred to Phase 42.6G / LOCK-42.6.5.**
> **This document does not constitute legal advice and may not be relied upon by any party as such.**

> **NPRM STATUS — NOT FINAL.** The HIPAA Security Rule Notice of Proposed Rulemaking (RIN 0945-AA22, 90 FR 800, published Jan 6 2025) is a PROPOSED rule. NO final rule has been published as of the LOCK-time status capture (see `NPRM_LOCK_TIME_STATUS.json`). The current Security Rule (45 CFR Part 164 Subparts A/C, addressed in 42.5V) remains in effect. NPRM provisions are PROPOSED — direction-of-travel only — and may change materially before finalization, be modified, be delayed, or be withdrawn. **Nothing in this gap register is a current legal obligation.**

# HIPAA NPRM Gap Register — Reader's Guide

## What this register is

Founder-authored **gap analysis** comparing PROPOSED NPRM provisions (RIN 0945-AA22, Federal Register 90 FR 800, published Jan 6 2025) against the **current** HIPAA Security Rule baseline documented in **42.5V** (`docs/trust/hipaa/`). Each gap row is primary-source verified, owned, and sized (S/M/L — founder-estimated).

Machine-readable schema guard: `ops/compliance/overlays/hipaa/nprm/nprmGapRegister.ts`.

## What this register is not

- Not a compliance commitment or certification
- Not counsel-reviewed NPRM interpretation
- Not a final-rule build or implementation plan
- Not authoritative on when or whether the NPRM will finalize

## Primary-source discipline

Gap-row `primarySourceUrl` values MUST resolve to:

- `federalregister.gov` (90 FR 800 NPRM entry — PRIMARY)
- `hhs.gov/hipaa` (HHS OCR fact sheet — permitted primary summary of own NPRM)
- `reginfo.gov` (RIN 0945-AA22 status — LOCK-time capture)

Law-firm summaries, trade press, and vendor blogs are **discarded for sizing** (see [`SECONDARY_SOURCE_DISCARD_LOG.md`](SECONDARY_SOURCE_DISCARD_LOG.md)).

## Re-verification trigger

If the NPRM finalizes, is withdrawn, or is replaced, execute [`CONTINGENCY_TRIGGER_RUNBOOK.md`](CONTINGENCY_TRIGGER_RUNBOOK.md) within **5 business days**.

## Cross-references

| Module | Use |
|---|---|
| **42.5V** | Current-rule baseline (`POLICY_SET.md`, `SCOPE_STATEMENT.md`) |
| **42.5Q** | SOC 1 boundary — gap-closure work stays within declared boundary |
| **42.5T** | Retention baseline for audit/documentation proposals |

## Document index

| Document | Purpose |
|---|---|
| [`NPRM_GAP_REGISTER.md`](NPRM_GAP_REGISTER.md) | Gap rows NGR-01..NGR-08 (minimum) |
| [`CONTINGENCY_TRIGGER_RUNBOOK.md`](CONTINGENCY_TRIGGER_RUNBOOK.md) | 5-business-day trigger runbook |
| [`SECONDARY_SOURCE_DISCARD_LOG.md`](SECONDARY_SOURCE_DISCARD_LOG.md) | Discarded secondary sources log |

LOCK-time status: `ops/compliance/overlays/hipaa/nprm/NPRM_LOCK_TIME_STATUS.json`

---
> **END DRAFT.** Counsel review and HIPAA legal sign-off required before this gap register may inform any external positioning, customer commitment, or compliance representation. Provisions sourced ONLY from primary sources (Federal Register, HHS OCR fact sheet, reginfo.gov). Secondary sources discarded for sizing.
> **Phase 42.5W (Wave 5 module 2 of 4).** Founder: Matthew Wiseman, Wiseman Financial Technologies LLC.
