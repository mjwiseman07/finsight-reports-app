import {
  buildMorningSummary,
  type BuildMorningSummaryInput,
  type SyntheticMorningSummary,
} from "./buildMorningSummary";

export interface BuildMorningSummariesInput {
  summaries: BuildMorningSummaryInput[];
}

export interface BuildMorningSummariesResult {
  morningSummaries: SyntheticMorningSummary[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildMorningSummaries(input: BuildMorningSummariesInput): BuildMorningSummariesResult {
  const morningSummaries: SyntheticMorningSummary[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.summaries.forEach((summaryInput, index) => {
    const result = buildMorningSummary({
      ...summaryInput,
      skippedIndexes: [...(summaryInput.skippedIndexes ?? []), index],
    });

    if (result.morningSummary) {
      morningSummaries.push(result.morningSummary);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `summary[${index}]: ${warning}`));
  });

  return {
    morningSummaries,
    skippedIndexes,
    warnings,
  };
}
