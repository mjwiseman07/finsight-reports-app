import { buildExplanationContext } from "./buildExplanationContext";
import type { SyntheticExplanationInput } from "./types";
import type { SyntheticRecommendationCandidate } from "../types/recommendation";

export function mapRecommendationsToExplanationInputs(
  recommendations: SyntheticRecommendationCandidate[],
  createdAt: string,
): SyntheticExplanationInput[] {
  return recommendations
    .map((recommendation) => buildExplanationContext({ recommendation, createdAt }))
    .filter((input): input is SyntheticExplanationInput => Boolean(input));
}
