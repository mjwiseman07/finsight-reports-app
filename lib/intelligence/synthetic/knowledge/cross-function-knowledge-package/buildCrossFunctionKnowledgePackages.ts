import {
  buildCrossFunctionKnowledgePackage,
  type BuildCrossFunctionKnowledgePackageInput,
  type SyntheticCrossFunctionKnowledgePackage,
} from "./buildCrossFunctionKnowledgePackage";

export interface BuildCrossFunctionKnowledgePackagesInput {
  crossFunctionKnowledgePackageInputs: BuildCrossFunctionKnowledgePackageInput[];
}

export interface BuildCrossFunctionKnowledgePackagesResult {
  crossFunctionKnowledgePackages: SyntheticCrossFunctionKnowledgePackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildCrossFunctionKnowledgePackages(
  input: BuildCrossFunctionKnowledgePackagesInput,
): BuildCrossFunctionKnowledgePackagesResult {
  const crossFunctionKnowledgePackages: SyntheticCrossFunctionKnowledgePackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.crossFunctionKnowledgePackageInputs.forEach((crossFunctionKnowledgePackageInput, index) => {
    const result = buildCrossFunctionKnowledgePackage(crossFunctionKnowledgePackageInput);

    warnings.push(...result.warnings.map((warning) => `crossFunctionKnowledgePackageInputs[${index}]: ${warning}`));

    if (result.crossFunctionKnowledgePackage) {
      crossFunctionKnowledgePackages.push(result.crossFunctionKnowledgePackage);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    crossFunctionKnowledgePackages,
    skippedIndexes,
    warnings,
  };
}
