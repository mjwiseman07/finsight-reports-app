import {
  buildJournalPopulationObservation,
  type BuildJournalPopulationObservationInput,
  type SyntheticJournalPopulationObservation,
} from "./buildJournalPopulationObservation";

export interface BuildJournalPopulationObservationsInput {
  observations: BuildJournalPopulationObservationInput[];
}

export interface BuildJournalPopulationObservationsResult {
  journalPopulationObservations: SyntheticJournalPopulationObservation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildJournalPopulationObservations(
  input: BuildJournalPopulationObservationsInput,
): BuildJournalPopulationObservationsResult {
  const journalPopulationObservations: SyntheticJournalPopulationObservation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.observations.forEach((observationInput, index) => {
    const result = buildJournalPopulationObservation(observationInput);

    if (result.journalPopulationObservation) {
      journalPopulationObservations.push(result.journalPopulationObservation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `observation[${index}]: ${warning}`));
  });

  return {
    journalPopulationObservations,
    skippedIndexes,
    warnings,
  };
}
