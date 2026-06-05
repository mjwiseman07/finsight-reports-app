import type {
  SyntheticMemoryCandidate,
  SyntheticMemoryCandidateKind,
} from "../company-memory-ingestion";
import type {
  SyntheticCompanyMemoryConfidence,
  SyntheticCompanyMemoryFreshness,
  SyntheticCompanyMemorySourceAuthority,
  SyntheticCompanyMemoryType,
} from "../types/company-memory";

export type SyntheticMemoryPromotionReviewStatus =
  | "pending_review"
  | "approved_for_promotion"
  | "rejected"
  | "needs_more_history"
  | "duplicate"
  | "stale"
  | "superseded"
  | "conflicting";

export type SyntheticMemoryPromotionRejectionReason =
  | "insufficient_history"
  | "low_confidence"
  | "stale_evidence"
  | "conflicting_candidate"
  | "duplicate_candidate"
  | "superseded_source_snapshots"
  | "incomplete_lineage"
  | "manual_rejection";

export type SyntheticMemoryPromotionEvidenceStrength =
  | "weak"
  | "moderate"
  | "strong"
  | "compelling";

export type SyntheticMemoryPromotionReviewComplexity =
  | "low"
  | "medium"
  | "high";

export type SyntheticMemoryPromotionDecisionSource =
  | "deterministic_rules"
  | "human_review";

export type SyntheticMemoryPromotionReviewerRole =
  | "advisor"
  | "admin"
  | "system"
  | "compliance";

export interface SyntheticMemoryCandidateReviewRequest {
  companyId: string;
  candidates: SyntheticMemoryCandidate[];
  reviewedAt: string;
  reviewedBy?: string;
  reviewerRole?: SyntheticMemoryPromotionReviewerRole;
}

export interface SyntheticMemoryPromotionEligibility {
  eligible: boolean;
  eligibilityScore: number;
  confidenceEligible: boolean;
  freshnessEligible: boolean;
  coverageEligible: boolean;
  observationStrengthEligible: boolean;
  stabilityEligible: boolean;
  sourceReferenceCountEligible: boolean;
  lineageComplete: boolean;
  promotionEvidenceStrength: SyntheticMemoryPromotionEvidenceStrength;
  promotionReviewComplexity: SyntheticMemoryPromotionReviewComplexity;
  rejectionReasons: SyntheticMemoryPromotionRejectionReason[];
}

export interface SyntheticMemoryPromotionDecision {
  reviewStatus: SyntheticMemoryPromotionReviewStatus;
  decisionSource: SyntheticMemoryPromotionDecisionSource;
  approvedForPromotion: boolean;
  reviewReasonCodes: string[];
  decidedAt: string;
}

export interface SyntheticMemoryPromotionMetadata {
  promotionId: string;
  companyId: string;
  candidateId: string;
  promotionDeterminismHash: string;
  retrievalLineageId: string;
  retrievalDeterminismHash: string;
  promotionEvidenceStrength: SyntheticMemoryPromotionEvidenceStrength;
  promotionReviewComplexity: SyntheticMemoryPromotionReviewComplexity;
  reviewedAt: string;
  reviewedBy?: string;
  reviewerRole?: SyntheticMemoryPromotionReviewerRole;
  reviewDecision?: SyntheticMemoryPromotionReviewStatus;
  reviewReasonCode?: string;
}

export interface SyntheticMemoryPromotionLineage {
  promotionId: string;
  candidateId: string;
  ingestionId: string;
  retrievalId: string;
  retrievalLineageId: string;
  retrievalDeterminismHash: string;
  sourceReferenceIds: string[];
  snapshotIds: string[];
  observedPeriodKeys: string[];
  promotionDecisionId: string;
}

export interface SyntheticMemoryPromotionCandidate {
  candidateId: string;
  companyId: string;
  candidateKind: SyntheticMemoryCandidateKind;
  memoryType: SyntheticCompanyMemoryType;
  memoryConfidence: SyntheticCompanyMemoryConfidence;
  memoryFreshness: SyntheticCompanyMemoryFreshness;
  memorySourceAuthority: SyntheticCompanyMemorySourceAuthority;
  sourceCandidate: SyntheticMemoryCandidate;
  reviewStatus: SyntheticMemoryPromotionReviewStatus;
  eligibility: SyntheticMemoryPromotionEligibility;
  decision: SyntheticMemoryPromotionDecision;
  metadata: SyntheticMemoryPromotionMetadata;
  lineage: SyntheticMemoryPromotionLineage;
}

export interface SyntheticMemoryCandidateReviewResult {
  request: SyntheticMemoryCandidateReviewRequest;
  metadata: SyntheticMemoryPromotionMetadata;
  promotionCandidates: SyntheticMemoryPromotionCandidate[];
  approvedCandidateIds: string[];
  rejectedCandidateIds: string[];
  needsMoreHistoryCandidateIds: string[];
  duplicateCandidateIds: string[];
  staleCandidateIds: string[];
  supersededCandidateIds: string[];
  conflictingCandidateIds: string[];
  warnings: string[];
}
