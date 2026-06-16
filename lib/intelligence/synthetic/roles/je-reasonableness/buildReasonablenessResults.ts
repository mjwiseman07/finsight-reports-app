import {
  buildReasonablenessResult,
  type BuildReasonablenessResultInput,
  type SyntheticReasonablenessResult,
} from "./buildReasonablenessResult";

export interface BuildReasonablenessResultsInput {
  items: BuildReasonablenessResultInput[];
}

export interface BuildReasonablenessResultsResult {
  reasonablenessResults: SyntheticReasonablenessResult[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildReasonablenessResults(
  input: BuildReasonablenessResultsInput,
): BuildReasonablenessResultsResult {
  const reasonablenessResults: SyntheticReasonablenessResult[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildReasonablenessResult(item);

    if (result.reasonablenessResult) {
      reasonablenessResults.push(result.reasonablenessResult);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `reasonablenessResults[${index}]: ${warning}`));
  });

  return {
    reasonablenessResults,
    skippedIndexes,
    warnings,
  };
}
