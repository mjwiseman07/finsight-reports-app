import type { SyntheticSignalCandidate } from "../types/signal";
import { buildRecommendationCandidate } from "./buildRecommendationCandidate";

export function buildRevenueRecommendationCandidates(signals: SyntheticSignalCandidate[], createdAt: string) {
  return signals
    .filter((signal) => signal.signalType.startsWith("revenue_"))
    .flatMap((signal) => buildRecommendationCandidate({
      recommendationType: "revenue_trend_review",
      category: "revenue",
      sourceSignals: [signal],
      createdAt,
      impact: {
        expectedImpactCategory: "revenue",
        expectedImpactConfidence: signal.confidence.tier === "high" ? "high" : "medium",
        affectedMetricIds: ["revenue"],
      },
    }));
}
