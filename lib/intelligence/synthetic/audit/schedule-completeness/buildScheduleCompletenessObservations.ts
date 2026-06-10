import {
  buildScheduleCompletenessObservation,
  type BuildScheduleCompletenessObservationInput,
  type SyntheticScheduleCompletenessObservation,
} from "./buildScheduleCompletenessObservation";

export interface BuildScheduleCompletenessObservationsInput {
  observations: BuildScheduleCompletenessObservationInput[];
}

export interface BuildScheduleCompletenessObservationsResult {
  scheduleCompletenessObservations: SyntheticScheduleCompletenessObservation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildScheduleCompletenessObservations(
  input: BuildScheduleCompletenessObservationsInput,
): BuildScheduleCompletenessObservationsResult {
  const scheduleCompletenessObservations: SyntheticScheduleCompletenessObservation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.observations.forEach((observationInput, index) => {
    const result = buildScheduleCompletenessObservation(observationInput);

    if (result.scheduleCompletenessObservation) {
      scheduleCompletenessObservations.push(result.scheduleCompletenessObservation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `observation[${index}]: ${warning}`));
  });

  return {
    scheduleCompletenessObservations,
    skippedIndexes,
    warnings,
  };
}
