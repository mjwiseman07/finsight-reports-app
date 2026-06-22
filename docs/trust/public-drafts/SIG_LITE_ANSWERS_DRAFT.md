> **DRAFT — NOT PUBLISHED. PUBLISH PROHIBITED UNTIL PHASE 42.6J (GL-5).**
> **No SOC / HIPAA / certification claim is current. Reports not yet issued.**
> **This document lives at docs/trust/public-drafts/ intentionally — public/ is reserved for post-issuance publishing.**
> **Benchmark-not-target framing per LOCK-42.5.9 binds every comparative statement here.**
> **This document does not constitute legal advice or a representation of compliance status.**

# SIG Lite Answer Library — Draft

**NOT contractual commitments.** Posture statements citing D0 evidence. Report-dependent answers use `[REPORT_ISSUANCE_DATE — FILL AT 42.6J]`.

## Information security organization

**Answer:** Two-owner shop with documented compensating controls (`docs/trust/operational/COMPENSATING_CONTROLS_TWO_OWNER_SHOP.md`). Security responsibility assigned to founder; alternate reviewer (Janice) for peer review.

**D0 evidence:** `ops/compliance/soc/soc1/D0_EVIDENCE.json`

## Risk assessment + treatment

**Answer:** HIPAA risk analysis draft at `docs/trust/hipaa/RISK_ANALYSIS.md` (42.5V); field classification placeholders pending 42.5K. SOC scope boundary validated by `socScopeBoundary.assertPhiFlagged()`.

**D0 evidence:** `ops/compliance/overlays/hipaa/pack/D0_HIPAA_PACK_EVIDENCE.json`, `ops/compliance/soc/soc1/D0_EVIDENCE.json`

## Asset management

**Answer:** Control layer scoped per SOC 1 system description (`docs/trust/soc1/SYSTEM_DESCRIPTION_DRAFT.md`). Panel data paths segregated per industry overlay.

**D0 evidence:** `ops/control-spine/verification/panel-data-paths/D0_EVIDENCE.json`

## Access control

**Answer:** Spine RBAC + tenant isolation; healthcare overlay activation registry fail-closed (42.5I).

**D0 evidence:** `ops/control-spine/verification/panel-data-paths/D0_EVIDENCE.json`

## Cryptography

**Answer:** Encryption at rest and in transit documented in 42.5V `POLICY_SET.md` technical safeguards.

**D0 evidence:** `ops/compliance/overlays/hipaa/pack/D0_HIPAA_PACK_EVIDENCE.json`

## Physical and environmental security

**Answer:** Cloud-hosted; physical controls delegated to subprocessors under BAA requirements.

**D0 evidence:** `ops/compliance/vendors/D0_EVIDENCE.json`

## Operations security (incident, logging, backup, vuln/pen)

**Answer:** Operational programs at `docs/trust/operational/` (42.5S). Retention floor per 42.5T (HIPAA 2191-day documentation category). Pen-test execution placeholder: `[REPORT_ISSUANCE_DATE — FILL AT 42.6J]`.

**D0 evidence:** `ops/compliance/vendors/D0_EVIDENCE.json`

## Communications security

**Answer:** TLS for data in transit; subprocessors enumerated in 42.5U inventory with PHI boundary enforcement.

**D0 evidence:** `ops/compliance/vendors/D0_EVIDENCE.json`

## System acquisition / development / maintenance

**Answer:** Change management per `docs/trust/operational/CHANGE_MANAGEMENT.md` (42.5S D10). Two-owner peer review compensating control.

**D0 evidence:** `ops/compliance/soc/soc1/D0_EVIDENCE.json`

## Supplier relationships

**Answer:** Subprocessor registry with BAA gate (`subprocessorRegistry.assertBaaOnFile()`). Inventory: `docs/trust/vendors/SUBPROCESSOR_INVENTORY_DOC.md`.

**D0 evidence:** `ops/compliance/vendors/D0_EVIDENCE.json`

## Information security incident management

**Answer:** Incident program layered on 42.5S; HIPAA overlay runbook at `docs/trust/hipaa/INCIDENT_RESPONSE_RUNBOOK.md`.

**D0 evidence:** `ops/compliance/overlays/hipaa/pack/D0_HIPAA_PACK_EVIDENCE.json`

## Business continuity

**Answer:** BCP/DR draft at `docs/trust/operational/BCP_DR_PLAN.md` (RPO ≤ 24h, RTO ≤ 72h — STARTING TARGETS).

**D0 evidence:** `ops/compliance/soc/soc1/D0_EVIDENCE.json`

## Compliance

**Answer:** Internal control documentation spans SOC 1 (`docs/trust/soc1/`), SOC 2 readiness (`docs/trust/soc2/`), HIPAA pack (`docs/trust/hipaa/`). External report issuance: `[REPORT_ISSUANCE_DATE — FILL AT 42.6J]`.

**D0 evidence:** `ops/compliance/soc/soc2/D0_EVIDENCE.json`, `ops/compliance/overlays/hipaa/pack/D0_HIPAA_PACK_EVIDENCE.json`

## Benchmark framing note (LOCK-42.5.9)

Any healthcare KPI or industry benchmark referenced in procurement answers is **comparative context only** — not a target, threshold, or pass/fail commitment. See Phase 42 42P benchmark-not-target discipline.

---
> **END DRAFT.** Trust package publication occurs ONLY at Phase 42.6J after (a) SOC reports issued at 42.6C, (b) HIPAA counsel sign-off at 42.6E, and (c) GL-5 full-launch gate satisfied. Until then, no public-facing surface may claim attestation, certification, "audit underway," "SOC in progress," "HIPAA ready," or equivalent.
> **Phase 42.5X (Wave 5 module 3 of 4).** Founder: Matthew Wiseman, Wiseman Financial Technologies LLC.
