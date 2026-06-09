import type {
  SyntheticOutcomeCategory,
  SyntheticOutcomeConfidenceCategory,
  SyntheticOutcomeEvidenceStrength,
  SyntheticOutcomeGovernanceStatus,
  SyntheticOutcomeLearningCompatibilityCategory,
  SyntheticOutcomeMemoryCompatibilityCategory,
  SyntheticOutcomeResultCategory,
  SyntheticOutcomeStatus,
  SyntheticOutcomeTrustCategory,
} from "./types";

export const SYNTHETIC_OUTCOME_SCHEMA_VERSION = 1;
export const SYNTHETIC_OUTCOME_TAXONOMY_VERSION = 1;
export const SYNTHETIC_OUTCOME_CONTRACT_VERSION = 1;
export const SYNTHETIC_OUTCOME_COMPATIBILITY_VERSION = 1;

export const SYNTHETIC_OUTCOME_CATEGORIES: SyntheticOutcomeCategory[] = [
  "decision_outcome",
  "recommendation_outcome",
  "forecast_outcome",
  "scenario_outcome",
  "controller_outcome",
  "firm_portfolio_outcome",
  "capability_outcome",
  "adoption_outcome",
  "intervention_outcome",
  "time_savings_outcome",
  "organizational_knowledge_outcome",
];

export const SYNTHETIC_OUTCOME_STATUSES: SyntheticOutcomeStatus[] = [
  "pending_observation",
  "observed",
  "partially_observed",
  "validated",
  "disputed",
  "inconclusive",
  "expired",
  "not_applicable",
];

export const SYNTHETIC_OUTCOME_RESULT_CATEGORIES: SyntheticOutcomeResultCategory[] = [
  "successful",
  "partially_successful",
  "unsuccessful",
  "neutral",
  "mixed",
  "unknown",
];

export const SYNTHETIC_OUTCOME_EVIDENCE_STRENGTHS: SyntheticOutcomeEvidenceStrength[] = [
  "weak",
  "moderate",
  "strong",
  "compelling",
  "insufficient",
];

export const SYNTHETIC_OUTCOME_CONFIDENCE_CATEGORIES: SyntheticOutcomeConfidenceCategory[] = [
  "high_confidence",
  "medium_confidence",
  "low_confidence",
  "insufficient_evidence",
  "unknown",
];

export const SYNTHETIC_OUTCOME_TRUST_CATEGORIES: SyntheticOutcomeTrustCategory[] = [
  "trusted",
  "needs_review",
  "degraded",
  "blocked",
  "unknown",
];

export const SYNTHETIC_OUTCOME_GOVERNANCE_STATUSES: SyntheticOutcomeGovernanceStatus[] = [
  "candidate",
  "under_review",
  "approved",
  "rejected",
  "retired",
  "not_required",
];

export const SYNTHETIC_OUTCOME_MEMORY_COMPATIBILITY_CATEGORIES: SyntheticOutcomeMemoryCompatibilityCategory[] = [
  "memory_eligible",
  "memory_pending_review",
  "memory_ineligible",
  "memory_not_required",
];

export const SYNTHETIC_OUTCOME_LEARNING_COMPATIBILITY_CATEGORIES: SyntheticOutcomeLearningCompatibilityCategory[] = [
  "learning_eligible",
  "learning_pending_review",
  "learning_ineligible",
  "learning_not_required",
];

export const SYNTHETIC_OUTCOME_REPOSITORY_SAFETY_EXCLUSIONS = [
  "no_builders",
  "no_calculations",
  "no_learning_loops",
  "no_confidence_adjustments",
  "no_memory_updates",
  "no_organizational_knowledge",
  "no_recommendation_learning",
  "no_runtime_behavior",
  "no_persistence",
  "no_package_changes",
] as const;
