import type { ManufacturingVarianceField } from "../../../../../dashboard/panels/manufacturing-variance/contract";
import type { ManufacturingSubSegment } from "../../contracts/manufacturing/ManufacturingBasisContracts";
import { buildVarianceField } from "./fieldBuilder";
import { resolveStandardMaterialPrice } from "./ifrsRecast";
import type {
  DirectMaterialsCostInputs,
  IFRSManufacturingEvaluatorInputs,
  ManufacturingEvaluatorResult,
  MixComponentInput,
  USGAAPManufacturingEvaluatorInputs,
} from "./types";

const ALL_SUB_SEGMENTS: ManufacturingSubSegment[] = ["D", "P", "H", "J", "E"];
const MIX_YIELD_SUB_SEGMENTS: ManufacturingSubSegment[] = ["P", "H"];

function isFiniteNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** MFG-V-01: (Actual Price - Standard Price) × Actual Quantity Purchased */
export function priceVariance(
  inputs: DirectMaterialsCostInputs,
  standardPrice: number,
  unitOfMeasure: string,
): ManufacturingEvaluatorResult<ManufacturingVarianceField> {
  if (!isFiniteNumber(standardPrice) || !isFiniteNumber(inputs.actualPrice) || !isFiniteNumber(inputs.actualQuantityPurchased)) {
    return { ok: false, error: "MISSING_STANDARD_COST" };
  }

  const amountUsd = (inputs.actualPrice - standardPrice) * inputs.actualQuantityPurchased;
  return {
    ok: true,
    value: buildVarianceField("MFG-V-01", "Direct Materials Price Variance", amountUsd, ALL_SUB_SEGMENTS, unitOfMeasure),
  };
}

/** MFG-V-02: (Actual Quantity Used - Standard Quantity Allowed) × Standard Price */
export function usageVariance(
  inputs: DirectMaterialsCostInputs,
  standardPrice: number,
  unitOfMeasure: string,
): ManufacturingEvaluatorResult<ManufacturingVarianceField> {
  if (
    !isFiniteNumber(standardPrice) ||
    !isFiniteNumber(inputs.actualQuantityUsed) ||
    !isFiniteNumber(inputs.standardQuantityAllowed)
  ) {
    return { ok: false, error: "MISSING_STANDARD_COST" };
  }

  const amountUsd = (inputs.actualQuantityUsed - inputs.standardQuantityAllowed) * standardPrice;
  return {
    ok: true,
    value: buildVarianceField("MFG-V-02", "Direct Materials Usage Variance", amountUsd, ALL_SUB_SEGMENTS, unitOfMeasure),
  };
}

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

export function evaluateDirectMaterials(
  evaluatorInputs: USGAAPManufacturingEvaluatorInputs | IFRSManufacturingEvaluatorInputs,
): ManufacturingEvaluatorResult<{
  directMaterialsPriceVariance: ManufacturingVarianceField;
  directMaterialsUsageVariance: ManufacturingVarianceField;
  directMaterialsMixVariance?: ManufacturingVarianceField;
  directMaterialsYieldVariance?: ManufacturingVarianceField;
}> {
  const standardPriceResult = resolveStandardMaterialPrice(evaluatorInputs);
  if (!standardPriceResult.ok) return standardPriceResult;

  const priceResult = priceVariance(
    evaluatorInputs.directMaterials,
    standardPriceResult.value,
    evaluatorInputs.unitOfMeasure,
  );
  if (!priceResult.ok) return priceResult;

  const usageResult = usageVariance(
    evaluatorInputs.directMaterials,
    standardPriceResult.value,
    evaluatorInputs.unitOfMeasure,
  );
  if (!usageResult.ok) return usageResult;

  const subSegment = evaluatorInputs.context.subSegment;
  const includeMixYield = subSegment === "P" || subSegment === "H";

  let directMaterialsMixVariance: ManufacturingVarianceField | undefined;
  let directMaterialsYieldVariance: ManufacturingVarianceField | undefined;

  if (includeMixYield) {
    const mixResult = mixVariance(evaluatorInputs.directMaterials.mixComponents, evaluatorInputs.unitOfMeasure);
    if (mixResult.ok) {
      directMaterialsMixVariance = mixResult.value;
    }

    const yieldResult = yieldVariance(evaluatorInputs.directMaterials, evaluatorInputs.unitOfMeasure);
    if (yieldResult.ok) {
      directMaterialsYieldVariance = yieldResult.value;
    }
  }

  return {
    ok: true,
    value: {
      directMaterialsPriceVariance: priceResult.value,
      directMaterialsUsageVariance: usageResult.value,
      directMaterialsMixVariance,
      directMaterialsYieldVariance,
    },
  };
}
