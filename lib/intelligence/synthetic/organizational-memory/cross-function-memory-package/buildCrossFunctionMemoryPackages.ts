import {
  buildCrossFunctionMemoryPackage,
  type BuildCrossFunctionMemoryPackageInput,
  type SyntheticCrossFunctionMemoryPackage,
} from "./buildCrossFunctionMemoryPackage";

export interface BuildCrossFunctionMemoryPackagesInput {
  packageInputs: BuildCrossFunctionMemoryPackageInput[];
}

export interface BuildCrossFunctionMemoryPackagesResult {
  crossFunctionMemoryPackages: SyntheticCrossFunctionMemoryPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildCrossFunctionMemoryPackages(input: BuildCrossFunctionMemoryPackagesInput): BuildCrossFunctionMemoryPackagesResult {
  const crossFunctionMemoryPackages: SyntheticCrossFunctionMemoryPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.packageInputs.forEach((packageInput, index) => {
    const result = buildCrossFunctionMemoryPackage(packageInput);

    warnings.push(...result.warnings.map((warning) => `packageInputs[${index}]: ${warning}`));

    if (result.crossFunctionMemoryPackage) {
      crossFunctionMemoryPackages.push(result.crossFunctionMemoryPackage);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }
  });

  return {
    crossFunctionMemoryPackages,
    skippedIndexes,
    warnings,
  };
}
