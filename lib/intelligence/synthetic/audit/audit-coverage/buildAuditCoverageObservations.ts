import {
  buildAuditCoverageObservation,
  type BuildAuditCoverageObservationInput,
  type SyntheticAuditCoverageObservation,
} from "./buildAuditCoverageObservation";

export interface BuildAuditCoverageObservationsInput {
  observations: BuildAuditCoverageObservationInput[];
}

export interface BuildAuditCoverageObservationsResult {
  auditCoverageObservations: SyntheticAuditCoverageObservation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildAuditCoverageObservations(
  input: BuildAuditCoverageObservationsInput,
): BuildAuditCoverageObservationsResult {
  const auditCoverageObservations: SyntheticAuditCoverageObservation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.observations.forEach((observationInput, index) => {
    const result = buildAuditCoverageObservation(observationInput);

    if (result.auditCoverageObservation) {
      auditCoverageObservations.push(result.auditCoverageObservation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `observation[${index}]: ${warning}`));
  });

  return {
    auditCoverageObservations,
    skippedIndexes,
    warnings,
  };
}
