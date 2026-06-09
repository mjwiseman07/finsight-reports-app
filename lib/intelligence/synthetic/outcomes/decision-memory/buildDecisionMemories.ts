import {
  buildDecisionMemory,
  type BuildDecisionMemoryInput,
  type BuildDecisionMemoryResult,
  type SyntheticDecisionMemory,
} from "./buildDecisionMemory";

export interface BuildDecisionMemoriesInput {
  requests: BuildDecisionMemoryInput[];
}

export interface BuildDecisionMemoriesResult {
  decisionMemories: SyntheticDecisionMemory[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildDecisionMemoryResult[];
}

export function buildDecisionMemories(input: BuildDecisionMemoriesInput): BuildDecisionMemoriesResult {
  const decisionMemories: SyntheticDecisionMemory[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildDecisionMemoryResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      decisionMemories,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildDecisionMemory(request);
    results.push(result);

    if (result.decisionMemory) {
      decisionMemories.push(result.decisionMemory);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    decisionMemories,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
