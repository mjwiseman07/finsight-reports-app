import type {
  SyntheticMemoryPromotionDecision,
  SyntheticMemoryPromotionDecisionSource,
  SyntheticMemoryPromotionReviewStatus,
} from "../types";

export interface BuildPromotionDecisionInput {
  reviewStatus: SyntheticMemoryPromotionReviewStatus;
  decidedAt: string;
  decisionSource?: SyntheticMemoryPromotionDecisionSource;
  reviewReasonCodes?: string[];
}

export function buildPromotionDecision(input: BuildPromotionDecisionInput): SyntheticMemoryPromotionDecision {
  return {
    reviewStatus: input.reviewStatus,
    decisionSource: input.decisionSource || "deterministic_rules",
    approvedForPromotion: input.reviewStatus === "approved_for_promotion",
    reviewReasonCodes: input.reviewReasonCodes || [],
    decidedAt: input.decidedAt,
  };
}
