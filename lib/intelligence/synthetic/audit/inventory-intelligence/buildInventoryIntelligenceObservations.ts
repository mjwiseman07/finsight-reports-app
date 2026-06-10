import {
  buildInventoryIntelligenceObservation,
  type BuildInventoryIntelligenceObservationInput,
  type BuildInventoryIntelligenceObservationResult,
  type SyntheticInventoryIntelligenceObservation,
} from "./buildInventoryIntelligenceObservation";

export interface BuildInventoryIntelligenceObservationsInput {
  requests: BuildInventoryIntelligenceObservationInput[];
}

export interface BuildInventoryIntelligenceObservationsResult {
  inventoryIntelligenceObservations: SyntheticInventoryIntelligenceObservation[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildInventoryIntelligenceObservationResult[];
}

export function buildInventoryIntelligenceObservations(
  input: BuildInventoryIntelligenceObservationsInput,
): BuildInventoryIntelligenceObservationsResult {
  const inventoryIntelligenceObservations: SyntheticInventoryIntelligenceObservation[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildInventoryIntelligenceObservationResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      inventoryIntelligenceObservations,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildInventoryIntelligenceObservation(request);
    results.push(result);

    if (result.inventoryIntelligenceObservation) {
      inventoryIntelligenceObservations.push(result.inventoryIntelligenceObservation);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    inventoryIntelligenceObservations,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
