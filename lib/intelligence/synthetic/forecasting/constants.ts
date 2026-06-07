import type {
  SyntheticForecastApprovalLevel,
  SyntheticForecastApprovalStatus,
  SyntheticForecastBiasCategory,
  SyntheticForecastBiasDirection,
  SyntheticForecastCategory,
  SyntheticForecastEvidenceStrength,
  SyntheticForecastGranularityLevel,
  SyntheticForecastHorizon,
  SyntheticForecastMethodologyType,
  SyntheticForecastReviewStatus,
  SyntheticForecastRiskProbability,
  SyntheticForecastRiskSeverity,
  SyntheticForecastSource,
} from "./types";

export const SYNTHETIC_FORECAST_SCHEMA_VERSION = 1;

export const SYNTHETIC_FORECAST_CATEGORIES: SyntheticForecastCategory[] = [
  "revenue",
  "expense",
  "payroll",
  "workforce",
  "cash",
  "working_capital",
  "inventory",
  "treasury",
  "tax",
  "healthcare",
  "manufacturing",
  "construction",
  "municipality",
  "strategic",
];

export const SYNTHETIC_FORECAST_HORIZONS: SyntheticForecastHorizon[] = [
  "monthly",
  "quarterly",
  "annual",
  "rolling_3_month",
  "rolling_6_month",
  "rolling_12_month",
  "multi_year",
];

export const SYNTHETIC_FORECAST_METHODOLOGIES: SyntheticForecastMethodologyType[] = [
  "trend_based",
  "driver_based",
  "workforce_based",
  "contract_based",
  "project_based",
  "budget_based",
  "historical_actual_based",
  "manual_override",
  "hybrid",
];

export const SYNTHETIC_FORECAST_GRANULARITY_LEVELS: SyntheticForecastGranularityLevel[] = [
  "enterprise",
  "consolidated",
  "entity",
  "segment",
  "business_unit",
  "department",
  "location",
  "facility",
  "project",
  "contract",
  "fund",
  "account_group",
  "general_ledger_account",
];

export const SYNTHETIC_FORECAST_SOURCES: SyntheticForecastSource[] = [
  "system_forecast",
  "management_forecast",
  "budget_forecast",
  "board_forecast",
];

export const SYNTHETIC_FORECAST_EVIDENCE_STRENGTHS: SyntheticForecastEvidenceStrength[] = [
  "weak",
  "moderate",
  "strong",
  "compelling",
];

export const SYNTHETIC_FORECAST_RISK_SEVERITIES: SyntheticForecastRiskSeverity[] = [
  "low",
  "moderate",
  "high",
  "critical",
  "unknown",
];

export const SYNTHETIC_FORECAST_RISK_PROBABILITIES: SyntheticForecastRiskProbability[] = [
  "low",
  "medium",
  "high",
  "unknown",
];

export const SYNTHETIC_FORECAST_BIAS_DIRECTIONS: SyntheticForecastBiasDirection[] = [
  "over_forecast",
  "under_forecast",
  "neutral",
  "unknown",
];

export const SYNTHETIC_FORECAST_BIAS_CATEGORIES: SyntheticForecastBiasCategory[] = [
  "optimistic_bias",
  "pessimistic_bias",
  "neutral_bias",
];

export const SYNTHETIC_FORECAST_REVIEW_STATUSES: SyntheticForecastReviewStatus[] = [
  "not_started",
  "in_review",
  "changes_requested",
  "reviewed",
  "not_required",
];

export const SYNTHETIC_FORECAST_APPROVAL_STATUSES: SyntheticForecastApprovalStatus[] = [
  "not_submitted",
  "pending",
  "approved",
  "rejected",
  "not_required",
];

export const SYNTHETIC_FORECAST_APPROVAL_LEVELS: SyntheticForecastApprovalLevel[] = [
  "department_review",
  "controller_review",
  "cfo_review",
  "executive_review",
  "board_review",
];

export const SYNTHETIC_FORECAST_SCORE_MIN = 0;
export const SYNTHETIC_FORECAST_SCORE_MAX = 1;
