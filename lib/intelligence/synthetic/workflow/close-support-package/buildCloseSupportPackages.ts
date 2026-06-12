import {
  buildCloseSupportPackage,
  type BuildCloseSupportPackageInput,
  type SyntheticCloseSupportPackage,
} from "./buildCloseSupportPackage";

export interface BuildCloseSupportPackagesInput {
  closeSupportPackageInputs: BuildCloseSupportPackageInput[];
}

export interface BuildCloseSupportPackagesResult {
  closeSupportPackages: SyntheticCloseSupportPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildCloseSupportPackages(input: BuildCloseSupportPackagesInput): BuildCloseSupportPackagesResult {
  const closeSupportPackages: SyntheticCloseSupportPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.closeSupportPackageInputs.forEach((closeSupportPackageInput, index) => {
    const result = buildCloseSupportPackage(closeSupportPackageInput);
    warnings.push(...result.warnings.map((warning) => `closeSupportPackageInputs[${index}]: ${warning}`));

    if (result.skipped || !result.closeSupportPackage) {
      skippedIndexes.push(index);
      return;
    }

    closeSupportPackages.push(result.closeSupportPackage);
  });

  return {
    closeSupportPackages,
    skippedIndexes,
    warnings,
  };
}
