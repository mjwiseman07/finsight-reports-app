import type {
  SyntheticFluxAnalysisMode,
  SyntheticFluxBalanceSheetDriver,
  SyntheticFluxCashFlowDriver,
  SyntheticFluxCategory,
  SyntheticFluxComparisonType,
  SyntheticFluxExpenseDriver,
  SyntheticFluxGovernanceStatus,
  SyntheticFluxObservationType,
  SyntheticFluxPatternType,
  SyntheticFluxPayrollDriver,
  SyntheticFluxRefreshStatus,
  SyntheticFluxRevenueDriver,
} from "./types";

export const SYNTHETIC_FLUX_ANALYSIS_SCHEMA_VERSION = 1;

export const SYNTHETIC_FLUX_ANALYSIS_MODES: SyntheticFluxAnalysisMode[] = [
  "comparison_scaffolding",
  "observation_scaffolding",
  "pattern_scaffolding",
];

export const SYNTHETIC_FLUX_COMPARISON_TYPES: SyntheticFluxComparisonType[] = [
  "month_over_month",
  "quarter_over_quarter",
  "year_over_year",
  "budget_vs_actual",
  "custom_comparison_period",
];

export const SYNTHETIC_FLUX_CATEGORIES: SyntheticFluxCategory[] = [
  "revenue",
  "expense",
  "payroll",
  "balance_sheet",
  "cash_flow",
  "operational",
  "workforce",
];

export const SYNTHETIC_FLUX_REVENUE_DRIVER_CATEGORIES: SyntheticFluxRevenueDriver[] = [
  "volume",
  "price",
  "mix",
  "customer_concentration",
  "product_service_mix",
  "one_time_revenue",
  "recurring_revenue",
];

export const SYNTHETIC_FLUX_PAYROLL_DRIVER_CATEGORIES: SyntheticFluxPayrollDriver[] = [
  "fte_volume_effect",
  "wage_effect",
  "overtime_effect",
  "contractor_effect",
  "agency_temp_labor_effect",
  "benefits_effect",
  "payroll_tax_effect",
  "vacancy_effect",
  "workforce_mix_effect",
  "capacity_gap_effect",
];

export const SYNTHETIC_FLUX_EXPENSE_DRIVER_CATEGORIES: SyntheticFluxExpenseDriver[] = [
  "vendor_mix",
  "utilization",
  "inflation",
  "operational_volume",
  "timing",
  "one_time_expense",
  "contract_rate_change",
];

export const SYNTHETIC_FLUX_BALANCE_SHEET_DRIVER_CATEGORIES: SyntheticFluxBalanceSheetDriver[] = [
  "ar",
  "ap",
  "inventory",
  "debt",
  "fixed_assets",
  "working_capital",
  "prepaids",
  "accruals",
];

export const SYNTHETIC_FLUX_CASH_FLOW_DRIVER_CATEGORIES: SyntheticFluxCashFlowDriver[] = [
  "collections_timing",
  "vendor_payment_timing",
  "payroll_timing",
  "debt_activity",
  "capex",
  "working_capital_change",
];

export const SYNTHETIC_FLUX_OBSERVATION_TYPES: SyntheticFluxObservationType[] = [
  "revenue_growth",
  "revenue_decline",
  "payroll_growth",
  "payroll_decline",
  "overtime_growth",
  "vacancy_increase",
  "vacancy_decrease",
  "margin_decline",
  "margin_improvement",
  "cash_decline",
  "cash_increase",
  "working_capital_change",
  "expense_growth",
  "expense_decline",
  "balance_sheet_movement",
];

export const SYNTHETIC_FLUX_PATTERN_TYPES: SyntheticFluxPatternType[] = [
  "sustained_margin_pressure",
  "recurring_overtime_dependency",
  "recurring_cash_pressure",
  "recurring_working_capital_pressure",
  "sustained_revenue_growth",
  "sustained_revenue_decline",
  "recurring_payroll_pressure",
  "recurring_expense_growth",
  "sustained_capacity_gap_pressure",
  "recurring_contractor_labor_substitution",
];

export const SYNTHETIC_FLUX_GOVERNANCE_STATUSES: SyntheticFluxGovernanceStatus[] = [
  "candidate",
  "under_review",
  "approved",
  "rejected",
  "promoted",
  "retired",
];

export const SYNTHETIC_FLUX_REFRESH_STATUSES: SyntheticFluxRefreshStatus[] = [
  "current",
  "stale",
  "needs_review",
  "needs_reprocessing",
  "superseded_by_new_data",
  "superseded_by_new_rule",
];

export const SYNTHETIC_FLUX_SCORE_MIN = 0;
export const SYNTHETIC_FLUX_SCORE_MAX = 1;
