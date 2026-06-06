import type {
  SyntheticRecommendationActionabilityType,
  SyntheticRecommendationAudience,
  SyntheticRecommendationCategory,
  SyntheticRecommendationConflictSeverity,
  SyntheticRecommendationEffortLevel,
  SyntheticRecommendationEvidenceStrength,
  SyntheticRecommendationGovernanceStatus,
  SyntheticRecommendationMaterialityStatus,
  SyntheticRecommendationOutcomeStatus,
  SyntheticRecommendationOwnershipType,
  SyntheticRecommendationRefreshStatus,
  SyntheticRecommendationTimeframe,
  SyntheticRecommendationType,
} from "./types";

export const SYNTHETIC_RECOMMENDATION_SCHEMA_VERSION = 1;

export const SYNTHETIC_RECOMMENDATION_CATEGORIES: SyntheticRecommendationCategory[] = [
  "revenue",
  "expense",
  "payroll",
  "workforce",
  "cash",
  "working_capital",
  "inventory",
  "procurement",
  "customer",
  "treasury",
  "tax",
  "healthcare",
  "manufacturing",
  "construction",
  "municipality",
  "strategic",
];

export const SYNTHETIC_RECOMMENDATION_TYPES: SyntheticRecommendationType[] = [
  "efficiency_recommendation",
  "risk_mitigation_recommendation",
  "working_capital_recommendation",
  "growth_recommendation",
  "margin_recommendation",
  "compliance_recommendation",
  "strategic_recommendation",
  "operational_recommendation",
  "cash_flow_recommendation",
  "workforce_recommendation",
];

export const SYNTHETIC_RECOMMENDATION_AUDIENCES: SyntheticRecommendationAudience[] = [
  "cfo",
  "controller",
  "accounting_manager",
  "operations",
  "board",
  "executive",
];

export const SYNTHETIC_RECOMMENDATION_ACTIONABILITY_TYPES: SyntheticRecommendationActionabilityType[] = [
  "informational_recommendation",
  "review_recommendation",
  "action_recommendation",
  "decision_recommendation",
  "escalation_recommendation",
];

export const SYNTHETIC_RECOMMENDATION_EFFORT_LEVELS: SyntheticRecommendationEffortLevel[] = [
  "low",
  "medium",
  "high",
];

export const SYNTHETIC_RECOMMENDATION_TIMEFRAMES: SyntheticRecommendationTimeframe[] = [
  "short_term",
  "medium_term",
  "long_term",
];

export const SYNTHETIC_RECOMMENDATION_OWNERSHIP_TYPES: SyntheticRecommendationOwnershipType[] = [
  "finance",
  "accounting",
  "controller",
  "cfo",
  "operations",
  "treasury",
  "revenue_cycle",
  "supply_chain",
  "procurement",
  "hr",
  "executive_team",
  "department_leader",
  "board",
];

export const SYNTHETIC_RECOMMENDATION_OUTCOME_STATUSES: SyntheticRecommendationOutcomeStatus[] = [
  "successful",
  "partially_successful",
  "unsuccessful",
  "inconclusive",
  "insufficient_data",
];

export const SYNTHETIC_RECOMMENDATION_MATERIALITY_STATUSES: SyntheticRecommendationMaterialityStatus[] = [
  "immaterial",
  "monitor",
  "material",
  "highly_material",
  "unknown",
];

export const SYNTHETIC_RECOMMENDATION_EVIDENCE_STRENGTHS: SyntheticRecommendationEvidenceStrength[] = [
  "weak",
  "moderate",
  "strong",
  "compelling",
];

export const SYNTHETIC_RECOMMENDATION_CONFLICT_SEVERITIES: SyntheticRecommendationConflictSeverity[] = [
  "low",
  "medium",
  "high",
  "critical",
  "unknown",
];

export const SYNTHETIC_RECOMMENDATION_GOVERNANCE_STATUSES: SyntheticRecommendationGovernanceStatus[] = [
  "candidate",
  "under_review",
  "approved",
  "rejected",
  "retired",
];

export const SYNTHETIC_RECOMMENDATION_REFRESH_STATUSES: SyntheticRecommendationRefreshStatus[] = [
  "current",
  "stale",
  "needs_review",
  "needs_reprocessing",
  "superseded_by_new_data",
  "superseded_by_new_rule",
];

export const SYNTHETIC_RECOMMENDATION_SCORE_MIN = 0;
export const SYNTHETIC_RECOMMENDATION_SCORE_MAX = 1;
