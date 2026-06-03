import type { SyntheticSignalCandidate } from "../types/signal";
import { buildRecommendationCandidate } from "./buildRecommendationCandidate";

const workingCapitalSignals = new Set(["ar_improvement", "ar_collection_risk", "ap_improvement", "ap_pressure", "cash_pressure"]);

export function buildWorkingCapitalRecommendationCandidates(signals: SyntheticSignalCandidate[], createdAt: string) {
  const sourceSignals = signals.filter((signal) => workingCapitalSignals.has(signal.signalType));
  if (sourceSignals.length === 0) return [];
  const correlatedGroup = sourceSignals.length > 1 && sourceSignals.some((signal) => signal.correlationGroupId);
  return buildRecommendationCandidate({
    recommendationType: correlatedGroup ? "working_capital_liquidity_review" : "working_capital_position_review",
    category: "working_capital",
    sourceSignals,
    createdAt,
    impact: {
      expectedImpactCategory: "cash",
      expectedImpactConfidence: correlatedGroup ? "medium" : "low",
      affectedMetricIds: ["cash", "ar", "ap"],
    },
  });
}
