import type { SyntheticSignalCandidate } from "../types/signal";
import { buildRecommendationCandidate } from "./buildRecommendationCandidate";

export function buildMarginRecommendationCandidates(signals: SyntheticSignalCandidate[], createdAt: string) {
  return signals
    .filter((signal) => signal.signalType.includes("margin_"))
    .flatMap((signal) => buildRecommendationCandidate({
      recommendationType: "margin_structure_review",
      category: "margin",
      sourceSignals: [signal],
      createdAt,
      impact: {
        expectedImpactCategory: "margin",
        expectedImpactConfidence: signal.confidence.tier === "high" ? "high" : "medium",
        affectedMetricIds: ["gross_margin", "operating_margin"],
      },
    }));
}
