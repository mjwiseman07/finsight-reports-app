import {
  buildHistoricalControllerPackage,
  type BuildHistoricalControllerPackageInput,
  type SyntheticHistoricalControllerPackage,
} from "./buildHistoricalControllerPackage";

export interface BuildHistoricalControllerPackagesInput {
  packageInputs: BuildHistoricalControllerPackageInput[];
}

export interface BuildHistoricalControllerPackagesResult {
  historicalControllerPackages: SyntheticHistoricalControllerPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildHistoricalControllerPackages(
  input: BuildHistoricalControllerPackagesInput,
): BuildHistoricalControllerPackagesResult {
  const historicalControllerPackages: SyntheticHistoricalControllerPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.packageInputs.forEach((packageInput, index) => {
    const result = buildHistoricalControllerPackage(packageInput);

    warnings.push(...result.warnings.map((warning) => `packageInputs[${index}]: ${warning}`));

    if (result.historicalControllerPackage) {
      historicalControllerPackages.push(result.historicalControllerPackage);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }
  });

  return {
    historicalControllerPackages,
    skippedIndexes,
    warnings,
  };
}
