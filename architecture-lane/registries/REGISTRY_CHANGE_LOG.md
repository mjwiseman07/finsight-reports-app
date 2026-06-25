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
