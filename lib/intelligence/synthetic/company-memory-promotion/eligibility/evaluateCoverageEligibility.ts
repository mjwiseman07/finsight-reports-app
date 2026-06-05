import type { SyntheticMemoryCandidate } from "../../company-memory-ingestion";
import type { SyntheticMemoryPromotionRejectionReason } from "../types";

export const SYNTHETIC_MEMORY_PROMOTION_COVERAGE_THRESHOLD = 50;
export const SYNTHETIC_MEMORY_PROMOTION_SOURCE_REFERENCE_THRESHOLD = 3;

export interface MemoryPromotionCoverageResult {
  coverageEligible: boolean;
  sourceReferenceCountEligible: boolean;
  eligible: boolean;
  rejectionReasons: SyntheticMemoryPromotionRejectionReason[];
}

export function evaluateCoverageEligibility(candidate: SyntheticMemoryCandidate): MemoryPromotionCoverageResult {
  const coverageEligible = candidate.memoryCoverage.coveragePercent >= SYNTHETIC_MEMORY_PROMOTION_COVERAGE_THRESHOLD;
  const sourceReferenceCountEligible =
    candidate.memoryCoverage.sourceReferenceCount >= SYNTHETIC_MEMORY_PROMOTION_SOURCE_REFERENCE_THRESHOLD;
  const eligible = coverageEligible && sourceReferenceCountEligible;

  return {
    coverageEligible,
    sourceReferenceCountEligible,
    eligible,
    rejectionReasons: eligible ? [] : ["insufficient_history"],
  };
}
