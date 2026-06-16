import {
  buildWorkpaperPackage,
  type BuildWorkpaperPackageInput,
  type SyntheticWorkpaperPackage,
} from "./buildWorkpaperPackage";

export interface BuildWorkpaperPackagesInput {
  items: BuildWorkpaperPackageInput[];
}

export interface BuildWorkpaperPackagesResult {
  workpaperPackages: SyntheticWorkpaperPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildWorkpaperPackages(input: BuildWorkpaperPackagesInput): BuildWorkpaperPackagesResult {
  const workpaperPackages: SyntheticWorkpaperPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildWorkpaperPackage(item);

    if (result.workpaperPackage) {
      workpaperPackages.push(result.workpaperPackage);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `workpaperPackages[${index}]: ${warning}`));
  });

  return {
    workpaperPackages,
    skippedIndexes,
    warnings,
  };
}
