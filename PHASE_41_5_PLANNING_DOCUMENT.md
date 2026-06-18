# Phase 41.5 Planning Document - Ready for Review

## Standards Intelligence & Multi-Framework Architecture

**Document Owner:** Matthew Wiseman  
**Company:** Wiseman Financial Technologies LLC  
**Product:** Advisacor  
**Phase:** Phase 41.5 - Standards Intelligence & Multi-Framework Architecture  
**Status:** Planning - Ready for Review  
**Depends On:** Phase 40 locked; Phase 40.5 locked  
**Namespace:** `lib/intelligence/synthetic/standards/`  
**Verifier:** `scripts/verify-si-standards-intelligence.js`

## Purpose

Phase 41.5 makes Advisacor framework-aware. The platform recognizes that different entities report under different accounting frameworks, including US GAAP, IFRS for SMEs, Full IFRS, and jurisdictional variants. It applies the correct treatment to each entity based on that entity's configured framework without mixing framework knowledge across entities.

This phase delivers a multi-framework standards content library, entity-level framework segregation, dual-book reporting support, framework-aware onboarding, a conversion engine, and governed framework changes. US GAAP and IFRS are first-class frameworks. US GAAP content is authored and marked active first; IFRS for SMEs and Full IFRS are authored and human-reviewed inside this phase as co-equal frameworks.

Phase 41.5 is the international readiness gate for Advisacor. Combined with Phase 42.5 Trust & Compliance, it makes the platform internationally sellable.

## Exit Criteria

Phase 41.5 is complete and lockable only when all are true:

- Standards verifier exits `0`.
- TypeScript is clean across `lib/intelligence/synthetic/standards/`.
- Memory framework-dimension is reserved in the key schema before any framework-specific treatment memory is written.
- 41.5A is built first, ahead of contracts and every other module.
- Every module has its own per-module audit doc committed.
- No `executable: true` marker exists anywhere in the namespace.
- Phase 40 and Phase 40.5 handoff hashes match across consuming modules.
- All guardrail markers are present and literal `true` where required.
- US GAAP, IFRS for SMEs, and Full IFRS libraries are complete, human-reviewed, and active.
- GAAP/IFRS Differences Catalog is complete and human-reviewed.
- Every active treatment carries per-treatment review attestation: `reviewerIdentity` and `reviewDate`.
- No reproduced authoritative standards text exists anywhere in the namespace.
- Framework segregation is verified across memory, treatments, recommendations, and artifacts.
- Cross-framework contamination test passes.
- Named four-entity topology test passes.
- Dual-book entities produce framework-tagged artifacts that never cross boundaries.
- Conversion engine produces valid conversion entries for all material differences in the Differences Catalog.
- Framework Change Governance prevents framework changes without full approval and conversion impact analysis.
- Phase 39 Role Adapter verifies every AI role calls the Treatment Resolver.
- Non-active framework selection fails closed with a clear "not yet supported" result.

## Non-Goals

Phase 41.5 does not include:

- Reproduction of authoritative standards text.
- Licensed standards content.
- Real-time standards currency.
- ISA, AICPA AU-C, or PCAOB AS audit standards content.
- Localized treatment content.
- Local GAAP content beyond frameworks named active in this phase.
- Tax basis reporting.
- Industry-specific framework application.
- Live FASB or IFRS Foundation publication-system integrations.
- Pricing, packaging, or customer-facing IFRS marketing.

Anything proposed mid-build that falls in this list is deferred.

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
```

Phase 41.5 owns Standards Intelligence. Every Phase 39 role, every Phase 41+ department product, every reconciliation, every journal entry, and every disclosure consults the Treatment Resolver.

## Core Principle: Framework Segregation

Framework segregation is non-negotiable.

- One customer can have many entities.
- Each entity has one primary reporting framework and optionally one or more secondary frameworks.
- Knowledge, memory, treatments, recommendations, and artifacts are scoped by framework at entity level.
- Every artifact carries `reportingFramework` or `reportingFrameworks`.
- Retrieval, lookup, and recommendation generation filter by framework.
- Framework cannot be silently defaulted.
- Cross-framework retrieval returns empty or fails closed.
- Framework is a scoping dimension, not a fourth isolation peer.
- `customerIsolation`, `firmIsolation`, and `clientIsolation` remain the isolation model.

## Named Four-Entity Topology Test

The verifier instantiates Customer X with:

- Entity A: US GAAP.
- Entity B: IFRS for SMEs.
- Entity C: dual-book with US GAAP primary and Full IFRS secondary.
- Entity D: US GAAP.

The verifier proves:

- Entity A US GAAP treatment memory propagates to Entity D and Entity C's US GAAP primary book.
- Entity A US GAAP memory is invisible to Entity B and Entity C's Full IFRS secondary book.
- Entity B IFRS for SMEs memory is invisible to Entity A, Entity D, Entity C's US GAAP primary book, and Entity C's Full IFRS secondary book.
- Entity C's US GAAP primary and Full IFRS secondary books are mutually invisible.
- Framework-agnostic intelligence propagates across all four entities.
- No artifact crosses `customerIsolation`.

## Non-Negotiable Guardrails

Every Phase 41.5 module must obey:

- Framework segregation on every artifact.
- Fail closed on framework determination.
- No reproduced copyrighted standards text.
- `containsCopyrightedText: false` on every treatment.
- Every treatment is human-authored and human-reviewed before active.
- Active treatments require `reviewerIdentity` and `reviewDate`.
- Outputs inform and cite; they never issue professional advice.
- Inactive frameworks fail closed on selection.
- Multi-framework per entity is first-class.
- Functional currency and presentation currency are separate.
- Framework changes are governed events.
- `executable: false` on every artifact.
- `customerIsolation`, `firmIsolation`, and `clientIsolation` on every artifact.
- Deterministic `stableSnapshotHash` IDs throughout.
- Fail closed on missing identifiers.
- Phase 40 and Phase 40.5 handoffs are consumed.
- No AI model inference in the standards layer.
- Treatment versioning with `version` and `effectiveFromDate`.
- Historical transactions resolve against the effective treatment version.
- Cross-framework reasonableness checks flag material differences for human review.
- Append-only standards content history.

## Supported Framework Registry

| Framework | Identifier | Status After Lock |
| --- | --- | --- |
| US GAAP | `us_gaap` | `active` |
| IFRS for SMEs | `ifrs_for_smes` | `active` |
| Full IFRS (IASB) | `ifrs_iasb` | `active` |
| IFRS as endorsed by EU | `ifrs_eu` | `active` |
| IFRS as endorsed by UK | `ifrs_uk` | `active` |
| IFRS as endorsed by CA | `ifrs_ca` | `active` |
| IFRS as endorsed by AU | `ifrs_au` | `recognized_unpopulated` |
| FRS 102 (UK) | `frs_102` | `recognized_unpopulated` |
| German HGB | `de_hgb` | `recognized_unpopulated` |
| Brazilian GAAP | `br_gaap` | `recognized_unpopulated` |
| Other local GAAP | `local_other` | `recognized_unpopulated` |

Status meanings:

- `active`: populated, reviewed, selectable.
- `in_review`: populated, under review, not selectable.
- `recognized_unpopulated`: recognized, no content yet, not selectable.
- `deprecated`: formerly active, no longer maintained.

Selecting a non-active framework fails closed with "framework not yet supported."

## Module Order and Build Steps

Every module from 41.5C onward imports contract types only from 41.5B. No module defines its own contract types.

### Wave 1 - Standards Foundation

#### 41.5A Memory Framework-Dimension Reservation

Reserve `reportingFramework` as a recognized scoping dimension in the treatment-memory key schema before any framework-specific treatment memory is written.

Outputs and guardrails:

- Schema reservation only.
- No framework-specific treatment memory is written.
- Treatment-scoped memory categories are partitioned by framework.
- Framework-agnostic categories remain shared.
- Reserved clean with no retrofit.
- Built first, audited, and committed before 41.5B.

#### 41.5B Standards Contracts

Create shared type-only contracts for all standards intelligence artifacts.

Outputs:

- `StandardsTreatmentContract`
- `FrameworkRegistryContract`
- `TreatmentCitationContract`
- `FrameworkSelectionContract`
- `EntityFrameworkConfigurationContract`
- `TreatmentVersionContract`
- `TreatmentReviewAttestationContract`
- `ConversionAdjustmentContract`
- `DifferenceCatalogEntryContract`
- `FrameworkChangeRequestContract`
- `DisclosureRequirementContract`

Required guardrails include Phase 40 and 40.5 handoff consumption, `reportingFramework`, per-treatment review attestation, `containsCopyrightedText: false`, citation reference, isolation fields, `containsPHI`, `version`, `effectiveFromDate`, and `frameworkChangeRequiresGovernance: true`.

#### 41.5C Framework Registry

Declare supported frameworks with explicit status and fail-closed selection.

#### 41.5D Treatment Resolver

Provide deterministic treatment lookup by topic, entity, framework, and effective date. Roles call the resolver and never framework content directly.

#### 41.5E Framework Selector

Configure entity primary and secondary frameworks at onboarding and governed change.

#### 41.5F Multi-Framework Per Entity Support

Make dual-book reporting first-class with framework-tagged artifacts and framework-scoped retrieval.

#### 41.5G Functional/Presentation Currency

Capture functional and presentation currency separately. IFRS entities follow IAS 21; US GAAP entities follow ASC 830.

#### 41.5H Framework-Scoped Memory & Retrieval Discipline

Enforce framework-scoped memory retrieval at storage and retrieval layers.

### Wave 2 - Onboarding & Governance

#### 41.5I Multi-Entity Onboarding Wizard

Capture framework selection, entity hierarchy, currency, parent relationships, ownership percentage, consolidation method, and dual-book setup.

#### 41.5J Framework Change Governance

Treat framework changes as regulated events requiring reason code, conversion impact analysis, multi-party approval, immutable historical books, immutable log entry, and downstream notifications.

#### 41.5K Consolidation Hierarchy & Mixed-Framework Consolidation

Maintain consolidation hierarchy and invoke conversion entries where parent and subsidiary frameworks differ.

### Wave 3 - Standards Content Libraries

#### 41.5L US GAAP Treatment Library

Author and review Advisacor-authored US GAAP treatments keyed by ASC topic. Each treatment carries citation, disclosure requirements, common pitfalls, reviewer identity, review date, and active status only after review.

#### 41.5M IFRS for SMEs Treatment Library

Author and review IFRS for SMEs treatments keyed by section. Each treatment is written in Advisacor's own words, cited by section reference, and active only after review.

#### 41.5N Full IFRS Treatment Library

Author and review Full IFRS treatments keyed by IAS/IFRS standard, including jurisdictional overlays for endorsed variants after IASB baseline activation.

#### 41.5O GAAP/IFRS Differences Catalog

Create a structured catalog of material US GAAP and IFRS differences, including treatment summaries, citations, difference direction, materiality flag, conversion notes, variants, reviewer identity, and review date.

### Wave 4 - Conversion & Currency

#### 41.5P Framework Conversion Engine

Produce conversion adjustment entries from primary to secondary frameworks by consuming the Differences Catalog. Conversion entries are framework-tagged, auditable, reversible, and human-reviewed before posting.

#### 41.5Q Cross-Framework Reasonableness Checker

For dual-book entities, compare treatments across frameworks and flag material differences for human review.

#### 41.5R Currency Translation Engine

Translate transaction, functional, and presentation currency under IAS 21 and ASC 830 metadata rules. Hyperinflationary handling is recognized but unpopulated.

### Wave 5 - Currency Tracking & Role Integration

#### 41.5S Standards Currency Tracking

Track standard versions, amendments, review status, treatment freshness, pending changes, and jurisdictional endorsement status.

#### 41.5T Phase 39 Role Adapter Update

Retrofit Phase 39 roles to consume the Treatment Resolver instead of hardcoded framework treatments.

#### 41.5U Disclosure Requirements Layer

Carry framework-specific disclosure requirements alongside recognition and measurement treatments for downstream reporting phases.

### Wave 6 - Verification and Lock

#### 41.5V Standards Intelligence Verifier

Create `scripts/verify-si-standards-intelligence.js`.

The verifier checks:

- Required directories and files.
- Standards contracts.
- Framework registry statuses and fail-closed selection markers.
- Resolver indirection.
- Per-treatment review attestation.
- `containsCopyrightedText: false`.
- Citation references.
- Deterministic IDs.
- Fail-closed behavior.
- `executable: false`.
- Separate isolation fields.
- Phase 40 and 40.5 handoff consumption.
- Treatment versioning.
- Framework segregation.
- Functional and presentation currency.
- 41.5A memory-dimension reservation.
- Named topology test.
- Cross-framework contamination test.
- Banned runtime imports and AI inference calls.

#### 41.5W Final Phase 41.5 Audit and Lock

Perform a read-only comprehensive audit against exit criteria. Lock only when every area passes. If any area is `PARTIAL` or `FAIL`, report gaps and do not lock.

## Customer-Facing IFRS Gate

IFRS becomes customer-facing only after:

1. Treatment content is authored and reviewed with per-treatment attestation.
2. One real international entity's books are validated end-to-end.
3. Phase 42.5 Trust & Compliance baseline is locked.

Until all three are true, IFRS is first-class in architecture but not exposed in onboarding selection or marketing.

## Namespace and Build Conventions

Namespace: `lib/intelligence/synthetic/standards/`  
Verifier: `scripts/verify-si-standards-intelligence.js`

Build cadence:

1. Build one module at a time.
2. Run verifier and TypeScript.
3. Audit the single module.
4. Commit.
5. Proceed to the next module.

Real-data test register examples:

- Treatment accuracy against real GAAP transactions.
- Treatment accuracy against real IFRS transactions.
- Framework segregation under real multi-entity loads.
- Conversion engine accuracy against real dual-book ledgers.
- Onboarding wizard against real multi-entity scenarios.
- Framework change governance under real change-event load.

## Recommended First Implementation

Begin with 41.5A Memory Framework-Dimension Reservation. Reserve the framework dimension before anything writes framework-specific memory.

Then build:

1. 41.5B Standards Contracts.
2. 41.5C Framework Registry.
3. 41.5D Treatment Resolver.
4. 41.5E Framework Selector.
5. 41.5F Multi-Framework Per Entity Support.
6. 41.5G Functional/Presentation Currency.
7. 41.5H Framework-Scoped Memory & Retrieval Discipline.

Build the architecture before populating content. US GAAP library is populated and active first, IFRS for SMEs second, Full IFRS third, and the Differences Catalog alongside.

Planning only. Build begins once this document is locked.
