# GovCon Disclosures Sources

**Document version:** v1.0
**Document authored:** 2026-06-25
**Document owner:** Matthew Wiseman / Wiseman Financial Technologies LLC
**Product:** Advisacor
**Branch:** `architecture-lane-refactor-baseline`
**Companion to:** `GovCon_DCAA_Vertical_Planning_Doc.md`, `GovCon_FAR31_Sources.md`, `GovCon_CAS_Sources.md`, `GovCon_DCAA_Sources.md`, `Phase_GC_1_Recon_Spec.md`

---

> **DRAFT / SPEC ONLY — primary-source citation register for the four government-contract rate-disclosure regimes:**
> 1. **ICS / ICE** — Final Indirect Cost Rate Proposal (FAR 52.216-7(d))
> 2. **FPRA / FPRR** — Forward Pricing Rate Agreement / Recommendation (FAR 42.17)
> 3. **PBR** — Provisional Billing Rate (FAR 42.704)
> 4. **DS-1 / DS-2** — CAS Disclosure Statement (48 CFR 9903.202)
> Plus **SF 1408** — Pre-Award Accounting System Survey (referenced from DCAA sources for completeness here).
>
> All URLs verified 2026-06-25 against canonical `acquisition.gov`, `ecfr.gov`, `dcaa.mil`, `dcma.mil`, `gsa.gov` domains.
> Strong-build mandate: the **full FPRA → PBR → Final Indirect → ICS reconciliation chain** is enforced; mismatches between regime tiers emit `dcaa-rate-audit` events.

---

## §1 — Final Indirect Cost Rate Proposal (ICS) and ICE Model

The Final Indirect Cost Rate Proposal is the centerpiece of contractor-government rate settlement. Filed within **6 months of fiscal year-end** under FAR 52.216-7(d), with the DCAA ICE Model as the de facto required structure.

| Handle | Title | URL | Description |
|---|---|---|---|
| `FAR_52_216_7_ALLOWABLE_COST_PAYMENT` | FAR 52.216-7 — Allowable Cost and Payment (clause) | [acquisition.gov 52.216-7](https://www.acquisition.gov/far/52.216-7) | Master clause for cost-reimbursement contracts; subparagraph (d) requires final indirect rate proposal |
| `FAR_52_216_7_D_ICS_SUBMISSION` | FAR 52.216-7(d) — ICS Submission Requirements | [acquisition.gov 52.216-7](https://www.acquisition.gov/far/52.216-7) | (1) Final indirect cost rate proposal due **within 6 months** of FY end; (2) contractor **certifies** proposal; (3) settlement within specified periods; (4) contractor **updates all billings within 60 days** of rate settlement |
| `FAR_42_705_FINAL_RATES` | FAR 42.705 — Final Indirect Cost Rates | [acquisition.gov 42.705](https://www.acquisition.gov/far/42.705) | Establishes final indirect cost rates via CO determination (42.705-1) or auditor determination (42.705-2); completion invoice required within 120 days of final rate settlement |
| `FAR_42_705_1_CO_DETERMINATION` | FAR 42.705-1 — Contracting Officer Determination | [acquisition.gov 42.705-1](https://www.acquisition.gov/far/42.705-1) | CO-led final rate negotiation for commercial organizations; contractor submits certified proposal within 6 months of FY end; CO issues determination |
| `FAR_42_705_2_AUDITOR_DETERMINATION` | FAR 42.705-2 — Auditor Determination | [acquisition.gov 42.705-2](https://www.acquisition.gov/far/42.705-2) | DCAA auditor-led final rate determination for certain contractors; auditor issues memorandum or negotiated settlement |
| `DCAA_ICE_MODEL` | DCAA ICE Model v1.07 (Power Query, Jun 2026) | [DCAA ICE Model page](https://www.dcaa.mil/Checklists-Tools/ICE-Model/) | Authoritative template; 18+ schedules (A through M and supplements); contractor submission portal |
| `DCAA_ICS_CHECKLIST` | DCAA ICS Adequacy Checklist | [ICE Model / Checklists page](https://www.dcaa.mil/Customers/Checklists-Tools/ICE-Model/) | Adequacy gate before audit begins; failure → contractor must resubmit |
| `FAR_42_709_LEVEL_1` | FAR 42.709 — Penalties for Unallowable Costs (Level 1) | [acquisition.gov 42.709](https://www.acquisition.gov/far/42.709) | **Level 1 penalty**: amount of unallowable cost + interest; applies to expressly unallowable costs included in ICS |
| `FAR_42_709_LEVEL_2` | FAR 42.709-1(b)(2) — Level 2 Penalty | [acquisition.gov 42.709-1](https://www.acquisition.gov/far/42.709-1) | **Level 2 penalty**: 2× the unallowable cost; applies when unallowable cost was determined unallowable for that contractor before the year of submission |
| `DCAM_MAN_2201_03` | DCMA Manual 2201-03 — Final Indirect Cost Rates (Aug 2024) | [DCMA MAN 2201-03 PDF](https://www.dcma.mil/Portals/31/Documents/Policy/DCMA_MAN_2201-03.pdf) | DCMA procedures for establishing final indirect rates; CO vs. auditor determination; penalty assessment for expressly unallowable costs; 6-month audit resolution target |

---

## §2 — Forward Pricing Rate Agreement / Recommendation (FPRA / FPRR)

FPRA is a negotiated agreement between contractor and ACO establishing rates for use in pricing future contracts/modifications. FPRR is a unilateral DCMA recommendation when no FPRA is in place.

| Handle | Title | URL | Description |
|---|---|---|---|
| `FAR_15_407_3_FPRA` | FAR 15.407-3 — Forward Pricing Rate Agreements | [acquisition.gov 15.407-3](https://www.acquisition.gov/far/15.407-3) | FPRA procedure for pricing all contracts/modifications during the agreement period; contractor must describe FPRAs in each specific proposal; certifies data |
| `FAR_42_17_FPRA_SUBPART` | FAR Subpart 42.17 — Forward Pricing Rate Agreements | [acquisition.gov Subpart 42.17](https://www.acquisition.gov/far/subpart-42.17) | Governs FPRA establishment and monitoring; ACO responsible; FPRA used for contractors with significant Government volume; FPRR issued when FPRA not established or invalidated; continuous FPRA option |
| `FAR_42_1701_FPRA_PROC` | FAR 42.1701 — FPRA/FPRR Procedures | [acquisition.gov 42.1701](https://www.acquisition.gov/far/42.1701) | Detailed FPRA negotiation procedures: proposal requirements; cognizant auditor participation; PNM (Price Negotiation Memorandum) documentation; FPRR as fallback; rate monitoring + cancellation provisions |
| `DCMA_MAN_2201_01_FPRA` | DCMA Manual 2201-01 — Forward Pricing Rates (Apr 2024) | [DCMA MAN 2201-01 PDF](https://www.dcma.mil/Portals/31/Documents/Policy/DCMA_MAN_2201-01.pdf) | DCMA policy for FPRA/FPRR establishment and monitoring; **$200M threshold** for Formal Cost Monitoring Plan; FPRR timing; limited FPRA provisions; semi-annual CM reports |
| `FPRA_FPRR_TIER_RULE` | FPRA vs. FPRR Tier Decision | (consolidated reference) | **Strong-build rule**: if contractor has FPRA → use FPRA rates as primary forward-pricing tier; if FPRA invalidated or not established AND contractor exceeds DCMA cost-monitoring threshold → FPRR; if neither → contractor's own forward rates subject to contract-by-contract negotiation |

---

## §3 — Provisional Billing Rate (PBR)

PBR is the interim rate used for monthly billing during the contractor's fiscal year, before final rate settlement.

| Handle | Title | URL | Description |
|---|---|---|---|
| `FAR_42_704_PBR` | FAR 42.704 — Billing Rates (Provisional Billing Rates) | [acquisition.gov 42.704](https://www.acquisition.gov/far/42.704) | CO or auditor establishes billing rates (provisional rates) based on prior experience and anticipated final rates; rates adjusted by mutual agreement to **prevent overpayment**; billing rate elements not determinative of final settlement |
| `FAR_42_704_BILLING_ADJUSTMENT` | FAR 42.704(c) — Adjustments to Billing Rates | [acquisition.gov 42.704](https://www.acquisition.gov/far/42.704) | Either party may request rate change at any time; CO has authority to revise unilaterally if overpayment risk identified |
| `PBR_FPRA_DELTA_RULE` | PBR vs. FPRA Relationship | (consolidated reference) | **Strong-build rule**: PBR should generally equal current-period FPRA rate unless contractor has documented basis for deviation; PBR > FPRA without justification → `dcaa-rate-audit` event |

---

## §4 — CAS Disclosure Statement (DS-1 / DS-2)

The Disclosure Statement is the contractor's written description of cost accounting practices, required for full CAS coverage (and for any covered contractor crossing the $50M threshold).

| Handle | Title | URL | Description |
|---|---|---|---|
| `CASB_9903_202_DISCLOSURE` | 48 CFR 9903.202 — CAS Disclosure Requirements | [eCFR 9903.202](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-A/part-9903/section-9903.202) | Requires submission of DS-1 (commercial) or DS-2 (educational) as condition of contracting on covered contracts |
| `CASB_9903_202_1_GENERAL` | 48 CFR 9903.202-1 — Disclosure Statement General Requirements | [eCFR 9903.202-1](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-A/part-9903/section-9903.202-1) | Adequacy determination by CFAO; what practices must be disclosed |
| `CASB_9903_202_9_DS1_ILLUSTRATION` | 48 CFR 9903.202-9 — DS-1 Illustrative Form | [eCFR 9903.202-9](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-A/part-9903/section-9903.202-9) | Illustrative DS-1 structure (8 parts) — see §5 below |
| `CASB_DS_1_FORM` | DS-1 — Commercial Contractor Disclosure Statement | [eCFR 9903.202-9 illustration](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-A/part-9903/section-9903.202-9) | Form obtained from cognizant ACO; eCFR provides illustrative format and rules |
| `CASB_DS_2_FORM` | DS-2 — Educational Institution Disclosure Statement | [eCFR Part 9905](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-B/part-9905) | Out-of-scope for GC-1 commercial sub-segments; included for cross-blend trap |
| `CASB_DS_TRIGGER_50M` | $50M Disclosure Statement Submission Trigger | [eCFR 9903.202-1](https://www.ecfr.gov/current/title-48/chapter-99/subchapter-A/part-9903/section-9903.202-1) | **Strong-build trap**: contractor crossing $50M CAS-covered awards in any cost accounting period → DS-1 required; system MUST flag if profile shows threshold met without DS-1 evidence |
| `FAR_52_230_1_CAS_NOTICE` | FAR 52.230-1 — CAS Notices and Certification | [acquisition.gov 52.230-1](https://www.acquisition.gov/far/52.230-1) | Solicitation provision; offeror certifies prior Disclosure Statement submission and CAS coverage type |

### §4.1 — DS-1 Eight-Part Structure (per 9903.202-9 illustration)

| Part | Content |
|---|---|
| I | General Information (entity name, contact, fiscal year, organizational structure) |
| II | Direct Costs (identification, accumulation method, allocation to final cost objectives) |
| III | Indirect Costs (pool composition, allocation bases, rates) |
| IV | Depreciation and Use Allowances (capitalization minimums, useful life, methods) |
| V | Other Costs and Credits (vacation pay, severance, applicable credits) |
| VI | Deferred Compensation and Insurance Costs (pension cost measurement, self-insurance) |
| VII | Corporate or Group Expenses (home-office allocation under CAS 403 if applicable) |
| VIII | Home Office Expenses Allocation (three-tier allocation methodology) |

---

## §5 — SF 1408 (Pre-Award Accounting System Survey) — Cross-Reference

(See `GovCon_DCAA_Sources.md` §5 for full SF 1408 detail. Listed here for the rate-disclosure regime completeness check.)

| Handle | Title | URL |
|---|---|---|
| `DCAA_SF1408` | SF 1408 — Pre-Award Survey | [GSA SF 1408](https://www.gsa.gov/reference/forms/preaward-survey-of-prospective-contractor-accounting-system) |
| `DCAA_SF1408_AP` | DCAA AP 17740 — Preaward Survey audit program | [AP 17740 PDF](https://www.dcaa.mil/Portals/88/Documents/Guidance/Directory%20of%20Audit%20Programs/17740%20AP%20Preaward%20Survey%20of%20Prospective%20Contractor%20Accounting%20System_20250609.pdf) |
| `FAR_53_209_1_FORMS` | FAR 53.209-1(f) — Forms Prescribing SF 1408 | [acquisition.gov 53.209-1](https://www.acquisition.gov/far/53.209-1) |

---

## §6 — The Full FPRA → PBR → Final Indirect → ICS Reconciliation Chain

The GC-2 strong build enforces a four-tier rate-reconciliation chain. Each tier must reconcile to the next; mismatches emit `dcaa-rate-audit`.

```
TIER 1: FPRA (forward-pricing) ─────────────► used to bid new contracts (1-3 year horizon)
   │
   ▼
TIER 2: PBR (provisional billing) ──────────► used for monthly invoicing during current FY
   │
   ▼
TIER 3: Final Indirect Rate (ICS) ──────────► negotiated within 6 months of FY end (FAR 52.216-7(d))
   │
   ▼
TIER 4: CO/Auditor Determined Final Rate ──► binding final-settlement rate (FAR 42.705)
   │
   ▼
TIER 5: Billing reconciliation ─────────────► contractor updates all billings within 60 days (FAR 52.216-7(d)(4))
```

| Reconciliation Check | Rule | Source |
|---|---|---|
| **FPRA ↔ PBR** | PBR should equal current-period FPRA rate; deviation requires documented basis | `FAR_42_704_PBR`, `FAR_42_1701_FPRA_PROC` |
| **PBR ↔ Final Indirect** | Final indirect rate normalizes against actual cost pool/base; PBR-vs-Final delta drives prior-year billing adjustments | `FAR_52_216_7_D_ICS_SUBMISSION`, `FAR_42_705_FINAL_RATES` |
| **Final Indirect ↔ CO/Auditor Final** | CO or auditor may accept, adjust, or unilaterally determine final rate | `FAR_42_705_1_CO_DETERMINATION`, `FAR_42_705_2_AUDITOR_DETERMINATION` |
| **Final Rate ↔ Billing Reconciliation** | Contractor updates all billings within 60 days of settlement | `FAR_52_216_7_D_ICS_SUBMISSION` |
| **DS-1 ↔ Actual Practice** | Practices in DS-1 must match practices used in ICS, FPRA, PBR | `CASB_9903_202_DISCLOSURE`, `CASB_9903_202_1_GENERAL` |

---

## §7 — Citation Handles → Trap Mapping Summary

| Trap (from Planning Doc §5) | Required Disclosure Handles |
|---|---|
| **6-month ICS deadline trap** (FAR 52.216-7(d)(1) — late submission) | `FAR_52_216_7_D_ICS_SUBMISSION`, `FAR_42_705_FINAL_RATES` |
| **60-day billing-update trap** (post-settlement re-bill) | `FAR_52_216_7_D_ICS_SUBMISSION` |
| **120-day completion-invoice trap** | `FAR_42_705_FINAL_RATES` |
| **FAR 42.709 Level 1/2 penalty trap** (unallowable in ICS) | `FAR_42_709_LEVEL_1`, `FAR_42_709_LEVEL_2`, `FAR_31_201_6_UNALLOWABLE_ACCOUNTING` |
| **FPRA-PBR-Final reconciliation trap** | `FAR_15_407_3_FPRA`, `FAR_42_704_PBR`, `FAR_42_705_FINAL_RATES` |
| **DS-1 ↔ practice-drift trap** | `CASB_9903_202_DISCLOSURE`, `CASB_9903_202_1_GENERAL`, `CAS_401_CONSISTENCY_ESTIMATING` |
| **$50M DS submission trigger trap** | `CASB_DS_TRIGGER_50M`, `CASB_9903_202_DISCLOSURE` |
| **ICE Model schedule-completeness trap** (missing schedule = inadequate) | `DCAA_ICE_MODEL`, `DCAA_ICS_CHECKLIST` |
| **DCMA $200M Formal Cost Monitoring Plan trap** | `DCMA_MAN_2201_01_FPRA` |

---

## §8 — Sub-Segment Disclosure Regime Applicability

| Sub-Segment | ICS Required | FPRA Typical | PBR Required | DS-1 Required | SF 1408 Required |
|---|---|---|---|---|---|
| **C — CAS-Covered** | Yes (mandatory) | Yes (significant Govt volume) | Yes | **Yes** (Full ≥$50M) or conditional (Modified) | Yes |
| **N — Non-CAS** | Yes if cost-reimb | Optional | Yes if cost-reimb | No | Yes if cost-reimb |
| **S — Small Business** | Yes if cost-reimb | Rare | Yes if cost-reimb | **No** (CAS exempt) | Yes if cost-reimb |
| **R — R&D / SBIR-STTR** | Yes if cost-reimb (often Phase III) | Rare in Phase I/II FFP; possible Phase III | Yes if cost-reimb | Conditional | Yes if cost-reimb |
| **F — FFP-Heavy** | **No** (no indirect rate settlement on pure FFP) | Possible for mixed portfolios | No | No | Conditional (if any cost-reimb mix) |
| **T — T&M** | Yes (material-handling and indirect rate true-up) | Yes (loaded-labor rates) | Yes | Conditional | Yes |

---

## §9 — Last-Verified Block

| Domain | Last verified | Verification method |
|---|---|---|
| `acquisition.gov` FAR 42.17, 42.7, 52.216-7, 42.709 | 2026-06-25 | Manual URL fetch via research subagent |
| `ecfr.gov` 48 CFR 9903.202 | 2026-06-25 | Manual URL fetch |
| `dcaa.mil` ICE Model + checklists | 2026-06-25 | Manual URL fetch |
| `dcma.mil` MAN 2201-01 / 2201-03 | 2026-06-25 | Manual URL fetch |
| `gsa.gov` SF 1408 | 2026-06-25 | Manual URL fetch |

---

**END — `GovCon_Disclosures_Sources.md` v1.0**
