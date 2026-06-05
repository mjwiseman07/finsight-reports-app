import type { SyntheticMemoryCandidate } from "../../company-memory-ingestion";
import type {
  SyntheticMemoryPromotionEligibility,
  SyntheticMemoryPromotionMetadata,
  SyntheticMemoryPromotionRejectionReason,
  SyntheticMemoryPromotionReviewerRole,
  SyntheticMemoryPromotionReviewStatus,
} from "../types";

export interface BuildRejectionMetadataInput {
  candidate: SyntheticMemoryCandidate;
  eligibility: SyntheticMemoryPromotionEligibility;
  reviewStatus: SyntheticMemoryPromotionReviewStatus;
  rejectionReasons: SyntheticMemoryPromotionRejectionReason[];
  reviewedAt: string;
  reviewedBy?: string;
  reviewerRole?: SyntheticMemoryPromotionReviewerRole;
}

export function buildRejectionMetadata(input: BuildRejectionMetadataInput): SyntheticMemoryPromotionMetadata {
  return {
    promotionId: `promotion:${input.candidate.candidateId}`,
    companyId: input.candidate.companyId,
    candidateId: input.candidate.candidateId,
    promotionDeterminismHash: input.candidate.lineage.candidateDeterminismHash || input.candidate.candidateId,
    retrievalLineageId: input.candidate.lineage.retrievalLineageId,
    retrievalDeterminismHash: input.candidate.lineage.retrievalDeterminismHash,
    promotionEvidenceStrength: input.eligibility.promotionEvidenceStrength,
    promotionReviewComplexity: input.eligibility.promotionReviewComplexity,
    reviewedAt: input.reviewedAt,
    reviewedBy: input.reviewedBy,
    reviewerRole: input.reviewerRole,
    reviewDecision: input.reviewStatus,
    reviewReasonCode: input.rejectionReasons.join(","),
  };
}
