import {
  buildUnitCostIntelligenceObservation,
  type BuildUnitCostIntelligenceObservationInput,
  type BuildUnitCostIntelligenceObservationResult,
  type SyntheticUnitCostIntelligenceObservation,
} from "./buildUnitCostIntelligenceObservation";

export interface BuildUnitCostIntelligenceObservationsInput {
  requests: BuildUnitCostIntelligenceObservationInput[];
}

export interface BuildUnitCostIntelligenceObservationsResult {
  unitCostIntelligenceObservations: SyntheticUnitCostIntelligenceObservation[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildUnitCostIntelligenceObservationResult[];
}

export function buildUnitCostIntelligenceObservations(
  input: BuildUnitCostIntelligenceObservationsInput,
): BuildUnitCostIntelligenceObservationsResult {
  const unitCostIntelligenceObservations: SyntheticUnitCostIntelligenceObservation[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildUnitCostIntelligenceObservationResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      unitCostIntelligenceObservations,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildUnitCostIntelligenceObservation(request);
    results.push(result);

    if (result.unitCostIntelligenceObservation) {
      unitCostIntelligenceObservations.push(result.unitCostIntelligenceObservation);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    unitCostIntelligenceObservations,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
