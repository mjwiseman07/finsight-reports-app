import {
  buildJournalTestingObservation,
  type BuildJournalTestingObservationInput,
  type BuildJournalTestingObservationResult,
  type SyntheticJournalTestingObservation,
} from "./buildJournalTestingObservation";

export interface BuildJournalTestingObservationsInput {
  requests: BuildJournalTestingObservationInput[];
}

export interface BuildJournalTestingObservationsResult {
  journalTestingObservations: SyntheticJournalTestingObservation[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildJournalTestingObservationResult[];
}

export function buildJournalTestingObservations(
  input: BuildJournalTestingObservationsInput,
): BuildJournalTestingObservationsResult {
  const journalTestingObservations: SyntheticJournalTestingObservation[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildJournalTestingObservationResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      journalTestingObservations,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildJournalTestingObservation(request);
    results.push(result);

    if (result.journalTestingObservation) {
      journalTestingObservations.push(result.journalTestingObservation);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    journalTestingObservations,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
