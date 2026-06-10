import {
  buildReserveIntelligenceObservation,
  type BuildReserveIntelligenceObservationInput,
  type BuildReserveIntelligenceObservationResult,
  type SyntheticReserveIntelligenceObservation,
} from "./buildReserveIntelligenceObservation";

export interface BuildReserveIntelligenceObservationsInput {
  requests: BuildReserveIntelligenceObservationInput[];
}

export interface BuildReserveIntelligenceObservationsResult {
  reserveIntelligenceObservations: SyntheticReserveIntelligenceObservation[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildReserveIntelligenceObservationResult[];
}

export function buildReserveIntelligenceObservations(
  input: BuildReserveIntelligenceObservationsInput,
): BuildReserveIntelligenceObservationsResult {
  const reserveIntelligenceObservations: SyntheticReserveIntelligenceObservation[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildReserveIntelligenceObservationResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      reserveIntelligenceObservations,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildReserveIntelligenceObservation(request);
    results.push(result);

    if (result.reserveIntelligenceObservation) {
      reserveIntelligenceObservations.push(result.reserveIntelligenceObservation);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    reserveIntelligenceObservations,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
