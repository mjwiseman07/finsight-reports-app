import {
  buildConsolidationHierarchy,
  type BuildConsolidationHierarchyInput,
  type SyntheticConsolidationHierarchy,
} from "./buildConsolidationHierarchy";

export interface BuildConsolidationHierarchiesInput {
  consolidationHierarchies: BuildConsolidationHierarchyInput[];
}

export interface BuildConsolidationHierarchiesResult {
  consolidationHierarchies: SyntheticConsolidationHierarchy[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildConsolidationHierarchies(
  input: BuildConsolidationHierarchiesInput,
): BuildConsolidationHierarchiesResult {
  const consolidationHierarchies: SyntheticConsolidationHierarchy[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.consolidationHierarchies.forEach((hierarchyInput, index) => {
    const result = buildConsolidationHierarchy({
      ...hierarchyInput,
      skippedIndexes: [...(hierarchyInput.skippedIndexes ?? []), index],
    });

    if (result.consolidationHierarchy) {
      consolidationHierarchies.push(result.consolidationHierarchy);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(
      ...result.warnings.map((warning) => `consolidationHierarchy[${index}]: ${warning}`),
    );
  });

  return {
    consolidationHierarchies,
    skippedIndexes,
    warnings,
  };
}
