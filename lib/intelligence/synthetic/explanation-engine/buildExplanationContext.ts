import { getExplanationClaimRegistryEntry } from "./explanationClaimRegistry";
import { getRecommendationActionRegistryEntry } from "./recommendationActionRegistry";
import type { SyntheticExplanationInput } from "./types";
import type { SyntheticRecommendationCandidate } from "../types/recommendation";

export function buildExplanationContext({
  recommendation,
  createdAt,
  tone = "concise",
  maxSummarySentences = 2,
}: {
  recommendation: SyntheticRecommendationCandidate;
  createdAt: string;
  tone?: SyntheticExplanationInput["tone"];
  maxSummarySentences?: number;
}): SyntheticExplanationInput | null {
  const claimRegistryEntry = getExplanationClaimRegistryEntry(recommendation.recommendationType);
  const actionRegistryEntry = getRecommendationActionRegistryEntry(recommendation.recommendationType);
  if (!claimRegistryEntry || !actionRegistryEntry) return null;
  return {
    recommendation,
    claimRegistryEntry,
    actionRegistryEntry,
    tone,
    maxSummarySentences,
    createdAt,
  };
}
