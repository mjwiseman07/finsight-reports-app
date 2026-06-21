# Phase 42.5 Planning Document — Ready for Review (v1.8)

## Enterprise Trust & Compliance — Universal Control Layer + Pluggable Compliance Overlays

**Document Owner:** Matthew Wiseman  
**Company:** Wiseman Financial Technologies LLC  
**Product:** Advisacor  
**Phase:** Phase 42.5 — Enterprise Trust & Compliance  
**Status:** Planning — Ready for Review. NOT a light phase.  
**Depends On:** Phase 40 locked; Phase 40.5 locked; Phase 41.5 locked; Phase 42 LOCKED (`b11adcd`); 42N1/42O/42P VERIFIED v1.1  
**Blocks:** Phase 54 (Commercial Launch) — HARD BLOCKER (PHI customers = legal floor; all customers = procurement/trust floor)  
**Date:** June 20, 2026  
**Namespace:** `ops/control-spine/`, `ops/compliance/`, `ops/compliance/overlays/`, `docs/trust/`  
**Verifier:** `scripts/verify-ops-control-spine.js`  
**Probe:** `scripts/probe-ops-control-spine.js` (D0 red-team; calls exported verifier logic only)

---

## v1.8 Deltas from v1.7.3

> v1.8 — Operating-posture decision (founder, Q6/Q8 partial resolution): full control spine built to HIPAA + SOC 2 Type II grade for ALL customers from day one (no tiering); SOC evidence collection begins at launch so the Type II observation window accrues from the start; HIPAA overlay built and ready-to-attach (not deferred); year-1 launch is non-healthcare, with healthcare onboarding possible within months if demand appears. Q8 resolved (generic-baseline go-live). Q6 narrowed (evidence-from-day-one; auditor engagement after demand).

## v1.7.3 Deltas from v1.7.2

> v1.7.3 — Export-first wiring closure for PC-16 through PC-19. Surgical patch (three build-step lists only; no other changes): (1) 42.5B build steps add explicit "Export isolation evaluator (cross-tenant + firm-staff + client-side segregation) for 42.5O probe consumption (PC-01, PC-04, PC-08, PC-16, PC-17, PC-19)"; (2) 42.5C build steps add explicit "Export RBAC evaluator for 42.5O probe consumption (PC-11, PC-18)"; (3) 42.5P existing export step amended to "Export panel-path helpers for 42.5O probe (PC-02, PC-07, PC-08, PC-19)." Closes the producer-side counterpart to v1.7.2 Fix 4 — 42.5O Outputs already declare consumer-side exported helpers, but producing modules 42.5B/C/P did not restate the export obligation. No PC definitions, lock/exit criteria, dependency declarations, Maps-to lines, or other prose changed.

## v1.7.2 Deltas from v1.7.1

> v1.7.2 — Build-sequence soundness pass. Fixes from agent review of v1.7.1: (1) declare 42.5N explicit dependency on 42.5L; (2) re-order Wave 4 to Q → S → R → T → U so 42.5R Availability mapping has D9 available when needed; (3) declare 42.5Z explicit dependency on LOCK-42.5.4; (4) add explicit PC-14 export step to 42.5M; (5) annotate 42.5D so HIPAA-named symbol in spine namespace does not drift FM-3 scope (interface ID imported as opaque identifier; spine implements no HIPAA semantics); (6) extend mandatory poison cases from 15 to 20 (add PC-16 through PC-20: cross-firm-staff isolation, client-side reading firm-internal data, intra-firm non-PHI RBAC scope violation, non-PHI cross-tenant panel leak, PHI-derived-learning bright line); (7) correct 42.5Q and 42.5R "Maps to" so LOCK-42.5.4 reads as prerequisite, not satisfied-here; (8) add LOCK-42.5.2 dependency note to EXIT-54.7 Path A/B carve-out; (9) rephrase 42.5L "flips to implemented here" so it does not imply mutation of locked Phase 42 source.

## v1.7.1 Deltas from v1.7

- **42.5G header restored** — `#### 42.5G Industry-Config Tenant-Attribute Isolation` reinserted above module body (was dropped in v1.7 edit).
- **Phase 42 lock filename confirmed** — repo file is [`PHASE_42S_LOCK.md`](PHASE_42S_LOCK.md) (Phase 42S lock module); dependency link unchanged.

## v1.7 Deltas from v1.6

> v1.7 — Filename correction (`PHASE_42_5S_LOCK.md` → `PHASE_42_5_LOCK.md`), D0 terminology disambiguation (Wave 1 = sub-proofs; Wave 3 = D0 PHI-boundary proof), formal numbering of the 15 mandatory poison cases, LOCK-42.5.3 gate language tightening, 42.5K/42.5V de-duplication, 42.5V explicit dependency on 42.5Q, Wave 4 GL-2 gate language clarified, 42.5AB founder LOCK-42.5.1 sign-off step added, Architectural Position diagram arrow direction corrected.

## v1.6 Deltas from v1.5

- **Module Order expanded to full depth** — every module (42.5A–42.5AB) now has Namespace, Outputs, Guardrails, and numbered Build steps (matches Phase 41.5 detail level).
- **Wave index summary** added at top of Module Order (quick-scan bullet list per wave).
- **Recommended First Implementation** expanded to numbered full build sequence.

## v1.5 Deltas from v1.4

- Full **Module Order and Build Steps** (Waves 1–6; 42.5A–42.5AB) added — mirrors Phase 41.5 / Phase 42 planning structure.
- **Exit Criteria**, **Non-Goals**, **Architectural Position**, **Verifier Design**, **Namespace and Build Conventions**, and **Recommended First Implementation** sections added.
- Verifier and probe script paths declared (not yet built).

## v1.4 Deltas from v1.3 (for reviewer / Janice convenience)

- D7 LLM-subprocessor rule strengthened: BAA required by default; non-PHI guarantee only if technically spine-enforced AND part of the D0 proof (no soft policy "OR").
- EXIT-54.7 fixed (was vacuous for Path A).
- New "Two-person-shop right-sizing" subsection under Scope Boundaries.
- D9 RPO/RTO placeholder numbers added (founder-set, auditor-confirmed).
- Log-retention durations committed as baseline numbers (counsel may raise).
- NPRM contingency given a concrete 5-business-day trigger runbook.
- Q6 remains FULLY OPEN (no default) — founder buyer-mix not yet known.
- Source-grade note added for current secondaries.

## Revision Note (v1.2 → v1.3 → v1.4)

v1.3 incorporated the Perplexity verification + architecture pressure-test (Claude-re-verified where material). v1.4 incorporates Perplexity's review-of-v1.3 (11 changes; Claude-vetted). Q6 deliberately left open per founder (early-buyer mix not yet known).

---

## The One Distinction That Governs This Doc

Two different layers, often conflated. 42.5 is the FIRST; the SECOND is future.

**CONTROL LAYER (this phase, 42.5):** Security + compliance. Isolation, role-based access, audit, encryption, auth. VERTICAL-AGNOSTIC. One spine, all verticals, identical. Plus compliance overlays that switch on per regulated vertical (HIPAA now).

**KNOWLEDGE STACK (separate, per-vertical, future phases):** Industry intelligence — treatments, KPIs, disclosures, benchmarks specific to a vertical. Phase 42 built the HEALTHCARE stack. Manufacturing/retail/others each need their own, modeled on the healthcare template, as phases AFTER 42.5.

42.5 builds the control layer for ALL verticals. It does NOT build the manufacturing/retail/other knowledge stacks. They are the roadmap that follows.

---

## Command Center Relationship to the Control Layer

(STANDING INVARIANT — APPLIES TO 42.5 AND EVERY KNOWLEDGE-STACK PHASE)

The command center shows industry-specific panels (manufacturing variances; PPD for healthcare; fund balances for fund accounting; encumbrances for municipalities). Governed by one split holding for EVERY panel in EVERY vertical:

**PANEL SELECTION / LAYOUT (which panels exist for this customer):** Driven by INDUSTRY CONFIGURATION, not the control layer. The selection LOGIC is not access-filtered — it determines WHICH panels exist, not what they show.

**PANEL DATA (what fills the panels):** ALWAYS flows through the control spine (isolation + role-based/persona access) and, where applicable, the relevant compliance overlay (HIPAA for healthcare PHI). NO EXCEPTIONS. Frame is config; contents are control-gated.

**TENANT-ATTRIBUTE CLARIFICATION:** industry classification is ITSELF a sensitive tenant attribute — knowing which customers are healthcare providers is information worth protecting. Industry-config storage INHERITS spine isolation, even though the selection logic is not access-filtered.

**ARCHITECTURE POSITION:** the command center is a CONSUMER of the control layer, not part of it. Spine underneath → command center on top → knowledge stacks define panels → panel data flows UP through the spine (+ overlay) into them.

**ISOLATION-PROOF REQUIREMENT (every phase):** panels are where data becomes VISIBLE, so panel data paths are where a leak would be SEEN. Every vertical's D0-equivalent proof MUST include that vertical's panel data paths. Prove the rendered panel respects the tenant/persona/PHI boundary — do not assert it.

---

## Scope Boundaries (READ FIRST — REDLINE EXPECTED)

THIS IS NOT A LIGHT PHASE. It builds and PROVES real controls, obtains third-party attestation (SOC 1 + SOC 2 Type II), and stands up a HIPAA compliance pack. External auditors and HIPAA counsel are required.

**TWO-PERSON-SHOP RIGHT-SIZING:** "NOT a light phase" refers to the AUDIT and PROOF effort, not the operational footprint. Some standard SOC 2 controls (segregation of duties, change-management peer review, incident-response on-call) scale awkwardly to a two-owner shop and require documented COMPENSATING CONTROLS rather than headcount. D8 (vuln + pentest), D9 (BCP/DR), and D10 (change management) are sized to a two-person operation with compensating-control documentation, not enterprise staffing. The auditor and HIPAA counsel will pressure-test these compensating-control documents; that is expected.

Advisacor is a MULTI-INDUSTRY financial-automation platform. Healthcare is one served vertical; manufacturing, retail, and others are equally in scope.

**SPINE (universal, all verticals, identical):** customer/firm/client isolation; role-based access across all personas; audit logging; encryption (at rest + in transit) WITH documented key management; authentication. Attested platform-wide by SOC 1 + SOC 2 Type II.

**OVERLAYS (pluggable, per regulated vertical):** HIPAA Security Rule + BAA, attached ONLY to the healthcare PHI path. Non-healthcare verticals carry NO overlay. Room for future overlays (e.g. PCI-DSS) on the same spine.

**DESIGN RULE (binding):** the shared control spine contains NO vertical-specific logic. All vertical-specific compliance lives in overlays that attach to the spine. Spine tested ONCE, covers every vertical. (See Overlay Discipline for failure modes.)

**Customer types (all):** accounting/CPA firms; businesses (direct); bookkeepers; fractional CFO firms.

**Personas (all):** firm admin, staff, client-side controller/owner, business-owner, any declared persona — each constrained by role-based access within the isolation boundary.

**What 42.5 is NOT:** not the per-vertical knowledge stacks; not healthcare-only; not ISO 27001 / FedRAMP / PCI-DSS pursuit; not a final-rule HIPAA build; not a clinical-data platform.

Redline this section before reviewing the rest if the framing is wrong.

---

## Operating Posture (FOUNDER DECISION — binding)

**UNIFORM HIGH-GRADE SPINE.** The control spine is built and operated to HIPAA + SOC 2 Type II grade for EVERY customer from day one — encryption, isolation, audit logging, RBAC/persona access, key management. There is NO tiered "non-healthcare-grade now, healthcare-grade later." One standard, maximal, for all tenants. A non-healthcare customer's data is well-protected non-PHI data — not lesser-protected data.

**SOC EVIDENCE FROM LAUNCH.** Because a Type II report attests controls OPERATING over a past window, audit-logging (42.5D) and retention (42.5T) run from launch so the observation window accrues from day one. Formal CPA engagement happens AFTER initial demand is validated, but the evidence machinery is live at launch — compressing time-to-issued-Type-II rather than starting a cold clock later. This makes 42.5D and 42.5T launch-critical, and conceptually starts the 42.5Z observation window's EVIDENCE collection at GL-3, with formal window-start recorded when the CPA engages (LOCK-42.5.4).

**HIPAA OVERLAY: BUILT, READY-TO-ATTACH.** The HIPAA overlay (Wave 2: 42.5H–L) is built during 42.5, NOT deferred. Year-1 launch is non-healthcare (single-business + accounting firms), but healthcare may onboard within months if demand appears (founder has hospital/management connections). When a PHI customer arrives, the overlay ATTACHES onto already-HIPAA-grade controls — the overlay is the legal/regulatory wrapper (BAA, 45 CFR 164 scope statement, PHI-path routing), NOT a security upgrade. The security is already there; the overlay adds the legal regime that applies where PHI exists.

**THE ONE CONDITIONAL EDGE.** Controls = uniform maximal grade for all. HIPAA OVERLAY (BAA + regulatory scope) = attaches only to the PHI path, because HIPAA is a legal regime tied to PHI, not a security tier. A bakery's data does not become PHI by being well-protected. GL-4 (healthcare onboarding) still requires the overlay live + BAA signed before any PHI flows — controls-before-customers holds.

**CONSEQUENCE FOR BUILD ORDER:** nothing is built "light." Full spine (Wave 1) to max grade; audit-logging + retention live from launch for SOC evidence; HIPAA overlay (Wave 2) built ready-to-attach; full D0 (Wave 3) including PHI cases; SOC packs (Wave 4) built early so the window can formalize on engagement. Only the auditor ENGAGEMENT and report ISSUANCE wait for demand — the evidence collection does not.

---

## Purpose

Phase 42 (locked `b11adcd`) made Advisacor industry-aware and proved the healthcare knowledge stack. 42.5 makes the WHOLE multi-industry platform sellable and compliant by building+proving one universal control spine and obtaining audit-backed trust artifacts every buyer type needs — plus the HIPAA overlay for the healthcare slice. Without 42.5, Phase 54 has product readiness but no trust/compliance floor.

---

## Goals

1. **G1.** Build ONE universal control spine (isolation, RBAC/personas, audit, encryption + key management, auth) serving all verticals identically.
2. **G2.** PROVE the spine holds (D0) before any auditor spend.
3. **G3.** Issue SOC 1 + SOC 2 Type II, platform-wide, one CPA firm.
4. **G4.** Stand up the HIPAA overlay (45 CFR 164 Subparts A/C) for the healthcare path; BAA-ready.
5. **G5.** Hold a HIPAA NPRM-readiness gap analysis (sized, owned, primary-source verified).
6. **G6.** Architect overlays as pluggable so future regulated verticals attach to the same spine without rebuilding it.

---

## Exit Criteria

Phase 42.5 is complete and lockable only when all are true:

- Control-spine verifier exits `0`; D0 red-team probe exits `0`.
- TypeScript is clean across `ops/control-spine/`, `ops/compliance/`, and `docs/trust/`.
- **LOCK-42.5.1** through **LOCK-42.5.11** satisfied (see Lock Conditions).
- **EXIT-54.0** through **EXIT-54.8** satisfied for Phase 54 hard-blocker clearance (see Hard-Blocker Exit Criteria).
- D0 control-spine verification COMPLETE before any auditor engagement spend (**LOCK-42.5.3**).
- Spine contains NO vertical-specific compliance logic; HIPAA lives in overlay only (Overlay Discipline FM-1/2/3).
- Phase 42 HIPAA integration points from 42Q implemented (`auditLoggingEventInterfaceReferenceId`, `breachDetectionSignalInterfaceReferenceId`, `hipaaCompliantAuditStoreInterfaceReferenceId`).
- GL-3 PHI-contamination gate in place before non-healthcare customer onboarding (EXIT-54.8).
- Public trust page follows true-claims-only discipline; no premature SOC/HIPAA badges.
- SOC 1 + SOC 2 reports issued per Q6 path (Type II under Path A; Type I + Type II underway under Path B).
- Professional hand-offs completed where required (CPA firm, HIPAA counsel, pentest firm — not substitutable by AI verification).

**Build cadence:** one module at a time; no per-module time targets. Sequence is authoritative; time estimates are non-binding. SOC observation window is the long pole and may run in parallel with later waves once GL-2 is reached.

---

## Non-Goals

Phase 42.5 does not include:

- Per-vertical knowledge stacks (42.51–42.54 and beyond) — follow 42.5 per Knowledge-Stack Roadmap.
- Healthcare-only platform posture — spine is universal; HIPAA is an overlay.
- ISO 27001, FedRAMP, or PCI-DSS certification pursuit.
- Final-rule HIPAA Security Rule build (current rule + NPRM gap register only).
- Clinical-data platform capabilities.
- Premature public trust-page claims ("in progress", "coming soon", undated reports).
- Building a second regulated overlay (PCI-DSS, etc.) — D6 spec only.
- Substituting AI verification for licensed CPA attestation, HIPAA counsel sign-off, or qualified pentest.

Anything proposed mid-build that falls in this list is deferred.

---

## Architectural Position

```text
Evidence
-> Observations
-> Packages
-> Memory
-> Knowledge
-> Methodology
-> Actions
-> Role Execution
-> Organizational Coordination (Phase 40)
-> Integration (Phase 40.5)
-> Standards Intelligence (Phase 41.5)
-> Industry Intelligence (Phase 42)
-> Universal Control Spine + Compliance Overlays (Phase 42.5)   <-- THIS PHASE
-> Knowledge Stacks per vertical (42.51+; AFTER 42.5) ──defines panels──▶ Command Center (consumer; panel selection = config, panel data = spine-gated)
```

Phase 42.5 owns the **control layer** — not industry intelligence content, not command-center layout logic. The command center is a consumer: industry configuration selects panels; panel data ALWAYS flows through the spine (+ overlay where applicable). Phase 42 declared PHI tagging discipline and HIPAA integration **points**; Phase 42.5 **implements** the spine and HIPAA overlay those points attach to.

**Spine vs overlay (binding):**

| Layer | Scope | Tested |
|---|---|---|
| Control spine | All verticals, identical | Once, platform-wide |
| Compliance overlay | Per regulated vertical (HIPAA now) | Per overlay, attaches to spine |

---

## Module Order and Build Steps

Every module from 42.5B onward imports contract types only from 42.5A. No module injects vertical-specific compliance logic into the spine. Overlays configure the spine; they never inject (FM-1).

Phased go-live gates (**GL-1** through **GL-5**) track operational rollout; module waves track build sequence. Controls LEAD customers — no GL-3/GL-4 until D0 passes.

**Build cadence (authoritative):** one module at a time → run verifiers + TypeScript → audit single module → commit → next module. No per-module time targets.

### Wave Index (quick scan)

**Wave 1 — Control-Spine Foundation**

- **42.5A** Control-Spine Contracts (**FIRST**)
- **42.5B** Tenant/Firm/Client Isolation
- **42.5C** Role-Based Access & Personas
- **42.5D** Audit Logging Spine
- **42.5E** Encryption + Key Management
- **42.5F** Authentication Boundary
- **42.5G** Industry-Config Tenant-Attribute Isolation

**Wave 2 — Overlay Architecture + HIPAA Overlay**

- **42.5H** Overlay Discipline Enforcement
- **42.5I** Overlay Attachment Interface
- **42.5J** HIPAA Overlay — Contracts & Scope
- **42.5K** HIPAA Overlay — Current-Rule Safeguards Path
- **42.5L** Phase 42 HIPAA Integration Points

**Wave 3 — Verification & Panel Data Paths (D0 gate — before auditor spend)**

- **42.5M** PHI Ingestion Detection/Refusal Gate
- **42.5N** PHI-Boundary Verification Harness
- **42.5O** Control-Spine Verifier + Red-Team Probe
- **42.5P** Panel Data Path Isolation Proof

**Wave 4 — SOC Readiness & Operational Programs**

- **42.5Q** SOC 1 Readiness Pack
- **42.5S** Operational Control Programs (D8/D9/D10)
- **42.5R** SOC 2 Readiness Pack
- **42.5T** Log-Retention Configuration Baseline
- **42.5U** Subprocessor / Vendor + BAA Stack

**Wave 5 — HIPAA Pack, NPRM Register & Trust Artifacts**

- **42.5V** HIPAA Compliance Pack
- **42.5W** NPRM Gap Register
- **42.5X** Trust Package Drafts
- **42.5Y** Overlay-Extensibility Spec

**Decision Fork (after Wave 3 PASS, before Wave 6)**

→ **LOCK-42.5.2 — Q6:** Path A (straight Type II) vs Path B (Type I first, Type II in-flight)

**Wave 6 — Observation Window, Engagements & Lock**

- **42.5Z** SOC Observation Window Start
- **42.5AA** Professional Engagements Coordination
- **42.5AB** Phase 42.5 Final Audit and Lock

---

### Wave 1 — Control-Spine Foundation

#### 42.5A Control-Spine Contracts (**FIRST**)

Create shared type-only contracts for the universal control spine and overlay attachment interface. No runtime enforcement in this module — contracts only.

**Namespace:** `ops/control-spine/contracts/`

**Outputs:**

- `ControlSpineIsolationContract` — customer/firm/client boundary identifiers
- `PersonaRbacMatrixContract` — persona → authorized surface mapping
- `AuditEventContract` — platform audit event shape + retention config hook (FM-1)
- `EncryptionKeyCustodyContract` — key custody, rotation, separation metadata
- `AuthBoundaryContract` — session → isolation binding
- `OverlayAttachmentContract` — per-tenant activation, scope statement (FM-3), precedence hook (FM-2)
- `RetentionConfigurationContract` — per-tenant retention value overlays SET (FM-1)
- Phase 42 handoff markers: PHI tagging consumption (42H), HIPAA integration point IDs (42Q)

**Guardrails:**

- `containsVerticalComplianceLogic: false` on ALL spine contracts
- `executable: false` on all contract modules
- Phase 40, 40.5, 41.5, and 42 handoff hashes consumed where applicable
- Built first, audited, and committed before 42.5B

**Build steps:**

1. Create `ops/control-spine/contracts/` directory and index exports.
2. Define spine contracts (isolation, RBAC, audit, encryption, auth, retention).
3. Define overlay attachment contracts (activation, FM-3 scope statement, FM-2 precedence stub).
4. Add Phase 42 consumption markers for 42H and 42Q interface reference IDs.
5. Add verifier checks for contract presence and `containsVerticalComplianceLogic: false`.
6. Audit module → PASS; commit before 42.5B.

**Maps to:** G1; FM-1/2/3 contract foundation; LOCK-42.5.10 precursor.

#### 42.5B Tenant/Firm/Client Isolation

Implement the customer/firm/client isolation boundary. Cross-tenant data reach is fail-closed and adversarially testable.

**Namespace:** `ops/control-spine/isolation/`

**Outputs:**

- Isolation boundary evaluator (customer, firm, client scopes)
- Fail-closed deny on cross-tenant reach
- Firm-staff ↔ other firm's client data blocked
- Client-side persona ↔ firm-internal data blocked
- Isolation audit events wired to 42.5D

**Guardrails:**

- Deny-by-default; no silent fallback to broader scope
- Imports contracts from 42.5A only
- No HIPAA-specific logic in spine (PHI boundary is overlay + 42.5N)
- `executable: false` where applicable per namespace convention

**Build steps:**

1. Implement isolation scope types from 42.5A contracts.
2. Build boundary evaluator with fail-closed semantics.
3. Wire firm-staff / client-side persona segregation cases.
4. Emit audit events on boundary evaluation (pass and deny).
5. Add static construction tests for cross-tenant poison cases.
6. Export isolation evaluator (cross-tenant + firm-staff + client-side segregation) for 42.5O probe consumption (PC-01, PC-04, PC-08, PC-16, PC-17, PC-19).
7. Audit module → PASS; commit.

**Maps to:** sub-proof (cross-tenant isolation); feeds D0; GL-1 (isolation first).

#### 42.5C Role-Based Access & Personas

Implement deny-by-default RBAC across all declared personas within the isolation boundary.

**Namespace:** `ops/control-spine/rbac/`

**Outputs:**

- Persona registry (firm admin, staff, client-side controller/owner, business-owner, declared personas)
- Authorized-surface matrix per persona
- Deny-by-default access evaluator composing with 42.5B isolation
- RBAC audit events

**Guardrails:**

- No persona sees surfaces outside its matrix
- RBAC never bypasses isolation boundary
- Persona definitions are spine-level (not vertical-specific)

**Build steps:**

1. Define persona registry from 42.5A `PersonaRbacMatrixContract`.
2. Build authorized-surface matrix (deny-by-default).
3. Compose RBAC evaluator with 42.5B isolation evaluator.
4. Add static tests: each persona sees only authorized surface.
5. Wire audit events for grant/deny decisions.
6. Export RBAC evaluator for 42.5O probe consumption (PC-11, PC-18).
7. Audit module → PASS; commit.

**Maps to:** sub-proof (role-based access matrix); feeds D0; GL-1.

#### 42.5D Audit Logging Spine

Platform-wide audit logging with retention configuration exposed for overlay attachment (FM-1).

**Namespace:** `ops/control-spine/audit/`

**Outputs:**

- Platform audit event writer
- Retention configuration consumer (per-tenant / MAX-of-overlays per FM-1)
- Audit event schema aligned to 42.5A `AuditEventContract`
- Interface declaration toward 42Q `auditLoggingEventInterfaceReferenceId` (implemented in 42.5L)

**Guardrails:**

- Audit trail entries referencing PHI inherit PHI tag from Phase 42 (42H) — route declared for 42.5L HIPAA store
- Retention is configuration, not hardcoded HIPAA logic in spine
- 42Q interface ID names (e.g. `auditLoggingEventInterfaceReferenceId`) are imported as opaque identifiers from the locked Phase 42 handoff. Spine implements no HIPAA semantics — the identifier is a slot that 42.5L (overlay namespace) binds the HIPAA-specific implementation into. Future overlays attach via additional slots; spine code never branches on overlay type.
- Tamper-evident append-only discipline documented

**Build steps:**

1. Implement audit event writer from 42.5A contract.
2. Wire retention configuration hook (FM-1).
3. Declare `auditLoggingEventInterfaceReferenceId` integration point (stub until 42.5L).
4. Add static tests for event shape and retention config binding.
5. Document PHI inheritance routing requirement from 42H.
6. Audit module → PASS; commit.

**Maps to:** sub-proof (audit logging); feeds D0; D1/D2 evidence; GL-1.

#### 42.5E Encryption + Key Management

Encryption at rest and in transit with documented key custody, rotation, and separation.

**Namespace:** `ops/control-spine/encryption/`

**Outputs:**

- At-rest encryption boundary markers
- In-transit encryption requirements
- Key custody documentation structure
- Key rotation schedule and separation rules
- FIPS module selection hook (deferred to H-5 — document placeholder)

**Guardrails:**

- SOC 2 CC6.1 mapping documented
- HIPAA 164.312(a)(2)(iv) mapping documented
- Keys do not cross isolation boundaries
- FIPS-validated module selection is professional hand-off (H-5), not in-house guess

**Build steps:**

1. Implement encryption boundary contracts from 42.5A.
2. Document key custody, rotation, and separation procedures.
3. Wire at-rest and in-transit enforcement points.
4. Add static tests for key-boundary markers.
5. Record H-5 deferral placeholder for FIPS module selection.
6. Audit module → PASS; commit.

**Maps to:** sub-proof (key management); feeds D0; D2; GL-1.

#### 42.5F Authentication Boundary

Authentication integration enforcing spine isolation on every authenticated session.

**Namespace:** `ops/control-spine/auth/`

**Outputs:**

- Session → tenant/firm/client binding
- Auth boundary evaluator composing with 42.5B isolation
- No anonymous cross-tenant data paths
- Session audit events

**Guardrails:**

- Every authenticated request resolves to exactly one isolation scope
- Auth failure is fail-closed (no degraded cross-tenant access)
- MFA posture documented for SOC/HIPAA (implementation per auditor/counsel guidance)

**Build steps:**

1. Implement auth boundary from 42.5A `AuthBoundaryContract`.
2. Bind session identity to isolation scope (42.5B).
3. Reject unauthenticated cross-tenant paths.
4. Add static tests for session binding and fail-closed auth.
5. Wire session lifecycle audit events.
6. Audit module → PASS; commit.

**Maps to:** sub-proof (auth boundary); feeds D0; GL-1.

#### 42.5G Industry-Config Tenant-Attribute Isolation

Industry classification is a sensitive tenant attribute. Industry-config storage inherits spine isolation.

**Namespace:** `ops/control-spine/tenant-attributes/`

**Outputs:**

- Industry-config storage with isolation inheritance
- Tenant-attribute access evaluator (who may read industry classification)
- Separation from panel selection logic (selection is config; storage is control-gated)

**Guardrails:**

- Knowing which customers are healthcare providers is protected information
- Panel selection logic is NOT access-filtered; industry-config STORAGE is
- Command Center invariant enforced: frame = config, contents = control-gated

**Build steps:**

1. Define industry-config tenant attribute schema.
2. Apply 42.5B isolation to industry-config read/write paths.
3. Document split: selection logic vs storage access.
4. Add static tests: industry-config not readable cross-tenant.
5. Wire audit events for industry-config access.
6. Audit module → PASS; commit.

**Maps to:** sub-proof (tenant-attribute isolation); feeds D0; Command Center tenant-attribute clarification; GL-1 complete.

**Wave 1 complete gate:** All Wave 1 modules audited PASS. GL-1 internal spine components verified via sub-proofs for 42.5A–G. No customer access.

> Note: "Sub-proof" denotes per-module evidence of correct implementation. "D0" is reserved for the Wave 3 system-wide PHI-boundary proof (42.5O). The two are not interchangeable.

---

### Wave 2 — Overlay Architecture + HIPAA Overlay

#### 42.5H Overlay Discipline Enforcement

Implement FM-1, FM-2, and FM-3 runtime discipline so overlays configure the spine but never inject logic into it.

**Namespace:** `ops/compliance/overlay-discipline/`

**Outputs:**

- FM-1 retention resolver: per-tenant config OR MAX of attached overlay requirements
- FM-2 precedence/conflict-resolution stub (most-restrictive-wins default documented)
- FM-3 scope-statement validator: each overlay must declare explicit regulatory scope
- Violation detection hooks for probe (42.5O)

**Guardrails:**

- Overlay attempting to inject spine logic → fail-closed / probe poison case PC-08
- HIPAA overlay scope limited to 45 CFR 164 Subparts A/C (FM-3)
- Second overlay cannot ship without FM-2 precedence documentation

**Build steps:**

1. Implement FM-1 retention configuration resolver on spine.
2. Document and stub FM-2 precedence for future multi-overlay.
3. Build FM-3 scope-statement validator for overlay registration.
4. Add static tests for FM-1 MAX retention and FM-3 scope rejection.
5. Export violation detectors for 42.5O probe.
6. Audit module → PASS; commit.

**Maps to:** LOCK-42.5.10; D6 precursor; FM-1/2/3.

#### 42.5I Overlay Attachment Interface

Per-tenant overlay activation without spine modification. Runtime side of pluggable overlay architecture.

**Namespace:** `ops/compliance/overlay-attachment/`

**Outputs:**

- Per-tenant overlay activation registry
- Attachment/evidence pattern for audit
- Overlay lifecycle events (attach, detach, activate, deactivate)
- Interface spec inputs for D6 (42.5Y)

**Guardrails:**

- Activating an overlay does not modify spine source code
- Deactivating HIPAA overlay on healthcare tenant requires governance event
- Evidence pattern is auditable and SOC-ready

**Build steps:**

1. Define overlay activation registry from 42.5A `OverlayAttachmentContract`.
2. Implement attach/detach lifecycle with audit events.
3. Wire per-tenant activation without spine code changes.
4. Document evidence pattern for SOC/HIPAA auditors.
5. Add static tests for activation isolation per tenant.
6. Audit module → PASS; commit.

**Maps to:** G6; D6 runtime side.

#### 42.5J HIPAA Overlay — Contracts & Scope

HIPAA overlay type-only contracts with explicit regulatory scope statement.

**Namespace:** `ops/compliance/overlays/hipaa/contracts/`

**Outputs:**

- `HipaaOverlayScopeContract` — explicit 45 CFR 164 Subparts A/C scope (FM-3)
- `HipaaSafeguardContract` — admin/physical/technical/org safeguard shapes
- `BaaExecutionContract` — BAA execution readiness metadata
- `BusinessAssociateRoleContract` — Advisacor as BA (160.103) on PHI path

**Guardrails:**

- FM-3: scope statement reads "45 CFR 164 Subparts A/C, period"
- No SOC controls, no PCI controls, no clinical-data controls in HIPAA overlay contracts
- `containsVerticalComplianceLogic: true` ONLY inside overlay namespace, never in spine

**Build steps:**

1. Create HIPAA overlay contracts directory.
2. Define scope contract with FM-3 literal regulatory statement.
3. Define safeguard contracts per Subpart C sections.
4. Define BAA and BA role contracts.
5. Add verifier checks for scope statement presence.
6. Audit module → PASS; commit.

**Maps to:** G4; Anchor B; FM-3.

#### 42.5K HIPAA Overlay — Current-Rule Safeguards Path

Implement healthcare-overlay safeguards path for the current Security Rule (not final-rule NPRM build).

**Namespace:** `ops/compliance/overlays/hipaa/safeguards/`

**Outputs:**

- Administrative safeguard hooks (164.308)
- Physical safeguard hooks (164.310)
- Technical safeguard hooks (164.312)
- Organizational/BAA hooks (164.314)
- Documentation hooks (164.316)
- Two-owner compensating-control documentation templates

**Guardrails:**

- Current rule only; NPRM sizing lives in D4 (42.5W), not here
- Compensating controls documented for two-person shop (Q7)
- Janice PHI-adjacent field input (Q7a): classify which financial fields are genuinely PHI-adjacent in real provider data; output feeds D3 risk-analysis scope and is consumed by 42.5V

**Build steps:**

1. Implement safeguard path structure from 42.5J contracts.
2. Wire admin/physical/technical/org safeguard hooks.
3. Add compensating-control documentation templates for two-owner shop.
4. Document 164.316 documentation retention floor (6 years).
5. Add static tests for safeguard path activation on healthcare-overlay tenants only.
6. Audit module → PASS; commit.

**Maps to:** D3 policy/control implementation; GL-4 precursor.

#### 42.5L Phase 42 HIPAA Integration Points

Implement the three 42Q-declared interfaces. Phase 42 tagged PHI; Phase 42.5 owns live HIPAA store and breach-detection wiring.

**Namespace:** `ops/compliance/overlays/hipaa/integration/`

**Outputs:**

- `auditLoggingEventInterfaceReferenceId` — live HIPAA audit event routing
- `breachDetectionSignalInterfaceReferenceId` — breach detection signal interface
- `hipaaCompliantAuditStoreInterfaceReferenceId` — HIPAA-compliant audit store
- PHI-tagged audit trail inheritance from 42H wired to HIPAA store

**Guardrails:**

- Implements interfaces declared in [`buildHealthcarePHIDiscipline.ts`](lib/intelligence/synthetic/industry/phi-healthcare/buildHealthcarePHIDiscipline.ts)
- `hipaaControlsImplementedByPhase42_5NotHere: true` is asserted in 42Q (locked) and SATISFIED here in 42.5L by interface implementation + static tests + 42.5N adversarial pass. Phase 42 source remains immutable; 42.5L's audit pass is the consumer-side evidence that closes the deferred assertion. No write back into 42Q source.
- Non-healthcare tenants do not route to HIPAA store

**Build steps:**

1. Read 42Q interface reference IDs from Phase 42 locked handoff.
2. Implement HIPAA-compliant audit store interface.
3. Implement audit logging event routing for PHI-tagged events.
4. Implement breach detection signal interface (declaration + wiring).
5. Add static tests: PHI audit events route to overlay path only.
6. Run Phase 42 industry verifier regression (still defers live HIPAA to 42.5).
7. Audit module → PASS; commit.

**Maps to:** Dependencies on 42Q; D3 incident response; GL-4.

**Wave 2 complete gate:** HIPAA overlay attachable per tenant; 42Q interfaces wired; FM discipline enforced. GL-4 not yet open (needs Wave 3 D0 + Wave 5 D3/BAA).

---

### Wave 3 — Verification & Panel Data Paths (D0)

**Gate:** Wave 3 must PASS before auditor engagement. This is the 42.5 analogue of Phase 42's 22-poison probe.

**LOCK-42.5.3 — D0 Control-Spine + PHI-Boundary Proof Lock.** D0 is locked when: (a) 42.5O verifier passes on the production spine + HIPAA overlay configuration at lock time; (b) 42.5O probe script returns zero violations across all 20 mandatory poison cases (PC-01 through PC-20, numbered in Verifier Design); (c) 42.5N harness confirms PHI-boundary AND PHI-derived-learning bright-line behavior under the documented test matrix; (d) 42.5P panel-data-path proof shows no PHI in non-HIPAA-overlay panels AND no cross-tenant non-PHI leak in any rendered panel. LOCK-42.5.3 does NOT certify future tenants or future overlay/spine changes — any change to the control spine, HIPAA overlay, or addition of a new industry overlay requires re-running 42.5O verifier + probe + 20 poison cases and re-locking. Re-lock obligation is enforced by GL-2.

Auditor engagement (**LOCK-42.5.4**) is permitted only after LOCK-42.5.3 is satisfied. Any spine or overlay change after LOCK-42.5.4 engagement requires re-running 42.5O verifier + probe + 20 poison cases before continued audit reliance.

#### 42.5M PHI Ingestion Detection/Refusal Gate

PHI-detection or refusal control on ingestion for non-healthcare-overlay tenants — required before GL-3 non-healthcare onboarding.

**Namespace:** `ops/control-spine/phi-ingestion-gate/`

**Outputs:**

- Ingestion-time PHI detection or refusal control
- Contract-clause alternative documented (if detection not technically feasible for a path)
- GL-3 RISK-1 mitigation: block inadvertent PHI in non-overlay tenants
- Gate audit events

**Guardrails:**

- Required before GL-3 (EXIT-54.8)
- Employee-benefit files and AR-with-clinic-customer scenarios called out in GL-3 caveats
- Spine alone does not catch accidental PHI — this gate or contract clause is mandatory

**Build steps:**

1. Define PHI ingestion gate contract and evaluation point.
2. Implement detection/refusal on ingestion boundary for non-healthcare-overlay tenants.
3. Document contract-clause alternative for counsel review.
4. Add probe poison case PC-14 (PHI accessible via API auth path bypassing HIPAA overlay session controls).
5. Export PHI-ingestion detection evaluator for 42.5O probe consumption (PC-14). Probe never re-implements detection logic inline.
6. Wire gate audit events.
7. Audit module → PASS; commit.

**Maps to:** EXIT-54.8; GL-3 RISK-1 gate.

#### 42.5N PHI-Boundary Verification Harness

Prove PHI confined to healthcare overlay path; non-healthcare tenants cannot reach PHI; PHI-derived-learning bright line holds.

**Namespace:** `ops/control-spine/verification/phi-boundary/`

**Depends on:**

- **42.5L** — HIPAA integration interfaces (audit-store + breach-detection + audit-logging-event routing). 42.5L static tests pass at module audit; 42.5N is the first module to exercise the routing adversarially. 42.5L's audit pass is provisional pending 42.5N adversarial pass at LOCK-42.5.3.

**Outputs:**

- Adversarial PHI-boundary test harness
- PHI-derived-learning bright-line verification (extends Phase 42 industry probe bright-line case; feeds PC-related harness tests in 42.5N)
- Non-healthcare tenant PHI reach tests
- Documented evidence package for D0

**Guardrails:**

- Adversarial, fail-closed, documented — assert nothing untested
- Extends Phase 42 probe patterns; does not duplicate 42R (industry verifier stays separate)
- Evidence feeds D1, D2, and D3

**Build steps:**

1. Build PHI-boundary harness consuming 42H tags and 42.5L HIPAA path.
2. Add bright-line violation tests at ingestion boundary.
3. Add non-healthcare tenant PHI reach tests.
4. Export harness for 42.5O verifier and probe.
5. Generate D0 evidence package structure.
6. Audit module → PASS; commit.

**Maps to:** D0 PHI-boundary; Phase 42 dependency proofs.

#### 42.5O Control-Spine Verifier + Red-Team Probe

Create export-first verifier and red-team probe — the 42.5 analogue of 42R + 42R-probe.

**Namespace:** `scripts/verify-ops-control-spine.js`, `scripts/probe-ops-control-spine.js`

**Outputs:**

- `scripts/verify-ops-control-spine.js` — structural/static checks, exported `checks` array
- `scripts/probe-ops-control-spine.js` — adversarial poison cases, calls exported logic only
- Exported helpers: isolation, PHI-boundary, RBAC, panel-data-path evaluators
- CLI wrapper: `if (require.main === module)`

**Guardrails:**

- Export-first from first commit (same discipline as 42R H1)
- Probe NEVER re-implements verifier logic inline
- Mandatory 20 poison cases (floor; extend during red-team)
- `VERIFY_EXIT:0` and `PROBE_EXIT:0` required before LOCK-42.5.3

**Build steps:**

1. Create verifier with exported `checks` array.
2. Export isolation, PHI, RBAC, panel-path helpers.
3. Create probe calling exported helpers only.
4. Implement mandatory 20 poison cases PC-01 through PC-20 (see Verifier Design).
5. Wire CLI wrappers for both scripts.
6. Run full Wave 1–3 regression; confirm `VERIFY_EXIT:0` and `PROBE_EXIT:0`.
7. Audit module → PASS; commit.

**Maps to:** D0; LOCK-42.5.3; Verifier Design section.

#### 42.5P Panel Data Path Isolation Proof

Prove rendered command-center panels respect tenant/persona/PHI boundary. Panels are where data becomes visible.

**Namespace:** `ops/control-spine/verification/panel-data-paths/`

**Outputs:**

- Panel data path isolation test harness
- Command-center consumer path proofs (panel selection = config; panel data = spine-gated)
- Per-vertical panel proof template (healthcare first; extensible for 42.51+)
- D0 evidence for rendered panel boundary

**Guardrails:**

- Prove rendered panel respects boundary — do not assert it
- Isolation-proof requirement applies to every future knowledge-stack phase
- Panel selection logic is NOT access-filtered; panel DATA paths ARE

**Build steps:**

1. Identify command-center panel data retrieval paths.
2. Build harness proving tenant/persona/PHI boundary on rendered output.
3. Run healthcare panel proofs (PPD and related).
4. Document per-vertical proof template for future stacks.
5. Export panel-path helpers for 42.5O probe (PC-02, PC-07, PC-08, PC-19).
6. Audit module → PASS; commit.

**Maps to:** D0 panel data paths; Command Center invariant.

**Wave 3 complete gate:** D0 PASS (`VERIFY_EXIT:0`, `PROBE_EXIT:0`). **LOCK-42.5.3 satisfied.** Auditor engagement permitted (**LOCK-42.5.4**). EXIT-54.0 satisfied.

---

### Wave 4 — SOC Readiness & Operational Programs

#### 42.5Q SOC 1 Readiness Pack

SOC 1 Type II readiness artifacts for ICFR/financial-reporting assertions.

**Namespace:** `ops/compliance/soc/soc1/`, `docs/trust/soc1/`

**Outputs:**

- System description (platform boundary vs Phase 42/42M/42I namespace per LOCK-42.5.8)
- Control objectives → financial-reporting assertions matrix
- Control matrix with evidence references to D0
- Engagement readiness checklist
- 42O disclosure boundaries reflected in ICFR control scope

**Guardrails:**

- System description reviewed vs finalized 42/42M/42I namespace
- No benchmark-as-target language (42P posture)
- Evidence references D0 proofs, not assertions

**Build steps:**

1. Draft system description boundary (LOCK-42.5.8).
2. Map control objectives to financial-reporting assertions.
3. Build control matrix referencing D0 evidence.
4. Incorporate 42O disclosure boundaries into ICFR scope.
5. Prepare engagement readiness checklist for CPA firm.
6. Audit module → PASS; commit.

**Maps to:** D1; LOCK-42.5.4 prerequisite (readiness pack consumed at engagement); LOCK-42.5.8.

#### 42.5S Operational Control Programs

Vulnerability management, BCP/DR, and change management — sized for two-person shop with compensating controls.

**Namespace:** `ops/compliance/operational/`

**Outputs:**

- **D8:** Vulnerability scanning cadence, remediation SLA by severity, annual third-party pen test schedule (scope → H-4)
- **D9:** BCP/DR plan with RPO <= 24h, RTO <= 72h (founder-set, auditor-confirmed); backup strategy; tested-restoration log template
- **D10:** Change-management procedure — change request, peer review (other founder), rollback, change log
- Compensating-control documentation for segregation-of-duties limitations

**Guardrails:**

- Two-person-shop right-sizing: compensating controls, not enterprise staffing fiction
- Pentest scope/methodology deferred to qualified firm (H-4)
- RPO/RTO are starting targets; auditor confirms at engagement

**Build steps:**

1. Document vulnerability management program (D8).
2. Document BCP/DR with RPO <= 24h and RTO <= 72h (D9).
3. Document change-management procedure with peer-review = other founder (D10).
4. Write compensating-control narratives for two-owner shop.
5. Create tested-restoration log template.
6. Audit module → PASS; commit.

**Maps to:** D8, D9, D10; LOCK-42.5.11.

#### 42.5R SOC 2 Readiness Pack

SOC 2 Type II readiness for Security + Availability + Confidentiality (Processing Integrity per Q2).

**Namespace:** `ops/compliance/soc/soc2/`, `docs/trust/soc2/`

**Outputs:**

- Trust Services Criteria mapping (Security, Availability, Confidentiality)
- RBAC/isolation mapping from D0
- Key management mapping from 42.5E
- Window evidence cadence plan
- Deviation-log discipline procedure
- Processing Integrity placeholder pending Q2 auditor decision

**Guardrails:**

- Security is required; Availability and Confidentiality included at launch
- Processing Integrity TBD with auditor (Q2) — do not assume in-house
- Window evidence cadence starts at GL-2 (42.5Z)

**Build steps:**

1. Map Security TSC to D0 spine proofs.
2. Map Availability to D9 BCP/DR (42.5S).
3. Map Confidentiality to encryption + isolation proofs.
4. Document window evidence cadence and deviation-log discipline.
5. Add Processing Integrity placeholder for Q2 resolution.
6. Audit module → PASS; commit.

**Maps to:** D2; LOCK-42.5.4 prerequisite (readiness pack consumed at engagement); EXIT-54.2 precursor.

#### 42.5T Log-Retention Configuration Baseline

Committed log-retention baseline durations with FM-1 cross-overlay resolution.

**Namespace:** `ops/compliance/retention/`

**Outputs:**

- HIPAA documentation: 6 years (164.316(b)(2)(i) HARD FLOOR)
- SOC 2 evidence logs: 24 months
- Security incident logs: 6 years
- Application/system logs: 13 months
- FM-1 resolver: spine retention = MAX of attached overlay requirements

**Guardrails:**

- Counsel may RAISE durations; rarely lowers
- HIPAA 6-year floor is non-negotiable
- Jurisdiction-specific adjustments → H-6 (counsel + CPA)

**Build steps:**

1. Configure retention baseline values in spine (42.5D hook).
2. Implement FM-1 MAX-of-overlays resolver.
3. Document committed durations in compliance pack.
4. Add verifier checks for retention floor values.
5. Record H-6 deferral for jurisdiction-specific review.
6. Audit module → PASS; commit.

**Maps to:** Log-retention durations; LOCK-42.5.11; FM-1.

#### 42.5U Subprocessor / Vendor + BAA Stack

Inventory every subprocessor; BAA/DPA stack for PHI-touching vendors including all LLM/AI endpoints.

**Namespace:** `ops/compliance/vendors/`, `docs/trust/vendors/`

**Outputs:**

- Subprocessor inventory (cloud, monitoring, error tracking, email, backup, all LLM/AI endpoints)
- BAA/DPA templates and execution tracking
- SOC 2 CC9.2 mapping
- HIPAA 164.308(b)/164.314(a) mapping
- LLM BAA rule enforcement documentation

**Guardrails:**

- **LLM RULE (strengthened):** BAA REQUIRED BY DEFAULT for healthcare-overlay tenants
- Non-PHI guarantee acceptable ONLY IF technically spine-enforced AND in D0 PHI-boundary proof
- No soft policy "we promise no PHI"
- Vendor BAA negotiation → H-7 (HIPAA counsel)

**Build steps:**

1. Inventory all subprocessors touching data or ePHI.
2. Classify PHI-touching vs non-PHI paths per tenant overlay status.
3. Document LLM endpoint BAA requirements and spine-enforced non-PHI proof paths.
4. Draft BAA/DPA templates for counsel review (H-3, H-7).
5. Map to CC9.2 and 164.308(b)/164.314(a).
6. Audit module → PASS; commit.

**Maps to:** D7; EXIT-54.4; LOCK-42.5.6.

**Wave 4 complete gate:** SOC readiness packs draft-complete; operational programs documented; subprocessor stack inventoried. GL-2 (SOC readiness gate) is **declared eligible** at the end of Wave 4 once 42.5Q–U are complete. GL-2 **fires** (becomes a hard gate) when 42.5Z (SOC window start, Wave 6) initiates. Wave 5 may proceed in parallel after Wave 4 completes without waiting for GL-2 to fire.

---

### Wave 5 — HIPAA Pack, NPRM Register & Trust Artifacts

#### 42.5V HIPAA Compliance Pack

Written HIPAA current-rule compliance pack for healthcare overlay — policies, risk analysis, incident response, training.

**Namespace:** `ops/compliance/overlays/hipaa/pack/`, `docs/trust/hipaa/`

**Depends on:**

- **42.5K** — Q7a / Janice PHI-adjacent-field classification (42.5V consumes; does not re-derive)
- **42.5Q** — SOC 1 system description boundary (HIPAA overlay scope must align with declared SOC system boundary)

> Q7a / Janice PHI-adjacent-field input: see 42.5K. 42.5V consumes the field classification produced in 42.5K and packages it for the HIPAA Pack without re-deriving it.

> The HIPAA Pack scope must not extend beyond the SOC system description boundary declared in 42.5Q. Any divergence requires updating 42.5Q first, then re-running the 42.5V scope check.

**Outputs:**

- Written risk analysis (PHI path; 42N1 field inventory + minimumCellSize + field classification from 42.5K)
- Risk management plan
- Full policy set across safeguards with two-owner compensating-control documentation
- BAA template + subcontractor BAA (counsel-reviewed per H-3)
- Two-owner training + attestation log
- Incident response runbook: HIPAA breach-notification AND SOC 2 operational program (CC7.3/CC7.4)

**Guardrails:**

- HIPAA counsel sign-off required (LOCK-42.5.5) — not substitutable by AI
- Risk analysis informed by 42N1 field inventory, minimumCellSize, and 42.5K field classification
- HIPAA Pack scope bounded by 42.5Q SOC system description

**Build steps:**

1. Confirm 42.5Q SOC system description boundary is current; align HIPAA Pack scope.
2. Draft risk analysis using 42N1 inventory + minimumCellSize + 42.5K field classification.
3. Write risk management plan and full policy set.
4. Document two-owner compensating controls across safeguards.
5. Draft BAA template + subcontractor BAA for counsel (H-3).
6. Create training + attestation log for two owners.
7. Write incident response runbook covering HIPAA + SOC 2 CC7.3/CC7.4.
8. HIPAA counsel review engagement (LOCK-42.5.5).
9. Audit module → PASS; commit.

**Maps to:** D3; EXIT-54.3; LOCK-42.5.5; GL-4.

#### 42.5W NPRM Gap Register

HIPAA NPRM-readiness gap analysis — sized, owned, primary-source verified. NOT a final-rule build.

**Namespace:** `ops/compliance/overlays/hipaa/nprm/`, `docs/trust/hipaa/nprm/`

**Outputs:**

- Gap register: row per change (current; NPRM-final target; gap S/M/L; effort; owner; trigger date)
- PRIMARY-SOURCE verification per provision vs NPRM text
- LOCK-time Federal Register + reginfo.gov RIN 0945-AA22 status check (recorded)
- 5-business-day contingency trigger procedure attached

**Guardrails:**

- NPRM is NOT FINAL (verified June 18 2026) — gap analysis only
- Secondary law-firm summaries discarded for sizing; primary-source required
- Open gaps OK; unassigned gaps NOT OK (EXIT-54.5)

**Build steps:**

1. Record LOCK-time FR + reginfo.gov status check.
2. Build gap register rows from NPRM provisions (primary-source verified).
3. Size each gap S/M/L with effort and owner.
4. Attach 5-business-day contingency trigger runbook.
5. HIPAA counsel review for Q4 posture (deferred, not in-house).
6. Audit module → PASS; commit.

**Maps to:** D4; EXIT-54.5; LOCK-42.5.7; G5.

#### 42.5X Trust Package Drafts

Procurement-ready trust artifacts in **draft** form. NOT published until reports issued.

**Namespace:** `docs/trust/`

**Outputs:**

- Vendor questionnaire library (SIG Lite, CAIQ) from D0–D3 evidence
- Trust page **draft** with benchmark-not-target wording (42P posture)
- Data-residency statement draft
- Report issuance date + observation window placeholders (filled at GL-5 only)
- HIPAA attestation letter draft referencing D3

**Guardrails:**

- **HARD RULE:** no SOC/HIPAA claim on public page until report ISSUED
- No "in progress" / "coming soon" badges
- Bare placeholder OK interim; premature claim is legal exposure
- Benchmark-not-target framing binds all public wording (LOCK-42.5.9)

**Build steps:**

1. Build SIG Lite and CAIQ questionnaire library from D0–D3.
2. Draft trust page with benchmark-not-target + data-residency language.
3. Add report date/window placeholders (unfilled until issuance).
4. Draft HIPAA attestation letter referencing D3.
5. Founder + counsel review vs LOCK-42.5.9 discipline.
6. Audit module → PASS; commit. **Do NOT publish until GL-5.**

**Maps to:** D5 draft; LOCK-42.5.9; EXIT-54.6 (draft ready).

#### 42.5Y Overlay-Extensibility Spec

Document how a future regulated vertical attaches a new overlay without modifying spine logic.

**Namespace:** `ops/compliance/overlay-extensibility/`, `docs/trust/overlay-extensibility.md`

**Outputs:**

- Attachment interface specification (extends 42.5I)
- Per-tenant activation pattern
- Evidence pattern for new overlay audit
- FM-2 precedence requirements before second overlay ships
- Example: PCI-DSS overlay attachment outline (spec only — not built)

**Guardrails:**

- Lightweight spec, not a built second overlay
- Most-restrictive-wins default for FM-2 documented
- Spine modification forbidden for new overlay attachment

**Build steps:**

1. Document attachment interface from 42.5I runtime pattern.
2. Write per-tenant activation and evidence requirements.
3. Document FM-2 precedence gate before second overlay.
4. Add PCI-DSS outline as illustrative example only.
5. Review vs LOCK-42.5.10 Overlay Discipline.
6. Audit module → PASS; commit.

**Maps to:** D6; LOCK-42.5.10; G6.

**Wave 5 complete gate:** HIPAA pack draft-complete; NPRM register populated; trust drafts ready (unpublished). GL-4 eligible when BAA execution-ready (LOCK-42.5.6).

---

### Decision Fork (after Wave 3 PASS, before Wave 6)

→ **LOCK-42.5.2 — Q6 launch timing (founder-owned, FULLY OPEN):**

| Path | SOC posture | Launch implication |
|---|---|---|
| **Path A — Straight to Type II** | Wait for issued Type II | Strongest report; ~9–18 mo end-to-end depending on window |
| **Path B — Type I first, Type II in-flight** | Type I unblocks earlier; Type II during Phase 54 | Faster to market; EXIT-54.7 explicit gate |

No default. Decide once early-buyer mix is known.

### Wave 6 — Observation Window, Engagements & Lock

#### 42.5Z SOC Observation Window Start

Begin SOC 2 Type II observation window. Long pole — start as early as Wave 4 readiness allows.

**Namespace:** `ops/compliance/soc/observation/`

**Outputs:**

- Observation window start date recorded
- Evidence collection cadence activated per 42.5R plan
- Deviation-log discipline live
- GL-2 gate satisfied

**Guardrails:**

- LOCK-42.5.4 (CPA engagement) must be executed before observation window date is recorded. 42.5Z cannot begin without a signed CPA engagement letter — the window is meaningless without an engaged auditor receiving evidence.
- Window starts only after SOC-relevant technical controls verified (Wave 4)
- Under Path B: EXIT-54.7 is explicit gate (window must be started)
- Under Path A: EXIT-54.7 implied by issued Type II at EXIT-54.2
- Renewal cadence after first report: 12 months rolling

**Build steps:**

1. Confirm Wave 4 SOC readiness artifacts complete.
2. Record observation window start date with CPA firm.
3. Activate evidence collection cadence.
4. Enable deviation-log discipline.
5. Document GL-2 gate satisfaction.
6. Audit module → PASS; commit.

**Maps to:** GL-2; EXIT-54.7; SOC Type II Timeline.

#### 42.5AA Professional Engagements Coordination

Coordinate licensed professional engagements required for attestation — not substitutable by AI verification.

**Namespace:** `docs/trust/engagements/`

**Outputs:**

- CPA firm engagement letter for SOC 1 + SOC 2 (LOCK-42.5.4)
- HIPAA counsel engagement for D3/D4/D7 sign-off (LOCK-42.5.5)
- Pentest firm scope engagement (H-4)
- Reports issued per Q6 path (Path A: Type II; Path B: Type I then Type II in-flight)
- Professional Hand-Off List completion tracking

**Guardrails:**

- Licensed CPA firm required for SOC attestation — not optional
- HIPAA counsel required for BAA terms and NPRM posture
- AI verification does not substitute for any professional sign-off

**Build steps:**

1. Engage one CPA firm; execute SOC 1 + SOC 2 engagement letter.
2. Engage HIPAA counsel for D3/D4/D7 review.
3. Engage qualified pentest firm; define scope (H-4).
4. Execute Q6 path (Path A or B per LOCK-42.5.2).
5. Track report issuance toward EXIT-54.1 and EXIT-54.2.
6. Audit module → PASS; commit.

**Maps to:** EXIT-54.1, EXIT-54.2; LOCK-42.5.4, LOCK-42.5.5; Professional Hand-Off List.

#### 42.5AB Phase 42.5 Final Audit and Lock

Read-only comprehensive audit against Exit Criteria and LOCK-42.5.1–11. Phase 42.5 lock attestation.

**Namespace:** `PHASE_42_5_LOCK.md` (created at lock time only)

**Outputs:**

- Comprehensive audit report: PASS / PARTIAL / FAIL per area
- `VERIFY_EXIT:0` and `PROBE_EXIT:0` re-confirmed
- TypeScript clean across all 42.5 namespaces
- Phase 54 EXIT-54.0–54.8 clearance assessment
- Lock attestation document (if all PASS)

**Guardrails:**

- Lock only when every area PASS; PARTIAL or FAIL → report gaps, do not lock
- LOCK-42.5.1 scope redline must be confirmed by founder (no silent acceptance)
- Trust page published only at GL-5 with true claims

**Build steps:**

1. Re-run `scripts/verify-ops-control-spine.js` → `VERIFY_EXIT:0`.
2. Re-run `scripts/probe-ops-control-spine.js` → `PROBE_EXIT:0`.
3. Re-run `scripts/verify-ii-industry-intelligence.js` regression → `VERIFY_EXIT:0`.
4. Run `npx tsc --noEmit` across 42.5 namespaces.
5. Audit each LOCK-42.5.1–11 condition.
6. Audit each EXIT-54.0–54.8 criterion.
7. If all PASS: create `PHASE_42_5_LOCK.md` and journal entry.
8. If any FAIL: report gaps; do not lock.
9. **Build step (final):** Founder reviews and signs LOCK-42.5.1 (Phase 42.5 scope lock) attesting that (a) all 11 LOCK-42.5.* items are individually locked, (b) all 20 poison cases (PC-01 to PC-20) passed at lock time, (c) D0 through D10 are present and verified, (d) EXIT-54.0 through EXIT-54.8 are satisfied or have founder-acknowledged carry-forwards documented. Founder signature timestamped in `PHASE_42_5_LOCK.md`.

**Maps to:** Phase 42.5 lock; Phase 54 hard-blocker clearance; GL-5.

**Wave 6 complete gate:** Phase 42.5 LOCKED. Phase 54 hard-blockers cleared per EXIT-54.x. GL-5: reports issued, trust page live with true claims.

---

### Go-Live Sequence (operational; maps to modules)

| Gate | When | Customer access |
|---|---|---|
| **GL-1** | Wave 1 modules verified via sub-proofs for 42.5A–G | Internal only; no customers |
| **GL-2** | Wave 4 complete + 42.5Z window started | Internal; observation running |
| **GL-3** | D0 PASS + EXIT-54.8 + window running | Non-healthcare customers on generic baseline |
| **GL-4** | Wave 5 HIPAA pack + BAA ready | Healthcare providers after BAA signed |
| **GL-5** | Reports issued + trust page live (true claims) | Full Phase 54 motion |

---

## Verifier Design (42.5O + Probe)

### Export-first mandate

From first 42.5O commit: exported `checks` array; exported isolation, PHI-boundary, RBAC, panel-data-path helpers; `if (require.main === module)` CLI wrapper. Probe calls same exported logic — never re-implements inline.

### Mandatory Poison Cases (PC-01 through PC-20)

```
PC-01 — PHI field written to non-HIPAA-overlay tenant table
PC-02 — PHI field exported to non-HIPAA-overlay panel data path
PC-03 — PHI field logged to system/app log (13m retention bucket)
PC-04 — PHI field surfaced in cross-tenant aggregate query
PC-05 — PHI field passed to LLM call without BAA-required guard
PC-06 — PHI field passed to LLM call with non-PHI guarantee but no spine-enforced boundary check
PC-07 — PHI field attached to non-HIPAA-overlay attachment interface (42.5I)
PC-08 — PHI field rendered in Command Center panel outside HIPAA overlay scope
PC-09 — PHI field included in audit-log payload at retention tier below 6y HIPAA floor
PC-10 — PHI field replicated to backup/DR target outside BAA scope
PC-11 — PHI field exposed via RBAC role lacking HIPAA-overlay minimum-necessary scope
PC-12 — PHI field surfaced via subprocessor call without BAA on file (42.5U)
PC-13 — PHI field present in encryption-at-rest key scope shared with non-HIPAA tenant
PC-14 — PHI field accessible via API auth path bypassing HIPAA overlay session controls
PC-15 — PHI field included in system description boundary diagram input but not flagged for SOC 2 scope (42.5Q ↔ 42.5R linkage)
PC-16 — Firm-staff persona at Firm A reads client data belonging to a Firm B client (cross-firm-staff isolation; non-PHI vector)
PC-17 — Client-side persona (client controller/owner) reads firm-internal data at the firm they are hosted under (e.g., firm-admin notes, internal client list)
PC-18 — Staff persona accesses firm-admin-only surface at same firm (intra-firm RBAC scope violation; non-PHI vector)
PC-19 — Tenant A data appears in Tenant B rendered panel (non-PHI cross-tenant panel leak — PC-08 covers PHI side only)
PC-20 — PHI ingested via permitted BAA-covered LLM path; resulting derived embedding or output is consumed by a non-healthcare tenant OR rendered in a non-PHI panel (PHI-derived-learning bright-line violation)
```

Floor set — extend during D0 red-team. 42.5M exercises PC-14; 42.5P exercises PC-07; 42.5N exercises PC-20 (PHI-derived-learning bright line) via Phase 42 probe pattern extension. PC-16–PC-19 exercised by 42.5O probe against 42.5B (isolation), 42.5C (RBAC), and 42.5P (panel data) exported helpers.

Phase 42 industry verifier (`scripts/verify-ii-industry-intelligence.js`) remains separate — it continues to defer live HIPAA to Phase 42.5.

---

## Namespace and Build Conventions

**Namespaces:**

- `ops/control-spine/` — universal spine (42.5A–42.5G, 42.5O–42.5P)
- `ops/compliance/` — shared compliance artifacts (42.5Q–42.5T, 42.5V–42.5Y)
- `ops/compliance/overlays/` — HIPAA overlay (42.5J–42.5L); future overlays attach here
- `docs/trust/` — trust page drafts, questionnaire library (42.5X; publish only at GL-5)

**Verifier:** `scripts/verify-ops-control-spine.js`  
**Probe:** `scripts/probe-ops-control-spine.js`

Build cadence:

1. Build one module at a time
2. Run control-spine verifier, industry verifier (regression), and TypeScript
3. Audit single module → PASS / PARTIAL / FAIL
4. Commit
5. Proceed to next module

**Recommended First Implementation**

Begin with **42.5A Control-Spine Contracts**. Reserve spine/overlay contract boundaries before any isolation or overlay code is written — same discipline as 41.5A and 42A.

Then build in sequence:

1. **42.5B** Tenant/Firm/Client Isolation
2. **42.5C** Role-Based Access & Personas
3. **42.5D** Audit Logging Spine
4. **42.5E** Encryption + Key Management
5. **42.5F** Authentication Boundary
6. **42.5G** Industry-Config Tenant-Attribute Isolation
7. **42.5H** Overlay Discipline Enforcement
8. **42.5I** Overlay Attachment Interface
9. **42.5J** HIPAA Overlay — Contracts & Scope
10. **42.5K** HIPAA Overlay — Current-Rule Safeguards Path
11. **42.5L** Phase 42 HIPAA Integration Points
12. **42.5M** PHI Ingestion Detection/Refusal Gate
13. **42.5N** PHI-Boundary Verification Harness
14. **42.5O** Control-Spine Verifier + Red-Team Probe — **D0 gate; stop if not PASS**
15. **42.5P** Panel Data Path Isolation Proof
16. **Decision fork:** LOCK-42.5.2 (Q6 Path A vs B)
17. **42.5Q** SOC 1 Readiness Pack
18. **42.5S** Operational Control Programs
19. **42.5R** SOC 2 Readiness Pack
20. **42.5T** Log-Retention Configuration Baseline
21. **42.5U** Subprocessor / Vendor + BAA Stack
22. **42.5V** HIPAA Compliance Pack
23. **42.5W** NPRM Gap Register
24. **42.5X** Trust Package Drafts (draft only — do not publish)
25. **42.5Y** Overlay-Extensibility Spec
26. **42.5Z** SOC Observation Window Start
27. **42.5AA** Professional Engagements Coordination
28. **42.5AB** Phase 42.5 Final Audit and Lock

Build the spine and prove it (Waves 1–3) before auditor spend. Populate compliance artifacts (Waves 4–5) in parallel with observation window where possible. Lock only at 42.5AB when every EXIT and LOCK condition passes.

---

## SOC Type II — Timeline (informs Q6)

SOC 1 + SOC 2 at TYPE II. Type II attests controls OPERATED over an observation window, not merely existed as of a date. Because 42.5 hard-blocks 54, the window gates launch timing.

**Observation-window reality for a FIRST-TIME report:**

- **3-month window:** AICPA-permitted but enterprise buyers view it skeptically. End-to-end ~6-9 months.
- **6-month window:** Realistic minimum / buyer norm. End-to-end ~9-12 months from cold start.
- **12-month window:** Gold standard, strongest confidence. End-to-end ~12-18 months.
- **Renewal cadence after first report:** 12 months rolling.

**OPEN (Q6 — pivotal, FULLY OPEN, founder-owned):**

- **Path A — Straight to Type II:** strongest report; launch waits for the full window (6-mo window ~9-12 mo end-to-end; 12-mo ~12-18).
- **Path B — Type I first, Type II in-flight:** Type I unblocks earlier launch on "Type I + Type II observation underway"; Type II issues during Phase 54. Faster to market; two rounds of audit effort.
- **NO DEFAULT is set.** The choice depends on the early-buyer mix, which is not yet known: mid-market non-healthcare buyers may accept a Type-I-first posture (favors Path B); large-enterprise or healthcare-first buyers may require an issued Type II (favors Path A). Decide at LOCK-42.5.2 once the target early-buyer profile is known.

---

## Dual-Anchor Framework

SOC = assurance framework procurement reads (platform-wide). HIPAA = regulatory floor (healthcare overlay only). Both required where applicable.

### Anchor A — AICPA SOC (platform-wide)

SSAE 18 AT-C 320 (SOC 1); AT-C 105 + 205 + 2017 TSC (SOC 2). Security (required) + Availability + Confidentiality; Processing Integrity TBD with auditor (Q2). SOC 1 + SOC 2 TYPE II, one CPA firm. (SOC 1 = ICFR/financial; SOC 2 = Trust Services Criteria — both verified.)

### Anchor B — HIPAA Security Rule (healthcare overlay only)

HHS OCR; 45 CFR 164 Subparts A/C (164.306 general; 164.308 Admin; 164.310 Physical; 164.312 Technical; 164.314 Org/BAA; 164.316 Documentation — all verified). Advisacor = Business Associate (160.103) on PHI path.

**NPRM STATUS (verified June 18 2026):** the Jan 6 2025 NPRM (RIN 0945-AA22, 90 FR 800) is NOT FINAL — no final rule published, current Security Rule in effect, OCR still reviewing ~4,745 comments, 100+ provider systems requested withdrawal; finalize / narrow / delay / withdraw all possible. ("Already finalized" secondary claims were content-marketing overstatement, discarded.) D4 remains a GAP ANALYSIS with:

- **(a)** LOCK-time PRIMARY-SOURCE check vs Federal Register + reginfo.gov RIN 0945-AA22, recording date checked and FR issue; AND
- **(b)** CONTINGENCY TRIGGER PROCEDURE: within 5 BUSINESS DAYS of Federal Register publication of a final HIPAA Security Rule, founder must (i) lock the FR issue + effective dates into D4, (ii) re-engage HIPAA counsel for D3 re-scope, (iii) re-baseline the 42.5 schedule against the 240-day compliance window (180 CE + 60 BA), (iv) update LOCK-42.5.7. A runbook, not a hope.

**WORKFORCE (Q7):** two owners (Matthew + Janice), no data-touching contractors. Safeguards minimal but DOCUMENTED; small-org segregation-of-duties via documented compensating controls. Janice has direct medical-company PHI-handling experience (feeds D3). **TRAINING GROWTH-TRIGGER:** expand training/access/sanction program when workforce exceeds 2, or first data-touching contractor/employee is added.

NPRM provisions (MFA; encryption at rest+transit required; 15-day patching; 6-month vuln scans; 12-month pen test; 1-hour access termination; 72-hour restoration; annual SME verification) cited from law-firm summaries (SECONDARY) and MUST be primary-source verified vs NPRM text before driving D4 sizing.

### Overlay Discipline (prevents spine contamination)

- **FM-1 Overlay-leakage:** an overlay needing spine help (e.g. HIPAA 6-year log retention exceeding spine default) must NOT inject logic into the spine. RULE: spine exposes per-tenant retention as a CONFIGURATION VALUE overlays SET; OR spine retention = MAX of all attached overlay requirements. Overlays configure; they never inject.
- **FM-2 Cross-overlay interference:** two overlays on one tenant (future PCI+HIPAA) may conflict. RULE: explicit precedence + conflict-resolution documented before a second overlay ships (most-restrictive-wins default).
- **FM-3 Overlay scope drift:** an overlay accumulating non-its-regulation controls. RULE: each overlay carries an EXPLICIT REGULATORY SCOPE STATEMENT (HIPAA overlay implements 45 CFR 164 Subparts A/C, period). Anything outside belongs in the spine.

---

## Deliverables

### D0 — Control-Spine Verification / Isolation Red-Team Pass (load-bearing; Wave 3 / 42.5O)

**D0 — PHI-boundary proof (produced by 42.5O verifier + probe in Wave 3).** Demonstrates no PHI traverses the control spine outside the HIPAA overlay boundary. Wave 1 modules produce sub-proofs only; D0 is the system-wide proof at lock time.

Prove the spine holds before engaging auditors — the 42.5 analogue of the Phase-42 22-poison probe. Assert nothing untested.

- Cross-tenant isolation: customer A persona cannot reach customer B data; firm-staff cannot reach another firm's client data; client-side persona cannot reach firm-internal data. Adversarial, fail-closed, documented.
- PHI-boundary: PHI confined to the healthcare overlay path; non-healthcare tenants cannot reach PHI; PHI-derived-learning bright line holds.
- Role-based access matrix: each persona sees only its authorized surface; deny-by-default verified.
- PANEL DATA PATHS: rendered panels respect tenant/persona/PHI boundary.
- KEY MANAGEMENT: documented key custody, rotation, separation (SOC 2 CC6.1; HIPAA 164.312(a)(2)(iv)).

Evidence feeds D1/D2 (SOC) and D3 (HIPAA). SOC 2 and HIPAA BOTH rest on it.

### D1 — SOC 1 Type II Readiness + Audit Pack

System description; control objectives → financial-reporting assertions; control matrix; engagement; window; issuance.

### D2 — SOC 2 Type II Readiness + Audit Pack

Security + Availability + Confidentiality; Processing Integrity per Q2. Mapping INCLUDES role-based access across personas + isolation boundary (from D0) + key management. Window evidence cadence; deviation-log discipline; issuance.

### D3 — HIPAA Current-Rule Compliance Pack (healthcare overlay)

Written risk analysis (PHI path; informed by 42N1 field inventory + minimumCellSize + Janice); risk management plan; policy set across all safeguards with two-owner compensating-control documentation; BAA template + subcontractor BAA; two-owner training + attestation log. **INCIDENT RESPONSE:** the runbook covers BOTH the HIPAA breach-notification path AND the broader SOC 2 operational program (detection, escalation, containment, eradication, recovery, lessons-learned) — CC7.3/CC7.4.

### D4 — HIPAA NPRM-Readiness Gap Register

Row per change (current; NPRM-final target; gap size S/M/L; effort; owner; trigger date); each provision PRIMARY-SOURCE verified; LOCK-time Federal Register / reginfo.gov status check recorded; the 5-business-day contingency trigger procedure (above) attached.

### D5 — Procurement-Ready Trust Package

SOC 1 + SOC 2 Type II reports; HIPAA attestation letter referencing D3; BAA template; PUBLIC trust page (true-claims-only + DATA-RESIDENCY statement + each report's ISSUANCE DATE and OBSERVATION WINDOW — buyers reject stale/undated reports; SOC 2 Type II generally stale >12 months after window close); vendor-questionnaire library (SIG Lite, CAIQ) from D0-D3.

### D6 — Overlay-Extensibility Spec

How a future regulated vertical attaches a new overlay WITHOUT modifying spine logic (interface, per-tenant activation, evidence pattern). Lightweight spec, not a built second overlay.

### D7 — Subprocessor / Vendor + BAA Stack [HEAVIER — real exposure]

Inventory every subprocessor touching data or ePHI: cloud hosting, monitoring, error tracking, email, backup, AND every LLM/AI endpoint Advisacor calls. SOC 2 CC9.2 + HIPAA 164.308(b)/164.314(a). **LLM RULE (strengthened):** a BAA is REQUIRED BY DEFAULT for any LLM endpoint serving healthcare-overlay tenants. A non-PHI flow guarantee is acceptable ONLY IF (a) the flow is TECHNICALLY ENFORCED at the spine layer, not by policy, AND (b) the guarantee is part of the D0 PHI-boundary proof. No soft policy "we promise no PHI" — it must be enforced and proven. (Vendor BAA negotiation → HIPAA counsel, H-7.)

### D8 — Vulnerability Management + Pen-Test Program [MEDIUM]

Scanning cadence, remediation SLA by severity, annual third-party pen test. SOC 2 CC7.1; enterprise procurement universally asks. (Scope/method → qualified firm, H-4.)

### D9 — BCP / DR Plan with Explicit RPO/RTO [MEDIUM]

SOC 2 Availability requires explicit Recovery Point / Recovery Time Objectives, backup strategy, tested-restoration log. **STARTING TARGETS (founder-set, auditor-confirmed at engagement):** RPO <= 24h, RTO <= 72h. Ties to HIPAA contingency plan in D3.

### D10 — Change-Management Procedure [LIGHT for 2-person shop]

SOC 2 CC8.1: documented change-request flow, peer review (peer = the other founder), rollback procedure, change log.

### Log-Retention Durations (committed baseline; counsel may RAISE, rarely lowers)

- HIPAA documentation: 6 years (164.316(b)(2)(i), HARD FLOOR — do not reduce).
- SOC 2 evidence logs: 24 months (covers two consecutive observation windows).
- Security incident logs: 6 years (matches HIPAA floor; simplifies cross-overlay retention per FM-1).
- Application/system logs: 13 months (12-month window + 1-month buffer).

(Jurisdiction-specific adjustments → counsel/CPA, H-6.)

---

## Trust-Page Discipline (DO NOT CLAIM WHAT ISN'T REAL)

**Q5:** PUBLIC trust page, published ONLY when compliance is real and reports issued.

**HARD RULE:** no SOC/HIPAA claim on any public page until the report is ISSUED / controls in place. No "in progress"/"coming soon" badges. Bare placeholder OK interim; premature claim is a misrepresentation with legal exposure. Page goes live at end of 42.5. Public summary (badges, "SOC 1 + SOC 2 Type II", benchmark-not-target language, data-residency statement, each report's issuance date + observation window); full reports on request. Reversible to gated later.

---

## Phased Go-Live (Founder-Directed — Gated by What Is Proven)

Founder intent: turn the control layer on incrementally, ~weekly, not all at once.

**CRITICAL PRINCIPLE:** controls LEAD customers, never trail them. No customer onto an isolation boundary not yet PROVEN (D0). For PHI, controls-before-customers is a legal floor.

- **GL-1 (internal):** spine components go live in dependency order, verified as each lights up — isolation, then RBAC/personas, then audit logging, then encryption + key management. Each sub-proof verified before the next. No customer access.
- **GL-2 (internal):** SOC-relevant technical controls complete + verified. SOC 2 Type II OBSERVATION WINDOW can start here — the long pole; start early.
- **GL-3 (non-healthcare customers):** once spine PROVEN (D0) and window running, NON-HEALTHCARE verticals may onboard on the generic knowledge baseline. EARLIEST safe revenue.
- **GL-4 (healthcare customers):** HIPAA overlay live + verified + BAA execution-ready. Only then do healthcare providers onboard; PHI flows only after BAA signed.
- **GL-5 (full launch):** reports ISSUED, public trust page live (true claims), full Phase 54 motion.

### GL-3 Caveats

- **RISK-1 Accidental PHI contamination:** a non-healthcare tenant's data may contain inadvertent PHI (employee-benefit file with per-employee health-claim dollars; a manufacturer's AR file including a clinic customer). The spine alone does not catch this; without the overlay running, that PHI enters a non-overlay path. **GATE:** a PHI-detection/refusal control on ingestion, OR a contract clause prohibiting PHI in non-healthcare-overlay tenants. Required before GL-3.
- **RISK-2 Buyer reaction to "Type II in progress" varies:** mid-market may accept it; large-enterprise procurement (any vertical) frequently requires an ISSUED Type II. GL-3 unlocks SOME revenue, not ALL — do not promise enterprise-tier deals on a Type-I-only posture.

**NOTE:** "platform-ready for a vertical" (controls + generic baseline) is a LOWER bar than "intelligence-ready" (full knowledge stack). A manufacturing customer can go live at GL-3 on the generic baseline while its knowledge stack is built later (Q8).

---

## Knowledge-Stack Roadmap (Follows 42.5 — NOT IN THIS PHASE)

Per-vertical knowledge stacks, each modeled on the proven healthcare Phase-42 template, sequenced by REAL customer demand. Sub-parts a-d mirror the Phase-42 healthcare components: **a = Treatments | b = KPIs | c = Disclosures | d = Benchmarks**

- **Healthcare:** BUILT & verified (42M/42N1/42O/42P). The template.
- **42.51 a/b/c/d Manufacturing:** NOT built. Commercial frameworks (existing baseline).
- **42.52 a/b/c/d Retail:** NOT built. Commercial frameworks (existing baseline).
- **42.53 a/b/c/d Fund accounting:** NOT built. *** GASB/FUND FRAMEWORK BASELINE PREREQUISITE *** — governmental accounting (GASB, fund balances, encumbrances, modified accrual), NOT the commercial FASB/IFRS baseline. A new generic framework baseline (analogous to 42I but GASB/fund) must be built FIRST, underneath this stack.
- **42.54 a/b/c/d Municipalities:** NOT built. SAME GASB/fund prerequisite as 42.53.
- **[Other verticals]:** future, demand-driven.

All commercial verticals share: the universal control spine (42.5) + the generic 4-framework treatment baseline (42I, built). Fund/muni additionally require the GASB/fund framework baseline first. A vertical can go live on the shared base (GL-3) and gain intelligence depth when its knowledge-stack phase lands. **SEQUENCING:** build the next vertical where REAL demand exists, not in numeric order.

---

## Dependencies (What Feeds 42.5)

From Phase 42 (LOCKED `b11adcd`): isolation + PHI tagging + audit-trail PHI inheritance + PHI-derived-learning bright line = controls D0 must PROVE and D1/D2/D3 attest (TEST, not assume); minimumCellSize = HIPAA re-identification evidence.

From 42N1/42O/42P (VERIFIED v1.1): 42N1 field inventory → D3 PHI-path scope; 42O disclosure boundaries → D1 ICFR control scope; 42P benchmark-not-target → D5 wording.

From 42M/42I (in revision): final namespace → SOC system-description boundary.

### Dependencies on Locked Phase 42 (`b11adcd`)

| Dependency | Repo path |
|---|---|
| Phase 42 lock attestation | [`PHASE_42S_LOCK.md`](PHASE_42S_LOCK.md) |
| PHI tagging (42H) | [`lib/intelligence/synthetic/industry/phi-tagging/`](lib/intelligence/synthetic/industry/phi-tagging/) |
| PHI discipline + HIPAA integration points (42Q) | [`lib/intelligence/synthetic/industry/phi-healthcare/`](lib/intelligence/synthetic/industry/phi-healthcare/) |
| Phase 42.5 interface refs (declared, not implemented) | [`lib/intelligence/synthetic/industry/phi-healthcare/buildHealthcarePHIDiscipline.ts`](lib/intelligence/synthetic/industry/phi-healthcare/buildHealthcarePHIDiscipline.ts) — `auditLoggingEventInterfaceReferenceId`, `breachDetectionSignalInterfaceReferenceId`, `hipaaCompliantAuditStoreInterfaceReferenceId` |
| Industry intelligence namespace (isolation, registry, resolver, probe) | [`lib/intelligence/synthetic/industry/`](lib/intelligence/synthetic/industry/) |
| Healthcare treatments baseline (42M) | [`PHASE_42M_HEALTHCARE_TREATMENTS_BASELINE.md`](PHASE_42M_HEALTHCARE_TREATMENTS_BASELINE.md) |
| Healthcare KPIs baseline (42N1) | [`PHASE_42N1_HEALTHCARE_KPIS_BASELINE.md`](PHASE_42N1_HEALTHCARE_KPIS_BASELINE.md) |
| Healthcare disclosures baseline (42O) | [`PHASE_42O_HEALTHCARE_DISCLOSURES_BASELINE.md`](PHASE_42O_HEALTHCARE_DISCLOSURES_BASELINE.md) |
| Healthcare benchmarks baseline (42P) | [`PHASE_42P_HEALTHCARE_BENCHMARKS_BASELINE.md`](PHASE_42P_HEALTHCARE_BENCHMARKS_BASELINE.md) |
| Industry verifier (live HIPAA deferred to 42.5) | [`scripts/verify-ii-industry-intelligence.js`](scripts/verify-ii-industry-intelligence.js) |

---

## Hard-Blocker Exit Criteria for Phase 54

- **EXIT-54.0** D0 control-spine verification COMPLETE/passing (isolation, PHI boundary, role-based access, panel data paths, key management proven).
- **EXIT-54.1** SOC 1 ISSUED (Type II under Path A; Type I + Type II underway under Path B).
- **EXIT-54.2** SOC 2 ISSUED, >= Security + Availability + Confidentiality (Type II under Path A; Type I + Type II underway under Path B).
- **EXIT-54.3** HIPAA pack (D3) complete for healthcare overlay.
- **EXIT-54.4** BAA template legal-reviewed + execution-ready; subprocessor stack (D7) inventoried with BAAs/DPAs for any PHI-touching vendor (incl LLM endpoints).
- **EXIT-54.5** NPRM gap register (D4) populated, sized, owned, primary-source verified (open OK, unassigned not OK).
- **EXIT-54.6** Public trust page ready (true claims only, dated) + questionnaire library.
- **EXIT-54.7** SOC 2 Type II observation window STARTED. Path interpretation depends on LOCK-42.5.2 being satisfied first (Q6 Path A vs Path B decided). Under Path B this is an explicit gate. Under Path A it is IMPLIED by EXIT-54.2 (an issued Type II proves the window ran) and need not be separately attested.
- **EXIT-54.8** GL-3 PHI-contamination gate in place (ingestion control or contract clause).

**NOTE:** non-healthcare verticals may go live at GL-3 before EXIT-54.3/54.4 (healthcare-only gates), provided EXIT-54.0, EXIT-54.8, and the SOC posture hold.

---

## Lock Conditions for Phase 42.5

- **LOCK-42.5.1** Scope-boundaries reviewed, confirmed/redlined by founder. No silent acceptance.
- **LOCK-42.5.2** Q6 launch-timing decision made (Path A vs B; window length), once early-buyer mix is known.
- **LOCK-42.5.3** D0 control-spine verification complete + passing (incl cross-tenant isolation, panel data paths, PHI-derived-learning bright line, key management). Before auditor spend. D0 is locked when: (a) 42.5O verifier passes on production spine + HIPAA overlay at lock time; (b) 42.5O probe returns zero violations across PC-01 through PC-20; (c) 42.5N harness confirms PHI-boundary + bright-line behavior; (d) 42.5P shows no PHI in non-HIPAA-overlay panels AND no cross-tenant non-PHI panel leak. Does NOT certify future tenants or spine/overlay changes — re-run 42.5O verifier + probe + 20 poison cases and re-lock on any change. Re-lock obligation enforced by GL-2.
- **LOCK-42.5.4** One CPA firm engaged; engagement letter for SOC 1 + SOC 2. Prerequisite: LOCK-42.5.3 satisfied. Any change to control spine, HIPAA overlay, or new industry overlay after engagement requires re-running 42.5O verifier + probe + 20 poison cases (PC-01 through PC-20) before continued audit reliance.
- **LOCK-42.5.5** HIPAA counsel/qualified consultant engaged for D3 + D4 sign-off.
- **LOCK-42.5.6** BAA template + subprocessor BAA/DPA stack (D7) drafted, legal-reviewed, counterparty-ready.
- **LOCK-42.5.7** D4 populated end-to-end + primary-source verified, WITH dated Federal Register / reginfo.gov status check recorded AND the contingency trigger procedure attached (cross-ref the 5-business-day runbook).
- **LOCK-42.5.8** SOC system-description boundary written + reviewed vs finalized 42/42M/42I namespace.
- **LOCK-42.5.9** Public trust-page wording drafted, reviewed vs benchmark-not-target AND no-premature-claim discipline AND report-freshness/data-residency.
- **LOCK-42.5.10** Overlay-extensibility spec (D6) + Overlay Discipline (FM-1/2/3) documented.
- **LOCK-42.5.11** D8 (vuln/pen-test), D9 (BCP/DR + RPO/RTO), D10 (change mgmt), and log-retention durations documented and right-sized.

---

## Open Questions

### Answered (founder, this session)

- **Q1 Scope:** PLATFORM-WIDE multi-industry; SOC platform-wide; HIPAA healthcare overlay.
- **Q3 Auditor:** ONE CPA firm, SOC 1 + SOC 2 TYPE II.
- **Q5 Trust page:** PUBLIC, only when compliant/issued.
- **Q7 Workforce:** two owners, no data-touching contractors; compensating controls.
- **CONTROL ARCH:** ONE shared spine for all verticals + pluggable overlays.
- **KNOWLEDGE ROADMAP:** 42.51 mfg / 42.52 retail / 42.53 fund / 42.54 muni (a-d each); fund+muni carry a GASB/fund framework-baseline prerequisite; sequence by demand.
- **Q8 Per-vertical go-live:** non-healthcare verticals go live at GL-3 on the generic baseline; healthcare overlay built ready-to-attach; knowledge stacks follow demand.

### Open — Founder Decision

- **Q6 Launch timing:** narrowed: SOC evidence collected from launch (window accrues from day one); formal auditor engagement after initial demand. Path A-vs-B and window length still open pending early-buyer mix, but the evidence-from-day-one posture means either path benefits from an already-running window.

### Open — Defer to Engaged Professional (do NOT decide in-house)

- **Q2** SOC 2 categories (Processing Integrity? Privacy?) → CPA auditor.
- **Q4** NPRM compliance posture given ambiguity → HIPAA counsel.
- **H-3** BAA template terms → HIPAA counsel.
- **H-4** Pen-test scope/methodology → qualified pentest firm.
- **H-5** FIPS-validated encryption module selection → security architect / CPA IT.
- **H-6** Log-retention durations vs jurisdiction → HIPAA counsel + CPA.
- **H-7** Subprocessor BAA negotiation (cloud / LLM vendors) → HIPAA counsel.

### Open — Janice (credentialed)

- **Q7a** Which financial fields are genuinely PHI-adjacent in real provider data (feeds D3 risk-analysis scope).

---

## Professional Hand-Off List (The Reality Check on This Phase)

The plan can be written in-house; the EXECUTION requires engaged professionals. NOT decidable by founder + AI verification:

- SOC 2 category selection beyond Security/Availability/Confidentiality (CPA auditor)
- SOC 1 + SOC 2 attestation itself (licensed CPA firm — required, not optional)
- NPRM compliance posture given regulatory ambiguity (HIPAA counsel)
- BAA template terms + subprocessor BAA negotiation (HIPAA counsel)
- Penetration-test scope and methodology (qualified pentest firm)
- FIPS-validated encryption module selection (security architect)
- Log-retention durations vs jurisdiction-specific requirements (counsel + CPA)

No AI verification pass substitutes for these. The lock conditions require engaging them.

---

## Posture Integrity (Carried Forward)

Benchmark-not-target framing from 42P governs all public-facing 42.5 wording. SOC 2 system description and public trust page MUST NOT present benchmarks as targets/thresholds/pass-fail — comparative context only. Binds D5; checked at LOCK-42.5.9.

---

## References (Primary Source)

- AICPA SOC 2: https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2
- HHS HIPAA Security Rule: https://www.hhs.gov/hipaa/for-professionals/security/index.html
- 45 CFR Part 164 Subpart C (eCFR): https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-C
- HIPAA NPRM (Fed Register, 90 FR 800, Jan 6 2025): https://www.federalregister.gov/documents/2025/01/06/2024-30983/hipaa-security-rule-to-strengthen-the-cybersecurity-of-electronic-protected-health-information
- NPRM status (reginfo.gov, RIN 0945-AA22): https://www.reginfo.gov/public/do/eAgendaViewRule?RIN=0945-AA22

**SECONDARY (current, point at primaries — retained as secondary because they are interpretive summaries, not the rule text):** Bright Defense (Jun 2026), Compliancy Group (May 2026), HIPAA Journal, Troutman Pepper Locke, Alston & Bird, Epstein Becker Green.

---

*End of Phase 42.5 Planning Document v1.8*
