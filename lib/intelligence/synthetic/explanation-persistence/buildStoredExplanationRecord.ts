import type { SyntheticStoredExplanationRecord } from "../types/explanation-persistence";
import type { SyntheticStoredExplanationRecordInput } from "./types";

export function buildStoredExplanationRecord(input: SyntheticStoredExplanationRecordInput): SyntheticStoredExplanationRecord {
  const explanation = input.explanationObject;
  return {
    storedExplanationId: input.storedExplanationId,
    explanationId: explanation.explanationId,
    recommendationId: explanation.recommendationId,
    recommendationType: explanation.recommendationType,
    explanationObject: explanation,
    explanationLineageSnapshot: explanation.explanationLineage,
    explanationGuardrailResult: explanation.explanationGuardrailResult,
    confidenceScore: explanation.confidenceScore,
    confidenceTier: explanation.confidenceTier,
    explanationConfidence: explanation.explanationConfidence,
    storageStatus: input.storageStatus || "draft",
    createdAt: input.createdAt,
    updatedAt: input.updatedAt || input.createdAt,
  };
}
