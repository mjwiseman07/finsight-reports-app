import type { SyntheticMemoryCandidate } from "../../company-memory-ingestion";
import type {
  SyntheticMemoryCandidateReviewResult,
  SyntheticMemoryPromotionReviewerRole,
  SyntheticMemoryPromotionReviewStatus,
} from "../types";
import { applyHumanReviewMetadata, type HumanReviewMetadataInput } from "./applyHumanReviewMetadata";
import { reviewMemoryCandidate } from "./reviewMemoryCandidate";

export interface ReviewMemoryCandidatesInput {
  companyId: string;
  candidates: SyntheticMemoryCandidate[];
  reviewedAt: string;
  reviewedBy?: string;
  reviewerRole?: SyntheticMemoryPromotionReviewerRole;
  humanReviewsByCandidateId?: Record<string, HumanReviewMetadataInput>;
}

function idsByStatus(candidates: { candidateId: string; reviewStatus: SyntheticMemoryPromotionReviewStatus }[], status: SyntheticMemoryPromotionReviewStatus) {
  return candidates.filter((candidate) => candidate.reviewStatus === status).map((candidate) => candidate.candidateId);
}

export function reviewMemoryCandidates(input: ReviewMemoryCandidatesInput): SyntheticMemoryCandidateReviewResult {
  const warnings: string[] = [];
  const outOfScopeCandidates = input.candidates.filter((candidate) => candidate.companyId !== input.companyId);
  if (outOfScopeCandidates.length) {
    warnings.push(`Skipped ${outOfScopeCandidates.length} candidate(s) outside company ${input.companyId}.`);
  }
  const scopedCandidates = input.candidates.filter((candidate) => candidate.companyId === input.companyId);
  const promotionCandidates = scopedCandidates.map((candidate) =>
    applyHumanReviewMetadata(
      reviewMemoryCandidate({
        candidate,
        reviewedAt: input.reviewedAt,
        reviewedBy: input.reviewedBy,
        reviewerRole: input.reviewerRole,
      }),
      input.humanReviewsByCandidateId?.[candidate.candidateId],
    ),
  );
  const metadata = promotionCandidates[0]?.metadata || {
    promotionId: `promotion-review:${input.companyId}`,
    companyId: input.companyId,
    candidateId: "none",
    promotionDeterminismHash: `promotion-review:${input.companyId}`,
    retrievalLineageId: "",
    retrievalDeterminismHash: "",
    promotionEvidenceStrength: "weak" as const,
    promotionReviewComplexity: "high" as const,
    reviewedAt: input.reviewedAt,
    reviewedBy: input.reviewedBy,
    reviewerRole: input.reviewerRole,
  };

  return {
    request: {
      companyId: input.companyId,
      candidates: scopedCandidates,
      reviewedAt: input.reviewedAt,
      reviewedBy: input.reviewedBy,
      reviewerRole: input.reviewerRole,
    },
    metadata,
    promotionCandidates,
    approvedCandidateIds: idsByStatus(promotionCandidates, "approved_for_promotion"),
    rejectedCandidateIds: idsByStatus(promotionCandidates, "rejected"),
    needsMoreHistoryCandidateIds: idsByStatus(promotionCandidates, "needs_more_history"),
    duplicateCandidateIds: idsByStatus(promotionCandidates, "duplicate"),
    staleCandidateIds: idsByStatus(promotionCandidates, "stale"),
    supersededCandidateIds: idsByStatus(promotionCandidates, "superseded"),
    conflictingCandidateIds: idsByStatus(promotionCandidates, "conflicting"),
    warnings,
  };
}
