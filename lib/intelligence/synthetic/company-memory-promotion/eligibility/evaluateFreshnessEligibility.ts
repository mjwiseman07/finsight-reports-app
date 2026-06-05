import type { SyntheticMemoryCandidate } from "../../company-memory-ingestion";
import type { SyntheticMemoryPromotionRejectionReason } from "../types";

export const SYNTHETIC_MEMORY_PROMOTION_FRESHNESS_THRESHOLD = 0.5;

export interface MemoryPromotionFreshnessResult {
  eligible: boolean;
  rejectionReasons: SyntheticMemoryPromotionRejectionReason[];
}

export function evaluateFreshnessEligibility(candidate: SyntheticMemoryCandidate): MemoryPromotionFreshnessResult {
  const eligible =
    candidate.candidateStatus !== "stale" &&
    candidate.memoryFreshness.memoryFreshnessScore >= SYNTHETIC_MEMORY_PROMOTION_FRESHNESS_THRESHOLD;

  return {
    eligible,
    rejectionReasons: eligible ? [] : ["stale_evidence"],
  };
}
