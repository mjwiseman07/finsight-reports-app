# Registry Change Log

This is the append-only change log for Advisacor registries and governance artifacts.

- **Schema:** [registry-change-log.schema.json](./registry-change-log.schema.json)
- **Authority:** mwiseman@advisacor.com
- **Forward-only:** Entries begin at Phase 42.7A.5 (2026-06-24). Prior phase lineage is documented in the Phase Atlas and Compliance Inventory.

---

## [2026-06-24] Governance artifacts — Phase 42.7A.5 registry change-management controls

**Commit SHA**: `<sha>` (filled in post-merge by founder)
**Author**: cursor-agent
**Reviewer**: mwiseman@advisacor.com
**Change class**: add
**Affected files**:
- `.github/CODEOWNERS`
- `.github/pull_request_template.md`
- `architecture-lane/registries/REGISTRY_CHANGE_LOG.md`
- `architecture-lane/registries/registry-change-log.schema.json`
- `scripts/verify-phase-42-7a-5.js`

**Affected tenant population**:
- No live tenants; pre-production. All future tenants are affected by enforced registry review workflow on every registry/governance change.

**Rationale**:
Establishes enforceable SOC 2 CC8 and SOC 1 CO-5 change-management controls: founder CODEOWNERS review, PR checklist, append-only attested change log, and structural verifier. Closes LOCK-42.7 gate G6.

**Citation / authoritative source**:
- Source name: AICPA SOC 2 Trust Services Criteria CC8.1 (Change Management)
- URL or document handle: Phase_42_7A_5_Registry_Change_Mgmt_Build_Spec.md

**Risk impact**:
- SOC 1 control(s) affected: CO-5 (change authorization)
- SOC 2 TSC(s) affected: CC8 (change management), CC3 (risk assessment supporting evidence)
- HIPAA safeguard(s) affected: none (governance artifacts only; no PHI processing change)

**Verification**:
- Verifiers re-run after change: verify:phase-42-7a-5, full 42.7 regression suite
- Cumulative test count post-change: 476 / 476 passing (pre-42.7F); governance verifier 8 / 8

**Founder attestation**:
> I, Matthew Wiseman, founder of Wiseman Financial Technologies LLC, attest that the above change was reviewed, the affected tenant population was correctly identified, and the cited authoritative source was verified.
>
> Signed: mwiseman@advisacor.com
> Date: 2026-06-24

---

## [2026-06-24] Cross-phase wiring verifier — Phase 42.7F (LOCK-42.7 G7)

**Commit SHA**: `<sha>` (filled in post-merge by founder)
**Author**: cursor-agent
**Reviewer**: mwiseman@advisacor.com
**Change class**: add
**Affected files**:
- `architecture-lane/verifier-42-7f/runWiredTraversal.ts`
- `architecture-lane/verifier-42-7f/caseMatrix.ts`
- `architecture-lane/verifier-42-7f/expectedHopManifest.ts`
- `architecture-lane/verifier-42-7f/ThrowingAuditLogWriter.ts`
- `architecture-lane/verifier-42-7f/__tests__/wiringVerifier.test.ts`
- `scripts/verify-phase-42-7f.js`
- `scripts/verify-phase-42-7f-self.js`
- `architecture-lane/registries/REGISTRY_CHANGE_LOG.md`

**Affected tenant population**:
- No live tenants; pre-production. Verifier covers all six persona × tenant-classification × industry combinations that future tenants will traverse through escalation → panel → org-edge wiring.

**Rationale**:
Single canonical cross-phase traversal runner exercises the full 42.7B→42.7D chain with real `FileAppendAuditLogWriter`, expected-hop manifests, hash-chain verification on every traversal, PHI segregation, citation allow-list enforcement, and three fail-closed cases (FC1–FC3). Closes LOCK-42.7 gate G7.

**Citation / authoritative source**:
- Source name: Phase 42.7F Cross-Phase Wiring Verifier Build Spec
- URL or document handle: Phase_42_7F_Cross_Phase_Wiring_Verifier_Build_Spec.md

**Risk impact**:
- SOC 1 control(s) affected: CO-2 (monitoring completeness) — R→C
- SOC 2 TSC(s) affected: CC4 (monitoring), CC5 (control activities cross-phase), PI1.1–PI1.5 (processing integrity, all-C)
- HIPAA safeguard(s) affected: §164.312(b) audit controls, §164.312(c)(1) integrity — cross-phase verified

**Verification**:
- Verifiers re-run after change: verify:phase-42-7f:all, full 42.7 regression suite
- Cumulative test count post-change: 147 / 147 wiring assertions, 48 / 48 matrix cases, 6 / 6 meta-checks; prior 476 / 476 regression floor retained

**Founder attestation**:
> I, Matthew Wiseman, founder of Wiseman Financial Technologies LLC, attest that the above change was reviewed, the affected tenant population was correctly identified, and the cited authoritative source was verified.
>
> Signed: mwiseman@advisacor.com
> Date: 2026-06-24

---

## [2026-06-24] D0 rollup + LOCK commit — Phase 42.7G (LOCK-42.7 G8)

**Commit SHA**: `fc0cb43`
**Author**: Matthew Wiseman <mwiseman@advisacor.com>
**Reviewer**: mwiseman@advisacor.com
**Change class**: add
**Affected files**:
- `architecture-lane/d0-evidence/D0_WIRING_EVIDENCE.json`
- `LOCK_42_7_ATTESTATION.md`
- `docs/_atlas/Advisacor_Phase_Atlas_v1.md`
- `docs/_compliance/Phase_42_7_Compliance_Inventory.md`
- `scripts/generate-d0-wiring-evidence.js`
- `scripts/verify-lock-42-7.js`
- `package.json`
- `architecture-lane/registries/REGISTRY_CHANGE_LOG.md`

**Affected tenant population**:
- No live tenants; pre-production. D0 evidence covers all six persona × tenant-classification × industry wiring combinations that future tenants traverse.

**Rationale**:
Final LOCK-42.7 gate: generates D0 wiring evidence rollup (48/48 pass), freezes Atlas v1.2.8 and Compliance Inventory v1.6, emits founder attestation, and closes the LOCK-42.7 sequence. Closes LOCK-42.7 gate G8.

**Citation / authoritative source**:
- Source name: Phase 42.7G LOCK Commit Build Spec
- URL or document handle: Phase_42_7G_LOCK_Commit_Build_Spec.md

**Risk impact**:
- SOC 1 control(s) affected: CO-1..CO-7 all-C documented in attestation; CO-2 R→C; CO-7 period-end D0 artifact
- SOC 2 TSC(s) affected: CC1..CC9 + A1/C1/PI1.1–PI1.5 all-C; CC4/CC5 cross-phase verified
- HIPAA safeguard(s) affected: §164.308/.310/.312 documented; §164.312(b)/(c)(1) cross-phase verified

**Verification**:
- Verifiers re-run after change: d0:wiring-evidence, verify:lock-42-7, verify:phase-42-7f:all, full 42.7 regression suite
- Cumulative test count post-change: D0 48/48 pass; wiring 147/147; LOCK verifier 8/8; prior 476/476 regression floor retained

**Founder attestation**:
> LOCK-42.7 — Cross-phase 42.7 architecture frozen. D0 evidence: 48 cases, passCount=48, failCount=0, evidenceVersion=42.7.G1.0. Compliance frozen per LOCK_42_7_ATTESTATION.md.
>
> Signed: mwiseman@advisacor.com
> Date: 2026-06-24

---

## [2026-06-24] Atlas + Inventory structural reconcile — LOCK-42.7 post-LOCK chore

**Commit SHA**: `989e204`
**Author**: Matthew Wiseman <mwiseman@advisacor.com>
**Reviewer**: mwiseman@advisacor.com
**Change class**: modify
**Affected files**:
- `Advisacor_Phase_Atlas_v1.md` (workspace canonical, promoted)
- `Phase_42_7_Compliance_Inventory.md` (workspace canonical, promoted)
- `docs/_atlas/Advisacor_Phase_Atlas_v1.md` (frozen copy reconciled)
- `docs/_compliance/Phase_42_7_Compliance_Inventory.md` (frozen copy reconciled)
- `architecture-lane/registries/REGISTRY_CHANGE_LOG.md`

**Affected tenant population**:
- No live tenants; pre-production. Governance artifact pairing only; no runtime tenant behavior change.

**Rationale**:
Promotes workspace-canonical Atlas v1.2.8 and Compliance Inventory v1.6 to repo root per CODEOWNERS, and reconciles frozen `docs/_atlas/` + `docs/_compliance/` copies to byte-identical workspace versions. Structural reconcile only (no version-string change).

**Citation / authoritative source**:
- Source name: Phase 42.7G LOCK Commit Build Spec (G3 pairing requirement)
- URL or document handle: Phase_42_7G_LOCK_Commit_Build_Spec.md

**Risk impact**:
- SOC 1 control(s) affected: CO-5 (change management) — attested reconcile entry
- SOC 2 TSC(s) affected: CC2 (communication & information) — workspace/frozen pairing restored
- HIPAA safeguard(s) affected: none (governance artifacts only)

**Verification**:
- Verifiers re-run after change: verify:lock-42-7
- Cumulative test count post-change: LOCK verifier 8/8; no content regression

**Founder attestation**:
> I attest that workspace-canonical and frozen Atlas/Inventory copies are reconciled and byte-identical at v1.2.8 / v1.6.
>
> Signed: mwiseman@advisacor.com
> Date: 2026-06-24

---

## [2026-06-24] Compliance Inventory v1.6 authoritative content reconcile

**Commit SHA**: `<sha>` (filled post-merge)
**Author**: Matthew Wiseman <mwiseman@advisacor.com>
**Reviewer**: mwiseman@advisacor.com
**Change class**: modify
**Affected files**:
- `Phase_42_7_Compliance_Inventory.md` (workspace canonical)
- `docs/_compliance/Phase_42_7_Compliance_Inventory.md` (frozen copy)
- `architecture-lane/registries/REGISTRY_CHANGE_LOG.md`

**Affected tenant population**:
- No live tenants; pre-production. SOC examination map update only; no runtime tenant behavior change.

**Rationale**:
Replaces synthesized stub Inventory with authoritative v1.6 content from `Compliance_Inventory_v1_6_authoritative_for_lock_42_7_recon2.md`. Workspace and frozen copies byte-identical; version string remains 1.6.

**Citation / authoritative source**:
- Source name: Phase 42.7 Compliance Inventory v1.6 (authoritative recon2)
- URL or document handle: Compliance_Inventory_v1_6_authoritative_for_lock_42_7_recon2.md

**Risk impact**:
- SOC 1 control(s) affected: CO-5 (change management) — attested registry update
- SOC 2 TSC(s) affected: CC2 (communication & information) — full examination map now repo-resident
- HIPAA safeguard(s) affected: §164.308/.310/.312 mapping expanded per authoritative register

**Verification**:
- Verifiers re-run after change: verify:lock-42-7
- Cumulative test count post-change: LOCK verifier 8/8

**Founder attestation**:
> I attest that workspace and frozen Compliance Inventory v1.6 copies match the authoritative recon2 source.
>
> Signed: mwiseman@advisacor.com
> Date: 2026-06-24

---

## [2026-06-24] Phase Atlas v1.2.8 authoritative content reconcile

**Commit SHA**: `<sha>` (filled post-merge)
**Author**: Matthew Wiseman <mwiseman@advisacor.com>
**Reviewer**: mwiseman@advisacor.com
**Change class**: modify
**Affected files**:
- `Advisacor_Phase_Atlas_v1.md` (workspace canonical)
- `docs/_atlas/Advisacor_Phase_Atlas_v1.md` (frozen copy)
- `architecture-lane/registries/REGISTRY_CHANGE_LOG.md`

**Affected tenant population**:
- No live tenants; pre-production. Governance synthesis document update only; no runtime tenant behavior change.

**Rationale**:
Replaces synthesized stub Atlas with authoritative v1.2.8 content from `Atlas_v1_2_8_authoritative_for_lock_42_7_recon2.md`. Workspace and frozen copies byte-identical; version header remains v1.2.8.

**Citation / authoritative source**:
- Source name: Advisacor Phase Atlas v1.2.8 (authoritative recon2)
- URL or document handle: Atlas_v1_2_8_authoritative_for_lock_42_7_recon2.md

**Risk impact**:
- SOC 1 control(s) affected: CO-5 (change management) — attested registry update
- SOC 2 TSC(s) affected: CC2 (communication & information) — full phase atlas now repo-resident
- HIPAA safeguard(s) affected: none (governance artifact only)

**Verification**:
- Verifiers re-run after change: verify:lock-42-7
- Cumulative test count post-change: LOCK verifier 8/8

**Founder attestation**:
> I attest that workspace and frozen Phase Atlas v1.2.8 copies match the authoritative recon2 source.
>
> Signed: mwiseman@advisacor.com
> Date: 2026-06-24

---

## [2026-06-25] Fund Accounting Wave 2 — Phase FA.2.K-LOCK industry vertical lock

**Phase ID**: FA.2.K-LOCK
**Change type**: industry_vertical_lock
**Commit SHA**: `d19a4b4`
**Author**: cursor-agent
**Reviewer**: mwiseman@advisacor.com
**Change class**: add
**Affected files**:
- `lib/intelligence/synthetic/industry/fund-accounting/**`
- `lib/intelligence/synthetic/industry/contracts/fund-accounting/FABasisContracts.ts`
- `lib/dashboard/panels/fund-performance/contract.ts`
- `scripts/verify-fa-wave-2.js`
- `evidence/fa-wave-2-d0.json`
- `FA_WAVE_2_ATTESTATION.md`
- `architecture-lane/registries/REGISTRY_CHANGE_LOG.md`

**Affected tenant population**:
- No live tenants; pre-production. First fund-accounting vertical knowledge stack under post-LOCK-42.7 architecture.

**Rationale**:
Lock Fund Accounting Wave 2 — industry isolation contract, framework-aware capabilities (ASC 946 / IFRS 10 routing), M/E/H/P/C sub-segment governance, hedge/PE controls, 42.7 audit wiring, 41.5 treatment-resolver consumption, 6 cross-blend trap defenses, 15 red-team poison cases. 63 D0 cases PASS, zero failures.

**Citation / authoritative source**:
- Source name: Phase FA-2 Fund Accounting Wave 2 Build Spec
- URL or document handle: ASC_946_INVESTMENT_COMPANIES, IFRS_10_CONSOLIDATION, FORM_PF, FORM_N_CSR

**Risk impact**:
- SOC 1 control(s) affected: CO-2 (monitoring), CO-5 (change authorization)
- SOC 2 TSC(s) affected: CC4 (monitoring), CC5 (control activities), PI1.1–PI1.5 (processing integrity, all-C)
- HIPAA safeguard(s) affected: §164.312(b) audit controls — cross-phase verified

**Verification**:
- Verifiers re-run after change: verify:fa-wave-2
- Cumulative test count post-change: 63/63 PASS (FA-2 D0)

**Founder attestation**:
> I, Matthew Wiseman, founder of Wiseman Financial Technologies LLC, attest that Fund Accounting Wave 2 satisfies the FA-2 Build Spec, consumes LOCK-41.5 and LOCK-42.7 without degraded modes, and all verifier cases pass.
>
> Signed: mwiseman@advisacor.com
> Date: 2026-06-25

---

## [2026-06-25] Healthcare Wave 2 — Phase HC.2.K-LOCK industry vertical lock

**Phase ID**: HC.2.K-LOCK
**Change type**: industry_vertical_lock
**Commit SHA**: `ee64120`
**Author**: cursor-agent
**Reviewer**: mwiseman@advisacor.com
**Change class**: add
**Affected files**:
- `lib/intelligence/synthetic/industry/healthcare/**`
- `scripts/verify-hc-wave-2.js`
- `evidence/hc-wave-2-d0.json`
- `HC_WAVE_2_ATTESTATION.md`
- `architecture-lane/registries/REGISTRY_CHANGE_LOG.md`

**Affected tenant population**:
- No live tenants; pre-production. First healthcare Wave-2 vertical knowledge stack under post-LOCK-42.7 architecture with PHI handling.

**Rationale**:
Lock Healthcare Wave 2 — industry isolation contract, framework-aware capabilities (ASC 606 healthcare / ASC 954 / IFRS 15 routing), H/P/A/S/M/B/D sub-segment governance, HIPAA controls + 340B / 501(r) segregation, 42.7 audit wiring + phi-access-audit channel, 41.5 treatment-resolver consumption, 7 cross-blend trap defenses, 20 red-team poison cases. 79 D0 cases PASS, zero failures.

**Citation / authoritative source**:
- Source name: Phase HC-2 Healthcare Wave 2 Build Spec
- URL or document handle: ASC_606_HEALTHCARE, ASC_954_HEALTHCARE_ENTITIES, IRS_501R, HRSA_340B, HHS_OCR_HIPAA_PRIVACY

**Risk impact**:
- SOC 1 control(s) affected: CO-2 (monitoring), CO-5 (change authorization)
- SOC 2 TSC(s) affected: CC4 (monitoring), CC5 (control activities), PI1.1–PI1.5 (processing integrity, all-C)
- HIPAA safeguard(s) affected: §164.312(b) audit controls — phi-access-audit channel on every PHI touch

**Verification**:
- Verifiers re-run after change: verify:hc-wave-2
- Cumulative test count post-change: 79/79 PASS (HC-2 D0)

**Founder attestation**:
> I, Matthew Wiseman, founder of Wiseman Financial Technologies LLC, attest that Healthcare Wave 2 satisfies the HC-2 Build Spec, consumes LOCK-41.5 and LOCK-42.7 without degraded modes, and all verifier cases pass.
>
> Signed: mwiseman@advisacor.com
> Date: 2026-06-25

---

## [2026-06-25] GovCon/DCAA Wave 1 — LOCK-GC-1 reconnaissance lock

**Phase ID**: GC-1
**Change type**: industry_vertical_recon_lock
**Commit SHA**: `PENDING_SHA_FILL`
**Author**: cursor-agent
**Reviewer**: mwiseman@advisacor.com
**Change class**: add
**Affected files**:
- `lib/intelligence/synthetic/standards/govcon/**`
- `lib/intelligence/synthetic/standards/memory-reservation/MemoryFrameworkDimension.ts`
- `docs/govcon/wave1/**`
- `scripts/verify-gc-1.js`
- `scripts/gen-govcon-handles-registry.js`
- `architecture-lane/locks/**`
- `architecture-lane/registries/REGISTRY_CHANGE_LOG.md`

**Source libraries (audit evidence)**:
- FAR Part 31: `docs/govcon/wave1/GovCon_FAR31_Sources.md`
- Cost Accounting Standards: `docs/govcon/wave1/GovCon_CAS_Sources.md`
- DCAA (CAM / MAARs / ICE / SF 1408 / DFARS): `docs/govcon/wave1/GovCon_DCAA_Sources.md`
- Disclosures (ICS / FPRA / PBR / DS-1 / DS-2): `docs/govcon/wave1/GovCon_Disclosures_Sources.md`
- Benchmarks (exec comp / reasonableness / travel / small biz): `docs/govcon/wave1/GovCon_Benchmarks_Sources.md`
- Citation register: `docs/govcon/wave1/GovCon_Citation_Verification_Register.xlsx`

**Doctrine**:
- New scattered flag: `containsGovernmentContractData` (`govcon/doctrine.ts`, HC-2 `containsPHI` parity per GAP-2=A)
- New framework-scoped-memory dimension: `US_GAAP_ONLY` (no IFRS applicability for GovCon vertical)

**Audit-evidence directory**: `docs/govcon/wave1/` (README + 5 source docs + xlsx register)

**Affected tenant population**:
- No live tenants; pre-production. First Government Contracting / DCAA reconnaissance knowledge spine.

**Rationale**:
LOCK-GC-1 establishes Wave 1 reconnaissance for GovCon/DCAA: 6 sub-segment kernel (C/N/S/R/F/T), citation handle registry (URL-only), exec comp cap registry, 5 structural verifier gates (64 cases, +60% over 40-case floor), locks/ registry pattern (GAP-3=A).

**Citation / authoritative source**:
- Source name: Phase GC-1 Recon Spec v1.1
- URL or document handle: `docs/govcon/wave1/`

**Risk impact**:
- SOC 1 control(s) affected: CO-2 (monitoring), CO-5 (change authorization)
- SOC 2 TSC(s) affected: CC4 (monitoring), CC5 (control activities)
- DCAA readiness: SF 1408 pre-award survey citation spine

**Verification**:
- Verifiers re-run after change: verify:gc-1
- Cumulative test count post-change: 64/64 PASS (GC-1 Gates A–E)

**Founder attestation**:
> I, Matthew Wiseman, founder of Wiseman Financial Technologies LLC, attest that GovCon Wave 1 reconnaissance satisfies Phase_GC_1_Recon_Spec.md v1.1, consumes LOCK-HC-2 baseline without degraded modes, and all verifier cases pass.
>
> Signed: mwiseman@advisacor.com
> Date: 2026-06-25

---

## [2026-06-26] GovCon/DCAA Wave 2 — LOCK-GC-2 strong build

**Phase ID**: GC-2
**Change type**: industry_vertical_strong_build_lock
**Commit SHA**: `PENDING_SHA_FILL`
**Author**: cursor-agent
**Reviewer**: mwiseman@advisacor.com
**Change class**: add
**Affected files**:
- `lib/intelligence/synthetic/audit/channels/**`
- `lib/intelligence/synthetic/industry/govcon/**`
- `lib/intelligence/synthetic/standards/govcon/handles-wave2-supplement.ts`
- `docs/govcon/wave2/**`
- `scripts/verify-gc-2.js`
- `scripts/gen-govcon-wave2-scaffold.js`
- `architecture-lane/locks/**`
- `architecture-lane/registries/REGISTRY_CHANGE_LOG.md`

**Highlights**:
- 7th audit channel `dcaa-rate-audit` (default-ON, 7y retention, GC.2.K-LOCK.0)
- FAR 31.205 structural enforcement (50 modules) + CAS (8 in-scope) + DS-1 reconciliation
- FPRA → PBR → Final → ICS rate-state machine (4 pools)
- MAAR 6 timekeeping (URL handle only per Q3=A)
- Exec comp cap structural refuse + CY-boundary handling
- `containsGovernmentContractData` structurally asserted (HC-2 containsPHI precedent)
- TINA + subcontract flow-down URL handles only (enforcement deferred GC-3)
- Audit evidence: `docs/govcon/wave2/`

**Verification**:
- Verifiers: verify:gc-2
- Cumulative test count: 121/121 PASS (79 structural + 30 K-V + 12 anti-pattern)

**Founder attestation**:
> I, Matthew Wiseman, founder of Wiseman Financial Technologies LLC, attest that GovCon Wave 2 strong build satisfies Phase_GC_2_Build_Spec.md v1.0 and all 121 verifier cases pass.
>
> Signed: mwiseman@advisacor.com
> Date: 2026-06-26
