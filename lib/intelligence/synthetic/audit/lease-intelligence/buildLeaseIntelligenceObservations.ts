import {
  buildLeaseIntelligenceObservation,
  type BuildLeaseIntelligenceObservationInput,
  type BuildLeaseIntelligenceObservationResult,
  type SyntheticLeaseIntelligenceObservation,
} from "./buildLeaseIntelligenceObservation";

export interface BuildLeaseIntelligenceObservationsInput {
  requests: BuildLeaseIntelligenceObservationInput[];
}

export interface BuildLeaseIntelligenceObservationsResult {
  leaseIntelligenceObservations: SyntheticLeaseIntelligenceObservation[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildLeaseIntelligenceObservationResult[];
}

export function buildLeaseIntelligenceObservations(
  input: BuildLeaseIntelligenceObservationsInput,
): BuildLeaseIntelligenceObservationsResult {
  const leaseIntelligenceObservations: SyntheticLeaseIntelligenceObservation[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildLeaseIntelligenceObservationResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      leaseIntelligenceObservations,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildLeaseIntelligenceObservation(request);
    results.push(result);

    if (result.leaseIntelligenceObservation) {
      leaseIntelligenceObservations.push(result.leaseIntelligenceObservation);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    leaseIntelligenceObservations,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
