import {
  buildRecurringPatternObservation,
  type BuildRecurringPatternObservationInput,
  type BuildRecurringPatternObservationResult,
  type SyntheticRecurringPatternObservation,
} from "./buildRecurringPatternObservation";

export interface BuildRecurringPatternObservationsInput {
  requests: BuildRecurringPatternObservationInput[];
}

export interface BuildRecurringPatternObservationsResult {
  recurringPatternObservations: SyntheticRecurringPatternObservation[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildRecurringPatternObservationResult[];
}

export function buildRecurringPatternObservations(
  input: BuildRecurringPatternObservationsInput,
): BuildRecurringPatternObservationsResult {
  const recurringPatternObservations: SyntheticRecurringPatternObservation[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildRecurringPatternObservationResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      recurringPatternObservations,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildRecurringPatternObservation(request);
    results.push(result);

    if (result.recurringPatternObservation) {
      recurringPatternObservations.push(result.recurringPatternObservation);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    recurringPatternObservations,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
