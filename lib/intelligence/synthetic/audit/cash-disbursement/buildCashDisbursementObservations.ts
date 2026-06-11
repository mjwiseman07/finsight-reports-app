import {
  buildCashDisbursementObservation,
  type BuildCashDisbursementObservationInput,
  type SyntheticCashDisbursementObservation,
} from "./buildCashDisbursementObservation";

export interface BuildCashDisbursementObservationsInput {
  observations: BuildCashDisbursementObservationInput[];
}

export interface BuildCashDisbursementObservationsResult {
  cashDisbursementObservations: SyntheticCashDisbursementObservation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildCashDisbursementObservations(
  input: BuildCashDisbursementObservationsInput,
): BuildCashDisbursementObservationsResult {
  const cashDisbursementObservations: SyntheticCashDisbursementObservation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.observations.forEach((observationInput, index) => {
    const result = buildCashDisbursementObservation(observationInput);

    if (result.cashDisbursementObservation) {
      cashDisbursementObservations.push(result.cashDisbursementObservation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `observation[${index}]: ${warning}`));
  });

  return {
    cashDisbursementObservations,
    skippedIndexes,
    warnings,
  };
}
