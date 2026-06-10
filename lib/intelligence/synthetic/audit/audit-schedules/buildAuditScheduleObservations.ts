import {
  buildAuditScheduleObservation,
  type BuildAuditScheduleObservationInput,
  type SyntheticAuditScheduleObservation,
} from "./buildAuditScheduleObservation";

export interface BuildAuditScheduleObservationsInput {
  observations: BuildAuditScheduleObservationInput[];
}

export interface BuildAuditScheduleObservationsResult {
  auditScheduleObservations: SyntheticAuditScheduleObservation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildAuditScheduleObservations(
  input: BuildAuditScheduleObservationsInput,
): BuildAuditScheduleObservationsResult {
  const auditScheduleObservations: SyntheticAuditScheduleObservation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.observations.forEach((observationInput, index) => {
    const result = buildAuditScheduleObservation(observationInput);

    if (result.auditScheduleObservation) {
      auditScheduleObservations.push(result.auditScheduleObservation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `observation[${index}]: ${warning}`));
  });

  return {
    auditScheduleObservations,
    skippedIndexes,
    warnings,
  };
}
