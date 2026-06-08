import {
  buildCommandCenterExecutiveSummary,
  type BuildCommandCenterExecutiveSummaryInput,
  type BuildCommandCenterExecutiveSummaryResult,
  type SyntheticCommandCenterExecutiveSummary,
} from "./buildCommandCenterExecutiveSummary";

export interface BuildCommandCenterExecutiveSummariesInput {
  requests: BuildCommandCenterExecutiveSummaryInput[];
}

export interface BuildCommandCenterExecutiveSummariesResult {
  executiveSummaries: SyntheticCommandCenterExecutiveSummary[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildCommandCenterExecutiveSummaryResult[];
}

export function buildCommandCenterExecutiveSummaries(
  input: BuildCommandCenterExecutiveSummariesInput,
): BuildCommandCenterExecutiveSummariesResult {
  const executiveSummaries: SyntheticCommandCenterExecutiveSummary[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildCommandCenterExecutiveSummaryResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      executiveSummaries,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildCommandCenterExecutiveSummary(request);
    results.push(result);

    if (result.executiveSummary) {
      executiveSummaries.push(result.executiveSummary);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    executiveSummaries,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
