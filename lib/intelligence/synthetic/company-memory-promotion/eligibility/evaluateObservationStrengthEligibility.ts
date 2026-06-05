import type { SyntheticMemoryCandidate } from "../../company-memory-ingestion";
import type { SyntheticMemoryPromotionRejectionReason } from "../types";

export interface MemoryPromotionObservationStrengthResult {
  eligible: boolean;
  rejectionReasons: SyntheticMemoryPromotionRejectionReason[];
}

export function evaluateObservationStrengthEligibility(
  candidate: SyntheticMemoryCandidate,
): MemoryPromotionObservationStrengthResult {
  const eligible =
    candidate.candidateObservationStrength === "moderate" ||
    candidate.candidateObservationStrength === "strong" ||
    candidate.candidateObservationStrength === "persistent";

  return {
    eligible,
    rejectionReasons: eligible ? [] : ["insufficient_history"],
  };
}
