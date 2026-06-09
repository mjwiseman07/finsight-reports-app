import {
  buildForecastMemory,
  type BuildForecastMemoryInput,
  type BuildForecastMemoryResult,
  type SyntheticForecastMemory,
} from "./buildForecastMemory";

export interface BuildForecastMemoriesInput {
  requests: BuildForecastMemoryInput[];
}

export interface BuildForecastMemoriesResult {
  forecastMemories: SyntheticForecastMemory[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildForecastMemoryResult[];
}

export function buildForecastMemories(input: BuildForecastMemoriesInput): BuildForecastMemoriesResult {
  const forecastMemories: SyntheticForecastMemory[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildForecastMemoryResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      forecastMemories,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildForecastMemory(request);
    results.push(result);

    if (result.forecastMemory) {
      forecastMemories.push(result.forecastMemory);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    forecastMemories,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
