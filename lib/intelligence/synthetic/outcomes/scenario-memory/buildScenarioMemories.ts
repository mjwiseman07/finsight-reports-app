import {
  buildScenarioMemory,
  type BuildScenarioMemoryInput,
  type BuildScenarioMemoryResult,
  type SyntheticScenarioMemory,
} from "./buildScenarioMemory";

export interface BuildScenarioMemoriesInput {
  requests: BuildScenarioMemoryInput[];
}

export interface BuildScenarioMemoriesResult {
  scenarioMemories: SyntheticScenarioMemory[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildScenarioMemoryResult[];
}

export function buildScenarioMemories(input: BuildScenarioMemoriesInput): BuildScenarioMemoriesResult {
  const scenarioMemories: SyntheticScenarioMemory[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildScenarioMemoryResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      scenarioMemories,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildScenarioMemory(request);
    results.push(result);

    if (result.scenarioMemory) {
      scenarioMemories.push(result.scenarioMemory);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    scenarioMemories,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
