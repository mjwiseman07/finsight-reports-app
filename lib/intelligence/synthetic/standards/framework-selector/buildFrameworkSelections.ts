import {
  buildFrameworkSelection,
  type BuildFrameworkSelectionInput,
  type SyntheticFrameworkSelection,
} from "./buildFrameworkSelection";

export interface BuildFrameworkSelectionsInput {
  frameworkSelections: BuildFrameworkSelectionInput[];
}

export interface BuildFrameworkSelectionsResult {
  frameworkSelections: SyntheticFrameworkSelection[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildFrameworkSelections(input: BuildFrameworkSelectionsInput): BuildFrameworkSelectionsResult {
  const frameworkSelections: SyntheticFrameworkSelection[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.frameworkSelections.forEach((selectionInput, index) => {
    const result = buildFrameworkSelection({
      ...selectionInput,
      skippedIndexes: [...(selectionInput.skippedIndexes ?? []), index],
    });

    if (result.frameworkSelection) {
      frameworkSelections.push(result.frameworkSelection);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `frameworkSelection[${index}]: ${warning}`));
  });

  return {
    frameworkSelections,
    skippedIndexes,
    warnings,
  };
}
