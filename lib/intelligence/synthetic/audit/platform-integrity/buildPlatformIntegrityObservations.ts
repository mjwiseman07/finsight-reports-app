import {
  buildPlatformIntegrityObservation,
  type BuildPlatformIntegrityObservationInput,
  type SyntheticPlatformIntegrityObservation,
} from "./buildPlatformIntegrityObservation";

export interface BuildPlatformIntegrityObservationsInput {
  observations: BuildPlatformIntegrityObservationInput[];
}

export interface BuildPlatformIntegrityObservationsResult {
  platformIntegrityObservations: SyntheticPlatformIntegrityObservation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildPlatformIntegrityObservations(
  input: BuildPlatformIntegrityObservationsInput,
): BuildPlatformIntegrityObservationsResult {
  const platformIntegrityObservations: SyntheticPlatformIntegrityObservation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.observations.forEach((observationInput, index) => {
    const result = buildPlatformIntegrityObservation(observationInput);

    if (result.platformIntegrityObservation) {
      platformIntegrityObservations.push(result.platformIntegrityObservation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `observation[${index}]: ${warning}`));
  });

  return {
    platformIntegrityObservations,
    skippedIndexes,
    warnings,
  };
}
