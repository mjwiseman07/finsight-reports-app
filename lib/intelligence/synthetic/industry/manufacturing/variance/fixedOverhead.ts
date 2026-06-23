import type { ManufacturingVarianceField } from "../../../../../dashboard/panels/manufacturing-variance/contract";
import type { ManufacturingSubSegment } from "../../contracts/manufacturing/ManufacturingBasisContracts";
import { buildVarianceField } from "./fieldBuilder";
import type { FixedOverheadCostInputs, ManufacturingEvaluatorResult } from "./types";

const ALL_SUB_SEGMENTS: ManufacturingSubSegment[] = ["D", "P", "H", "J", "E"];

function isFiniteNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

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

export function evaluateFixedOverhead(
  inputs: FixedOverheadCostInputs,
  unitOfMeasure: string,
): ManufacturingEvaluatorResult<{
  fixedOverheadSpendingVariance: ManufacturingVarianceField;
  fixedOverheadVolumeVariance: ManufacturingVarianceField;
}> {
  const spendingResult = spendingVariance(inputs, unitOfMeasure);
  if (!spendingResult.ok) return spendingResult;

  const volumeResult = volumeVariance(inputs, unitOfMeasure);
  if (!volumeResult.ok) return volumeResult;

  return {
    ok: true,
    value: {
      fixedOverheadSpendingVariance: spendingResult.value,
      fixedOverheadVolumeVariance: volumeResult.value,
    },
  };
}
