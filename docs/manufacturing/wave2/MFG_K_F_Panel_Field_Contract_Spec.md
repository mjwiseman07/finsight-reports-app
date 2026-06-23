---
status: DRAFT / SPEC ONLY — NOT EXECUTABLE
executable: false
containsVerticalComplianceLogic: false
phase: Manufacturing Vertical Knowledge Stack — Wave 2 / MFG-K-F
artifact: Panel Field Contract Sub-Spec
locked: false
mode: SPEC AUTHORING — SHAPE-ONLY CONTRACT; NO RUNTIME LOGIC
---

# MFG-K-F — Panel Field Contract Sub-Spec

**Module:** MFG-K-F — Panel Field Contract  
**Baseline:** `0b5a2ff` (MFG-K-0)  
**Authority:** [`docs/Phase_MFG_2_Build_Spec.md`](../../Phase_MFG_2_Build_Spec.md) §6, [`Manufacturing_KPIs_Sources.md`](../wave1/Manufacturing_KPIs_Sources.md) Section II + Panel Contract Crosswalk

**DRAFT / SPEC ONLY — NOT EXECUTABLE.** Shape-only panel field contract for the Manufacturing Variances Command Center surface.

---

## Purpose

Define the typed, shape-only contract for the Manufacturing Variances panel. This module binds Wave 1 KPI IDs (MFG-V-01..10, MFG-FV-01..08) to TypeScript interfaces at [`lib/dashboard/panels/manufacturing-variance/contract.ts`](../../../lib/dashboard/panels/manufacturing-variance/contract.ts).

**In scope:** field names, units, sign convention, read signature, sub-segment applicability metadata, forecast section shape.

**Out of scope:** variance math (MFG-K-G), spine composition (MFG-K-H), runtime functions, drill-down evidence resolution.

---

## Read signature (J-01)

Wave 2 binds at **company level** (entity schema deferred to Wave 3).

```
(companyId: string, accountingPeriod: string, context: ManufacturingPanelContext)
```

| Param | Type | Source |
|---|---|---|
| `companyId` | `string` | Company-level panel read (Wave 2) |
| `accountingPeriod` | `string` | Fiscal period identifier (typically `YYYY-MM` or firm-defined period key) |
| `context` | `ManufacturingPanelContext` | Basis + sub-segment routing from K-0 |

`ManufacturingPanelContext` is imported from [`ManufacturingBasisContracts.ts`](../../../lib/intelligence/synthetic/industry/contracts/manufacturing/ManufacturingBasisContracts.ts).

---

## Sign convention

**F = favorable NEGATIVE; U = unfavorable POSITIVE** (IMA/AICPA cost-accounting convention).

Favorable variance means cost came in **under** standard (negative dollar amount). Unfavorable means cost came in **over** standard (positive dollar amount). The panel must surface `signTag` (`F` / `U`) alongside `amountUsd` to avoid misreading of sign.

**Invariant:** signTag MUST agree with the sign of amountUsd. A favorable variance is `{ amountUsd: <negative>, signTag: 'F' }`; an unfavorable variance is `{ amountUsd: <positive>, signTag: 'U' }`. The evaluator (MFG-K-G) is responsible for producing consistent pairs. MFG-K-I verifier may add a proof case for this invariant if implementation drift is observed. Zero-value variances are `{ amountUsd: 0, signTag: 'F' }` by convention (no adverse variance).

Encoded in TypeScript as `ManufacturingSignedDollarVariance` (`amountUsd` + `signTag`).

---

## Root contract shape

Root export: `ManufacturingVariancePanelContract`.

### Realized variance fields (MFG-V-01..08)

| KPI ID | Contract field | Label | D | P | H | J | E |
|---|---|---|---|---|---|---|---|
| MFG-V-01 | `directMaterialsPriceVariance` | Direct Materials Price Variance | ✓ | ✓ | ✓ | ✓ | ◑ |
| MFG-V-02 | `directMaterialsUsageVariance` | Direct Materials Usage (Quantity) Variance | ✓ | ✓ | ✓ | ✓ | ◑ |
| MFG-V-03 | `directLaborRateVariance` | Direct Labor Rate Variance | ✓ | ✓ | ✓ | ✓ | ✓ |
| MFG-V-04 | `directLaborEfficiencyVariance` | Direct Labor Efficiency Variance | ◑ | ✓ | ✓ | ✓ | ✓ |
| MFG-V-05 | `variableOverheadSpendingVariance` | Variable Overhead Spending Variance | ✓ | ✓ | ✓ | ✓ | ✓ |
| MFG-V-06 | `variableOverheadEfficiencyVariance` | Variable Overhead Efficiency Variance | ◑ | ✓ | ✓ | ✓ | ✓ |
| MFG-V-07a | `fixedOverheadSpendingVariance` | Fixed Overhead Spending (Budget) Variance | ✓ | ✓ | ✓ | ✓ | ✓ |
| MFG-V-07b | `fixedOverheadVolumeVariance` | Fixed Overhead Volume Variance | ✓ | ✓ | ✓ | ◑ | ◑ |
| MFG-V-08 | `totalManufacturingCostVariance` | Total Manufacturing Cost Variance | ✓ | ✓ | ✓ | ✓ | ✓ |

Each field is typed as `ManufacturingVarianceField` with `id`, `label`, `value` (`ManufacturingSignedDollarVariance`), `basisOfStandards` (authoritative citation text from KPI doc §6), `unitOfMeasure`, and `applicableSubSegments`.

### Process/Hybrid decomposition (MFG-V-09/10)

Optional drill-down fields within DM usage decomposition. **Primary applicability: P and H only.**

| KPI ID | Contract field | Label | D | P | H | J | E |
|---|---|---|---|---|---|---|---|
| MFG-V-09 | `directMaterialsMixVariance?` | Direct Materials Mix Variance | ◑ | ✓ | ✓ | — | — |
| MFG-V-10 | `directMaterialsYieldVariance?` | Direct Materials Yield Variance | ◑ | ✓ | ✓ | — | — |

Omitted from panel output when sub-segment is not P/H (or optional ◑ D drill-down not requested).

---

## Forecast section (`forecastVarianceSection?`)

Optional mirror of realized variances using forecast inputs (resolved Q6). Typed as `ManufacturingForecastVarianceSection`.

| KPI ID | Contract field | Mirrors |
|---|---|---|
| MFG-FV-01 | `directMaterialsPriceVariance` | MFG-V-01 |
| MFG-FV-02 | `directMaterialsUsageVariance` | MFG-V-02 |
| MFG-FV-03 | `directLaborRateVariance` | MFG-V-03 |
| MFG-FV-04 | `directLaborEfficiencyVariance` | MFG-V-04 |
| MFG-FV-05 | `variableOverheadSpendingVariance` | MFG-V-05 |
| MFG-FV-06 | `variableOverheadEfficiencyVariance` | MFG-V-06 |
| MFG-FV-07a | `fixedOverheadSpendingVariance` | MFG-V-07a |
| MFG-FV-07b | `fixedOverheadVolumeVariance` | MFG-V-07b |
| MFG-FV-08 | `totalManufacturingCostForecastVariance` | MFG-V-08 |

Section metadata:

- `forecastHorizon: { periodsAhead: number }`
- `forecastInputSource: 'sop' | 'demand-forecast' | 'sales-pipeline' | string`

---

## Panel metadata

| Field | Type | Notes |
|---|---|---|
| `standardsBasis` | `'budgeted' \| 'engineered' \| 'historical-rolling'` | Per-tenant config (Q2 resolved). **No silent default.** |
| `productionVolumeForPeriod` | `number` | Actual output volume for the period |
| `unitOfMeasure` | `string` | Examples: `unit`, `lb`, `kg`, `gallon`, `meter`, `sqft` |
| `reportingBasis` | `ReportingBasis` | `'US_GAAP' \| 'IFRS'` on panel root |

`unitOfMeasure` is typed as `string` in Wave 2 to accommodate the full discrete-vs-process-vs-job-shop sub-segment range. Tightening to a closed union is a Wave 3 candidate after sub-segment unit-of-measure inventory is collected. Callers should not ossify around specific free-form values.

---

## CHK-MFG field mapping (verifier binding)

| PC case | KPI ID | Contract field |
|---|---|---|
| CHK-MFG-PC-01 | MFG-V-01 | `directMaterialsPriceVariance` |
| CHK-MFG-PC-02 | MFG-V-08 | `totalManufacturingCostVariance` |
| CHK-MFG-PC-03 | MFG-FV-01 | `forecastVarianceSection.directMaterialsPriceVariance` |

---

## Authoritative citations (basisOfStandards per field)

Each `ManufacturingVarianceField.basisOfStandards` carries citation text from Wave 1 KPI doc §(6):

| KPI ID | basisOfStandards (summary) |
|---|---|
| MFG-V-01..08, MFG-V-09/10, MFG-FV-01..08 | IMA Statement on Management Accounting / standard costing & variance analysis (SCVA framework); IMA SMA library |

Full citation URLs: [`Manufacturing_KPIs_Sources.md`](../wave1/Manufacturing_KPIs_Sources.md) Section II per KPI.

---

## Non-goals

- No evaluator logic (MFG-K-G owns variance math)
- No spine composition imports (MFG-K-H)
- No Phase 42 healthcare imports
- No runtime functions in `contract.ts`
- No `panels/registry.ts`
- No drill-down `VarianceDrillDown` interface in Wave 2 contract (deferred to evaluator/spine binding)

---

**END — MFG-K-F Panel Field Contract Sub-Spec**
