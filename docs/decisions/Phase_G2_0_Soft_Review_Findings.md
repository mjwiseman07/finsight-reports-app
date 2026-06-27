# Phase G2.0 Soft Signal Review Findings

**Source:** `reports/stub-inventory.json` @ LOCK-G2.0 `2b19a58`  
**Review date:** 2026-06-27  
**Scope:** All 13 soft signals (0 hard). Diagnostic surfacing only — no code changes.

**Common root cause:** 12 of 13 hits share pattern 5 (barrel `index.ts` re-exports). The scanner flags the barrel, not missing logic. Underlying implementations were traced for every pattern 5 hit.

---

## Hit 1 of 13

- **File:** `lib/accounting/supporting-schedules/scheduleDiagnostics.ts`
- **Line/Column:** 109:1
- **Function:** `nonPlaceholderEntities`
- **Signature:** `function nonPlaceholderEntities(rows: AdvisacorNormalizedEntity[] = []): AdvisacorNormalizedEntity[]`
- **Pattern matched:** 7
- **Vertical:** CONTROL
- **Domain:** compute

### Code Context (lines 99-118)

```ts
function metadataAmount(row: AdvisacorNormalizedEntity, key: string) {
  return amount(row.metadata?.[key]);
}

function finiteNumber(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function nonPlaceholderEntities(rows: AdvisacorNormalizedEntity[] = []) {
  return rows.filter((row) => row.type !== "not_available" && !String(row.id || "").endsWith(":not_available"));
}

function sumBalanceSheetRows(rows: CanonicalBalanceSheetRow[] = [], pattern: RegExp, includeTotals = false) {
  return rows
    .filter((row) => pattern.test(`${row.label} ${row.section || ""}`) && (includeTotals || !/^total\b/i.test(row.label)))
    .reduce((total, row) => total + amount(row.amount), 0);
}
```

### Cursor's Initial Read

This is a small filter helper that removes normalized entities marked as `not_available` (by `type` or `id` suffix) before schedule diagnostics run. It is used by `agingBuckets`, `inventoryAnalysis`, and related schedule builders in the same file.

### Diagnostic Questions for Founder

1. Should pattern 7 exclude function names where `placeholder` appears only as a negation prefix (e.g. `nonPlaceholder*`)?
2. Is this helper considered production-complete schedule hygiene, or a temporary guard pending richer provider normalization?

### Founder Classification (leave blank — founder fills in)

- [ ] STUB-CONFIRMED
- [ ] INTENTIONAL-PATTERN
- [ ] FALSE-POSITIVE
- [ ] DEFERRED

---

## Hit 2 of 13

- **File:** `lib/intelligence/synthetic/industry/manufacturing/variance/index.ts`
- **Line/Column:** 1:1
- **Function:** `mixVariance`
- **Signature:** `export function mixVariance(mixComponents: MixComponentInput[] | undefined, unitOfMeasure: string): ManufacturingEvaluatorResult<ManufacturingVarianceField>`
- **Pattern matched:** 5
- **Vertical:** MFG
- **Domain:** compute

### Code Context (lines 1-10)

```ts
export { evaluateManufacturingVariances } from "./evaluate";
export { evaluateDirectMaterials, mixVariance, priceVariance, usageVariance, yieldVariance } from "./directMaterials";
export { evaluateDirectLabor, efficiencyVariance as directLaborEfficiencyVariance, rateVariance as directLaborRateVariance } from "./directLabor";
export { evaluateVariableOverhead, efficiencyVariance as variableOverheadEfficiencyVariance, spendingVariance as variableOverheadSpendingVariance } from "./variableOverhead";
export { evaluateFixedOverhead, spendingVariance as fixedOverheadSpendingVariance, volumeVariance as fixedOverheadVolumeVariance } from "./fixedOverhead";
export { totalManufacturingCost, totalManufacturingCostForecast } from "./totalManufacturingCost";
export { makeSignedDollar } from "./signedDollar";
export { buildVarianceField, IMA_SCVA_CITATION } from "./fieldBuilder";
export { assertReportingBasisConsistency, resolveStandardMaterialPrice } from "./ifrsRecast";
```

### Cursor's Initial Read

Public barrel for the manufacturing variance module. `mixVariance` is re-exported from `./directMaterials` with no local implementation in this file.

### CRITICAL — for Pattern 5 hits only

- **Underlying implementation path:** `lib/intelligence/synthetic/industry/manufacturing/variance/directMaterials.ts`
- **Underlying impl body (read it!):**

```ts
/** MFG-V-09: mix decomposition for P/H */
export function mixVariance(
  mixComponents: MixComponentInput[] | undefined,
  unitOfMeasure: string,
): ManufacturingEvaluatorResult<ManufacturingVarianceField> {
  if (!mixComponents || mixComponents.length === 0) {
    return { ok: false, error: "MISSING_STANDARD_COST" };
  }

  const totalActualInput = mixComponents.reduce((sum, component) => sum + component.actualInputQuantity, 0);
  let amountUsd = 0;

  for (const component of mixComponents) {
    if (
      !isFiniteNumber(component.actualInputQuantity) ||
      !isFiniteNumber(component.standardMixProportion) ||
      !isFiniteNumber(component.standardPrice)
    ) {
      return { ok: false, error: "MISSING_STANDARD_COST" };
    }

    const standardQuantity = totalActualInput * component.standardMixProportion;
    amountUsd += (component.actualInputQuantity - standardQuantity) * component.standardPrice;
  }

  return {
    ok: true,
    value: buildVarianceField(
      "MFG-V-09",
      "Direct Materials Mix Variance",
      amountUsd,
      MIX_YIELD_SUB_SEGMENTS,
      unitOfMeasure,
    ),
  };
}
```

- **Cursor's assessment:** PRODUCTION-COMPLETE
- **Why:** Full IMA-style mix variance decomposition with input validation, fail-closed errors, and structured `buildVarianceField` output tagged MFG-V-09.

### Diagnostic Questions for Founder

1. Should barrel `index.ts` files be excluded from pattern 5 to reduce noise?
2. Is the mix/yield decomposition scope locked for MFG W2, or still subject to G2 expansion?

### Founder Classification (leave blank — founder fills in)

- [ ] STUB-CONFIRMED
- [ ] INTENTIONAL-PATTERN
- [ ] FALSE-POSITIVE
- [ ] DEFERRED

---

## Hit 3 of 13

- **File:** `lib/intelligence/synthetic/industry/manufacturing/variance/index.ts`
- **Line/Column:** 1:1
- **Function:** `yieldVariance`
- **Signature:** `export function yieldVariance(inputs: DirectMaterialsCostInputs, unitOfMeasure: string): ManufacturingEvaluatorResult<ManufacturingVarianceField>`
- **Pattern matched:** 5
- **Vertical:** MFG
- **Domain:** compute

### Code Context (lines 1-10)

```ts
export { evaluateManufacturingVariances } from "./evaluate";
export { evaluateDirectMaterials, mixVariance, priceVariance, usageVariance, yieldVariance } from "./directMaterials";
export { evaluateDirectLabor, efficiencyVariance as directLaborEfficiencyVariance, rateVariance as directLaborRateVariance } from "./directLabor";
export { evaluateVariableOverhead, efficiencyVariance as variableOverheadEfficiencyVariance, spendingVariance as variableOverheadSpendingVariance } from "./variableOverhead";
export { evaluateFixedOverhead, spendingVariance as fixedOverheadSpendingVariance, volumeVariance as fixedOverheadVolumeVariance } from "./fixedOverhead";
export { totalManufacturingCost, totalManufacturingCostForecast } from "./totalManufacturingCost";
export { makeSignedDollar } from "./signedDollar";
export { buildVarianceField, IMA_SCVA_CITATION } from "./fieldBuilder";
export { assertReportingBasisConsistency, resolveStandardMaterialPrice } from "./ifrsRecast";
```

### Cursor's Initial Read

Same manufacturing variance barrel; `yieldVariance` is re-exported from `./directMaterials`.

### CRITICAL — for Pattern 5 hits only

- **Underlying implementation path:** `lib/intelligence/synthetic/industry/manufacturing/variance/directMaterials.ts`
- **Underlying impl body (read it!):**

```ts
/** MFG-V-10: yield decomposition for P/H */
export function yieldVariance(
  inputs: DirectMaterialsCostInputs,
  unitOfMeasure: string,
): ManufacturingEvaluatorResult<ManufacturingVarianceField> {
  if (
    !isFiniteNumber(inputs.actualTotalInput) ||
    !isFiniteNumber(inputs.standardTotalInputForOutput) ||
    !isFiniteNumber(inputs.standardWeightedAverageInputPrice)
  ) {
    return { ok: false, error: "MISSING_STANDARD_COST" };
  }

  const amountUsd =
    (inputs.actualTotalInput - inputs.standardTotalInputForOutput) * inputs.standardWeightedAverageInputPrice;

  return {
    ok: true,
    value: buildVarianceField(
      "MFG-V-10",
      "Direct Materials Yield Variance",
      amountUsd,
      MIX_YIELD_SUB_SEGMENTS,
      unitOfMeasure,
    ),
  };
}
```

- **Cursor's assessment:** PRODUCTION-COMPLETE
- **Why:** Implements yield variance formula with required input guards and MFG-V-10 field tagging.

### Diagnostic Questions for Founder

1. Confirm yield variance is in scope for MFG-2 lock acceptance (not deferred to a later wave)?
2. Should pattern 5 be suppressed when underlying impl is in the same package subtree?

### Founder Classification (leave blank — founder fills in)

- [ ] STUB-CONFIRMED
- [ ] INTENTIONAL-PATTERN
- [ ] FALSE-POSITIVE
- [ ] DEFERRED

---

## Hit 4 of 13

- **File:** `lib/intelligence/synthetic/industry/manufacturing/variance/index.ts`
- **Line/Column:** 1:1
- **Function:** `directLaborEfficiencyVariance`
- **Signature:** `export function efficiencyVariance(inputs: DirectLaborCostInputs, unitOfMeasure: string): ManufacturingEvaluatorResult<ManufacturingVarianceField>` (exported as `directLaborEfficiencyVariance`)
- **Pattern matched:** 5
- **Vertical:** MFG
- **Domain:** compute

### Code Context (lines 1-10)

```ts
export { evaluateManufacturingVariances } from "./evaluate";
export { evaluateDirectMaterials, mixVariance, priceVariance, usageVariance, yieldVariance } from "./directMaterials";
export { evaluateDirectLabor, efficiencyVariance as directLaborEfficiencyVariance, rateVariance as directLaborRateVariance } from "./directLabor";
export { evaluateVariableOverhead, efficiencyVariance as variableOverheadEfficiencyVariance, spendingVariance as variableOverheadSpendingVariance } from "./variableOverhead";
export { evaluateFixedOverhead, spendingVariance as fixedOverheadSpendingVariance, volumeVariance as fixedOverheadVolumeVariance } from "./fixedOverhead";
export { totalManufacturingCost, totalManufacturingCostForecast } from "./totalManufacturingCost";
export { makeSignedDollar } from "./signedDollar";
export { buildVarianceField, IMA_SCVA_CITATION } from "./fieldBuilder";
export { assertReportingBasisConsistency, resolveStandardMaterialPrice } from "./ifrsRecast";
```

### Cursor's Initial Read

Barrel alias re-export: `efficiencyVariance` from `./directLabor` is exposed as `directLaborEfficiencyVariance` at the package boundary.

### CRITICAL — for Pattern 5 hits only

- **Underlying implementation path:** `lib/intelligence/synthetic/industry/manufacturing/variance/directLabor.ts`
- **Underlying impl body (read it!):**

```ts
/** MFG-V-04: (Actual Hours - Standard Hours Allowed) × Standard Rate */
export function efficiencyVariance(
  inputs: DirectLaborCostInputs,
  unitOfMeasure: string,
): ManufacturingEvaluatorResult<ManufacturingVarianceField> {
  if (
    !isFiniteNumber(inputs.standardRate) ||
    !isFiniteNumber(inputs.actualHoursWorked) ||
    !isFiniteNumber(inputs.standardHoursAllowed)
  ) {
    return { ok: false, error: "MISSING_STANDARD_COST" };
  }

  const amountUsd = (inputs.actualHoursWorked - inputs.standardHoursAllowed) * inputs.standardRate;
  return {
    ok: true,
    value: buildVarianceField("MFG-V-04", "Direct Labor Efficiency Variance", amountUsd, ALL_SUB_SEGMENTS, unitOfMeasure),
  };
}
```

- **Cursor's assessment:** PRODUCTION-COMPLETE
- **Why:** Standard cost direct labor efficiency variance with validation and MFG-V-04 output contract.

### Diagnostic Questions for Founder

1. Is the alias naming (`directLaborEfficiencyVariance`) the intended public API, or should consumers import from `directLabor.ts` directly?
2. Any open MFG variance gaps outside this 6-variance set?

### Founder Classification (leave blank — founder fills in)

- [ ] STUB-CONFIRMED
- [ ] INTENTIONAL-PATTERN
- [ ] FALSE-POSITIVE
- [ ] DEFERRED

---

## Hit 5 of 13

- **File:** `lib/intelligence/synthetic/industry/manufacturing/variance/index.ts`
- **Line/Column:** 1:1
- **Function:** `directLaborRateVariance`
- **Signature:** `export function rateVariance(inputs: DirectLaborCostInputs, unitOfMeasure: string): ManufacturingEvaluatorResult<ManufacturingVarianceField>` (exported as `directLaborRateVariance`)
- **Pattern matched:** 5
- **Vertical:** MFG
- **Domain:** compute

### Code Context (lines 1-10)

```ts
export { evaluateManufacturingVariances } from "./evaluate";
export { evaluateDirectMaterials, mixVariance, priceVariance, usageVariance, yieldVariance } from "./directMaterials";
export { evaluateDirectLabor, efficiencyVariance as directLaborEfficiencyVariance, rateVariance as directLaborRateVariance } from "./directLabor";
export { evaluateVariableOverhead, efficiencyVariance as variableOverheadEfficiencyVariance, spendingVariance as variableOverheadSpendingVariance } from "./variableOverhead";
export { evaluateFixedOverhead, spendingVariance as fixedOverheadSpendingVariance, volumeVariance as fixedOverheadVolumeVariance } from "./fixedOverhead";
export { totalManufacturingCost, totalManufacturingCostForecast } from "./totalManufacturingCost";
export { makeSignedDollar } from "./signedDollar";
export { buildVarianceField, IMA_SCVA_CITATION } from "./fieldBuilder";
export { assertReportingBasisConsistency, resolveStandardMaterialPrice } from "./ifrsRecast";
```

### Cursor's Initial Read

Barrel alias re-export for direct labor rate variance from `./directLabor`.

### CRITICAL — for Pattern 5 hits only

- **Underlying implementation path:** `lib/intelligence/synthetic/industry/manufacturing/variance/directLabor.ts`
- **Underlying impl body (read it!):**

```ts
/** MFG-V-03: (Actual Rate - Standard Rate) × Actual Hours Worked */
export function rateVariance(
  inputs: DirectLaborCostInputs,
  unitOfMeasure: string,
): ManufacturingEvaluatorResult<ManufacturingVarianceField> {
  if (!isFiniteNumber(inputs.standardRate) || !isFiniteNumber(inputs.actualRate) || !isFiniteNumber(inputs.actualHoursWorked)) {
    return { ok: false, error: "MISSING_STANDARD_COST" };
  }

  const amountUsd = (inputs.actualRate - inputs.standardRate) * inputs.actualHoursWorked;
  return {
    ok: true,
    value: buildVarianceField("MFG-V-03", "Direct Labor Rate Variance", amountUsd, ALL_SUB_SEGMENTS, unitOfMeasure),
  };
}
```

- **Cursor's assessment:** PRODUCTION-COMPLETE
- **Why:** Full rate variance computation with fail-closed guards and MFG-V-03 tagging.

### Diagnostic Questions for Founder

1. Same barrel-exclusion question as other MFG variance hits?
2. Confirm rate vs efficiency variances are both wired to panel/KPI consumers?

### Founder Classification (leave blank — founder fills in)

- [ ] STUB-CONFIRMED
- [ ] INTENTIONAL-PATTERN
- [ ] FALSE-POSITIVE
- [ ] DEFERRED

---

## Hit 6 of 13

- **File:** `lib/intelligence/synthetic/industry/manufacturing/variance/index.ts`
- **Line/Column:** 1:1
- **Function:** `variableOverheadEfficiencyVariance`
- **Signature:** `export function efficiencyVariance(inputs: VariableOverheadCostInputs, unitOfMeasure: string): ManufacturingEvaluatorResult<ManufacturingVarianceField>` (exported as `variableOverheadEfficiencyVariance`)
- **Pattern matched:** 5
- **Vertical:** MFG
- **Domain:** compute

### Code Context (lines 1-10)

```ts
export { evaluateManufacturingVariances } from "./evaluate";
export { evaluateDirectMaterials, mixVariance, priceVariance, usageVariance, yieldVariance } from "./directMaterials";
export { evaluateDirectLabor, efficiencyVariance as directLaborEfficiencyVariance, rateVariance as directLaborRateVariance } from "./directLabor";
export { evaluateVariableOverhead, efficiencyVariance as variableOverheadEfficiencyVariance, spendingVariance as variableOverheadSpendingVariance } from "./variableOverhead";
export { evaluateFixedOverhead, spendingVariance as fixedOverheadSpendingVariance, volumeVariance as fixedOverheadVolumeVariance } from "./fixedOverhead";
export { totalManufacturingCost, totalManufacturingCostForecast } from "./totalManufacturingCost";
export { makeSignedDollar } from "./signedDollar";
export { buildVarianceField, IMA_SCVA_CITATION } from "./fieldBuilder";
export { assertReportingBasisConsistency, resolveStandardMaterialPrice } from "./ifrsRecast";
```

### Cursor's Initial Read

Barrel alias for variable overhead efficiency variance from `./variableOverhead`.

### CRITICAL — for Pattern 5 hits only

- **Underlying implementation path:** `lib/intelligence/synthetic/industry/manufacturing/variance/variableOverhead.ts`
- **Underlying impl body (read it!):**

```ts
/** MFG-V-06: (Actual Hours - Standard Hours Allowed) × Standard VOH Rate */
export function efficiencyVariance(
  inputs: VariableOverheadCostInputs,
  unitOfMeasure: string,
): ManufacturingEvaluatorResult<ManufacturingVarianceField> {
  if (
    !isFiniteNumber(inputs.standardVohRate) ||
    !isFiniteNumber(inputs.actualHours) ||
    !isFiniteNumber(inputs.standardHoursAllowed)
  ) {
    return { ok: false, error: "MISSING_STANDARD_COST" };
  }

  const amountUsd = (inputs.actualHours - inputs.standardHoursAllowed) * inputs.standardVohRate;
  return {
    ok: true,
    value: buildVarianceField(
      "MFG-V-06",
      "Variable Overhead Efficiency Variance",
      amountUsd,
      ALL_SUB_SEGMENTS,
      unitOfMeasure,
    ),
  };
}
```

- **Cursor's assessment:** PRODUCTION-COMPLETE
- **Why:** Implements MFG-V-06 variable overhead efficiency variance with standard formula and validation.

### Diagnostic Questions for Founder

1. Is variable overhead treated as fully locked under MFG-2, or still PRODUCTION-LITE pending sub-segment routing?
2. Barrel suppression for aliased exports?

### Founder Classification (leave blank — founder fills in)

- [ ] STUB-CONFIRMED
- [ ] INTENTIONAL-PATTERN
- [ ] FALSE-POSITIVE
- [ ] DEFERRED

---

## Hit 7 of 13

- **File:** `lib/intelligence/synthetic/industry/manufacturing/variance/index.ts`
- **Line/Column:** 1:1
- **Function:** `variableOverheadSpendingVariance`
- **Signature:** `export function spendingVariance(inputs: VariableOverheadCostInputs, unitOfMeasure: string): ManufacturingEvaluatorResult<ManufacturingVarianceField>` (exported as `variableOverheadSpendingVariance`)
- **Pattern matched:** 5
- **Vertical:** MFG
- **Domain:** compute

### Code Context (lines 1-10)

```ts
export { evaluateManufacturingVariances } from "./evaluate";
export { evaluateDirectMaterials, mixVariance, priceVariance, usageVariance, yieldVariance } from "./directMaterials";
export { evaluateDirectLabor, efficiencyVariance as directLaborEfficiencyVariance, rateVariance as directLaborRateVariance } from "./directLabor";
export { evaluateVariableOverhead, efficiencyVariance as variableOverheadEfficiencyVariance, spendingVariance as variableOverheadSpendingVariance } from "./variableOverhead";
export { evaluateFixedOverhead, spendingVariance as fixedOverheadSpendingVariance, volumeVariance as fixedOverheadVolumeVariance } from "./fixedOverhead";
export { totalManufacturingCost, totalManufacturingCostForecast } from "./totalManufacturingCost";
export { makeSignedDollar } from "./signedDollar";
export { buildVarianceField, IMA_SCVA_CITATION } from "./fieldBuilder";
export { assertReportingBasisConsistency, resolveStandardMaterialPrice } from "./ifrsRecast";
```

### Cursor's Initial Read

Barrel alias for variable overhead spending variance from `./variableOverhead`.

### CRITICAL — for Pattern 5 hits only

- **Underlying implementation path:** `lib/intelligence/synthetic/industry/manufacturing/variance/variableOverhead.ts`
- **Underlying impl body (read it!):**

```ts
/** MFG-V-05: (Actual VOH Rate - Standard VOH Rate) × Actual Hours */
export function spendingVariance(
  inputs: VariableOverheadCostInputs,
  unitOfMeasure: string,
): ManufacturingEvaluatorResult<ManufacturingVarianceField> {
  if (!isFiniteNumber(inputs.standardVohRate) || !isFiniteNumber(inputs.actualVohRate) || !isFiniteNumber(inputs.actualHours)) {
    return { ok: false, error: "MISSING_STANDARD_COST" };
  }

  const amountUsd = (inputs.actualVohRate - inputs.standardVohRate) * inputs.actualHours;
  return {
    ok: true,
    value: buildVarianceField(
      "MFG-V-05",
      "Variable Overhead Spending Variance",
      amountUsd,
      ALL_SUB_SEGMENTS,
      unitOfMeasure,
    ),
  };
}
```

- **Cursor's assessment:** PRODUCTION-COMPLETE
- **Why:** Full MFG-V-05 spending variance with input validation and structured output.

### Diagnostic Questions for Founder

1. Confirm spending vs efficiency VOH pair is complete for W2?
2. Any planned IFRS recast interaction not yet reflected in these functions?

### Founder Classification (leave blank — founder fills in)

- [ ] STUB-CONFIRMED
- [ ] INTENTIONAL-PATTERN
- [ ] FALSE-POSITIVE
- [ ] DEFERRED

---

## Hit 8 of 13

- **File:** `lib/intelligence/synthetic/industry/manufacturing/variance/index.ts`
- **Line/Column:** 1:1
- **Function:** `fixedOverheadSpendingVariance`
- **Signature:** `export function spendingVariance(inputs: FixedOverheadCostInputs, unitOfMeasure: string): ManufacturingEvaluatorResult<ManufacturingVarianceField>` (exported as `fixedOverheadSpendingVariance`)
- **Pattern matched:** 5
- **Vertical:** MFG
- **Domain:** compute

### Code Context (lines 1-10)

```ts
export { evaluateManufacturingVariances } from "./evaluate";
export { evaluateDirectMaterials, mixVariance, priceVariance, usageVariance, yieldVariance } from "./directMaterials";
export { evaluateDirectLabor, efficiencyVariance as directLaborEfficiencyVariance, rateVariance as directLaborRateVariance } from "./directLabor";
export { evaluateVariableOverhead, efficiencyVariance as variableOverheadEfficiencyVariance, spendingVariance as variableOverheadSpendingVariance } from "./variableOverhead";
export { evaluateFixedOverhead, spendingVariance as fixedOverheadSpendingVariance, volumeVariance as fixedOverheadVolumeVariance } from "./fixedOverhead";
export { totalManufacturingCost, totalManufacturingCostForecast } from "./totalManufacturingCost";
export { makeSignedDollar } from "./signedDollar";
export { buildVarianceField, IMA_SCVA_CITATION } from "./fieldBuilder";
export { assertReportingBasisConsistency, resolveStandardMaterialPrice } from "./ifrsRecast";
```

### Cursor's Initial Read

Barrel alias for fixed overhead spending variance from `./fixedOverhead`.

### CRITICAL — for Pattern 5 hits only

- **Underlying implementation path:** `lib/intelligence/synthetic/industry/manufacturing/variance/fixedOverhead.ts`
- **Underlying impl body (read it!):**

```ts
/** MFG-V-07a: Actual Fixed Overhead - Budgeted Fixed Overhead */
export function spendingVariance(
  inputs: FixedOverheadCostInputs,
  unitOfMeasure: string,
): ManufacturingEvaluatorResult<ManufacturingVarianceField> {
  if (!isFiniteNumber(inputs.actualFixedOverhead) || !isFiniteNumber(inputs.budgetedFixedOverhead)) {
    return { ok: false, error: "MISSING_STANDARD_COST" };
  }

  const amountUsd = inputs.actualFixedOverhead - inputs.budgetedFixedOverhead;
  return {
    ok: true,
    value: buildVarianceField(
      "MFG-V-07a",
      "Fixed Overhead Spending Variance",
      amountUsd,
      ALL_SUB_SEGMENTS,
      unitOfMeasure,
    ),
  };
}
```

- **Cursor's assessment:** PRODUCTION-COMPLETE
- **Why:** Budget vs actual fixed overhead spending variance with MFG-V-07a tagging.

### Diagnostic Questions for Founder

1. Is fixed overhead volume/spending pair considered sealed at LOCK-MFG-2?
2. Should `evaluateFixedOverhead` aggregator be the only public export (hiding individual variances)?

### Founder Classification (leave blank — founder fills in)

- [ ] STUB-CONFIRMED
- [ ] INTENTIONAL-PATTERN
- [ ] FALSE-POSITIVE
- [ ] DEFERRED

---

## Hit 9 of 13

- **File:** `lib/intelligence/synthetic/industry/manufacturing/variance/index.ts`
- **Line/Column:** 1:1
- **Function:** `fixedOverheadVolumeVariance`
- **Signature:** `export function volumeVariance(inputs: FixedOverheadCostInputs, unitOfMeasure: string): ManufacturingEvaluatorResult<ManufacturingVarianceField>` (exported as `fixedOverheadVolumeVariance`)
- **Pattern matched:** 5
- **Vertical:** MFG
- **Domain:** compute

### Code Context (lines 1-10)

```ts
export { evaluateManufacturingVariances } from "./evaluate";
export { evaluateDirectMaterials, mixVariance, priceVariance, usageVariance, yieldVariance } from "./directMaterials";
export { evaluateDirectLabor, efficiencyVariance as directLaborEfficiencyVariance, rateVariance as directLaborRateVariance } from "./directLabor";
export { evaluateVariableOverhead, efficiencyVariance as variableOverheadEfficiencyVariance, spendingVariance as variableOverheadSpendingVariance } from "./variableOverhead";
export { evaluateFixedOverhead, spendingVariance as fixedOverheadSpendingVariance, volumeVariance as fixedOverheadVolumeVariance } from "./fixedOverhead";
export { totalManufacturingCost, totalManufacturingCostForecast } from "./totalManufacturingCost";
export { makeSignedDollar } from "./signedDollar";
export { buildVarianceField, IMA_SCVA_CITATION } from "./fieldBuilder";
export { assertReportingBasisConsistency, resolveStandardMaterialPrice } from "./ifrsRecast";
```

### Cursor's Initial Read

Barrel alias for fixed overhead volume variance from `./fixedOverhead`.

### CRITICAL — for Pattern 5 hits only

- **Underlying implementation path:** `lib/intelligence/synthetic/industry/manufacturing/variance/fixedOverhead.ts`
- **Underlying impl body (read it!):**

```ts
/** MFG-V-07b: Budgeted FOH - (Standard FOH Rate × Standard Hours Allowed for Actual Output) */
export function volumeVariance(
  inputs: FixedOverheadCostInputs,
  unitOfMeasure: string,
): ManufacturingEvaluatorResult<ManufacturingVarianceField> {
  if (
    !isFiniteNumber(inputs.budgetedFixedOverhead) ||
    !isFiniteNumber(inputs.standardFohRate) ||
    !isFiniteNumber(inputs.standardHoursAllowed)
  ) {
    return { ok: false, error: "MISSING_STANDARD_COST" };
  }

  const amountUsd = inputs.budgetedFixedOverhead - inputs.standardFohRate * inputs.standardHoursAllowed;
  return {
    ok: true,
    value: buildVarianceField(
      "MFG-V-07b",
      "Fixed Overhead Volume Variance",
      amountUsd,
      ALL_SUB_SEGMENTS,
      unitOfMeasure,
    ),
  };
}
```

- **Cursor's assessment:** PRODUCTION-COMPLETE
- **Why:** Full volume variance formula with validation and MFG-V-07b output contract.

### Diagnostic Questions for Founder

1. Same as Hit 8 — is this pair production-sealed?
2. Any remaining MFG variance surfaces not covered by `evaluateManufacturingVariances`?

### Founder Classification (leave blank — founder fills in)

- [ ] STUB-CONFIRMED
- [ ] INTENTIONAL-PATTERN
- [ ] FALSE-POSITIVE
- [ ] DEFERRED

---

## Hit 10 of 13

- **File:** `lib/intelligence/synthetic/spine/index.ts`
- **Line/Column:** 7:1
- **Function:** `classifyIsolationReach`
- **Signature:** `export function classifyIsolationReach(input: ClassifyIsolationReachInput): ClassifyIsolationReachCore`
- **Pattern matched:** 5
- **Vertical:** CONTROL
- **Domain:** compute

### Code Context (lines 1-18)

```ts
/**
 * Public consumption barrel for Phase 42.5B/C/P spine isolation helpers.
 * Composition modules MUST import from this barrel — never from internal spine paths.
 * containsVerticalComplianceLogic: false
 * executable: false
 */
export {
  classifyIsolationReach,
  evaluateIsolationBoundary,
  type ClassifyIsolationReachCore,
  type ClassifyIsolationReachInput,
  type ControlSpineIsolationAccessOutcome,
  type ControlSpineIsolationDenyReason,
  type ControlSpineIsolationEvaluationResult,
  type ControlSpineIsolationScope,
  type ControlSpineResourceVisibilityScope,
  type EvaluateIsolationBoundaryInput,
} from "../../../../ops/control-spine/isolation";
```

### Cursor's Initial Read

Documented public barrel for control-spine isolation helpers. `classifyIsolationReach` is re-exported from `ops/control-spine/isolation` per Phase 42.5B composition rules.

### CRITICAL — for Pattern 5 hits only

- **Underlying implementation path:** `ops/control-spine/isolation/evaluateIsolationBoundary.ts`
- **Underlying impl body (read it!):**

```ts
/**
 * Pure isolation classifier. Deny-by-default; fail-closed on missing, ambiguous, or partial scope.
 * No live enforcement, no audit-store writes, no RBAC matrix evaluation (42.5C).
 */
export function classifyIsolationReach(input: ClassifyIsolationReachInput): ClassifyIsolationReachCore {
  const evaluationTrace: string[] = ["classifyIsolationReach:start", "policy:deny_by_default"];

  const requesterValidation = validateIsolationScope(
    input.requesterScope,
    "requester",
    input.targetResourceVisibilityScope,
  );
  if (!requesterValidation.valid) {
    return deny(requesterValidation.reason, evaluationTrace);
  }

  const targetValidation = validateIsolationScope(
    input.targetScope,
    "target",
    input.targetResourceVisibilityScope,
  );
  if (!targetValidation.valid) {
    return deny(targetValidation.reason, evaluationTrace);
  }

  const requesterScope = input.requesterScope as ControlSpineIsolationScope;
  const targetScope = input.targetScope as ControlSpineIsolationScope;

  evaluationTrace.push("scope:requester_valid", "scope:target_valid");

  if (requesterScope.customerTenantId !== targetScope.customerTenantId) {
    return deny("cross_customer_tenant", evaluationTrace);
  }
  // ... customer/firm/client dimension checks, persona visibility rules ...
  return {
    accessOutcome: "allowed",
    denyReason: null,
    evaluationTrace,
  };
}
```

- **Cursor's assessment:** PRODUCTION-COMPLETE
- **Why:** ~90-line pure classifier with deny-by-default policy, full scope validation, customer/firm/client boundary checks, persona visibility rules, and evaluation trace. This is the locked 42.5B isolation core (metadata-only, `executable: false`).

### Diagnostic Questions for Founder

1. Is the spine barrel intentionally the only import surface for composition modules (making pattern 5 noise acceptable)?
2. Should scanner distinguish documented public barrels from impl-only re-exports?

### Founder Classification (leave blank — founder fills in)

- [ ] STUB-CONFIRMED
- [ ] INTENTIONAL-PATTERN
- [ ] FALSE-POSITIVE
- [ ] DEFERRED

---

## Hit 11 of 13

- **File:** `lib/intelligence/synthetic/spine/index.ts`
- **Line/Column:** 7:1
- **Function:** `evaluateRbacAccess`
- **Signature:** `export function evaluateRbacAccess(input: EvaluateRbacAccessInput): ControlSpineRbacEvaluationResult`
- **Pattern matched:** 5
- **Vertical:** CONTROL
- **Domain:** compute

### Code Context (lines 20-31)

```ts
export {
  classifyPersonaPermission,
  evaluateRbacAccess,
  type ClassifyPersonaPermissionCore,
  type ClassifyPersonaPermissionInput,
  type ControlSpineRbacAccessOutcome,
  type ControlSpineRbacDenyReason,
  type ControlSpineRbacEvaluationResult,
  type ControlSpineRbacRequestedAction,
  type ControlSpineRbacResourceDescriptor,
  type EvaluateRbacAccessInput,
} from "../../../../ops/control-spine/rbac";
```

### Cursor's Initial Read

Spine barrel re-export for the Phase 42.5C RBAC evaluator with optional isolation composition.

### CRITICAL — for Pattern 5 hits only

- **Underlying implementation path:** `ops/control-spine/rbac/evaluateRbacAccess.ts`
- **Underlying impl body (read it!):**

```ts
/**
 * RBAC evaluator with optional 42.5B isolation composition.
 * RBAC allow is necessary-but-not-sufficient — composed allow requires BOTH isolation and RBAC.
 */
export function evaluateRbacAccess(input: EvaluateRbacAccessInput): ControlSpineRbacEvaluationResult {
  const rbacClassification = classifyPersonaPermission(input);
  const matrixValidation = validateMatrix(input.rbacMatrix, ["evaluateRbacAccess:start"]);
  const matrix = matrixValidation.valid
    ? matrixValidation.matrix
    : { /* fallback invalid matrix shape */ };

  let composedOutcome: ControlSpineRbacAccessOutcome = rbacClassification.accessOutcome;
  let denyReason: ControlSpineRbacDenyReason | null = rbacClassification.denyReason;
  let evaluationTrace = [...rbacClassification.evaluationTrace];
  let isolationAccessOutcome: ControlSpineIsolationAccessOutcome | null = null;

  if (input.isolationInput) {
    const isolationClassification = classifyIsolationReach(input.isolationInput);
    isolationAccessOutcome = isolationClassification.accessOutcome;
    const composition = composeWithIsolation(rbacClassification, isolationClassification, evaluationTrace);
    composedOutcome = composition.composedOutcome;
    denyReason = composition.denyReason;
    evaluationTrace = composition.evaluationTrace;
  }

  return {
    rbacEvaluationResultId: buildDeterministicEvaluationId([/* ... */]),
    rbacOutcome: rbacClassification.accessOutcome,
    composedOutcome,
    denyReason,
    isolationAccessOutcome,
    evaluationTrace,
    auditEvent: buildAuditEventFromEvaluation(input, rbacClassification, composedOutcome, matrix),
  };
}
```

- **Cursor's assessment:** PRODUCTION-COMPLETE
- **Why:** Full RBAC matrix validation, deny-by-default persona permission classification, isolation override composition, deterministic IDs, and audit event construction. Locked 42.5C surface.

### Diagnostic Questions for Founder

1. Confirm RBAC+isolation composition is the intended production path for panel authorization?
2. Any RBAC matrix gaps still marked deferred in planning docs?

### Founder Classification (leave blank — founder fills in)

- [ ] STUB-CONFIRMED
- [ ] INTENTIONAL-PATTERN
- [ ] FALSE-POSITIVE
- [ ] DEFERRED

---

## Hit 12 of 13

- **File:** `lib/intelligence/synthetic/spine/index.ts`
- **Line/Column:** 7:1
- **Function:** `buildIsolationScopeFromTenantId`
- **Signature:** `export function buildIsolationScopeFromTenantId(tenantId: string): ControlSpineIsolationScope`
- **Pattern matched:** 5
- **Vertical:** CONTROL
- **Domain:** compute

### Code Context (lines 33-41)

```ts
export {
  buildActivationScopeFromTenantId,
  buildIsolationScopeFromTenantId,
  createPanelDataPathHarness,
  panelDataPathHarness,
  type PanelAssertionResult,
  type PanelDataPathHarness,
  type PanelDataPathInput,
} from "../../../../ops/control-spine/verification/panel-data-paths";
```

### Cursor's Initial Read

Spine barrel re-export for tenant-scoped isolation scope construction used by panel data-path verification.

### CRITICAL — for Pattern 5 hits only

- **Underlying implementation path:** `ops/control-spine/verification/panel-data-paths/panelDataPathHarness.ts`
- **Underlying impl body (read it!):**

```ts
function buildIsolationDimension(tenantScopeKey: string, suffix: string) {
  return {
    isolationDimensionReferenceId: `dim-ref:${suffix}`,
    tenantScopeKey,
    boundaryReferenceIds: [`boundary:${suffix}`],
  };
}

export function buildIsolationScopeFromTenantId(tenantId: string): ControlSpineIsolationScope {
  return {
    customerTenantId: tenantId,
    firmTenantId: `${tenantId}:firm`,
    clientTenantId: `${tenantId}:client`,
    isolationScopeReferenceId: `scope:${tenantId}`,
    customerIsolation: buildIsolationDimension(tenantId, `customer:${tenantId}`),
    firmIsolation: buildIsolationDimension(`${tenantId}:firm`, `firm:${tenantId}`),
    clientIsolation: buildIsolationDimension(`${tenantId}:client`, `client:${tenantId}`),
  };
}
```

- **Cursor's assessment:** PRODUCTION-COMPLETE
- **Why:** Deterministic scope builder for customer/firm/client isolation dimensions — used by panel harness and static construction tests. Small but complete; not a stub.

### Diagnostic Questions for Founder

1. Is this test-harness helper also used in production composition paths, or verification-only?
2. Should verification namespace exports be excluded from stub inventory?

### Founder Classification (leave blank — founder fills in)

- [ ] STUB-CONFIRMED
- [ ] INTENTIONAL-PATTERN
- [ ] FALSE-POSITIVE
- [ ] DEFERRED

---

## Hit 13 of 13

- **File:** `lib/intelligence/synthetic/spine/index.ts`
- **Line/Column:** 7:1
- **Function:** `panelDataPathHarness`
- **Signature:** `export const panelDataPathHarness: PanelDataPathHarness & PanelDataPathHarnessMarker`
- **Pattern matched:** 5
- **Vertical:** CONTROL
- **Domain:** compute

### Code Context (lines 33-41)

```ts
export {
  buildActivationScopeFromTenantId,
  buildIsolationScopeFromTenantId,
  createPanelDataPathHarness,
  panelDataPathHarness,
  type PanelAssertionResult,
  type PanelDataPathHarness,
  type PanelDataPathInput,
} from "../../../../ops/control-spine/verification/panel-data-paths";
```

### Cursor's Initial Read

Default singleton instance of the panel data-path harness, re-exported through the spine barrel for composition consumers.

### CRITICAL — for Pattern 5 hits only

- **Underlying implementation path:** `ops/control-spine/verification/panel-data-paths/panelDataPathHarness.ts`
- **Underlying impl body (read it!):**

```ts
export function createPanelDataPathHarness(
  registry: OverlayActivationRegistry = createOverlayActivationRegistry(
    "registry:panel-data-path-default",
  ),
): PanelDataPathHarness & PanelDataPathHarnessMarker {
  const harness: PanelDataPathHarness = {
    assertNoPhiOutsideOverlay(input: PanelDataPathInput): PanelAssertionResult { /* PHI + overlay checks */ },
    assertPanelOverlayScope(input: PanelDataPathInput & { phi: boolean }): PanelAssertionResult { /* ... */ },
    assertTenantScope(input: PanelDataPathInput & { phi: boolean }): PanelAssertionResult { /* ... */ },
    proveRenderedPanelBoundary(input: RenderedPanelProofInput): RenderedPanelProofResult { /* ... */ },
  };

  return Object.assign(harness, {
    panelDataPathHarnessId: "panel-data-path-harness:default",
    panelDataPathHarnessKey: "panel-data-path-harness:default",
    containsVerticalComplianceLogic: false as const,
    executable: false as const,
  });
}

export const panelDataPathHarness = createPanelDataPathHarness();
```

(Full file is ~390 lines with complete PHI overlay, cross-tenant, and persona-scope assertion logic.)

- **Cursor's assessment:** PRODUCTION-COMPLETE
- **Why:** Full panel data-path verification harness with four assertion methods, HIPAA overlay resolution, isolation composition via `classifyIsolationReach`, and static construction test coverage. Metadata-only (`executable: false`) by design.

### Diagnostic Questions for Founder

1. Is `panelDataPathHarness` verification-only, or does it gate runtime panel rendering?
2. Should harness singletons be excluded from G2 stub scope entirely?

### Founder Classification (leave blank — founder fills in)

- [ ] STUB-CONFIRMED
- [ ] INTENTIONAL-PATTERN
- [ ] FALSE-POSITIVE
- [ ] DEFERRED

---

## Aggregate Findings (Cursor's recommended classification)

- **STUB-CONFIRMED candidates:** 0 (list line refs: none)
- **INTENTIONAL-PATTERN candidates:** 12 (Hits 2–13 — documented barrel re-exports with complete underlying implementations)
- **FALSE-POSITIVE candidates:** 1 (Hit 1 — `nonPlaceholderEntities` at `scheduleDiagnostics.ts:109`; name contains `placeholder` but behavior is anti-placeholder filtering)
- **UNCLEAR (need founder review):** 0 (list line refs: none)

## Pattern 5 Implementation Traceback Summary

| Hit | Barrel Path | Underlying Impl Path | Assessment |
| --- | --- | --- | --- |
| 2 | `lib/.../manufacturing/variance/index.ts` | `lib/.../variance/directMaterials.ts` → `mixVariance` | PRODUCTION-COMPLETE |
| 3 | `lib/.../manufacturing/variance/index.ts` | `lib/.../variance/directMaterials.ts` → `yieldVariance` | PRODUCTION-COMPLETE |
| 4 | `lib/.../manufacturing/variance/index.ts` | `lib/.../variance/directLabor.ts` → `efficiencyVariance` | PRODUCTION-COMPLETE |
| 5 | `lib/.../manufacturing/variance/index.ts` | `lib/.../variance/directLabor.ts` → `rateVariance` | PRODUCTION-COMPLETE |
| 6 | `lib/.../manufacturing/variance/index.ts` | `lib/.../variance/variableOverhead.ts` → `efficiencyVariance` | PRODUCTION-COMPLETE |
| 7 | `lib/.../manufacturing/variance/index.ts` | `lib/.../variance/variableOverhead.ts` → `spendingVariance` | PRODUCTION-COMPLETE |
| 8 | `lib/.../manufacturing/variance/index.ts` | `lib/.../variance/fixedOverhead.ts` → `spendingVariance` | PRODUCTION-COMPLETE |
| 9 | `lib/.../manufacturing/variance/index.ts` | `lib/.../variance/fixedOverhead.ts` → `volumeVariance` | PRODUCTION-COMPLETE |
| 10 | `lib/intelligence/synthetic/spine/index.ts` | `ops/control-spine/isolation/evaluateIsolationBoundary.ts` → `classifyIsolationReach` | PRODUCTION-COMPLETE |
| 11 | `lib/intelligence/synthetic/spine/index.ts` | `ops/control-spine/rbac/evaluateRbacAccess.ts` → `evaluateRbacAccess` | PRODUCTION-COMPLETE |
| 12 | `lib/intelligence/synthetic/spine/index.ts` | `ops/control-spine/verification/panel-data-paths/panelDataPathHarness.ts` → `buildIsolationScopeFromTenantId` | PRODUCTION-COMPLETE |
| 13 | `lib/intelligence/synthetic/spine/index.ts` | `ops/control-spine/verification/panel-data-paths/panelDataPathHarness.ts` → `panelDataPathHarness` | PRODUCTION-COMPLETE |

**Pattern 5 underlying impl assessment totals:** PRODUCTION-COMPLETE: 12 · PRODUCTION-LITE: 0 · EMPTY-STUB: 0 · UNCLEAR: 0

## Cursor's Recommendation

**Close G2 on hard-stub grounds** — the inventory correctly found zero hard signals, and every soft signal traces to either an intentional public barrel (12 hits) or a pattern-7 naming false positive (1 hit). No underlying EMPTY-STUB implementations were found behind the barrels. Optional follow-up (not blocking): tune the scanner in a future phase to suppress documented `index.ts` barrels and negated `placeholder` name prefixes, so the soft review queue stays empty on clean repos.
