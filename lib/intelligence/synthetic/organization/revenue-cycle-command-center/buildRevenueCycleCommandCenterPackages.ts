import {
  buildRevenueCycleCommandCenterPackage,
  type BuildRevenueCycleCommandCenterPackageInput,
  type SyntheticRevenueCycleCommandCenterPackage,
} from "./buildRevenueCycleCommandCenterPackage";

export interface BuildRevenueCycleCommandCenterPackagesInput {
  revenueCycleCommandCenterPackageInputs?: BuildRevenueCycleCommandCenterPackageInput[];
}

export interface BuildRevenueCycleCommandCenterPackagesResult {
  revenueCycleCommandCenterPackages: SyntheticRevenueCycleCommandCenterPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

export function buildRevenueCycleCommandCenterPackages(
  input: BuildRevenueCycleCommandCenterPackagesInput,
): BuildRevenueCycleCommandCenterPackagesResult {
  const revenueCycleCommandCenterPackages: SyntheticRevenueCycleCommandCenterPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  getInputArray(input.revenueCycleCommandCenterPackageInputs).forEach((packageInput, index) => {
    const result = buildRevenueCycleCommandCenterPackage(packageInput);

    warnings.push(...result.warnings.map((warning) => `revenueCycleCommandCenterPackage[${index}]: ${warning}`));

    if (result.skipped || !result.revenueCycleCommandCenterPackage) {
      skippedIndexes.push(index);
      return;
    }

    revenueCycleCommandCenterPackages.push(result.revenueCycleCommandCenterPackage);
  });

  return {
    revenueCycleCommandCenterPackages,
    skippedIndexes,
    warnings,
  };
}
