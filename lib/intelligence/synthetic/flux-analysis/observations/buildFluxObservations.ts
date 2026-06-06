import {
  buildFluxObservation,
  type BuildFluxObservationInput,
  type BuildFluxObservationResult,
} from "./buildFluxObservation";
import type { SyntheticFluxObservation } from "../types";

export interface BuildFluxObservationsInput {
  requests: BuildFluxObservationInput[];
}

export interface BuildFluxObservationsResult {
  observations: SyntheticFluxObservation[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildFluxObservationResult[];
}

export function buildFluxObservations(input: BuildFluxObservationsInput): BuildFluxObservationsResult {
  const observations: SyntheticFluxObservation[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildFluxObservationResult[] = [];

  input.requests.forEach((request, index) => {
    const result = buildFluxObservation(request);
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
