import type {
  SyntheticFteAnalyticsMode,
  SyntheticFteCoreMetric,
  SyntheticFteHealthcareMetric,
  SyntheticFteManufacturingMetric,
  SyntheticFteObservationType,
  SyntheticFtePatternType,
  SyntheticFtePayrollDriverCategory,
  SyntheticFteRefreshStatus,
  SyntheticFteScopeType,
  SyntheticFteSupportingMetric,
  SyntheticFteGovernanceStatus,
} from "./types";

export const SYNTHETIC_FTE_ANALYTICS_SCHEMA_VERSION = 1;

export const SYNTHETIC_FTE_ANALYTICS_MODES: SyntheticFteAnalyticsMode[] = [
  "metric_scaffolding",
  "observation_scaffolding",
  "pattern_scaffolding",
];

export const SYNTHETIC_FTE_SCOPE_TYPES: SyntheticFteScopeType[] = [
  "company",
  "entity",
  "facility",
  "department",
  "consolidated",
  "group",
];

export const SYNTHETIC_FTE_CORE_METRICS: SyntheticFteCoreMetric[] = [
  "employee_count",
  "active_employee_count",
  "employee_fte",
  "budgeted_fte",
  "contractor_fte",
  "workforce_equivalent",
  "vacancy_fte",
  "fte_utilization_percent",
  "capacity_gap_percent",
  "overtime_hours",
  "overtime_fte_equivalent",
];

export const SYNTHETIC_FTE_SUPPORTING_METRICS: SyntheticFteSupportingMetric[] = [
  "regular_hours",
  "paid_hours",
  "scheduled_hours",
  "standard_weekly_hours",
  "department_employee_count",
  "department_employee_fte",
  "department_workforce_equivalent",
  "payroll_cost_per_employee_fte",
  "revenue_per_employee_fte",
  "gross_margin_per_employee_fte",
  "labor_cost_percent_revenue",
  "contractor_labor_percent_total_labor",
  "agency_labor_fte",
  "temporary_labor_fte",
  "seasonal_labor_fte",
];

export const SYNTHETIC_FTE_OBSERVATION_TYPES: SyntheticFteObservationType[] = [
  "employee_fte_growth",
  "employee_fte_decline",
  "vacancy_increase",
  "vacancy_decrease",
  "contractor_reliance",
  "overtime_dependency",
  "agency_labor_dependency",
  "seasonal_staffing_pattern",
  "workforce_mix_shift",
  "capacity_gap_increase",
  "capacity_gap_decrease",
  "fte_utilization_change",
];

export const SYNTHETIC_FTE_PATTERN_TYPES: SyntheticFtePatternType[] = [
  "sustained_fte_growth",
  "sustained_fte_decline",
  "recurring_overtime_dependency",
  "recurring_contractor_reliance",
  "recurring_agency_labor_reliance",
  "staffing_shortage_pattern",
  "recurring_capacity_gap",
  "low_fte_utilization_pattern",
  "workforce_mix_shift_pattern",
  "seasonal_staffing_pattern",
];

export const SYNTHETIC_FTE_PAYROLL_DRIVER_CATEGORIES: SyntheticFtePayrollDriverCategory[] = [
  "fte_volume_effect",
  "wage_effect",
  "overtime_effect",
  "contractor_effect",
  "benefit_effect",
  "mix_effect",
  "vacancy_capacity_effect",
  "agency_temp_labor_effect",
];

export const SYNTHETIC_FTE_HEALTHCARE_WORKFORCE_METRICS: SyntheticFteHealthcareMetric[] = [
  "rn_fte",
  "therapist_fte",
  "provider_fte",
  "prn_fte_equivalent",
  "agency_labor_fte",
  "rcm_staff_fte",
];

export const SYNTHETIC_FTE_MANUFACTURING_WORKFORCE_METRICS: SyntheticFteManufacturingMetric[] = [
  "direct_labor_fte",
  "direct_labor_budgeted_fte",
  "direct_labor_vacancy_fte",
  "indirect_labor_fte",
  "temporary_labor_fte",
  "seasonal_labor_fte",
];

export const SYNTHETIC_FTE_GOVERNANCE_STATUSES: SyntheticFteGovernanceStatus[] = [
  "candidate",
  "under_review",
  "approved",
  "rejected",
  "promoted",
  "retired",
];

export const SYNTHETIC_FTE_REFRESH_STATUSES: SyntheticFteRefreshStatus[] = [
  "current",
  "stale",
  "needs_review",
  "needs_reprocessing",
  "superseded_by_new_data",
  "superseded_by_new_rule",
];

export const SYNTHETIC_FTE_SCORE_MIN = 0;
export const SYNTHETIC_FTE_SCORE_MAX = 1;
