import {
  buildMethodologyPreservationPackage,
  type BuildMethodologyPreservationPackageInput,
  type SyntheticMethodologyPreservationPackage,
} from "./buildMethodologyPreservationPackage";

export interface BuildMethodologyPreservationPackagesInput {
  packages: BuildMethodologyPreservationPackageInput[];
}

export interface BuildMethodologyPreservationPackagesResult {
  methodologyPreservationPackages: SyntheticMethodologyPreservationPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildMethodologyPreservationPackages(
  input: BuildMethodologyPreservationPackagesInput,
): BuildMethodologyPreservationPackagesResult {
  const methodologyPreservationPackages: SyntheticMethodologyPreservationPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.packages.forEach((packageInput, index) => {
    const result = buildMethodologyPreservationPackage(packageInput);

    warnings.push(...result.warnings.map((warning) => `packages[${index}]: ${warning}`));

    if (result.methodologyPreservationPackage) {
      methodologyPreservationPackages.push(result.methodologyPreservationPackage);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    methodologyPreservationPackages,
    skippedIndexes,
    warnings,
  };
}
