import {
  buildTaxIntelligenceObservation,
  type BuildTaxIntelligenceObservationInput,
  type BuildTaxIntelligenceObservationResult,
  type SyntheticTaxIntelligenceObservation,
} from "./buildTaxIntelligenceObservation";

export interface BuildTaxIntelligenceObservationsInput {
  requests: BuildTaxIntelligenceObservationInput[];
}

export interface BuildTaxIntelligenceObservationsResult {
  taxIntelligenceObservations: SyntheticTaxIntelligenceObservation[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildTaxIntelligenceObservationResult[];
}

export function buildTaxIntelligenceObservations(
  input: BuildTaxIntelligenceObservationsInput,
): BuildTaxIntelligenceObservationsResult {
  const taxIntelligenceObservations: SyntheticTaxIntelligenceObservation[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildTaxIntelligenceObservationResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      taxIntelligenceObservations,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildTaxIntelligenceObservation(request);
    results.push(result);

    if (result.taxIntelligenceObservation) {
      taxIntelligenceObservations.push(result.taxIntelligenceObservation);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    taxIntelligenceObservations,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
