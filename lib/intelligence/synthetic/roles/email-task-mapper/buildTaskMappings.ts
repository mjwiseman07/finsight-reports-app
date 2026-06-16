import {
  buildTaskMapping,
  type BuildTaskMappingInput,
  type SyntheticTaskMapping,
} from "./buildTaskMapping";

export interface BuildTaskMappingsInput {
  items: BuildTaskMappingInput[];
}

export interface BuildTaskMappingsResult {
  taskMappings: SyntheticTaskMapping[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildTaskMappings(input: BuildTaskMappingsInput): BuildTaskMappingsResult {
  const taskMappings: SyntheticTaskMapping[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildTaskMapping(item);

    if (result.taskMapping) {
      taskMappings.push(result.taskMapping);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `taskMappings[${index}]: ${warning}`));
  });

  return {
    taskMappings,
    skippedIndexes,
    warnings,
  };
}
