import {
  buildAuditResponseObservation,
  type BuildAuditResponseObservationInput,
  type SyntheticAuditResponseObservation,
} from "./buildAuditResponseObservation";

export interface BuildAuditResponseObservationsInput {
  observations: BuildAuditResponseObservationInput[];
}

export interface BuildAuditResponseObservationsResult {
  auditResponseObservations: SyntheticAuditResponseObservation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildAuditResponseObservations(
  input: BuildAuditResponseObservationsInput,
): BuildAuditResponseObservationsResult {
  const auditResponseObservations: SyntheticAuditResponseObservation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.observations.forEach((observationInput, index) => {
    const result = buildAuditResponseObservation(observationInput);

    if (result.auditResponseObservation) {
      auditResponseObservations.push(result.auditResponseObservation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `observation[${index}]: ${warning}`));
  });

  return {
    auditResponseObservations,
    skippedIndexes,
    warnings,
  };
}
