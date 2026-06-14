import {
  buildOrganizationalMemoryGraph,
  type BuildOrganizationalMemoryGraphInput,
  type SyntheticOrganizationalMemoryGraph,
} from "./buildOrganizationalMemoryGraph";

export interface BuildOrganizationalMemoryGraphsInput {
  graphInputs: BuildOrganizationalMemoryGraphInput[];
}

export interface BuildOrganizationalMemoryGraphsResult {
  organizationalMemoryGraphs: SyntheticOrganizationalMemoryGraph[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildOrganizationalMemoryGraphs(input: BuildOrganizationalMemoryGraphsInput): BuildOrganizationalMemoryGraphsResult {
  const organizationalMemoryGraphs: SyntheticOrganizationalMemoryGraph[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.graphInputs.forEach((graphInput, index) => {
    const result = buildOrganizationalMemoryGraph(graphInput);

    warnings.push(...result.warnings.map((warning) => `graphInputs[${index}]: ${warning}`));

    if (result.organizationalMemoryGraph) {
      organizationalMemoryGraphs.push(result.organizationalMemoryGraph);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }
  });

  return {
    organizationalMemoryGraphs,
    skippedIndexes,
    warnings,
  };
}
