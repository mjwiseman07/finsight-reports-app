import {
  buildCloseCommandCenterPackage,
  type BuildCloseCommandCenterPackageInput,
  type SyntheticCloseCommandCenterPackage,
} from "./buildCloseCommandCenterPackage";

export interface BuildCloseCommandCenterPackagesInput {
  closeCommandCenterPackageInputs?: BuildCloseCommandCenterPackageInput[];
}

export interface BuildCloseCommandCenterPackagesResult {
  closeCommandCenterPackages: SyntheticCloseCommandCenterPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

export function buildCloseCommandCenterPackages(
  input: BuildCloseCommandCenterPackagesInput,
): BuildCloseCommandCenterPackagesResult {
  const closeCommandCenterPackages: SyntheticCloseCommandCenterPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  getInputArray(input.closeCommandCenterPackageInputs).forEach((packageInput, index) => {
    const result = buildCloseCommandCenterPackage(packageInput);

    warnings.push(...result.warnings.map((warning) => `closeCommandCenterPackage[${index}]: ${warning}`));

    if (result.skipped || !result.closeCommandCenterPackage) {
      skippedIndexes.push(index);
      return;
    }

    closeCommandCenterPackages.push(result.closeCommandCenterPackage);
  });

  return {
    closeCommandCenterPackages,
    skippedIndexes,
    warnings,
  };
}
