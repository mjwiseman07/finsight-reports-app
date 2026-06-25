# GovCon DCAA Sources

**Document version:** v1.0
**Document authored:** 2026-06-25
**Document owner:** Matthew Wiseman / Wiseman Financial Technologies LLC
**Product:** Advisacor
**Branch:** `architecture-lane-refactor-baseline`
**Companion to:** `GovCon_DCAA_Vertical_Planning_Doc.md`, `GovCon_FAR31_Sources.md`, `GovCon_CAS_Sources.md`, `Phase_GC_1_Recon_Spec.md`

---

> **DRAFT / SPEC ONLY — primary-source citation register for the DCAA Contract Audit Manual (CAM), DCAA audit programs, MAARs, ICE Model, SF 1408, and DCAA-issued contractor guidance.**
> All URLs verified 2026-06-25 against canonical `dcaa.mil` and `gsa.gov` domains.
> `builderNeverAuthorsContent: true` — audit-channel logic must cite these URLs; no hard-coded audit-procedure text.
> Strong-stance binding: 7th audit channel `dcaa-rate-audit` is **default-enabled** (not optional) for every rate calculation in the GovCon vertical.

---

## §1 — DCAA Contract Audit Manual (CAM / DCAAM 7640.1)

The CAM is the authoritative DCAA audit-procedure manual. Hard-copy distribution was discontinued in January 2013; the electronic version on dcaa.mil is authoritative and updated continuously.

| Handle | Chapter | Title | URL | Description |
|---|---|---|---|---|
| `DCAA_CAM_TOC` | TOC | DCAA CAM Master Table of Contents | [dcaa.mil CAM TOC](https://www.dcaa.mil/Guidance/CAM-Contract-Audit-Manual/) | Authoritative TOC page; chapter PDFs linked individually; revision dates per chapter |
| `DCAA_CAM_CH1` | Ch 1 | Introduction to Contract Audit (Oct 2024) | [CAM Chapter 01](https://www.dcaa.mil/Portals/88/Documents/Guidance/CAM/CAM_Chapter_01_20241031.pdf) | DCAA mission, statutory authority (10 USC 2313), contract audit types, audit lifecycle |
| `DCAA_CAM_CH2` | Ch 2 | Audit Standards and Reporting (referenced) | [dcaa.mil CAM TOC](https://www.dcaa.mil/Guidance/CAM-Contract-Audit-Manual/) | GAGAS conformance; audit report formats; quality control |
| `DCAA_CAM_CH3` | Ch 3 | Audit Planning (referenced) | [dcaa.mil CAM TOC](https://www.dcaa.mil/Guidance/CAM-Contract-Audit-Manual/) | Risk assessment; materiality; audit-program selection |
| `DCAA_CAM_CH4` | Ch 4 | General Audit Requirements (Sep 2025) | [CAM Chapter 04](https://www.dcaa.mil/Portals/88/Documents/Guidance/CAM/CAM_Chapter_04_20250930.pdf) | General audit guidance; basic concepts/techniques; **MAAR accomplishment rules** |
| `DCAA_CAM_CH5` | Ch 5 | DFARS Business Systems Compliance (Feb 2025) | [CAM Chapter 05](https://www.dcaa.mil/Portals/88/Documents/Guidance/CAM/CAM_Chapter_05_20250224.pdf) | Audit of contractor compliance with **DFARS 252.242-7006** (accounting system) and the other 5 business-system criteria |
| `DCAA_CAM_CH6` | Ch 6 | Incurred Costs Audit Procedures (Feb 2025) | [CAM Chapter 06](https://www.dcaa.mil/Portals/88/Documents/Guidance/CAM/CAM_Chapter_06_20250224.pdf) | **Authoritative ICS audit chapter**; MAAR 6 (labor floor checks), MAAR 13 (purchase existence + consumption); ADV sampling thresholds; ICS adequacy requirements |
| `DCAA_CAM_CH7` | Ch 7 | Selected Areas of Cost (Mar 2019) | [CAM Chapter 07](https://www.dcaa.mil/Portals/88/Documents/Guidance/CAM/CAM_Chapter_07_20190301.pdf) | DCAA-specific guidance on auditing each FAR 31.205 subsection — **maps 1:1 to `GovCon_FAR31_Sources.md` §2** |
| `DCAA_CAM_CH8` | Ch 8 | Cost Accounting Standards (Feb 2026) | [CAM Chapter 08](https://www.dcaa.mil/Portals/88/Documents/Guidance/CAM/CAM_Chapter_08_20260224.pdf) | CAS compliance audit procedures for each 9904 standard; Disclosure Statement adequacy reviews; noncompliance processing (GDM/DCI); **maps to `GovCon_CAS_Sources.md` §3** |
| `DCAA_CAM_CH9` | Ch 9 | Audits of Cost Estimating Systems (referenced) | [dcaa.mil CAM TOC](https://www.dcaa.mil/Guidance/CAM-Contract-Audit-Manual/) | Estimating system audit per DFARS 252.215-7002 |
| `DCAA_CAM_CH10` | Ch 10 | Preparation and Distribution of Audit Reports (referenced) | [dcaa.mil CAM TOC](https://www.dcaa.mil/Guidance/CAM-Contract-Audit-Manual/) | Audit report content; classification of findings; distribution control |
| `DCAA_CAM_CH11` | Ch 11 | Audit of Termination and Delay Claims (referenced) | [dcaa.mil CAM TOC](https://www.dcaa.mil/Guidance/CAM-Contract-Audit-Manual/) | Termination settlement; delay/disruption claims; FAR Part 49 |
| `DCAA_CAM_CH12` | Ch 12 | Auditing Contract Pricing Proposals (referenced) | [dcaa.mil CAM TOC](https://www.dcaa.mil/Guidance/CAM-Contract-Audit-Manual/) | Forward pricing audit; TINA / Truth in Negotiations / 10 USC 3702 |
| `DCAA_CAM_CH13` | Ch 13 | Audits at Subcontractor Sites (referenced) | [dcaa.mil CAM TOC](https://www.dcaa.mil/Guidance/CAM-Contract-Audit-Manual/) | Prime-requested subcontractor audits; assist audit coordination |
| `DCAA_CAM_CH14` | Ch 14 | Other Contract Audit Assignments (referenced) | [dcaa.mil CAM TOC](https://www.dcaa.mil/Guidance/CAM-Contract-Audit-Manual/) | Special-purpose audits; defective-pricing reviews |
| `DCAA_CAM_CH15` | Ch 15 | Other DCAA Functions (referenced) | [dcaa.mil CAM TOC](https://www.dcaa.mil/Guidance/CAM-Contract-Audit-Manual/) | Financial advisory services; financial capability reviews |

---

## §2 — DCAA Mandatory Annual Audit Requirements (MAARs)

**Risk-based note (FY 2023 onward):** MAAR 6 (labor floor checks) and MAAR 13 (purchase existence & consumption) are now risk-based rather than mandatory. The GC-1/GC-2 strong build still treats MAAR 6 timekeeping integrity as a default expectation per K-V red-team poison cases.

| Handle | MAAR # | Title | URL | Source |
|---|---|---|---|---|
| `DCAA_MAAR_LIST` | All MAARs | DCAA MAAR Schedule (CAM 6-105, Supplement 6-1S1) | [CAM Chapter 06 PDF](https://www.dcaa.mil/Portals/88/Documents/Guidance/CAM/CAM_Chapter_06_20250224.pdf) | Schedule of all MAARs by number/title/objective; most performed during annual ICS audit |
| `DCAA_MAAR_6_AP` | MAAR 6 | Audit Program 10310 — Labor Floor Checks (Non-Major Contractors, Jun 2025) | [AP 10310 PDF](https://www.dcaa.mil/Portals/88/Documents/Guidance/Directory%20of%20Audit%20Programs/10310_AP_Labor_Floorchecks_Nonmajor.pdf) | Verifies existence of employees + timekeeping integrity; real-time during fiscal year |
| `DCAA_MAAR_13_AP` | MAAR 13 | Audit Program 10320 — Purchase Existence and Consumption (Jun 2025) | [AP 10320 PDF](https://www.dcaa.mil/Portals/88/Documents/Guidance/Directory%20of%20Audit%20Programs/10320_AP_MAAR13_Purchase_Existence.pdf) | Verifies material/services actually received and used on contracts |

---

## §3 — DCAA Audit Programs (Directory)

| Handle | Title | URL | Description |
|---|---|---|---|
| `DCAA_DIR_AP` | DCAA Directory of Audit Programs | [Directory of Audit Programs](https://www.dcaa.mil/Guidance/Directory-of-Audit-Programs/) | Master index of all DCAA audit programs with activity codes, version numbers, and PDF links; covers preaward, incurred-cost, CAS, business systems, termination programs |
| `DCAA_AP_PREAWARD_17740` | AP 17740 — Preaward Survey of Prospective Contractor Accounting System (Jun 2025) | [AP 17740 PDF](https://www.dcaa.mil/Portals/88/Documents/Guidance/Directory%20of%20Audit%20Programs/17740%20AP%20Preaward%20Survey%20of%20Prospective%20Contractor%20Accounting%20System_20250609.pdf) | DCAA work program for conducting SF 1408 preaward accounting system surveys |
| `DCAA_AP_ICS_INCURRED` | DCAA Incurred Cost Audit Programs (multiple) | [Directory of Audit Programs](https://www.dcaa.mil/Guidance/Directory-of-Audit-Programs/) | ICS audit programs by contractor size (major/non-major); incurred-cost-electronic, low-risk, expedited |

---

## §4 — DCAA ICE (Incurred Cost Electronically) Model

Required structure for ICS / final indirect cost rate proposals under FAR 52.216-7(d).

| Handle | Title | URL | Description |
|---|---|---|---|
| `DCAA_ICE_MODEL` | DCAA ICE Model — Version 1.07 (Power Query, Jun 2026) | [DCAA ICE Model page](https://www.dcaa.mil/Checklists-Tools/ICE-Model/) | Authoritative spreadsheet template for FAR 52.216-7(d) ICS submissions; **Version 1.07** uses Microsoft Power Query (current); Version 2.0.1h (legacy) uses VBA macros; includes user manual; submission via Contractor Submission Portal |
| `DCAA_ICS_CHECKLIST` | DCAA Incurred Cost Submission Adequacy Checklist | [ICE Model / Checklists page](https://www.dcaa.mil/Customers/Checklists-Tools/ICE-Model/) | Checklist for assessing adequacy of final direct + indirect incurred cost submissions under FAR 52.216-7 |
| `DCAA_PREAWARD_CHECKLIST` | DCAA Pre-Award Accounting System Adequacy Checklist | [Pre-award Checklist page](https://www.dcaa.mil/Checklists-Tools/Pre-award-Accounting-System-Adequacy-Checklist/) | Checklist DCAA auditors use (and contractors self-assess against) to determine if accounting system meets government contracting standards |

---

## §5 — Standard Form 1408 (Pre-Award Survey)

The 16-criterion DCAA pre-award survey form. Adequacy is a binding gate for cost-reimbursement contract award.

| Handle | Title | URL | Description |
|---|---|---|---|
| `DCAA_SF1408` | Standard Form 1408 — Pre-Award Survey of Prospective Contractor Accounting System | [GSA SF 1408](https://www.gsa.gov/reference/forms/preaward-survey-of-prospective-contractor-accounting-system) | GSA form SF 1408 (Rev. 01/2014); prescribed at FAR 53.209-1(f); 16 criteria covering: proper segregation of direct/indirect costs, identification of unallowable costs, accumulation by contract, labor distribution, time records, monthly closings, exclusion of unallowable per FAR 31, identification of costs by CLIN, ability to bill under FAR 52.216-7, etc. |
| `DCAA_SF1408_AP` | DCAA Audit Program 17740 — Preaward Survey | [AP 17740 PDF](https://www.dcaa.mil/Portals/88/Documents/Guidance/Directory%20of%20Audit%20Programs/17740%20AP%20Preaward%20Survey%20of%20Prospective%20Contractor%20Accounting%20System_20250609.pdf) | DCAA audit work program implementing SF 1408 — provides the test procedures auditors use against each criterion |
| `FAR_53_209_1` | FAR 53.209-1(f) — Forms Prescribing SF 1408 | [acquisition.gov 53.209-1](https://www.acquisition.gov/far/53.209-1) | FAR provision prescribing use of SF 1408 |

---

## §6 — DCAA Contractor-Facing Guidance

| Handle | Title | URL | Description |
|---|---|---|---|
| `DCAA_7641_90` | DCAA Information for Contractors Manual (DCAAM 7641.90, Nov 2023) | [DCAAM 7641.90 PDF](https://www.dcaa.mil/Portals/88/Documents/Guidance/CAM/Information%20For%20Contractors%20DCAAM%207641_90.pdf) | Official contractor-facing guidance pamphlet; cleared for public release; covers audit process overview, ICS requirements, accounting system requirements, timekeeping requirements, DCAA contact info |
| `DCAA_INDIRECT_OVERVIEW` | DCAA Overview of Indirect Cost and Rates | [Indirect Cost Overview PDF](https://www.dcaa.mil/Portals/88/OverviewOfIndirectCostAndRates.pdf) | DCAA training overview: indirect cost pools, bases, rate computation (pool ÷ base), four-step rate application process |

---

## §7 — DFARS Business Systems Cross-Reference

DCAA business-system audits (per CAM Chapter 5) test compliance with DFARS criteria. The GovCon strong build flags any deficiency in the Accounting System criterion as a hard block.

| Handle | Section | Title | URL | Description |
|---|---|---|---|---|
| `DFARS_252_242_7006` | 252.242-7006 | Accounting System Administration (clause) | [acquisition.gov DFARS 252.242-7006](https://www.acquisition.gov/dfars/252.242-7006-accounting-system-administration.) | 18 accounting-system criteria; clause inserted in CAS-covered contracts; deficiencies trigger payment withholding under DFARS 252.242-7005 |
| `DFARS_252_242_7005` | 252.242-7005 | Contractor Business Systems (clause) | [acquisition.gov DFARS 252.242-7005](https://www.acquisition.gov/dfars/252.242-7005-contractor-business-systems.) | Authorizes payment withholding (up to 5% per deficient system, 10% aggregate) for significant deficiencies in any of 6 business systems |
| `DFARS_252_215_7002` | 252.215-7002 | Cost Estimating System Requirements (clause) | [acquisition.gov DFARS 252.215-7002](https://www.acquisition.gov/dfars/252.215-7002-cost-estimating-system-requirements.) | Estimating-system criteria; DCAA audits per CAM Chapter 9 |

---

## §8 — Audit Channel Mapping (Strong-Build 7-Channel Model)

The GC-2 strong build elevates `dcaa-rate-audit` from optional to **default** for every rate calculation. The 7 channels reference the DCAA sources below.

| Channel # | Channel Name | DCAA Source Anchor |
|---|---|---|
| 1 | `framework-decision` | (general audit-trail; not DCAA-specific) |
| 2 | `escalation-audit` | (cross-doctrine; emits on poison-case rejection) |
| 3 | `panel-decision` | (industry panel; cross-vertical) |
| 4 | `compliance-audit` | `DCAA_CAM_CH4`, `DCAA_CAM_CH7` |
| 5 | `vertical-audit` | `DCAA_CAM_CH5` (DFARS business systems), `DCAA_CAM_CH6` (incurred cost), `DCAA_CAM_CH8` (CAS) |
| 6 | `registry-change` | (registry-mgmt; not DCAA-specific) |
| 7 | **`dcaa-rate-audit`** (NEW for GC-2) | `DCAA_ICE_MODEL`, `DCAA_INDIRECT_OVERVIEW`, `DCAA_ICS_CHECKLIST`, `DCAA_CAM_CH6`, `DCAA_CAM_CH8` |

**`dcaa-rate-audit` evidence schema** (every rate calc emits):
- Pool composition (allowable costs only; unallowable excluded per CAS 405 / FAR 31.201-6)
- Base composition (must include all items regardless of allowability per FAR 31.203)
- Rate = Pool ÷ Base (numeric)
- CAS 410 G&A base method declared (TCI / Value-Added / Single-Element) if G&A
- FPRA/FPRR/PBR/Final designation (which FAR 42 tier)
- Last DS-1 amendment date if Full CAS coverage
- MAAR 6 timekeeping anchor (if labor component)
- ICE Model section reference (Schedule A through M)

---

## §9 — Citation Handles → Trap Mapping Summary

| Trap (from Planning Doc §5) | Required DCAA Handles |
|---|---|
| **MAAR 6 timekeeping-integrity trap** | `DCAA_MAAR_6_AP`, `DCAA_CAM_CH6`, `DCAA_7641_90` |
| **MAAR 13 purchase-existence trap** | `DCAA_MAAR_13_AP`, `DCAA_CAM_CH6` |
| **ICE Model version-mismatch trap** (legacy 2.0.1h VBA vs current 1.07 Power Query) | `DCAA_ICE_MODEL` |
| **ICS adequacy trap** (FAR 52.216-7(d) 6-month deadline; certified proposal; 18 schedules) | `DCAA_ICS_CHECKLIST`, `DCAA_CAM_CH6`, `DCAA_ICE_MODEL` |
| **SF 1408 16-criterion preaward trap** | `DCAA_SF1408`, `DCAA_SF1408_AP`, `DCAA_PREAWARD_CHECKLIST` |
| **DFARS business-system deficiency trap** (5% / 10% withholding) | `DFARS_252_242_7006`, `DFARS_252_242_7005`, `DCAA_CAM_CH5` |
| **CAS audit trap** (CAM Ch 8 procedures must trigger when CAS clause present) | `DCAA_CAM_CH8` |
| **FAR 31.205 selected cost audit trap** | `DCAA_CAM_CH7` |

---

## §10 — Last-Verified Block

| Domain | Last verified | Verification method |
|---|---|---|
| `dcaa.mil` CAM chapters | 2026-06-25 | Manual URL fetch via research subagent (chapter PDFs verified against TOC dates) |
| `dcaa.mil` Directory of Audit Programs | 2026-06-25 | Manual URL fetch |
| `gsa.gov` SF 1408 | 2026-06-25 | Manual URL fetch |
| `acquisition.gov` DFARS 252.242 / 252.215 | 2026-06-25 | Manual URL fetch |

---

**END — `GovCon_DCAA_Sources.md` v1.0**
