import {
  buildCashApplicationObservation,
  type BuildCashApplicationObservationInput,
  type BuildCashApplicationObservationResult,
  type SyntheticCashApplicationObservation,
} from "./buildCashApplicationObservation";

export interface BuildCashApplicationObservationsInput {
  requests: BuildCashApplicationObservationInput[];
}

export interface BuildCashApplicationObservationsResult {
  cashApplicationObservations: SyntheticCashApplicationObservation[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildCashApplicationObservationResult[];
}

export function buildCashApplicationObservations(
  input: BuildCashApplicationObservationsInput,
): BuildCashApplicationObservationsResult {
  const cashApplicationObservations: SyntheticCashApplicationObservation[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildCashApplicationObservationResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      cashApplicationObservations,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildCashApplicationObservation(request);
    results.push(result);

    if (result.cashApplicationObservation) {
      cashApplicationObservations.push(result.cashApplicationObservation);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    cashApplicationObservations,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
