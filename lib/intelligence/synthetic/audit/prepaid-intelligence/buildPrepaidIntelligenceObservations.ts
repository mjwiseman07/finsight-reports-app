import {
  buildPrepaidIntelligenceObservation,
  type BuildPrepaidIntelligenceObservationInput,
  type SyntheticPrepaidIntelligenceObservation,
} from "./buildPrepaidIntelligenceObservation";

export interface BuildPrepaidIntelligenceObservationsInput {
  observations: BuildPrepaidIntelligenceObservationInput[];
}

export interface BuildPrepaidIntelligenceObservationsResult {
  prepaidIntelligenceObservations: SyntheticPrepaidIntelligenceObservation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildPrepaidIntelligenceObservations(
  input: BuildPrepaidIntelligenceObservationsInput,
): BuildPrepaidIntelligenceObservationsResult {
  const prepaidIntelligenceObservations: SyntheticPrepaidIntelligenceObservation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.observations.forEach((observationInput, index) => {
    const result = buildPrepaidIntelligenceObservation(observationInput);

    if (result.prepaidIntelligenceObservation) {
      prepaidIntelligenceObservations.push(result.prepaidIntelligenceObservation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `observation[${index}]: ${warning}`));
  });

  return {
    prepaidIntelligenceObservations,
    skippedIndexes,
    warnings,
  };
}
