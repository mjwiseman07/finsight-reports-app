import type {
  ManufacturingVarianceField,
} from "../../../../../dashboard/panels/manufacturing-variance/contract";
import type { ManufacturingSubSegment } from "../../contracts/manufacturing/ManufacturingBasisContracts";
import { makeSignedDollar } from "./signedDollar";

export const IMA_SCVA_CITATION =
  "IMA — Statement on Management Accounting / standard costing & variance analysis (SCVA framework)";

export function buildVarianceField(
  id: string,
  label: string,
  amountUsd: number,
  applicableSubSegments: ManufacturingSubSegment[],
  unitOfMeasure: string,
  basisOfStandards: string = IMA_SCVA_CITATION,
): ManufacturingVarianceField {
  return {
    id,
    label,
    value: makeSignedDollar(amountUsd),
    basisOfStandards,
    unitOfMeasure,
    applicableSubSegments,
  };
}
