export type SyntheticFluxAnalysisMode =
  | "comparison_scaffolding"
  | "observation_scaffolding"
  | "pattern_scaffolding";

export type SyntheticFluxComparisonType =
  | "month_over_month"
  | "quarter_over_quarter"
  | "year_over_year"
  | "budget_vs_actual"
  | "custom_comparison_period";

export type SyntheticFluxCategory =
  | "revenue"
  | "expense"
  | "payroll"
  | "balance_sheet"
  | "cash_flow"
  | "operational"
  | "workforce";

export type SyntheticFluxRevenueDriver =
  | "volume"
  | "price"
  | "mix"
  | "customer_concentration"
  | "product_service_mix"
  | "one_time_revenue"
  | "recurring_revenue";

export type SyntheticFluxPayrollDriver =
  | "fte_volume_effect"
  | "wage_effect"
  | "overtime_effect"
  | "contractor_effect"
  | "agency_temp_labor_effect"
  | "benefits_effect"
  | "payroll_tax_effect"
  | "vacancy_effect"
  | "workforce_mix_effect"
  | "capacity_gap_effect";

export type SyntheticFluxExpenseDriver =
  | "vendor_mix"
  | "utilization"
  | "inflation"
  | "operational_volume"
  | "timing"
  | "one_time_expense"
  | "contract_rate_change";

export type SyntheticFluxBalanceSheetDriver =
  | "ar"
  | "ap"
  | "inventory"
  | "debt"
  | "fixed_assets"
  | "working_capital"
  | "prepaids"
  | "accruals";

export type SyntheticFluxCashFlowDriver =
  | "collections_timing"
  | "vendor_payment_timing"
  | "payroll_timing"
  | "debt_activity"
  | "capex"
  | "working_capital_change";

export type SyntheticFluxDriverCategory =
  | SyntheticFluxRevenueDriver
  | SyntheticFluxPayrollDriver
  | SyntheticFluxExpenseDriver
  | SyntheticFluxBalanceSheetDriver
  | SyntheticFluxCashFlowDriver;

export type SyntheticFluxObservationType =
  | "revenue_growth"
  | "revenue_decline"
  | "payroll_growth"
  | "payroll_decline"
  | "overtime_growth"
  | "vacancy_increase"
  | "vacancy_decrease"
  | "margin_decline"
  | "margin_improvement"
  | "cash_decline"
  | "cash_increase"
  | "working_capital_change"
  | "expense_growth"
  | "expense_decline"
  | "balance_sheet_movement";

export type SyntheticFluxPatternType =
  | "sustained_margin_pressure"
  | "recurring_overtime_dependency"
  | "recurring_cash_pressure"
  | "recurring_working_capital_pressure"
  | "sustained_revenue_growth"
  | "sustained_revenue_decline"
  | "recurring_payroll_pressure"
  | "recurring_expense_growth"
  | "sustained_capacity_gap_pressure"
  | "recurring_contractor_labor_substitution";

export type SyntheticFluxGovernanceStatus =
  | "candidate"
  | "under_review"
  | "approved"
  | "rejected"
  | "promoted"
  | "retired";

export type SyntheticFluxRefreshStatus =
  | "current"
  | "stale"
  | "needs_review"
  | "needs_reprocessing"
  | "superseded_by_new_data"
  | "superseded_by_new_rule";

export interface SyntheticFluxScope {
  companyId: string;
  entityScope?: "entity" | "consolidated" | "group";
  entityId?: string;
  departmentId?: string;
  accountId?: string;
  accountCategory?: string;
  consolidationGroupId?: string;
}

export interface SyntheticFluxSourceReference {
  sourceId: string;
  sourceType:
    | "financial_statement"
    | "payroll"
    | "fte_analytics"
    | "company_memory"
    | "operational_metric";
  sourceSystem: string;
  sourceRecordId?: string;
  sourceReport?: string;
  sourcePeriod: string;
  tenantId?: string;
}

export interface SyntheticFluxDriverAttribution {
  driverId: string;
  driverCategory: SyntheticFluxDriverCategory;
  driverLabel: string;
  currentValue?: number;
  comparisonValue?: number;
  absoluteVariance?: number;
  percentVariance?: number;
  confidenceScore: number;
  evidenceStrength: "weak" | "moderate" | "strong" | "compelling";
  sourceReferenceIds: string[];
}

export interface SyntheticFluxLineage {
  fluxAnalysisId: string;
  sourceReferenceIds: string[];
  driverIds: string[];
  observationIds: string[];
  patternIds: string[];
  memoryIds: string[];
  fteObservationIds: string[];
  ftePatternIds: string[];
  retrievalLineageIds: string[];
  determinismHash?: string;
}

export interface SyntheticFluxObservation {
  observationId: string;
  observationType: SyntheticFluxObservationType;
  fluxCategory: SyntheticFluxCategory;
  comparisonType: SyntheticFluxComparisonType;
  scope: SyntheticFluxScope;
  currentPeriodKey: string;
  comparisonPeriodKey: string;
  currentValue: number;
  comparisonValue: number;
  absoluteVariance: number;
  percentVariance?: number;
  drivers: SyntheticFluxDriverAttribution[];
  confidenceScore: number;
  confidenceReason: string;
  evidenceStrength: "weak" | "moderate" | "strong" | "compelling";
  dataCompletenessScore: number;
  governanceStatus: SyntheticFluxGovernanceStatus;
  refreshStatus: SyntheticFluxRefreshStatus;
  sourceReferences: SyntheticFluxSourceReference[];
  lineage: SyntheticFluxLineage;
}

export interface SyntheticFluxPattern {
  patternId: string;
  patternType: SyntheticFluxPatternType;
  fluxCategory: SyntheticFluxCategory;
  scope: SyntheticFluxScope;
  observationWindow: string;
  supportingObservationIds: string[];
  supportingPeriodKeys: string[];
  driverCategories: SyntheticFluxDriverCategory[];
  patternStrength: "weak" | "moderate" | "strong" | "persistent";
  stabilityScore: number;
  confidenceScore: number;
  evidenceStrength: "weak" | "moderate" | "strong" | "compelling";
  dataCompletenessScore: number;
  governanceStatus: SyntheticFluxGovernanceStatus;
  refreshStatus: SyntheticFluxRefreshStatus;
  sourceReferences: SyntheticFluxSourceReference[];
  lineage: SyntheticFluxLineage;
}

export interface SyntheticFluxAnalysisRequest {
  companyId: string;
  mode: SyntheticFluxAnalysisMode;
  comparisonType: SyntheticFluxComparisonType;
  fluxCategories: SyntheticFluxCategory[];
  scope: SyntheticFluxScope;
  currentPeriodKey: string;
  comparisonPeriodKey: string;
  sourceReferences: SyntheticFluxSourceReference[];
  requestedAt: string;
}

export interface SyntheticFluxAnalysisMetadata {
  fluxAnalysisId: string;
  companyId: string;
  mode: SyntheticFluxAnalysisMode;
  comparisonType: SyntheticFluxComparisonType;
  requestedAt: string;
  completedAt: string;
  executionDurationMs: number;
  observationCount: number;
  patternCount: number;
  driverCount: number;
  confidenceScore: number;
  dataCompletenessScore: number;
  governanceStatus: SyntheticFluxGovernanceStatus;
  refreshStatus: SyntheticFluxRefreshStatus;
}

export interface SyntheticFluxAnalysisResult {
  request: SyntheticFluxAnalysisRequest;
  metadata: SyntheticFluxAnalysisMetadata;
  observations: SyntheticFluxObservation[];
  patterns: SyntheticFluxPattern[];
  warnings: string[];
}
