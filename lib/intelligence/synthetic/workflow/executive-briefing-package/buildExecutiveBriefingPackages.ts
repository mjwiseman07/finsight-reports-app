import {
  buildExecutiveBriefingPackage,
  type BuildExecutiveBriefingPackageInput,
  type SyntheticExecutiveBriefingPackage,
} from "./buildExecutiveBriefingPackage";

export interface BuildExecutiveBriefingPackagesInput {
  executiveBriefingPackageInputs: BuildExecutiveBriefingPackageInput[];
}

export interface BuildExecutiveBriefingPackagesResult {
  executiveBriefingPackages: SyntheticExecutiveBriefingPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildExecutiveBriefingPackages(input: BuildExecutiveBriefingPackagesInput): BuildExecutiveBriefingPackagesResult {
  const executiveBriefingPackages: SyntheticExecutiveBriefingPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.executiveBriefingPackageInputs.forEach((executiveBriefingPackageInput, index) => {
    const result = buildExecutiveBriefingPackage(executiveBriefingPackageInput);
    warnings.push(...result.warnings.map((warning) => `executiveBriefingPackageInputs[${index}]: ${warning}`));

    if (result.skipped || !result.executiveBriefingPackage) {
      skippedIndexes.push(index);
      return;
    }

    executiveBriefingPackages.push(result.executiveBriefingPackage);
  });

  return {
    executiveBriefingPackages,
    skippedIndexes,
    warnings,
  };
}
