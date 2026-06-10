import {
  buildReconciliationObservation,
  type BuildReconciliationObservationInput,
  type BuildReconciliationObservationResult,
  type SyntheticReconciliationObservation,
} from "./buildReconciliationObservation";

export interface BuildReconciliationObservationsInput {
  requests: BuildReconciliationObservationInput[];
}

export interface BuildReconciliationObservationsResult {
  reconciliationObservations: SyntheticReconciliationObservation[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildReconciliationObservationResult[];
}

export function buildReconciliationObservations(
  input: BuildReconciliationObservationsInput,
): BuildReconciliationObservationsResult {
  const reconciliationObservations: SyntheticReconciliationObservation[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildReconciliationObservationResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      reconciliationObservations,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildReconciliationObservation(request);
    results.push(result);

    if (result.reconciliationObservation) {
      reconciliationObservations.push(result.reconciliationObservation);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    reconciliationObservations,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
