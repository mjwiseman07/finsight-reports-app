export type SyntheticCommentaryCategory =
  | "executive"
  | "revenue"
  | "expense"
  | "payroll"
  | "workforce"
  | "balance_sheet"
  | "cash_flow"
  | "operational"
  | "healthcare"
  | "manufacturing";

export type SyntheticCommentaryAudience =
  | "executive"
  | "controller"
  | "cfo"
  | "accounting_manager"
  | "department_leader"
  | "operations_leader"
  | "board_package";

export type SyntheticCommentaryStyle =
  | "executive_summary"
  | "operational"
  | "variance_explanation"
  | "workforce"
  | "cash_flow"
  | "board_package";

export type SyntheticCommentaryEvidenceType =
  | "observation"
  | "pattern"
  | "company_memory"
  | "source_reference"
  | "driver_reference";

export type SyntheticCommentaryEvidenceStrength = "weak" | "moderate" | "strong" | "compelling";

export type SyntheticCommentaryGovernanceStatus =
  | "candidate"
  | "under_review"
  | "approved"
  | "rejected"
  | "promoted"
  | "retired";

export type SyntheticCommentaryRefreshStatus =
  | "current"
  | "stale"
  | "needs_review"
  | "needs_reprocessing"
  | "superseded_by_new_data"
  | "superseded_by_new_rule";

export type SyntheticCommentaryMaterialityStatus =
  | "immaterial"
  | "monitor"
  | "material"
  | "highly_material"
  | "unknown";

export type SyntheticCommentaryThresholdType =
  | "currency"
  | "percentage"
  | "account_category"
  | "company_specific"
  | "audience_specific"
  | "risk_based";

export type SyntheticCommentaryThresholdSource =
  | "system_default"
  | "company_override"
  | "audience_preference"
  | "board_package_preference"
  | "future_pulse_assisted_configuration";

export type SyntheticCommentaryMemoryAlignmentStatus =
  | "aligned"
  | "partially_aligned"
  | "conflicting"
  | "insufficient_memory"
  | "not_evaluated";

export type SyntheticCommentaryNarrativeHorizon =
  | "current_period"
  | "rolling_3_months"
  | "rolling_6_months"
  | "rolling_12_months"
  | "historical_context"
  | "recurring_business_condition";

export type SyntheticCommentaryDomain =
  | "revenue"
  | "payroll"
  | "workforce"
  | "expense"
  | "cash"
  | "working_capital"
  | "accounts_receivable"
  | "accounts_payable"
  | "inventory"
  | "warehouse_inventory"
  | "manufacturing"
  | "healthcare"
  | "revenue_cycle_management"
  | "treasury"
  | "fixed_assets"
  | "capital_projects"
  | "procurement"
  | "vendor_management"
  | "customer"
  | "debt_and_covenant"
  | "legal_and_contract"
  | "esg_and_sustainability"
  | "it_operations"
  | "debt"
  | "tax"
  | "technical_accounting";

export type SyntheticCommentaryBusinessModel =
  | "manufacturing"
  | "distribution"
  | "wholesale"
  | "healthcare"
  | "revenue_cycle_management"
  | "construction"
  | "municipal_government"
  | "fund_accounting"
  | "nonprofit"
  | "saas"
  | "professional_services"
  | "retail"
  | "e_commerce"
  | "government_contracting"
  | "project_based_services"
  | "multi_entity_holdco";

export type SyntheticCommentaryRiskCategory =
  | "financial"
  | "customer"
  | "vendor"
  | "workforce"
  | "healthcare"
  | "manufacturing"
  | "construction"
  | "fund_accounting"
  | "warehouse_inventory";

export type SyntheticCommentaryRiskSeverity = "low" | "moderate" | "high" | "critical" | "unknown";

export type SyntheticWorkingCapitalIndicator =
  | "working_capital_pressure"
  | "working_capital_generated"
  | "working_capital_consumed"
  | "working_capital_release_opportunity";

export type SyntheticCashConversionCycleIndicator =
  | "cash_conversion_cycle_improvement"
  | "cash_conversion_cycle_deterioration"
  | "ar_collection_risk"
  | "inventory_efficiency_risk"
  | "supplier_payment_pressure";

export type SyntheticLiquidityIndicator =
  | "liquidity_pressure"
  | "cash_position_change"
  | "debt_headroom_change"
  | "covenant_headroom_change";

export type SyntheticCommentaryBenchmarkType =
  | "industry"
  | "peer_group"
  | "geography"
  | "company_size_cohort"
  | "public_company"
  | "historical_baseline";

export type SyntheticCommentaryBenchmarkScope =
  | "company"
  | "entity"
  | "department"
  | "facility"
  | "industry"
  | "peer_group";

export type SyntheticCommentaryRegulatoryCategory =
  | "healthcare_reimbursement"
  | "medicare"
  | "medicaid"
  | "payer_policy"
  | "tax_law"
  | "sec_reporting"
  | "labor_law"
  | "wage_and_hour"
  | "environmental"
  | "industry_specific_compliance";

export type SyntheticCommentaryRegulatoryEffect =
  | "possible_contributor"
  | "supporting_context"
  | "contradictory_context"
  | "not_evaluated";

export interface SyntheticCommentaryScope {
  companyId: string;
  entityScope?: "entity" | "consolidated" | "group";
  entityId?: string;
  departmentId?: string;
  facilityId?: string;
  consolidationGroupId?: string;
}

export interface SyntheticCommentarySourceReference {
  sourceId: string;
  sourceType:
    | "company_memory"
    | "fte_observation"
    | "fte_pattern"
    | "flux_observation"
    | "flux_pattern"
    | "financial_statement"
    | "operational_metric"
    | "benchmark"
    | "regulatory_context";
  sourceSystem: string;
  sourceRecordId?: string;
  sourcePeriod?: string;
  tenantId?: string;
}

export interface SyntheticCommentaryDriverReference {
  driverReferenceId: string;
  driverCategory: string;
  driverLabel: string;
  supportingSourceReferenceIds: string[];
  confidenceScore: number;
  evidenceStrength: SyntheticCommentaryEvidenceStrength;
}

export interface SyntheticCommentaryMemoryReference {
  memoryId: string;
  memoryKey: string;
  memoryStatus?: string;
  sourceReferenceIds: string[];
}

export interface SyntheticCommentaryObservationReference {
  observationId: string;
  observationType: string;
  sourceModule: "fte_analytics" | "flux_analysis" | "future_operational_intelligence";
  sourceReferenceIds: string[];
}

export interface SyntheticCommentaryPatternReference {
  patternId: string;
  patternType: string;
  sourceModule: "fte_analytics" | "flux_analysis" | "future_operational_intelligence";
  sourceReferenceIds: string[];
}

export interface SyntheticCommentaryEvidence {
  evidenceId: string;
  evidenceType: SyntheticCommentaryEvidenceType;
  evidencePriorityRank: number;
  evidencePriorityReason: string;
  sourceReferenceIds: string[];
  observationReferenceIds: string[];
  patternReferenceIds: string[];
  memoryReferenceIds: string[];
  driverReferenceIds: string[];
}

export interface SyntheticCommentaryLineage {
  commentaryId: string;
  sourceReferenceIds: string[];
  observationIds: string[];
  patternIds: string[];
  memoryIds: string[];
  driverReferenceIds: string[];
  retrievalLineageIds: string[];
  determinismHash?: string;
}

export interface SyntheticCommentaryMetadata {
  commentaryId: string;
  companyId: string;
  commentaryCategory: SyntheticCommentaryCategory;
  audience: SyntheticCommentaryAudience;
  style: SyntheticCommentaryStyle;
  periodKey: string;
  comparisonPeriodKey?: string;
  materialityStatus: SyntheticCommentaryMaterialityStatus;
  confidenceScore: number;
  confidenceReason: string;
  evidenceStrength: SyntheticCommentaryEvidenceStrength;
  dataCompletenessScore: number;
  evidencePriorityRank: number;
  evidencePriorityReason: string;
  missingDataFlags: string[];
  staleSourceFlags: string[];
  memoryAlignmentStatus: SyntheticCommentaryMemoryAlignmentStatus;
  narrativeDriftDetected: boolean;
  historicalPatternConflict: boolean;
  narrativeHorizon: SyntheticCommentaryNarrativeHorizon;
  governanceStatus: SyntheticCommentaryGovernanceStatus;
  refreshStatus: SyntheticCommentaryRefreshStatus;
  lineage: SyntheticCommentaryLineage;
}

export interface SyntheticCommentaryMateriality {
  materialityStatus: SyntheticCommentaryMaterialityStatus;
  thresholdType: SyntheticCommentaryThresholdType;
  thresholdValue: number;
  thresholdSource: SyntheticCommentaryThresholdSource;
}

export interface SyntheticCommentaryDomainRegistryEntry {
  commentaryDomain: SyntheticCommentaryDomain;
  supportedMetrics: string[];
  supportedDrivers: string[];
  requiredEvidence: SyntheticCommentaryEvidenceType[];
  optionalEvidence: SyntheticCommentaryEvidenceType[];
  confidenceRequirements: string[];
  missingDataBehavior: string;
}

export interface SyntheticCommentaryBusinessModelRegistryEntry {
  businessModel: SyntheticCommentaryBusinessModel;
  supportedDomains: SyntheticCommentaryDomain[];
  supportedEvidence: SyntheticCommentaryEvidenceType[];
  supportedPatterns: string[];
}

export interface SyntheticCommentaryRiskIndicator {
  riskCategory: SyntheticCommentaryRiskCategory;
  riskIndicator: string;
  riskSeverity: SyntheticCommentaryRiskSeverity;
  riskConfidence: number;
}

export interface SyntheticCommentaryBenchmarkReference {
  benchmarkType: SyntheticCommentaryBenchmarkType;
  benchmarkScope: SyntheticCommentaryBenchmarkScope;
  benchmarkValue: number;
  benchmarkSourceReferenceId: string;
}

export interface SyntheticCommentaryRegulatoryReference {
  regulatoryCategory: SyntheticCommentaryRegulatoryCategory;
  regulatorySource: string;
  regulatoryEffect: SyntheticCommentaryRegulatoryEffect;
  sourceReferenceId: string;
}

export interface SyntheticCommentaryCandidate {
  commentaryId: string;
  companyId: string;
  scope: SyntheticCommentaryScope;
  metadata: SyntheticCommentaryMetadata;
  materiality: SyntheticCommentaryMateriality;
  evidence: SyntheticCommentaryEvidence[];
  sourceReferences: SyntheticCommentarySourceReference[];
  driverReferences: SyntheticCommentaryDriverReference[];
  memoryReferences: SyntheticCommentaryMemoryReference[];
  observationReferences: SyntheticCommentaryObservationReference[];
  patternReferences: SyntheticCommentaryPatternReference[];
  riskIndicators: SyntheticCommentaryRiskIndicator[];
  benchmarkReferences: SyntheticCommentaryBenchmarkReference[];
  regulatoryReferences: SyntheticCommentaryRegulatoryReference[];
  workingCapitalIndicators: SyntheticWorkingCapitalIndicator[];
  cashConversionCycleIndicators: SyntheticCashConversionCycleIndicator[];
  liquidityIndicators: SyntheticLiquidityIndicator[];
  warnings: string[];
}
