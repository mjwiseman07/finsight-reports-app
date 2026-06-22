DRAFT — Founder-authored. NOT CPA-reviewed. NOT counsel-reviewed.
External review deferred to Phase 42.6 (LOCK-42.6.7 HIPAA counsel /
LOCK-42.6.1 CPA engagement). This draft is internal preparation material
only. Baseline durations are STARTING FLOORS; counsel and auditor may
RAISE these values at engagement. The HIPAA 6-year floor at 45 CFR
164.316(b)(2)(i) is a HARD FLOOR — never reduced.

# H-6 — Jurisdiction-Specific Retention Deferred to Phase 42.6 Counsel + CPA

Per planning doc v1.10 H-6: jurisdiction-specific log-retention adjustments (state-specific privacy law floors, sectoral overlays, customer-contractual retention requirements) are deferred to Phase 42.6 counsel + CPA review.

## Scope of Deferral

The committed baseline (`LOG_RETENTION_BASELINE.md`) covers:

- HIPAA documentation (federal floor — IMPLEMENTED)
- SOC 2 evidence logs (attestation-window floor — IMPLEMENTED)
- Security incident logs (HIPAA-aligned floor — IMPLEMENTED)
- Application/system logs (operational floor — IMPLEMENTED)

The committed baseline does NOT cover:

- State-specific privacy law floors (CCPA, NY SHIELD, Texas SB 8 healthcare-data, Washington My Health My Data Act, etc.)
- Sectoral overlays beyond healthcare (financial-services FFIEC, education FERPA, payment-card PCI-DSS, etc.)
- Foreign-jurisdiction floors (GDPR, UK DPA 2018, Canada PIPEDA, etc.)
- Customer-contractual retention (per-contract additions beyond regulatory floor)

## Decision Gate

Identification of jurisdiction-specific raises occurs at LOCK-42.6.7 (HIPAA counsel) and LOCK-42.6.1 (CPA). Each raise is implemented as an OVERLAY addition (not a baseline modification), preserving FM-1 architecture. Tracking lives at `COUNSEL_RAISE_REGISTER.md` (sibling document).

## Why Defer Now

Founder-stage operation: tenant geographic footprint is small and observable; identifying every jurisdiction-specific floor without counsel guidance risks over-engineering OR missing a floor. Counsel is the appropriate role to enumerate; founder commits the baseline so the FM-1 resolver is fully operational at LOCK-42.5.3.

## Re-Open Conditions

H-6 deferral is re-opened if:

- New tenant onboards from a jurisdiction not previously analyzed by counsel
- New regulation enacted in a jurisdiction with existing tenants
- Customer contract introduces retention term exceeding baseline
- Vertical expansion beyond healthcare (FFIEC, FERPA, PCI-DSS, etc. become relevant)

---

DRAFT — Founder-authored. NOT CPA-reviewed. NOT counsel-reviewed.
External review deferred to Phase 42.6 (LOCK-42.6.7 HIPAA counsel /
LOCK-42.6.1 CPA engagement). This draft is internal preparation material
only. Baseline durations are STARTING FLOORS; counsel and auditor may
RAISE these values at engagement. The HIPAA 6-year floor at 45 CFR
164.316(b)(2)(i) is a HARD FLOOR — never reduced.
