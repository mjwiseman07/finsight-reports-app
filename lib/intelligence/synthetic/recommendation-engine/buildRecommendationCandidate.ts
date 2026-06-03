import type { SyntheticRecommendationCandidate, SyntheticRecommendationLineage } from "../types/recommendation";
import type { SyntheticRootCauseCandidate, SyntheticSignalCandidate, SyntheticSignalSeverity } from "../types/signal";
import { scoreRecommendationPriority } from "./scoreRecommendationPriority";
import type { SyntheticRecommendationCandidateInput } from "./types";

const severityRank: Record<SyntheticSignalSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function hasRequiredSignalFields(signal: SyntheticSignalCandidate) {
  return Boolean(
    signal.signalId &&
      signal.severity &&
      signal.confidence &&
      signal.evidenceIds?.length &&
      signal.calculationTraceIds?.length,
  );
}

function primarySignal(signals: SyntheticSignalCandidate[]) {
  return [...signals].sort((left, right) => severityRank[right.severity] - severityRank[left.severity])[0];
}

function stableRecommendationId(recommendationType: string, sourceSignalIds: string[]) {
  return `${recommendationType}:${sourceSignalIds.join("+")}`;
}

function rootCauseSignalIds(sourceSignals: SyntheticSignalCandidate[], rootCauseCandidate?: SyntheticRootCauseCandidate) {
  if (!rootCauseCandidate) return [];
  return sourceSignals
    .filter((signal) => signal.signalType === rootCauseCandidate.signalType || signal.signalId === rootCauseCandidate.signalId)
    .map((signal) => signal.signalId);
}

function buildLineage(input: {
  recommendationId: string;
  sourceSignalIds: string[];
  sourceMetricIds: string[];
  evidenceIds: string[];
  calculationTraceIds: string[];
  rootCauseSignalIds: string[];
  correlationGroupId?: string;
}): SyntheticRecommendationLineage {
  return {
    recommendationId: input.recommendationId,
    sourceSignalIds: input.sourceSignalIds,
    sourceMetricIds: input.sourceMetricIds,
    evidenceIds: input.evidenceIds,
    calculationTraceIds: input.calculationTraceIds,
    rootCauseSignalIds: input.rootCauseSignalIds,
    correlationGroupId: input.correlationGroupId,
  };
}

export function buildRecommendationCandidate(input: SyntheticRecommendationCandidateInput): SyntheticRecommendationCandidate[] {
  if (input.sourceSignals.length === 0 || input.sourceSignals.some((signal) => !hasRequiredSignalFields(signal))) return [];

  const sourceSignalIds = unique(input.sourceSignals.map((signal) => signal.signalId));
  const evidenceIds = unique(input.sourceSignals.flatMap((signal) => signal.evidenceIds));
  const calculationTraceIds = unique(input.sourceSignals.flatMap((signal) => signal.calculationTraceIds));
  const sourceMetricIds = unique(input.sourceSignals.flatMap((signal) => signal.sourceMetricIds));
  const primary = primarySignal(input.sourceSignals);
  const rootCauseCandidate = primary.rootCauseCandidate || input.sourceSignals.find((signal) => signal.rootCauseCandidate)?.rootCauseCandidate;
  const rootCauseIds = unique(rootCauseSignalIds(input.sourceSignals, rootCauseCandidate));
  const correlationGroupId = primary.correlationGroupId || input.sourceSignals.find((signal) => signal.correlationGroupId)?.correlationGroupId;
  const recommendationId = stableRecommendationId(input.recommendationType, sourceSignalIds);
  const priority = scoreRecommendationPriority(input.sourceSignals);

  return [{
    recommendationId,
    category: input.category,
    recommendationType: input.recommendationType,
    priority: priority.priority,
    priorityScore: priority.priorityScore,
    severity: primary.severity,
    confidence: primary.confidence,
    sourceSignalIds,
    evidenceIds,
    calculationTraceIds,
    sourceMetricIds,
    correlationGroupId,
    relatedRecommendationIds: input.relatedRecommendationIds || [],
    rootCauseCandidate,
    rootCauseSignalIds: rootCauseIds,
    expectedImpactCategory: input.impact.expectedImpactCategory,
    expectedImpactConfidence: input.impact.expectedImpactConfidence,
    affectedMetricIds: input.impact.affectedMetricIds,
    recommendationLineage: buildLineage({
      recommendationId,
      sourceSignalIds,
      sourceMetricIds,
      evidenceIds,
      calculationTraceIds,
      rootCauseSignalIds: rootCauseIds,
      correlationGroupId,
    }),
    status: "candidate",
    createdAt: input.createdAt,
  }];
}
