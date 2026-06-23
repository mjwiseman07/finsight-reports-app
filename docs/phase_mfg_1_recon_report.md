---
status: DRAFT / SPEC ONLY — NOT EXECUTABLE
executable: false
containsVerticalComplianceLogic: true
phase: Manufacturing Vertical Knowledge Stack — Wave 2 / Phase MFG-1 / Reconnaissance
artifact: Cursor Reconnaissance Report
locked: false
mode: READ-ONLY RECONNAISSANCE — NO CODE CHANGES PERMITTED
---

# Phase MFG-1 — Manufacturing Knowledge Stack Reconnaissance Report

**Recon completed:** 2026-06-22  
**Baseline commit:** `12ff209` (`architecture-lane-refactor-baseline`, atop `5e5bf14` LOCK-42.5.1)  
**Wave 1 sources:** `docs/manufacturing/wave1/` (7 files, commit `12ff209`)  
**Output constraint:** This file only. No verifier/probe runs. No Phase 42 / 42.5 source edits.

---

## Section A — DRAFT/SPEC Banner

```
---
status: DRAFT / SPEC ONLY — NOT EXECUTABLE
executable: false
containsVerticalComplianceLogic: true
phase: Manufacturing Vertical Knowledge Stack — Wave 2 / Phase MFG-1 / Reconnaissance
artifact: Cursor Reconnaissance Report
locked: false
mode: READ-ONLY RECONNAISSANCE — NO CODE CHANGES PERMITTED
---
```

**DRAFT / SPEC ONLY — DO NOT EXECUTE BUILDS.** Read-only recon pass. No spine code, no D0 proof, no PC gates passed.

---

## Section B — Lock-State Verification

### B.1 — Repository HEAD and working tree notes

| Field | Value |
|---|---|
| `git rev-parse HEAD` | `12ff209843b11fab442450ca5f05a51478714168` |
| Branch | `architecture-lane-refactor-baseline` |
| Wave 1 commit | `12ff209` — `docs(mfg): add Wave 1 manufacturing knowledge stack (MFG-K-A through MFG-K-E)` |

**Pre-existing working tree noise (NOT from MFG-1 recon — do not modify):**

| Path | State |
|---|---|
| `PHASE_42_5_PLANNING_DOCUMENT.md` | Modified (prior session) |
| `ops/compliance/overlay-extensibility/D0_OVERLAY_EXTENSIBILITY_EVIDENCE.json` | Modified |
| `ops/compliance/overlays/hipaa/nprm/D0_NPRM_REGISTER_EVIDENCE.json` | Modified |
| `ops/compliance/overlays/hipaa/pack/D0_HIPAA_PACK_EVIDENCE.json` | Modified |
| `ops/compliance/trust-package/D0_TRUST_PACKAGE_EVIDENCE.json` | Modified |
| `.tmp-verifier-diff.txt`, `Advisacor_Architecture.md`, `Advisacor_Master_Planning_Document.md`, `Phase34_Master_Status.md` | Untracked (predate session) |

### B.2 — Phase 42 lock rule (founder amendment 5)

**Rule:** Ancestors of `b11adcd` are inside the lock. Violation = any commit **after** `b11adcd` that touches Phase 42–annotated files.

**Post-`b11adcd` range log (verbatim):**

```text
$ git log b11adcd..HEAD --oneline -- lib/intelligence/synthetic/industry/ \
    PHASE_42N1_HEALTHCARE_KPIS_BASELINE.md PHASE_42O_HEALTHCARE_DISCLOSURES_BASELINE.md \
    PHASE_42P_HEALTHCARE_BENCHMARKS_BASELINE.md PHASE_42M_HEALTHCARE_TREATMENTS_BASELINE.md \
    PHASE_42I_GENERIC_TREATMENTS_BASELINE.md scripts/verify-ii-industry-intelligence.js

(empty — no output lines)
```

**Result:** **ALL CLEAR** — no Phase 42 industry code or II verifier touched after `b11adcd`. Wave 1 manufacturing docs at `docs/manufacturing/wave1/` are additive and outside the Phase 42 lock tree.

### B.3 — Phase 42 file last-touch inventory (sample + manifest)

Lock baseline: `b11adcd` — `lock Phase 42 — Industry Intelligence Libraries (42S documented attestation…)`.

| Path | Last commit (`git log -1 --oneline`) | After `b11adcd`? |
|---|---|---|
| `PHASE_42S_LOCK.md` | `b11adcd` lock Phase 42… | N |
| `PHASE_42N1_HEALTHCARE_KPIS_BASELINE.md` | `1ecdb0a` patch Phase 42N1 KPI definitions to v1.1… | N (ancestor) |
| `PHASE_42O_HEALTHCARE_DISCLOSURES_BASELINE.md` | `8f15a73` patch Phase 42O disclosure requirements to v1.1… | N |
| `PHASE_42P_HEALTHCARE_BENCHMARKS_BASELINE.md` | `237db94` patch Phase 42P benchmarks to v1.1… | N |
| `PHASE_42M_HEALTHCARE_TREATMENTS_BASELINE.md` | `8417ce4` load Phase 42M healthcare treatments… | N |
| `PHASE_42I_GENERIC_TREATMENTS_BASELINE.md` (us_gaap) | `e5d3053` load Phase 42I generic us_gaap… | N |
| `PHASE_42I_GENERIC_TREATMENTS_IFRS_IASB_BASELINE.md` | `568d162` load Phase 42I generic full-IASB-IFRS… | N |
| `PHASE_42I_GENERIC_TREATMENTS_IFRS_EU_BASELINE.md` | `e686e74` load Phase 42I generic IFRS-EU… | N |
| `PHASE_42I_GENERIC_TREATMENTS_IFRS_FOR_SMES_BASELINE.md` | `5a27f68` load Phase 42I generic IFRS-for-SMEs… | N |
| `lib/intelligence/synthetic/industry/industry-resolver/buildIndustryResolution.ts` | `ba966a5` enforce Treatment-11 healthcare applicabilityGuard… | N |
| `scripts/verify-ii-industry-intelligence.js` | `3c9f26e` add Phase 42R full industry intelligence verifier… | N |
| `scripts/probe-ii-industry-intelligence.js` | `ba966a5` (22nd poison case) | N |

v1.1 patches (`1ecdb0a`, `8f15a73`, `237db94`) are **ancestors** of `b11adcd` — inside lock by construction.

### B.4 — Production IFRS tenant scan (founder amendment 3)

**Assumption:** Greenfield IFRS — none in production.

**Scan:** `ifrs_iasb`, `ifrs_eu`, `ifrs_for_smes` in `supabase/migrations/`, `app/`, seed data — **no production tenant configuration found**. IFRS framework IDs appear only in synthetic intelligence fixtures (`lib/intelligence/synthetic/standards/`), Phase 42I baselines, and verifier test harnesses.

**Result:** **No CRITICAL flag.** Recon proceeded.

---

## Section C — Current Reporting-Basis State

### C.1 — Does `reportingBasis` exist?

**No.** The literal identifier `reportingBasis` / `accountingBasis` does **not** exist in executable TypeScript today.

**Closest spine primitive:** `reportingFramework` on standards and industry contracts:

```typescript
// lib/intelligence/synthetic/standards/contracts/StandardsContracts.ts
export type StandardsReportingFramework =
  | "us_gaap"
  | "ifrs_for_smes"
  | "ifrs_iasb"
  | "ifrs_eu"
  | "ifrs_uk"
  | "ifrs_ca"
  | "ifrs_au"
  | "frs_102"
  | "de_hgb"
  | "br_gaap"
  | "local_other";
```

Wave 1 planning doc (`MANUFACTURING_VERTICAL_PLANNING_DOCUMENT.md`) already declares the **target** panel field `reportingBasis: 'US_GAAP' | 'IFRS'` in the `ManufacturingVariancePanel` interface — **spec only**, not implemented.

### C.2 — Framework infrastructure today

| Location | Role |
|---|---|
| `lib/intelligence/synthetic/standards/framework-selector/` | Per-entity framework selection contracts; `frameworkSetPerEntityNotPerCompany: true` |
| `lib/intelligence/synthetic/standards/treatment-resolver/buildTreatmentResolution.ts` | Requires `entityId`; fail-closed on framework |
| `lib/intelligence/synthetic/industry/industry-resolver/buildIndustryResolution.ts` | `queryFramework`, `frameworkIsActive`, `entityId` |
| `lib/intelligence/synthetic/standards/differences-catalog/buildDifferenceCatalogEntry.ts` | Cross-framework divergence metadata (LIFO, revaluation) |
| `PHASE_42I_*.md` + generic loaders | Framework-separated treatment baselines |
| `scripts/verify-si-standards-intelligence.js` | Enforces `reportingFramework` on framework-scoped builders |

### C.3 — Implicit US GAAP assumption locations

| Location | Implicit assumption |
|---|---|
| `lib/intelligence/synthetic/industry-profiles/manufacturing/profile.ts` | Thin profile (4 KPIs); no basis field |
| `lib/industry-intelligence-framework.js` | Resolves from `company.industry_type` only |
| `app/onboarding/page.tsx` | `industry_type` enum string; no NAICS, no framework |
| `app/upload/page.tsx` | `packageDefaultSections` — PDF report sections; US-centric financial reports |
| `lib/intelligence/synthetic/audit/lease-intelligence/` | `asc842_candidate` category; no framework guard |
| `lib/fixed-asset-roll-forward.js` | Valuation adjustment fields; no framework discriminator |
| Healthcare industry builders | Default `reportingFramework: "us_gaap"` at healthcare launch scope |

**Conclusion:** Codebase is **implicitly US GAAP–oriented** at the product/onboarding/audit layers, while the **standards intelligence layer** already partitions content by `reportingFramework`.

---

## Section D — Cross-Blend Audit (CRITICAL)

| # | Conflict | Current state | Cross-blend risk if Wave 2 ships as-is |
|---|---|---|---|
| 1 | **Inventory cost flow (LIFO)** | LIFO permitted in `PHASE_42I_GENERIC_TREATMENTS_BASELINE.md` (us_gaap); prohibited in all IFRS baselines. Wave 1 `Manufacturing_Disclosures_Sources.md` §1.3 documents LIFO + IRC §472 conformity. `Manufacturing_IFRS_Sources.md` §1.3: LIFO **prohibited** — field must not exist on IFRS records. No `inventoryMethod` code identifier in repo. | **LOW** in standards layer (framework-separated baselines). **HIGH** once manufacturing panel/widgets ship without `reportingBasis` guard — LIFO reserve widget could render for IFRS tenants. |
| 2 | **Lease classification** | Three models in baselines: ASC 842 dual (us_gaap), IFRS 16 single lessee (ifrs_iasb/eu), IAS 17 (ifrs_for_smes). Wave 1 disclosures cover ASC 842 + IFRS 16. | **MEDIUM** — `buildLeaseIntelligenceObservation.ts` emits `asc842_candidate` with **zero** `reportingFramework`; audit layer framework-blind. |
| 3 | **PP&E componentization** | IAS 16 requires component depreciation (IFRS); ASC 360 permits but does not require. Documented in Phase 42I + Wave 1 IFRS doc §2.3. No `componentization` code identifier. | **LOW** for mixing (prose-only today). **MEDIUM** when FOH standard rates feed variance panel without basis-aware depreciation inputs. |
| 4 | **PP&E revaluation** | GAAP prohibits revaluation; IFRS permits revaluation model by class (IAS 16.31). Wave 1 IFRS doc §2.4. `property_revaluation` in differences catalog. | **LOW** for active mixing. Net-new **IAS 16 revaluation widget** must be `IFRS` only per founder plan. |
| 5 | **Disclosure templates** | `buildDisclosureRequirement.ts` is framework-tagged (`frameworkTaggedNeverBleedsAcrossFrameworks`). **Reg S-K / ItemNumber / disclosureTemplate not implemented** in code (Wave 1 docs only). Healthcare disclosures at `PHASE_42O_*` + builders. | **NONE** for cross-blend (feature gap, not mixing). Manufacturing Reg S-K content lives in Wave 1 markdown only. |

### D.1 — CRITICAL FLAGS (unguarded mixing)

| Flag | Path | Issue |
|---|---|---|
| **CB-01** | `lib/intelligence/synthetic/audit/lease-intelligence/buildLeaseIntelligenceObservation.ts` | `asc842_candidate` label applied without `reportingFramework` / `ReportingBasis` guard |
| **CB-02** | `lib/intelligence/synthetic/audit/**` (systemic) | Entire audit observation tree has **zero** framework dimension |
| **CB-03** | `lib/fixed-asset-roll-forward.js` | Valuation adjustments without framework scoping (watch — purchase-accounting shaped, not IAS 16 revaluation) |

### D.2 — Data model CRITICAL (Section I; repeated here)

**CB-04:** No persisted **tenant → entity → NAICS → per-entity `reportingBasis`** hierarchy. Q7 assumption in Wave 1 planning doc is **not implemented** in Supabase or onboarding.

---

## Section E — Spine Touchpoint Map

| Path | Touch type | Why | Cross-blend sensitive? |
|---|---|---|---|
| `docs/manufacturing/wave1/*` | no change but recon target | Wave 1 authority; already committed | N |
| `lib/intelligence/synthetic/industry/libraries/manufacturing/` | **new file** | MFG-K-A KPI definitions + loaders (mirror healthcare) | Y |
| `lib/intelligence/synthetic/industry/manufacturing/variance/` | **new file** | Variance evaluators MFG-V-01..08, MFG-FV-01..08 | Y |
| `lib/intelligence/synthetic/industry/disclosure-variants/manufacturing/` | **new file** | Manufacturing disclosure variants | Y |
| `lib/intelligence/synthetic/industry/contracts/manufacturing/ManufacturingBasisContracts.ts` | **new file** | Discriminated unions: Inventory, Lease, PPE, RevenueContract, DisclosurePackage | Y |
| `lib/intelligence/synthetic/standards/contracts/ReportingBasis.ts` | **new file** | `ReportingBasis` type + `basisOf()` helper | Y |
| `lib/intelligence/synthetic/standards/contracts/index.ts` | **new export from existing module** | Re-export `ReportingBasis` / `basisOf` | N |
| `lib/dashboard/panels/manufacturing-variance/` | **new file** | Panel contract (`contract.ts`) per planning doc — **path does not exist today** | Y |
| `lib/intelligence/synthetic/command-center/surface-candidates/buildCommandCenterSurfaceCandidate.ts` | **additive insertion** | Add `applicableBasis: ReportingBasis[]` to input + candidate | Y |
| `lib/intelligence/synthetic/industry/industry-registry/buildIndustryRegistry.ts` | **additive insertion** | Register manufacturing vertical | N |
| `lib/intelligence/synthetic/industry-profiles/manufacturing/profile.ts` | **additive insertion** | Expand from 4 KPIs toward Wave 1 catalog | N |
| `lib/intelligence/synthetic/industry/industry-resolver/buildIndustryResolution.ts` | **additive insertion** | Wire manufacturing + framework query | Y |
| `scripts/verify-manufacturing-knowledge-stack.js` | **new file** | MFG-K-I verifier (CHK-MFG namespace) | N |
| `scripts/probe-ops-control-spine.js` | **additive insertion** | PC-MFG-01..05 panel isolation poisons (per planning doc) | Y |
| `app/onboarding/page.tsx` | **additive insertion** | NAICS + reportingBasis + multi-entity sub-flow (downstream UI) | Y |
| `supabase/migrations/` (entities table TBD) | **new file** (Wave 2+ decision) | Per-entity NAICS + framework — **OPEN QUESTION; no schema proposed in recon** | Y |
| `ops/control-spine/`, `ops/compliance/` | no change but recon target | 42.5 lane; manufacturing must not import into spine | N |
| `PHASE_42*` / `lib/intelligence/synthetic/industry/libraries/healthcare/*` | no change but recon target | Locked healthcare precedent | N |
| `app/upload/page.tsx` (`packageDefaultSections`) | **out of scope** | PDF sections ≠ runtime Command Center panels (founder amendment 4) | N |

**Hard rule check:** Zero entries marked "edit existing logic" or "modify existing CHK." Any future need to change locked Phase 42 files → **escalate as OPEN QUESTION**, not recon edit.

---

## Section F — Type-System Isolation Plan (proposed only — NOT written)

### F.1 — ReportingBasis derived type (founder amendment 2)

**Keep `StandardsReportingFramework` enum untouched.**

**Proposed net-new** at `lib/intelligence/synthetic/standards/contracts/ReportingBasis.ts`:

```typescript
// PROPOSED — NOT YET WRITTEN
export type ReportingBasis = 'US_GAAP' | 'IFRS';

export function basisOf(fw: StandardsReportingFramework): ReportingBasis {
  return fw === 'us_gaap' ? 'US_GAAP' : 'IFRS';
}
```

- Accounting / treatment resolution continues to use full `StandardsReportingFramework`.
- Command Center panel router guard uses binary `ReportingBasis`.
- MFG-K-C2 (IFRS) applies to `ifrs_for_smes`, `ifrs_iasb`, and `ifrs_eu` — all map to `IFRS` via `basisOf()`.

### F.2 — Discriminated unions (single declaration site)

**Proposed:** `lib/intelligence/synthetic/industry/contracts/manufacturing/ManufacturingBasisContracts.ts`

#### Inventory

```typescript
// PROPOSED — NOT YET WRITTEN
interface USGAAPInventory {
  basis: 'US_GAAP';
  method: 'FIFO' | 'LIFO' | 'WeightedAverage' | 'SpecificID';
  lifoReserve?: number;  // only when method === 'LIFO'
}
interface IFRSInventory {
  basis: 'IFRS';
  method: 'FIFO' | 'WeightedAverage';  // LIFO not in union
  // lifoReserve does not exist
}
type Inventory = USGAAPInventory | IFRSInventory;
```

#### Lease

```typescript
// PROPOSED — NOT YET WRITTEN
interface USGAAPLease {
  basis: 'US_GAAP';
  classification: 'operating' | 'finance';
  rouAsset?: number;
  leaseLiability?: number;
}
interface IFRSLease {
  basis: 'IFRS';
  model: 'ifrs16_single_model';  // ROU + liability; no operating/finance lessee split
  rouAsset: number;
  leaseLiability: number;
}
type Lease = USGAAPLease | IFRSLease;
```

#### PPE

```typescript
// PROPOSED — NOT YET WRITTEN
interface USGAAP_PPE {
  basis: 'US_GAAP';
  measurement: 'historical_cost';
  componentized: boolean;  // permitted, not required
}
interface IFRS_PPE {
  basis: 'IFRS';
  measurement: 'cost' | 'revaluation';
  componentized: true;  // IAS 16.43 required
  revaluationSurplus?: number;  // only when measurement === 'revaluation'
}
type PPE = USGAAP_PPE | IFRS_PPE;
```

#### RevenueContract

```typescript
// PROPOSED — NOT YET WRITTEN
interface USGAAPRevenueContract {
  basis: 'US_GAAP';
  standard: 'ASC606';
  recognitionPattern: 'point_in_time' | 'over_time';
}
interface IFRSRevenueContract {
  basis: 'IFRS';
  standard: 'IFRS15';
  recognitionPattern: 'point_in_time' | 'over_time';
}
type RevenueContract = USGAAPRevenueContract | IFRSRevenueContract;
```

#### DisclosurePackage

```typescript
// PROPOSED — NOT YET WRITTEN
interface USGAAPDisclosurePackage {
  basis: 'US_GAAP';
  regimes: ('ASC330' | 'ASC842' | 'RegSK')[];
  lifoReserveDisclosureRequired: boolean;
}
interface IFRSDisclosurePackage {
  basis: 'IFRS';
  regimes: ('IAS2' | 'IAS16' | 'IFRS15' | 'IFRS16')[];
  lifoReserveDisclosureRequired: false;  // literal false — compile-time exclusion
}
type DisclosurePackage = USGAAPDisclosurePackage | IFRSDisclosurePackage;
```

---

## Section G — Panel Router Guard Plan

### G.1 — Registry shape today

**No `panels/registry.ts`.** Per founder amendment 4, extend Command Center only.

**Authoritative runtime surface:** `lib/intelligence/synthetic/command-center/surface-candidates/buildCommandCenterSurfaceCandidate.ts`

- `SyntheticCommandCenterSurfaceArtifactCategory` (16 values): `executive_summary`, `attention_item`, `risk_item`, `recommendation_item`, `forecast_item`, `scenario_item`, `cash_item`, `health_item`, `close_item`, `portfolio_item`, `firm_item`, `controller_item`, `workforce_item`, `industry_item`, `govcon_item`, `healthcare_item`, `inventory_item`
- `BuildCommandCenterSurfaceCandidateInput` has **no** `applicableBasis` field today
- Candidates carry `companyId` from prioritization package — **company-scoped**, not entity-scoped

**Wave 1 target panel (not yet on disk):** `lib/dashboard/panels/manufacturing-variance/` — planning namespace; **directory absent** in repo.

**Out of scope for panel guard:** `app/upload/page.tsx` `packageDefaultSections` — PDF report sections only.

### G.2 — Proposed additive metadata

```typescript
// PROPOSED — NOT YET WRITTEN
interface BuildCommandCenterSurfaceCandidateInput {
  // ...existing fields untouched...
  applicableBasis: ReportingBasis[];  // default ['US_GAAP', 'IFRS'] for basis-agnostic panels
}
```

### G.3 — Panel / widget catalog

| Panel / widget ID | Current file / status | Proposed `applicableBasis` | Reasoning |
|---|---|---|---|
| `manufacturing_variances` (core) | **net-new** `lib/dashboard/panels/manufacturing-variance/` | `['US_GAAP', 'IFRS']` | IMA variance math is basis-agnostic; standard inputs must be basis-sourced |
| `mfg_forecast_variance_section` | net-new (panel subsection) | `['US_GAAP', 'IFRS']` | MFG-FV-01..08 mirror realized; IFRS routing on standard cost inputs |
| `mfg_dm_mix_yield` (MFG-V-09/10) | net-new drill-down | `['US_GAAP', 'IFRS']` | Applies primarily to P/H; sub-segment gated separately |
| `lifo_reserve_widget` | **net-new** | `['US_GAAP']` | LIFO prohibited under IAS 2; field must not exist on IFRS records |
| `ias16_revaluation_widget` | **net-new** | `['IFRS']` | Revaluation model not permitted under US GAAP |
| `inventory_item` (CC surface) | existing category | `['US_GAAP', 'IFRS']` | Basis-agnostic inventory KPIs; LIFO-specific metrics excluded at data layer |
| `industry_item` (CC surface) | existing category | `['US_GAAP', 'IFRS']` | Generic industry routing |
| `healthcare_item` (CC surface) | existing category | `['US_GAAP']` (today) | Healthcare launch scope us_gaap; not manufacturing |
| `executive_summary` … `workforce_item` | existing categories | `['US_GAAP', 'IFRS']` | Basis-agnostic executive surfaces |

**Healthcare precedent (structural, not basis-aware):** `buildRevenueCycleCommandCenterPackage.ts` routes by `isHealthcareUnit`, not accounting basis.

---

## Section H — Sub-Segment Routing Map (Q1 + Q7)

**Source:** Wave 1 `Manufacturing_KPIs_Sources.md` Panel Contract Crosswalk (§Closing) + `Manufacturing_Benchmarks_Sources.md` Part I.2 NAICS mapping.  
**Legend:** ✓ applies | ◑ partial / founder override | — does not apply | ✗ prohibited

### H.1 — Variance panel fields × sub-segment (realized)

| Panel field / KPI | D | P | H | J | E |
|---|---|---|---|---|---|
| MFG-V-01 DM Price | ✓ | ✓ | ✓ | ✓ | ◑ |
| MFG-V-02 DM Usage | ✓ | ✓ | ✓ | ✓ | ◑ |
| MFG-V-03 DL Rate | ✓ | ✓ | ✓ | ✓ | ✓ |
| MFG-V-04 DL Efficiency | ✓ | ◑ | ✓ | ✓ | ✓ |
| MFG-V-05 VOH Spending | ✓ | ✓ | ✓ | ✓ | ✓ |
| MFG-V-06 VOH Efficiency | ✓ | ◑ | ✓ | ✓ | ✓ |
| MFG-V-07a FOH Spending | ✓ | ✓ | ✓ | ✓ | ✓ |
| MFG-V-07b FOH Volume | ✓ | ✓ | ✓ | ◑ | ◑ |
| MFG-V-08 Total | ✓ | ✓ | ✓ | ✓ | ✓ |
| MFG-V-09 Mix (decomp) | ◑ | ✓ | ✓ | — | — |
| MFG-V-10 Yield (decomp) | ◑ | ✓ | ✓ | — | — |

### H.2 — Basis-specific widgets × sub-segment

| Widget | D | P | H | J | E | Basis |
|---|---|---|---|---|---|---|
| LIFO reserve | ✓ | ✓ | ✓ | ◑ | ✗ | US_GAAP only |
| IAS 16 revaluation | ◑ | ◑ | ◑ | — | ◑ | IFRS only |

### H.3 — NAICS / sub-segment notes (Q7)

- **H (Hybrid)** has **no native NAICS code** — founder-declared per `Manufacturing_Benchmarks_Sources.md` Part I.4.
- Onboarding must **confirm or override** NAICS-derived sub-segment (step 2 in Part VII.3).
- Multi-entity tenants loop steps 1–4 **per entity** (Q7).

---

## Section I — Onboarding Flow Recon (Q7)

### I.1 — Current wizard (`app/onboarding/page.tsx`)

| Step | Name | Relevant fields |
|---|---|---|
| 0 | Customer Type | `accountType` |
| 1 | Connect Accounting | QBO / Xero / manual |
| 2 | Upload Reports | manual path |
| 3 | Select Industry | `industry_type` (includes `"Manufacturing"`) |
| 4 | Configure Pulse | delivery |
| 5 | Generate First Review | PDF |
| 6 | Dashboard | redirect |

**Missing today:** NAICS code, `reportingBasis` / `reportingFramework`, multi-entity loop, per-entity framework.

### I.2 — Entity selection today

- Xero: `selectXeroEntity` → `/api/accounting/select-entity` stores **ERP org** on `accounting_connections.external_entity_id`
- This is **not** an Advisacor legal/operating entity registry

### I.3 — Data model (`supabase/migrations/`)

| Table | Relevant columns |
|---|---|
| `companies` | `industry_type` (single coarse enum), `practice_id`, no NAICS, no framework |
| `accounting_connections` | `external_entity_id`, `tenant_or_realm_id` (ERP scope) |
| `company_settings` | `industry_intelligence jsonb` (company-level) |

**No** `entities`, `naics_code`, or `reporting_framework` columns.

### I.4 — Wave 1 planned insertion points (do not implement in MFG-1)

Per `Manufacturing_Benchmarks_Sources.md` Part VII.3:

1. After industry step (or new sub-step): **NAICS 3/6-digit** manual entry
2. **Sub-segment confirmation** (D/P/H/J/E) — mandatory for H/J/E judgment cases
3. **`reportingBasis` selection** — default `US_GAAP`; IFRS opt-in maps to `ifrs_iasb` / `ifrs_eu` / `ifrs_for_smes` at framework layer
4. **Multi-entity wizard branch** — loop 1–3 per operating company under one tenant

### I.5 — CRITICAL FLAG

**Tenant → entity → NAICS one-to-many with per-entity `reportingBasis` is required by Q7 but NOT supported by current schema or onboarding.** Escalate to founder before Wave 2 data-binding work. Recon does **not** propose schema DDL.

---

## Section J — Open Questions for Founder

| ID | Question | Status |
|---|---|---|
| **Q3** | Wave 1 file paths | **RESOLVED** — `docs/manufacturing/wave1/` |
| **Q2** | `ReportingBasis` vs `StandardsReportingFramework` | **RESOLVED** — derived type + `basisOf()`; panel guard uses binary; accounting uses full enum |
| **Q4** | Production IFRS tenants | **RESOLVED** — assume none; none found |
| **Q5** | Panel registry location | **RESOLVED** — Command Center `applicableBasis` only; no `panels/registry.ts` |
| **Q6** | Phase 42 lock interpretation | **RESOLVED** — post-`b11adcd` log empty; ancestors inside lock |
| **Q1** | Does data model support tenant→entity→NAICS per Q7? | **OPEN — CRITICAL** — **No** today; blocks entity-level panel routing |
| **J-01** | For multi-entity: new `entities` table vs extend `accounting_connections` as entity proxy? | **OPEN** — single-choice architecture decision |
| **J-02** | IFRS framework picker at onboarding: expose all three IFRS variants or single `IFRS` with internal default `ifrs_iasb`? | **OPEN** |
| **J-03** | Wave 2 build entry: confirm MFG-K-G (evaluator) before onboarding schema, or parallel tracks? | **OPEN** |
| **J-04** | Audit layer (`lib/intelligence/synthetic/audit/`): scope framework guards into Wave 2 or defer to Wave 3? | **OPEN** — CB-01/02 affect lease signals |
| **J-05** | `lib/dashboard/panels/` namespace: create new tree or place panel contract under `lib/intelligence/synthetic/industry/manufacturing/`? | **OPEN** — planning doc says former; no directory exists |
| **J-06** | Citation register xlsx: machine verification of URLs deferred to MFG-K-E — confirm founder review gate before code? | **OPEN** |

**Resolved Wave 1 planning questions (Q1–Q7 in planning doc):** all five sub-segments at v1.0; three standard-cost bases; LIFO included; progressive drill-down; full IFRS peer doc; forecast variances included; founder-set NAICS with multi-entity assumption recorded.

---

## Section K — Recon Findings Summary

| Category | Count | Notes |
|---|---|---|
| **CRITICAL FLAGS** | **4** | CB-01 lease audit GAAP label; CB-02 audit layer systemic; CB-03 fixed-asset roll-forward watch; CB-04 tenant→entity→NAICS data model gap |
| **HIGH-priority touchpoints** | **8** | `ReportingBasis.ts`, `ManufacturingBasisContracts.ts`, manufacturing variance evaluators, panel contract module, CC `applicableBasis`, industry registry, probe PC-MFG extension, onboarding/schema binding |
| **MEDIUM-priority touchpoints** | **6** | Manufacturing KPI/disclosure loaders, benchmarks profile routing, framework-selector wiring, audit lease guard (if in scope), `fixed-asset-roll-forward.js` review, industry profile expansion |
| **OPEN QUESTIONS for founder** | **6** | J-01 through J-06 (Q1 CRITICAL plus five architecture sequencing items) |
| **Phase 42 lock** | **ALL CLEAR** | Empty `b11adcd..HEAD` log on industry + II verifier paths |
| **Production IFRS tenants** | **None found** | Greenfield assumption holds |
| **Wave 1 files** | **7/7 present** | Including `Manufacturing_Citation_Verification_Register.xlsx` |
| **Recon timestamp** | **2026-06-22** | |
| **Cursor confidence (1–5)** | **4** | Wave 1 docs read in full for planning, KPI crosswalk, IFRS/GAAP divergence, benchmarks onboarding. Sub-segment matrix taken from KPI crosswalk + benchmarks Part I.2 (xlsx not machine-parsed in recon). Entity schema gap is clear blocker for Q7 wiring. |

---

**END — Phase MFG-1 Reconnaissance Report. Do not start Phase MFG-2 build spec until founder reviews this document.**
