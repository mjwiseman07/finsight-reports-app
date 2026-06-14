import {
  buildOrganizationalKnowledgeGraph,
  type BuildOrganizationalKnowledgeGraphInput,
  type SyntheticOrganizationalKnowledgeGraph,
} from "./buildOrganizationalKnowledgeGraph";

export interface BuildOrganizationalKnowledgeGraphsInput {
  organizationalKnowledgeGraphInputs: BuildOrganizationalKnowledgeGraphInput[];
}

export interface BuildOrganizationalKnowledgeGraphsResult {
  organizationalKnowledgeGraphs: SyntheticOrganizationalKnowledgeGraph[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildOrganizationalKnowledgeGraphs(
  input: BuildOrganizationalKnowledgeGraphsInput,
): BuildOrganizationalKnowledgeGraphsResult {
  const organizationalKnowledgeGraphs: SyntheticOrganizationalKnowledgeGraph[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.organizationalKnowledgeGraphInputs.forEach((organizationalKnowledgeGraphInput, index) => {
    const result = buildOrganizationalKnowledgeGraph(organizationalKnowledgeGraphInput);

    warnings.push(...result.warnings.map((warning) => `organizationalKnowledgeGraphInputs[${index}]: ${warning}`));

    if (result.organizationalKnowledgeGraph) {
      organizationalKnowledgeGraphs.push(result.organizationalKnowledgeGraph);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    organizationalKnowledgeGraphs,
    skippedIndexes,
    warnings,
  };
}
