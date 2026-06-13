import {
  buildHistoricalOutcomePackage,
  type BuildHistoricalOutcomePackageInput,
  type SyntheticHistoricalOutcomePackage,
} from "./buildHistoricalOutcomePackage";

export interface BuildHistoricalOutcomePackagesInput {
  packageInputs: BuildHistoricalOutcomePackageInput[];
}

export interface BuildHistoricalOutcomePackagesResult {
  historicalOutcomePackages: SyntheticHistoricalOutcomePackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildHistoricalOutcomePackages(input: BuildHistoricalOutcomePackagesInput): BuildHistoricalOutcomePackagesResult {
  const historicalOutcomePackages: SyntheticHistoricalOutcomePackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.packageInputs.forEach((packageInput, index) => {
    const result = buildHistoricalOutcomePackage(packageInput);

    warnings.push(...result.warnings.map((warning) => `packageInputs[${index}]: ${warning}`));

    if (result.historicalOutcomePackage) {
      historicalOutcomePackages.push(result.historicalOutcomePackage);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }
  });

  return {
    historicalOutcomePackages,
    skippedIndexes,
    warnings,
  };
}
