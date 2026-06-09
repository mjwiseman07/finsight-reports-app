import {
  buildOrganizationalKnowledge,
  type BuildOrganizationalKnowledgeInput,
  type BuildOrganizationalKnowledgeResult,
  type SyntheticOrganizationalKnowledge,
} from "./buildOrganizationalKnowledge";

export interface BuildOrganizationalKnowledgeCollectionInput {
  requests: BuildOrganizationalKnowledgeInput[];
}

export interface BuildOrganizationalKnowledgeCollectionResult {
  organizationalKnowledgeArtifacts: SyntheticOrganizationalKnowledge[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildOrganizationalKnowledgeResult[];
}

export function buildOrganizationalKnowledgeCollection(
  input: BuildOrganizationalKnowledgeCollectionInput,
): BuildOrganizationalKnowledgeCollectionResult {
  const organizationalKnowledgeArtifacts: SyntheticOrganizationalKnowledge[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildOrganizationalKnowledgeResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      organizationalKnowledgeArtifacts,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildOrganizationalKnowledge(request);
    results.push(result);

    if (result.organizationalKnowledge) {
      organizationalKnowledgeArtifacts.push(result.organizationalKnowledge);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    organizationalKnowledgeArtifacts,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
