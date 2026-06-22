# Overlay Extensibility Specification (D6)

> **SPEC — NOT A BUILT OVERLAY. Spine modification forbidden for overlay attachment.**
> **LOCK-42.5.10 Overlay Discipline (FM-1/2/3) binds this document.**
> **Second overlay code may not ship without FM-2 precedence documentation satisfied.**

## Purpose

This document specifies how a future regulated vertical attaches a new compliance overlay to the Advisacor control spine **without modifying spine source code**. It extends the runtime attachment interface delivered in **42.5I** (`ops/compliance/overlay-attachment/`) and the FM discipline enforced in **42.5H** (`ops/compliance/overlay-discipline/`).

Machine-readable guard: `ops/compliance/overlay-extensibility/overlayExtensibilitySpecGate.ts` — spec integrity only; not an overlay implementation.

## What this spec is

- D6 deliverable for Phase 42.5 LOCK (**LOCK-42.5.10**)
- Attachment interface documentation extending **42.5A** `OverlayAttachmentContract` and **42.5I** per-tenant activation registry
- Per-tenant activation and evidence patterns auditable for SOC/HIPAA reviewers
- FM-2 precedence gate requirements before a second overlay ships
- PCI-DSS overlay attachment **outline** (illustration only — **not built**)

## What this spec is not

- Not a second overlay implementation (no `ops/compliance/overlays/pci-dss/` code tree at 42.5 LOCK)
- Not spine modification authority — overlays configure through declared slots only
- Not a substitute for counsel review of regulatory scope statements (FM-3)
- Not a bypass of **42.5O** PHI-boundary proof or probe poison cases

## Attachment interface (extends 42.5I)

A new overlay binds through opaque spine slots defined in **42.5A** `OverlayAttachmentContract`:

| Field | Role |
|---|---|
| `overlayRegistryKey` | Opaque overlay identity in `ops/compliance/overlays/{vertical}/` |
| `overlayInterfaceSlotReferenceIds` | Declared slot IDs the overlay may bind (audit, breach signal, regulated audit store) |
| `activationScopeReferenceId` | Per-tenant activation scope (customer/firm/client isolation from **42.5B**) |
| `regulatoryScopeStatementReferenceId` | FM-3 external scope artifact — no regulatory text in spine |
| `precedenceConfigurationReferenceId` | FM-2 opaque precedence config — most-restrictive-wins default |
| `attachmentStatus` | `inactive` → `pending_activation` → `active` lifecycle |

**42.5I runtime pattern:** `overlayActivationRegistry` builds activation records via `evaluateOverlayDiscipline()` before any overlay becomes `active`. PHI ingestion (**42.5M**) resolves overlay activation fail-closed.

### Hard rule: spine modification forbidden

Attaching or activating an overlay **must not** modify files under `ops/control-spine/`. Vertical compliance logic lives only under `ops/compliance/overlays/{vertical}/`. The spec gate denies any descriptor with `spineModificationAttempted: true` or `verticalComplianceLogicInSpine: true`.

## Per-tenant activation pattern

1. **Declare** overlay contracts and scope statement in `ops/compliance/overlays/{vertical}/contracts/`.
2. **Register** attachment descriptor with all **42.5I** reference IDs populated.
3. **Activate** per tenant via `BuildOverlayActivationRecordInput` — discipline evaluation runs before `activationRecordStatus: active`.
4. **Audit** lifecycle events (attach, detach, activate, deactivate) via **42.5D** audit spine.
5. **Deactivate** on healthcare tenants requires governance event (HIPAA overlay deactivation is not silent).

Tenant scope keys: `customerTenantId`, `firmTenantId`, `clientTenantId` with isolation dimensions from **42.5B**.

## Evidence pattern for new overlay audit

Each overlay attachment must cite resolvable D0 evidence paths at spec registration time:

| Evidence class | Example path |
|---|---|
| Spine panel / PHI boundary | `ops/control-spine/verification/panel-data-paths/D0_EVIDENCE.json` |
| Vertical pack scope | `ops/compliance/overlays/{vertical}/pack/D0_*_EVIDENCE.json` |
| Overlay discipline static tests | `ops/compliance/overlay-discipline/` (FM-1/2/3 cases) |

SOC-ready audit trail: activation records carry `disciplineEvaluationTrace`, `buildTrace`, and `auditEvent` from **42.5I**.

## FM-2 precedence gate (before second overlay ships)

**Default policy: most-restrictive-wins.**

Before any tenant carries two active overlays:

1. `fm2PrecedenceGateDeclared` must be `true` in the attachment proposal.
2. `precedenceConfigurationReferenceId` must reference a configuration containing `most-restrictive` (e.g. `scope:precedence:default-most-restrictive`).
3. `precedencePolicy` must be `most_restrictive_wins`.
4. Founder + counsel review of conflict scenarios documented in this spec and **42.5H** FM-2 stub.

The spec gate denies second-overlay proposals missing FM-2 documentation (`fm2-precedence-gate-required-before-second-overlay`).

### FM-1 retention interaction

When multiple overlays contribute retention floors, spine resolves **MAX** of attached overlay requirements (`policySource: max_of_overlays` in **42.5A** `RetentionConfigurationContract`). Overlays may not replace or loosen spine baseline (FM-1 violation → probe poison).

### FM-3 scope interaction

Each overlay declares explicit regulatory scope via external scope-statement artifact. Spine stores opaque reference IDs only. Scope exceedance is fail-closed (`fm3_scope_exceedance`).

## Declared overlay catalog (42.5 LOCK)

| Overlay | Registry key | Status | Namespace |
|---|---|---|---|
| HIPAA (42.5J–L) | `overlay:hipaa:42.5J` | **built** | `ops/compliance/overlays/hipaa/` |
| PCI-DSS (illustration) | `overlay:pci-dss:illustration-42.5Y` | **spec_only** | `ops/compliance/overlays/pci-dss/` (not built) |

`overlayExtensibilitySpecGate.getDeclaredOverlayCatalog()` returns the frozen catalog.

## PCI-DSS overlay attachment outline (illustration only — NOT BUILT)

**Status: `spec_only`. No code under `ops/compliance/overlays/pci-dss/` at 42.5 LOCK.**

Illustrative attachment outline for a future cardholder-data vertical:

| Step | Action |
|---|---|
| 1 | Define `PciDssOverlayScopeContract` in `ops/compliance/overlays/pci-dss/contracts/` (FM-3 scope: PCI DSS v4.0 SAQ-D service-provider subset — counsel-reviewed) |
| 2 | Map controls to spine slots: `regulated_compliant_audit_store_interface`, `audit_logging_event_interface` |
| 3 | Document retention contribution (FM-1 MAX merge) without loosening spine baseline |
| 4 | Satisfy FM-2 gate with HIPAA overlay already active on tenant |
| 5 | Produce D0 evidence pack before any tenant activation |
| 6 | Run **42.5O** probe extension for PCI-specific poison cases (future phase) |

**This outline is documentation only.** Building PCI-DSS overlay code is out of scope for Phase 42.5.

## Cross-references

| Module | Relationship |
|---|---|
| **42.5A** | `OverlayAttachmentContract`, `RetentionConfigurationContract` |
| **42.5H** | FM-1/2/3 `evaluateOverlayDiscipline()` |
| **42.5I** | Per-tenant `overlayActivationRegistry` |
| **42.5J–L** | HIPAA overlay (first built vertical) |
| **42.5O** | PHI-boundary probe + poison cases |
| **42.5X** | Trust package drafts cite overlay activation posture |

## Verification

- Static tests: `overlayExtensibilitySpecGate.staticTests.ts` (9 cases)
- D0 evidence: `scripts/d0-evidence-overlay-extensibility.js` → `D0_OVERLAY_EXTENSIBILITY_EVIDENCE.json`
- Verifier: CHK-46 (presence), CHK-47 (static + D0), CHK-48 (FM-2 + spine-modification + PCI-not-built invariants)

---

> **END SPEC.** Overlay extensibility is documented; PCI-DSS remains illustration-only until a future phase explicitly scopes implementation.
