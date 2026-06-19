import {
  buildIndustrySelection,
  type BuildIndustrySelectionInput,
  type SyntheticIndustrySelection,
} from "./buildIndustrySelection";

export interface BuildIndustrySelectionsInput {
  industrySelections: BuildIndustrySelectionInput[];
}

export interface BuildIndustrySelectionsResult {
  industrySelections: SyntheticIndustrySelection[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildIndustrySelections(input: BuildIndustrySelectionsInput): BuildIndustrySelectionsResult {
  const industrySelections: SyntheticIndustrySelection[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.industrySelections.forEach((selectionInput, index) => {
    const result = buildIndustrySelection({
      ...selectionInput,
      skippedIndexes: [...(selectionInput.skippedIndexes ?? []), index],
    });

    if (result.industrySelection) {
      industrySelections.push(result.industrySelection);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `industrySelection[${index}]: ${warning}`));
  });

  return {
    industrySelections,
    skippedIndexes,
    warnings,
  };
}
