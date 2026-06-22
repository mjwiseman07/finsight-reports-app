DRAFT — Founder-authored. NOT CPA-reviewed. CPA engagement deferred to
Phase 42.6 (LOCK-42.6.1 / LOCK-42.6.3). This draft is internal preparation
material only. It is NOT a SOC 2 report, NOT an attestation, and MUST NOT
be published, distributed externally, or claimed as evidence of SOC 2
readiness beyond founder-stage internal preparation. Issuance is gated by
Phase 42.6 CPA engagement, observation window, and AICPA AT-C 105 + 205 +
2017 TSC attestation.

# SOC 2 System Description — Draft

## 1. Service organization overview

See SOC 1 system description (`docs/trust/soc1/SYSTEM_DESCRIPTION_DRAFT.md`) for full overview. This document covers SOC 2-specific scope additions only.

Wiseman Financial Technologies, LLC operates **Advisacor**, a multi-industry SaaS platform for accounting and financial automation. At Phase 42.5 LOCK time, one regulated overlay class exists: **healthcare (HIPAA overlay tenants)**.

## 2. TSC categories in scope

| TSC Category | Rationale |
|---|---|
| **Security** | Required TSC; in-scope from launch |
| **Availability** | Included at launch per planning doc v1.10; D9 BCP/DR (42.5S) is the evidence anchor |
| **Confidentiality** | Included at launch; encryption (42.5E) + isolation (42.5B) are the evidence anchors |

## 3. TSC categories deferred (auditor decision at Phase 42.6)

- **Processing Integrity (Q2):** Founder position is do not assume in-house. Engagement-time decision per planning doc Q2; CPA decision → 42.6C / 42.6D. See `PROCESSING_INTEGRITY_DEFERRED.md`.
- **Privacy (Q2):** HIPAA overlay (42.5V) is the dominant privacy program; SOC 2 Privacy TSC overlap evaluated at Phase 42.6 / LOCK-42.6.1. See `PRIVACY_DEFERRED.md`.

## 4. System boundary

Cross-reference SOC 1 declared boundary from 42.5Q (`socScopeBoundary.getDeclaredBoundary()`). SOC 2 TSC scope **cannot** extend beyond the SOC 1 declared boundary. Alignment is enforced by `tscScopeBoundary.assertTscBoundaryAligned()` (`ops/compliance/soc/soc2/tscScopeBoundary.ts`). TSC scope declaration: `docs/trust/soc2/TSC_SCOPE_DECLARATION.json`.

## 5. Infrastructure and software components

Cross-reference SOC 1 System Description section 3. Subprocessor inventory finalized at **42.5U**.

## 6. People, procedures, data

Cross-reference SOC 1 sections 4, 5, and 6. Segregation-of-duties compensating controls: `docs/trust/operational/COMPENSATING_CONTROLS_TWO_OWNER_SHOP.md` (42.5S).

## 7. Trust Services Criteria mapping summary

Full detail in `CONTROL_MATRIX.md`.

| TSC Category | Primary control anchors |
|---|---|
| Security | 42.5B isolation, 42.5C RBAC, 42.5D audit, 42.5E encryption, 42.5F authentication, 42.5P panel boundary |
| Availability | 42.5S D9 BCP/DR, 42.5E key custody backup |
| Confidentiality | 42.5E encryption, 42.5B isolation, 42.5P panel boundary, 42.5K HIPAA safeguards (overlay-bound subset) |

## 8. Window evidence cadence

Observation window length pending Q6 decision. Cadence plan: `WINDOW_EVIDENCE_CADENCE.md`. Activation gate: Phase 42.6B / GL-2 (post-engagement window start). Until activation, the cadence document is a plan, not an evidence stream.

## 9. Deviation log discipline

Every deviation from documented controls within the observation window logged within 24 hours of detection; remediation tracked; auditor reviews log at engagement. Procedure: `DEVIATION_LOG_DISCIPLINE.md`.

## 10. Complementary user entity controls (CUECs)

Placeholder per SOC 1 pattern; finalized at engagement.

## 11. Subservice organizations

Placeholder pending **42.5U**. Carve-out vs inclusive method at engagement.

## 12. Period of coverage

Placeholder pending Q6; cross-reference SOC 1 System Description section 10.

---

DRAFT — Founder-authored. NOT CPA-reviewed. CPA engagement deferred to
Phase 42.6 (LOCK-42.6.1 / LOCK-42.6.3). This draft is internal preparation
material only. It is NOT a SOC 2 report, NOT an attestation, and MUST NOT
be published, distributed externally, or claimed as evidence of SOC 2
readiness beyond founder-stage internal preparation. Issuance is gated by
Phase 42.6 CPA engagement, observation window, and AICPA AT-C 105 + 205 +
2017 TSC attestation.
