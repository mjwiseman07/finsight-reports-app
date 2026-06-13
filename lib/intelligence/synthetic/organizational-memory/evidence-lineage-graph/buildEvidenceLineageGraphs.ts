import {
  buildEvidenceLineageGraph,
  type BuildEvidenceLineageGraphInput,
  type SyntheticEvidenceLineageGraph,
} from "./buildEvidenceLineageGraph";

export interface BuildEvidenceLineageGraphsInput {
  graphInputs: BuildEvidenceLineageGraphInput[];
}

export interface BuildEvidenceLineageGraphsResult {
  evidenceLineageGraphs: SyntheticEvidenceLineageGraph[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildEvidenceLineageGraphs(input: BuildEvidenceLineageGraphsInput): BuildEvidenceLineageGraphsResult {
  const evidenceLineageGraphs: SyntheticEvidenceLineageGraph[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.graphInputs.forEach((graphInput, index) => {
    const result = buildEvidenceLineageGraph(graphInput);

    warnings.push(...result.warnings.map((warning) => `graphInputs[${index}]: ${warning}`));

    if (result.evidenceLineageGraph) {
      evidenceLineageGraphs.push(result.evidenceLineageGraph);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }
  });

  return {
    evidenceLineageGraphs,
    skippedIndexes,
    warnings,
  };
}
