import {
  buildJournalEntryCandidatePackage,
  type BuildJournalEntryCandidatePackageInput,
  type SyntheticJournalEntryCandidatePackage,
} from "./buildJournalEntryCandidatePackage";

export interface BuildJournalEntryCandidatePackagesInput {
  journalEntryCandidatePackageInputs: BuildJournalEntryCandidatePackageInput[];
}

export interface BuildJournalEntryCandidatePackagesResult {
  journalEntryCandidatePackages: SyntheticJournalEntryCandidatePackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildJournalEntryCandidatePackages(
  input: BuildJournalEntryCandidatePackagesInput,
): BuildJournalEntryCandidatePackagesResult {
  const journalEntryCandidatePackages: SyntheticJournalEntryCandidatePackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.journalEntryCandidatePackageInputs.forEach((journalEntryCandidatePackageInput, index) => {
    const result = buildJournalEntryCandidatePackage(journalEntryCandidatePackageInput);

    warnings.push(...result.warnings.map((warning) => `journalEntryCandidatePackageInputs[${index}]: ${warning}`));

    if (result.journalEntryCandidatePackage) {
      journalEntryCandidatePackages.push(result.journalEntryCandidatePackage);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    journalEntryCandidatePackages,
    skippedIndexes,
    warnings,
  };
}
