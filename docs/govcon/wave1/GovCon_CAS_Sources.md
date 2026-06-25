# GovCon CAS (Cost Accounting Standards) Sources

**Document version:** v1.0
**Document authored:** 2026-06-25
**Document owner:** Matthew Wiseman / Wiseman Financial Technologies LLC
**Product:** Advisacor
**Branch:** `architecture-lane-refactor-baseline`
**Companion to:** `GovCon_DCAA_Vertical_Planning_Doc.md`, `GovCon_FAR31_Sources.md`, `Phase_GC_1_Recon_Spec.md`

---

> **DRAFT / SPEC ONLY — primary-source citation register for the Cost Accounting Standards (48 CFR Chapter 99).**
> All URLs verified 2026-06-25 against canonical `ecfr.gov` and `acquisition.gov` domains.
> `builderNeverAuthorsContent: true` — rule logic must cite these URLs; no hard-coded rule text.
> Strong-stance binding: full CAS coverage enforced for sub-segment **C (CAS-Covered)**; modified coverage cross-checked for any contractor crossing the $2M single-award trigger.

---

## §1 — CAS Statutory and Regulatory Framework

| Handle | Title | URL | Description |
|---|---|---|---|
| `CASB_41_USC_1502` | 41 USC §1502 — Cost Accounting Standards Board (statutory authority) | [Cornell LII 41 USC 1502](https://www.law.cornell.edu/uscode/text/41/1502) | Statutory authority for the CAS Board; CAS rules promulgated under this authority are binding on covered Federal contracts |
| `CASB_48_CFR_CH_99` | 48 CFR Chapter 99 — Cost Accounting Standards Board | [eCFR Title 48 Chapter 99](https://www.ecfr.gov/current/title-48/chapter-99) | Top-level regulatory chapter housing all CASB regulations: Parts 9901, 9903, 9904, 9905 |
| `CAS_9904_PART` | 48 CFR Part 9904 — Cost Accounting Standards (Non-Educational) | [eCFR Part 9904](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-B/part-9904) | Complete enumeration of all CAS for commercial/non-educational contractors (9904.401–9904.420) |
| `CAS_9905_PART` | 48 CFR Part 9905 — CAS for Educational Institutions | [eCFR Part 9905](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-B/part-9905) | Educational-institution-specific CAS; governs DS-2 Disclosure Statement; **out-of-scope for GC-1 commercial sub-segments** but noted for cross-blend trap |

---

## §2 — CAS Applicability and Coverage Thresholds (48 CFR Part 9903)

| Handle | Section | Title | URL | Trigger / Rule |
|---|---|---|---|---|
| `CASB_9903_201_APPLICABILITY` | 9903.201 | CAS Contract Requirements and Administration | [eCFR 9903.201](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-A/part-9903/section-9903.201) | Establishes contract-level applicability; CAS-covered contracts require compliance with applicable standards |
| `CASB_9903_201_1_TRIGGERS` | 9903.201-1 | CAS Applicability — Coverage Thresholds | [eCFR 9903.201-1](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-A/part-9903/section-9903.201-1) | **Modified CAS**: single non-exempt award **>$2M** (non-small-business). **Full CAS**: single award **>$50M** OR business unit received >$50M CAS-covered in immediately preceding cost accounting period |
| `CASB_9903_201_2_TYPES` | 9903.201-2 | Types of CAS Coverage | [eCFR 9903.201-2](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-A/part-9903/section-9903.201-2) | Differentiates Full vs. Modified coverage; under Modified coverage only CAS 401, 402, 405, 406 apply |
| `CASB_9903_201_3_4_CLAUSES` | 9903.201-3 / -4 | Solicitation Provisions and Contract Clauses | [eCFR 9903.201-3](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-A/part-9903/section-9903.201-3) | Required CAS clauses (FAR 52.230-2 Full / 52.230-3 Modified / 52.230-5 Educational) — clause selection logic |
| `CASB_9903_201_4_EXEMPTIONS` | 9903.201-1(b) | CAS Exemptions | [eCFR 9903.201-1](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-A/part-9903/section-9903.201-1) | **15 categorical exemptions**: small business set-asides, FFP contracts awarded without cost data, contracts <$2M, foreign-concern contracts, commercial-item contracts under FAR Part 12, etc. |
| `CASB_9903_202_DISCLOSURE` | 9903.202 | CAS Disclosure Requirements | [eCFR 9903.202](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-A/part-9903/section-9903.202) | Requires submission of Disclosure Statement (DS-1 commercial / DS-2 educational) as condition of contracting on covered contracts |
| `CASB_9903_202_1_GENERAL` | 9903.202-1 | Disclosure Statement — General Requirements | [eCFR 9903.202-1](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-A/part-9903/section-9903.202-1) | Triggers adequacy determination by CFAO; describes what cost accounting practices must be disclosed |
| `CASB_9903_202_9_DS1_ILLUSTRATION` | 9903.202-9 | DS-1 Illustrative Form | [eCFR 9903.202-9](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-A/part-9903/section-9903.202-9) | Illustration of the DS-1 form structure (8 parts: Part I General Info → Part VIII Home Office Expenses) |
| `CASB_9903_306_NONCOMPLIANCE` | 9903.306 | Interpretations / Noncompliance Resolution | [eCFR 9903.306](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-A/part-9903/section-9903.306) | Cost impact calculations; offset of cost impacts where contractor noncompliant or makes voluntary change |

---

## §3 — CAS Standards 9904.401–9904.420 (Eight Standards In-Scope for GC-1)

**Strong-build coverage:** all 8 standards listed below MUST be enforced for any contractor classified into sub-segment **C (CAS-Covered)**. Sub-segment **N (Non-CAS)** receives shadow-mode CAS 401/402/405 enforcement only (consistency + unallowable identification still required under FAR 31.201-2 and FAR 31.201-6 even without explicit CAS clause).

| Handle | Standard | Title | Key Rule | Applicability | URL |
|---|---|---|---|---|---|
| `CAS_401_CONSISTENCY_ESTIMATING` | 9904.401 | Consistency in Estimating, Accumulating, and Reporting Costs | Practices used to **estimate** costs in pricing proposals MUST be consistent with practices used to **accumulate** and **report** costs | Full + Modified (also shadow-mode for Non-CAS) | [eCFR 9904.401](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-B/part-9904/section-9904.401) |
| `CAS_402_CONSISTENCY_ALLOCATING` | 9904.402 | Consistency in Allocating Costs Incurred for the Same Purpose | Each type of cost MUST be allocated to cost objectives on a **consistent basis** — either ALWAYS as direct OR ALWAYS as indirect; no dual-classification of same-purpose costs | Full + Modified | [eCFR 9904.402](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-B/part-9904/section-9904.402) |
| `CAS_403_HOME_OFFICE_ALLOC` | 9904.403 | Allocation of Home Office Expenses to Segments | Three-tier allocation methodology for home-office expenses to segments: (1) direct-allocation, (2) homogeneous-pool causal/beneficial allocation, (3) residual three-factor formula | **Full CAS only** (>$50M) | [eCFR 9904.403](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-B/part-9904/section-9904.403) |
| `CAS_405_UNALLOWABLE` | 9904.405 | Accounting for Unallowable Costs | Costs expressly unallowable OR mutually agreed to be unallowable MUST be identified and excluded from any billing, claim, or proposal; **applies to directly-associated costs as well** (parallel to FAR 31.201-6 trap) | Full + Modified | [eCFR 9904.405](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-B/part-9904/section-9904.405) |
| `CAS_406_ACCOUNTING_PERIOD` | 9904.406 | Cost Accounting Period | A separate, current cost accounting period MUST be used for each segment AND for the home office; typically the contractor's fiscal year; prevents period-cost manipulation | Full + Modified | [eCFR 9904.406](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-B/part-9904/section-9904.406) |
| `CAS_410_GA_ALLOCATION` | 9904.410 | Allocation of Business Unit G&A Expenses to Final Cost Objectives | G&A expenses MUST be allocated to final cost objectives by means of a base **representative of the total activity of the business unit**. **Three acceptable G&A base methods**: (1) Total Cost Input (TCI), (2) Value-Added, (3) Single-Element (typically direct labor) | **Full CAS only** (>$50M) | [eCFR 9904.410](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-B/part-9904/section-9904.410) |
| `CAS_418_DIRECT_INDIRECT` | 9904.418 | Allocation of Direct and Indirect Costs | Costs incurred for the same purpose in like circumstances MUST be treated consistently as either direct OR indirect; establishes criteria for classifying costs and for selecting allocation bases | Full + Modified | [eCFR 9904.418](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-B/part-9904/section-9904.418) |
| `CAS_420_IRAD_BP` | 9904.420 | Accounting for IR&D Costs and B&P Costs | IR&D and B&P costs MUST be accumulated in **separate cost pools**; allocated over the same base and period used to accumulate them; criteria for identifying IR&D vs. contract-specific R&D | Full + Modified | [eCFR 9904.420](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-B/part-9904/section-9904.420) |

---

## §4 — Out-of-Scope CAS Standards (Cross-Reference Only)

The following CAS standards exist in 9904 but are **NOT** structurally enforced in GC-1/GC-2 strong build. They are noted here for completeness and for K-V poison-case detection of contractors who claim coverage they do not have.

| Handle | Standard | Title | Reason Out-of-Scope | URL |
|---|---|---|---|---|
| `CAS_404_CAPITALIZATION_REF` | 9904.404 | Capitalization of Tangible Assets | Capitalization minimums + depreciation interplay; **not in GC-1 minimum scope** (FAR 31.205-11 governs depreciation allowability) | [eCFR 9904.404](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-B/part-9904/section-9904.404) |
| `CAS_407_STD_COSTS_REF` | 9904.407 | Use of Standard Costs for Direct Material and Direct Labor | Optional standard-cost system; out-of-scope for GC-1 | [eCFR 9904.407](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-B/part-9904/section-9904.407) |
| `CAS_408_COMP_ABSENCE_REF` | 9904.408 | Accounting for Costs of Compensated Personal Absence | PTO accrual; covered indirectly through 31.205-6 compensation rules | [eCFR 9904.408](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-B/part-9904/section-9904.408) |
| `CAS_409_DEPRECIATION_REF` | 9904.409 | Depreciation of Tangible Capital Assets | Useful-life/depreciation method consistency; FAR 31.205-11 + 31.205-52 govern allowability | [eCFR 9904.409](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-B/part-9904/section-9904.409) |
| `CAS_411_MATERIAL_REF` | 9904.411 | Accounting for Acquisition Costs of Material | Inventory costing consistency; out-of-scope for GC-1 | [eCFR 9904.411](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-B/part-9904/section-9904.411) |
| `CAS_412_PENSION_REF` | 9904.412 | Composition and Measurement of Pension Cost | Pension cost composition; FAR 31.205-6(j) governs allowability | [eCFR 9904.412](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-B/part-9904/section-9904.412) |
| `CAS_413_PENSION_ADJ_REF` | 9904.413 | Adjustment and Allocation of Pension Cost | Pension actuarial gain/loss; segment closing adjustments | [eCFR 9904.413](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-B/part-9904/section-9904.413) |
| `CAS_414_COST_OF_MONEY_REF` | 9904.414 | Cost of Money as an Element of the Cost of Facilities Capital | Imputed cost-of-money; tied to FAR 31.205-10 | [eCFR 9904.414](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-B/part-9904/section-9904.414) |
| `CAS_415_DEF_COMP_REF` | 9904.415 | Accounting for the Cost of Deferred Compensation | Deferred comp present-value measurement; FAR 31.205-6(k) governs | [eCFR 9904.415](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-B/part-9904/section-9904.415) |
| `CAS_416_INSURANCE_REF` | 9904.416 | Accounting for Insurance Costs | Self-insurance/purchased insurance; FAR 31.205-19 governs allowability | [eCFR 9904.416](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-B/part-9904/section-9904.416) |
| `CAS_417_CIP_REF` | 9904.417 | Cost of Money as an Element of the Cost of Capital Assets Under Construction | CIP cost-of-money; tied to 9904.414 + FAR 31.205-10 | [eCFR 9904.417](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-B/part-9904/section-9904.417) |

**Cross-blend trap:** if a contractor's filings reference any of the above out-of-scope standards as authoritative for their cost treatment, the system MUST emit an `escalation-audit` event noting "CAS standard outside GC-1/GC-2 strong-build scope — refer to human cost accountant for full CAS coverage review."

---

## §5 — CAS Clause Library (FAR 52.230 Series)

Required contract clauses that bind the contractor to CAS compliance. Trigger logic must inspect contract-level clause inclusion before applying CAS rules.

| Handle | Clause | Title | URL | Trigger |
|---|---|---|---|---|
| `FAR_52_230_1_CAS_NOTICE` | 52.230-1 | Cost Accounting Standards Notices and Certification | [acquisition.gov 52.230-1](https://www.acquisition.gov/far/52.230-1) | Solicitation provision; offeror certifies prior Disclosure Statement submission and CAS coverage type |
| `FAR_52_230_2_CAS_FULL` | 52.230-2 | Cost Accounting Standards (Full Coverage) | [acquisition.gov 52.230-2](https://www.acquisition.gov/far/52.230-2) | Full CAS coverage clause — invokes all applicable 9904 standards |
| `FAR_52_230_3_CAS_MODIFIED` | 52.230-3 | Disclosure and Consistency of Cost Accounting Practices (Modified Coverage) | [acquisition.gov 52.230-3](https://www.acquisition.gov/far/52.230-3) | Modified CAS coverage clause — invokes only CAS 401, 402, 405, 406 |
| `FAR_52_230_4_CAS_EDUCATIONAL` | 52.230-4 | Disclosure and Consistency of Cost Accounting Practices — Educational Institutions | [acquisition.gov 52.230-4](https://www.acquisition.gov/far/52.230-4) | Educational-institution coverage (out-of-scope for GC-1 commercial sub-segments) |
| `FAR_52_230_5_CAS_EDU` | 52.230-5 | Cost Accounting Standards — Educational Institutions | [acquisition.gov 52.230-5](https://www.acquisition.gov/far/52.230-5) | Educational-institution full clause (out-of-scope for GC-1) |
| `FAR_52_230_6_CAS_ADMIN` | 52.230-6 | Administration of Cost Accounting Standards | [acquisition.gov 52.230-6](https://www.acquisition.gov/far/52.230-6) | Required in any CAS-covered contract; specifies change notification and cost-impact calculation procedures |
| `FAR_52_230_7_CAS_PROPOSAL` | 52.230-7 | Proposal Disclosure — Cost Accounting Practice Changes | [acquisition.gov 52.230-7](https://www.acquisition.gov/far/52.230-7) | Pre-proposal disclosure of pending cost-accounting-practice changes |

---

## §6 — Disclosure Statement Forms (DS-1 / DS-2)

| Handle | Form | Title | URL | Notes |
|---|---|---|---|---|
| `CASB_DS_1_FORM` | DS-1 | Disclosure Statement — Non-Educational Institutions (commercial contractors) | [eCFR 9903.202-9 DS-1 illustration](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-A/part-9903/section-9903.202-9) | **Eight parts**: I General Info, II Direct Costs, III Indirect Costs, IV Depreciation/Capitalization, V Other Costs/Credits, VI Deferred Comp/Insurance, VII Corporate/Group Expenses, VIII Home Office. **Form itself obtained from cognizant ACO**; eCFR provides illustrative format and rules |
| `CASB_DS_2_FORM` | DS-2 | Disclosure Statement — Educational Institutions | [eCFR Part 9905](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-B/part-9905) | Out-of-scope for GC-1 commercial sub-segments; included for cross-blend trap |
| `CASB_DS_TRIGGER_50M` | — | $50M Disclosure Statement Trigger | [eCFR 9903.202-1](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-A/part-9903/section-9903.202-1) | **Strong-build trap**: contractor crosses $50M CAS-covered awards in any year → DS-1 submission required; system MUST flag if `containsGovernmentContractData` profile shows revenue threshold met without DS-1 evidence |

---

## §7 — CAS Compliance and Cost-Impact Mechanics

| Handle | Topic | Source | URL | Description |
|---|---|---|---|---|
| `CAS_COMPLIANCE_VOLUNTARY_CHANGE` | Voluntary Cost-Accounting-Practice Change | 9903.306 | [eCFR 9903.306](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-A/part-9903/section-9903.306) | Contractor-initiated practice changes; require cost-impact calculation; CFAO-approved General Dollar Magnitude (GDM) or Detailed Cost Impact (DCI) proposal |
| `CAS_COMPLIANCE_REQUIRED_CHANGE` | Required Practice Change | 9903.306 + 9904 standard | [eCFR 9903.306](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-A/part-9903/section-9903.306) | Change required to comply with newly applicable CAS standard or amendment; cost impact still calculated but treated differently than voluntary |
| `CAS_COMPLIANCE_NONCOMPLIANCE` | Noncompliance Resolution | 9903.306 | [eCFR 9903.306](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-A/part-9903/section-9903.306) | Identified noncompliance triggers cost-impact calc and potential adjustment; offsetting cost impacts may apply if contractor demonstrates net-zero impact |
| `CAS_COMPLIANCE_GDM_DCI` | General Dollar Magnitude / Detailed Cost Impact | DCAA CAM 8-500 (CAM chapter) | [DCAA CAM](https://www.dcaa.mil/Guidance/CAM-Contract-Audit-Manual/) | GDM = high-level estimate; DCI = detailed calculation; CFAO accepts/rejects |

---

## §8 — Citation Handles → Trap Mapping Summary

| Trap (from Planning Doc §5) | Required Handles |
|---|---|
| **CAS 401/402 consistency-drift trap** | `CAS_401_CONSISTENCY_ESTIMATING`, `CAS_402_CONSISTENCY_ALLOCATING`, `CAS_418_DIRECT_INDIRECT` |
| **Three G&A base methods trap** (TCI / Value-Added / Single-Element) | `CAS_410_GA_ALLOCATION` |
| **$50M Disclosure Statement threshold trap** | `CASB_9903_201_1_TRIGGERS`, `CASB_9903_202_DISCLOSURE`, `CASB_DS_TRIGGER_50M` |
| **Modified-vs-Full coverage misclassification trap** | `CASB_9903_201_2_TYPES`, `FAR_52_230_2_CAS_FULL`, `FAR_52_230_3_CAS_MODIFIED` |
| **CAS clause-missing trap** (contract lacks 52.230-2/-3 but contractor claims CAS coverage) | `CASB_9903_201_3_4_CLAUSES`, `FAR_52_230_1_CAS_NOTICE` |
| **Home-office allocation residual-formula trap** (Full CAS only) | `CAS_403_HOME_OFFICE_ALLOC` |
| **IR&D / B&P cost-pool segregation trap** | `CAS_420_IRAD_BP`, `FAR_31_205_18` |
| **Unallowable identification trap** (parallel CAS 405 + FAR 31.201-6) | `CAS_405_UNALLOWABLE`, `FAR_31_201_6_UNALLOWABLE_ACCOUNTING` |
| **Out-of-scope CAS standard claimed by contractor** (cross-blend escalation) | All §4 `*_REF` handles |

---

## §9 — Sub-Segment CAS Applicability Matrix

| Sub-Segment | CAS Coverage Type | Standards Enforced | DS Required |
|---|---|---|---|
| **C — CAS-Covered (≥$50M)** | Full | All 8 (401/402/403/405/406/410/418/420) | DS-1 yes |
| **C — CAS-Covered (>$2M, <$50M)** | Modified | 401, 402, 405, 406 | DS-1 if any single award >$50M |
| **N — Non-CAS** | None (FAR 31 only) | Shadow-mode 401/402/405 (via FAR 31.201-2 / 31.201-6) | No |
| **S — Small Business** | Exempt | None (FAR 31 still applies for cost-reimb) | No |
| **R — R&D / SBIR-STTR** | Typically exempt (SBIR Phase I/II often FFP); Modified if T&M / cost-reimb >$2M | 401, 402, 405, 406 if covered | Conditional |
| **F — FFP-Heavy** | Generally exempt from CAS (FAR Part 12 commercial / FFP awarded without cost data) | None structurally; consistency still enforced for any cost-type contract mix | No |
| **T — T&M** | Modified if >$2M; Full if >$50M; Hybrid loaded-labor-rate logic applies | 401, 402, 405, 406 (Modified); +403/410/418/420 (Full) | Conditional |

---

## §10 — Last-Verified Block

| Domain | Last verified | Verification method |
|---|---|---|
| `ecfr.gov` Title 48 Chapter 99 | 2026-06-25 | Manual URL fetch via research subagent |
| `acquisition.gov` FAR 52.230 series | 2026-06-25 | Manual URL fetch via research subagent |
| `law.cornell.edu` 41 USC 1502 | 2026-06-25 | Cross-check against eCFR Title 48 |

---

**END — `GovCon_CAS_Sources.md` v1.0**
