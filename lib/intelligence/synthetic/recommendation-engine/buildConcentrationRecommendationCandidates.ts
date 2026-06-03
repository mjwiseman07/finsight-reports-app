import type { SyntheticSignalCandidate } from "../types/signal";
import { buildRecommendationCandidate } from "./buildRecommendationCandidate";

export function buildConcentrationRecommendationCandidates(signals: SyntheticSignalCandidate[], createdAt: string) {
  return signals
    .filter((signal) => signal.signalType === "customer_concentration" || signal.signalType === "vendor_concentration")
    .flatMap((signal) => buildRecommendationCandidate({
      recommendationType: `${signal.signalType}_review`,
      category: "concentration",
      sourceSignals: [signal],
      createdAt,
      impact: {
        expectedImpactCategory: "concentration",
        expectedImpactConfidence: signal.confidence.tier === "high" ? "high" : "medium",
        affectedMetricIds: [signal.metricKey],
      },
    }));
}
