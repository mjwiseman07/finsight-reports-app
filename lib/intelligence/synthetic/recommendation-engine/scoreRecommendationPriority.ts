import type { SyntheticRecommendationPriorityScore } from "./types";
import type { SyntheticSignalCandidate, SyntheticSignalSeverity } from "../types/signal";

const severityWeights: Record<SyntheticSignalSeverity, number> = {
  low: 25,
  medium: 50,
  high: 75,
  critical: 90,
};

function priorityForScore(priorityScore: number): SyntheticRecommendationPriorityScore["priority"] {
  if (priorityScore >= 85) return "critical";
  if (priorityScore >= 65) return "high";
  if (priorityScore >= 40) return "medium";
  return "low";
}

function confidenceAdjustment(signal: SyntheticSignalCandidate) {
  if (signal.confidence.tier === "high") return 10;
  if (signal.confidence.tier === "low") return -15;
  return 0;
}

export function scoreRecommendationPriority(sourceSignals: SyntheticSignalCandidate[]): SyntheticRecommendationPriorityScore {
  const primarySignal = sourceSignals[0];
  const baseScore = severityWeights[primarySignal.severity];
  const correlationAdjustment = sourceSignals.some((signal) => signal.correlationGroupId) ? 5 : 0;
  const rootCauseAdjustment = sourceSignals.some((signal) => signal.rootCauseCandidate) ? 5 : 0;
  const score = Math.max(0, Math.min(100, baseScore + confidenceAdjustment(primarySignal) + correlationAdjustment + rootCauseAdjustment));
  return {
    priorityScore: score,
    priority: priorityForScore(score),
  };
}
