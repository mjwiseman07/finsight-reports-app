import {
  buildEvidenceSufficiencyObservation,
  type BuildEvidenceSufficiencyObservationInput,
  type SyntheticEvidenceSufficiencyObservation,
} from "./buildEvidenceSufficiencyObservation";

export interface BuildEvidenceSufficiencyObservationsInput {
  observations: BuildEvidenceSufficiencyObservationInput[];
}

export interface BuildEvidenceSufficiencyObservationsResult {
  evidenceSufficiencyObservations: SyntheticEvidenceSufficiencyObservation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildEvidenceSufficiencyObservations(
  input: BuildEvidenceSufficiencyObservationsInput,
): BuildEvidenceSufficiencyObservationsResult {
  const evidenceSufficiencyObservations: SyntheticEvidenceSufficiencyObservation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.observations.forEach((observationInput, index) => {
    const result = buildEvidenceSufficiencyObservation(observationInput);

    if (result.evidenceSufficiencyObservation) {
      evidenceSufficiencyObservations.push(result.evidenceSufficiencyObservation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `observation[${index}]: ${warning}`));
  });

  return {
    evidenceSufficiencyObservations,
    skippedIndexes,
    warnings,
  };
}
