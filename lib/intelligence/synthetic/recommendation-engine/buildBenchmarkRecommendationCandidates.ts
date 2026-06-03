import type { SyntheticSignalCandidate } from "../types/signal";
import { buildRecommendationCandidate } from "./buildRecommendationCandidate";

export function buildBenchmarkRecommendationCandidates(signals: SyntheticSignalCandidate[], createdAt: string) {
  return signals
    .filter((signal) => signal.signalType.startsWith("benchmark_"))
    .flatMap((signal) => buildRecommendationCandidate({
      recommendationType: "benchmark_gap_review",
      category: "benchmark",
      sourceSignals: [signal],
      createdAt,
      impact: {
        expectedImpactCategory: "benchmark",
        expectedImpactConfidence: signal.confidence.tier === "high" ? "high" : "medium",
        affectedMetricIds: [signal.metricKey],
      },
    }));
}
