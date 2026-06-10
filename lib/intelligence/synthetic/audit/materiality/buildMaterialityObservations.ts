import {
  buildMaterialityObservation,
  type BuildMaterialityObservationInput,
  type BuildMaterialityObservationResult,
  type SyntheticMaterialityObservation,
} from "./buildMaterialityObservation";

export interface BuildMaterialityObservationsInput {
  requests: BuildMaterialityObservationInput[];
}

export interface BuildMaterialityObservationsResult {
  materialityObservations: SyntheticMaterialityObservation[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildMaterialityObservationResult[];
}

export function buildMaterialityObservations(input: BuildMaterialityObservationsInput): BuildMaterialityObservationsResult {
  const materialityObservations: SyntheticMaterialityObservation[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildMaterialityObservationResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      materialityObservations,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildMaterialityObservation(request);
    results.push(result);

    if (result.materialityObservation) {
      materialityObservations.push(result.materialityObservation);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    materialityObservations,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
