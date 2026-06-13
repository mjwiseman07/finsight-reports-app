import { buildMemoryRelationship, type BuildMemoryRelationshipInput, type SyntheticMemoryRelationship } from "./buildMemoryRelationship";

export interface BuildMemoryRelationshipsInput {
  relationshipInputs: BuildMemoryRelationshipInput[];
}

export interface BuildMemoryRelationshipsResult {
  memoryRelationships: SyntheticMemoryRelationship[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildMemoryRelationships(input: BuildMemoryRelationshipsInput): BuildMemoryRelationshipsResult {
  const memoryRelationships: SyntheticMemoryRelationship[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.relationshipInputs.forEach((relationshipInput, index) => {
    const result = buildMemoryRelationship(relationshipInput);

    warnings.push(...result.warnings.map((warning) => `relationshipInputs[${index}]: ${warning}`));

    if (result.memoryRelationship) {
      memoryRelationships.push(result.memoryRelationship);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }
  });

  return {
    memoryRelationships,
    skippedIndexes,
    warnings,
  };
}
