import {
  buildCrossPeriodMemoryPackage,
  type BuildCrossPeriodMemoryPackageInput,
  type SyntheticCrossPeriodMemoryPackage,
} from "./buildCrossPeriodMemoryPackage";

export interface BuildCrossPeriodMemoryPackagesInput {
  packageInputs: BuildCrossPeriodMemoryPackageInput[];
}

export interface BuildCrossPeriodMemoryPackagesResult {
  crossPeriodMemoryPackages: SyntheticCrossPeriodMemoryPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildCrossPeriodMemoryPackages(input: BuildCrossPeriodMemoryPackagesInput): BuildCrossPeriodMemoryPackagesResult {
  const crossPeriodMemoryPackages: SyntheticCrossPeriodMemoryPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.packageInputs.forEach((packageInput, index) => {
    const result = buildCrossPeriodMemoryPackage(packageInput);

    warnings.push(...result.warnings.map((warning) => `packageInputs[${index}]: ${warning}`));

    if (result.crossPeriodMemoryPackage) {
      crossPeriodMemoryPackages.push(result.crossPeriodMemoryPackage);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }
  });

  return {
    crossPeriodMemoryPackages,
    skippedIndexes,
    warnings,
  };
}
