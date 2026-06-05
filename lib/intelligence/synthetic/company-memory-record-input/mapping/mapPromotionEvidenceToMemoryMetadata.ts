import type { SyntheticMemoryPromotionCandidate } from "../../company-memory-promotion";

export function mapPromotionEvidenceToMemoryMetadata(promotionCandidate: SyntheticMemoryPromotionCandidate) {
  return {
    candidateObservationStrength: promotionCandidate.sourceCandidate.candidateObservationStrength,
    candidateStabilityScore: promotionCandidate.sourceCandidate.candidateStabilityScore,
    promotionEvidenceStrength: promotionCandidate.eligibility.promotionEvidenceStrength,
    promotionReviewComplexity: promotionCandidate.eligibility.promotionReviewComplexity,
    promotionMetadata: promotionCandidate.metadata,
  };
}
