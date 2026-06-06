import type { SyntheticStructuredRecommendationCandidate } from "../candidates";
import {
  buildRecommendationMemoryCandidate,
  type BuildRecommendationMemoryCandidateResult,
  type SyntheticRecommendationMemoryCandidate,
} from "./buildRecommendationMemoryCandidate";

export interface BuildRecommendationMemoryCandidatesInput {
  companyId: string;
  candidates: Array<SyntheticStructuredRecommendationCandidate | null>;
}

export interface BuildRecommendationMemoryCandidatesResult {
  candidates: SyntheticRecommendationMemoryCandidate[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildRecommendationMemoryCandidateResult[];
}

export function buildRecommendationMemoryCandidates(
  input: BuildRecommendationMemoryCandidatesInput,
): BuildRecommendationMemoryCandidatesResult {
  const candidates: SyntheticRecommendationMemoryCandidate[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildRecommendationMemoryCandidateResult[] = [];

  if (!Array.isArray(input.candidates)) {
    return {
      candidates,
      skippedRequestIndexes,
      warnings: ["candidates must be an array."],
      results,
    };
  }

  input.candidates.forEach((candidate, index) => {
    const result = buildRecommendationMemoryCandidate({
      companyId: input.companyId,
      candidate,
    });
    results.push(result);

    if (result.candidate) {
      candidates.push(result.candidate);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`candidate[${index}]${candidate?.recommendationId ? ` ${candidate.recommendationId}` : ""}: ${warning}`);
    }
  });

  return {
    candidates,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
