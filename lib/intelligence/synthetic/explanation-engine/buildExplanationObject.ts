import type { SyntheticAIExplanationObject, SyntheticExplanationCitation, SyntheticExplanationConfidence, SyntheticExplanationLineage } from "../types/explanation";
import { validateExplanationObject } from "./validateExplanationObject";
import type { SyntheticExplanationObjectInput } from "./types";

function explanationConfidence(input: SyntheticExplanationObjectInput): SyntheticExplanationConfidence {
  const recommendation = input.explanationInput.recommendation;
  if (!recommendation.evidenceIds.length || !recommendation.calculationTraceIds.length) return "low";
  if (recommendation.confidence.tier === "low") return "low";
  if (!recommendation.rootCauseSignalIds.length && !recommendation.correlationGroupId) return "medium";
  return "high";
}

function sourceTypeForId(input: SyntheticExplanationObjectInput, citationId: string): SyntheticExplanationCitation["sourceType"] {
  const recommendation = input.explanationInput.recommendation;
  if (citationId === recommendation.recommendationId) return "recommendation";
  if (recommendation.sourceSignalIds.includes(citationId)) return "signal";
  if (recommendation.sourceMetricIds.includes(citationId)) return "metric";
  if (recommendation.evidenceIds.includes(citationId)) return "evidence";
  if (recommendation.calculationTraceIds.includes(citationId)) return "trace";
  return "root_cause";
}

function citations(input: SyntheticExplanationObjectInput): SyntheticExplanationCitation[] {
  return input.mockOutput.citationIds.map((citationId) => ({
    citationId,
    sourceType: sourceTypeForId(input, citationId),
    sourceId: citationId,
  }));
}

function explanationLineage(input: SyntheticExplanationObjectInput): SyntheticExplanationLineage {
  const recommendation = input.explanationInput.recommendation;
  return {
    explanationId: input.explanationId,
    recommendationId: recommendation.recommendationId,
    sourceSignalIds: recommendation.recommendationLineage.sourceSignalIds,
    sourceMetricIds: recommendation.recommendationLineage.sourceMetricIds,
    evidenceIds: recommendation.recommendationLineage.evidenceIds,
    calculationTraceIds: recommendation.recommendationLineage.calculationTraceIds,
    correlationGroupId: recommendation.recommendationLineage.correlationGroupId,
  };
}

export function buildExplanationObject(input: SyntheticExplanationObjectInput): SyntheticAIExplanationObject {
  const recommendation = input.explanationInput.recommendation;
  const validation = validateExplanationObject(input.explanationInput, input.promptRequest, input.mockOutput);
  return {
    explanationId: input.explanationId,
    recommendationId: recommendation.recommendationId,
    recommendationType: recommendation.recommendationType,
    claimType: input.mockOutput.claimType,
    languageCategory: input.mockOutput.languageCategory,
    actionType: input.mockOutput.actionType,
    confidenceScore: recommendation.confidence.score,
    confidenceTier: recommendation.confidence.tier,
    explanationConfidence: validation.valid ? explanationConfidence(input) : "low",
    explanationSummary: validation.valid ? input.mockOutput.explanationSummary : "",
    keyDrivers: validation.valid ? input.mockOutput.keyDrivers : [],
    evidenceCitations: validation.valid ? citations(input) : [],
    limitationCodes: validation.valid ? [] : validation.failedChecks,
    sourceSignalIds: recommendation.sourceSignalIds,
    sourceMetricIds: recommendation.sourceMetricIds,
    evidenceIds: recommendation.evidenceIds,
    calculationTraceIds: recommendation.calculationTraceIds,
    rootCauseSignalIds: recommendation.rootCauseSignalIds,
    correlationGroupId: recommendation.correlationGroupId,
    recommendationLineageId: recommendation.recommendationId,
    explanationLineage: explanationLineage(input),
    explanationGuardrailResult: {
      status: validation.valid ? "passed" : "failed",
      passedChecks: validation.passedChecks,
      failedChecks: validation.failedChecks,
      blockedClaims: validation.blockedClaims,
    },
    guardrailChecks: [
      ...validation.passedChecks.map((code) => ({ code, passed: true })),
      ...validation.failedChecks.map((code) => ({ code, passed: false, blockedClaim: code })),
    ],
    createdAt: input.explanationInput.createdAt,
  };
}
