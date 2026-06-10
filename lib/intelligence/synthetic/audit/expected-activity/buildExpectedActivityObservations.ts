import {
  buildExpectedActivityObservation,
  type BuildExpectedActivityObservationInput,
  type BuildExpectedActivityObservationResult,
  type SyntheticExpectedActivityObservation,
} from "./buildExpectedActivityObservation";

export interface BuildExpectedActivityObservationsInput {
  requests: BuildExpectedActivityObservationInput[];
}

export interface BuildExpectedActivityObservationsResult {
  expectedActivityObservations: SyntheticExpectedActivityObservation[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildExpectedActivityObservationResult[];
}

export function buildExpectedActivityObservations(
  input: BuildExpectedActivityObservationsInput,
): BuildExpectedActivityObservationsResult {
  const expectedActivityObservations: SyntheticExpectedActivityObservation[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildExpectedActivityObservationResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      expectedActivityObservations,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildExpectedActivityObservation(request);
    results.push(result);

    if (result.expectedActivityObservation) {
      expectedActivityObservations.push(result.expectedActivityObservation);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    expectedActivityObservations,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
