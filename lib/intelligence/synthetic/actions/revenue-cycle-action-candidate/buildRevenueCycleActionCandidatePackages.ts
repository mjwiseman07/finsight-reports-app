import {
  buildRevenueCycleActionCandidatePackage,
  type BuildRevenueCycleActionCandidatePackageInput,
  type SyntheticRevenueCycleActionCandidatePackage,
} from "./buildRevenueCycleActionCandidatePackage";

export interface BuildRevenueCycleActionCandidatePackagesInput {
  revenueCycleActionCandidatePackageInputs: BuildRevenueCycleActionCandidatePackageInput[];
}

export interface BuildRevenueCycleActionCandidatePackagesResult {
  revenueCycleActionCandidatePackages: SyntheticRevenueCycleActionCandidatePackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildRevenueCycleActionCandidatePackages(
  input: BuildRevenueCycleActionCandidatePackagesInput,
): BuildRevenueCycleActionCandidatePackagesResult {
  const revenueCycleActionCandidatePackages: SyntheticRevenueCycleActionCandidatePackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.revenueCycleActionCandidatePackageInputs.forEach((revenueCycleActionCandidatePackageInput, index) => {
    const result = buildRevenueCycleActionCandidatePackage(revenueCycleActionCandidatePackageInput);

    warnings.push(...result.warnings.map((warning) => `revenueCycleActionCandidatePackageInputs[${index}]: ${warning}`));

    if (result.revenueCycleActionCandidatePackage) {
      revenueCycleActionCandidatePackages.push(result.revenueCycleActionCandidatePackage);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    revenueCycleActionCandidatePackages,
    skippedIndexes,
    warnings,
  };
}
