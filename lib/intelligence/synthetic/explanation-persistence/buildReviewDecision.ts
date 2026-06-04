import type { SyntheticExplanationReviewDecision } from "../types/explanation-persistence";
import type { SyntheticReviewDecisionInput } from "./types";

export function buildReviewDecision(input: SyntheticReviewDecisionInput): SyntheticExplanationReviewDecision {
  return {
    decisionId: input.decisionId,
    queueItemId: input.queueItemId,
    storedExplanationId: input.storedExplanationId,
    decision: input.decision,
    reviewerId: input.reviewerId,
    reviewerRole: input.reviewerRole,
    decisionReasonCodes: input.decisionReasonCodes,
    notes: input.notes,
    createdAt: input.createdAt,
  };
}
