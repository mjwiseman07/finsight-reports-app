import {
  buildCommandCenterWatchlist,
  type BuildCommandCenterWatchlistInput,
  type BuildCommandCenterWatchlistResult,
  type SyntheticCommandCenterWatchlist,
} from "./buildCommandCenterWatchlist";

export interface BuildCommandCenterWatchlistsInput {
  requests: BuildCommandCenterWatchlistInput[];
}

export interface BuildCommandCenterWatchlistsResult {
  watchlists: SyntheticCommandCenterWatchlist[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildCommandCenterWatchlistResult[];
}

export function buildCommandCenterWatchlists(input: BuildCommandCenterWatchlistsInput): BuildCommandCenterWatchlistsResult {
  const watchlists: SyntheticCommandCenterWatchlist[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildCommandCenterWatchlistResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      watchlists,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildCommandCenterWatchlist(request);
    results.push(result);

    if (result.watchlist) {
      watchlists.push(result.watchlist);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    watchlists,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
