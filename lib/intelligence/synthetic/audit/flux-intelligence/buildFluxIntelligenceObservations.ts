import {
  buildFluxIntelligenceObservation,
  type BuildFluxIntelligenceObservationInput,
  type SyntheticFluxIntelligenceObservation,
} from "./buildFluxIntelligenceObservation";

export interface BuildFluxIntelligenceObservationsInput {
  observations: BuildFluxIntelligenceObservationInput[];
}

export interface BuildFluxIntelligenceObservationsResult {
  fluxIntelligenceObservations: SyntheticFluxIntelligenceObservation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildFluxIntelligenceObservations(
  input: BuildFluxIntelligenceObservationsInput,
): BuildFluxIntelligenceObservationsResult {
  const fluxIntelligenceObservations: SyntheticFluxIntelligenceObservation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.observations.forEach((observationInput, index) => {
    const result = buildFluxIntelligenceObservation(observationInput);

    if (result.fluxIntelligenceObservation) {
      fluxIntelligenceObservations.push(result.fluxIntelligenceObservation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `observation[${index}]: ${warning}`));
  });

  return {
    fluxIntelligenceObservations,
    skippedIndexes,
    warnings,
  };
}
