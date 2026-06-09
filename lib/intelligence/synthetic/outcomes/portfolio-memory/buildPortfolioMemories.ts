import {
  buildPortfolioMemory,
  type BuildPortfolioMemoryInput,
  type BuildPortfolioMemoryResult,
  type SyntheticPortfolioMemory,
} from "./buildPortfolioMemory";

export interface BuildPortfolioMemoriesInput {
  requests: BuildPortfolioMemoryInput[];
}

export interface BuildPortfolioMemoriesResult {
  portfolioMemories: SyntheticPortfolioMemory[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildPortfolioMemoryResult[];
}

export function buildPortfolioMemories(input: BuildPortfolioMemoriesInput): BuildPortfolioMemoriesResult {
  const portfolioMemories: SyntheticPortfolioMemory[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildPortfolioMemoryResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      portfolioMemories,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildPortfolioMemory(request);
    results.push(result);

    if (result.portfolioMemory) {
      portfolioMemories.push(result.portfolioMemory);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    portfolioMemories,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
