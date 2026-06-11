import {
  buildUnrecordedLiabilityObservation,
  type BuildUnrecordedLiabilityObservationInput,
  type SyntheticUnrecordedLiabilityObservation,
} from "./buildUnrecordedLiabilityObservation";

export interface BuildUnrecordedLiabilityObservationsInput {
  observations: BuildUnrecordedLiabilityObservationInput[];
}

export interface BuildUnrecordedLiabilityObservationsResult {
  unrecordedLiabilityObservations: SyntheticUnrecordedLiabilityObservation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildUnrecordedLiabilityObservations(
  input: BuildUnrecordedLiabilityObservationsInput,
): BuildUnrecordedLiabilityObservationsResult {
  const unrecordedLiabilityObservations: SyntheticUnrecordedLiabilityObservation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.observations.forEach((observationInput, index) => {
    const result = buildUnrecordedLiabilityObservation(observationInput);

    if (result.unrecordedLiabilityObservation) {
      unrecordedLiabilityObservations.push(result.unrecordedLiabilityObservation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `observation[${index}]: ${warning}`));
  });

  return {
    unrecordedLiabilityObservations,
    skippedIndexes,
    warnings,
  };
}
