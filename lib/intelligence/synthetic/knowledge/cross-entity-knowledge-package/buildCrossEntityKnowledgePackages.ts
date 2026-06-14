import {
  buildCrossEntityKnowledgePackage,
  type BuildCrossEntityKnowledgePackageInput,
  type SyntheticCrossEntityKnowledgePackage,
} from "./buildCrossEntityKnowledgePackage";

export interface BuildCrossEntityKnowledgePackagesInput {
  crossEntityKnowledgePackageInputs: BuildCrossEntityKnowledgePackageInput[];
}

export interface BuildCrossEntityKnowledgePackagesResult {
  crossEntityKnowledgePackages: SyntheticCrossEntityKnowledgePackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildCrossEntityKnowledgePackages(
  input: BuildCrossEntityKnowledgePackagesInput,
): BuildCrossEntityKnowledgePackagesResult {
  const crossEntityKnowledgePackages: SyntheticCrossEntityKnowledgePackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.crossEntityKnowledgePackageInputs.forEach((crossEntityKnowledgePackageInput, index) => {
    const result = buildCrossEntityKnowledgePackage(crossEntityKnowledgePackageInput);

    warnings.push(...result.warnings.map((warning) => `crossEntityKnowledgePackageInputs[${index}]: ${warning}`));

    if (result.crossEntityKnowledgePackage) {
      crossEntityKnowledgePackages.push(result.crossEntityKnowledgePackage);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    crossEntityKnowledgePackages,
    skippedIndexes,
    warnings,
  };
}
