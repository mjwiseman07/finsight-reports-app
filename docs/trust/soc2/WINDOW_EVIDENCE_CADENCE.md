DRAFT — Founder-authored. NOT CPA-reviewed. CPA engagement deferred to
Phase 42.6 (LOCK-42.6.1 / LOCK-42.6.3). This draft is internal preparation
material only. It is NOT a SOC 2 report, NOT an attestation, and MUST NOT
be published, distributed externally, or claimed as evidence of SOC 2
readiness beyond founder-stage internal preparation. Issuance is gated by
Phase 42.6 CPA engagement, observation window, and AICPA AT-C 105 + 205 +
2017 TSC attestation.

# Window Evidence Cadence Plan — Draft

## 1. Observation window length

Placeholder pending Q6 (3-month / 6-month / 12-month). Decision at Phase 42.6A engagement.

## 2. Evidence collection cadence per TSC category

### Security

- Verifier + probe re-run weekly during window; output retained per **42.5T**
- PR-level peer-review evidence: all PRs in window retained (git ledger)
- Vulnerability scan outputs retained per D8 cadence (42.5S)
- Incident response logs: every incident logged within 24h (42.5S D10 hotfix register)

### Availability

- BCP/DR tabletop quarterly during window (42.5S D9)
- Annual full-restoration test (auditor witnesses)
- Monitoring uptime reports retained
- Backup-verification logs retained

### Confidentiality

- Encryption key rotation events logged (42.5E custody)
- Confidential-data access patterns sampled monthly
- HIPAA overlay PHI access audit reports (42.5D + 42.5L) retained

## 3. Deviation log discipline

Every deviation from documented control activity logged within 24 hours of detection; remediation tracked through closure; auditor reviews log at engagement. Procedure detail in `DEVIATION_LOG_DISCIPLINE.md`.

## 4. Cadence activation

**DRAFT phase:** cadence is documented but NOT active. Activation gate is **Phase 42.6B / GL-2** (post-engagement window start). Until activation, this document is a plan, not an evidence stream.

## 5. Window evidence retention

All window evidence retained per **42.5T** baseline; HIPAA-overlay-bound evidence retained per HIPAA-specific retention (typically 6+ years).

## 6. Auditor sample size

Placeholder; auditor sets sample population at engagement per AICPA guidance.

---

DRAFT — Founder-authored. NOT CPA-reviewed. CPA engagement deferred to
Phase 42.6 (LOCK-42.6.1 / LOCK-42.6.3). This draft is internal preparation
material only. It is NOT a SOC 2 report, NOT an attestation, and MUST NOT
be published, distributed externally, or claimed as evidence of SOC 2
readiness beyond founder-stage internal preparation. Issuance is gated by
Phase 42.6 CPA engagement, observation window, and AICPA AT-C 105 + 205 +
2017 TSC attestation.
