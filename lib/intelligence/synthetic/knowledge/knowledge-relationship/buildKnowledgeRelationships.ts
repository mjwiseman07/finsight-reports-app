import {
  buildKnowledgeRelationship,
  type BuildKnowledgeRelationshipInput,
  type SyntheticKnowledgeRelationship,
} from "./buildKnowledgeRelationship";

export interface BuildKnowledgeRelationshipsInput {
  knowledgeRelationshipInputs: BuildKnowledgeRelationshipInput[];
}

export interface BuildKnowledgeRelationshipsResult {
  knowledgeRelationships: SyntheticKnowledgeRelationship[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildKnowledgeRelationships(input: BuildKnowledgeRelationshipsInput): BuildKnowledgeRelationshipsResult {
  const knowledgeRelationships: SyntheticKnowledgeRelationship[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.knowledgeRelationshipInputs.forEach((knowledgeRelationshipInput, index) => {
    const result = buildKnowledgeRelationship(knowledgeRelationshipInput);

    warnings.push(...result.warnings.map((warning) => `knowledgeRelationshipInputs[${index}]: ${warning}`));

    if (result.knowledgeRelationship) {
      knowledgeRelationships.push(result.knowledgeRelationship);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    knowledgeRelationships,
    skippedIndexes,
    warnings,
  };
}
