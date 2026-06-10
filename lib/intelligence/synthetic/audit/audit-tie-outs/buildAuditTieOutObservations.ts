import {
  buildAuditTieOutObservation,
  type BuildAuditTieOutObservationInput,
  type SyntheticAuditTieOutObservation,
} from "./buildAuditTieOutObservation";

export interface BuildAuditTieOutObservationsInput {
  observations: BuildAuditTieOutObservationInput[];
}

export interface BuildAuditTieOutObservationsResult {
  auditTieOutObservations: SyntheticAuditTieOutObservation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildAuditTieOutObservations(
  input: BuildAuditTieOutObservationsInput,
): BuildAuditTieOutObservationsResult {
  const auditTieOutObservations: SyntheticAuditTieOutObservation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.observations.forEach((observationInput, index) => {
    const result = buildAuditTieOutObservation(observationInput);

    if (result.auditTieOutObservation) {
      auditTieOutObservations.push(result.auditTieOutObservation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `observation[${index}]: ${warning}`));
  });

  return {
    auditTieOutObservations,
    skippedIndexes,
    warnings,
  };
}
