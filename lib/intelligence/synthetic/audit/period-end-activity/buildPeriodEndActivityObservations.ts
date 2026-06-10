import {
  buildPeriodEndActivityObservation,
  type BuildPeriodEndActivityObservationInput,
  type SyntheticPeriodEndActivityObservation,
} from "./buildPeriodEndActivityObservation";

export interface BuildPeriodEndActivityObservationsInput {
  observations: BuildPeriodEndActivityObservationInput[];
}

export interface BuildPeriodEndActivityObservationsResult {
  periodEndActivityObservations: SyntheticPeriodEndActivityObservation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildPeriodEndActivityObservations(
  input: BuildPeriodEndActivityObservationsInput,
): BuildPeriodEndActivityObservationsResult {
  const periodEndActivityObservations: SyntheticPeriodEndActivityObservation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.observations.forEach((observationInput, index) => {
    const result = buildPeriodEndActivityObservation(observationInput);

    if (result.periodEndActivityObservation) {
      periodEndActivityObservations.push(result.periodEndActivityObservation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `observation[${index}]: ${warning}`));
  });

  return {
    periodEndActivityObservations,
    skippedIndexes,
    warnings,
  };
}
