import {
  buildMissingActivityObservation,
  type BuildMissingActivityObservationInput,
  type BuildMissingActivityObservationResult,
  type SyntheticMissingActivityObservation,
} from "./buildMissingActivityObservation";

export interface BuildMissingActivityObservationsInput {
  requests: BuildMissingActivityObservationInput[];
}

export interface BuildMissingActivityObservationsResult {
  missingActivityObservations: SyntheticMissingActivityObservation[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildMissingActivityObservationResult[];
}

export function buildMissingActivityObservations(
  input: BuildMissingActivityObservationsInput,
): BuildMissingActivityObservationsResult {
  const missingActivityObservations: SyntheticMissingActivityObservation[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildMissingActivityObservationResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      missingActivityObservations,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildMissingActivityObservation(request);
    results.push(result);

    if (result.missingActivityObservation) {
      missingActivityObservations.push(result.missingActivityObservation);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    missingActivityObservations,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
