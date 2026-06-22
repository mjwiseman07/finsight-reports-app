DRAFT — Founder-authored. NOT CPA-reviewed. CPA engagement deferred to 
Phase 42.6 (LOCK-42.6.1 / LOCK-42.6.2). This draft is internal preparation 
material only. It is NOT a SOC 1 report, NOT an attestation, and MUST NOT 
be published, distributed externally, or claimed as evidence of SOC 1 readiness 
beyond founder-stage internal preparation. Issuance is gated by Phase 42.6 
CPA engagement, observation window, and AICPA SSAE 18 AT-C 320 attestation.

# SOC 1 Control Objectives → Financial-Reporting Assertions Matrix — Draft

| Control Objective ID | Objective | Financial-Reporting Assertion(s) | Control(s) | D0 Evidence Reference |
|---|---|---|---|---|
| CO-01 | Customer/firm/client isolation prevents cross-tenant data exposure that would misstate revenue, AR, or expense by tenant | Existence, Completeness, Cutoff | 42.5B `classifyIsolationReach` (deny-dominant) | CHK-09 (composition), PC-04 / PC-16 / PC-17 / PC-19 (probe DENY) |
| CO-02 | Role-based access prevents unauthorized journal entries, period-end adjustments, and master-data changes | Existence, Rights and Obligations | 42.5C RBAC evaluator (overlay-aware) | CHK-09, PC-11 / PC-18 |
| CO-03 | Audit logging captures every boundary evaluation supporting transaction traceability | Completeness, Existence | 42.5D audit spine | CHK-10, PC-03 / PC-09 |
| CO-04 | Encryption at rest and in transit protects financial records from undetected modification | Existence, Valuation | 42.5E encryption + key custody | PC-10 / PC-13 |
| CO-05 | Authentication controls prevent unauthorized access to financial reporting functions | Existence, Rights and Obligations | 42.5F authentication | CHK-09 composition, PC-14 |
| CO-06 | Panel data paths render only in-scope tenant data, preventing misstated financial dashboards | Presentation, Completeness | 42.5P `panelDataPathHarness` | CHK-22 / CHK-23 / CHK-24, PC-02 / PC-08 / PC-19, `ops/control-spine/verification/panel-data-paths/D0_EVIDENCE.json` |
| CO-07 | 42O disclosure boundaries (ASC 606 revenue recognition for healthcare entities — IPC vs bad debt vs charity care) are reflected in ICFR control scope; revenue-recognition source data is captured under CO-01 isolation and CO-03 audit logging | Presentation, Disclosure | Knowledge-stack input (42O) consumed by spine controls CO-01 + CO-03 | `Healthcare_Disclosures_42O_Sources.md` v1.1 (founder verification) + CHK-01/02/03 (spine modules present) |
| CO-08 | Change management ensures spine modifications go through documented review before affecting financial reporting | Existence, Completeness | 42.5S D10 (change management) | Placeholder: Evidence at 42.5S commit |

Evidence references point to **D0 proofs** produced by the 42.5O verifier and probe — not assertions of operating effectiveness. Comparative benchmarks from 42P are **not** pass/fail thresholds (benchmark-not-target posture).

```
Evidence artifacts referenced above are produced by the 42.5O verifier 
(scripts/verify-ops-control-spine.js) and probe (scripts/probe-ops-control-spine.js) 
running against a clean spine + HIPAA overlay state. Artifacts at LOCK time:
- VERIFY_EXIT:0 passed=24 failed=0 (or higher passed count as Wave 4 adds checks)
- PROBE_EXIT:0 violations=0 total=20 (lock mode)
- D0_PANEL_EVIDENCE:0 panels=N violations=0
- Phase 42 industry verifier regression: passing
42O disclosure boundaries (CO-07) are sourced from Healthcare_Disclosures_42O_Sources.md 
v1.1 (founder-verified, 10 attributions; 7 VERIFIED, 1 material discrepancy corrected, 
2 minor attribution tightenings, 0 NOT-FOUND).
```

---

DRAFT — Founder-authored. NOT CPA-reviewed. External review deferred to 
Phase 42.6 / LOCK-42.6.2. Boundary diagram input feeding socScopeBoundary 
helper lives at docs/trust/soc1/BOUNDARY_DIAGRAM_INPUT.json.
