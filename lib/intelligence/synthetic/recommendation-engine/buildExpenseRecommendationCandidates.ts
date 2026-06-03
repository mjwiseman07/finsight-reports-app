import type { SyntheticSignalCandidate } from "../types/signal";
import { buildRecommendationCandidate } from "./buildRecommendationCandidate";

export function buildExpenseRecommendationCandidates(signals: SyntheticSignalCandidate[], createdAt: string) {
  return signals
    .filter((signal) => signal.signalType.startsWith("expense_"))
    .flatMap((signal) => buildRecommendationCandidate({
      recommendationType: "expense_structure_review",
      category: "expense",
      sourceSignals: [signal],
      createdAt,
      impact: {
        expectedImpactCategory: "expense",
        expectedImpactConfidence: signal.confidence.tier === "high" ? "high" : "medium",
        affectedMetricIds: ["expense"],
      },
    }));
}
