---
status: DRAFT / SPEC ONLY — NOT EXECUTABLE
executable: false
containsVerticalComplianceLogic: true
phase: Manufacturing Vertical Knowledge Stack — Wave 2 / MFG-K-G
artifact: Variance Evaluator Sub-Spec
locked: false
mode: SPEC AUTHORING — PURE FUNCTIONS; NO SPINE I/O
---

# MFG-K-G — Variance Evaluator Sub-Spec

**Module:** MFG-K-G — Variance Evaluator  
**Baseline:** `a4f3984` (MFG-K-F)  
**Authority:** [`docs/Phase_MFG_2_Build_Spec.md`](../../Phase_MFG_2_Build_Spec.md) §7, [`Manufacturing_KPIs_Sources.md`](../wave1/Manufacturing_KPIs_Sources.md) Section II, [`MFG_K_F_Panel_Field_Contract_Spec.md`](./MFG_K_F_Panel_Field_Contract_Spec.md)

**DRAFT / SPEC ONLY — NOT EXECUTABLE** as a deployed panel path. Pure-function evaluator with basis-routing compliance logic.

---

## 1. Purpose

Pure-function evaluator that takes standard cost inputs, actual results, and production volume and returns a `ManufacturingVariancePanelContract`-shaped output.

- No I/O, no spine, no Phase 42 imports
- Deterministic, side-effect free, no thrown exceptions
- Basis routing via `context.reportingBasis` and `basisOf()` only

---

## 2. Module layout

Directory: `lib/intelligence/synthetic/industry/manufacturing/variance/`

| File | Responsibility |
|---|---|
| `types.ts` | `ManufacturingEvaluatorInputs`, errors, result wrapper |
| `signedDollar.ts` | `makeSignedDollar()` — single sign-tag source of truth |
| `ifrsRecast.ts` | IFRS LIFO recast / rejection helpers |
| `fieldBuilder.ts` | `buildVarianceField()` helper |
| `directMaterials.ts` | MFG-V-01, V-02, V-09, V-10 + FV-01, FV-02 |
| `directLabor.ts` | MFG-V-03, V-04 + FV-03, FV-04 |
| `variableOverhead.ts` | MFG-V-05, V-06 + FV-05, FV-06 |
| `fixedOverhead.ts` | MFG-V-07a, V-07b + FV-07a, FV-07b |
| `totalManufacturingCost.ts` | MFG-V-08 + FV-08 composition |
| `evaluate.ts` | Top-level orchestrator |
| `index.ts` | Re-exports |

---

## 3. Pure-function contract

All evaluator functions MUST be:

- **Deterministic** — same inputs → same outputs
- **Side-effect free** — no I/O, no `console`, no `Date.now()`, no `Math.random()`
- **Total** — invalid inputs return `ManufacturingEvaluatorResult` error; never `throw`

---

## 4. Sign convention enforcement

`signedDollar.ts` is the single source of truth:

```typescript
export function makeSignedDollar(amountUsd: number): ManufacturingSignedDollarVariance {
  if (amountUsd < 0) return { amountUsd, signTag: "F" };
  if (amountUsd > 0) return { amountUsd, signTag: "U" };
  return { amountUsd: 0, signTag: "F" };
}
```

All variance modules MUST use `makeSignedDollar()`. Direct `ManufacturingSignedDollarVariance` object literals are prohibited.

---

## 5. Variance formulas (verbatim from Wave 1)

| KPI | Formula | Evaluator inputs |
|---|---|---|
| MFG-V-01 | `(Actual Price - Standard Price) × Actual Quantity Purchased` | `actualPrice`, `standardPrice`, `actualQuantityPurchased` |
| MFG-V-02 | `(Actual Quantity Used - Standard Quantity Allowed) × Standard Price` | `actualQuantityUsed`, `standardQuantityAllowed`, `standardPrice` |
| MFG-V-03 | `(Actual Rate - Standard Rate) × Actual Hours Worked` | `actualRate`, `standardRate`, `actualHoursWorked` |
| MFG-V-04 | `(Actual Hours - Standard Hours Allowed) × Standard Rate` | `actualHours`, `standardHoursAllowed`, `standardRate` |
| MFG-V-05 | `(Actual VOH Rate - Standard VOH Rate) × Actual Hours` | `actualVohRate`, `standardVohRate`, `actualHours` |
| MFG-V-06 | `(Actual Hours - Standard Hours Allowed) × Standard VOH Rate` | `actualHours`, `standardHoursAllowed`, `standardVohRate` |
| MFG-V-07a | `Actual Fixed Overhead - Budgeted Fixed Overhead` | `actualFixedOverhead`, `budgetedFixedOverhead` |
| MFG-V-07b | `Budgeted FOH - (Standard FOH Rate × Standard Hours Allowed for Actual Output)` | `budgetedFixedOverhead`, `standardFohRate`, `standardHoursAllowed` |
| MFG-V-08 | `Σ MFG-V-01..07b` | composition |
| MFG-V-09 | `Σ_i [(Actual Mix_i - Standard Mix_i) × Total Actual Qty] × Standard Price_i` | `mixComponents[]` |
| MFG-V-10 | `(Actual Total Input - Standard Total Input for Output) × Std Wtd-Avg Price` | `actualTotalInput`, `standardTotalInputForOutput`, `standardWeightedAverageInputPrice` |

**IFRS recast (Part V §5.3):** Before MFG-V-01/V-02 when `basis === 'IFRS'`, standard price MUST be recast to non-LIFO FIFO/weighted-average. LIFO-layered standards prohibited on IFRS branch.

Forecast block (MFG-FV-01..08): identical formulas with forecast inputs substituted for actuals per KPI doc lines 672–680.

---

## 6. Basis routing (compliance-critical)

- Authoritative basis: `context.reportingBasis` from `ManufacturingPanelContext`
- Panel root `reportingBasis` is denormalized for renderers — evaluator MUST set it from `context.reportingBasis`, never accept it as independent input
- Branch via `basisOf()` / `context.reportingBasis` only — no `StandardsReportingFramework` literal compares
- `ManufacturingEvaluatorInputs` discriminated union: US_GAAP branch carries `USGAAPInventory`; IFRS branch carries `IFRSInventory` only (compile-time LIFO exclusion)

---

## 7. Sub-segment gating

MFG-V-09/V-10 evaluated only when `context.subSegment ∈ {'P', 'H'}`. Otherwise `undefined` on panel contract. D/J/E drill-down deferred to Wave 3.

---

## 8. Forecast variance section

`evaluate.ts` produces `forecastVarianceSection` when `forecast` block present on inputs. Formulas mirror realized with forecast substituted.

---

## 9. Input types

`ManufacturingEvaluatorInputs` discriminated on `reportingBasis`:

- `US_GAAP`: may include `USGAAPInventory` with LIFO method
- `IFRS`: `IFRSInventory` only; `ifrsRecastStandardPrice` required when migrating from LIFO-layered standards

---

## 10. Error handling

```typescript
type ManufacturingEvaluatorResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ManufacturingEvaluatorError };

type ManufacturingEvaluatorError =
  | "MISSING_STANDARD_COST"
  | "MISSING_ACTUAL_RESULT"
  | "NEGATIVE_PRODUCTION_VOLUME"
  | "SUB_SEGMENT_MIX_YIELD_UNAVAILABLE"
  | "IFRS_LIFO_INPUT_REJECTED"
  | "BASIS_MISMATCH";
```

Never throw.

---

## 11. CHK-MFG mapping

| Evaluator function | PC ID |
|---|---|
| `priceVariance` | CHK-MFG-PC-04 |
| `usageVariance` | CHK-MFG-PC-05 |
| `rateVariance` | CHK-MFG-PC-06 |
| `efficiencyVariance` | CHK-MFG-PC-07 |
| `spendingVariance` (VOH) | CHK-MFG-PC-08 |
| `efficiencyVariance` (VOH) | CHK-MFG-PC-09 |
| `spendingVariance` (FOH) | CHK-MFG-PC-10 |
| `volumeVariance` (FOH) | CHK-MFG-PC-11 |
| `totalManufacturingCost` | CHK-MFG-PC-12 |
| forecast `priceVariance` | CHK-MFG-PC-13 |

---

## 12. Non-goals

- No spine composition (K-H)
- No Command Center surface emission (K-H)
- No Supabase reads
- No `panels/registry.ts`
- No Phase 42 imports
- No FDA/ITAR/TSCA overlay code

---

**END — MFG-K-G Variance Evaluator Sub-Spec**
