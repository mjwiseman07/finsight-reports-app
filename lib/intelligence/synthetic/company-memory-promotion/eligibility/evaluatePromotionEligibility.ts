import type { SyntheticMemoryCandidate } from "../../company-memory-ingestion";
import type {
  SyntheticMemoryPromotionEligibility,
  SyntheticMemoryPromotionEvidenceStrength,
  SyntheticMemoryPromotionRejectionReason,
  SyntheticMemoryPromotionReviewComplexity,
} from "../types";
import { evaluateConfidenceEligibility } from "./evaluateConfidenceEligibility";
import { evaluateCoverageEligibility } from "./evaluateCoverageEligibility";
import { evaluateFreshnessEligibility } from "./evaluateFreshnessEligibility";
import { evaluateLineageCompleteness } from "./evaluateLineageCompleteness";
import { evaluateObservationStrengthEligibility } from "./evaluateObservationStrengthEligibility";
import { evaluateStabilityEligibility } from "./evaluateStabilityEligibility";

function uniqueReasons(reasons: SyntheticMemoryPromotionRejectionReason[]) {
  return [...new Set(reasons)];
}

function evidenceStrength(score: number, candidate: SyntheticMemoryCandidate): SyntheticMemoryPromotionEvidenceStrength {
  if (score >= 0.95 && candidate.candidateObservationStrength === "persistent") return "compelling";
  if (score >= 0.8) return "strong";
  if (score >= 0.6) return "moderate";
  return "weak";
}

function reviewComplexity(
  eligible: boolean,
  rejectionReasons: SyntheticMemoryPromotionRejectionReason[],
  strength: SyntheticMemoryPromotionEvidenceStrength,
): SyntheticMemoryPromotionReviewComplexity {
  if (!eligible || rejectionReasons.includes("conflicting_candidate") || rejectionReasons.includes("incomplete_lineage")) return "high";
  if (strength === "strong" || strength === "compelling") return "low";
  return "medium";
}

function statusRejectionReasons(candidate: SyntheticMemoryCandidate): SyntheticMemoryPromotionRejectionReason[] {
  if (candidate.candidateStatus === "duplicate") return ["duplicate_candidate"];
  if (candidate.candidateStatus === "conflicting") return ["conflicting_candidate"];
  if (candidate.candidateStatus === "stale") return ["stale_evidence"];
  if (candidate.candidateStatus === "superseded") return ["superseded_source_snapshots"];
  return [];
}

export function evaluatePromotionEligibility(candidate: SyntheticMemoryCandidate): SyntheticMemoryPromotionEligibility {
  const confidence = evaluateConfidenceEligibility(candidate);
  const freshness = evaluateFreshnessEligibility(candidate);
  const coverage = evaluateCoverageEligibility(candidate);
  const observationStrength = evaluateObservationStrengthEligibility(candidate);
  const stability = evaluateStabilityEligibility(candidate);
  const lineage = evaluateLineageCompleteness(candidate);
  const rejectionReasons = uniqueReasons([
    ...confidence.rejectionReasons,
    ...freshness.rejectionReasons,
    ...coverage.rejectionReasons,
    ...observationStrength.rejectionReasons,
    ...stability.rejectionReasons,
    ...lineage.rejectionReasons,
    ...statusRejectionReasons(candidate),
  ]);
  const checks = [
    confidence.eligible,
    freshness.eligible,
    coverage.coverageEligible,
    coverage.sourceReferenceCountEligible,
    observationStrength.eligible,
    stability.eligible,
    lineage.lineageComplete,
  ];
  const eligibilityScore = checks.filter(Boolean).length / checks.length;
  const eligible = checks.every(Boolean) && rejectionReasons.length === 0;
  const promotionEvidenceStrength = evidenceStrength(eligibilityScore, candidate);

  return {
    eligible,
    eligibilityScore,
    confidenceEligible: confidence.eligible,
    freshnessEligible: freshness.eligible,
    coverageEligible: coverage.coverageEligible,
    observationStrengthEligible: observationStrength.eligible,
    stabilityEligible: stability.eligible,
    sourceReferenceCountEligible: coverage.sourceReferenceCountEligible,
    lineageComplete: lineage.lineageComplete,
    promotionEvidenceStrength,
    promotionReviewComplexity: reviewComplexity(eligible, rejectionReasons, promotionEvidenceStrength),
    rejectionReasons,
  };
}
