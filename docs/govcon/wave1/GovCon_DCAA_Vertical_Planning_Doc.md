# GovCon / DCAA Vertical — Wave 1 + Wave 2 Planning Doc

**Document version:** v1.0
**Document authored:** 2026-06-25
**Document owner:** Matthew Wiseman / Wiseman Financial Technologies LLC
**Product:** Advisacor
**Branch:** `architecture-lane-refactor-baseline`
**Architecture decision:** **Option b (greenfield fresh build) — Path A two-wave sequence**

---

> **DRAFT / SPEC ONLY — executable when explicitly invoked by Cursor.**
> `executable: false` (planning document)
> `containsVerticalComplianceLogic: true`
> `builderNeverAuthorsContent: true`
> `isNotReplacementForHuman: true`
> `humanWorkerParityDoctrine: true`
> `containsGovernmentContractData: true` ← **NEW for GC-1/GC-2** — every module that may touch DCAA-auditable contract data MUST declare this and emit `dcaa-rate-audit` events on every rate calculation or allowability determination
>
> Founder approval recorded by `mwiseman@advisacor.com`. Strong-stance SOC 1 / SOC 2 Type 2 / DCAA-audit-ready posture binding. No degraded modes. No severity tiers.

---

## §0 — Pre-Flight Probe Summary

**Repo probe results (2026-06-25):** GovCon/DCAA is a **true greenfield**. No pre-Wave-2 library/kpi/disclosure-variant/reasonableness/profile content exists. Only forward-looking hooks present:

| Hook | Location | Action |
|---|---|---|
| `GOVCON_DCAA` already in `IndustryHandle` union | `lib/intelligence/synthetic/standards/resolver/types.ts` | ✅ Surface pre-prepped — no additive `types.ts` change needed in COMMIT 1 (different from FA-2/HC-2) |
| `govcon_item` surface artifact category | `lib/intelligence/synthetic/command-center/.../buildCommandCenterSurfaceCandidate.ts` | ✅ Reuse and wire to GC-2 K-F capabilities |
| Atlas §10.3 planned scope | `Advisacor_Phase_Atlas_v1.md` | ✅ Treat as scope hint only |

**Implication:** Path A (full Wave 1 reconnaissance → separate Wave 2 wrapper) confirmed appropriate. Wave 1 builds the canonical library-era content under `libraries/govcon/`, `kpi/govcon-rates/`, `kpi/govcon-compliance/`, `disclosure-variants/govcon/`, `reasonableness/govcon/`, `industry-profiles/govcon/`. Wave 2 wraps it Wave-2 style (HC-2 pattern).

---

## §1 — Mission and Scope Statement

### 1.1 Mission

Build a **DCAA-audit-ready compliance and rate-engine knowledge stack** for U.S. Government Contractors operating under FAR Part 31 cost principles and (where applicable) Cost Accounting Standards (CAS) 401–420. The stack must structurally enforce every named FAR 31.205 unallowable cost category, defend the forward-pricing → provisional-billing → final-indirect → ICS reconciliation chain, and emit DCAA-audit-traceable evidence on every rate calculation and allowability determination.

### 1.2 Strong-Stance Posture (Founder Binding)

- **SOC 1 / SOC 2 Type 2 / DCAA-audit-ready** — first vertical where DCAA compliance is structurally enforced at the audit-channel level
- **No degraded modes** — a missing FAR/CAS rule binding fails the entire phase
- **No severity tiers** — every unallowable cost rejection emits `dcaa-rate-audit` + `escalation-audit` (no silent rejections)
- **Strong build mandate** — target ≥ +97% overdelivery on Wave 2 verifier (match or exceed HC-2's new-high standard)

### 1.3 Wave 1 Scope (GC-1 / LOCK-GC-1)

**Reconnaissance build — canonical content authority.** Produces the foundational library-era content that Wave 2 wraps:

1. **FAR Part 31 cost principle library** — every 31.205-XX subsection enumerated with allowability status, conditions, exceptions, and trap conditions
2. **CAS 401–420 standards library** — each of the 8 in-scope standards' enforcement rules
3. **Indirect rate pool taxonomy** — Fringe / OH (Engineering, Manufacturing, Site, Material) / G&A (TCI/VA/Single-Element bases) / Material Handling / Subcontract Handling
4. **Sub-segment definitions** — 6 sub-segments (C/N/S/R/F/T)
5. **Rate-state machine model** — FPRA / FPRR / PBR / Final Indirect / ICS reconciliation
6. **ICS schema model** — Schedules A through O (incurred cost submission structure)
7. **GovCon KPI library** — indirect rate KPIs (Fringe %, OH %, G&A %, wrap rate, bid rate vs actual variance) and compliance KPIs (allowable cost % of total, unallowable variance, timekeeping conformity %)
8. **GovCon disclosure variants** — ICS schedules, FPRA proposal format, PBR submission, DS-1 / DS-2
9. **GovCon reasonableness module** — typical rate ranges by contractor size/type for DCAA reasonableness defense (FAR 31.201-3)
10. **GovCon profile** — `industry-profiles/govcon/profile.ts` declaring sub-segments, applicable standards, audit posture

### 1.4 Wave 2 Scope (GC-2 / LOCK-GC-2)

**Knowledge-stack wrapper.** Wraps Wave 1 content with the LOCK-41.5 standards resolver + LOCK-42.7 audit framework:

1. **K-0 Industry kernel** — isolation contract, sub-segment router, framework binding, **govcon classifier** (denylist + fail-closed for unallowable-cost evasion patterns)
2. **K-F Framework-aware capabilities** — capability resolution routed through LOCK-41.5 treatment-resolver (US GAAP only — IFRS not applicable to USG contracts)
3. **K-G Sub-segment governance** — 6-way routing (C/N/S/R/F/T) with applicability matrix
4. **K-H Regulatory controls** — FAR 31.205 enforcement, CAS 401/402/403/405/406/410/418/420 enforcement, exec comp cap, MAAR 6 timekeeping
5. **K-I Audit integration** — **7 audit channels** (6 from HC-2 + **new `dcaa-rate-audit`** as 7th)
6. **K-J Cross-blend trap defenses** — 10+ GovCon-specific traps
7. **K-V Red-team verifier** — **25+ poison cases**: 8 unallowable-cost evasion, 4 G&A base spoof, 3 rate-chain reconciliation spoof, 3 CAS threshold spoof, 3 timekeeping spoof, 2 exec-comp-cap spoof, 2 audit-bypass
8. **K-LOCK** — D0 evidence, attestation, REGISTRY_CHANGE_LOG entry, annotated tag

---

## §2 — Sub-Segment Matrix

### 2.1 Sub-Segment Definitions (6-way: C/N/S/R/F/T)

| Code | Sub-Segment | Definition | Key Distinguishing Feature |
|---|---|---|---|
| **C** | CAS-Covered | Contractor with ≥ $50M cumulative CAS-covered awards in preceding FY OR $50M single award | Full CAS 401–420 applicability + Disclosure Statement (DS-1) required |
| **N** | Non-CAS | Contractor below $50M CAS-coverage threshold OR exempt (commercial item, small business modified-coverage exempt) | FAR Part 31 only — no CAS enforcement |
| **S** | Small Business | 8(a), HUBZone, SDVOSB, WOSB, or SBA-size-standard qualifying small business | Modified DCAA scrutiny tier; SF 1408 accounting system review at award |
| **R** | R&D / SBIR-STTR | Research-focused with SBIR/STTR awards | Special cost-principle exclusions (FAR 35); IR&D treatment (CAS 420) |
| **F** | FFP-Heavy | > 70% revenue from Firm-Fixed-Price contracts | Reduced cost-principle scrutiny post-award; CAS 401 estimating consistency still applies |
| **T** | T&M / Labor-Hour | > 30% revenue from Time-and-Materials or Labor-Hour contracts | DCAA MAAR 6 timekeeping is the audit centerpiece |

**Isolation note:** Sub-segments are **isolation boundaries within customer** (parallel to HC-2's H/P/A/S/M/B/D pattern). A single customer may have multiple sub-segment exposures (e.g., a CAS-covered + T&M-heavy contractor is both C and T) — the engine applies the **union** of all applicable rule sets.

### 2.2 Feature Matrix

| Feature | C | N | S | R | F | T |
|---|---|---|---|---|---|---|
| FAR Part 31 cost principles | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| CAS 401 estimating consistency | ✅ | partial | partial | partial | ✅ | ✅ |
| CAS 402 cost allocation consistency | ✅ | — | — | — | — | — |
| CAS 403 home office allocation | ✅ | — | — | — | — | — |
| CAS 405 unallowable cost accounting | ✅ | applies by FAR 31.201-6 | applies by FAR 31.201-6 | applies by FAR 31.201-6 | applies by FAR 31.201-6 | applies by FAR 31.201-6 |
| CAS 406 cost accounting period | ✅ | — | — | — | — | — |
| CAS 410 G&A allocation | ✅ | — | — | — | — | — |
| CAS 418 direct/indirect allocation | ✅ | — | — | — | — | — |
| CAS 420 IR&D / B&P | ✅ | partial | partial | ✅ | — | — |
| Disclosure Statement DS-1 | ✅ | — | — | — | — | — |
| FPRA / FPRR | ✅ (typical) | optional | rare | rare | ✅ | optional |
| Provisional Billing Rates | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| ICS (Incurred Cost Submission) | ✅ | ✅ (cost-reimb) | ✅ (cost-reimb) | ✅ | — | ✅ |
| MAAR 6 timekeeping centerpiece | ✅ | ✅ | ✅ | ✅ | secondary | **primary** |
| Exec comp cap FAR 31.205-6(p) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 8(a) / HUBZone set-aside reporting | — | — | ✅ | possible | — | — |
| IR&D / B&P CAS 420 ceiling | ✅ | — | — | ✅ | — | — |

### 2.3 Regulatory Frame Detail

| Sub-Segment | Primary Regulatory Frame | Audit Posture |
|---|---|---|
| C | FAR Part 31 + CAS 401–420 + Disclosure Statement | Heavy — annual ICS review, DCAA on-site possible |
| N | FAR Part 31 only | Moderate — ICS review every 1–3 yrs depending on cost-reimb volume |
| S | FAR Part 31 + SF 1408 preaward + 8(a)/HUBZone reporting | Risk-based — SF 1408 at award, then risk-based |
| R | FAR Part 31 + FAR Part 35 (R&D) + CAS 420 (IR&D) | Specialized — R&D cost segregation primary concern |
| F | FAR Part 31 (estimating focus) + CAS 401 if CAS-covered | Light post-award — cost realism primary concern at proposal |
| T | FAR Part 31 + DCAA MAAR 6 timekeeping | **Heavy** — timekeeping is the audit centerpiece |

---

## §3 — Dependency Map

### 3.1 US GAAP Standards (Same as MFG/RTL/FA — Reused Through LOCK-41.5)

GovCon does NOT introduce new US GAAP standards. It consumes the existing LOCK-41.5 standards surface for general accounting. GovCon-specific logic is **regulatory overlay on top of GAAP**, not a replacement.

**Reused handles (no new registrations):**
- ASC 105 (GAAP hierarchy)
- ASC 605 / 606 (revenue — particularly ASC 912-605 for federal government contractor revenue, but largely subsumed by 606)
- ASC 250 (accounting changes — relevant to CAS 401/402 consistency violations)
- ASC 720 (other expenses — most FAR 31.205 unallowables align here on the books-side)
- ASC 730 (R&D — pairs with CAS 420 IR&D)

### 3.2 IFRS Standards — NOT APPLICABLE

USG contracts are reported under US GAAP for the prime contractor's books. IFRS divergence is **not a concern** for GovCon — this is unique among the verticals built so far (FA had IFRS 10/13, HC had IFRS 15, MFG/RTL both touched IFRS).

**Decision:** No `IFRS_*` handles registered for GovCon. The framework-scoped-memory dimension will be set to `US_GAAP_ONLY` for all GC modules. Wave 2 K-V will include a poison case attempting to invoke IFRS resolution on a GovCon customer — expected outcome: rejection with `escalation-audit`.

### 3.3 Regulatory Disclosures (GovCon-Specific — New Handles Required)

These are the new citation handles to register through LOCK-42.7A.5 change-mgmt during GC-1:

| Handle | Source | URL Stub (final URLs in GovCon_FAR31_Sources.md / GovCon_CAS_Sources.md) |
|---|---|---|
| `FAR_PART_31` | acquisition.gov FAR Part 31 | acquisition.gov/far/part-31 |
| `FAR_31_201_2_ALLOWABILITY` | acquisition.gov FAR 31.201-2 | acquisition.gov/far/31.201-2 |
| `FAR_31_201_3_REASONABLENESS` | acquisition.gov FAR 31.201-3 | acquisition.gov/far/31.201-3 |
| `FAR_31_201_4_ALLOCABILITY` | acquisition.gov FAR 31.201-4 | acquisition.gov/far/31.201-4 |
| `FAR_31_201_6_UNALLOWABLE_ACCOUNTING` | acquisition.gov FAR 31.201-6 | acquisition.gov/far/31.201-6 |
| `FAR_31_205_FULL` | acquisition.gov FAR 31.205 (parent) | acquisition.gov/far/subpart-31.2 |
| `FAR_31_205_6_P_EXEC_COMP_CAP` | acquisition.gov FAR 31.205-6(p) | acquisition.gov/far/31.205-6 |
| `FAR_31_205_46_TRAVEL` | acquisition.gov FAR 31.205-46 | acquisition.gov/far/31.205-46 |
| `FAR_52_216_7_ALLOWABLE_COST_PAYMENT` | acquisition.gov FAR 52.216-7 | acquisition.gov/far/52.216-7 |
| `CAS_401_CONSISTENCY_ESTIMATING` | eCFR 48 CFR 9904.401 | ecfr.gov/.../9904.401 |
| `CAS_402_CONSISTENCY_ALLOCATING` | eCFR 48 CFR 9904.402 | ecfr.gov/.../9904.402 |
| `CAS_403_HOME_OFFICE` | eCFR 48 CFR 9904.403 | ecfr.gov/.../9904.403 |
| `CAS_405_UNALLOWABLE` | eCFR 48 CFR 9904.405 | ecfr.gov/.../9904.405 |
| `CAS_406_PERIOD` | eCFR 48 CFR 9904.406 | ecfr.gov/.../9904.406 |
| `CAS_410_GA_ALLOCATION` | eCFR 48 CFR 9904.410 | ecfr.gov/.../9904.410 |
| `CAS_418_DIRECT_INDIRECT` | eCFR 48 CFR 9904.418 | ecfr.gov/.../9904.418 |
| `CAS_420_IRAD_BP` | eCFR 48 CFR 9904.420 | ecfr.gov/.../9904.420 |
| `CASB_9903_201_APPLICABILITY` | eCFR 48 CFR 9903.201 | ecfr.gov/.../9903.201 |
| `CASB_9903_202_DISCLOSURE` | eCFR 48 CFR 9903.202 | ecfr.gov/.../9903.202 |
| `CASB_DS_1_FORM` | DCAA / CASB DS-1 | (final URL TBD in sources phase) |
| `DCAA_CAM_CURRENT` | dcaa.mil Contract Audit Manual | dcaa.mil/.../CAM |
| `DCAA_MAAR_6_LABOR` | DCAA MAAR 6 | dcaa.mil/.../MAAR |
| `DCAA_ICE_MODEL` | DCAA ICS / ICE template | dcaa.mil/.../ICE |
| `DCAA_SF_1408_PREAWARD` | DCAA SF 1408 | dcaa.mil/.../SF-1408 |
| `FAR_42_704_PBR` | acquisition.gov FAR 42.704 | acquisition.gov/far/42.704 |
| `FAR_42_705_FINAL_RATES` | acquisition.gov FAR 42.705 | acquisition.gov/far/42.705 |
| `OFPP_EXEC_COMP_CAP_FY` | OFPP annual exec comp cap memo | (final URL TBD in sources phase) |

**Estimated new handle count: ~25–30** (final count fixed in GovCon_Citation_Verification_Register.xlsx).

### 3.4 Benchmarks and Data Sources

Reasonableness defense (FAR 31.201-3) requires industry benchmark anchors. Primary sources targeted:

- **DCMA published reasonableness guidance** — defense contractor rate ranges
- **GAO contractor cost reports** — gao.gov audit reports referencing typical rate envelopes
- **DoD IG reports** — referencing observed indirect rate distributions
- **NDIA position papers** — where rate benchmarks have been published

Typical rate ranges (final values from sources phase — placeholder ranges from industry literature):

| Metric | Small Business Typical | Mid-Tier Typical | Large Defense Prime Typical |
|---|---|---|---|
| Fringe rate | 25–40% | 30–45% | 35–55% |
| Overhead (combined) | 20–60% | 40–90% | 60–130% |
| G&A rate (TCI base) | 8–15% | 12–22% | 15–28% |
| Wrap rate (loaded labor) | 1.8–2.4× | 2.2–2.8× | 2.6–3.5× |

**Note:** These are illustrative ranges to be replaced with primary-source citations in GovCon_Benchmarks_Sources.md.

---

## §4 — Rate Engine Panel Scope (Wave 2 GC-K-F Panel)

### 4.1 Indirect Rate Pool Taxonomy

| Pool | Typical Base | Allocation Basis | CAS Reference |
|---|---|---|---|
| Fringe | Direct + Indirect labor $ | Labor-cost proportional | CAS 418 |
| Overhead — Engineering | Engineering direct labor $ | Function-specific labor | CAS 418 |
| Overhead — Manufacturing | Manufacturing direct labor $ or direct labor hrs | Function-specific labor | CAS 418 |
| Overhead — Site/Field | Field labor $ | Off-site labor proportional | CAS 418 |
| Overhead — Material handling | Direct material $ | Material-throughput proportional | CAS 418 |
| Overhead — Subcontract handling | Direct subcontract $ | Subcontract-throughput proportional | CAS 418 |
| G&A — TCI base | Total Cost Input (everything below G&A) | All other costs | CAS 410 |
| G&A — Value-Added base | Total Cost Input minus material + subcontract pass-throughs | Labor-and-OH-intensive cost base | CAS 410 |
| G&A — Single-Element base | Direct labor $ only | Labor-only base (small contractors) | CAS 410 |

**G&A base method is locked at customer level.** Switching base methods requires CAS 401/402 consistency analysis + DCAA notification + potentially a Disclosure Statement update. K-J Trap 2 defends this.

### 4.2 Rate-State Machine (FPRA → PBR → Final Indirect → ICS)

```
   [Forward Pricing]
   FPRA or FPRR
        |
        v
   [Provisional Billing]   <-- annually re-submitted (FAR 42.704)
   PBR (interim billing rate)
        |
        v
   [Actual Year Incurred]
   ICS submitted within 6 months of FY end (FAR 52.216-7(d))
        |
        v
   [Final Indirect Rates]
   DCAA settlement (FAR 42.705)
        |
        v
   [Rate Adjustment]
   Refund or additional bill, true-up to provisional
```

**Trap defended at K-J Trap 4** — every transition between states emits `dcaa-rate-audit` evidence; rate calculations cannot proceed without a valid predecessor state.

### 4.3 KPI Definitions

| KPI Handle | Definition | Reasonableness Anchor |
|---|---|---|
| `gc.kpi.fringe_rate_pct` | Total fringe pool / total labor base | DCMA benchmark range by contractor size |
| `gc.kpi.overhead_rate_pct` | OH pool / OH base (per pool) | DCMA benchmark by function |
| `gc.kpi.ga_rate_pct` | G&A pool / G&A base | DCMA benchmark by base method |
| `gc.kpi.wrap_rate` | Fully loaded labor multiplier | Industry literature 1.8–3.5× |
| `gc.kpi.bid_to_actual_variance_pct` | (Actual rate − Bid rate) / Bid rate | CAS 401 estimating-vs-actual consistency |
| `gc.kpi.allowable_pct_of_total` | Allowable costs / Total costs | Higher = cleaner allowability discipline |
| `gc.kpi.unallowable_variance_yoy` | YoY change in unallowable bookings | Trend monitoring |
| `gc.kpi.timekeeping_conformity_pct` | Timecards meeting MAAR 6 criteria / Total timecards | Target ≥ 99% |
| `gc.kpi.ics_submission_lag_days` | Days from FY end to ICS submission | Cap 180 days (FAR 52.216-7(d)) |
| `gc.kpi.cas_disclosure_drift_count` | Number of practice changes not yet disclosed | Target 0 |

---

## §5 — The 10+ Cross-Blend Traps (K-J Defenses)

### Trap 1 — FAR 31.205 Unallowable Cost Misclassification

**Pattern:** An unallowable cost (entertainment, lobbying, alcohol, fines, etc.) is booked to an allowable cost element.

**Defense:** K-H structural enforcement of full FAR 31.205-1 through 31.205-52 enumeration. Every unallowable category gets a rejection path with `dcaa-rate-audit` + `escalation-audit` emission. Citation: `FAR_31_205_<subsection>`.

### Trap 2 — G&A Base Method Drift (CAS 401/402)

**Pattern:** Customer's G&A base method (TCI / Value-Added / Single-Element) silently changes mid-year, causing inconsistent allocation.

**Defense:** G&A base method locked at customer profile level. Any drift attempt rejected with `CAS_401_CONSISTENCY_ESTIMATING` violation + `dcaa-rate-audit` emission. Required: Disclosure Statement update + DCAA notification before method change.

### Trap 3 — Directly-Associated Unallowables (FAR 31.201-6)

**Pattern:** A meal at an unallowable entertainment event is booked as allowable travel. The entertainment is rejected but the directly-associated meal is missed.

**Defense:** K-H "directly-associated" propagator — any cost flagged unallowable propagates unallowability to all costs in the same cost objective tied to the unallowable activity. Citation: `FAR_31_201_6_UNALLOWABLE_ACCOUNTING`.

### Trap 4 — Rate-Chain Reconciliation Spoof

**Pattern:** Final Indirect Rates submitted without a valid FPRA/FPRR or PBR predecessor, OR ICS lacks reconciliation to provisional billing.

**Defense:** K-H rate-state-machine enforcement. Every rate-state transition emits `dcaa-rate-audit` evidence. Missing predecessor → rejection + `escalation-audit`.

### Trap 5 — CAS Threshold Crossing ($50M Cumulative)

**Pattern:** Contractor crosses the $50M CAS-coverage threshold mid-year but continues operating as Non-CAS sub-segment.

**Defense:** K-G sub-segment router checks `cumulativeAwardsLast12Months >= 50_000_000` at every contract intake. Crossing the threshold auto-promotes the customer to sub-segment C and emits `escalation-audit` requiring CAS Disclosure Statement (DS-1) submission within prescribed window.

### Trap 6 — Executive Compensation Cap (FAR 31.205-6(p))

**Pattern:** Executive compensation above the annually-adjusted OFPP cap is booked as fully allowable.

**Defense:** K-H exec-comp-cap enforcement against current-FY OFPP cap (e.g., FY 2026 value from `OFPP_EXEC_COMP_CAP_FY`). Excess above cap rejected as unallowable with `dcaa-rate-audit` + `escalation-audit`.

### Trap 7 — DCAA MAAR 6 Timekeeping Integrity

**Pattern:** Timecards lack daily entry, contemporaneous capture, supervisor approval, or electronic-system controls. T sub-segment particularly exposed.

**Defense:** K-H structural timekeeping conformity check — every labor entry must meet MAAR 6 criteria (daily, contemporaneous, supervisor-approved, electronic-system-controlled). Non-conforming entries flagged with `dcaa-rate-audit` emission.

### Trap 8 — IR&D / B&P Cost Ceiling (CAS 420)

**Pattern:** Independent R&D or Bid & Proposal costs allocated as Direct project costs to circumvent CAS 420 indirect-allocation requirement.

**Defense:** K-J IR&D/B&P classifier — costs matching IR&D/B&P patterns rejected from direct allocation. Citation: `CAS_420_IRAD_BP`.

### Trap 9 — Contract Type Mix Misapplication

**Pattern:** Cost principles applied to an FFP contract as if it were cost-reimbursable, or vice versa.

**Defense:** K-G contract-type tagging at contract intake. Cost-principle enforcement scope depends on contract type. FFP contracts get estimating-focused enforcement; cost-reimbursable contracts get full FAR 31 + DCAA audit-trail enforcement.

### Trap 10 — IFRS Resolution Attempt on GovCon Customer

**Pattern:** A non-GovCon-aware module invokes IFRS standards resolution for a GovCon customer.

**Defense:** K-F framework-scoped-memory dimension set to `US_GAAP_ONLY` for all GC modules. Any IFRS handle resolution attempt rejected with `escalation-audit` + framework-mismatch reason code.

### Trap 11 — Subcontract Flow-Down Failure

**Pattern:** Required FAR/DFARS clauses (e.g., 52.216-7, 52.222-26 EEO, 52.219-9 small business subcontracting plan) are not flowed down to subcontractors, exposing prime contractor to compliance risk.

**Defense:** K-J subcontract clause-flowdown checker — known mandatory-flowdown clauses validated against subcontract execution metadata.

### Trap 12 — Cost Accounting Period Manipulation (CAS 406)

**Pattern:** Cost accounting period (typically fiscal year) silently changes to defer or accelerate cost recognition.

**Defense:** K-H CAS 406 period-lock — cost accounting period locked at customer profile level. Period change requires Disclosure Statement update.

---

## §6 — IFRS Divergence Section — NOT APPLICABLE

GovCon is the **first vertical with zero IFRS exposure**. All seven prior verticals (Generic, Healthcare, MFG, RTL, FA + planned Construction, Prof Services, SaaS, Nonprofit, IFRS-SME) have IFRS divergence sections. GovCon does not.

**Wave 2 K-V poison case:** "Resolve IFRS 15 revenue treatment for a GovCon customer's cost-reimbursable contract" → expected rejection with `framework-mismatch` reason code + `escalation-audit`.

---

## §7 — Phase 42 Lock + Spine Isolation + Overlay Prohibition

GovCon Wave 1 + Wave 2 are **net-new** under the `architecture-lane-refactor-baseline` branch. They do NOT modify any locked phase content. They consume:

- LOCK-41.5 (`88b4771`) — standards resolver, framework-scoped-memory, differences-catalog
- LOCK-42.7 (`fc0cb43`) — 5-channel audit framework (treatment-resolver-audit, memory-framework-dimension, escalation-audit, panel-decision-audit, org-edge-audit)
- HC-2 (`ee64120`) — `phi-access-audit` precedent (the 6th channel) — GovCon inherits the pattern for its own 7th channel `dcaa-rate-audit`
- LOCK-42.7A.5 (`2c8a5e5`) — REGISTRY_CHANGE_LOG change-management framework

**Overlay prohibition:** No GC code modifies existing healthcare, FA, MFG, RTL, or generic content. The only LOCK-41.5 surface change permitted is verification that `GOVCON_DCAA` is already in `IndustryHandle` (it is — see §0). No additive `types.ts` change needed.

---

## §8 — Reuse from MFG-K-0 / RTL-K-0 / FA-K-0 / HC-K-0

### 8.1 ReportingBasis Reuse

Reuse `ReportingBasis` enum from `lib/intelligence/synthetic/standards/resolver/types.ts`. GovCon adds **no new basis values** — US GAAP only.

### 8.2 basisOf() Reuse

Reuse `basisOf()` helper. For GovCon customers, always returns `US_GAAP`. The framework-scoped-memory dimension is set in the GC profile.

### 8.3 Audit Emitter Reuse

Reuse the LOCK-42.7 audit emitters (treatment-resolver-audit, memory-framework-dimension, escalation-audit, panel-decision-audit, org-edge-audit) plus the HC-2 precedent `phi-access-audit` emitter (won't fire on GovCon-only data, but stays wired). Add new `dcaa-rate-audit` emitter following the `phi-access-audit` structural pattern.

---

## §9 — Hard Rules (Binding for GC-1 and GC-2)

1. **No silent rejections** — every unallowable cost rejection emits `dcaa-rate-audit` + `escalation-audit`
2. **No degraded modes** — missing FAR/CAS rule binding fails the entire phase verifier
3. **No severity tiers** — DCAA-audit-ready posture is binary: pass or fail
4. **US GAAP only** — IFRS resolution attempts on GovCon customers are rejected
5. **Sub-segment isolation** — sub-segments are isolation boundaries within customer
6. **G&A base method locked at customer level** — drift requires Disclosure Statement update
7. **Cost accounting period locked at customer level** — change requires Disclosure Statement update
8. **CAS threshold checked at every contract intake** — $50M cumulative triggers auto-promotion to sub-segment C
9. **Exec comp cap enforced against current-FY OFPP value** — annual refresh required
10. **MAAR 6 timekeeping conformity required for all labor entries** — non-conforming entries flagged
11. **Builder never authors content** — all FAR/CAS rules sourced from primary government URLs registered through LOCK-42.7A.5
12. **Founder attestation required at LOCK** — `mwiseman@advisacor.com` signs both LOCK-GC-1 and LOCK-GC-2 attestation files

---

## §10 — Anti-Patterns (Forbidden in GC-1 and GC-2)

1. ❌ Hard-coded FAR/CAS rule text inline — all rules cite primary-source URLs through registered handles
2. ❌ Silent unallowable-cost reclassification — every reclassification emits audit evidence
3. ❌ IFRS resolution path on GovCon customer — must reject
4. ❌ Sub-segment routing based on customer name string-match — must be metadata-driven (CAS-coverage flag, contract-type mix, SBA size status)
5. ❌ Rate calculation without predecessor state — must reject if no FPRA/FPRR/PBR present
6. ❌ Exec comp cap from prior FY — must use current-FY OFPP value
7. ❌ Timecards bypassing MAAR 6 conformity check
8. ❌ G&A base method silently changing
9. ❌ Cost accounting period silently changing
10. ❌ Direct allocation of IR&D/B&P costs
11. ❌ Severity tier or "warning only" rejection — must be hard reject
12. ❌ Wave 1 content under Wave 2 namespace OR Wave 2 content under Wave 1 namespace — clean separation

---

## §11 — Wave 1 Deliverables Checklist (LOCK-GC-1)

### Knowledge Spine (Workspace)
- ☐ `GovCon_DCAA_Vertical_Planning_Doc.md` (this document)
- ☐ `GovCon_FAR31_Sources.md` (full FAR Part 31 with acquisition.gov URLs)
- ☐ `GovCon_CAS_Sources.md` (CAS 401–420 with eCFR URLs)
- ☐ `GovCon_DCAA_Sources.md` (CAM, MAARs, DCAA audit posture)
- ☐ `GovCon_Disclosures_Sources.md` (ICS/ICE, FPRA/FPRR, PBR, DS-1/DS-2, SF 1408)
- ☐ `GovCon_Benchmarks_Sources.md` (industry rate ranges)
- ☐ `GovCon_FAR31_Rule_Library.md` (enumerated unallowable list with rejection reason codes)
- ☐ `GovCon_CAS_Standards_Library.md` (8 CAS standards' enforcement rules)
- ☐ `GovCon_Indirect_Rate_Pool_Taxonomy.md` (pool/base/allocation taxonomy)
- ☐ `GovCon_Citation_Verification_Register.xlsx` (handle → URL → last-verified)
- ☐ `Phase_GC_1_Recon_Spec.md` (Wave 1 build spec)

### Sub-Segment Modules (Repo)
- ☐ `lib/intelligence/synthetic/industry/libraries/govcon/sub-segments/` with C/N/S/R/F/T definitions
- ☐ `lib/intelligence/synthetic/industry-profiles/govcon/profile.ts`

### Accounting Standards Layer (Repo)
- ☐ `lib/intelligence/synthetic/industry/libraries/govcon/far-31/` — FAR Part 31 rule library
- ☐ `lib/intelligence/synthetic/industry/libraries/govcon/cas/` — CAS 401–420 standards library
- ☐ `lib/intelligence/synthetic/industry/libraries/govcon/dcaa/` — DCAA CAM / MAAR rule references

### KPI Layer (Repo)
- ☐ `lib/intelligence/synthetic/industry/kpi/govcon-rates/` — indirect rate KPIs (10 defined in §4.3)
- ☐ `lib/intelligence/synthetic/industry/kpi/govcon-compliance/` — compliance KPIs

### Reporting / Disclosure Schema (Repo)
- ☐ `lib/intelligence/synthetic/industry/disclosure-variants/govcon/ics/` — ICS Schedules A–O
- ☐ `lib/intelligence/synthetic/industry/disclosure-variants/govcon/fpra/` — FPRA proposal format
- ☐ `lib/intelligence/synthetic/industry/disclosure-variants/govcon/pbr/` — PBR submission
- ☐ `lib/intelligence/synthetic/industry/disclosure-variants/govcon/ds-1/` — DS-1 Disclosure Statement schema

### Reasonableness Layer (Repo)
- ☐ `lib/intelligence/synthetic/industry/reasonableness/govcon/` — rate-range benchmarks for FAR 31.201-3 defense

### Verifier (Repo)
- ☐ `scripts/verify-gc-wave-1.js` — Wave 1 verifier, floor ~25 cases, target overdelivery
- ☐ `evidence/gc-wave-1-d0.json` — D0 evidence, `evidenceVersion=GC.1.K-LOCK.0`
- ☐ `GC_WAVE_1_ATTESTATION.md` — founder attestation

### Registry (Repo)
- ☐ `architecture-lane/registries/REGISTRY_CHANGE_LOG.md` — GC.1.K-LOCK entry + new citation handles registered

---

## §12 — Wave 2 Preview: GC-K-0 → GC-K-LOCK Gate Chain

### GC-K-0 — Industry Kernel + Isolation Contract
- Isolation contract assertions (no cross-customer GovCon data leak)
- Sub-segment router (C/N/S/R/F/T)
- Framework binding (US GAAP only — IFRS blocked)
- GovCon classifier (denylist + fail-closed for unallowable-cost evasion patterns)
- Error factories (CmsCostReportViolation analog: `CasDisclosureViolation`, `ExecCompCapViolation`, etc.)

### GC-K-F — Framework-Aware Capabilities
- Wrapper pattern over Wave 1 library content
- Capability resolution through LOCK-41.5 treatment-resolver
- Always US GAAP (IFRS resolution attempts rejected)

### GC-K-G — Sub-Segment Governance (C/N/S/R/F/T)
- Applicability matrix enforcement (§2.2)
- Sub-segment union for multi-exposure customers
- CAS threshold auto-promotion (Trap 5 wired here)

### GC-K-H — Regulatory Controls (FAR 31 + CAS + Exec Comp + Timekeeping)
- FAR 31.205-1 through 31.205-52 structural enforcement
- CAS 401/402/403/405/406/410/418/420 enforcement
- Exec comp cap (FAR 31.205-6(p)) against current-FY OFPP value
- MAAR 6 timekeeping conformity
- Directly-associated unallowables propagator (FAR 31.201-6)

### GC-K-I — Integration (7 Audit Channels)
- 6 channels from HC-2 (treatment-resolver-audit, memory-framework-dimension, escalation-audit, panel-decision-audit, org-edge-audit, phi-access-audit)
- **NEW 7th channel: `dcaa-rate-audit`** — every rate calculation + allowability determination emits structured evidence

### GC-K-J — Cross-Blend Trap Defenses
- 12 traps wired (§5)
- Each trap emits both vertical-specific (dcaa-rate-audit) and cross-cutting (escalation-audit) evidence on detection

### GC-K-V — Verifier Red-Team
- **25+ poison cases** (strong-build mandate):
  - 8 unallowable-cost evasion
  - 4 G&A base spoof
  - 3 rate-chain reconciliation spoof
  - 3 CAS threshold spoof
  - 3 timekeeping spoof
  - 2 exec-comp-cap spoof
  - 2 audit-bypass
- Every rejection emits `dcaa-rate-audit` + `escalation-audit`
- Floor 40 cases (LOCK-42.7G shape); target **≥ +97% overdelivery** (match HC-2 new-high)

### GC-K-LOCK — D0 + Attestation + Registry + Tag
- D0 evidence `evidence/gc-wave-2-d0.json`, `evidenceVersion=GC.2.K-LOCK.0`
- `GC_WAVE_2_ATTESTATION.md` — founder attestation
- REGISTRY_CHANGE_LOG entry — `phaseId: GC.2.K-LOCK`, `changeType: industry_vertical_lock`
- Annotated tag `LOCK-GC-2` at K-LOCK commit (FA-2/HC-2 parity)
- SHA-fill follow-up

### Wave 2 Gate Conditions
- Wave 1 LOCKED at `LOCK-GC-1` (precondition)
- All §1.4 scope items implemented
- Verifier 40+ cases PASS
- D0 evidence valid (6-key + 5-key shape)
- Founder attestation signed
- REGISTRY_CHANGE_LOG entry committed

---

## §13 — Execution Sequence Summary

```
Workspace Sources Phase (this session + next)
  ↓
Phase_GC_1_Recon_Spec.md draft + §15 founder questions
  ↓
Founder reviews GC-1 §15 → decisions locked
  ↓
Cursor lands LOCK-GC-1 (3-commit chain: Build / Red-team / LOCK)
  ↓ + SHA-fill + tag LOCK-GC-1
Atlas roll v1.5 → v1.6 (records LOCK-GC-1)
  ↓
Phase_GC_2_Build_Spec.md draft + §15 founder questions
  ↓
Founder reviews GC-2 §15 → decisions locked
  ↓
Cursor lands LOCK-GC-2 (3-commit chain: Build / Red-team / LOCK)
  ↓ + SHA-fill + tag LOCK-GC-2
Atlas roll v1.6 → v1.7 (records LOCK-GC-2)
  ↓
GovCon/DCAA vertical complete — next vertical = Construction
```

---

## §14 — Change Log

| Version | Date | Author | Notes |
|---|---|---|---|
| v1.0 | 2026-06-25 | Perplexity Computer | Initial planning doc. Path A confirmed (full Wave 1 then Wave 2, MFG/RTL precedent). 6 sub-segments (C/N/S/R/F/T) locked. 7 audit channels (HC-2's 6 + new `dcaa-rate-audit`). 12 cross-blend traps enumerated. New doctrine binding `containsGovernmentContractData: true` introduced. ~25–30 new citation handles to register. Strong-build mandate: ≥ +97% Wave 2 overdelivery. IFRS not applicable (first such vertical). US GAAP only via LOCK-41.5 framework-scoped-memory `US_GAAP_ONLY` dimension. |

---

**End of GovCon/DCAA Vertical Planning Doc.**

**Ready for sources phase — research subagent gathering primary URLs in parallel.**
