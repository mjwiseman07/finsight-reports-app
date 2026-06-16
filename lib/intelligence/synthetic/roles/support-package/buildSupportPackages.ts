import {
  buildSupportPackage,
  type BuildSupportPackageInput,
  type SyntheticSupportPackage,
} from "./buildSupportPackage";

export interface BuildSupportPackagesInput {
  items: BuildSupportPackageInput[];
}

export interface BuildSupportPackagesResult {
  supportPackages: SyntheticSupportPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildSupportPackages(input: BuildSupportPackagesInput): BuildSupportPackagesResult {
  const supportPackages: SyntheticSupportPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildSupportPackage(item);

    if (result.supportPackage) {
      supportPackages.push(result.supportPackage);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `supportPackages[${index}]: ${warning}`));
  });

  return {
    supportPackages,
    skippedIndexes,
    warnings,
  };
}
