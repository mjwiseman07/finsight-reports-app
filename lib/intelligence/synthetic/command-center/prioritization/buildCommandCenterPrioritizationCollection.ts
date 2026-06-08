import {
  buildCommandCenterPrioritization,
  type BuildCommandCenterPrioritizationInput,
  type BuildCommandCenterPrioritizationResult,
  type SyntheticCommandCenterPrioritizationPackage,
} from "./buildCommandCenterPrioritization";

export interface BuildCommandCenterPrioritizationCollectionInput {
  requests: BuildCommandCenterPrioritizationInput[];
}

export interface BuildCommandCenterPrioritizationCollectionResult {
  prioritizationPackages: SyntheticCommandCenterPrioritizationPackage[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildCommandCenterPrioritizationResult[];
}

export function buildCommandCenterPrioritizationCollection(
  input: BuildCommandCenterPrioritizationCollectionInput,
): BuildCommandCenterPrioritizationCollectionResult {
  const prioritizationPackages: SyntheticCommandCenterPrioritizationPackage[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildCommandCenterPrioritizationResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      prioritizationPackages,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildCommandCenterPrioritization(request);
    results.push(result);

    if (result.prioritizationPackage) {
      prioritizationPackages.push(result.prioritizationPackage);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    prioritizationPackages,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
