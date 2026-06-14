import { buildKnowledgeObject, type BuildKnowledgeObjectInput, type SyntheticKnowledgeObject } from "./buildKnowledgeObject";

export interface BuildKnowledgeObjectsInput {
  knowledgeInputs: BuildKnowledgeObjectInput[];
}

export interface BuildKnowledgeObjectsResult {
  knowledgeObjects: SyntheticKnowledgeObject[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildKnowledgeObjects(input: BuildKnowledgeObjectsInput): BuildKnowledgeObjectsResult {
  const knowledgeObjects: SyntheticKnowledgeObject[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.knowledgeInputs.forEach((knowledgeInput, index) => {
    const result = buildKnowledgeObject(knowledgeInput);

    warnings.push(...result.warnings.map((warning) => `knowledgeInputs[${index}]: ${warning}`));

    if (result.knowledgeObject) {
      knowledgeObjects.push(result.knowledgeObject);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    knowledgeObjects,
    skippedIndexes,
    warnings,
  };
}
