import {
  buildAnomalyIntelligenceObservation,
  type BuildAnomalyIntelligenceObservationInput,
  type SyntheticAnomalyIntelligenceObservation,
} from "./buildAnomalyIntelligenceObservation";

export interface BuildAnomalyIntelligenceObservationsInput {
  observations: BuildAnomalyIntelligenceObservationInput[];
}

export interface BuildAnomalyIntelligenceObservationsResult {
  anomalyIntelligenceObservations: SyntheticAnomalyIntelligenceObservation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildAnomalyIntelligenceObservations(
  input: BuildAnomalyIntelligenceObservationsInput,
): BuildAnomalyIntelligenceObservationsResult {
  const anomalyIntelligenceObservations: SyntheticAnomalyIntelligenceObservation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.observations.forEach((observationInput, index) => {
    const result = buildAnomalyIntelligenceObservation(observationInput);

    if (result.anomalyIntelligenceObservation) {
      anomalyIntelligenceObservations.push(result.anomalyIntelligenceObservation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `observation[${index}]: ${warning}`));
  });

  return {
    anomalyIntelligenceObservations,
    skippedIndexes,
    warnings,
  };
}
