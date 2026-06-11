import {
  buildTaxToInvoiceObservation,
  type BuildTaxToInvoiceObservationInput,
  type SyntheticTaxToInvoiceObservation,
} from "./buildTaxToInvoiceObservation";

export interface BuildTaxToInvoiceObservationsInput {
  observations: BuildTaxToInvoiceObservationInput[];
}

export interface BuildTaxToInvoiceObservationsResult {
  taxToInvoiceObservations: SyntheticTaxToInvoiceObservation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildTaxToInvoiceObservations(input: BuildTaxToInvoiceObservationsInput): BuildTaxToInvoiceObservationsResult {
  const taxToInvoiceObservations: SyntheticTaxToInvoiceObservation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.observations.forEach((observationInput, index) => {
    const result = buildTaxToInvoiceObservation(observationInput);

    if (result.taxToInvoiceObservation) {
      taxToInvoiceObservations.push(result.taxToInvoiceObservation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `observation[${index}]: ${warning}`));
  });

  return {
    taxToInvoiceObservations,
    skippedIndexes,
    warnings,
  };
}
