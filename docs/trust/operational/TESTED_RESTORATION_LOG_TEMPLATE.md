DRAFT — Founder-authored. NOT CPA-reviewed. NOT pen-tested. External
review and pen-test execution deferred to Phase 42.6 (LOCK-42.6.6 / H-4).
This draft is internal preparation material only. It is NOT a SOC 2
Type II evidence artifact, NOT an attestation, and MUST NOT be published
or claimed as evidence of operating effectiveness. Cadence and SLAs
are STARTING TARGETS; auditor confirms at engagement.

# Tested-Restoration Log Template

Each quarterly tabletop or annual full-restore produces one entry using the structure below.

## Test Run [YYYY-MM-DD]

**Test type:** [tabletop | partial-restore | full-restore-to-isolated-env]  
**Founders present:** [names]  
**Scope tested:** [Tier 1 / Tier 2 / Tier 3 systems per BCP/DR criticality analysis]

### Pre-test state

- Backup vintage: [timestamp]
- Source systems baseline: [described]
- Test environment: [described, MUST be isolated from production]

### Execution

- Start time: [HH:MM]
- Steps executed: [enumerated]
- Deviations from BCP/DR plan: [enumerated with rationale]
- Issues encountered: [enumerated]

### Recovery measurements

- Effective RPO observed: [hours]
- Effective RTO observed: [hours]
- RPO target met? [Y/N — target ≤ 24h]
- RTO target met? [Y/N — target ≤ 72h]

### Data integrity verification

- Sample queries run against restored data: [described]
- Cross-checks passed: [Y/N]
- HIPAA overlay audit log restore verified: [Y/N]
- Spine verifier run against restored state: `VERIFY_EXIT:[?]`
- Spine probe run against restored state: `PROBE_EXIT:[?] violations=[?]`

### Findings

- BCP/DR plan revisions required: [enumerated; feeds D9 update]
- D8 vulnerability findings during restore: [enumerated]
- D10 change-management updates required: [enumerated]

### Sign-off

- Founder 1: [signature/initials, date]
- Founder 2: [signature/initials, date]
- Filed at: [path]

## Usage notes

- Template filled per quarterly tabletop AND annual full-restore
- Completed logs retained per **42.5T** retention baseline
- Auditor at Phase 42.6 reviews most recent N entries

---

DRAFT — Founder-authored. NOT CPA-reviewed. NOT pen-tested. External
review and pen-test execution deferred to Phase 42.6 (LOCK-42.6.6 / H-4).
This draft is internal preparation material only. It is NOT a SOC 2
Type II evidence artifact, NOT an attestation, and MUST NOT be published
or claimed as evidence of operating effectiveness. Cadence and SLAs
are STARTING TARGETS; auditor confirms at engagement.
