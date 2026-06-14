import {
  buildHistoricalMethodologyPackage,
  type BuildHistoricalMethodologyPackageInput,
  type SyntheticHistoricalMethodologyPackage,
} from "./buildHistoricalMethodologyPackage";

export interface BuildHistoricalMethodologyPackagesInput {
  historicalMethodologyInputs: BuildHistoricalMethodologyPackageInput[];
}

export interface BuildHistoricalMethodologyPackagesResult {
  historicalMethodologyPackages: SyntheticHistoricalMethodologyPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildHistoricalMethodologyPackages(
  input: BuildHistoricalMethodologyPackagesInput,
): BuildHistoricalMethodologyPackagesResult {
  const historicalMethodologyPackages: SyntheticHistoricalMethodologyPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.historicalMethodologyInputs.forEach((historicalMethodologyInput, index) => {
    const result = buildHistoricalMethodologyPackage(historicalMethodologyInput);

    warnings.push(...result.warnings.map((warning) => `historicalMethodologyInputs[${index}]: ${warning}`));

    if (result.historicalMethodologyPackage) {
      historicalMethodologyPackages.push(result.historicalMethodologyPackage);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    historicalMethodologyPackages,
    skippedIndexes,
    warnings,
  };
}
