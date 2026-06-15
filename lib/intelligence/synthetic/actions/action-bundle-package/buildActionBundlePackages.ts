import {
  buildActionBundlePackage,
  type BuildActionBundlePackageInput,
  type SyntheticActionBundlePackage,
} from "./buildActionBundlePackage";

export interface BuildActionBundlePackagesInput {
  actionBundlePackageInputs: BuildActionBundlePackageInput[];
}

export interface BuildActionBundlePackagesResult {
  actionBundlePackages: SyntheticActionBundlePackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildActionBundlePackages(input: BuildActionBundlePackagesInput): BuildActionBundlePackagesResult {
  const actionBundlePackages: SyntheticActionBundlePackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.actionBundlePackageInputs.forEach((actionBundlePackageInput, index) => {
    const result = buildActionBundlePackage(actionBundlePackageInput);

    warnings.push(...result.warnings.map((warning) => `actionBundlePackageInputs[${index}]: ${warning}`));

    if (result.actionBundlePackage) {
      actionBundlePackages.push(result.actionBundlePackage);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    actionBundlePackages,
    skippedIndexes,
    warnings,
  };
}
