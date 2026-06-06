import type {
  SyntheticCashConversionCycleIndicator,
  SyntheticCommentaryAudience,
  SyntheticCommentaryBenchmarkScope,
  SyntheticCommentaryBenchmarkType,
  SyntheticCommentaryBusinessModel,
  SyntheticCommentaryCategory,
  SyntheticCommentaryDomain,
  SyntheticCommentaryEvidenceStrength,
  SyntheticCommentaryEvidenceType,
  SyntheticCommentaryGovernanceStatus,
  SyntheticCommentaryMaterialityStatus,
  SyntheticCommentaryMemoryAlignmentStatus,
  SyntheticCommentaryNarrativeHorizon,
  SyntheticCommentaryRefreshStatus,
  SyntheticCommentaryRegulatoryCategory,
  SyntheticCommentaryRegulatoryEffect,
  SyntheticCommentaryRiskCategory,
  SyntheticCommentaryRiskSeverity,
  SyntheticCommentaryStyle,
  SyntheticCommentaryThresholdSource,
  SyntheticCommentaryThresholdType,
  SyntheticLiquidityIndicator,
  SyntheticWorkingCapitalIndicator,
} from "./types";

export const SYNTHETIC_COMMENTARY_SCHEMA_VERSION = 1;

export const SYNTHETIC_COMMENTARY_CATEGORIES: SyntheticCommentaryCategory[] = [
  "executive",
  "revenue",
  "expense",
  "payroll",
  "workforce",
  "balance_sheet",
  "cash_flow",
  "operational",
  "healthcare",
  "manufacturing",
];

export const SYNTHETIC_COMMENTARY_AUDIENCES: SyntheticCommentaryAudience[] = [
  "executive",
  "controller",
  "cfo",
  "accounting_manager",
  "department_leader",
  "operations_leader",
  "board_package",
];

export const SYNTHETIC_COMMENTARY_STYLES: SyntheticCommentaryStyle[] = [
  "executive_summary",
  "operational",
  "variance_explanation",
  "workforce",
  "cash_flow",
  "board_package",
];

export const SYNTHETIC_COMMENTARY_EVIDENCE_TYPES: SyntheticCommentaryEvidenceType[] = [
  "observation",
  "pattern",
  "company_memory",
  "source_reference",
  "driver_reference",
];

export const SYNTHETIC_COMMENTARY_EVIDENCE_STRENGTHS: SyntheticCommentaryEvidenceStrength[] = [
  "weak",
  "moderate",
  "strong",
  "compelling",
];

export const SYNTHETIC_COMMENTARY_GOVERNANCE_STATUSES: SyntheticCommentaryGovernanceStatus[] = [
  "candidate",
  "under_review",
  "approved",
  "rejected",
  "promoted",
  "retired",
];

export const SYNTHETIC_COMMENTARY_REFRESH_STATUSES: SyntheticCommentaryRefreshStatus[] = [
  "current",
  "stale",
  "needs_review",
  "needs_reprocessing",
  "superseded_by_new_data",
  "superseded_by_new_rule",
];

export const SYNTHETIC_COMMENTARY_MATERIALITY_STATUSES: SyntheticCommentaryMaterialityStatus[] = [
  "immaterial",
  "monitor",
  "material",
  "highly_material",
  "unknown",
];

export const SYNTHETIC_COMMENTARY_THRESHOLD_TYPES: SyntheticCommentaryThresholdType[] = [
  "currency",
  "percentage",
  "account_category",
  "company_specific",
  "audience_specific",
  "risk_based",
];

export const SYNTHETIC_COMMENTARY_THRESHOLD_SOURCES: SyntheticCommentaryThresholdSource[] = [
  "system_default",
  "company_override",
  "audience_preference",
  "board_package_preference",
  "future_pulse_assisted_configuration",
];

export const SYNTHETIC_COMMENTARY_MEMORY_ALIGNMENT_STATUSES: SyntheticCommentaryMemoryAlignmentStatus[] = [
  "aligned",
  "partially_aligned",
  "conflicting",
  "insufficient_memory",
  "not_evaluated",
];

export const SYNTHETIC_COMMENTARY_NARRATIVE_HORIZONS: SyntheticCommentaryNarrativeHorizon[] = [
  "current_period",
  "rolling_3_months",
  "rolling_6_months",
  "rolling_12_months",
  "historical_context",
  "recurring_business_condition",
];

export const SYNTHETIC_COMMENTARY_DOMAINS: SyntheticCommentaryDomain[] = [
  "revenue",
  "payroll",
  "workforce",
  "expense",
  "cash",
  "working_capital",
  "accounts_receivable",
  "accounts_payable",
  "inventory",
  "warehouse_inventory",
  "manufacturing",
  "healthcare",
  "revenue_cycle_management",
  "treasury",
  "fixed_assets",
  "capital_projects",
  "procurement",
  "vendor_management",
  "customer",
  "debt_and_covenant",
  "legal_and_contract",
  "esg_and_sustainability",
  "it_operations",
  "debt",
  "tax",
  "technical_accounting",
];

export const SYNTHETIC_COMMENTARY_BUSINESS_MODELS: SyntheticCommentaryBusinessModel[] = [
  "manufacturing",
  "distribution",
  "wholesale",
  "healthcare",
  "revenue_cycle_management",
  "construction",
  "municipal_government",
  "fund_accounting",
  "nonprofit",
  "saas",
  "professional_services",
  "retail",
  "e_commerce",
  "government_contracting",
  "project_based_services",
  "multi_entity_holdco",
];

export const SYNTHETIC_COMMENTARY_RISK_CATEGORIES: SyntheticCommentaryRiskCategory[] = [
  "financial",
  "customer",
  "vendor",
  "workforce",
  "healthcare",
  "manufacturing",
  "construction",
  "fund_accounting",
  "warehouse_inventory",
];

export const SYNTHETIC_COMMENTARY_RISK_SEVERITIES: SyntheticCommentaryRiskSeverity[] = [
  "low",
  "moderate",
  "high",
  "critical",
  "unknown",
];

export const SYNTHETIC_WORKING_CAPITAL_INDICATORS: SyntheticWorkingCapitalIndicator[] = [
  "working_capital_pressure",
  "working_capital_generated",
  "working_capital_consumed",
  "working_capital_release_opportunity",
];

export const SYNTHETIC_CASH_CONVERSION_CYCLE_INDICATORS: SyntheticCashConversionCycleIndicator[] = [
  "cash_conversion_cycle_improvement",
  "cash_conversion_cycle_deterioration",
  "ar_collection_risk",
  "inventory_efficiency_risk",
  "supplier_payment_pressure",
];

export const SYNTHETIC_LIQUIDITY_INDICATORS: SyntheticLiquidityIndicator[] = [
  "liquidity_pressure",
  "cash_position_change",
  "debt_headroom_change",
  "covenant_headroom_change",
];

export const SYNTHETIC_COMMENTARY_BENCHMARK_TYPES: SyntheticCommentaryBenchmarkType[] = [
  "industry",
  "peer_group",
  "geography",
  "company_size_cohort",
  "public_company",
  "historical_baseline",
];

export const SYNTHETIC_COMMENTARY_BENCHMARK_SCOPES: SyntheticCommentaryBenchmarkScope[] = [
  "company",
  "entity",
  "department",
  "facility",
  "industry",
  "peer_group",
];

export const SYNTHETIC_COMMENTARY_REGULATORY_CATEGORIES: SyntheticCommentaryRegulatoryCategory[] = [
  "healthcare_reimbursement",
  "medicare",
  "medicaid",
  "payer_policy",
  "tax_law",
  "sec_reporting",
  "labor_law",
  "wage_and_hour",
  "environmental",
  "industry_specific_compliance",
];

export const SYNTHETIC_COMMENTARY_REGULATORY_EFFECTS: SyntheticCommentaryRegulatoryEffect[] = [
  "possible_contributor",
  "supporting_context",
  "contradictory_context",
  "not_evaluated",
];

export const SYNTHETIC_COMMENTARY_SCORE_MIN = 0;
export const SYNTHETIC_COMMENTARY_SCORE_MAX = 1;
