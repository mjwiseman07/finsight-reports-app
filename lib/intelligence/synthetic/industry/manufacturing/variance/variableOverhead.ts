import type { ManufacturingVarianceField } from "../../../../../dashboard/panels/manufacturing-variance/contract";
import type { ManufacturingSubSegment } from "../../contracts/manufacturing/ManufacturingBasisContracts";
import { buildVarianceField } from "./fieldBuilder";
import type { ManufacturingEvaluatorResult, VariableOverheadCostInputs } from "./types";

const ALL_SUB_SEGMENTS: ManufacturingSubSegment[] = ["D", "P", "H", "J", "E"];

function isFiniteNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

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

export function evaluateVariableOverhead(
  inputs: VariableOverheadCostInputs,
  unitOfMeasure: string,
): ManufacturingEvaluatorResult<{
  variableOverheadSpendingVariance: ManufacturingVarianceField;
  variableOverheadEfficiencyVariance: ManufacturingVarianceField;
}> {
  const spendingResult = spendingVariance(inputs, unitOfMeasure);
  if (!spendingResult.ok) return spendingResult;

  const efficiencyResult = efficiencyVariance(inputs, unitOfMeasure);
  if (!efficiencyResult.ok) return efficiencyResult;

  return {
    ok: true,
    value: {
      variableOverheadSpendingVariance: spendingResult.value,
      variableOverheadEfficiencyVariance: efficiencyResult.value,
    },
  };
}
