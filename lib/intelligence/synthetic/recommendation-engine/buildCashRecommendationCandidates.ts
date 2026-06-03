import type { SyntheticSignalCandidate } from "../types/signal";
import { buildRecommendationCandidate } from "./buildRecommendationCandidate";

export function buildCashRecommendationCandidates(signals: SyntheticSignalCandidate[], createdAt: string) {
  return signals
    .filter((signal) => signal.signalType.startsWith("cash_"))
    .flatMap((signal) => buildRecommendationCandidate({
      recommendationType: "cash_position_review",
      category: "cash",
      sourceSignals: [signal],
      createdAt,
      impact: {
        expectedImpactCategory: "cash",
        expectedImpactConfidence: signal.rootCauseCandidate ? "medium" : signal.confidence.tier === "high" ? "high" : "medium",
        affectedMetricIds: ["cash"],
      },
    }));
}
