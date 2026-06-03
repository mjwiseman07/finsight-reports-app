import type { SyntheticRecommendationCandidate } from "../types/recommendation";
import type { SyntheticSignalCandidate } from "../types/signal";
import { buildCashRecommendationCandidates } from "./buildCashRecommendationCandidates";
import { buildConcentrationRecommendationCandidates } from "./buildConcentrationRecommendationCandidates";
import { buildExpenseRecommendationCandidates } from "./buildExpenseRecommendationCandidates";
import { buildMarginRecommendationCandidates } from "./buildMarginRecommendationCandidates";
import { buildOperationsRecommendationCandidates } from "./buildOperationsRecommendationCandidates";
import { buildRevenueRecommendationCandidates } from "./buildRevenueRecommendationCandidates";
import { buildBenchmarkRecommendationCandidates } from "./buildBenchmarkRecommendationCandidates";
import { buildWorkingCapitalRecommendationCandidates } from "./buildWorkingCapitalRecommendationCandidates";

function groupByCorrelation(signals: SyntheticSignalCandidate[]) {
  const groups = new Map<string, SyntheticSignalCandidate[]>();
  for (const signal of signals) {
    if (!signal.correlationGroupId) continue;
    groups.set(signal.correlationGroupId, [...(groups.get(signal.correlationGroupId) || []), signal]);
  }
  return [...groups.values()].filter((group) => group.length > 1);
}

export function mapSignalsToRecommendationCandidates(signals: SyntheticSignalCandidate[], createdAt: string): SyntheticRecommendationCandidate[] {
  const individualCandidates = [
    ...buildRevenueRecommendationCandidates(signals, createdAt),
    ...buildExpenseRecommendationCandidates(signals, createdAt),
    ...buildMarginRecommendationCandidates(signals, createdAt),
    ...buildCashRecommendationCandidates(signals, createdAt),
    ...buildWorkingCapitalRecommendationCandidates(signals, createdAt),
    ...buildOperationsRecommendationCandidates(signals, createdAt),
    ...buildConcentrationRecommendationCandidates(signals, createdAt),
    ...buildBenchmarkRecommendationCandidates(signals, createdAt),
  ];
  const groupedCandidates = groupByCorrelation(signals).flatMap((group) => buildWorkingCapitalRecommendationCandidates(group, createdAt));
  const byId = new Map<string, SyntheticRecommendationCandidate>();
  for (const candidate of [...individualCandidates, ...groupedCandidates]) byId.set(candidate.recommendationId, candidate);
  return [...byId.values()];
}
