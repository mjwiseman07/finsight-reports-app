import {
  buildHistoricalKnowledgePackage,
  type BuildHistoricalKnowledgePackageInput,
  type SyntheticHistoricalKnowledgePackage,
} from "./buildHistoricalKnowledgePackage";

export interface BuildHistoricalKnowledgePackagesInput {
  historicalKnowledgeInputs: BuildHistoricalKnowledgePackageInput[];
}

export interface BuildHistoricalKnowledgePackagesResult {
  historicalKnowledgePackages: SyntheticHistoricalKnowledgePackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildHistoricalKnowledgePackages(
  input: BuildHistoricalKnowledgePackagesInput,
): BuildHistoricalKnowledgePackagesResult {
  const historicalKnowledgePackages: SyntheticHistoricalKnowledgePackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.historicalKnowledgeInputs.forEach((historicalKnowledgeInput, index) => {
    const result = buildHistoricalKnowledgePackage(historicalKnowledgeInput);

    warnings.push(...result.warnings.map((warning) => `historicalKnowledgeInputs[${index}]: ${warning}`));

    if (result.historicalKnowledgePackage) {
      historicalKnowledgePackages.push(result.historicalKnowledgePackage);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    historicalKnowledgePackages,
    skippedIndexes,
    warnings,
  };
}
