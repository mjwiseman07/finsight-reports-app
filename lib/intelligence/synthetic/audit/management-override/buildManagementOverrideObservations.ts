import {
  buildManagementOverrideObservation,
  type BuildManagementOverrideObservationInput,
  type SyntheticManagementOverrideObservation,
} from "./buildManagementOverrideObservation";

export interface BuildManagementOverrideObservationsInput {
  observations: BuildManagementOverrideObservationInput[];
}

export interface BuildManagementOverrideObservationsResult {
  managementOverrideObservations: SyntheticManagementOverrideObservation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildManagementOverrideObservations(
  input: BuildManagementOverrideObservationsInput,
): BuildManagementOverrideObservationsResult {
  const managementOverrideObservations: SyntheticManagementOverrideObservation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.observations.forEach((observationInput, index) => {
    const result = buildManagementOverrideObservation(observationInput);

    if (result.managementOverrideObservation) {
      managementOverrideObservations.push(result.managementOverrideObservation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `observation[${index}]: ${warning}`));
  });

  return {
    managementOverrideObservations,
    skippedIndexes,
    warnings,
  };
}
