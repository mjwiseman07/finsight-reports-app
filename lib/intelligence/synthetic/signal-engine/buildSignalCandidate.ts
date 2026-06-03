import type { SyntheticSignalCandidate } from "../types/signal";
import { resolveSignalThreshold } from "./resolveSignalThreshold";
import { scoreSignalSeverity } from "./scoreSignalSeverity";
import type { SyntheticSignalCandidateInput } from "./types";

function latestTwoValues(input: SyntheticSignalCandidateInput) {
  const points = input.metricSeries.points.filter((point) => point.value !== null);
  const current = points[points.length - 1];
  const comparison = points[points.length - 2];
  return {
    current,
    comparison,
    currentValue: current?.value ?? null,
    comparisonValue: comparison?.value ?? null,
    period: current?.period?.label || current?.period?.endDate,
  };
}

function variancePercent(currentValue: number | null, comparisonValue: number | null) {
  if (currentValue === null || comparisonValue === null || comparisonValue === 0) return null;
  return ((currentValue - comparisonValue) / Math.abs(comparisonValue)) * 100;
}

function stableSignalId(signalType: string, metricKey: string, period?: string) {
  const periodKey = (period || "unknown-period").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${signalType}:${metricKey}:${periodKey}`;
}

function memoryRefs(input: SyntheticSignalCandidateInput) {
  return (input.companyMemory || []).map((record) => record.id);
}

export function buildSignalCandidate(input: SyntheticSignalCandidateInput): SyntheticSignalCandidate[] {
  const evidenceIds = input.metricSeries.evidenceIds || [];
  const calculationTraceIds = input.metricSeries.calculationTraceIds || [];
  if (!input.metricSeries.confidence || evidenceIds.length === 0 || calculationTraceIds.length === 0) return [];

  const values = latestTwoValues(input);
  const threshold = {
    ...resolveSignalThreshold(input.signalType, input.industryProfile),
    ...(input.threshold !== undefined ? { value: input.threshold } : {}),
    ...(input.direction ? { direction: input.direction } : {}),
  };
  const variance = variancePercent(values.currentValue, values.comparisonValue);
  const severity = scoreSignalSeverity({
    variancePercent: variance,
    threshold,
    confidenceTier: input.metricSeries.confidence.tier,
  });
  if (!severity) return [];

  return [{
    signalId: stableSignalId(input.signalType, input.metricSeries.metricKey, values.period),
    signalType: input.signalType,
    metricKey: input.metricSeries.metricKey,
    severity,
    confidence: input.metricSeries.confidence,
    evidenceIds,
    calculationTraceIds,
    sourceMetricIds: [
      input.metricSeries.metricKey,
      ...(input.metricSeries.sourceMetricIds || []),
      ...(input.metricSeries.parentMetricIds || []),
    ],
    industryProfileId: input.industryProfile?.industryKey,
    companyMemoryRefs: memoryRefs(input),
    relatedSignalIds: input.relatedSignalIds || [],
    correlationGroupId: input.correlationGroupId,
    rootCauseCandidate: input.rootCauseCandidate,
    status: "created",
    currentValue: values.currentValue,
    comparisonValue: values.comparisonValue,
    varianceAmount: values.currentValue !== null && values.comparisonValue !== null ? values.currentValue - values.comparisonValue : null,
    variancePercent: variance,
    threshold: threshold.value,
    direction: threshold.direction,
    period: values.period,
    metricSeriesKey: input.metricSeries.metricKey,
    createdAt: input.createdAt,
  }];
}
