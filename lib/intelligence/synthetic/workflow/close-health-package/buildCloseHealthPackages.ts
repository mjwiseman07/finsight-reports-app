import {
  buildCloseHealthPackage,
  type BuildCloseHealthPackageInput,
  type SyntheticCloseHealthPackage,
} from "./buildCloseHealthPackage";

export interface BuildCloseHealthPackagesInput {
  closeHealthPackageInputs: BuildCloseHealthPackageInput[];
}

export interface BuildCloseHealthPackagesResult {
  closeHealthPackages: SyntheticCloseHealthPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildCloseHealthPackages(input: BuildCloseHealthPackagesInput): BuildCloseHealthPackagesResult {
  const closeHealthPackages: SyntheticCloseHealthPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.closeHealthPackageInputs.forEach((closeHealthPackageInput, index) => {
    const result = buildCloseHealthPackage(closeHealthPackageInput);
    warnings.push(...result.warnings.map((warning) => `closeHealthPackageInputs[${index}]: ${warning}`));

    if (result.skipped || !result.closeHealthPackage) {
      skippedIndexes.push(index);
      return;
    }

    closeHealthPackages.push(result.closeHealthPackage);
  });

  return {
    closeHealthPackages,
    skippedIndexes,
    warnings,
  };
}
