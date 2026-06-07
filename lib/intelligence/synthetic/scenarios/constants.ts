import type {
  SyntheticScenarioCategory,
  SyntheticScenarioConstraintCategory,
  SyntheticScenarioConstraintSeverity,
  SyntheticScenarioDependencyStatus,
  SyntheticScenarioEvidenceStrength,
  SyntheticScenarioGranularity,
  SyntheticScenarioHorizon,
  SyntheticScenarioMethodologyType,
  SyntheticScenarioType,
} from "./types";

export const SYNTHETIC_SCENARIO_SCHEMA_VERSION = 1;

export const SYNTHETIC_SCENARIO_CATEGORIES: SyntheticScenarioCategory[] = [
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
  "government_contracting",
  "strategic",
];

export const SYNTHETIC_SCENARIO_TYPES: SyntheticScenarioType[] = [
  "best_case",
  "expected_case",
  "worst_case",
  "management_case",
  "stress_case",
  "upside_case",
  "downside_case",
  "custom_case",
];

export const SYNTHETIC_SCENARIO_HORIZONS: SyntheticScenarioHorizon[] = [
  "monthly",
  "quarterly",
  "annual",
  "rolling_3_month",
  "rolling_6_month",
  "rolling_12_month",
  "multi_year",
];

export const SYNTHETIC_SCENARIO_GRANULARITY_LEVELS: SyntheticScenarioGranularity[] = [
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

export const SYNTHETIC_SCENARIO_METHODOLOGIES: SyntheticScenarioMethodologyType[] = [
  "assumption_change",
  "driver_change",
  "recommendation_inclusion",
  "risk_event",
  "sensitivity_case",
  "stress_test",
  "portfolio_case",
  "manual_case",
  "hybrid_case",
];

export const SYNTHETIC_SCENARIO_EVIDENCE_STRENGTHS: SyntheticScenarioEvidenceStrength[] = [
  "weak",
  "moderate",
  "strong",
  "compelling",
];

export const SYNTHETIC_SCENARIO_CONSTRAINT_CATEGORIES: SyntheticScenarioConstraintCategory[] = [
  "cash_constraint",
  "staffing_constraint",
  "capacity_constraint",
  "funding_constraint",
  "contract_constraint",
  "regulatory_constraint",
  "debt_covenant_constraint",
  "operational_constraint",
  "liquidity_constraint",
];

export const SYNTHETIC_SCENARIO_CONSTRAINT_SEVERITIES: SyntheticScenarioConstraintSeverity[] = [
  "low",
  "moderate",
  "high",
  "critical",
  "unknown",
];

export const SYNTHETIC_SCENARIO_DEPENDENCY_STATUSES: SyntheticScenarioDependencyStatus[] = [
  "not_started",
  "in_progress",
  "complete",
  "blocked",
  "not_applicable",
  "unknown",
];

export const SYNTHETIC_SCENARIO_SCORE_MIN = 0;
export const SYNTHETIC_SCENARIO_SCORE_MAX = 1;
