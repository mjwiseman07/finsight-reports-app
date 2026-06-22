DRAFT — Founder-authored. NOT CPA-reviewed. CPA engagement deferred to
Phase 42.6 (LOCK-42.6.1 / LOCK-42.6.3). This draft is internal preparation
material only. It is NOT a SOC 2 report, NOT an attestation, and MUST NOT
be published, distributed externally, or claimed as evidence of SOC 2
readiness beyond founder-stage internal preparation. Issuance is gated by
Phase 42.6 CPA engagement, observation window, and AICPA AT-C 105 + 205 +
2017 TSC attestation.

# Deviation Log Discipline — Draft

## 1. What counts as a deviation

Any instance where a documented control activity did NOT execute as designed during the observation window:

- PR merged to `main` without peer-founder review (D10 deviation)
- Patch not applied within SLA window (D8 deviation — starting targets; auditor confirms)
- Backup not produced on scheduled cadence (D9 deviation)
- BCP/DR test skipped or did not meet RPO/RTO targets (D9 deviation — starting targets; auditor confirms)
- Verifier or probe run failed and was not investigated within 24 hours
- Any encryption key rotation skipped or delayed (42.5E deviation)
- Any HIPAA overlay audit log gap detected (42.5D / 42.5L deviation)

## 2. Logging requirement

Every deviation logged within 24 hours of detection:

- Date/time of deviation
- Control activity affected (cross-reference to CC/A/C criterion)
- Cause / contributing factors
- Customer impact assessment (None / Limited / Material)
- PHI impact assessment (None / Possible / Confirmed; Possible/Confirmed triggers 42.5L breach-detection routing per HIPAA breach analysis)
- Remediation steps
- Remediation completion date
- Founder initials of recorder + reviewer (peer founder)

## 3. Closure

Every deviation tracked through to remediation completion; open deviations at audit time disclosed to auditor with explanation.

## 4. Auditor review

Auditor reviews full deviation log at engagement; auditor decides whether deviation count + severity justify a qualified opinion or require remediation prior to issuance.

## 5. Severity classification

| Tier | Definition |
|---|---|
| **Material** | Customer-impacting OR PHI-involving — auditor must be informed at engagement opening |
| **Substantive** | Repeated minor deviation OR single non-customer-impacting failure of a documented control — included in standard auditor sample review |
| **Procedural** | Documentation-only gap (e.g. missing initials on a peer-review) — corrected at detection; included in sample if material to sampled control |

---

DRAFT — Founder-authored. NOT CPA-reviewed. CPA engagement deferred to
Phase 42.6 (LOCK-42.6.1 / LOCK-42.6.3). This draft is internal preparation
material only. It is NOT a SOC 2 report, NOT an attestation, and MUST NOT
be published, distributed externally, or claimed as evidence of SOC 2
readiness beyond founder-stage internal preparation. Issuance is gated by
Phase 42.6 CPA engagement, observation window, and AICPA AT-C 105 + 205 +
2017 TSC attestation.
