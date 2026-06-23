import type { ManufacturingVarianceField } from "../../../../../dashboard/panels/manufacturing-variance/contract";
import { buildVarianceField } from "./fieldBuilder";
import type { ManufacturingEvaluatorResult } from "./types";

/** MFG-V-08: Σ MFG-V-01..07b */
export function totalManufacturingCost(
  components: ManufacturingVarianceField[],
  unitOfMeasure: string,
): ManufacturingEvaluatorResult<ManufacturingVarianceField> {
  const amountUsd = components.reduce((sum, field) => sum + field.value.amountUsd, 0);

  return {
    ok: true,
    value: buildVarianceField(
      "MFG-V-08",
      "Total Manufacturing Cost Variance",
      amountUsd,
      components[0]?.applicableSubSegments ?? ["D", "P", "H", "J", "E"],
      unitOfMeasure,
    ),
  };
}

/** MFG-FV-08: Σ MFG-FV-01..07b */
export function totalManufacturingCostForecast(
  components: ManufacturingVarianceField[],
  unitOfMeasure: string,
): ManufacturingEvaluatorResult<ManufacturingVarianceField> {
  const amountUsd = components.reduce((sum, field) => sum + field.value.amountUsd, 0);

  return {
    ok: true,
    value: buildVarianceField(
      "MFG-FV-08",
      "Forecast Total Manufacturing Cost Variance",
      amountUsd,
      components[0]?.applicableSubSegments ?? ["D", "P", "H", "J", "E"],
      unitOfMeasure,
      components[0]?.basisOfStandards,
    ),
  };
}
