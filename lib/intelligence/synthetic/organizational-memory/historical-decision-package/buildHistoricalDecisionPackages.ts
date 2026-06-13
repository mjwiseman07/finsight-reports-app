import {
  buildHistoricalDecisionPackage,
  type BuildHistoricalDecisionPackageInput,
  type SyntheticHistoricalDecisionPackage,
} from "./buildHistoricalDecisionPackage";

export interface BuildHistoricalDecisionPackagesInput {
  packageInputs: BuildHistoricalDecisionPackageInput[];
}

export interface BuildHistoricalDecisionPackagesResult {
  historicalDecisionPackages: SyntheticHistoricalDecisionPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildHistoricalDecisionPackages(input: BuildHistoricalDecisionPackagesInput): BuildHistoricalDecisionPackagesResult {
  const historicalDecisionPackages: SyntheticHistoricalDecisionPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.packageInputs.forEach((packageInput, index) => {
    const result = buildHistoricalDecisionPackage(packageInput);

    warnings.push(...result.warnings.map((warning) => `packageInputs[${index}]: ${warning}`));

    if (result.historicalDecisionPackage) {
      historicalDecisionPackages.push(result.historicalDecisionPackage);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }
  });

  return {
    historicalDecisionPackages,
    skippedIndexes,
    warnings,
  };
}
