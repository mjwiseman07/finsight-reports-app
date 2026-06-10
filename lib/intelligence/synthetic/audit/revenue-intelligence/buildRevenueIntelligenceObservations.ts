import {
  buildRevenueIntelligenceObservation,
  type BuildRevenueIntelligenceObservationInput,
  type BuildRevenueIntelligenceObservationResult,
  type SyntheticRevenueIntelligenceObservation,
} from "./buildRevenueIntelligenceObservation";

export interface BuildRevenueIntelligenceObservationsInput {
  requests: BuildRevenueIntelligenceObservationInput[];
}

export interface BuildRevenueIntelligenceObservationsResult {
  revenueIntelligenceObservations: SyntheticRevenueIntelligenceObservation[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildRevenueIntelligenceObservationResult[];
}

export function buildRevenueIntelligenceObservations(
  input: BuildRevenueIntelligenceObservationsInput,
): BuildRevenueIntelligenceObservationsResult {
  const revenueIntelligenceObservations: SyntheticRevenueIntelligenceObservation[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildRevenueIntelligenceObservationResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      revenueIntelligenceObservations,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildRevenueIntelligenceObservation(request);
    results.push(result);

    if (result.revenueIntelligenceObservation) {
      revenueIntelligenceObservations.push(result.revenueIntelligenceObservation);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    revenueIntelligenceObservations,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
