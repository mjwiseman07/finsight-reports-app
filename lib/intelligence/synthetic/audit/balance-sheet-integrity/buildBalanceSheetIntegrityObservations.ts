import {
  buildBalanceSheetIntegrityObservation,
  type BuildBalanceSheetIntegrityObservationInput,
  type SyntheticBalanceSheetIntegrityObservation,
} from "./buildBalanceSheetIntegrityObservation";

export interface BuildBalanceSheetIntegrityObservationsInput {
  observations: BuildBalanceSheetIntegrityObservationInput[];
}

export interface BuildBalanceSheetIntegrityObservationsResult {
  balanceSheetIntegrityObservations: SyntheticBalanceSheetIntegrityObservation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildBalanceSheetIntegrityObservations(
  input: BuildBalanceSheetIntegrityObservationsInput,
): BuildBalanceSheetIntegrityObservationsResult {
  const balanceSheetIntegrityObservations: SyntheticBalanceSheetIntegrityObservation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.observations.forEach((observationInput, index) => {
    const result = buildBalanceSheetIntegrityObservation(observationInput);

    if (result.balanceSheetIntegrityObservation) {
      balanceSheetIntegrityObservations.push(result.balanceSheetIntegrityObservation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `observation[${index}]: ${warning}`));
  });

  return {
    balanceSheetIntegrityObservations,
    skippedIndexes,
    warnings,
  };
}
