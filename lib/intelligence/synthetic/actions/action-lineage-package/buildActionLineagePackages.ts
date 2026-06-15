import {
  buildActionLineagePackage,
  type BuildActionLineagePackageInput,
  type SyntheticActionLineagePackage,
} from "./buildActionLineagePackage";

export interface BuildActionLineagePackagesInput {
  actionLineagePackageInputs: BuildActionLineagePackageInput[];
}

export interface BuildActionLineagePackagesResult {
  actionLineagePackages: SyntheticActionLineagePackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildActionLineagePackages(input: BuildActionLineagePackagesInput): BuildActionLineagePackagesResult {
  const actionLineagePackages: SyntheticActionLineagePackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.actionLineagePackageInputs.forEach((actionLineagePackageInput, index) => {
    const result = buildActionLineagePackage(actionLineagePackageInput);

    warnings.push(...result.warnings.map((warning) => `actionLineagePackageInputs[${index}]: ${warning}`));

    if (result.actionLineagePackage) {
      actionLineagePackages.push(result.actionLineagePackage);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    actionLineagePackages,
    skippedIndexes,
    warnings,
  };
}
