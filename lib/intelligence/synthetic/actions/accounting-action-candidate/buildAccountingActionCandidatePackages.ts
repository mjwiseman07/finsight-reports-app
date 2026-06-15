import {
  buildAccountingActionCandidatePackage,
  type BuildAccountingActionCandidatePackageInput,
  type SyntheticAccountingActionCandidatePackage,
} from "./buildAccountingActionCandidatePackage";

export interface BuildAccountingActionCandidatePackagesInput {
  accountingActionCandidatePackageInputs: BuildAccountingActionCandidatePackageInput[];
}

export interface BuildAccountingActionCandidatePackagesResult {
  accountingActionCandidatePackages: SyntheticAccountingActionCandidatePackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildAccountingActionCandidatePackages(
  input: BuildAccountingActionCandidatePackagesInput,
): BuildAccountingActionCandidatePackagesResult {
  const accountingActionCandidatePackages: SyntheticAccountingActionCandidatePackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.accountingActionCandidatePackageInputs.forEach((accountingActionCandidatePackageInput, index) => {
    const result = buildAccountingActionCandidatePackage(accountingActionCandidatePackageInput);

    warnings.push(...result.warnings.map((warning) => `accountingActionCandidatePackageInputs[${index}]: ${warning}`));

    if (result.accountingActionCandidatePackage) {
      accountingActionCandidatePackages.push(result.accountingActionCandidatePackage);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    accountingActionCandidatePackages,
    skippedIndexes,
    warnings,
  };
}
