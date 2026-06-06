import {
  buildRecommendationCandidate,
  type BuildRecommendationCandidateInput,
  type BuildRecommendationCandidateResult,
  type SyntheticStructuredRecommendationCandidate,
} from "./buildRecommendationCandidate";

export interface BuildRecommendationCandidatesInput {
  requests: BuildRecommendationCandidateInput[];
}

export interface BuildRecommendationCandidatesResult {
  candidates: SyntheticStructuredRecommendationCandidate[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildRecommendationCandidateResult[];
}

export function buildRecommendationCandidates(
  input: BuildRecommendationCandidatesInput,
): BuildRecommendationCandidatesResult {
  const candidates: SyntheticStructuredRecommendationCandidate[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildRecommendationCandidateResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      candidates,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildRecommendationCandidate(request);
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
