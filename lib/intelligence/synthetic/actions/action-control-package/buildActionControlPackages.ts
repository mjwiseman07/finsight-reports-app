import {
  buildActionControlPackage,
  type BuildActionControlPackageInput,
  type SyntheticActionControlPackage,
} from "./buildActionControlPackage";

export interface BuildActionControlPackagesInput {
  items: BuildActionControlPackageInput[];
}

export interface BuildActionControlPackagesResult {
  actionControlPackages: SyntheticActionControlPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildActionControlPackages(input: BuildActionControlPackagesInput): BuildActionControlPackagesResult {
  const actionControlPackages: SyntheticActionControlPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildActionControlPackage(item);

    if (result.actionControlPackage) {
      actionControlPackages.push(result.actionControlPackage);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `actionControlPackages[${index}]: ${warning}`));
  });

  return {
    actionControlPackages,
    skippedIndexes,
    warnings,
  };
}
