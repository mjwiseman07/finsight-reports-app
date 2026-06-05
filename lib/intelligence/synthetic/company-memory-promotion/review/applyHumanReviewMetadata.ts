import { buildPromotionDecision } from "../decisions";
import type {
  SyntheticMemoryPromotionCandidate,
  SyntheticMemoryPromotionReviewerRole,
  SyntheticMemoryPromotionReviewStatus,
} from "../types";

export interface HumanReviewMetadataInput {
  reviewedBy?: string;
  reviewedAt?: string;
  reviewerRole?: SyntheticMemoryPromotionReviewerRole;
  reviewDecision?: SyntheticMemoryPromotionReviewStatus;
  reviewReasonCode?: string;
}

export function applyHumanReviewMetadata(
  promotionCandidate: SyntheticMemoryPromotionCandidate,
  humanReview?: HumanReviewMetadataInput,
): SyntheticMemoryPromotionCandidate {
  if (!humanReview) return promotionCandidate;

  const reviewStatus = humanReview.reviewDecision || promotionCandidate.reviewStatus;
  const reviewedAt = humanReview.reviewedAt || promotionCandidate.metadata.reviewedAt;
  const reviewReasonCodes = humanReview.reviewReasonCode
    ? [humanReview.reviewReasonCode]
    : promotionCandidate.decision.reviewReasonCodes;

  return {
    ...promotionCandidate,
    reviewStatus,
    decision: buildPromotionDecision({
      reviewStatus,
      decidedAt: reviewedAt,
      decisionSource: humanReview.reviewDecision ? "human_review" : promotionCandidate.decision.decisionSource,
      reviewReasonCodes,
    }),
    metadata: {
      ...promotionCandidate.metadata,
      reviewedAt,
      reviewedBy: humanReview.reviewedBy || promotionCandidate.metadata.reviewedBy,
      reviewerRole: humanReview.reviewerRole || promotionCandidate.metadata.reviewerRole,
      reviewDecision: humanReview.reviewDecision || promotionCandidate.metadata.reviewDecision,
      reviewReasonCode: humanReview.reviewReasonCode || promotionCandidate.metadata.reviewReasonCode,
    },
  };
}
