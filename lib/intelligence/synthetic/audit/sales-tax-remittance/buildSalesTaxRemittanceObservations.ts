import {
  buildSalesTaxRemittanceObservation,
  type BuildSalesTaxRemittanceObservationInput,
  type SyntheticSalesTaxRemittanceObservation,
} from "./buildSalesTaxRemittanceObservation";

export interface BuildSalesTaxRemittanceObservationsInput {
  observations: BuildSalesTaxRemittanceObservationInput[];
}

export interface BuildSalesTaxRemittanceObservationsResult {
  salesTaxRemittanceObservations: SyntheticSalesTaxRemittanceObservation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildSalesTaxRemittanceObservations(
  input: BuildSalesTaxRemittanceObservationsInput,
): BuildSalesTaxRemittanceObservationsResult {
  const salesTaxRemittanceObservations: SyntheticSalesTaxRemittanceObservation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.observations.forEach((observationInput, index) => {
    const result = buildSalesTaxRemittanceObservation(observationInput);

    if (result.salesTaxRemittanceObservation) {
      salesTaxRemittanceObservations.push(result.salesTaxRemittanceObservation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `observation[${index}]: ${warning}`));
  });

  return {
    salesTaxRemittanceObservations,
    skippedIndexes,
    warnings,
  };
}
