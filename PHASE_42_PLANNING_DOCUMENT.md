# Phase 42 Planning Document — Locked (v3.1)

## Industry Intelligence Libraries (Generic + Healthcare)

**Document Owner:** Matthew Wiseman  
**Company:** Wiseman Financial Technologies LLC  
**Product:** Advisacor  
**Phase:** Phase 42 — Industry Intelligence Libraries  
**Status:** Locked (v3.1)  
**Depends On:** Phase 40 locked; Phase 40.5 locked; Phase 41.5 locked  
**Namespace:** `lib/intelligence/synthetic/industry/`  
**Verifier:** `scripts/verify-ii-industry-intelligence.js`

---

## Business Precondition (Not a Software Check)

READ FIRST. This is an eyes-open business commitment, not a verifier criterion.

Phase 42's software architecture (memory dimensions, contracts, registry, resolver, selector, composition engine, memory discipline, PHI tagging layer, library structures, verifier) can be fully built and verified independently of any external business commitment. The architecture build is a normal software build.

However, the Healthcare library cannot reach `active` status, and Phase 42 cannot lock on **Path B**, until the following external commitments are real:

1. A named specialist-reviewer pool is retained and on contract (or otherwise committed in writing) covering the topics flagged `requiresSpecialistReview` in the Industry Registry.
2. Within that pool, a named 340B-credentialed reviewer is retained, holding documented 340B-specific credentials (340B ACE certification, dedicated 340B compliance role at a covered entity, or named consulting firm with 340B specialization).
3. The specialist pool's engagement scope explicitly covers authorship and attestation of Healthcare treatments under Advisacor's recommendation-only doctrine, with reviewer identity and credentials recorded on every active treatment.

**Implications the founder should consider before Path B lock:**

- This is a real and ongoing cost commitment, not a one-time build expense.
- Without commitment #1 and #2, the verifier will refuse to mark Healthcare topics flagged `requiresSpecialistReview` as active. Healthcare remains non-selectable; Generic remains the only launch-active industry.
- The pool may consist of the founder plus at least one named external healthcare-accounting specialist. The 340B reviewer must be a distinct, named credentialed individual or firm.
- All authoritative content is authored and attested by the named pool at authorship time. The planning document and architecture do NOT pre-decide methodology.

**Specialist-Pool Attrition — Degraded State and Restoration (B1):**

If the retained specialist-reviewer pool loses coverage for a launch industry:

**Degraded state:**

- Affected industry module reverts from `active` to `recognized`
- New treatment/KPI/disclosure/baseline authoring under the affected module is blocked
- In-flight attestations completed before attrition remain valid
- Existing active treatments continue read-only
- Audit log records the attrition event (date, lost coverage scope, triggering condition)

**Restoration path:**

- New specialist with equivalent credentials retained and on contract
- Credentials documented in audit package
- Founder attests restoration in writing
- Affected module returns to `active`; authoring unblocks

This is a business runbook, not a software gate. Software records state; business commitment determines state.

Restating the bright line: software architecture is one build; human attestation infrastructure is a separate commitment that gates Healthcare go-live on Path B. **Path A** (Generic-only lock) requires the software gate only.

---

## Revision Summary

### v3.1 merge (planning lock)

- Time estimates explicitly non-binding; sequence authoritative only (A1)
- Post-Wave-2 decision fork: Path A (Generic-only) vs Path B (Full Healthcare) (A2)
- Contract additions: displacementLineage versioning (C1), module default-true specialist review (C2), `output_classification` literal type (C3)
- Registry `moduleSpecialistReviewDefault` (D1)
- Composition engine displacementLineage verifier check + Differences Catalog read-interface (E1, E2)
- Four-entity topology + reclassification event, not fifth entity (F1)
- 42L path-aware scope with machine-readable `launchScope` header (G1)
- Verifier export-first from first commit; 17 mandatory probe poison cases (H1–H3)

### v2 → v3 (carried forward)

- Business Precondition surfaced at top
- Methodology assertions stripped from module detail; topics, scope boundaries, citations, review gates only
- Multi-location retail threshold removed; attested scope-boundary by specialist
- Three-outcome composition; granular agnostic/scoped declarations; structured `reviewerAttestation`; PHI discipline; entity reclassification; baselineSource; industry-boundary backdoors closed; launch trim

---

## Purpose

Phase 41.5 made Advisacor framework-aware. Phase 42 makes Advisacor industry-aware on top of framework awareness.

The Industry Intelligence layer holds Advisacor-authored industry-specific accounting nuance, KPIs, disclosure variants, reasonableness baselines, and AI worker behavior overlays. AI roles call the Industry Resolver alongside the Phase 41.5 Treatment Resolver to produce treatments reflecting both reporting framework AND industry context.

Two industries are populated at launch scope:

- **Generic** — default for entities without specialized industry classification
- **Healthcare** — first specialized vertical (US GAAP at launch; IFRS variants `in_review`)

The planning document declares topics, scope boundaries, required citations, registry status discipline, composition mechanics, segregation discipline, and review gates. It does NOT declare accounting methodology.

---

## Post-Wave-2 Decision Fork (A2)

After Wave 1 (Foundation) and Wave 2 (Generic) are built and verified, the phase has a fully-built industry engine with Generic active — roughly two-thirds of Phase 42 — with zero external specialist cost at the fork.

| Path | Description | Lock gate |
|------|-------------|-----------|
| **PATH A — Generic-only** | Lock with Generic as the only active industry. Healthcare architecturally present but `in_review` / non-active. Audit package records Healthcare as deferred-pending-specialist-pool. | Software gate only |
| **PATH B — Full with Healthcare** | Commit to Business Precondition. Build and specialist-attest Wave 3. Lock with Generic + Healthcare `active` for `us_gaap`. | Software gate AND Business Precondition (#1–3; see Lock Gates) |

Architecture supports both paths without rework. Path A can later become Path B demand-first.

**Build cadence:** one module at a time; no per-module time targets. Specialist pool contracting is weeks-to-months, outside software control. Healthcare authorship (42M–42Q) is paced by the specialist pool, not a code sprint.

---

## Exit Criteria

The 42 lock audit verifies against this checklist. Business Precondition is a separate gate for Path B; verifier passes do not substitute for specialist pool commitment.

- Industry verifier exits `0`
- TypeScript clean across `lib/intelligence/synthetic/industry/`
- Every module has its own per-module audit doc committed
- No `executable: true` anywhere in the namespace
- Phase 40, 40.5, and 41.5 handoff hashes match across consuming modules
- Generic baseline library populated, human-reviewed, and active across launch frameworks
- Healthcare library populated and active for `us_gaap` on Path B only; IFRS variants `in_review`
- Industry resolver indirection verified
- Framework × Industry composition verified for every active tuple; unsupported tuples fail closed
- Three composition outcomes exercise correctly
- Industry registry fail-closed selection
- Every active treatment flagged `requiresSpecialistReview` carries `specialistReviewer` attestation matching registry `specialistCredentialRequirements`
- 340B treatments carry named 340B-credentialed reviewer attestation
- PHI handling discipline (`containsPHI`, `phiDerivationStatus`, composition propagation, customerIsolation crossing prevention)
- Audit-trail PHI inheritance and HIPAA-compliant audit store interface
- Healthcare KPIs declare `minimumCellSize` with Safe Harbor default
- Composite scope key partitioning verified
- Granular agnostic/scoped declarations enforced
- Named four-entity topology plus reclassification event test passes
- KPI library produces metric definitions for declared launch-scope topics
- Disclosure variants compose with Phase 41.5 disclosure requirements
- Reasonableness baselines carry `baselineSource`; internal-research baselines carry additional discipline
- Differences Catalog consultation in 42F verified where applicable
- PHI-derived-learning policy enforced
- Cross-isolation test passes
- No reproduction of copyrighted industry guidance
- Every active treatment carries `reviewerAttestation` object
- `output_classification: "recommendation_for_human_review"` on every active treatment
- No AI model inference in industry layer
- Verifier export-first; red-team probe rejects all 17 mandatory poison cases

---

## Non-Goals

Out of scope for Phase 42:

- Construction, nonprofit, banking, insurance, real estate, oil/gas, complex manufacturing, multi-location retail, SaaS deep specialization, agriculture, hospitality, transportation, education, government — demand-driven future phases
- Tax provision deep computation — Phase 47
- Audit content (ISA, AICPA AU-C, PCAOB AS) — Phase 51
- External-database industry benchmarking
- AR/AP/Close/Tax/Inventory department specifics
- Pricing and packaging — Phase 54
- Patient eligibility, drug-by-drug 340B classification, duplicate-discount controls — covered entity operational scope
- Functional expense allocation presentations — deferred from launch
- Meaningful Use/MIPS, Provider Relief Fund — deferred from launch
- Operational/clinical healthcare KPIs — 42N2 architecture only at lock
- Cost report production — future phase
- Methodology authorship in planning document — specialist authors at authorship time
- Patient/clinical data integration semantics — Phase 40.5 connectors + 42H PHI layer

---

## Architectural Position

Industry Intelligence sits **beside** Standards Intelligence (Phase 41.5), not on top. Both are consumed via resolver indirection.

```text
AI Worker / Methodology Engine
     |
     v
Treatment Resolver (Phase 41.5)   <----+
     |                                  |
     v                                  |
Industry Resolver (Phase 42)            |  Both consulted;
     |                                  |  results composed
     v                                  |
Differences Catalog (41.5) consult <----+
     |
     v
Framework × Industry Composition (42F)
     |
     v
Composed Treatment with full lineage
```

Standards supplies framework treatment. Industry supplies industry overlay. Composition combines per declared outcome. Resolved treatment carries reconstruction-grade lineage.

---

## Core Concept — Industry as a Scoping Dimension

Industry is a **second scoping dimension** alongside framework. It is NOT an isolation peer.

Every entity carries:

- `reportingFramework` / `reportingFrameworks[]` (Phase 41.5)
- `industryClassification` (Phase 42)
- `industrySubClassification` (Phase 42 — part of composite scope key)

**Composite scope key for industry-scoped treatment memory:**

`(customerIsolation, framework, industry, industrySubClassification)`

**Sub-classifications at launch:**

- `generic.default`
- `healthcare.acute_care_hospital`
- `healthcare.ambulatory_surgery_center`
- `healthcare.skilled_nursing_facility`
- `healthcare.physician_practice`
- `healthcare.home_health_or_hospice`
- `healthcare.other`

**Granular agnostic/scoped partitioning** at `(algorithm, baselineParameters, normalizationRules)` — declared in `AgnosticScopedDeclarationContract` (42B).

### Named Topology Test (F1)

**Four-entity topology inherited from Phase 41.5 (Entities A–D) plus a reclassification event on one existing entity mid-period.**

Entity E is **not** a fifth standalone entity. Entity E denotes the **reclassified state** after an industry-change event.

Customer X owns:

- Entity A — `us_gaap`; `generic`; `generic.default`
- Entity B — `ifrs_for_smes`; `generic`; `generic.default`
- Entity C — dual-book `us_gaap` (primary) + `ifrs_iasb` (secondary); `healthcare`; `healthcare.acute_care_hospital`
- Entity D — `us_gaap`; `healthcare`; `healthcare.physician_practice`
- Entity E — reclassification test: starts `generic.default` 2025-01-01; reclassifies to `healthcare.ambulatory_surgery_center` effective 2026-01-01

Verifier must prove: sub-classification segregation; cross-industry empty; dual-book segregation; pre/post reclassification scope separation; effective-dating; PHI never in non-Healthcare-aware paths; agnostic algorithms shared; scoped parameters not shared; no customerIsolation bleed.

---

## Non-Negotiable Guardrails

1. No reproduction of copyrighted industry guidance. Citations by reference only.
2. Every industry treatment human-authored and human-reviewed before active. `reviewerAttestation` required. `requiresSpecialistReview` topics require `specialistReviewer` attestation.
3. Planning document and architecture do NOT decide methodology.
4. `output_classification: "recommendation_for_human_review"` on every treatment (string literal type in 42B).
5. Unpopulated industry is not selectable. Generic is deliberate selection, not fallback.
6. Industry is entity-level, never customer-level.
7. Three composition outcomes: `specializes`, `specializesWithDisplacement`, `contradiction`.
8. `phiDerivationStatus` on every artifact; composition propagates most-restrictive value.
9. PHI-tagged artifacts never cross `customerIsolation`; never in non-Healthcare-aware retrievals.
10. Audit-trail entries referencing PHI inherit PHI tag; route to Phase 42.5 HIPAA audit store.
11. PHI-derived-learning bright line: no cross-customer shared intelligence except Expert Determination with attestation.
12. `executable: false` on every artifact.
13. `customerIsolation`, `firmIsolation`, `clientIsolation` separate on every artifact.
14. Deterministic `stableSnapshotHash` IDs throughout.
15. Fail closed on missing identifiers.
16. Consume Phase 40, 40.5, 41.5 handoffs; preserve lineage.
17. No AI model inference; deterministic lookup only.
18. Treatment versioning with `effectiveFromDate`; historical transactions resolve by transaction date.
19. Registry status discipline: `active`, `in_review`, `recognized_unpopulated`, `deprecated`.
20. Healthcare HIPAA controls owned by Phase 42.5; Phase 42 declares tagging discipline and integration points.

---

## Industry Registry

**ACTIVE (selectable post-lock):**

- `generic` — active across launch frameworks; `generic.default`
- `healthcare` — active for `us_gaap` on Path B; `in_review` on Path A; six sub-classifications

**RECOGNIZED_UNPOPULATED:** construction, nonprofit, banking_financial_services, insurance, real_estate, oil_gas_extractive, complex_manufacturing, multi_location_retail, saas_specialized, professional_services_specialized, agriculture, hospitality, transportation_logistics, education, government_municipal

Registry rules mirror Phase 41.5: only ACTIVE selectable; fail closed on non-active; never silent fallback to Generic.

**Per-industry `moduleSpecialistReviewDefault` (D1):**

- Healthcare = `true`
- Generic = `false` — no named specialist-pool gate at module level; per-treatment `requiresSpecialistReview` opt-in remains available
- Sub-classifications inherit unless overridden with attested justification

Per-(industry, topic) declarations: `requiresSpecialistReview`, `specialistCredentialRequirements`, `authoritativeSourcesRequired`, `routingRules`.

---

## Contract-Layer Additions (42B)

### C1. displacementLineage versioning

Each entry requires `displacedElementVersion` and `displacedElementEffectiveDate`.

### C2. Module-level default-true for requiresSpecialistReview

Healthcare modules default `requiresSpecialistReview: true`. Opt-out requires `specialistReviewOptOutJustification` (`justification`, `attestor`, `attestationDate`, `reviewSampleEligible: true`). Missing both specialist attestation and opt-out fails closed at composition.

### C3. output_classification literal type

```typescript
output_classification: "recommendation_for_human_review"
```

Type system rejects other values at authoring time. Verifier confirms presence (H2).

---

## Composition Engine (42F)

**Three outcomes:** specializes / specializesWithDisplacement / contradiction.

**E1:** Reject `specializesWithDisplacement` missing `displacedElementVersion` or `displacedElementEffectiveDate` on any displaced element.

**E2:** Read-only Differences Catalog inspection interface (filter by industry, framework, composition outcome, date range, displacement attestor). Contract locked at 42F; audit-package export sufficient at launch.

**displacementLineage** is reconstruction-grade. Contradiction produces conflict report only — no resolved treatment.

---

## Module Order

### Wave 1 — Industry Foundation

- **42A** Industry-Dimension Memory Reservation (**FIRST**)
- **42B** Industry Contracts (type-only)
- **42C** Industry Registry
- **42D** Industry Resolver
- **42E** Industry Selector
- **42F** Framework × Industry Composition Engine
- **42G** Industry-Scoped Memory & Retrieval Discipline
- **42H** PHI Tagging & Segregation Layer

### Wave 2 — Generic Baseline Library

- **42I** Generic Industry Treatment Library
- **42J** Generic KPI Library
- **42K** Generic Disclosure Variant Library
- **42L** Generic Reasonableness Baseline Architecture

### Decision Fork (after Wave 2)

→ **Path A:** Wave 4, Generic-only lock  
→ **Path B:** Wave 3 then Wave 4

### Wave 3 — Healthcare (Path B only)

- **42M** Healthcare Industry Treatment Library
- **42N1** Healthcare Revenue-Cycle KPI Library (launch)
- **42N2** Healthcare Operational KPI Library (architecture stub; content deferred)
- **42O** Healthcare Disclosure Variant Library
- **42P** Healthcare Reasonableness Baseline Architecture
- **42Q** Healthcare PHI Discipline & HIPAA Integration Points

### Wave 4 — Verifier and Lock

- **42R** Industry Intelligence Verifier (export-first from first commit)
- **42R-probe** Red-team probe (calls exported verifier logic only)
- **42S** Final Phase 42 Audit and Lock

---

## 42L Launch Scope (G1)

**Path-A-scoped default** — smaller commitment, additive expansion, demand-first posture.

- **Path A:** 42L scope = KPI families consumed by **42I only**
- **Path B:** Before Wave 3, expand to include **42N1**-consumed families

**Machine-readable module header:**

```text
42L module header:
  launchScope: "path_a"   // or "path_b" after expansion
  consumedByLaunchKpiFamilies: [
    // 42I-consumed families (Path A)
    // + 42N1 families appended (Path B, before Wave 3)
  ]
```

42R reads header for probe case #16. Path B expansion: flip `launchScope`, append families, re-verify.

---

## Verifier Design (42R + Probe)

### H1. Export-first mandate

From first 42R commit: exported `checks` array; exported composition, topology, PHI, attestation helpers; `if (require.main === module)` CLI wrapper. Probe calls same exported logic — never re-implements inline.

### H3. Mandatory probe poison cases (floor)

1. Cross-industry memory leak  
2. Cross-sub-classification leak (D → C-primary)  
3. PHI leak via generic-misclassified entity  
4. Silent Generic fallback  
5. Active without `reviewerAttestation`  
6. Specialist-required topic without `specialistReviewer`  
7. 340B topic without named 340B credential  
8. Incomplete `displacementLineage`  
9. Missing `displacedElementVersion` or `displacedElementEffectiveDate`  
10. Contradiction resolves instead of fail-closed  
11. PHI crosses `customerIsolation`  
12. PHI in non-Healthcare-aware retrieval path  
13. Audit-trail PHI reference without inherited tag  
14. Internal-research baseline missing sourcing fields  
15. PHI-derived-learning bright-line violation at ingestion boundary  
16. Baseline outside 42L `consumedByLaunchKpiFamilies` per header  
17. `output_classification` other than `"recommendation_for_human_review"`

---

## Lock Gates (42S)

### Path A (Generic-only)

- Waves 1–2 + 42R/42S software audit PASS
- `VERIFY_EXIT:0`; `PROBE_EXIT:0`; TSC clean
- Healthcare deferred-pending-specialist-pool
- No Business Precondition required

### Path B (Full with Healthcare)

- Waves 1–4 software audit PASS
- Verifier + probe + TSC as above
- Business Precondition #1–3 fulfilled
- Healthcare `active` for `us_gaap`

### Both paths

Honest content caveat: audit confirms structure and controls; does not confirm treatment methodology correctness. Specialist pool authors and attests methodology. B1 attrition runbook documented in audit package warnings.

---

## Namespace and Build Conventions

**Namespace:** `lib/intelligence/synthetic/industry/`  
**Verifier:** `scripts/verify-ii-industry-intelligence.js`

Build cadence:

1. Build one module at a time
2. Run verifier and TypeScript
3. Audit single module → PASS / PARTIAL / FAIL
4. Commit
5. Proceed to next module

---

## Recommended First Implementation

Begin with **42A Industry-Dimension Memory Reservation**. Reserve `industryClassification` and `industrySubClassification` before any industry-specific treatment memory is written.

Then build 42B–42H (architecture before content). Populate Generic (42I–42L). At the fork, choose Path A or Path B.

**Build begins now that this document is locked.**
