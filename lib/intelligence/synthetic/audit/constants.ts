import type {
  SyntheticAuditCategory,
  SyntheticAuditExceptionCategory,
  SyntheticAuditFindingCategory,
  SyntheticAuditObservationCategory,
  SyntheticAuditRiskCategory,
} from "./types";

export const SYNTHETIC_AUDIT_SCHEMA_VERSION = 1;
export const SYNTHETIC_AUDIT_TAXONOMY_VERSION = 1;
export const SYNTHETIC_AUDIT_CONTRACT_VERSION = 1;
export const SYNTHETIC_AUDIT_COMPATIBILITY_VERSION = 1;

export const SYNTHETIC_AUDIT_CATEGORIES: SyntheticAuditCategory[] = [
  "journal_entry_audit",
  "reconciliation_audit",
  "close_readiness_audit",
  "audit_readiness",
  "pbc_request",
  "audit_schedule",
  "audit_tie_out",
  "audit_response",
  "debt_covenant",
  "platform_integrity",
  "trust_verification",
  "workflow_visibility",
  "missing_activity",
  "recurring_pattern",
  "anomaly",
  "expected_activity",
  "flux_analysis",
  "inventory_audit",
  "unit_cost_audit",
  "cutoff_audit",
  "period_end_activity",
  "cash_reconciliation",
  "bank_activity",
  "cash_application",
  "cash_disbursement",
  "tax_audit",
  "sales_tax_audit",
  "vat_audit",
  "lease_audit",
  "revenue_recognition_audit",
  "balance_sheet_integrity",
  "materiality",
  "intelligence_surfacing",
];

export const SYNTHETIC_AUDIT_OBSERVATION_CATEGORIES: SyntheticAuditObservationCategory[] = [
  "background_observation",
  "coverage_observation",
  "evidence_observation",
  "tie_out_observation",
  "workflow_observation",
  "materiality_observation",
  "control_observation",
  "account_relationship_observation",
  "cash_observation",
  "tax_observation",
  "journal_observation",
  "reconciliation_observation",
  "schedule_observation",
];

export const SYNTHETIC_AUDIT_FINDING_CATEGORIES: SyntheticAuditFindingCategory[] = [
  "audit_attention_item",
  "audit_risk_item",
  "audit_review_item",
  "audit_readiness_item",
  "audit_exception_item",
  "audit_finding_item",
  "controller_review_item",
  "materiality_item",
  "coverage_gap_item",
  "evidence_gap_item",
];

export const SYNTHETIC_AUDIT_EXCEPTION_CATEGORIES: SyntheticAuditExceptionCategory[] = [
  "missing_support",
  "insufficient_support",
  "failed_tie_out",
  "unresolved_variance",
  "incomplete_schedule",
  "missing_activity",
  "stagnant_balance",
  "unsupported_balance",
  "unsupported_journal",
  "management_override",
  "workflow_blocker",
  "coverage_gap",
  "out_of_balance_schedule",
];

export const SYNTHETIC_AUDIT_RISK_CATEGORIES: SyntheticAuditRiskCategory[] = [
  "low_risk",
  "moderate_risk",
  "high_risk",
  "critical_risk",
  "unknown_risk",
];

export const SYNTHETIC_AUDIT_REPOSITORY_SAFETY_EXCLUSIONS = [
  "no_builders",
  "no_runtime_services",
  "no_persistence",
  "no_ui",
  "no_dashboards",
  "no_widgets",
  "no_rendering",
  "no_workflow_execution",
  "no_approvals",
  "no_journal_creation",
  "no_journal_posting",
  "no_accounting_actions",
  "no_erp_integrations",
  "no_scoring_engines",
  "no_ranking_engines",
  "no_routing_engines",
  "no_autonomous_agents",
  "no_audit_findings_generation",
  "no_audit_observation_generation",
  "no_package_changes",
] as const;
