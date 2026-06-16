import {
  buildJournalEntryCandidate,
  type BuildJournalEntryCandidateInput,
  type SyntheticJournalEntryCandidate,
} from "./buildJournalEntryCandidate";

export interface BuildJournalEntryCandidatesInput {
  items: BuildJournalEntryCandidateInput[];
}

export interface BuildJournalEntryCandidatesResult {
  journalEntryCandidates: SyntheticJournalEntryCandidate[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildJournalEntryCandidates(
  input: BuildJournalEntryCandidatesInput,
): BuildJournalEntryCandidatesResult {
  const journalEntryCandidates: SyntheticJournalEntryCandidate[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildJournalEntryCandidate(item);

    if (result.journalEntryCandidate) {
      journalEntryCandidates.push(result.journalEntryCandidate);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `journalEntryCandidates[${index}]: ${warning}`));
  });

  return {
    journalEntryCandidates,
    skippedIndexes,
    warnings,
  };
}
