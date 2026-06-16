import {
  buildLeadSheet,
  type BuildLeadSheetInput,
  type SyntheticLeadSheet,
} from "./buildLeadSheet";

export interface BuildLeadSheetsInput {
  items: BuildLeadSheetInput[];
}

export interface BuildLeadSheetsResult {
  leadSheets: SyntheticLeadSheet[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildLeadSheets(input: BuildLeadSheetsInput): BuildLeadSheetsResult {
  const leadSheets: SyntheticLeadSheet[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildLeadSheet(item);

    if (result.leadSheet) {
      leadSheets.push(result.leadSheet);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `leadSheets[${index}]: ${warning}`));
  });

  return {
    leadSheets,
    skippedIndexes,
    warnings,
  };
}
