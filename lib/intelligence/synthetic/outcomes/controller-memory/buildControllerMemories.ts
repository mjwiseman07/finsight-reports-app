import {
  buildControllerMemory,
  type BuildControllerMemoryInput,
  type BuildControllerMemoryResult,
  type SyntheticControllerMemory,
} from "./buildControllerMemory";

export interface BuildControllerMemoriesInput {
  requests: BuildControllerMemoryInput[];
}

export interface BuildControllerMemoriesResult {
  controllerMemories: SyntheticControllerMemory[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildControllerMemoryResult[];
}

export function buildControllerMemories(input: BuildControllerMemoriesInput): BuildControllerMemoriesResult {
  const controllerMemories: SyntheticControllerMemory[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildControllerMemoryResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      controllerMemories,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildControllerMemory(request);
    results.push(result);

    if (result.controllerMemory) {
      controllerMemories.push(result.controllerMemory);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    controllerMemories,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
