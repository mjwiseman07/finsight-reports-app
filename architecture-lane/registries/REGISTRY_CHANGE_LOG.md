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
