import {
  buildFixedAssetIntelligenceObservation,
  type BuildFixedAssetIntelligenceObservationInput,
  type SyntheticFixedAssetIntelligenceObservation,
} from "./buildFixedAssetIntelligenceObservation";

export interface BuildFixedAssetIntelligenceObservationsInput {
  observations: BuildFixedAssetIntelligenceObservationInput[];
}

export interface BuildFixedAssetIntelligenceObservationsResult {
  fixedAssetIntelligenceObservations: SyntheticFixedAssetIntelligenceObservation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildFixedAssetIntelligenceObservations(
  input: BuildFixedAssetIntelligenceObservationsInput,
): BuildFixedAssetIntelligenceObservationsResult {
  const fixedAssetIntelligenceObservations: SyntheticFixedAssetIntelligenceObservation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.observations.forEach((observationInput, index) => {
    const result = buildFixedAssetIntelligenceObservation(observationInput);

    if (result.fixedAssetIntelligenceObservation) {
      fixedAssetIntelligenceObservations.push(result.fixedAssetIntelligenceObservation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `observation[${index}]: ${warning}`));
  });

  return {
    fixedAssetIntelligenceObservations,
    skippedIndexes,
    warnings,
  };
}
