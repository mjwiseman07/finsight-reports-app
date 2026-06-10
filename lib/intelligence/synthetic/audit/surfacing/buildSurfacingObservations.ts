import {
  buildSurfacingObservation,
  type BuildSurfacingObservationInput,
  type BuildSurfacingObservationResult,
  type SyntheticSurfacingObservation,
} from "./buildSurfacingObservation";

export interface BuildSurfacingObservationsInput {
  requests: BuildSurfacingObservationInput[];
}

export interface BuildSurfacingObservationsResult {
  surfacingObservations: SyntheticSurfacingObservation[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildSurfacingObservationResult[];
}

export function buildSurfacingObservations(input: BuildSurfacingObservationsInput): BuildSurfacingObservationsResult {
  const surfacingObservations: SyntheticSurfacingObservation[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildSurfacingObservationResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      surfacingObservations,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildSurfacingObservation(request);
    results.push(result);

    if (result.surfacingObservation) {
      surfacingObservations.push(result.surfacingObservation);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    surfacingObservations,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
