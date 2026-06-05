import {
  buildFteObservation,
  type BuildFteObservationInput,
  type BuildFteObservationResult,
} from "./buildFteObservation";
import type { SyntheticFteObservation } from "../types";

export interface BuildFteObservationsInput {
  requests: BuildFteObservationInput[];
}

export interface BuildFteObservationsResult {
  observations: SyntheticFteObservation[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildFteObservationResult[];
}

export function buildFteObservations(input: BuildFteObservationsInput): BuildFteObservationsResult {
  const observations: SyntheticFteObservation[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildFteObservationResult[] = [];

  input.requests.forEach((request, index) => {
    const result = buildFteObservation(request);
    results.push(result);

    if (result.observation) {
      observations.push(result.observation);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    observations,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
