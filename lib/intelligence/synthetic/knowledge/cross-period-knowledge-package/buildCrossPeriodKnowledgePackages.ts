import {
  buildCrossPeriodKnowledgePackage,
  type BuildCrossPeriodKnowledgePackageInput,
  type SyntheticCrossPeriodKnowledgePackage,
} from "./buildCrossPeriodKnowledgePackage";

export interface BuildCrossPeriodKnowledgePackagesInput {
  crossPeriodKnowledgePackageInputs: BuildCrossPeriodKnowledgePackageInput[];
}

export interface BuildCrossPeriodKnowledgePackagesResult {
  crossPeriodKnowledgePackages: SyntheticCrossPeriodKnowledgePackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildCrossPeriodKnowledgePackages(
  input: BuildCrossPeriodKnowledgePackagesInput,
): BuildCrossPeriodKnowledgePackagesResult {
  const crossPeriodKnowledgePackages: SyntheticCrossPeriodKnowledgePackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.crossPeriodKnowledgePackageInputs.forEach((crossPeriodKnowledgePackageInput, index) => {
    const result = buildCrossPeriodKnowledgePackage(crossPeriodKnowledgePackageInput);

    warnings.push(...result.warnings.map((warning) => `crossPeriodKnowledgePackageInputs[${index}]: ${warning}`));

    if (result.crossPeriodKnowledgePackage) {
      crossPeriodKnowledgePackages.push(result.crossPeriodKnowledgePackage);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    crossPeriodKnowledgePackages,
    skippedIndexes,
    warnings,
  };
}
