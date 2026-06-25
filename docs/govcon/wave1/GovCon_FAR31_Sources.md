# GovCon FAR Part 31 Sources

**Document version:** v1.0
**Document authored:** 2026-06-25
**Document owner:** Matthew Wiseman / Wiseman Financial Technologies LLC
**Product:** Advisacor
**Branch:** `architecture-lane-refactor-baseline`
**Companion to:** `GovCon_DCAA_Vertical_Planning_Doc.md`, `Phase_GC_1_Recon_Spec.md`

---

> **DRAFT / SPEC ONLY — primary-source citation register for FAR Part 31 cost principles.**
> All URLs verified 2026-06-25 against canonical `acquisition.gov` domain.
> `builderNeverAuthorsContent: true` — rule logic must cite these URLs; no hard-coded rule text.

---

## §1 — Core FAR Part 31 Sections

| Handle | Title | URL | Description |
|---|---|---|---|
| `FAR_31_000` | Scope of Part 31 | [acquisition.gov FAR 31.000](https://www.acquisition.gov/far/31.000) | Establishes Part 31 governs pricing of contracts/subcontracts when cost analysis is performed |
| `FAR_31_SUBPART_2` | Subpart 31.2 — Commercial Organizations | [acquisition.gov Subpart 31.2](https://www.acquisition.gov/far/subpart-31.2) | Main subpart governing cost-reimb / T&M / non-fixed-price contracts |
| `FAR_31_201_1` | Composition of Total Cost | [acquisition.gov FAR 31.201-1](https://www.acquisition.gov/far/31.201-1) | Total cost = sum of allowable direct + indirect costs |
| `FAR_31_201_2_ALLOWABILITY` | Determining Allowability | [acquisition.gov FAR 31.201-2](https://www.acquisition.gov/far/31.201-2) | **Five-factor test**: reasonable, allocable, CAS/GAAP-compliant, contract-compliant, no specific limitation — all five must be met |
| `FAR_31_201_3_REASONABLENESS` | Determining Reasonableness | [acquisition.gov FAR 31.201-3](https://www.acquisition.gov/far/31.201-3) | Prudent-person standard; no presumption of reasonableness; burden of proof on contractor when challenged |
| `FAR_31_201_4_ALLOCABILITY` | Determining Allocability | [acquisition.gov FAR 31.201-4](https://www.acquisition.gov/far/31.201-4) | Cost allocable if specifically for contract OR benefits contract+other work proportionally OR necessary to overall business operation |
| `FAR_31_201_5` | Credits | [acquisition.gov FAR 31.201-5](https://www.acquisition.gov/far/31.201-5) | Applicable credits (discounts, rebates) must reduce allowable costs |
| `FAR_31_201_6_UNALLOWABLE_ACCOUNTING` | Accounting for Unallowable Costs | [acquisition.gov FAR 31.201-6](https://www.acquisition.gov/far/31.201-6) | **Directly-associated-unallowables trap centerpiece**: unallowable costs and directly-associated costs must be identified and excluded from all billings/claims/proposals |
| `FAR_31_202` | Direct Costs | [acquisition.gov FAR 31.202](https://www.acquisition.gov/far/31.202) | Direct cost identifiable with final cost objective; cannot be charged to other work as indirect |
| `FAR_31_203` | Indirect Costs | [acquisition.gov FAR 31.203](https://www.acquisition.gov/far/31.203) | Residual costs; logical groupings with causal/beneficial relationship; **base must include all items regardless of allowability** |
| `FAR_31_204` | Application of Principles | [acquisition.gov FAR 31.204](https://www.acquisition.gov/far/31.204) | 31.205 not exhaustive; unlisted costs decided by analogy |

---

## §2 — FAR 31.205 Selected Costs (Complete Unallowable List)

**52 enumerated subsections.** All cite parent: [acquisition.gov FAR Part 31](https://www.acquisition.gov/far/part-31). Individual URLs follow `https://www.acquisition.gov/far/31.205-[N]` pattern.

### §2.1 — Hard Unallowable (categorical rejection)

| Handle | Subsection | Title | URL | Trap Pattern |
|---|---|---|---|---|
| `FAR_31_205_3_BAD_DEBTS` | 31.205-3 | Bad Debts | [acquisition.gov FAR 31.205-3](https://www.acquisition.gov/far/31.205-3) | Uncollectible A/R + directly-associated collection/legal — categorical reject |
| `FAR_31_205_8_CONTRIBUTIONS` | 31.205-8 | Contributions or Donations | [acquisition.gov FAR 31.205-8](https://www.acquisition.gov/far/31.205-8) | Cash, property, services to any recipient — categorical reject (narrow recruitment exception) |
| `FAR_31_205_14_ENTERTAINMENT` | 31.205-14 | Entertainment Costs | [acquisition.gov FAR 31.205-14](https://www.acquisition.gov/far/31.205-14) | Amusement, social activities, tickets, country club memberships — categorical reject |
| `FAR_31_205_15_FINES` | 31.205-15 | Fines, Penalties, Mischarging | [acquisition.gov FAR 31.205-15](https://www.acquisition.gov/far/31.205-15) | Statutory fines unallowable (exception: contract-mandated or CO-instructed); record alteration costs unallowable |
| `FAR_31_205_20_INTEREST` | 31.205-20 | Interest and Financial Costs | [acquisition.gov FAR 31.205-20](https://www.acquisition.gov/far/31.205-20) | Borrowing interest, bond discounts, financing costs — categorical reject (state/local tax interest narrow exception) |
| `FAR_31_205_22_LOBBYING` | 31.205-22 | Lobbying and Political | [acquisition.gov FAR 31.205-22](https://www.acquisition.gov/far/31.205-22) | Election/legislation/regulatory influence — categorical reject (narrow technical-presentation exception) |
| `FAR_31_205_23_LOSSES_OTHER` | 31.205-23 | Losses on Other Contracts | [acquisition.gov FAR 31.205-23](https://www.acquisition.gov/far/31.205-23) | Excess costs over income on other contracts — categorical reject |
| `FAR_31_205_27_ORG_COSTS` | 31.205-27 | Organization Costs | [acquisition.gov FAR 31.205-27](https://www.acquisition.gov/far/31.205-27) | Corporate reorganization, capital raising costs — categorical reject |
| `FAR_31_205_49_GOODWILL` | 31.205-49 | Goodwill | [acquisition.gov FAR 31.205-49](https://www.acquisition.gov/far/31.205-49) | Purchase-method goodwill amortization/expense/write-off — categorical reject |
| `FAR_31_205_51_ALCOHOL` | 31.205-51 | Alcoholic Beverages | [acquisition.gov FAR 31.205-51](https://www.acquisition.gov/far/31.205-51) | All alcoholic beverages — categorical reject without exception |

### §2.2 — Conditional Allowability (rule-bound)

| Handle | Subsection | Title | URL | Key Condition / Trap |
|---|---|---|---|---|
| `FAR_31_205_1_PR_ADVERTISING` | 31.205-1 | Public Relations / Advertising | [acquisition.gov FAR 31.205-1](https://www.acquisition.gov/far/31.205-1) | Allowable only for: contract-required, scarce-item acquisition, scrap disposal, export promotion, or recruitment per .205-34 |
| `FAR_31_205_4_BONDING` | 31.205-4 | Bonding Costs | [acquisition.gov FAR 31.205-4](https://www.acquisition.gov/far/31.205-4) | Allowable if contract-required or sound business practice at reasonable rates |
| `FAR_31_205_6_COMPENSATION` | 31.205-6 | Compensation for Personal Services | [acquisition.gov FAR 31.205-6](https://www.acquisition.gov/far/31.205-6) | Reasonableness + established plan + work-year basis; **exec comp cap in (p) — see §3** |
| `FAR_31_205_7_CONTINGENCIES` | 31.205-7 | Contingencies | [acquisition.gov FAR 31.205-7](https://www.acquisition.gov/far/31.205-7) | Generally unallowable in historical costing; known/foreseeable allowable in forward pricing only |
| `FAR_31_205_10_COST_OF_MONEY` | 31.205-10 | Cost of Money | [acquisition.gov FAR 31.205-10](https://www.acquisition.gov/far/31.205-10) | Allowable imputed cost per CAS 9904.414/9904.417; **distinct from actual interest** (which is unallowable per .205-20) |
| `FAR_31_205_11_DEPRECIATION` | 31.205-11 | Depreciation | [acquisition.gov FAR 31.205-11](https://www.acquisition.gov/far/31.205-11) | Per CAS 9904.409; no depreciation on fully-depreciated or government-furnished property; impairment write-downs unallowable |
| `FAR_31_205_13_MORALE_FOOD` | 31.205-13 | Morale / Food Service / Dormitory | [acquisition.gov FAR 31.205-13](https://www.acquisition.gov/far/31.205-13) | Conditions/morale OK; gifts/recreation unallowable (sports teams excepted); food losses under break-even/unusual rules |
| `FAR_31_205_16_GAINS_LOSSES` | 31.205-16 | Gains/Losses on Disposition | [acquisition.gov FAR 31.205-16](https://www.acquisition.gov/far/31.205-16) | Gains/losses in year of occurrence; impairment write-downs unallowable; sale-leaseback limited to ownership equivalent |
| `FAR_31_205_17_IDLE_FACILITIES` | 31.205-17 | Idle Facilities / Capacity | [acquisition.gov FAR 31.205-17](https://www.acquisition.gov/far/31.205-17) | Idle facilities unallowable except ≤1yr due to unforeseen change; idle capacity allowable if necessary and not reducible |
| `FAR_31_205_18_IRAD_BP` | 31.205-18 | IR&D and B&P | [acquisition.gov FAR 31.205-18](https://www.acquisition.gov/far/31.205-18) | Allowable as indirect if allocable + reasonable; subject to CAS 9904.420; deferred IR&D generally unallowable |
| `FAR_31_205_19_INSURANCE` | 31.205-19 | Insurance and Indemnification | [acquisition.gov FAR 31.205-19](https://www.acquisition.gov/far/31.205-19) | Self-insurance + purchased OK per limits; CAS 9904.416 where applicable; officer life insurance has limits |
| `FAR_31_205_21_LABOR_RELATIONS` | 31.205-21 | Labor Relations | [acquisition.gov FAR 31.205-21](https://www.acquisition.gov/far/31.205-21) | Shop stewards OK; **anti-union persuasion activities unallowable** |
| `FAR_31_205_25_PRODUCTION_ENG` | 31.205-25 | Manufacturing/Production Engineering | [acquisition.gov FAR 31.205-25](https://www.acquisition.gov/far/31.205-25) | New materials/processes deployment, pilot lines, producibility OK; excludes basic research and capitalized items |
| `FAR_31_205_26_MATERIAL_COSTS` | 31.205-26 | Material Costs | [acquisition.gov FAR 31.205-26](https://www.acquisition.gov/far/31.205-26) | Adjusted for discounts/rebates/scrap/returns; **interorganizational transfers at cost** (commercial product exception) |
| `FAR_31_205_28_OTHER_BUSINESS` | 31.205-28 | Other Business Expenses | [acquisition.gov FAR 31.205-28](https://www.acquisition.gov/far/31.205-28) | Securities transfer/registry, shareholder meetings, normal proxy, regulatory reports, director meetings |
| `FAR_31_205_29_PLANT_PROTECTION` | 31.205-29 | Plant Protection | [acquisition.gov FAR 31.205-29](https://www.acquisition.gov/far/31.205-29) | Security personnel + equipment + depreciation; military requirement compliance |
| `FAR_31_205_30_PATENT_COSTS` | 31.205-30 | Patent Costs | [acquisition.gov FAR 31.205-30](https://www.acquisition.gov/far/31.205-30) | Government-required patent work + general counseling OK; other patent costs unallowable |
| `FAR_31_205_31_RECONVERSION` | 31.205-31 | Plant Reconversion | [acquisition.gov FAR 31.205-31](https://www.acquisition.gov/far/31.205-31) | Generally unallowable; Government-property removal + advance-agreement exceptions |
| `FAR_31_205_32_PRECONTRACT` | 31.205-32 | Precontract Costs | [acquisition.gov FAR 31.205-32](https://www.acquisition.gov/far/31.205-32) | Allowable if directly pursuant to negotiation + anticipation of award + necessary for delivery schedule |
| `FAR_31_205_33_PROF_CONSULTANT` | 31.205-33 | Professional/Consultant Services | [acquisition.gov FAR 31.205-33](https://www.acquisition.gov/far/31.205-33) | Reasonable + non-contingent; **detailed documentation required** (agreements, invoices, work products); retainer fees need evidence of services |
| `FAR_31_205_34_RECRUITMENT` | 31.205-34 | Recruitment Costs | [acquisition.gov FAR 31.205-34](https://www.acquisition.gov/far/31.205-34) | Help-wanted ads for specific positions OK; image-only ads unallowable |
| `FAR_31_205_35_RELOCATION` | 31.205-35 | Relocation Costs | [acquisition.gov FAR 31.205-35](https://www.acquisition.gov/far/31.205-35) | Employee/family travel, home search, closing costs, temporary lodging subject to limits; loss on home sale unallowable |
| `FAR_31_205_36_RENTAL` | 31.205-36 | Rental Costs | [acquisition.gov FAR 31.205-36](https://www.acquisition.gov/far/31.205-36) | Reasonable vs comparable; sale-leaseback limited to ownership cost; interorganizational limited to ownership equivalent |
| `FAR_31_205_37_ROYALTIES` | 31.205-37 | Royalties for Patents | [acquisition.gov FAR 31.205-37](https://www.acquisition.gov/far/31.205-37) | Necessary for performance OK; unallowable if Government has license, patent invalid/expired |
| `FAR_31_205_38_SELLING` | 31.205-38 | Selling Costs | [acquisition.gov FAR 31.205-38](https://www.acquisition.gov/far/31.205-38) | Direct selling + B&P + allowable advertising OK; agents/commissions only to bona fide employees / commercial agencies |
| `FAR_31_205_39_WARRANTY` | 31.205-39 | Service and Warranty | [acquisition.gov FAR 31.205-39](https://www.acquisition.gov/far/31.205-39) | Contractual service/warranty obligations; avoid duplication with product cost estimates |
| `FAR_31_205_40_SPECIAL_TOOLING` | 31.205-40 | Special Tooling/Test Equipment | [acquisition.gov FAR 31.205-40](https://www.acquisition.gov/far/31.205-40) | Allowable; allocated to specific contracts; pre-contract acquisition limited to depreciation/amortization |
| `FAR_31_205_41_TAXES` | 31.205-41 | Taxes | [acquisition.gov FAR 31.205-41](https://www.acquisition.gov/far/31.205-41) | Federal/State/local per GAAP + IRC §59A OK; **federal income/excess profits, financing, exempt-available, capital-improvement assessments unallowable** |
| `FAR_31_205_42_TERMINATION` | 31.205-42 | Termination Costs | [acquisition.gov FAR 31.205-42](https://www.acquisition.gov/far/31.205-42) | Special rules; common items reusable elsewhere unallowable; continuing costs allowable if not avoidable (unallowable if negligent failure to discontinue) |
| `FAR_31_205_43_TRADE_PROF` | 31.205-43 | Trade/Technical/Professional Activities | [acquisition.gov FAR 31.205-43](https://www.acquisition.gov/far/31.205-43) | Memberships, periodicals, meetings (information dissemination / productivity improvement) |
| `FAR_31_205_44_TRAINING` | 31.205-44 | Training and Education | [acquisition.gov FAR 31.205-44](https://www.acquisition.gov/far/31.205-44) | Job-related OK; **overtime for training, full-time graduate >2yrs, dependent college savings unallowable** |
| `FAR_31_205_46_TRAVEL` | 31.205-46 | Travel Costs | [acquisition.gov FAR 31.205-46](https://www.acquisition.gov/far/31.205-46) | Per-diem caps (GSA CONUS / DSSR foreign / JTR military); **airfare above lowest available unallowable** (documented exceptions); contractor aircraft manifest requirements |
| `FAR_31_205_47_LEGAL` | 31.205-47 | Legal Proceedings | [acquisition.gov FAR 31.205-47](https://www.acquisition.gov/far/31.205-47) | Costs unallowable if conviction/liability/penalty/debarment/fraud-consent; settlement/likelihood/direct-result/CO-direction exceptions; non-fraud proceedings 80% ceiling |
| `FAR_31_205_48_RD` | 31.205-48 | R&D Costs | [acquisition.gov FAR 31.205-48](https://www.acquisition.gov/far/31.205-48) | R&D in excess of contract price/grant amount unallowable under any other Government contract |
| `FAR_31_205_52_ASSET_BC` | 31.205-52 | Asset Valuations from Business Combinations | [acquisition.gov FAR 31.205-52](https://www.acquisition.gov/far/31.205-52) | Tangible: depreciation/cost-of-money based on CAS 9904.404-50(d); intangible: amortization limited to pre-combination amounts |

### §2.3 — Allowable (general allowance, ordinary rules apply)

| Handle | Subsection | Title | URL |
|---|---|---|---|
| `FAR_31_205_12_ECON_PLANNING` | 31.205-12 | Economic Planning | [acquisition.gov FAR 31.205-12](https://www.acquisition.gov/far/31.205-12) |

### §2.4 — Reserved (placeholder slots in FAR)

`FAR_31_205_2`, `FAR_31_205_5`, `FAR_31_205_9`, `FAR_31_205_24`, `FAR_31_205_45`, `FAR_31_205_50` — all reserved; no enforcement logic needed.

---

## §3 — Executive Compensation Cap (FAR 31.205-6(p))

| Handle | Value | Source | URL |
|---|---|---|---|
| `EXEC_COMP_CAP_FY2025` | **$671,000** (confirmed) | OFPP CY 2025 benchmark | [acquisition.gov FAR 31.205-6](https://www.acquisition.gov/far/31.205-6) |
| `EXEC_COMP_CAP_FY2026` | **~$695,000** (estimated, official OFPP memo pending) | BLS ECI extrapolation | [whitehouse.gov OFPP CECP](https://www.whitehouse.gov/omb/procurement/cecp) |

**Statutory authority:** 10 U.S.C. 3744(a)(16) and 41 U.S.C. 4304(a)(16). Bipartisan Budget Act of 2013 §702 set initial $487,000 in 2014.
**Applicability:** All employees on contracts awarded on/after **June 24, 2014**.
**Calculation formula:** Prior Year Cap × BLS ECI (Table 4, 12 months ending September 30).

**K-H enforcement rule:** Compensation booked above current-FY cap is rejected as unallowable with `dcaa-rate-audit` + `escalation-audit` emission. Use confirmed CY 2025 value ($671,000) until OFPP publishes official CY 2026 memo.

---

## §4 — Contract Clauses (FAR 52)

| Handle | Title | URL | Description |
|---|---|---|---|
| `FAR_52_216_7_ALLOWABLE_COST_PAYMENT` | Allowable Cost and Payment (Aug 2018) | [acquisition.gov FAR 52.216-7](https://www.acquisition.gov/far/52.216-7) | Governs provisional billing + final indirect rate settlement + **ICS submission required within 6 months of FY end** |
| `FAR_52_216_7_D` | 52.216-7(d) — ICS Submission Requirements | [acquisition.gov FAR 52.216-7](https://www.acquisition.gov/far/52.216-7) | (1) ICS within 6mo FY end; (2) contractor certifies; (3) settlement timing; (4) billing updates within 60 days of settlement |
| `FAR_52_230_2_CAS_CLAUSE` | Cost Accounting Standards (Jun 2020) | [acquisition.gov FAR 52.230-2](https://www.acquisition.gov/far/52.230-2) | CAS contract clause — requires CAS compliance and Disclosure Statement filing |
| `FAR_52_230_6_CAS_ADMIN` | CAS Administration (Jun 2010) | [acquisition.gov FAR 52.230-6](https://www.acquisition.gov/far/52.230-6) | Requires CO notification of accounting practice changes + cost impact proposals |
| `FAR_52_230_1_CAS_NOTICE` | CAS Notice and Certification | [acquisition.gov FAR 52.230-1](https://www.acquisition.gov/far/52.230-1) | Solicitation provision requiring DS-1 or DS-2 certification |

---

## §5 — Penalty Provisions (FAR 42.709)

| Handle | Tier | Penalty | Source |
|---|---|---|---|
| `FAR_42_709_LEVEL_1` | Level 1 — Expressly Unallowable | Equal to disallowed costs × contract allocation | [acquisition.gov FAR 42.709](https://www.acquisition.gov/far/42.709) |
| `FAR_42_709_LEVEL_2` | Level 2 — Knowing Submission | **2× disallowed costs** × contract allocation | [acquisition.gov FAR 42.709](https://www.acquisition.gov/far/42.709) |

Penalty assessment per DCMA Manual 2201-03 ([dcma.mil](https://www.dcma.mil/Portals/31/Documents/Policy/DCMA_MAN_2201-03.pdf)).

---

## §6 — Change Log

| Version | Date | Author | Notes |
|---|---|---|---|
| v1.0 | 2026-06-25 | Perplexity Computer | Initial sources doc — 52 FAR 31.205 subsections enumerated with allowability status, conditions, traps, and individual canonical URLs. All URLs verified against `acquisition.gov`. Exec comp cap CY 2025 confirmed at $671,000; CY 2026 estimated ~$695,000 (OFPP memo pending). Penalty tiers per FAR 42.709 captured. |

---

**End of GovCon FAR Part 31 Sources.**
