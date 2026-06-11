import {
  buildCustomerTaxValidationObservation,
  type BuildCustomerTaxValidationObservationInput,
  type SyntheticCustomerTaxValidationObservation,
} from "./buildCustomerTaxValidationObservation";

export interface BuildCustomerTaxValidationObservationsInput {
  observations: BuildCustomerTaxValidationObservationInput[];
}

export interface BuildCustomerTaxValidationObservationsResult {
  customerTaxValidationObservations: SyntheticCustomerTaxValidationObservation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildCustomerTaxValidationObservations(
  input: BuildCustomerTaxValidationObservationsInput,
): BuildCustomerTaxValidationObservationsResult {
  const customerTaxValidationObservations: SyntheticCustomerTaxValidationObservation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.observations.forEach((observationInput, index) => {
    const result = buildCustomerTaxValidationObservation(observationInput);

    if (result.customerTaxValidationObservation) {
      customerTaxValidationObservations.push(result.customerTaxValidationObservation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `observation[${index}]: ${warning}`));
  });

  return {
    customerTaxValidationObservations,
    skippedIndexes,
    warnings,
  };
}
