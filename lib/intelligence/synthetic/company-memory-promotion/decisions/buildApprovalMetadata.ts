import type { SyntheticMemoryCandidate } from "../../company-memory-ingestion";
import type {
  SyntheticMemoryPromotionEligibility,
  SyntheticMemoryPromotionMetadata,
  SyntheticMemoryPromotionReviewerRole,
} from "../types";

export interface BuildApprovalMetadataInput {
  candidate: SyntheticMemoryCandidate;
  eligibility: SyntheticMemoryPromotionEligibility;
  reviewedAt: string;
  reviewedBy?: string;
  reviewerRole?: SyntheticMemoryPromotionReviewerRole;
}

export function buildApprovalMetadata(input: BuildApprovalMetadataInput): SyntheticMemoryPromotionMetadata {
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
    reviewDecision: "approved_for_promotion",
    reviewReasonCode: "eligible",
  };
}
