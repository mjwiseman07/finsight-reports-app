Manufacturing Vertical Knowledge Stack — Planning Document (v0.1 DRAFT)

DRAFT / SPEC — NOT EXECUTABLE — NOT LOCKED

Industry Intelligence Library — Manufacturing (Discrete, Process, Hybrid)
Feeds the Command Center "Manufacturing Variances" Panel + Full Manufacturing KPI Surface

Document Owner: Matthew Wiseman
Company: Wiseman Financial Technologies LLC
Product: Advisacor
Phase Lane: Knowledge-Stack Roadmap — Manufacturing vertical (analog to Phase 42 healthcare knowledge stack)
Status: PLANNING — Ready for Review. NOT a light phase. NOT executable. NOT a lock.
Depends On: Phase 40 locked; Phase 40.5 locked; Phase 41.5 locked; Phase 42 LOCKED (b11adcd, healthcare knowledge stack reference); Phase 42.5 closed at 5e5bf14 (universal control spine + HIPAA overlay)
Blocks: Manufacturing customer onboarding into the Command Center until the variance panel feed contract is implemented and proved
Related: [PHASE_42_5_v1_10.md](PHASE_42_5_v1_10.md) (control-spine reference); Healthcare knowledge-stack template ([Healthcare_KPIs_42N1_Sources.md](Healthcare_KPIs_42N1_Sources.md), [ASC606_Healthcare_Sources.md](ASC606_Healthcare_Sources.md), [Healthcare_Disclosures_42O_Sources.md](Healthcare_Disclosures_42O_Sources.md), [Healthcare_Benchmarks_42P_Sources.md](Healthcare_Benchmarks_42P_Sources.md))
Date: June 22, 2026
Namespace (target): lib/intelligence/synthetic/industry/manufacturing/, ops/compliance/overlays/manufacturing/ (overlay only if/when regulated sub-sector requires; default no overlay)
Verifier (target): scripts/verify-manufacturing-knowledge-stack.js
Variance Panel Contract (target): lib/dashboard/panels/manufacturing-variance/

containsVerticalComplianceLogic: true (knowledge-stack content; vertical-specific by design)
executable: false (planning doc only)
overlayRequired: false (default; see Sub-Segment Overlay Notes below)

---

The One Distinction That Governs This Doc (Restated From 42.5)

CONTROL LAYER (Phase 42.5, closed at 5e5bf14): security + compliance. Isolation, RBAC, audit, encryption, key management, authentication. VERTICAL-AGNOSTIC. One spine, all verticals, identical. Plus pluggable compliance overlays per regulated vertical (HIPAA built; PCI-DSS spec-only).

KNOWLEDGE STACK (this document, manufacturing vertical): industry intelligence — operating definitions, KPIs, variance analysis, cost accounting, revenue recognition, disclosures, benchmarks specific to manufacturing. Vertical-by-design. Modeled on the Phase 42 healthcare knowledge stack and the four healthcare source docs.

This planning document builds the MANUFACTURING knowledge stack. It does NOT modify the universal control spine. It does NOT modify the HIPAA overlay. It does NOT build a new compliance overlay (manufacturing has no analog of HIPAA at the federal U.S. level; sub-sector regulations like FDA-21-CFR-Part-11 for pharma and ITAR for defense are noted in Sub-Segment Overlay Notes but are out of scope here).

---

Command Center Relationship — Manufacturing Variance Panel (BINDING)

(THIS SECTION IS THE PRIMARY DELIVERABLE WIRING. Read first.)

The command center surfaces an industry-specific "Manufacturing Variances" panel for manufacturing customers (founder-confirmed dashboard panel). Per the standing invariant from 42.5 (lines 156–168 of PHASE_42_5_v1_10.md):

- PANEL SELECTION (which panels exist): driven by INDUSTRY CONFIGURATION, not by access. If the customer's industry classification is "manufacturing" (or any manufacturing sub-segment), the Manufacturing Variances panel exists.
- PANEL DATA (what fills the panel): ALWAYS flows through the control spine (tenant isolation + RBAC/persona). No exceptions. Frame is config; contents are control-gated.
- ISOLATION-PROOF REQUIREMENT: this knowledge stack's D0-equivalent proof MUST include the Manufacturing Variances panel data paths. Prove the rendered panel respects tenant/persona boundaries — do not assert.

The Manufacturing Variances panel surfaces the SEVEN STANDARD COST ACCOUNTING VARIANCES plus a derived total. Every field on the panel maps to a KPI defined in [Manufacturing_KPIs_Sources.md](Manufacturing_KPIs_Sources.md) (Section II — Cost Accounting / Variance KPIs). The panel contract:

| Panel Field | Variance Type | Formula (Standard) | Source KPI | Tenant-Scoped? |
|---|---|---|---|---|
| Direct Materials Price Variance | Material price | (Actual Price − Standard Price) × Actual Quantity Purchased | KPI MFG-V-01 | Yes |
| Direct Materials Usage Variance | Material quantity | (Actual Quantity Used − Standard Quantity Allowed) × Standard Price | KPI MFG-V-02 | Yes |
| Direct Labor Rate Variance | Labor rate | (Actual Rate − Standard Rate) × Actual Hours Worked | KPI MFG-V-03 | Yes |
| Direct Labor Efficiency Variance | Labor efficiency | (Actual Hours − Standard Hours Allowed) × Standard Rate | KPI MFG-V-04 | Yes |
| Variable Overhead Spending Variance | VOH spending | (Actual VOH Rate − Standard VOH Rate) × Actual Hours | KPI MFG-V-05 | Yes |
| Variable Overhead Efficiency Variance | VOH efficiency | (Actual Hours − Standard Hours Allowed) × Standard VOH Rate | KPI MFG-V-06 | Yes |
| Fixed Overhead Spending (Budget) Variance | FOH spending | Actual Fixed Overhead − Budgeted Fixed Overhead | KPI MFG-V-07a | Yes |
| Fixed Overhead Volume Variance | FOH volume | Budgeted FOH − (Standard FOH Rate × Standard Hours Allowed for Actual Output) | KPI MFG-V-07b | Yes |
| Total Manufacturing Cost Variance | Sum | Σ of all above (favorable negative, unfavorable positive) | KPI MFG-V-08 | Yes |

Every variance value displayed in the panel MUST originate from a KPI evaluator in lib/intelligence/synthetic/industry/manufacturing/variance/ that accepts (tenantId, accountingPeriod) and returns the numeric variance + the inputs that produced it. The evaluator MUST refuse to return cross-tenant data (spine isolation; verified by the existing D0 spine probe applied to the manufacturing panel data path). The evaluator MUST be a pure read; no writes from the panel path.

Drill-down (per panel field): tapping a variance row must surface (a) the standard inputs (standard price/rate, standard quantity/hours allowed), (b) the actual inputs (actual price/rate, actual quantity/hours), (c) the production volume for the period, (d) the journal entries/cost records that aggregated into the actuals — all spine-gated. Drill-down is in scope for this knowledge stack; the data contract is defined in the variance evaluator module.

NPV/forecast variance (optional, Wave 3): forward-looking variance projections (next-period forecast vs. standard) are deferred to a later wave; the panel ships with realized variances only.

---

Manufacturing Sub-Segment Coverage (BINDING — FULL DEPTH)

Per founder direction: full coverage across all manufacturing sub-segments. The knowledge stack treats manufacturing as one vertical with sub-segment applicability matrices on each KPI / disclosure / benchmark — analogous to the Healthcare provider-sub-type matrix (H/A/S/P/HH).

**Manufacturing Sub-Type Key (proposed; founder review):**

- **D** = Discrete Manufacturing (assembled products: machinery, electronics, automotive, aerospace, durable goods, appliances)
- **P** = Process Manufacturing (continuous/batch: chemicals, food & beverage, pharmaceuticals, refining, pulp & paper, basic metals)
- **H** = Hybrid / Mixed-Mode Manufacturing (combines discrete assembly + process inputs; e.g., consumer packaged goods, medical devices, specialty foods with packaging lines)
- **J** = Job-Shop / Project Manufacturing (low volume, high variety, project-billed: custom machinery, contract metalwork, prototyping, MRO services)
- **E** = ETO / Engineer-to-Order (extreme low-volume, design-per-order: heavy equipment, custom industrial systems, ships, large infrastructure)

(Sub-segments will be confirmed via NAICS code mapping in Manufacturing_Disclosures_Sources.md Section IV.)

**Production strategy slice (orthogonal axis, applies across sub-types):**

- MTS — Make-to-Stock
- MTO — Make-to-Order
- ATO — Assemble-to-Order
- ETO — Engineer-to-Order (also a sub-type when dominant)

This second axis matters because it drives **revenue recognition timing** under ASC 606 (point-in-time vs over-time) and inventory accounting under ASC 330. KPI applicability must record both axes (sub-type + production strategy) where the metric is sensitive to either.

---

Sub-Segment Overlay Notes (OUT OF SCOPE for this knowledge stack — handed off)

Three manufacturing sub-sectors carry vertical-specific regulatory regimes that, if/when an Advisacor customer falls into them, would require a compliance overlay analogous to HIPAA. These are FLAGGED here but BUILT in a separate phase (Phase 42.7+ "Regulated Manufacturing Overlays" — not this lane):

1. **FDA-regulated manufacturing** (pharmaceuticals, medical devices, food per 21 CFR Part 11 — electronic records / electronic signatures). Overlay analog: pharma-21cfr11.
2. **ITAR / EAR defense manufacturing** (export-controlled aerospace, defense). Overlay analog: defense-itar.
3. **DOT / chemical reporting** (TSCA inventory, Section 313 toxic release). Overlay analog: chemical-tsca-313.

For the v0.1 knowledge stack: customers in these sub-sectors are served by the universal control spine (full encryption, isolation, RBAC, audit) but the regulatory overlay code is not yet built. Onboarding into these sub-sectors requires a written hand-off note in the customer record until the overlay phase delivers.

---

Scope Boundaries (READ FIRST — REDLINE EXPECTED)

THIS IS NOT A LIGHT PHASE. It builds and PROVES real industry-intelligence content with citation discipline matched to the Phase 42 healthcare standard. Every KPI is primary-source cited (IMA, AICPA, NACM, APICS/ASCM, FASB, ISM, IndustryWeek, U.S. Census Bureau Manufacturing data, Federal Reserve G.17, BLS Producer Price Index). No secondary-only definitions for variance, inventory, or cost accounting metrics.

KNOWLEDGE-STACK (this phase): KPIs, variance formulas, cost-accounting standards, ASC 330 inventory, ASC 606 revenue recognition for manufacturing, ASC 842 leases for manufacturing facilities/equipment, supply-chain disclosures, MD&A operating metrics, benchmarks by sub-segment and NAICS code, and the Manufacturing Variances panel data contract.

NOT IN SCOPE (this phase): the universal control spine (already built in 42.5); HIPAA or any other compliance overlay code; FDA/ITAR/TSCA overlays (Phase 42.7+); ERP integration code (manufacturing-specific ERP wiring is downstream of this knowledge stack); MRP/MRP-II logic (forward-planning algorithms — separate phase); shop-floor IoT integration; production scheduling.

Anything proposed mid-build that falls in NOT IN SCOPE is deferred.

---

Operating Posture (CARRIES FROM 42.5)

UNIFORM HIGH-GRADE SPINE. All manufacturing customers are served by the control spine at the same HIPAA + SOC 2 Type II grade as every other vertical. A manufacturer's data is well-protected non-PHI data — same protection floor as a healthcare provider's data on the spine, minus only the HIPAA legal regime (no PHI present).

NO MANUFACTURING-SPECIFIC OVERLAY for the default U.S. manufacturer. If/when an FDA/ITAR/TSCA customer arrives, the relevant overlay (Phase 42.7+) attaches; until then, the spine alone is the trust boundary.

EVIDENCE FROM DAY ONE. The same audit-logging + retention machinery that 42.5D and 42.5T stood up applies to manufacturing panel data paths. Every read of the Manufacturing Variances panel goes through spine isolation and is audit-logged.

---

Purpose

Phase 42 (locked b11adcd) made Advisacor industry-aware and built the healthcare knowledge stack as a worked example. This manufacturing knowledge stack does the same job for the manufacturing vertical: defines the industry-intelligence library (KPIs, variances, disclosures, benchmarks), wires the Manufacturing Variances panel to a verifiable data contract, and establishes the same citation/applicability discipline applied to healthcare. Without it, a manufacturing customer onboards onto the spine but has no industry intelligence behind the dashboard — the variance panel renders empty or with mocked data.

---

Goals

G1. Define the FULL manufacturing KPI surface (financial, operating, cost-accounting, supply-chain, quality, OEE) with citation discipline matched to Phase 42N1.

G2. Define the SEVEN STANDARD COST ACCOUNTING VARIANCES plus total, with formulas, inputs, applicability matrix, and a binding mapping to the Manufacturing Variances panel field-set. This is the panel contract.

G3. Define ASC 330 (Inventory) recognition, measurement, costing methods (FIFO / LIFO / weighted-average / specific-identification), lower-of-cost-or-NRV per ASU 2015-11, write-down irreversibility under U.S. GAAP, and disclosure requirements.

G4. Define ASC 606 application to manufacturing — long-term contract revenue recognition, input vs. output methods for over-time recognition, point-in-time recognition for standard MTS products, contract modifications, variable consideration in manufacturing contracts.

G5. Define ASC 842 (Leases) application to manufacturing — heavy equipment leases, manufacturing facility leases, embedded leases in supply contracts, right-of-use asset and lease liability disclosure.

G6. Provide industry benchmarks by sub-segment with primary sources (IndustryWeek, ISM, U.S. Census Annual Survey of Manufactures, Federal Reserve G.17 capacity utilization, BLS PPI, NACM credit metrics, APICS/ASCM inventory turns).

G7. Bind the Manufacturing Variances panel field-by-field to a KPI evaluator under lib/intelligence/synthetic/industry/manufacturing/variance/, with a verifier and a D0-equivalent isolation proof for the panel data path.

G8. Establish sub-segment overlay handoffs (FDA, ITAR, TSCA) without building those overlays — Phase 42.7+.

---

Exit Criteria

The manufacturing knowledge-stack lane is complete and lockable only when all are true:

- All four source documents authored with citation discipline matched to Phase 42N1/42O/42P: Manufacturing_KPIs_Sources.md, Manufacturing_ASC606_Sources.md, Manufacturing_Disclosures_Sources.md (ASC 330 + ASC 842 + supply-chain disclosures), Manufacturing_Benchmarks_Sources.md.

- Every Manufacturing Variances panel field is mapped 1-to-1 to a documented KPI with formula, inputs, sub-segment applicability, and citation.

- The variance evaluator module (lib/intelligence/synthetic/industry/manufacturing/variance/) is implemented, exports a typed contract, and is exercised by a verifier exit-0.

- A D0-equivalent isolation proof for the Manufacturing Variances panel data path is added to the existing D0 probe suite (probe must demonstrate cross-tenant denial on this panel's data feed; aligned with the standing invariant from 42.5 line 168).

- TypeScript clean across lib/intelligence/synthetic/industry/manufacturing/ and lib/dashboard/panels/manufacturing-variance/.

- Citation verification register (xlsx, analog to Healthcare_KPI_Citation_Verification_Register.xlsx) complete: every cited URL fetched, verified non-404, verified the cited text appears at the URL.

- Sub-segment applicability matrix complete on every KPI (D / P / H / J / E columns plus production-strategy notes).

- A "Carry-Forward" table for FDA-21-CFR-11, ITAR, TSCA hand-offs to Phase 42.7+ (analog to the 42.5AB carry-forward table for Phase 42.6 items).

LOCKING this lane requires real spine code (the variance evaluator) + D0 proof + the citation register + founder sign-off — same discipline as 42.5. Until then this is PLANNING / SOURCES / SPEC, not lock.

---

Non-Goals

Manufacturing knowledge stack does NOT include:

- Universal control-spine work (built in 42.5).
- Any new compliance overlay (FDA-21-CFR-11, ITAR, TSCA are Phase 42.7+).
- ERP integration code (downstream phase per Advisacor roadmap).
- Forward-looking MRP/MRP-II algorithms or production scheduling.
- Shop-floor IoT, sensor integration, or real-time OEE telemetry.
- Manufacturing-specific authentication or persona definitions (spine covers this).
- IFRS treatment of manufacturing inventory/contracts (IFRS source docs already exist; cross-reference only).
- Customer-acquisition or onboarding workflow for manufacturing prospects.
- Forecast variances (deferred to a later wave; v0.1 panel ships realized only).

---

Architectural Position

Same standing diagram as 42.5; this lane inserts at the Knowledge Stack layer for manufacturing:

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
-> Industry Intelligence (Phase 42 — healthcare knowledge stack)
-> Universal Control Spine + Compliance Overlays (Phase 42.5)
-> Industry Intelligence (Manufacturing knowledge stack — THIS LANE)  ──defines panels──▶  Command Center Manufacturing Variances Panel (consumer; panel selection = config, panel data = spine-gated)
-> Knowledge Stacks per additional vertical (Retail, Fund Accounting, Municipal, etc. — follow this template)
-> External Attestations & Engagements (Phase 42.6)

This lane owns the manufacturing industry-intelligence content and the panel data contract. It does NOT own the spine. It does NOT own the command-center layout selector (config, not spine).

Spine vs knowledge-stack (binding restate from 42.5):

| Layer | Scope | Tested |
|---|---|---|
| Control spine | All verticals, identical | Once, platform-wide (42.5, done) |
| Compliance overlay | Per regulated vertical (HIPAA done; manufacturing: none default) | Per overlay (n/a here) |
| Knowledge stack | Per vertical, by design | Per vertical — this lane proves manufacturing |

---

Module Order — Knowledge-Stack Build Sequence (Manufacturing)

This lane is smaller than Phase 42.5's 26-step build because the spine + overlay framework already exist. Estimated 11 modules in 3 waves. Module IDs prefixed MFG-K (Manufacturing Knowledge).

**Wave 1 — Source documentation (PLANNING / SOURCES; no code)**

- **MFG-K-A — KPI Library.** Author Manufacturing_KPIs_Sources.md covering Financial / Revenue Cycle, Cost Accounting / Variances, Operations / OEE, Supply-Chain / Inventory, Quality, Labor / Workforce. Use the Phase 42N1 six-field structure per KPI: (1) Definition, (2) Formula, (3) Data Source, (4) Sub-Type Applicability matrix (D/P/H/J/E), (5) Standard vs. Variable, (6) Authoritative Citation. Minimum citations: IMA (cost accounting), APICS/ASCM (inventory/operations), AICPA (cost accounting standards), Federal Reserve G.17 (capacity utilization), BLS PPI, U.S. Census Annual Survey of Manufactures, IndustryWeek benchmarks, NACM credit metrics. Variance KPIs MFG-V-01 through MFG-V-08 land here and bind to the panel.

- **MFG-K-B — ASC 606 Revenue Recognition for Manufacturing.** Author Manufacturing_ASC606_Sources.md. Cover the 5-step model as applied to: point-in-time recognition (standard MTS products); over-time recognition (long-term contracts under input or output methods); the input-method bias for cost-to-cost percentage-of-completion in heavy/custom manufacturing; contract modifications; variable consideration (rebates, returns, warranties); allocation of transaction price across multiple performance obligations (product + installation + extended warranty + training). Primary sources: FASB Codification ASC 606 (DART Deloitte), Grant Thornton industrial revenue recognition guide, RSM US Industrial sector guide, KPMG manufacturing revenue handbook.

- **MFG-K-C — ASC 330 Inventory + ASC 842 Leases + Supply-Chain Disclosures.** Author Manufacturing_Disclosures_Sources.md. Three sections: (i) ASC 330 inventory measurement (FIFO/LIFO/weighted-average/specific-identification), lower of cost or NRV per ASU 2015-11, irreversibility of write-downs under U.S. GAAP, required disclosure of inventory method + carrying amount by category + LIFO reserve where applicable; (ii) ASC 842 lease classification and disclosure for manufacturing-specific lease patterns (heavy equipment, plant leases, embedded leases in supply contracts); (iii) supply-chain disclosure analog — SEC Reg S-K Item 101 (description of business), Item 303 MD&A operating-metric disclosure, conflict-minerals where applicable, climate-disclosure crosswalk to the extent finalized at filing date. Primary sources: FASB DART, KPMG Inventory Handbook, KPMG Leases Handbook, SEC Reg S-K.

- **MFG-K-C2 — Manufacturing IFRS Sources (NEW; resolved Q5).** Author Manufacturing_IFRS_Sources.md as a peer document to MFG-K-B and MFG-K-C. Coverage: IAS 2 Inventory (LIFO prohibited; lower of cost and NRV; write-down REVERSAL permitted — material divergence from ASC 330); IAS 16 Property, Plant and Equipment (manufacturing facilities, machinery, componentization, depreciation methods); IFRS 15 Revenue from Contracts with Customers (converged with ASC 606 with manufacturing-specific application differences); IFRS 16 Leases (single on-balance-sheet model for lessees; differs from ASC 842 dual operating/finance classification). Same six-field structure + sub-segment applicability matrix. Primary sources: IFRS Foundation official standards, IFRS Foundation Educational Material, EY IFRS handbook, KPMG IFRS handbook, Deloitte IAS Plus. The verifier (MFG-K-I) MUST check that any tenant electing IFRS reporting basis has its panel/variance evaluators routing through IFRS-aware logic where the standards diverge (inventory write-down reversal, lease classification, LIFO absence).

- **MFG-K-D — Industry Benchmarks.** Author Manufacturing_Benchmarks_Sources.md. Provide benchmarks for the headline KPIs by sub-segment with primary-source citations: OEE (60–65% avg / 85%+ world-class), Inventory Turns (4–6× avg / 10–12× top quartile), First-Pass Yield (95%+), Defect Rate (<50 PPM), Scrap Rate (<2% of material cost), Total Manufacturing Cost (<65% of revenue), Gross Margin (~32% industry average), Capacity Utilization (75–85% target; Federal Reserve G.17 manufacturing average 75.7% May 2026 — 2.5 pp below 1972–2025 long-run average). Cite Federal Reserve G.17 directly; cross-cite IndustryWeek and Oracle NetSuite KPI benchmarks. Note that benchmarks for emerging sub-segments (additive manufacturing, micro-factories) are sparse and flag accordingly.

- **MFG-K-E — Citation Verification Register.** Build Manufacturing_KPI_Citation_Verification_Register.xlsx, analog to Healthcare_KPI_Citation_Verification_Register. Columns: KPI ID, Cited Source, Cited URL, URL Status (200/redirect/404), Cited Text Found Verbatim Y/N, Verification Date, Verifier Initials. Fail-closed: any 404 or unverified citation blocks lock.

**Wave 2 — Panel data contract + variance evaluator (CODE; spec-driven build per restored discipline)**

- **MFG-K-F — Panel Field Contract (spec).** Write MFG_K_F_Panel_Field_Contract_Spec.md defining the typed contract for the Manufacturing Variances panel — exact field names, units (USD with sign convention F=favorable negative / U=unfavorable positive), the (tenantId, accountingPeriod) read signature, the drill-down sub-contract, the error envelope. The contract sits at lib/dashboard/panels/manufacturing-variance/contract.ts (interface only — `executable: false`, `containsVerticalComplianceLogic: false` because the contract is shape-only; actual variance math lives in the evaluator).

- **MFG-K-G — Variance Evaluator (spec then build).** Write MFG_K_G_Variance_Evaluator_Spec.md, then Cursor builds the evaluator at lib/intelligence/synthetic/industry/manufacturing/variance/. The evaluator implements the eight variance formulas (MFG-V-01 through MFG-V-07b plus MFG-V-08 total). Pure functions; inputs are (standard inventory of inputs, actual inventory of inputs, production volume) per period per tenant. No writes. Returns the panel contract shape.

- **MFG-K-H — Spine Composition (spec then build).** Write MFG_K_H_Spine_Composition_Spec.md, then Cursor builds the binding that puts the variance evaluator behind the spine isolation check. Composition only — no reimplementation of spine logic. The binding calls into the existing spine isolation evaluator (exported from 42.5B per v1.7.3 export-first wiring), refuses on cross-tenant or unauthorized persona, and on permit returns the evaluator output.

- **MFG-K-I — Verifier.** Build scripts/verify-manufacturing-knowledge-stack.js. Checks: (a) every panel field in the contract has a matching KPI ID in Manufacturing_KPIs_Sources.md; (b) every variance formula in the evaluator matches the formula text in the KPI source doc verbatim (string-equality on the formula expression after whitespace normalization); (c) every cited URL in the source docs has a row in the verification register with status=200 and cited-text-found=Y; (d) sub-segment applicability matrix is filled (no blank cells) for every KPI; (e) no FDA / ITAR / TSCA overlay code is present (this lane MUST NOT build those — overlay-absence check); (f) the spine composition module imports from the spine, not from any overlay. Exit 0 = pass; non-zero = fail with a numbered CHK.

**Wave 3 — D0 panel isolation proof (PROOF; non-negotiable)**

- **MFG-K-J — D0 Panel Probe.** Extend the existing D0 probe (scripts/probe-ops-control-spine.js, established in Phase 42.5) with manufacturing-panel poison cases: PC-MFG-01 cross-firm-tenant leak on variance read; PC-MFG-02 staff-persona without manufacturing scope reads the panel; PC-MFG-03 client-side persona attempts firm-internal variance read; PC-MFG-04 unbounded period query (must be denied or bounded); PC-MFG-05 drill-down attempts to enumerate cross-tenant journal entries. The probe consumes ONLY exported helpers (no reimplementation of spine logic) — same discipline as 42.5O PC-01..PC-20.

- **MFG-K-K — Founder Sign-off + Knowledge-Stack Close.** Three-commit signature chain analog to LOCK-42.5.1 (Commit 1 placeholder; Commit 2 founder signature with name + role + date; Commit 3 backfill with the founder's commit hash and GPG state). Founder-only commit. Closes the manufacturing knowledge-stack lane.

Estimated commits: 11–14 (one per module; some modules may take more than one commit per the 42.5Y amendment pattern).

---

Wave Summary

- **Wave 1 (MFG-K-A through MFG-K-E, including MFG-K-C2):** Source documentation + citation register, both U.S. GAAP and IFRS. Foundation. No code.
- **Wave 2 (MFG-K-F through MFG-K-I):** Panel contract + variance evaluator + spine composition + verifier. Code.
- **Wave 3 (MFG-K-J through MFG-K-K):** D0 panel probe + founder sign-off. Proof + lock.

---

Hard Rules (CARRY FROM 42.5; APPLY THROUGHOUT THIS LANE)

1. **Spec-driven build.** Agent writes a `MFG_K_<module>_Spec.md` document before Cursor builds. Cursor builds from the spec; never pattern-matches from the planning doc alone.

2. **Pre-commit verification gate.** Before pushing any commit in this lane: run the existing Phase 42 industry regression verifier (must remain exit-0, 51/51 passing as of 5e5bf14) AND the new verify-manufacturing-knowledge-stack.js (must remain exit-0 once it exists). No push if either is red.

3. **DRAFT/SPEC banner verbatim** on every documentation file in this lane (this doc carries it; source docs and spec docs must too).

4. **`executable: false` + `containsVerticalComplianceLogic` annotation** on every TS file: contract interface files are `executable: false, containsVerticalComplianceLogic: false`; the variance evaluator and spine composition are `executable: true, containsVerticalComplianceLogic: true`.

5. **Deny-by-default / fail-closed.** Variance evaluator and spine composition return DENY on any unresolvable tenant or persona. Verifier exits non-zero on any unfilled applicability cell or unverified citation.

6. **Composition not reimplementation.** Spine composition calls the existing spine helpers exported by 42.5B (isolation), 42.5C (RBAC), 42.5P (panel-path helpers). It does NOT reimplement any spine logic.

7. **Additive only.** No edits to 42.5 source files. No edits to Phase 42 source files (locked at b11adcd). No re-numbering of existing CHKs. New CHKs introduced here are numbered CHK-MFG-001+ in a new namespace.

8. **No knowledge-stack content leaks into the spine.** The verifier checks (CHK-MFG-001) that no file under ops/control-spine/ or ops/compliance/ references lib/intelligence/synthetic/industry/manufacturing/. The arrow only goes one way: spine ← composition module ← evaluator → panel. Knowledge stack does NOT import into the spine.

9. **NAICS code mapping** required on every benchmark and sub-segment applicability claim. (U.S. Census NAICS 31–33 is manufacturing.)

10. **Citation discipline.** Every KPI MUST have a primary-source citation (not a secondary blog). Secondary citations are allowed only as cross-references. The verification register confirms URL liveness + cited-text presence.

---

Variance Panel Contract — Detail (FIELD LIST)

This is the canonical field list. The contract module will mirror this exactly.

```
interface ManufacturingVariancePanel {
  // Identification
  tenantId: TenantId;            // spine-issued, never UI-supplied
  accountingPeriod: { year: number; period: number };  // typically a fiscal month

  // Material variances
  directMaterialsPriceVariance: SignedDollarAmount;    // MFG-V-01
  directMaterialsUsageVariance: SignedDollarAmount;    // MFG-V-02

  // Labor variances
  directLaborRateVariance: SignedDollarAmount;         // MFG-V-03
  directLaborEfficiencyVariance: SignedDollarAmount;   // MFG-V-04

  // Variable overhead variances
  variableOverheadSpendingVariance: SignedDollarAmount;    // MFG-V-05
  variableOverheadEfficiencyVariance: SignedDollarAmount;  // MFG-V-06

  // Fixed overhead variances
  fixedOverheadSpendingVariance: SignedDollarAmount;   // MFG-V-07a
  fixedOverheadVolumeVariance: SignedDollarAmount;     // MFG-V-07b

  // Total
  totalManufacturingCostVariance: SignedDollarAmount;  // MFG-V-08 = sum of all eight above

  // Metadata
  basisOfStandards: 'budgeted' | 'engineered' | 'historical-rolling';
  productionVolumeForPeriod: number;
  unitOfMeasure: 'unit' | 'lb' | 'kg' | 'gallon' | 'meter' | 'sqft' | string;

  // Reporting basis (resolved Q5)
  reportingBasis: 'US_GAAP' | 'IFRS';

  // Forecast variances (resolved Q6)
  forecastVarianceSection?: {
    forecastHorizon: { periodsAhead: number };
    forecastInputSource: 'sop' | 'demand-forecast' | 'sales-pipeline' | string;
    directMaterialsPriceVariance: SignedDollarAmount;       // MFG-FV-01
    directMaterialsUsageVariance: SignedDollarAmount;       // MFG-FV-02
    directLaborRateVariance: SignedDollarAmount;            // MFG-FV-03
    directLaborEfficiencyVariance: SignedDollarAmount;      // MFG-FV-04
    variableOverheadSpendingVariance: SignedDollarAmount;   // MFG-FV-05
    variableOverheadEfficiencyVariance: SignedDollarAmount; // MFG-FV-06
    fixedOverheadSpendingVariance: SignedDollarAmount;      // MFG-FV-07a
    fixedOverheadVolumeVariance: SignedDollarAmount;        // MFG-FV-07b
    totalManufacturingCostForecastVariance: SignedDollarAmount; // MFG-FV-08
  };
}
```

Sign convention: favorable variance is NEGATIVE (cost came in under standard), unfavorable is POSITIVE (cost came in over standard). This is the IMA / AICPA cost-accounting convention. The panel must surface a tag (F / U) next to each value to avoid misreading of sign.

Drill-down sub-contract (per field):

```
interface VarianceDrillDown {
  variance: SignedDollarAmount;
  standardInputs: { price?: number; rate?: number; quantity?: number; hours?: number };
  actualInputs:   { price?: number; rate?: number; quantity?: number; hours?: number };
  productionVolume: number;
  evidenceLinks: AuditLogReference[];  // spine-gated; tenant-scoped
}
```

---

Recommended First Implementation (when MFG-K work resumes)

1. Author Manufacturing_KPIs_Sources.md (MFG-K-A). Mirror the Healthcare_KPIs_42N1_Sources.md six-field structure. Variance KPIs MFG-V-01..V-08 are the critical bind to the panel — author those first within the document.

2. Author Manufacturing_ASC606_Sources.md (MFG-K-B). Mirror ASC606_Healthcare_Sources.md structure.

3. Author Manufacturing_Disclosures_Sources.md (MFG-K-C). Three-section structure: ASC 330 / ASC 842 / supply-chain Reg S-K.

4. Author Manufacturing_Benchmarks_Sources.md (MFG-K-D). NAICS-coded benchmark tables; Federal Reserve G.17 as primary capacity-utilization source.

5. Build the citation verification register (MFG-K-E).

6. Then move to Wave 2 spec-driven code.

---

Open Questions — RESOLVED (founder, 2026-06-22)

All seven open questions answered by founder on 2026-06-22. Resolutions are binding for the manufacturing knowledge-stack lane. Restated below for traceability.

**Q1 — Sub-segment scope at v1.0. RESOLVED: ALL FIVE sub-types (D / P / H / J / E) covered at v1.0.** No deferral. Every KPI, disclosure, and benchmark must complete the five-column applicability matrix.

**Q2 — Standards basis. RESOLVED: SUPPORT ALL THREE bases (budgeted / engineered / historical-rolling) at v1.0.** The panel contract's `basisOfStandards` field already supports the union. Variance evaluator must accept any of the three as input; KPI source doc must document each. No silent default — the basis is a per-tenant configuration choice surfaced in the variance evaluator inputs.

**Q3 — LIFO scope. RESOLVED: INCLUDE LIFO at v1.0.** ASC 330 LIFO is fully covered in Manufacturing_Disclosures_Sources.md including LIFO reserve disclosure, LIFO liquidation effects, and IFRS prohibition cross-reference (see Q5).

**Q4 — Drill-down depth. RESOLVED: PROGRESSIVE DRILL-DOWN.** Default surface is shallow (aggregated standard/actual inputs per period). User-initiated drill-in is available from there with no preset depth limit — each drill-in step is a separate spine-gated read. Each successive layer must independently pass tenant isolation + RBAC, and each must be exercised by the D0 panel probe (PC-MFG-05 expands to include multi-layer drill-down enumeration attempts).

**Q5 — IFRS coverage. RESOLVED: FULL IFRS AUTHORING at v1.0, equal depth to U.S. GAAP.** Author `Manufacturing_IFRS_Sources.md` as a peer document to `Manufacturing_ASC606_Sources.md` and `Manufacturing_Disclosures_Sources.md`. Coverage: IAS 2 (Inventory; LIFO prohibited; lower of cost and NRV; reversal of write-downs PERMITTED under IFRS — material divergence from ASC 330 to be flagged in both docs), IAS 16 (Property, Plant & Equipment for manufacturing facilities and machinery), IFRS 15 (Revenue from Contracts with Customers — generally converged with ASC 606 but with specific manufacturing application differences), IFRS 16 (Leases — single on-balance-sheet model; differs from ASC 842's dual operating/finance classification for lessees). The IFRS source doc gets the same six-field citation discipline + sub-segment applicability matrix as the U.S. GAAP docs. Clients can elect IFRS for reporting at the tenant level; the knowledge stack must render correctly under either basis.

**Q6 — Forecast variances. RESOLVED: INCLUDED at v1.0.** Forecast variance support is in scope. Authoring sequence (RECOMMENDED ENTRY POINT) — forecast variances enter the build at **MFG-K-G (Variance Evaluator)** alongside realized variances, not as a separate later module. Rationale: the evaluator already accepts (standard inputs, actual inputs, production volume); forecast variance is the same math with FORECAST inputs replacing actuals. Source doc treatment — Manufacturing_KPIs_Sources.md adds eight forecast variance KPIs (MFG-FV-01..MFG-FV-08) as a parallel group to MFG-V-01..MFG-V-08, with the same formula structure and an additional field documenting the forecast input source (sales-and-operations-planning output, demand forecast, sales pipeline). Panel contract — extended at MFG-K-F to include a `forecastVarianceSection` mirror of the realized variance fields, with a separate metadata field `forecastHorizon: { periodsAhead: number }`. Drill-down — forecast drill-down stops at the forecast input record (cannot drill into a future journal entry that doesn't exist yet).

**Q7 — Customer NAICS classification at onboarding. RESOLVED: (A) FOUNDER-SET MANUAL, with a multi-company sub-flow.** Founder (or admin) manually classifies the customer's primary NAICS code at onboarding. If the customer is a holding company / multi-entity organization with multiple operating companies under one tenant, the onboarding wizard prompts for a per-entity NAICS code so the panel selector can render the correct industry panels per operating company within the same tenant. Implementation note: this means industry-config storage (42.5G isolated as a sensitive tenant attribute) must support a one-to-many tenant→entity→NAICS relationship for multi-entity tenants. The wizard sub-flow is OUT OF SCOPE for the knowledge-stack lane (downstream onboarding UI work), but the data model assumption is recorded here so the panel selector code in Wave 2 binds to entity-level NAICS, not tenant-level.


---

Hand-off Items (CARRY-FORWARD; NOT THIS LANE'S CONCERN)

These mirror the 42.5AB carry-forward table — items recognized here but owned downstream:

| ID | Item | Owner Phase / Module |
|---|---|---|
| HF-MFG-01 | FDA 21 CFR Part 11 overlay (pharma / medical device customers) | Phase 42.7+ |
| HF-MFG-02 | ITAR / EAR overlay (defense / aerospace customers) | Phase 42.7+ |
| HF-MFG-03 | TSCA / EPA 313 overlay (chemical / regulated material customers) | Phase 42.7+ |
| HF-MFG-04 | MRP / MRP-II forward-planning algorithms | Separate planning lane |
| HF-MFG-05 | ERP-specific manufacturing integration (QBO has no real manufacturing module; NetSuite Manufacturing, Sage 300cloud, Microsoft Dynamics 365 SCM, Acumatica Manufacturing all need integration code) | Integration phase |
| HF-MFG-06 | Shop-floor IoT / real-time OEE feed | Far-downstream phase |
| HF-MFG-07 | (RESOLVED Q6) Forecast variances — NOW INCLUDED at v1.0 | This lane, enters at MFG-K-G |
| HF-MFG-08 | (RESOLVED Q5) Manufacturing IFRS source doc — NOW INCLUDED at v1.0 | This lane, MFG-K-C2 (new sub-module) |

---

Citation Discipline (binding — mirrors Phase 42N1 / 42O / 42P)

Every KPI, formula, disclosure rule, and benchmark cites a primary source. Acceptable primary sources for the manufacturing vertical:

- **Cost accounting standards:** Institute of Management Accountants (IMA) Statements on Management Accounting; AICPA cost accounting; CIMA (cross-reference only).
- **Inventory + revenue recognition:** FASB Codification ASC 330, ASC 606, ASC 842 via [DART Deloitte](https://dart.deloitte.com/USDART/home/codification); KPMG handbooks; Grant Thornton; RSM US.
- **Operations / inventory turns / OEE:** APICS / ASCM body of knowledge; SCOR model; Lean Six Sigma standard definitions (ASQ).
- **Disclosure:** SEC Reg S-K Items 101, 303; SEC Reg S-X; SEC climate disclosure final rule to the extent in force; FASB Codification.
- **Benchmarks (primary):** [Federal Reserve G.17 Industrial Production and Capacity Utilization](https://www.federalreserve.gov/releases/g17/current/default.htm); [BLS Producer Price Index](https://www.bls.gov/ppi/); U.S. Census Annual Survey of Manufactures (ASM); NACM credit metrics.
- **Benchmarks (cross-reference / secondary):** IndustryWeek, Oracle NetSuite KPI library, Dintec 2026 benchmarks, Eagle Rock CFO benchmarks. Allowed only as cross-references; never as the sole citation.

Secondary or blog sources blocking lock: any KPI whose only citation is a vendor blog, a SaaS marketing page, or an unverifiable secondary publication is REJECTED by the verifier (CHK-MFG-004 citation-grade check).

---

Naming & Path Conventions

- KPIs: `MFG-<category>-<number>` (e.g., MFG-FIN-01 for financial; MFG-V-01..V-08 for variances; MFG-OPS-01 for operations; MFG-Q-01 for quality; MFG-SC-01 for supply chain; MFG-INV-01 for inventory; MFG-LBR-01 for labor).
- Module IDs: `MFG-K-<letter>` (A through K above).
- Spec docs: `MFG_K_<letter>_<purpose>_Spec.md`.
- TS modules: `lib/intelligence/synthetic/industry/manufacturing/...`.
- Panel: `lib/dashboard/panels/manufacturing-variance/`.
- Verifier: `scripts/verify-manufacturing-knowledge-stack.js`.
- Probe extension: `scripts/probe-ops-control-spine.js` (extend, do not fork).

---

Definition of Done — Knowledge-Stack Close

The manufacturing knowledge-stack lane closes (founder-signable) when:

1. Manufacturing_KPIs_Sources.md complete with all eight variance KPIs + the full operating/financial/supply-chain/quality/labor KPI surface, citation discipline observed.
2. Manufacturing_ASC606_Sources.md, Manufacturing_Disclosures_Sources.md, Manufacturing_Benchmarks_Sources.md complete with citations.
3. Manufacturing_KPI_Citation_Verification_Register.xlsx complete (every URL 200, every cited text verified).
4. Manufacturing Variances panel contract module merged at lib/dashboard/panels/manufacturing-variance/contract.ts.
5. Variance evaluator merged at lib/intelligence/synthetic/industry/manufacturing/variance/, with the spine composition module bound.
6. verify-manufacturing-knowledge-stack.js merged, exit-0.
7. D0 probe extended with PC-MFG-01..PC-MFG-05, exit-0 (zero violations).
8. Phase 42 industry regression verifier still exit-0 (unchanged behavior; this lane MUST NOT break healthcare).
9. Founder three-commit signature chain landed (placeholder → sign → backfill), GPG state recorded.
10. Carry-forward table for FDA / ITAR / TSCA hand-offs in the close-out document.

Until all ten are true, this lane is PLANNING / SOURCES / SPEC, never lock.

---

Version Notes

v0.1 (this document) — initial draft. Establishes scope, panel contract, module sequence, hard rules, citation discipline. Open Questions Q1–Q7 batched for founder review. Pending founder review before MFG-K-A authoring begins.

---

END — Manufacturing Vertical Planning Document v0.1 DRAFT — Ready for Founder Review
