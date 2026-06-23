import type { ReportingBasis } from "../../../standards/contracts/ReportingBasis";
import type {
  IFRSManufacturingEvaluatorInputs,
  ManufacturingEvaluatorResult,
  USGAAPManufacturingEvaluatorInputs,
} from "./types";

export function resolveStandardMaterialPrice(
  inputs: USGAAPManufacturingEvaluatorInputs | IFRSManufacturingEvaluatorInputs,
): ManufacturingEvaluatorResult<number> {
  if (inputs.context.reportingBasis !== inputs.reportingBasis) {
    return { ok: false, error: "BASIS_MISMATCH" };
  }

  if (inputs.reportingBasis === "US_GAAP") {
    return { ok: true, value: inputs.directMaterials.standardPrice };
  }

  return { ok: true, value: inputs.ifrsRecastStandardPrice };
}

export function assertReportingBasisConsistency(
  contextBasis: ReportingBasis,
  inputBasis: ReportingBasis,
): ManufacturingEvaluatorResult<void> {
  if (contextBasis !== inputBasis) {
    return { ok: false, error: "BASIS_MISMATCH" };
  }
  return { ok: true, value: undefined };
}
