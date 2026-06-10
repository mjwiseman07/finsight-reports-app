import {
  buildCutoffIntelligenceObservation,
  type BuildCutoffIntelligenceObservationInput,
  type SyntheticCutoffIntelligenceObservation,
} from "./buildCutoffIntelligenceObservation";

export interface BuildCutoffIntelligenceObservationsInput {
  observations: BuildCutoffIntelligenceObservationInput[];
}

export interface BuildCutoffIntelligenceObservationsResult {
  cutoffIntelligenceObservations: SyntheticCutoffIntelligenceObservation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildCutoffIntelligenceObservations(
  input: BuildCutoffIntelligenceObservationsInput,
): BuildCutoffIntelligenceObservationsResult {
  const cutoffIntelligenceObservations: SyntheticCutoffIntelligenceObservation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.observations.forEach((observationInput, index) => {
    const result = buildCutoffIntelligenceObservation(observationInput);

    if (result.cutoffIntelligenceObservation) {
      cutoffIntelligenceObservations.push(result.cutoffIntelligenceObservation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `observation[${index}]: ${warning}`));
  });

  return {
    cutoffIntelligenceObservations,
    skippedIndexes,
    warnings,
  };
}
