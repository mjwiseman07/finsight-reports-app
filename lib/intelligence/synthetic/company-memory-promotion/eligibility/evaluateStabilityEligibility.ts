import type { SyntheticMemoryCandidate } from "../../company-memory-ingestion";
import type { SyntheticMemoryPromotionRejectionReason } from "../types";

export const SYNTHETIC_MEMORY_PROMOTION_STABILITY_THRESHOLD = 0.6;

export interface MemoryPromotionStabilityResult {
  eligible: boolean;
  boundedScore: number;
  rejectionReasons: SyntheticMemoryPromotionRejectionReason[];
}

export function evaluateStabilityEligibility(candidate: SyntheticMemoryCandidate): MemoryPromotionStabilityResult {
  const boundedScore = Math.max(0, Math.min(1, candidate.candidateStabilityScore));
  const eligible =
    candidate.candidateStabilityScore === boundedScore &&
    boundedScore >= SYNTHETIC_MEMORY_PROMOTION_STABILITY_THRESHOLD;

  return {
    eligible,
    boundedScore,
    rejectionReasons: eligible ? [] : ["insufficient_history"],
  };
}
