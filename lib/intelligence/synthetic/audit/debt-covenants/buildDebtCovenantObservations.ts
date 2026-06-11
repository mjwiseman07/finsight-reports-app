import {
  buildDebtCovenantObservation,
  type BuildDebtCovenantObservationInput,
  type SyntheticDebtCovenantObservation,
} from "./buildDebtCovenantObservation";

export interface BuildDebtCovenantObservationsInput {
  observations: BuildDebtCovenantObservationInput[];
}

export interface BuildDebtCovenantObservationsResult {
  debtCovenantObservations: SyntheticDebtCovenantObservation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildDebtCovenantObservations(
  input: BuildDebtCovenantObservationsInput,
): BuildDebtCovenantObservationsResult {
  const debtCovenantObservations: SyntheticDebtCovenantObservation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.observations.forEach((observationInput, index) => {
    const result = buildDebtCovenantObservation(observationInput);

    if (result.debtCovenantObservation) {
      debtCovenantObservations.push(result.debtCovenantObservation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `observation[${index}]: ${warning}`));
  });

  return {
    debtCovenantObservations,
    skippedIndexes,
    warnings,
  };
}
