import type { SyntheticMemoryCandidate } from "../../company-memory-ingestion";
import { evaluatePromotionEligibility } from "../eligibility";
import { buildApprovalMetadata, buildPromotionDecision, buildRejectionMetadata } from "../decisions";
import type {
  SyntheticMemoryPromotionCandidate,
  SyntheticMemoryPromotionLineage,
  SyntheticMemoryPromotionReviewerRole,
  SyntheticMemoryPromotionReviewStatus,
} from "../types";

export interface ReviewMemoryCandidateInput {
  candidate: SyntheticMemoryCandidate;
  reviewedAt: string;
  reviewedBy?: string;
  reviewerRole?: SyntheticMemoryPromotionReviewerRole;
}

function deterministicReviewStatus(candidate: SyntheticMemoryCandidate): SyntheticMemoryPromotionReviewStatus {
  const eligibility = evaluatePromotionEligibility(candidate);
  if (candidate.candidateStatus === "duplicate") return "duplicate";
  if (candidate.candidateStatus === "conflicting") return "conflicting";
  if (candidate.candidateStatus === "stale") return "stale";
  if (candidate.candidateStatus === "superseded") return "superseded";
  if (!eligibility.lineageComplete) return "rejected";
  if (eligibility.rejectionReasons.includes("insufficient_history")) return "needs_more_history";
  if (eligibility.eligible) return "approved_for_promotion";
  return "rejected";
}

function buildInlinePromotionLineage(candidate: SyntheticMemoryCandidate, promotionId: string): SyntheticMemoryPromotionLineage {
  return {
    promotionId,
    candidateId: candidate.candidateId,
    ingestionId: candidate.lineage.ingestionId,
    retrievalId: candidate.lineage.retrievalId,
    retrievalLineageId: candidate.lineage.retrievalLineageId,
    retrievalDeterminismHash: candidate.lineage.retrievalDeterminismHash,
    sourceReferenceIds: candidate.lineage.sourceReferenceIds,
    snapshotIds: candidate.lineage.snapshotIds,
    observedPeriodKeys: candidate.lineage.observedPeriodKeys,
    promotionDecisionId: `decision:${candidate.candidateId}`,
  };
}

export function reviewMemoryCandidate(input: ReviewMemoryCandidateInput): SyntheticMemoryPromotionCandidate {
  const eligibility = evaluatePromotionEligibility(input.candidate);
  const reviewStatus = deterministicReviewStatus(input.candidate);
  const metadata =
    reviewStatus === "approved_for_promotion"
      ? buildApprovalMetadata({
          candidate: input.candidate,
          eligibility,
          reviewedAt: input.reviewedAt,
          reviewedBy: input.reviewedBy,
          reviewerRole: input.reviewerRole,
        })
      : buildRejectionMetadata({
          candidate: input.candidate,
          eligibility,
          reviewStatus,
          rejectionReasons: eligibility.rejectionReasons,
          reviewedAt: input.reviewedAt,
          reviewedBy: input.reviewedBy,
          reviewerRole: input.reviewerRole,
        });

  return {
    candidateId: input.candidate.candidateId,
    companyId: input.candidate.companyId,
    candidateKind: input.candidate.candidateKind,
    memoryType: input.candidate.memoryType,
    memoryConfidence: input.candidate.memoryConfidence,
    memoryFreshness: input.candidate.memoryFreshness,
    memorySourceAuthority: input.candidate.memorySourceAuthority,
    sourceCandidate: input.candidate,
    reviewStatus,
    eligibility,
    decision: buildPromotionDecision({
      reviewStatus,
      decidedAt: input.reviewedAt,
      reviewReasonCodes: eligibility.rejectionReasons,
    }),
    metadata,
    lineage: buildInlinePromotionLineage(input.candidate, metadata.promotionId),
  };
}
