import {
  buildAuditReadinessObservation,
  type BuildAuditReadinessObservationInput,
  type SyntheticAuditReadinessObservation,
} from "./buildAuditReadinessObservation";

export interface BuildAuditReadinessObservationsInput {
  observations: BuildAuditReadinessObservationInput[];
}

export interface BuildAuditReadinessObservationsResult {
  auditReadinessObservations: SyntheticAuditReadinessObservation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildAuditReadinessObservations(
  input: BuildAuditReadinessObservationsInput,
): BuildAuditReadinessObservationsResult {
  const auditReadinessObservations: SyntheticAuditReadinessObservation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.observations.forEach((observationInput, index) => {
    const result = buildAuditReadinessObservation(observationInput);

    if (result.auditReadinessObservation) {
      auditReadinessObservations.push(result.auditReadinessObservation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `observation[${index}]: ${warning}`));
  });

  return {
    auditReadinessObservations,
    skippedIndexes,
    warnings,
  };
}
