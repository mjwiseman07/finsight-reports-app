import {
  buildIntercompanyObservation,
  type BuildIntercompanyObservationInput,
  type SyntheticIntercompanyObservation,
} from "./buildIntercompanyObservation";

export interface BuildIntercompanyObservationsInput {
  observations: BuildIntercompanyObservationInput[];
}

export interface BuildIntercompanyObservationsResult {
  intercompanyObservations: SyntheticIntercompanyObservation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildIntercompanyObservations(
  input: BuildIntercompanyObservationsInput,
): BuildIntercompanyObservationsResult {
  const intercompanyObservations: SyntheticIntercompanyObservation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.observations.forEach((observationInput, index) => {
    const result = buildIntercompanyObservation(observationInput);

    if (result.intercompanyObservation) {
      intercompanyObservations.push(result.intercompanyObservation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `observation[${index}]: ${warning}`));
  });

  return {
    intercompanyObservations,
    skippedIndexes,
    warnings,
  };
}
