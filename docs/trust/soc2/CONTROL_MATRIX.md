DRAFT — Founder-authored. NOT CPA-reviewed. CPA engagement deferred to
Phase 42.6 (LOCK-42.6.1 / LOCK-42.6.3). This draft is internal preparation
material only. It is NOT a SOC 2 report, NOT an attestation, and MUST NOT
be published, distributed externally, or claimed as evidence of SOC 2
readiness beyond founder-stage internal preparation. Issuance is gated by
Phase 42.6 CPA engagement, observation window, and AICPA AT-C 105 + 205 +
2017 TSC attestation.

# SOC 2 Trust Services Criteria → Control Mapping Matrix — Draft

| TSC Criterion | Category | Description | Control(s) | D0 Evidence Reference |
|---|---|---|---|---|
| CC1.1 | Security | COSO Principle 1 — integrity and ethical values | Founder code-of-conduct (placeholder for 42.5X Trust Package); peer-review (D10) | Placeholder: Evidence at 42.5X commit |
| CC2.1 | Security | Communicates information internally re: internal control | D10 change-management + git ledger | `docs/trust/operational/CHANGE_MANAGEMENT.md` (42.5S) |
| CC3.1 | Security | Specifies objectives with sufficient clarity | This document + SYSTEM_DESCRIPTION_DRAFT.md | CHK-25 (42.5Q SOC 1 system description present) |
| CC5.1 | Security | Selects and develops control activities | 42.5B isolation + 42.5C RBAC + 42.5D audit + 42.5E encryption + 42.5F auth | CHK-09, CHK-10, PC-04, PC-11, PC-14, PC-16, PC-17, PC-18 |
| CC5.2 | Security | Selects and develops general controls over technology | 42.5O verifier + probe; 42.5S D8 vulnerability management | CHK-01..CHK-30, D8 (42.5S) |
| CC5.3 | Security | Deploys control activities through policies and procedures | 42.5S D10 change management + this readiness pack | 42.5S commit (`CHANGE_MANAGEMENT.md` present) |
| CC6.1 | Security | Logical/physical access security | 42.5C RBAC + 42.5F authentication + 42.5B isolation | CHK-09, PC-11, PC-14, PC-16, PC-17, PC-18 |
| CC6.2 | Security | Registers and authorizes new users | 42.5C RBAC + 42.5F authentication | CHK-09, PC-11, PC-14 |
| CC6.3 | Security | Removes access | 42.5C RBAC + 42.5F authentication | CHK-09, PC-11 |
| CC6.6 | Security | Logical access security for boundary protection | 42.5B isolation + 42.5P panel boundary | CHK-09, CHK-22/23/24, PC-04, PC-16, PC-17, PC-19, `ops/control-spine/verification/panel-data-paths/D0_EVIDENCE.json` |
| CC6.7 | Security | Transmission of information using encryption | 42.5E encryption | PC-10, PC-13 |
| CC6.8 | Security | Prevention/detection of unauthorized/malicious software | 42.5S D8 vulnerability management + 42.5M PHI ingestion gate | D8 (42.5S), CHK-12 (42.5M present) |
| CC7.1 | Security | Detects/responds to anomalies | 42.5D audit spine + 42.5L breach-detection routing | CHK-10, CHK-19/20/21 |
| CC7.2 | Security | Monitors components for anomalies | 42.5D audit spine | CHK-10, PC-03, PC-09 |
| CC7.4 | Security | Responds to identified security incidents | 42.5S D10 hotfix path + 42.5L breach-detection routing | `CHANGE_MANAGEMENT.md` (42.5S), CHK-19/20/21 |
| CC8.1 | Security | Authorizes/designs/develops/acquires/implements/configures/tests/approves changes | 42.5S D10 change management | `CHANGE_MANAGEMENT.md` (42.5S) |
| CC9.1 | Security | Identifies/develops/implements risk-mitigation activities | 42.5W NPRM gap register (placeholder pending Wave 5) | Placeholder: Evidence at 42.5W commit |
| CC9.2 | Security | Assesses/manages risks from vendors and business partners | 42.5U subprocessor + BAA stack (pending) | Placeholder: Evidence at 42.5U commit |
| A1.1 | Availability | Maintains/monitors current processing capacity | 42.5S D9 capacity considerations | `docs/trust/operational/BCP_DR_PLAN.md` (42.5S) |
| A1.2 | Availability | Authorizes/designs/develops/acquires/implements environmental protections | 42.5S D9 backup strategy | `docs/trust/operational/BCP_DR_PLAN.md` (42.5S) |
| A1.3 | Availability | Tests recovery plan procedures | 42.5S D9 tested-restoration log | `docs/trust/operational/TESTED_RESTORATION_LOG_TEMPLATE.md` (42.5S) |
| C1.1 | Confidentiality | Identifies/maintains confidential information | 42.5A taxonomy + 42.5K HIPAA safeguards (overlay-bound) | CHK-04, CHK-11 |
| C1.2 | Confidentiality | Disposes of confidential information | 42.5T log-retention baseline (pending) + 42.5E key custody | Placeholder: Evidence at 42.5T commit |
| PI1.x | Processing Integrity | DEFERRED (Q2) | Placeholder | Placeholder: Auditor decision at Phase 42.6 / LOCK-42.6.1 |
| P1.x..P8.x | Privacy | DEFERRED (Q2) | Placeholder | Placeholder: HIPAA overlay (42.5V) is dominant program; auditor decision at Phase 42.6 |

Evidence references point to **D0 proofs** produced by the 42.5O verifier and probe — not assertions of operating effectiveness. RPO/RTO/SLA values in operational programs are **starting targets**; auditor confirms at engagement.

```
Evidence artifacts referenced above are produced by:
- 42.5O verifier (scripts/verify-ops-control-spine.js): VERIFY_EXIT:0 passed=30 failed=0
  at 42.5R commit time
- 42.5O probe (scripts/probe-ops-control-spine.js): PROBE_EXIT:0 violations=0 total=20
- D0 artifacts: panel-data-paths/D0_EVIDENCE.json, soc1/D0_EVIDENCE.json, soc2/D0_EVIDENCE.json
- Operational programs: docs/trust/operational/ (42.5S)
- Phase 42 industry verifier: passing (unchanged regression)
TSC scope alignment with SOC 1 declared boundary is enforced by
ops/compliance/soc/soc2/tscScopeBoundary.ts → assertTscBoundaryAligned().
```

---

DRAFT — Founder-authored. NOT CPA-reviewed. CPA engagement deferred to
Phase 42.6 (LOCK-42.6.1 / LOCK-42.6.3). This draft is internal preparation
material only. It is NOT a SOC 2 report, NOT an attestation, and MUST NOT
be published, distributed externally, or claimed as evidence of SOC 2
readiness beyond founder-stage internal preparation. Issuance is gated by
Phase 42.6 CPA engagement, observation window, and AICPA AT-C 105 + 205 +
2017 TSC attestation.
