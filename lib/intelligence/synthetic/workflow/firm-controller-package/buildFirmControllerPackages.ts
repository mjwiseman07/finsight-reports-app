import {
  buildFirmControllerPackage,
  type BuildFirmControllerPackageInput,
  type SyntheticFirmControllerPackage,
} from "./buildFirmControllerPackage";

export interface BuildFirmControllerPackagesInput {
  packages: BuildFirmControllerPackageInput[];
}

export interface BuildFirmControllerPackagesResult {
  firmControllerPackages: SyntheticFirmControllerPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildFirmControllerPackages(input: BuildFirmControllerPackagesInput): BuildFirmControllerPackagesResult {
  const firmControllerPackages: SyntheticFirmControllerPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.packages.forEach((packageInput, index) => {
    const result = buildFirmControllerPackage(packageInput);
    warnings.push(...result.warnings.map((warning) => `packages[${index}]: ${warning}`));

    if (result.firmControllerPackage) {
      firmControllerPackages.push(result.firmControllerPackage);
      return;
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }
  });

  return {
    firmControllerPackages,
    skippedIndexes,
    warnings,
  };
}
