import {
  buildRecommendationMemory,
  type BuildRecommendationMemoryInput,
  type BuildRecommendationMemoryResult,
  type SyntheticRecommendationMemory,
} from "./buildRecommendationMemory";

export interface BuildRecommendationMemoriesInput {
  requests: BuildRecommendationMemoryInput[];
}

export interface BuildRecommendationMemoriesResult {
  recommendationMemories: SyntheticRecommendationMemory[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildRecommendationMemoryResult[];
}

export function buildRecommendationMemories(
  input: BuildRecommendationMemoriesInput,
): BuildRecommendationMemoriesResult {
  const recommendationMemories: SyntheticRecommendationMemory[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildRecommendationMemoryResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      recommendationMemories,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildRecommendationMemory(request);
    results.push(result);

    if (result.recommendationMemory) {
      recommendationMemories.push(result.recommendationMemory);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    recommendationMemories,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
