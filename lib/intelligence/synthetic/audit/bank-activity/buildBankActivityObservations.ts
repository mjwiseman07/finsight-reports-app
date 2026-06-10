import {
  buildBankActivityObservation,
  type BuildBankActivityObservationInput,
  type BuildBankActivityObservationResult,
  type SyntheticBankActivityObservation,
} from "./buildBankActivityObservation";

export interface BuildBankActivityObservationsInput {
  requests: BuildBankActivityObservationInput[];
}

export interface BuildBankActivityObservationsResult {
  bankActivityObservations: SyntheticBankActivityObservation[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildBankActivityObservationResult[];
}

export function buildBankActivityObservations(
  input: BuildBankActivityObservationsInput,
): BuildBankActivityObservationsResult {
  const bankActivityObservations: SyntheticBankActivityObservation[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildBankActivityObservationResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      bankActivityObservations,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildBankActivityObservation(request);
    results.push(result);

    if (result.bankActivityObservation) {
      bankActivityObservations.push(result.bankActivityObservation);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    bankActivityObservations,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
