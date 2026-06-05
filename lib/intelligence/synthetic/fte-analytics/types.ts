export type SyntheticFteAnalyticsMode =
  | "metric_scaffolding"
  | "observation_scaffolding"
  | "pattern_scaffolding";

export type SyntheticFteScopeType =
  | "company"
  | "entity"
  | "facility"
  | "department"
  | "consolidated"
  | "group";

export type SyntheticFteCoreMetric =
  | "employee_count"
  | "active_employee_count"
  | "employee_fte"
  | "budgeted_fte"
  | "contractor_fte"
  | "workforce_equivalent"
  | "vacancy_fte"
  | "fte_utilization_percent"
  | "capacity_gap_percent"
  | "overtime_hours"
  | "overtime_fte_equivalent";

export type SyntheticFteSupportingMetric =
  | "regular_hours"
  | "paid_hours"
  | "scheduled_hours"
  | "standard_weekly_hours"
  | "department_employee_count"
  | "department_employee_fte"
  | "department_workforce_equivalent"
  | "payroll_cost_per_employee_fte"
  | "revenue_per_employee_fte"
  | "gross_margin_per_employee_fte"
  | "labor_cost_percent_revenue"
  | "contractor_labor_percent_total_labor"
  | "agency_labor_fte"
  | "temporary_labor_fte"
  | "seasonal_labor_fte";

export type SyntheticFteHealthcareMetric =
  | "rn_fte"
  | "therapist_fte"
  | "provider_fte"
  | "prn_fte_equivalent"
  | "agency_labor_fte"
  | "rcm_staff_fte";

export type SyntheticFteManufacturingMetric =
  | "direct_labor_fte"
  | "direct_labor_budgeted_fte"
  | "direct_labor_vacancy_fte"
  | "indirect_labor_fte"
  | "temporary_labor_fte"
  | "seasonal_labor_fte";

export type SyntheticFteMetricName =
  | SyntheticFteCoreMetric
  | SyntheticFteSupportingMetric
  | SyntheticFteHealthcareMetric
  | SyntheticFteManufacturingMetric;

export type SyntheticFteObservationType =
  | "employee_fte_growth"
  | "employee_fte_decline"
  | "vacancy_increase"
  | "vacancy_decrease"
  | "contractor_reliance"
  | "overtime_dependency"
  | "agency_labor_dependency"
  | "seasonal_staffing_pattern"
  | "workforce_mix_shift"
  | "capacity_gap_increase"
  | "capacity_gap_decrease"
  | "fte_utilization_change";

export type SyntheticFtePatternType =
  | "sustained_fte_growth"
  | "sustained_fte_decline"
  | "recurring_overtime_dependency"
  | "recurring_contractor_reliance"
  | "recurring_agency_labor_reliance"
  | "staffing_shortage_pattern"
  | "recurring_capacity_gap"
  | "low_fte_utilization_pattern"
  | "workforce_mix_shift_pattern"
  | "seasonal_staffing_pattern";

export type SyntheticFtePayrollDriverCategory =
  | "fte_volume_effect"
  | "wage_effect"
  | "overtime_effect"
  | "contractor_effect"
  | "benefit_effect"
  | "mix_effect"
  | "vacancy_capacity_effect"
  | "agency_temp_labor_effect";

export type SyntheticFteGovernanceStatus =
  | "candidate"
  | "under_review"
  | "approved"
  | "rejected"
  | "promoted"
  | "retired";

export type SyntheticFteRefreshStatus =
  | "current"
  | "stale"
  | "needs_review"
  | "needs_reprocessing"
  | "superseded_by_new_data"
  | "superseded_by_new_rule";

export interface SyntheticFteScope {
  scopeType: SyntheticFteScopeType;
  companyId: string;
  entityScope?: "entity" | "consolidated" | "group";
  entityId?: string;
  facilityId?: string;
  departmentId?: string;
  departmentName?: string;
  consolidationGroupId?: string;
}

export interface SyntheticFteSourceReference {
  sourceId: string;
  sourceType:
    | "payroll_register"
    | "payroll_summary"
    | "hr_export"
    | "workforce_schedule"
    | "contractor_data"
    | "agency_labor_data"
    | "temporary_labor_data"
    | "company_memory";
  sourceSystem: string;
  sourceRecordId?: string;
  sourceReport?: string;
  sourcePeriod: string;
  sourceLastUpdated?: string;
  tenantId?: string;
}

export interface SyntheticFteMetric {
  metricId: string;
  metricName: SyntheticFteMetricName;
  scope: SyntheticFteScope;
  periodKey: string;
  value: number;
  unit: "count" | "fte" | "hours" | "percent" | "currency";
  numeratorMetricName?: SyntheticFteMetricName;
  denominatorMetricName?: SyntheticFteMetricName;
  confidenceScore: number;
  confidenceReason: string;
  evidenceStrength: "weak" | "moderate" | "strong" | "compelling";
  dataCompletenessScore: number;
  sourceReferences: SyntheticFteSourceReference[];
}

export interface SyntheticFteLineage {
  fteAnalyticsId: string;
  sourceReferenceIds: string[];
  metricIds: string[];
  observationIds: string[];
  patternIds: string[];
  memoryIds: string[];
  retrievalLineageIds: string[];
  determinismHash?: string;
}

export interface SyntheticFteObservation {
  observationId: string;
  observationType: SyntheticFteObservationType;
  scope: SyntheticFteScope;
  periodKey: string;
  comparisonPeriodKey?: string;
  metricName: SyntheticFteMetricName;
  currentValue: number;
  comparisonValue?: number;
  absoluteChange?: number;
  percentChange?: number;
  confidenceScore: number;
  confidenceReason: string;
  evidenceStrength: "weak" | "moderate" | "strong" | "compelling";
  dataCompletenessScore: number;
  governanceStatus: SyntheticFteGovernanceStatus;
  refreshStatus: SyntheticFteRefreshStatus;
  sourceReferences: SyntheticFteSourceReference[];
  lineage: SyntheticFteLineage;
}

export interface SyntheticFtePattern {
  patternId: string;
  patternType: SyntheticFtePatternType;
  scope: SyntheticFteScope;
  observationWindow: string;
  supportingObservationIds: string[];
  supportingPeriodKeys: string[];
  patternStrength: "weak" | "moderate" | "strong" | "persistent";
  stabilityScore: number;
  confidenceScore: number;
  evidenceStrength: "weak" | "moderate" | "strong" | "compelling";
  dataCompletenessScore: number;
  governanceStatus: SyntheticFteGovernanceStatus;
  refreshStatus: SyntheticFteRefreshStatus;
  lineage: SyntheticFteLineage;
}

export interface SyntheticFteAnalyticsRequest {
  companyId: string;
  mode: SyntheticFteAnalyticsMode;
  scope: SyntheticFteScope;
  periodKeys: string[];
  sourceReferences: SyntheticFteSourceReference[];
  requestedAt: string;
}

export interface SyntheticFteAnalyticsMetadata {
  fteAnalyticsId: string;
  companyId: string;
  mode: SyntheticFteAnalyticsMode;
  requestedAt: string;
  completedAt: string;
  executionDurationMs: number;
  metricCount: number;
  observationCount: number;
  patternCount: number;
  confidenceScore: number;
  dataCompletenessScore: number;
  governanceStatus: SyntheticFteGovernanceStatus;
  refreshStatus: SyntheticFteRefreshStatus;
}

export interface SyntheticFteAnalyticsResult {
  request: SyntheticFteAnalyticsRequest;
  metadata: SyntheticFteAnalyticsMetadata;
  metrics: SyntheticFteMetric[];
  observations: SyntheticFteObservation[];
  patterns: SyntheticFtePattern[];
  warnings: string[];
}
