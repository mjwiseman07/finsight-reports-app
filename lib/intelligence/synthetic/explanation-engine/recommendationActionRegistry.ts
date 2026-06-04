import type { SyntheticRecommendationActionRegistryEntry } from "../types/explanation";

export const recommendationActionRegistry: SyntheticRecommendationActionRegistryEntry[] = [
  {
    recommendationType: "working_capital_liquidity_review",
    allowedActionTypes: ["review", "investigate", "analyze"],
    allowedExplanationContexts: ["risk", "observation", "driver", "limitation"],
    disallowedActionTypes: ["execute", "guarantee", "predict"],
  },
  {
    recommendationType: "margin_structure_review",
    allowedActionTypes: ["review", "investigate", "analyze"],
    allowedExplanationContexts: ["trend", "risk", "observation", "driver", "limitation"],
    disallowedActionTypes: ["execute", "guarantee", "predict"],
  },
  {
    recommendationType: "benchmark_gap_review",
    allowedActionTypes: ["review", "investigate", "analyze"],
    allowedExplanationContexts: ["observation", "driver", "limitation"],
    disallowedActionTypes: ["execute", "guarantee", "predict"],
  },
];

export function getRecommendationActionRegistryEntry(recommendationType: string) {
  return recommendationActionRegistry.find((entry) => entry.recommendationType === recommendationType) || null;
}
