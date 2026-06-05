import type { SyntheticMemoryCandidate } from "../../company-memory-ingestion";
import type { SyntheticMemoryPromotionRejectionReason } from "../types";

export const SYNTHETIC_MEMORY_PROMOTION_CONFIDENCE_THRESHOLD = 0.6;

export interface MemoryPromotionCheckResult {
  eligible: boolean;
  rejectionReasons: SyntheticMemoryPromotionRejectionReason[];
}

export function evaluateConfidenceEligibility(candidate: SyntheticMemoryCandidate): MemoryPromotionCheckResult {
  const confidence = candidate.memoryConfidence;
  const eligible =
    confidence.tier === "medium" ||
    confidence.tier === "high" ||
    confidence.score >= SYNTHETIC_MEMORY_PROMOTION_CONFIDENCE_THRESHOLD;

  return {
    eligible,
    rejectionReasons: eligible ? [] : ["low_confidence"],
  };
}
