import {
  buildAuditWatchlistGeneration,
  type BuildAuditWatchlistGenerationInput,
  type BuildAuditWatchlistGenerationResult,
  type SyntheticAuditWatchlistGeneration,
} from "./buildAuditWatchlistGeneration";

export interface BuildAuditWatchlistGenerationsInput {
  requests: BuildAuditWatchlistGenerationInput[];
}

export interface BuildAuditWatchlistGenerationsResult {
  auditWatchlistGenerations: SyntheticAuditWatchlistGeneration[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildAuditWatchlistGenerationResult[];
}

export function buildAuditWatchlistGenerations(
  input: BuildAuditWatchlistGenerationsInput,
): BuildAuditWatchlistGenerationsResult {
  const auditWatchlistGenerations: SyntheticAuditWatchlistGeneration[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildAuditWatchlistGenerationResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      auditWatchlistGenerations,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildAuditWatchlistGeneration(request);
    results.push(result);

    if (result.auditWatchlistGeneration) {
      auditWatchlistGenerations.push(result.auditWatchlistGeneration);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    auditWatchlistGenerations,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
