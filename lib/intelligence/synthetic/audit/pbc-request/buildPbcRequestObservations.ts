import {
  buildPbcRequestObservation,
  type BuildPbcRequestObservationInput,
  type SyntheticPbcRequestObservation,
} from "./buildPbcRequestObservation";

export interface BuildPbcRequestObservationsInput {
  observations: BuildPbcRequestObservationInput[];
}

export interface BuildPbcRequestObservationsResult {
  pbcRequestObservations: SyntheticPbcRequestObservation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildPbcRequestObservations(
  input: BuildPbcRequestObservationsInput,
): BuildPbcRequestObservationsResult {
  const pbcRequestObservations: SyntheticPbcRequestObservation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.observations.forEach((observationInput, index) => {
    const result = buildPbcRequestObservation(observationInput);

    if (result.pbcRequestObservation) {
      pbcRequestObservations.push(result.pbcRequestObservation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `observation[${index}]: ${warning}`));
  });

  return {
    pbcRequestObservations,
    skippedIndexes,
    warnings,
  };
}
