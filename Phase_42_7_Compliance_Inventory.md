# Phase 42.7 Compliance Inventory

> **DRAFT — INTERNAL SOC EXAMINATION MAP. Frozen at LOCK-42.7.**
> **Authority:** mwiseman@advisacor.com
> **Scope:** Cross-phase 42.7 architecture (TreatmentResolver → role → panel → org-edge → memory/audit)

---

## 1. Purpose

This inventory maps SOC 1 control objectives, SOC 2 Trust Services Criteria, and HIPAA Security Rule safeguards to the 42.7 architecture build window. Status **C** = Complete for the 42.7 LOCK epoch.

---

## 2. SOC 1 control objectives (SSAE 18)

| Control | Description | 42.7 anchor | Status |
|---|---|---|---|
| CO-1 | Authorization & approval | CODEOWNERS + caller identity on audit entries | C |
| CO-2 | Completeness | 42.7F cross-phase wiring verifier; D0 `passCount=48` | C |
| CO-3 | Accuracy | Audit log expected/actual decisions; hash chain | C |
| CO-4 | Restricted access | PHI tenant segregation; org-edge identity | C |
| CO-5 | Change management | 42.7A.5 CODEOWNERS + PR template + change log | C |
| CO-6 | IT general controls | Infrastructure layer (Supabase + Stripe); Wave 3 deepens | C |
| CO-7 | Period-end reporting | `D0_WIRING_EVIDENCE.json` is period-end artifact | C |

---

## 3. SOC 2 Type 2 Trust Services Criteria

| TSC | Description | 42.7 anchor | Status |
|---|---|---|---|
| CC1 | Control environment | Founder CODEOWNER + attestation discipline | C |
| CC2 | Communication & information | Frozen Atlas + Inventory; forward-only change log | C |
| CC3 | Risk assessment | Explicit retrofit gap acknowledgment (B.1, C.2, D.1-audit, A.5) | C |
| CC4 | Monitoring activities | Cache metrics; D0 rollup; 42.7F wiring verifier | C |
| CC5 | Control activities | Audit emission at every decision; cross-phase verified | C |
| CC6 | Logical access | PHI segregation; locked citation handles | C |
| CC7 | System operations | Audit log + hash chain + wiring verifier | C |
| CC8 | Change management | 42.7A.5 framework + dogfooded change log | C |
| CC9 | Risk mitigation | Fail-closed on audit write; no degraded modes | C |
| A1 | Availability | End-to-end on A→E chain per 42.7F | C |
| C1 | Confidentiality | PHI segregation + tenant classification | C |
| PI1.1–PI1.5 | Processing integrity | Cross-phase wiring verifier 147/147 assertions | C |

---

## 4. HIPAA Security Rule (45 CFR Part 164 Subpart C)

| Safeguard | 42.7 anchor | Status |
|---|---|---|
| §164.308(a)(5)(ii)(C) Audit reports | 42.7E audit log + 42.7F verifier | C |
| §164.312(a)(1) Access control | Tenant classification + caller identity | C |
| §164.312(b) Audit controls | Decision-point audit emission (B.1, C.2, D.1-audit, E, F) | C |
| §164.312(c)(1) Integrity | Hash-chained audit log; `verifyAuditChain()` on every traversal | C |
| §164.312(d) Authentication | Caller identity at every audit emission point | C |

---

## 5. LOCK-42.7 gate inventory

| Gate | Phase | Status |
|---|---|---|
| G1 | 42.7A scaffolding | ✅ |
| G2 | 42.7E memory + audit foundation | ✅ |
| G3 | 42.7B.1 escalation audit retrofit | ✅ |
| G4 | 42.7C.2 panel decision audit retrofit | ✅ |
| G5 | 42.7D.1-audit org-edge audit retrofit | ✅ |
| G6 | 42.7A.5 registry change-mgmt | ✅ |
| G7 | 42.7F cross-phase wiring verifier | ✅ |
| G8 | 42.7G D0 rollup + LOCK commit | ✅ |

---

## 10. Explicit deferrals (G9 — no silent omission)

| Item | Deferred to |
|---|---|
| Phase 38 D0 reconciliation vs 42.7G D0 | Phase 41.5 |
| Wave 3 Supabase audit log persistence | Wave 3 migration |
| SOC 2 Type 2 examination period | Post LOCK-42.7 + Phase 41.5 |
| HIPAA BAA infrastructure attestation | BAA-infrastructure phase |
| Phase 39 worker licensing | Post-commercialization |
| Verticals 4–8 vertical-specific compliance | Per-vertical LOCK |

---

## 12. Document control

**Document:** Phase 42.7 Compliance Inventory
**Version**: 1.6
**Frozen at:** LOCK-42.7 commit
**Authority:** mwiseman@advisacor.com
**Pairing requirement (G10):** This inventory MUST be committed alongside the frozen Atlas (`docs/_atlas/Advisacor_Phase_Atlas_v1.md`) and `D0_WIRING_EVIDENCE.json` at the LOCK commit.

**Post-LOCK path:** Next epoch uses `Phase_42_8_Compliance_Inventory.md` (or equivalent). This v1.6 file is the SOC examination map for the 42.7 build window.

---

**END — Phase 42.7 Compliance Inventory v1.6 (LOCK-42.7 frozen)**
