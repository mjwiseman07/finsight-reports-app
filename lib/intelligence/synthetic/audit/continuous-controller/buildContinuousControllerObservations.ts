import {
  buildContinuousControllerObservation,
  type BuildContinuousControllerObservationInput,
  type SyntheticContinuousControllerObservation,
} from "./buildContinuousControllerObservation";

export interface BuildContinuousControllerObservationsInput {
  observations: BuildContinuousControllerObservationInput[];
}

export interface BuildContinuousControllerObservationsResult {
  continuousControllerObservations: SyntheticContinuousControllerObservation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildContinuousControllerObservations(
  input: BuildContinuousControllerObservationsInput,
): BuildContinuousControllerObservationsResult {
  const continuousControllerObservations: SyntheticContinuousControllerObservation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.observations.forEach((observationInput, index) => {
    const result = buildContinuousControllerObservation(observationInput);

    if (result.continuousControllerObservation) {
      continuousControllerObservations.push(result.continuousControllerObservation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `observation[${index}]: ${warning}`));
  });

  return {
    continuousControllerObservations,
    skippedIndexes,
    warnings,
  };
}
