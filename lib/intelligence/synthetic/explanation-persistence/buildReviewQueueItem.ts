import type { SyntheticExplanationReviewQueueItem } from "../types/explanation-persistence";
import type { SyntheticReviewQueueItemInput } from "./types";
import { resolveReviewPriority, resolveReviewRiskCategory } from "./resolveReviewMetadata";

export function buildReviewQueueItem(input: SyntheticReviewQueueItemInput): SyntheticExplanationReviewQueueItem {
  const record = input.storedExplanationRecord;
  return {
    queueItemId: input.queueItemId,
    storedExplanationId: record.storedExplanationId,
    explanationId: record.explanationId,
    recommendationId: record.recommendationId,
    priority: resolveReviewPriority(record),
    reviewRiskCategory: resolveReviewRiskCategory(record),
    reviewStatus: "queued",
    assignedReviewerId: input.assignedReviewerId,
    requiredReviewerRole: input.requiredReviewerRole,
    guardrailStatus: record.explanationGuardrailResult.status,
    createdAt: input.createdAt,
    dueAt: input.dueAt,
  };
}
