import {
  buildCrossEntityMemoryPackage,
  type BuildCrossEntityMemoryPackageInput,
  type SyntheticCrossEntityMemoryPackage,
} from "./buildCrossEntityMemoryPackage";

export interface BuildCrossEntityMemoryPackagesInput {
  packageInputs: BuildCrossEntityMemoryPackageInput[];
}

export interface BuildCrossEntityMemoryPackagesResult {
  crossEntityMemoryPackages: SyntheticCrossEntityMemoryPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildCrossEntityMemoryPackages(input: BuildCrossEntityMemoryPackagesInput): BuildCrossEntityMemoryPackagesResult {
  const crossEntityMemoryPackages: SyntheticCrossEntityMemoryPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.packageInputs.forEach((packageInput, index) => {
    const result = buildCrossEntityMemoryPackage(packageInput);

    warnings.push(...result.warnings.map((warning) => `packageInputs[${index}]: ${warning}`));

    if (result.crossEntityMemoryPackage) {
      crossEntityMemoryPackages.push(result.crossEntityMemoryPackage);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }
  });

  return {
    crossEntityMemoryPackages,
    skippedIndexes,
    warnings,
  };
}
