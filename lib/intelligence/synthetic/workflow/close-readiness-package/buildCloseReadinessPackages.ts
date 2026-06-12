import {
  buildCloseReadinessPackage,
  type BuildCloseReadinessPackageInput,
  type SyntheticCloseReadinessPackage,
} from "./buildCloseReadinessPackage";

export interface BuildCloseReadinessPackagesInput {
  closeReadinessPackageInputs: BuildCloseReadinessPackageInput[];
}

export interface BuildCloseReadinessPackagesResult {
  closeReadinessPackages: SyntheticCloseReadinessPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildCloseReadinessPackages(input: BuildCloseReadinessPackagesInput): BuildCloseReadinessPackagesResult {
  const closeReadinessPackages: SyntheticCloseReadinessPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.closeReadinessPackageInputs.forEach((closeReadinessPackageInput, index) => {
    const result = buildCloseReadinessPackage(closeReadinessPackageInput);
    warnings.push(...result.warnings.map((warning) => `closeReadinessPackageInputs[${index}]: ${warning}`));

    if (result.skipped || !result.closeReadinessPackage) {
      skippedIndexes.push(index);
      return;
    }

    closeReadinessPackages.push(result.closeReadinessPackage);
  });

  return {
    closeReadinessPackages,
    skippedIndexes,
    warnings,
  };
}
