import {
  buildCrossFrameworkObservation,
  type BuildCrossFrameworkObservationInput,
  type SyntheticCrossFrameworkObservation,
} from "./buildCrossFrameworkObservation";

export interface BuildCrossFrameworkObservationsInput {
  crossFrameworkObservations: BuildCrossFrameworkObservationInput[];
}

export interface BuildCrossFrameworkObservationsResult {
  crossFrameworkObservations: SyntheticCrossFrameworkObservation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildCrossFrameworkObservations(
  input: BuildCrossFrameworkObservationsInput,
): BuildCrossFrameworkObservationsResult {
  const crossFrameworkObservations: SyntheticCrossFrameworkObservation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.crossFrameworkObservations.forEach((observationInput, index) => {
    const result = buildCrossFrameworkObservation({
      ...observationInput,
      skippedIndexes: [...(observationInput.skippedIndexes ?? []), index],
    });

    if (result.crossFrameworkObservation) {
      crossFrameworkObservations.push(result.crossFrameworkObservation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(
      ...result.warnings.map((warning) => `crossFrameworkObservation[${index}]: ${warning}`),
    );
  });

  return {
    crossFrameworkObservations,
    skippedIndexes,
    warnings,
  };
}
