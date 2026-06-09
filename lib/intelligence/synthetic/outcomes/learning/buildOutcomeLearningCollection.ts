import {
  buildOutcomeLearning,
  type BuildOutcomeLearningInput,
  type BuildOutcomeLearningResult,
  type SyntheticOutcomeLearningPackage,
} from "./buildOutcomeLearning";

export interface BuildOutcomeLearningCollectionInput {
  requests: BuildOutcomeLearningInput[];
}

export interface BuildOutcomeLearningCollectionResult {
  outcomeLearningPackages: SyntheticOutcomeLearningPackage[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildOutcomeLearningResult[];
}

export function buildOutcomeLearningCollection(
  input: BuildOutcomeLearningCollectionInput,
): BuildOutcomeLearningCollectionResult {
  const outcomeLearningPackages: SyntheticOutcomeLearningPackage[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildOutcomeLearningResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      outcomeLearningPackages,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildOutcomeLearning(request);
    results.push(result);

    if (result.outcomeLearningPackage) {
      outcomeLearningPackages.push(result.outcomeLearningPackage);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    outcomeLearningPackages,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
