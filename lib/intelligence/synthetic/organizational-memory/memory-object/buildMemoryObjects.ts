import {
  buildMemoryObject,
  type BuildMemoryObjectInput,
  type SyntheticMemoryObject,
} from "./buildMemoryObject";

export interface BuildMemoryObjectsInput {
  memoryObjectInputs: BuildMemoryObjectInput[];
}

export interface BuildMemoryObjectsResult {
  memoryObjects: SyntheticMemoryObject[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildMemoryObjects(input: BuildMemoryObjectsInput): BuildMemoryObjectsResult {
  const memoryObjects: SyntheticMemoryObject[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.memoryObjectInputs.forEach((memoryObjectInput, index) => {
    const result = buildMemoryObject(memoryObjectInput);
    warnings.push(...result.warnings.map((warning) => `memoryObjectInputs[${index}]: ${warning}`));

    if (result.memoryObject) {
      memoryObjects.push(result.memoryObject);
      return;
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }
  });

  return {
    memoryObjects,
    skippedIndexes,
    warnings,
  };
}
