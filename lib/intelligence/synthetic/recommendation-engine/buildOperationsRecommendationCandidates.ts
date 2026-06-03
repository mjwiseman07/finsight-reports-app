import type { SyntheticSignalCandidate } from "../types/signal";
import { buildRecommendationCandidate } from "./buildRecommendationCandidate";

const operationsImpactByPrefix = [
  { prefix: "payroll_", type: "payroll_efficiency_review", metrics: ["payroll"] },
  { prefix: "inventory_", type: "inventory_position_review", metrics: ["inventory"] },
  { prefix: "fixed_asset_", type: "fixed_asset_position_review", metrics: ["fixed_assets"] },
  { prefix: "debt_", type: "debt_position_review", metrics: ["debt"] },
];

export function buildOperationsRecommendationCandidates(signals: SyntheticSignalCandidate[], createdAt: string) {
  return signals.flatMap((signal) => {
    const impact = operationsImpactByPrefix.find((entry) => signal.signalType.startsWith(entry.prefix));
    if (!impact) return [];
    return buildRecommendationCandidate({
      recommendationType: impact.type,
      category: "operations",
      sourceSignals: [signal],
      createdAt,
      impact: {
        expectedImpactCategory: "operations",
        expectedImpactConfidence: signal.confidence.tier === "high" ? "high" : "medium",
        affectedMetricIds: impact.metrics,
      },
    });
  });
}
