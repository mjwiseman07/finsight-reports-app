import type {
  SyntheticCompanyMemorySourceRef,
  SyntheticRecommendationOutcome,
  SyntheticRecommendationOutcomeMetric,
  SyntheticRecommendationOutcomeStatus,
} from "./types";
import { stableMemoryHash } from "./stableMemoryHash";

export function buildRecommendationOutcome(input: {
  recommendationId: string;
  outcomeStatus: SyntheticRecommendationOutcomeStatus;
  outcomeMetrics: SyntheticRecommendationOutcomeMetric[];
  outcomeEvidence: SyntheticCompanyMemorySourceRef[];
  reviewedBy: string;
  reviewDate: string;
}): SyntheticRecommendationOutcome {
  const outcomeId = stableMemoryHash({
    type: "recommendation_outcome",
    recommendationId: input.recommendationId,
    outcomeStatus: input.outcomeStatus,
    outcomeMetrics: input.outcomeMetrics,
    reviewDate: input.reviewDate,
  });

  return {
    outcomeId,
    recommendationId: input.recommendationId,
    outcomeStatus: input.outcomeStatus,
    outcomeMetrics: input.outcomeMetrics,
    outcomeEvidence: input.outcomeEvidence,
    reviewedBy: input.reviewedBy,
    reviewDate: input.reviewDate,
  };
}
