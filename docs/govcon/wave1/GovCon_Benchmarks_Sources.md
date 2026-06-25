# GovCon Reasonableness Benchmarks Sources

**Document version:** v1.0
**Document authored:** 2026-06-25
**Document owner:** Matthew Wiseman / Wiseman Financial Technologies LLC
**Product:** Advisacor
**Branch:** `architecture-lane-refactor-baseline`
**Companion to:** `GovCon_DCAA_Vertical_Planning_Doc.md`, `GovCon_FAR31_Sources.md`, `GovCon_CAS_Sources.md`, `GovCon_DCAA_Sources.md`, `GovCon_Disclosures_Sources.md`, `Phase_GC_1_Recon_Spec.md`

---

> **DRAFT / SPEC ONLY — primary-source citation register for reasonableness benchmarks, exec-comp caps, travel reference rates, contract-type applicability, and small-business size thresholds.**
>
> ⚠️ **Critical methodology note:** The Federal Government **does not publish standard indirect rate ranges** as official benchmarks. Reasonableness under FAR 31.201-3 is determined contractor-by-contractor through FPRA/FPRR negotiation, DCAA audit findings, and DCMA cost monitoring. The sources below are the primary/quasi-primary anchors that DCAA and DCMA use to assess reasonableness — NOT a hard-coded rate table.
>
> Strong-build stance: `builderNeverAuthorsContent: true` — the system MUST cite these primary sources when emitting reasonableness assessments; it MUST NOT fabricate rate ranges.
>
> All URLs verified 2026-06-25 against canonical `acquisition.gov`, `dcaa.mil`, `dcma.mil`, `dodig.mil`, `gsa.gov`, `sba.gov`, `ecfr.gov`, `state.gov`, `dod.mil` domains.

---

## §1 — Reasonableness Standard (Primary)

| Handle | Title | URL | Description |
|---|---|---|---|
| `FAR_31_201_3_REASONABLENESS` | FAR 31.201-3 — Determining Reasonableness | [acquisition.gov 31.201-3](https://www.acquisition.gov/far/31.201-3) | **Primary standard.** Prudent-person test; no presumption of reasonableness; considers type of cost, arm's-length bargaining, deviations from contractor's own practice, generally-accepted sound business practices. **Burden of proof on contractor when challenged.** |
| `FAR_15_404_1_COST_ANALYSIS` | FAR 15.404-1 — Cost Analysis | [acquisition.gov 15.404-1](https://www.acquisition.gov/far/15.404-1) | Cost analysis methodology used by COs/auditors to evaluate reasonableness; element-by-element examination; comparison to prior-purchase prices, published catalogs, industry standards, audited rates |

---

## §2 — DCMA Reasonableness Framework

DCMA establishes forward-pricing and final-rate reasonableness through two manuals.

| Handle | Title | URL | Description |
|---|---|---|---|
| `DCMA_MAN_2201_01_BENCH` | DCMA Manual 2201-01 — Forward Pricing Rates (Apr 2024) | [DCMA MAN 2201-01 PDF](https://www.dcma.mil/Portals/31/Documents/Policy/DCMA_MAN_2201-01.pdf) | DCMA policy: rates must be "fair and reasonable"; ACO uses cost analysis per FAR 15.404-1(a)(3); compares to audited rates, prior FPRAs, similar contractor experience; **$200M threshold for Formal Cost Monitoring Plan**; semi-annual CM reports |
| `DCMA_MAN_2201_03_BENCH` | DCMA Manual 2201-03 — Final Indirect Cost Rates (Aug 2024) | [DCMA MAN 2201-03 PDF](https://www.dcma.mil/Portals/31/Documents/Policy/DCMA_MAN_2201-03.pdf) | DCMA final rate procedures; Level 1 penalty = disallowed costs amount; Level 2 penalty = 2× disallowed costs for knowingly submitted unallowable |
| `DCMA_CIPR_50M_THRESHOLD` | DCMA Contractor Insurance/Pension Review (CIPR) Threshold | [DCMA MAN 2201-01](https://www.dcma.mil/Portals/31/Documents/Policy/DCMA_MAN_2201-01.pdf) | CIPR required for contractors with qualifying sales >$50M in preceding FY |

---

## §3 — DoD IG Oversight (Reasonableness Enforcement Cases)

DoD IG reports document material reasonableness disputes and policy reforms.

| Handle | Title | URL | Description |
|---|---|---|---|
| `DODIG_2014_DCMA_FPR` | DoD IG — Policy Changes Needed at DCMA for Forward Pricing Rates (Oct 2014) | [DODIG-2015-007](https://www.dodig.mil/Reports/Audits-and-Evaluations/Article/1119073/policy-changes-needed-at-defense-contract-management-agency-to-ensure-forward-p/) | DoD IG finding that DCMA policy did not adequately require cost analysis per FAR 15.404-1 for establishing fair and reasonable forward pricing indirect rates; led to DCMA policy reforms |
| `DODIG_2021_CO_ACTIONS` | DoD IG — CO Actions on Questioned Costs (Jan 2021) | [DODIG-2021-051](https://www.dodig.mil/reports.html/Article/2481152/evaluation-of-department-of-defense-contracting-officer-actions-on-questioned-d/) | Evaluation finding DCMA COs did not settle $231.5M in DCAA-questioned direct costs; illustrates materiality of indirect rate disputes |
| `DCAA_RPT_CONGRESS_FY23` | DCAA Report to Congress — FY 2023 Activities | [DCAA FY23 RtC PDF](https://www.dcaa.mil/Portals/88/Documents/Report%20to%20Congress%20FY23%20signed%20(2).pdf) | Annual DCAA statistics: FY 2023 examined $253.6B in costs; identified **>$5.4B in audit exceptions**; **$3.5B net savings**; **ROI $5.1:1**; includes IR&D/B&P data table (Table 9) |

---

## §4 — DCAA Indirect Rate Analysis Framework

| Handle | Title | URL | Description |
|---|---|---|---|
| `DCAA_INDIRECT_OVERVIEW_BENCH` | DCAA Overview of Indirect Costs and Rates | [DCAA Indirect Overview PDF](https://www.dcaa.mil/Portals/88/OverviewOfIndirectCostAndRates.pdf) | DCAA's framework for analyzing indirect rate reasonableness: pool/base analysis, causal/beneficial relationships, rate computation, risk-based testing |
| `DCAA_CAM_CH7_BENCH` | DCAA CAM Chapter 7 — Selected Areas of Cost | [CAM Chapter 07](https://www.dcaa.mil/Portals/88/Documents/Guidance/CAM/CAM_Chapter_07_20190301.pdf) | DCAA audit procedures for FAR 31.205 cost elements — reasonableness tests built into each subsection |
| `DCAA_CAM_CH8_BENCH` | DCAA CAM Chapter 8 — Cost Accounting Standards | [CAM Chapter 08](https://www.dcaa.mil/Portals/88/Documents/Guidance/CAM/CAM_Chapter_08_20260224.pdf) | CAS-based reasonableness tests for CAS-covered contractors |

---

## §5 — Executive Compensation Cap (Statutory Hard Ceiling)

The exec-comp cap is the only hard-coded reasonableness threshold; published annually by OFPP under 41 U.S.C. 1127.

| Handle | Title | URL | Description |
|---|---|---|---|
| `FAR_31_205_6_P_EXEC_COMP_CAP` | FAR 31.205-6(p) — Limitation on Allowability of Compensation | [acquisition.gov 31.205-6](https://www.acquisition.gov/far/31.205-6) | Compensation costs in excess of OFPP-published benchmark amount are unallowable. For contracts awarded on/after **June 24, 2014**: applies to **ALL employees**; benchmark set annually by OFPP under 41 U.S.C. 1127. OFPP landing: [whitehouse.gov OMB CECP](https://www.whitehouse.gov/omb/procurement/cecp) |
| `EXEC_COMP_CAP_CY2025` | OFPP Executive Compensation Benchmark — CY 2025 | [Federal Register / OFPP](https://www.whitehouse.gov/omb/procurement/cecp) | **CY 2025 confirmed cap: $671,000** (per BLS ECI adjustment from $646,000 in CY 2024). Formula: Prior Year Cap × ECI change (BLS Table 4, twelve months ended September 30). Statutory authority: 10 U.S.C. 3744(a)(16) and 41 U.S.C. 4304(a)(16); Bipartisan Budget Act of 2013 §702 initial $487,000 in 2014 |
| `EXEC_COMP_CAP_CY2026_EST` | OFPP Executive Compensation Benchmark — CY 2026 (Estimated) | [whitehouse.gov OMB CECP](https://www.whitehouse.gov/omb/procurement/cecp) | **CY 2026 estimated cap: ~$695,000** ( = $671,000 × 172.905 / 167.0; BLS September 2025 ECI). Official OFPP memo not yet confirmed as of 2026-06-25 — use $671,000 as confirmed CY 2025 value and emit `escalation-audit` if any compensation crosses estimated $695,000 |
| `EXEC_COMP_CAP_HISTORICAL` | Historical Exec Comp Caps | [whitehouse.gov OMB CECP archive](https://www.whitehouse.gov/omb/procurement_index_exec_comp/) | Historical caps: 2014=$487,000; 2015=$487,000; 2016=$487,000; 2017=$512,000; 2018=$525,000; 2019=$540,000; 2020=$556,000; 2021=$568,000; 2022=$589,000; 2023=$619,000; 2024=$646,000; 2025=$671,000; 2026=~$695,000 (est) |

---

## §6 — Travel Cost Reference Rates (Reasonableness Ceiling)

FAR 31.205-46 binds contractor travel allowability to government-published per-diem rates.

| Handle | Title | URL | Description |
|---|---|---|---|
| `FAR_31_205_46_TRAVEL` | FAR 31.205-46 — Travel Costs | [acquisition.gov 31.205-46](https://www.acquisition.gov/far/31.205-46) | Travel allowable for official company business; lodging/meals/incidentals limited to applicable per-diem rates; airfare above lowest-available-fare unallowable; contractor aircraft manifest requirements; auto personal use = compensation |
| `GSA_FTR` | Federal Travel Regulation (FTR) — GSA | [GSA FTR](https://www.gsa.gov/policy-regulations/regulations/federal-travel-regulation) | GSA-issued travel regulations for civilian federal employees; sets per-diem rates referenced in FAR 31.205-46 |
| `GSA_PERDIEM_CONUS` | GSA Per Diem Rates — CONUS | [GSA Per Diem](https://www.gsa.gov/travel/plan-book/per-diem-rates) | Annual CONUS per diem rates by location; **ceiling** for contractor lodging and M&IE reimbursement |
| `DSSR_FOREIGN_TRAVEL` | DSSR — Department of State Standardized Regulations (Foreign Per Diem) | [State Dept Per Diem](https://aoprals.state.gov/web920/per_diem.asp) | State Department per diem rates for foreign locations; referenced by FAR 31.205-46 for foreign travel cost limits |
| `JTR_MILITARY_TRAVEL` | Joint Travel Regulations (JTR) — DoD Military and Civilian Travel | [JTR](https://www.travel.dod.mil/Policy-Regulations/Joint-Travel-Regulations/) | DoD travel regulations for military and civilian personnel; referenced by FAR 31.205-46 for applicable travel rates |

---

## §7 — Contract Type Applicability of Cost Principles

Reasonableness scrutiny varies by contract type — FFP receives little/none; cost-reimb receives full FAR 31.2 application.

| Handle | Title | URL | Description |
|---|---|---|---|
| `FAR_PART_16` | FAR Part 16 — Types of Contracts | [acquisition.gov Part 16](https://www.acquisition.gov/far/part-16) | Complete enumeration: FFP, FPI, CPFF, CPIF, CPAF, T&M, Labor-Hour, IDIQ, IDIQ/MATOC; applicability of cost principles varies by type |
| `FAR_16_301_COST_REIMB` | FAR 16.301 — Cost-Reimbursement Contracts (General) | [acquisition.gov 16.301](https://www.acquisition.gov/far/16.301) | Authorizes payment of allowable incurred costs; requires adequate accounting system; DCAA audit rights established; most susceptible to FAR 31.2 full application |
| `FAR_16_306_CPFF` | FAR 16.306 — Cost-Plus-Fixed-Fee (CPFF) | [acquisition.gov 16.306](https://www.acquisition.gov/far/16.306) | Most common cost-reimbursement type for DoD R&D and services; fixed fee at inception; FAR 31.2 fully applicable; DCAA audit rights apply |
| `FAR_16_504_IDIQ` | FAR 16.504 — Indefinite-Quantity (IDIQ) Contracts | [acquisition.gov 16.504](https://www.acquisition.gov/far/16.504) | Cost principles apply to underlying order types (CPFF task orders → FAR 31.2 applies) |
| `FAR_16_601_TM` | FAR 16.601 — Time-and-Materials (T&M) Contracts | [acquisition.gov 16.601](https://www.acquisition.gov/far/16.601) | Labor at fixed hourly rates (loaded); materials at cost. Labor rates include profit, overhead, fringe. **MAAR 6 timekeeping critically important for T&M**. Use only when impossible to estimate cost with sufficient certainty |
| `FAR_16_602_LH` | FAR 16.602 — Labor-Hour Contracts | [acquisition.gov 16.602](https://www.acquisition.gov/far/16.602) | Variant of T&M without materials; same cost principles + timekeeping requirements |
| `FAR_16_302_COST_CONTRACT` | FAR 16.302 — Cost Contracts | [acquisition.gov 16.302](https://www.acquisition.gov/far/16.302) | Cost contract — contractor bears no profit; used primarily for R&D with nonprofit organizations |

---

## §8 — Small Business Size Standards (Sub-Segment S Threshold Library)

Sub-segment **S (Small Business)** applies different rules based on NAICS-coded size thresholds.

| Handle | Title | URL | Description |
|---|---|---|---|
| `FAR_PART_19` | FAR Part 19 — Small Business Programs | [acquisition.gov Part 19](https://www.acquisition.gov/far/part-19) | Set-asides, 8(a) program, HUBZone, SDVOSB, WOSB; size standards; subcontracting plans |
| `SBA_SIZE_STANDARDS_13_CFR_121` | 13 CFR Part 121 — Small Business Size Regulations | [eCFR 13 CFR 121](https://www.ecfr.gov/current/title-13/chapter-I/part-121) | SBA size standards by NAICS code; primary legal authority for small business eligibility; thresholds vary by industry (employee count OR revenue) |
| `SBA_SIZE_TABLE` | SBA Table of Small Business Size Standards | [SBA Size Standards](https://www.sba.gov/document/support-table-size-standards) | Downloadable table for all NAICS codes; updated periodically; companion to 13 CFR 121 |
| `FAR_19_802_8A` | FAR 19.802 — 8(a) Program Eligibility | [acquisition.gov 19.802](https://www.acquisition.gov/far/19.802) | SBA 8(a) Business Development Program: socially/economically disadvantaged individuals; sole-source and competitive procedures |
| `FAR_19_1303_HUBZONE` | FAR 19.1303 — HUBZone Small Business Status | [acquisition.gov 19.1303](https://www.acquisition.gov/far/19.1303) | Historically Underutilized Business Zone: principal office and 35% of employees in HUBZone |
| `FAR_19_1403_SDVOSB` | FAR 19.1403 — SDVOSB Status | [acquisition.gov 19.1403](https://www.acquisition.gov/far/19.1403) | Service-Disabled Veteran-Owned Small Business status and eligibility |
| `FAR_19_1503_WOSB` | FAR 19.1503 — WOSB Status | [acquisition.gov 19.1503](https://www.acquisition.gov/far/19.1503) | Women-Owned Small Business Program and economically disadvantaged WOSB (EDWOSB) classification |

---

## §9 — DFARS Cross-Reference

| Handle | Title | URL | Description |
|---|---|---|---|
| `DFARS_242_7_INDIRECT_RATES` | DFARS Subpart 242.7 — Indirect Cost Rates | [OSD DPAP DFARS 242.7](https://www.acq.osd.mil/dpap/dars/dfars/html/current/242_7.htm) | DoD-specific supplement to FAR 42.7; references DCAA-specific procedures; ACO/DCAA roles in final rate settlement |
| `DFARS_215_407_3_FPRA` | DFARS 215.407-3 — Forward Pricing Rate Agreements | [eCFR DFARS 215.407-3](https://www.ecfr.gov/current/title-48/chapter-2/subchapter-C/part-215/subpart-215.4/section-215.407-3) | DoD supplement to FAR 15.407-3; DCMA/ACO responsibilities for FPR negotiations |
| `DFARS_252_242_7006_REF` | DFARS 252.242-7006 — Accounting System Administration | [acquisition.gov DFARS 252.242-7006](https://www.acquisition.gov/dfars/252.242-7006-accounting-system-administration.) | DoD contract clause requiring adequate accounting system; 18 criteria for accounting system adequacy (parallel to SF 1408 criteria); non-compliance can result in payment withholding |

---

## §10 — Consolidated Threshold Quick-Reference

| Rule | Threshold | Source | URL |
|---|---|---|---|
| CAS Modified Coverage trigger | Single contract award >$2M (non-exempt, non-small-business) | 48 CFR 9903.201-1 | [eCFR 9903.201-1](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-A/part-9903/section-9903.201-1) |
| CAS Full Coverage trigger | Single award >$50M OR business unit >$50M CAS-covered in prior year | 48 CFR 9903.201-1 | [eCFR 9903.201-1](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-A/part-9903/section-9903.201-1) |
| Disclosure Statement required | Any CAS-covered contract (modified or full) | 48 CFR 9903.202 | [eCFR 9903.202](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-A/part-9903/section-9903.202) |
| ICS submission deadline | 6 months after contractor fiscal year-end | FAR 52.216-7(d)(2)(i) | [acquisition.gov 52.216-7](https://www.acquisition.gov/far/52.216-7) |
| Billing-rate-update post-settlement | Within 60 days of settlement | FAR 52.216-7(d)(4) | [acquisition.gov 52.216-7](https://www.acquisition.gov/far/52.216-7) |
| Completion invoice deadline | Within 120 days of final rate settlement | FAR 42.705(b) | [acquisition.gov 42.705](https://www.acquisition.gov/far/42.705) |
| Exec comp cap CY 2025 | **$671,000** (confirmed) | OFPP / FAR 31.205-6(p) | [acquisition.gov 31.205-6](https://www.acquisition.gov/far/31.205-6) |
| Exec comp cap CY 2026 (estimated) | **~$695,000** (OFPP memo pending) | BLS ECI methodology | [whitehouse.gov OMB CECP](https://www.whitehouse.gov/omb/procurement/cecp) |
| FPRA Formal Cost Monitoring threshold | Contractor next-FY Government sales >$200M | DCMA Manual 2201-01 | [DCMA MAN 2201-01](https://www.dcma.mil/Portals/31/Documents/Policy/DCMA_MAN_2201-01.pdf) |
| CIPR required threshold | Contractor qualifying sales >$50M in preceding FY | DCMA Manual 2201-01 | [DCMA MAN 2201-01](https://www.dcma.mil/Portals/31/Documents/Policy/DCMA_MAN_2201-01.pdf) |
| Level 1 penalty (expressly unallowable in ICS) | = disallowed costs amount | FAR 42.709 | [acquisition.gov 42.709](https://www.acquisition.gov/far/42.709) |
| Level 2 penalty (knowing submission) | 2× disallowed costs | FAR 42.709 | [acquisition.gov 42.709](https://www.acquisition.gov/far/42.709) |
| DCAA ICS audit target | Within 12 months of receiving adequate submission | DCAA FY23 RtC | [DCAA FY23 RtC PDF](https://www.dcaa.mil/Portals/88/Documents/Report%20to%20Congress%20FY23%20signed%20(2).pdf) |
| GSA per-diem ceiling — CONUS | Annual GSA rates by location | FAR 31.205-46 | [GSA Per Diem](https://www.gsa.gov/travel/plan-book/per-diem-rates) |
| DSSR per-diem ceiling — Foreign | Annual State Dept rates by location | FAR 31.205-46 | [State Dept Per Diem](https://aoprals.state.gov/web920/per_diem.asp) |

---

## §11 — Reasonableness Assessment Logic (Strong-Build Rule)

The system **MUST NOT** fabricate "typical industry rates." Instead, on every rate calculation it emits a `dcaa-rate-audit` event citing:

1. The applicable **FAR 31.201-3** standard with link.
2. If exec-comp affected → the current **OFPP cap citation** with confirmed CY 2025 ($671,000) or flagged estimated CY 2026 (~$695,000).
3. If travel affected → the applicable **GSA / DSSR / JTR per-diem citation**.
4. If FPRA in place → cite **FPRA NM (Negotiation Memorandum) ID** as the contractor-specific benchmark anchor.
5. If FPRR in place → cite **DCMA Manual 2201-01** as policy anchor.
6. If no forward-pricing agreement → cite **FAR 15.404-1** and emit `escalation-audit` indicating "no forward-rate baseline; human cost analyst review required."

**Strong-stance binding:** the system **never says "the typical G&A rate is X%"** because the government does not publish such a benchmark. Reasonableness is contractor-specific. Cross-contractor inference is OUT OF SCOPE for GC-1/GC-2.

---

## §12 — Citation Handles → Trap Mapping Summary

| Trap (from Planning Doc §5) | Required Benchmark Handles |
|---|---|
| **Exec comp cap trap** (CY 2025 / CY 2026) | `FAR_31_205_6_P_EXEC_COMP_CAP`, `EXEC_COMP_CAP_CY2025`, `EXEC_COMP_CAP_CY2026_EST` |
| **Travel per-diem ceiling trap** | `FAR_31_205_46_TRAVEL`, `GSA_PERDIEM_CONUS`, `DSSR_FOREIGN_TRAVEL`, `JTR_MILITARY_TRAVEL` |
| **Forward-pricing reasonableness trap** | `DCMA_MAN_2201_01_BENCH`, `FAR_15_404_1_COST_ANALYSIS`, `FAR_31_201_3_REASONABLENESS` |
| **Final-rate reasonableness trap** | `DCMA_MAN_2201_03_BENCH`, `FAR_42_709_LEVEL_1`, `FAR_42_709_LEVEL_2` |
| **DCMA $200M cost-monitoring threshold trap** | `DCMA_MAN_2201_01_BENCH` |
| **CIPR $50M trigger trap** | `DCMA_CIPR_50M_THRESHOLD` |
| **Small business size-standard mis-classification trap** | `SBA_SIZE_STANDARDS_13_CFR_121`, `SBA_SIZE_TABLE` |
| **T&M MAAR 6 timekeeping trap** | `FAR_16_601_TM`, `DCAA_MAAR_6_AP` (cross-ref) |
| **Contract-type misclassification trap** (cost-reimb vs. FFP applicability) | `FAR_PART_16`, `FAR_16_301_COST_REIMB`, `FAR_16_306_CPFF` |
| **Fabricated-benchmark trap** (system tries to assert generic industry rates) | `FAR_31_201_3_REASONABLENESS` — must emit `escalation-audit` declining to fabricate |

---

## §13 — Last-Verified Block

| Domain | Last verified | Verification method |
|---|---|---|
| `acquisition.gov` FAR 31.201-3, 15.404-1, Part 16, Part 19, 42.709 | 2026-06-25 | Manual URL fetch via research subagent |
| `dcma.mil` MAN 2201-01 / 2201-03 | 2026-06-25 | Manual URL fetch |
| `dcaa.mil` Indirect Cost Overview + FY23 RtC | 2026-06-25 | Manual URL fetch |
| `dodig.mil` 2014 / 2021 reports | 2026-06-25 | Manual URL fetch |
| `whitehouse.gov` OMB CECP | 2026-06-25 | Manual URL fetch (CY 2026 OFPP memo not yet confirmed) |
| `gsa.gov` per diem + FTR | 2026-06-25 | Manual URL fetch |
| `state.gov` DSSR foreign per diem | 2026-06-25 | Manual URL fetch |
| `travel.dod.mil` JTR | 2026-06-25 | Manual URL fetch |
| `sba.gov` size standards | 2026-06-25 | Manual URL fetch |
| `ecfr.gov` 13 CFR 121, DFARS 215.407-3 | 2026-06-25 | Manual URL fetch |

---

**END — `GovCon_Benchmarks_Sources.md` v1.0**
