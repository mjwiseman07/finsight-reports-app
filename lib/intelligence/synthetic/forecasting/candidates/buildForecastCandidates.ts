import {
  buildForecastCandidate,
  type BuildForecastCandidateInput,
  type BuildForecastCandidateResult,
  type SyntheticStructuredForecastCandidate,
} from "./buildForecastCandidate";

export interface BuildForecastCandidatesInput {
  requests: BuildForecastCandidateInput[];
}

export interface BuildForecastCandidatesResult {
  candidates: SyntheticStructuredForecastCandidate[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildForecastCandidateResult[];
}

export function buildForecastCandidates(input: BuildForecastCandidatesInput): BuildForecastCandidatesResult {
  const candidates: SyntheticStructuredForecastCandidate[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildForecastCandidateResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      candidates,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildForecastCandidate(request);
    results.push(result);

    if (result.candidate) {
      candidates.push(result.candidate);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    candidates,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
