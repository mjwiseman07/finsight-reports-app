import type { ManufacturingVarianceField } from "../../../../../dashboard/panels/manufacturing-variance/contract";
import type { ManufacturingSubSegment } from "../../contracts/manufacturing/ManufacturingBasisContracts";
import { buildVarianceField } from "./fieldBuilder";
import type { DirectLaborCostInputs, ManufacturingEvaluatorResult } from "./types";

const ALL_SUB_SEGMENTS: ManufacturingSubSegment[] = ["D", "P", "H", "J", "E"];

function isFiniteNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

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

export function evaluateDirectLabor(
  inputs: DirectLaborCostInputs,
  unitOfMeasure: string,
): ManufacturingEvaluatorResult<{
  directLaborRateVariance: ManufacturingVarianceField;
  directLaborEfficiencyVariance: ManufacturingVarianceField;
}> {
  const rateResult = rateVariance(inputs, unitOfMeasure);
  if (!rateResult.ok) return rateResult;

  const efficiencyResult = efficiencyVariance(inputs, unitOfMeasure);
  if (!efficiencyResult.ok) return efficiencyResult;

  return {
    ok: true,
    value: {
      directLaborRateVariance: rateResult.value,
      directLaborEfficiencyVariance: efficiencyResult.value,
    },
  };
}
