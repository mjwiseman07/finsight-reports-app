import type {
  SyntheticMemoryPromotionEvidenceStrength,
  SyntheticMemoryPromotionRejectionReason,
  SyntheticMemoryPromotionReviewComplexity,
  SyntheticMemoryPromotionReviewerRole,
  SyntheticMemoryPromotionReviewStatus,
} from "./types";

export const SYNTHETIC_MEMORY_PROMOTION_SCHEMA_VERSION = 1;

export const SYNTHETIC_MEMORY_PROMOTION_REVIEW_STATUSES: SyntheticMemoryPromotionReviewStatus[] = [
  "pending_review",
  "approved_for_promotion",
  "rejected",
  "needs_more_history",
  "duplicate",
  "stale",
  "superseded",
  "conflicting",
];

export const SYNTHETIC_MEMORY_PROMOTION_REJECTION_REASONS: SyntheticMemoryPromotionRejectionReason[] = [
  "insufficient_history",
  "low_confidence",
  "stale_evidence",
  "conflicting_candidate",
  "duplicate_candidate",
  "superseded_source_snapshots",
  "incomplete_lineage",
  "manual_rejection",
];

export const SYNTHETIC_MEMORY_PROMOTION_EVIDENCE_STRENGTHS: SyntheticMemoryPromotionEvidenceStrength[] = [
  "weak",
  "moderate",
  "strong",
  "compelling",
];

export const SYNTHETIC_MEMORY_PROMOTION_REVIEW_COMPLEXITIES: SyntheticMemoryPromotionReviewComplexity[] = [
  "low",
  "medium",
  "high",
];

export const SYNTHETIC_MEMORY_PROMOTION_REVIEWER_ROLES: SyntheticMemoryPromotionReviewerRole[] = [
  "advisor",
  "admin",
  "system",
  "compliance",
];

export const SYNTHETIC_MEMORY_PROMOTION_SOURCE_AUTHORITY = "historical_snapshot";
