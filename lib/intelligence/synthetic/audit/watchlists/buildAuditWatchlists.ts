import {
  buildAuditWatchlist,
  type BuildAuditWatchlistInput,
  type BuildAuditWatchlistResult,
  type SyntheticAuditWatchlist,
} from "./buildAuditWatchlist";

export interface BuildAuditWatchlistsInput {
  requests: BuildAuditWatchlistInput[];
}

export interface BuildAuditWatchlistsResult {
  auditWatchlists: SyntheticAuditWatchlist[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildAuditWatchlistResult[];
}

export function buildAuditWatchlists(input: BuildAuditWatchlistsInput): BuildAuditWatchlistsResult {
  const auditWatchlists: SyntheticAuditWatchlist[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildAuditWatchlistResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      auditWatchlists,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildAuditWatchlist(request);
    results.push(result);

    if (result.auditWatchlist) {
      auditWatchlists.push(result.auditWatchlist);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    auditWatchlists,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
