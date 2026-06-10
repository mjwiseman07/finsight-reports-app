import {
  buildContinuousAuditObservation,
  type BuildContinuousAuditObservationInput,
  type SyntheticContinuousAuditObservation,
} from "./buildContinuousAuditObservation";

export interface BuildContinuousAuditObservationsInput {
  observations: BuildContinuousAuditObservationInput[];
}

export interface BuildContinuousAuditObservationsResult {
  continuousAuditObservations: SyntheticContinuousAuditObservation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildContinuousAuditObservations(
  input: BuildContinuousAuditObservationsInput,
): BuildContinuousAuditObservationsResult {
  const continuousAuditObservations: SyntheticContinuousAuditObservation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.observations.forEach((observationInput, index) => {
    const result = buildContinuousAuditObservation(observationInput);

    if (result.continuousAuditObservation) {
      continuousAuditObservations.push(result.continuousAuditObservation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `observation[${index}]: ${warning}`));
  });

  return {
    continuousAuditObservations,
    skippedIndexes,
    warnings,
  };
}
