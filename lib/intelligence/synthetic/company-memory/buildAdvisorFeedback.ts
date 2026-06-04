import type { SyntheticAdvisorFeedback, SyntheticAdvisorFeedbackStatus, SyntheticCompanyMemorySourceRef } from "./types";
import { stableMemoryHash } from "./stableMemoryHash";

export function buildAdvisorFeedback(input: {
  recommendationId?: string;
  signalId?: string;
  feedbackStatus: SyntheticAdvisorFeedbackStatus;
  feedbackSource: "advisor" | "review_workflow" | "manual_import";
  feedbackText?: string;
  reviewedBy: string;
  reviewDate: string;
  sourceRefs: SyntheticCompanyMemorySourceRef[];
}): SyntheticAdvisorFeedback {
  const feedbackId = stableMemoryHash({
    type: "advisor_feedback",
    recommendationId: input.recommendationId,
    signalId: input.signalId,
    feedbackStatus: input.feedbackStatus,
    reviewDate: input.reviewDate,
    reviewedBy: input.reviewedBy,
  });

  return {
    feedbackId,
    recommendationId: input.recommendationId,
    signalId: input.signalId,
    feedbackStatus: input.feedbackStatus,
    feedbackSource: input.feedbackSource,
    feedbackText: input.feedbackText,
    reviewedBy: input.reviewedBy,
    reviewDate: input.reviewDate,
    sourceRefs: input.sourceRefs,
  };
}
