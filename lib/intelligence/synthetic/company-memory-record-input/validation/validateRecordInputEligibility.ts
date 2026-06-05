import type { SyntheticMemoryPromotionCandidate } from "../../company-memory-promotion";
import type { SyntheticCompanyMemoryRecordInputValidation } from "../types";

export function validateRecordInputEligibility(
  promotionCandidate: SyntheticMemoryPromotionCandidate,
): SyntheticCompanyMemoryRecordInputValidation {
  const errors: string[] = [];
  const skippedCandidateIds: string[] = [];
  const blockedCandidateIds: string[] = [];

  if (promotionCandidate.reviewStatus !== "approved_for_promotion") {
    skippedCandidateIds.push(promotionCandidate.candidateId);
    errors.push("Promotion candidate reviewStatus is not approved_for_promotion.");
  }
  if (!promotionCandidate.decision.approvedForPromotion) {
    skippedCandidateIds.push(promotionCandidate.candidateId);
    errors.push("Promotion decision is not approved for promotion.");
  }
  if (!promotionCandidate.eligibility.lineageComplete) {
    blockedCandidateIds.push(promotionCandidate.candidateId);
    errors.push("Promotion candidate lineage is incomplete.");
  }
  if (promotionCandidate.memorySourceAuthority !== "historical_snapshot") {
    blockedCandidateIds.push(promotionCandidate.candidateId);
    errors.push("Promotion candidate memorySourceAuthority is not historical_snapshot.");
  }

  const blocked = blockedCandidateIds.length > 0;
  const skipped = skippedCandidateIds.length > 0;

  return {
    valid: errors.length === 0,
    recordInputReadinessStatus: blocked ? "blocked" : skipped ? "skipped" : "ready",
    errors,
    warnings: [],
    skippedCandidateIds: [...new Set(skippedCandidateIds)],
    blockedCandidateIds: [...new Set(blockedCandidateIds)],
    readyInputIds: errors.length ? [] : [promotionCandidate.candidateId],
  };
}
