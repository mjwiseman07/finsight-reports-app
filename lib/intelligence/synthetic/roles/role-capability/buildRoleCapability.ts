import { stableSnapshotHash } from "../../../core/hash";
import type { SyntheticActionDerivationMethod, SyntheticPhase38StaleMarker } from "../../actions/contracts";
import type { SyntheticActionHandoffPackage } from "../../actions/action-handoff-package";
import type {
  SyntheticAuditConfidenceMetadata,
  SyntheticAuditGovernanceMetadata,
  SyntheticAuditMaterialityCompatibility,
  SyntheticAuditScope,
  SyntheticAuditTrustMetadata,
} from "../../audit/types";
import type { SyntheticKnowledgeConfidenceFloorMetadata } from "../../knowledge/contracts";
import type { SyntheticMemoryObjectIsolationDimension } from "../../organizational-memory/memory-object";
import type { SyntheticRoleType } from "../contracts";

export type SyntheticRoleCapabilityFamily =
  | "reconciliations"
  | "journal_entries"
  | "close_execution"
  | "fixed_assets"
  | "reporting_and_analysis"
  | "audit_and_evidence"
  | "inbox_delegation"
  | "review_and_approval"
  | "process_documentation"
  | "process_intelligence"
  | "realization_sheet"
  | "ad_hoc_request"
  | "overnight_preparation";

export type SyntheticRoleCapabilityReviewLevel =
  | "none"
  | "self"
  | "senior"
  | "manager"
  | "controller"
  | "partner"
  | "cfo"
  | "human_required";

export type SyntheticRoleCapabilityMaterialitySensitivity =
  | "low"
  | "medium"
  | "high"
  | "requires_human_decision";

interface RoleCapabilityDefinition {
  capabilityName: string;
  capabilityDescription: string;
  roleApplicability: SyntheticRoleType[];
  taskFamily: string;
  subCapabilities: string[];
  inputsRequired: string[];
  outputType: string;
  evidenceRequirements: string[];
  reviewLevel: SyntheticRoleCapabilityReviewLevel;
  materialitySensitivity: SyntheticRoleCapabilityMaterialitySensitivity;
  canGenerateJournalEntry: boolean;
  canBeInitiatedByEmail: boolean;
  canBeInitiatedByPulse: boolean;
  canBeFullyAutomated: boolean;
  requiresReviewerIntervention: boolean;
  requiresOvernightProcessing: boolean;
  supportsAdHocRequest: boolean;
  supportsScheduledExecution: boolean;
  erpInteractionRequired: boolean;
  driveOutputRequired: boolean;
  workpaperRequired: boolean;
  leadSheetRequired: boolean;
  supportPackageRequired: boolean;
  fraudDetectionRequired: boolean;
  reasonablenessCheckRequired: boolean;
}

export interface BuildRoleCapabilityInput {
  capabilityFamily?: SyntheticRoleCapabilityFamily;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  capabilityName?: string;
  capabilityDescription?: string;
  roleApplicability?: SyntheticRoleType[];
  taskFamily?: string;
  subCapabilities?: string[];
  inputsRequired?: string[];
  outputType?: string;
  evidenceRequirements?: string[];
  reviewLevel?: SyntheticRoleCapabilityReviewLevel;
  materialitySensitivity?: SyntheticRoleCapabilityMaterialitySensitivity;
  canGenerateJournalEntry?: boolean;
  canBeInitiatedByEmail?: boolean;
  canBeInitiatedByPulse?: boolean;
  canBeFullyAutomated?: boolean;
  requiresReviewerIntervention?: boolean;
  requiresOvernightProcessing?: boolean;
  supportsAdHocRequest?: boolean;
  supportsScheduledExecution?: boolean;
  erpInteractionRequired?: boolean;
  driveOutputRequired?: boolean;
  workpaperRequired?: boolean;
  leadSheetRequired?: boolean;
  supportPackageRequired?: boolean;
  fraudDetectionRequired?: boolean;
  reasonablenessCheckRequired?: boolean;
  boundPhase38SnapshotHash?: string;
  boundPhase37SnapshotHash?: string;
  phase39StaleMarker?: SyntheticPhase38StaleMarker;
  executionReady?: boolean;
  companyId?: string;
  scope?: SyntheticAuditScope;
  customerIsolation?: SyntheticMemoryObjectIsolationDimension;
  firmIsolation?: SyntheticMemoryObjectIsolationDimension;
  clientIsolation?: SyntheticMemoryObjectIsolationDimension;
  derivationLineageIds?: string[];
  derivationMethod?: SyntheticActionDerivationMethod;
  confidenceFloorMetadata?: SyntheticKnowledgeConfidenceFloorMetadata[];
  sourceConfidenceReferenceIds?: string[];
  evidenceReferenceIds?: string[];
  lineageReferenceIds?: string[];
  trustMetadata?: SyntheticAuditTrustMetadata[];
  confidenceMetadata?: SyntheticAuditConfidenceMetadata[];
  governanceMetadata?: SyntheticAuditGovernanceMetadata[];
  materialityMetadata?: SyntheticAuditMaterialityCompatibility[];
  warnings?: string[];
  skippedIndexes?: number[];
}

export interface SyntheticRoleCapability {
  capabilityId: string;
  capabilityKey: string;
  capabilityFamily: SyntheticRoleCapabilityFamily;
  capabilityName: string;
  capabilityDescription: string;
  roleApplicability: SyntheticRoleType[];
  taskFamily: string;
  subCapabilities: string[];
  inputsRequired: string[];
  outputType: string;
  evidenceRequirements: string[];
  reviewLevel: SyntheticRoleCapabilityReviewLevel;
  materialitySensitivity: SyntheticRoleCapabilityMaterialitySensitivity;
  canGenerateJournalEntry: boolean;
  canBeInitiatedByEmail: boolean;
  canBeInitiatedByPulse: boolean;
  canBeFullyAutomated: boolean;
  requiresReviewerIntervention: boolean;
  requiresOvernightProcessing: boolean;
  supportsAdHocRequest: boolean;
  supportsScheduledExecution: boolean;
  erpInteractionRequired: boolean;
  driveOutputRequired: boolean;
  workpaperRequired: boolean;
  leadSheetRequired: boolean;
  supportPackageRequired: boolean;
  fraudDetectionRequired: boolean;
  reasonablenessCheckRequired: boolean;
  boundPhase38SnapshotHash: string;
  boundPhase37SnapshotHash: string;
  phase39StaleMarker: SyntheticPhase38StaleMarker;
  executable: false;
  executionReady: boolean;
  companyId: string;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  derivationLineageIds: string[];
  derivationMethod: SyntheticActionDerivationMethod;
  derivationHash: string;
  confidenceFloorMetadata: SyntheticKnowledgeConfidenceFloorMetadata[];
  sourceConfidenceReferenceIds: string[];
  evidenceReferenceIds: string[];
  lineageReferenceIds: string[];
  trustMetadata: SyntheticAuditTrustMetadata[];
  confidenceMetadata: SyntheticAuditConfidenceMetadata[];
  governanceMetadata: SyntheticAuditGovernanceMetadata[];
  materialityMetadata: SyntheticAuditMaterialityCompatibility[];
  warnings: string[];
  skippedIndexes: number[];
}

export interface BuildRoleCapabilityResult {
  roleCapability: SyntheticRoleCapability | null;
  skipped: boolean;
  warnings: string[];
}

const ALL_ROLE_TYPES: SyntheticRoleType[] = [
  "staff_accountant",
  "senior_accountant",
  "accounting_manager",
  "controller_helper",
  "cfo_helper",
  "staff_auditor",
  "senior_auditor",
  "audit_manager_helper",
  "partner_helper",
];

const ROLE_CAPABILITY_DEFINITIONS: Record<SyntheticRoleCapabilityFamily, RoleCapabilityDefinition> = {
  reconciliations: {
    capabilityName: "Reconciliations",
    capabilityDescription: "Metadata taxonomy for reconciliation preparation, tie-out, and variance identification.",
    roleApplicability: ["staff_accountant", "senior_accountant", "accounting_manager", "controller_helper"],
    taskFamily: "reconciliation",
    subCapabilities: ["bank_reconciliation", "balance_sheet_reconciliation", "tie_out", "variance_identification"],
    inputsRequired: ["account_data", "supporting_activity", "prior_period_balance"],
    outputType: "reconciliation_package",
    evidenceRequirements: ["source_detail", "supporting_schedule", "tie_out_reference"],
    reviewLevel: "senior",
    materialitySensitivity: "medium",
    canGenerateJournalEntry: false,
    canBeInitiatedByEmail: false,
    canBeInitiatedByPulse: false,
    canBeFullyAutomated: false,
    requiresReviewerIntervention: false,
    requiresOvernightProcessing: false,
    supportsAdHocRequest: false,
    supportsScheduledExecution: false,
    erpInteractionRequired: false,
    driveOutputRequired: true,
    workpaperRequired: true,
    leadSheetRequired: false,
    supportPackageRequired: false,
    fraudDetectionRequired: false,
    reasonablenessCheckRequired: false,
  },
  journal_entries: {
    capabilityName: "Journal Entries",
    capabilityDescription: "Metadata taxonomy for journal entry preparation with required verification and support.",
    roleApplicability: ["staff_accountant", "senior_accountant"],
    taskFamily: "journal_entry",
    subCapabilities: [
      "recurring_journal_entry",
      "accrual_preparation",
      "prepaid_amortization",
      "depreciation_entry",
      "reclass_entry",
      "allocation_entry",
      "intercompany_entry",
    ],
    inputsRequired: ["account_data", "calculation_support", "approval_policy_reference"],
    outputType: "draft_journal_entry_package",
    evidenceRequirements: ["lead_sheet", "support_package", "verification_reference"],
    reviewLevel: "manager",
    materialitySensitivity: "requires_human_decision",
    canGenerateJournalEntry: true,
    canBeInitiatedByEmail: false,
    canBeInitiatedByPulse: false,
    canBeFullyAutomated: false,
    requiresReviewerIntervention: true,
    requiresOvernightProcessing: false,
    supportsAdHocRequest: false,
    supportsScheduledExecution: false,
    erpInteractionRequired: false,
    driveOutputRequired: false,
    workpaperRequired: true,
    leadSheetRequired: true,
    supportPackageRequired: true,
    fraudDetectionRequired: true,
    reasonablenessCheckRequired: true,
  },
  close_execution: {
    capabilityName: "Close Execution",
    capabilityDescription: "Metadata taxonomy for close checklist execution, close status, rollforward, and period-end support.",
    roleApplicability: ["staff_accountant", "senior_accountant", "accounting_manager", "controller_helper"],
    taskFamily: "close_execution",
    subCapabilities: ["close_checklist_execution", "close_status_tracking", "support_rollforward", "period_end_support"],
    inputsRequired: ["close_checklist", "period_end_activity", "support_reference"],
    outputType: "close_status_summary",
    evidenceRequirements: ["completed_step_reference", "supporting_schedule", "exception_reference"],
    reviewLevel: "manager",
    materialitySensitivity: "medium",
    canGenerateJournalEntry: false,
    canBeInitiatedByEmail: false,
    canBeInitiatedByPulse: false,
    canBeFullyAutomated: false,
    requiresReviewerIntervention: false,
    requiresOvernightProcessing: false,
    supportsAdHocRequest: false,
    supportsScheduledExecution: false,
    erpInteractionRequired: false,
    driveOutputRequired: true,
    workpaperRequired: true,
    leadSheetRequired: false,
    supportPackageRequired: false,
    fraudDetectionRequired: false,
    reasonablenessCheckRequired: false,
  },
  fixed_assets: {
    capabilityName: "Fixed Assets",
    capabilityDescription: "Metadata taxonomy for fixed asset tracking, schedules, rollforwards, and capitalization review.",
    roleApplicability: ["staff_accountant", "senior_accountant"],
    taskFamily: "fixed_assets",
    subCapabilities: [
      "fixed_asset_additions_tracking",
      "fixed_asset_disposal_tracking",
      "depreciation_schedule",
      "fixed_asset_rollforward",
      "capitalization_review",
    ],
    inputsRequired: ["fixed_asset_register", "additions_support", "disposal_support"],
    outputType: "fixed_asset_workpaper_package",
    evidenceRequirements: ["lead_sheet", "support_package", "calculation_support"],
    reviewLevel: "manager",
    materialitySensitivity: "high",
    canGenerateJournalEntry: true,
    canBeInitiatedByEmail: false,
    canBeInitiatedByPulse: false,
    canBeFullyAutomated: false,
    requiresReviewerIntervention: true,
    requiresOvernightProcessing: false,
    supportsAdHocRequest: false,
    supportsScheduledExecution: false,
    erpInteractionRequired: false,
    driveOutputRequired: false,
    workpaperRequired: true,
    leadSheetRequired: true,
    supportPackageRequired: true,
    fraudDetectionRequired: true,
    reasonablenessCheckRequired: true,
  },
  reporting_and_analysis: {
    capabilityName: "Reporting and Analysis",
    capabilityDescription: "Metadata taxonomy for management analysis, KPI, board, investor, lender, and covenant reporting.",
    roleApplicability: ["senior_accountant", "accounting_manager", "controller_helper", "cfo_helper"],
    taskFamily: "reporting_and_analysis",
    subCapabilities: [
      "revenue_review",
      "margin_analysis",
      "flux_analysis",
      "variance_analysis",
      "management_summary",
      "kpi_dashboard_update",
      "board_package_preparation",
      "investor_summary",
      "covenant_compliance_summary",
      "lender_reporting",
      "cash_forecast_scenario",
    ],
    inputsRequired: ["financial_results", "prior_period_comparison", "reporting_methodology"],
    outputType: "analysis_package",
    evidenceRequirements: ["source_report", "comparison_reference", "methodology_reference"],
    reviewLevel: "human_required",
    materialitySensitivity: "requires_human_decision",
    canGenerateJournalEntry: false,
    canBeInitiatedByEmail: false,
    canBeInitiatedByPulse: false,
    canBeFullyAutomated: false,
    requiresReviewerIntervention: true,
    requiresOvernightProcessing: false,
    supportsAdHocRequest: false,
    supportsScheduledExecution: false,
    erpInteractionRequired: false,
    driveOutputRequired: true,
    workpaperRequired: true,
    leadSheetRequired: false,
    supportPackageRequired: false,
    fraudDetectionRequired: false,
    reasonablenessCheckRequired: true,
  },
  audit_and_evidence: {
    capabilityName: "Audit and Evidence",
    capabilityDescription: "Metadata taxonomy for PBC, audit support, testing tie-out, document review, and workpaper preparation.",
    roleApplicability: ["staff_auditor", "senior_auditor", "audit_manager_helper"],
    taskFamily: "audit_and_evidence",
    subCapabilities: [
      "pbc_collection",
      "audit_support_package",
      "testing_tieout",
      "document_review",
      "workpaper_preparation",
      "cash_audit_section",
      "audit_program_execution",
      "evidence_sufficiency_review",
    ],
    inputsRequired: ["audit_program_reference", "evidence_reference", "testing_criteria"],
    outputType: "audit_workpaper_package",
    evidenceRequirements: ["source_evidence", "testing_reference", "review_note_reference"],
    reviewLevel: "partner",
    materialitySensitivity: "requires_human_decision",
    canGenerateJournalEntry: false,
    canBeInitiatedByEmail: false,
    canBeInitiatedByPulse: false,
    canBeFullyAutomated: false,
    requiresReviewerIntervention: true,
    requiresOvernightProcessing: false,
    supportsAdHocRequest: false,
    supportsScheduledExecution: false,
    erpInteractionRequired: false,
    driveOutputRequired: true,
    workpaperRequired: true,
    leadSheetRequired: false,
    supportPackageRequired: false,
    fraudDetectionRequired: false,
    reasonablenessCheckRequired: true,
  },
  inbox_delegation: {
    capabilityName: "Inbox Delegation",
    capabilityDescription: "Metadata taxonomy for email and Pulse request intake classification and summary routing.",
    roleApplicability: ALL_ROLE_TYPES,
    taskFamily: "inbox_delegation",
    subCapabilities: [
      "email_instruction_parsing",
      "attachment_ingestion",
      "task_classification",
      "response_summary",
      "pulse_request_classification",
    ],
    inputsRequired: ["request_content", "requester_reference", "attachment_reference"],
    outputType: "classification_summary",
    evidenceRequirements: ["request_reference", "classification_reference"],
    reviewLevel: "none",
    materialitySensitivity: "low",
    canGenerateJournalEntry: false,
    canBeInitiatedByEmail: true,
    canBeInitiatedByPulse: true,
    canBeFullyAutomated: false,
    requiresReviewerIntervention: false,
    requiresOvernightProcessing: false,
    supportsAdHocRequest: false,
    supportsScheduledExecution: false,
    erpInteractionRequired: false,
    driveOutputRequired: false,
    workpaperRequired: false,
    leadSheetRequired: false,
    supportPackageRequired: false,
    fraudDetectionRequired: false,
    reasonablenessCheckRequired: false,
  },
  review_and_approval: {
    capabilityName: "Review and Approval",
    capabilityDescription: "Metadata taxonomy for output review, exception routing, approval routing, and resubmission routing.",
    roleApplicability: [
      "senior_accountant",
      "accounting_manager",
      "controller_helper",
      "senior_auditor",
      "audit_manager_helper",
      "partner_helper",
    ],
    taskFamily: "review_and_approval",
    subCapabilities: ["output_review", "exception_flagging", "approval_routing", "rejection_routing", "resubmission_routing"],
    inputsRequired: ["output_reference", "approval_policy_reference", "exception_reference"],
    outputType: "review_routing_metadata",
    evidenceRequirements: ["review_reference", "approval_policy_reference"],
    reviewLevel: "human_required",
    materialitySensitivity: "requires_human_decision",
    canGenerateJournalEntry: false,
    canBeInitiatedByEmail: false,
    canBeInitiatedByPulse: false,
    canBeFullyAutomated: false,
    requiresReviewerIntervention: true,
    requiresOvernightProcessing: false,
    supportsAdHocRequest: false,
    supportsScheduledExecution: false,
    erpInteractionRequired: false,
    driveOutputRequired: false,
    workpaperRequired: false,
    leadSheetRequired: false,
    supportPackageRequired: false,
    fraudDetectionRequired: false,
    reasonablenessCheckRequired: true,
  },
  process_documentation: {
    capabilityName: "Process Documentation",
    capabilityDescription: "Metadata taxonomy for process documentation, COSO mapping, key controls, and SOX documentation.",
    roleApplicability: ["accounting_manager", "controller_helper", "cfo_helper"],
    taskFamily: "process_documentation",
    subCapabilities: [
      "flowchart_generation",
      "controls_list_generation",
      "coso_component_mapping",
      "coso_principle_mapping",
      "key_control_identification",
      "segregation_of_duties_gap_identification",
      "sox_documentation",
    ],
    inputsRequired: ["process_reference", "control_reference", "methodology_reference"],
    outputType: "process_documentation_package",
    evidenceRequirements: ["process_source_reference", "control_mapping_reference"],
    reviewLevel: "controller",
    materialitySensitivity: "high",
    canGenerateJournalEntry: false,
    canBeInitiatedByEmail: false,
    canBeInitiatedByPulse: false,
    canBeFullyAutomated: false,
    requiresReviewerIntervention: true,
    requiresOvernightProcessing: false,
    supportsAdHocRequest: false,
    supportsScheduledExecution: false,
    erpInteractionRequired: false,
    driveOutputRequired: true,
    workpaperRequired: false,
    leadSheetRequired: false,
    supportPackageRequired: false,
    fraudDetectionRequired: false,
    reasonablenessCheckRequired: true,
  },
  process_intelligence: {
    capabilityName: "Process Intelligence",
    capabilityDescription: "Metadata taxonomy for control and process issue classification, detection, and remediation surfacing.",
    roleApplicability: ["controller_helper", "cfo_helper"],
    taskFamily: "process_intelligence",
    subCapabilities: [
      "control_failure_pattern_detection",
      "process_issue_classification",
      "people_issue_classification",
      "ghost_control_detection",
      "deteriorating_control_detection",
      "suggested_remediation_generation",
    ],
    inputsRequired: ["process_observation_reference", "control_history_reference", "governance_reference"],
    outputType: "process_intelligence_summary",
    evidenceRequirements: ["observation_reference", "pattern_reference", "review_reference"],
    reviewLevel: "cfo",
    materialitySensitivity: "requires_human_decision",
    canGenerateJournalEntry: false,
    canBeInitiatedByEmail: false,
    canBeInitiatedByPulse: false,
    canBeFullyAutomated: false,
    requiresReviewerIntervention: true,
    requiresOvernightProcessing: false,
    supportsAdHocRequest: false,
    supportsScheduledExecution: false,
    erpInteractionRequired: false,
    driveOutputRequired: false,
    workpaperRequired: false,
    leadSheetRequired: false,
    supportPackageRequired: false,
    fraudDetectionRequired: false,
    reasonablenessCheckRequired: true,
  },
  realization_sheet: {
    capabilityName: "Realization Sheet",
    capabilityDescription: "Metadata taxonomy for realization sheet updates, timekeeping source intake, and realization summaries.",
    roleApplicability: ["audit_manager_helper", "partner_helper", "cfo_helper"],
    taskFamily: "realization_sheet",
    subCapabilities: [
      "realization_sheet_update",
      "timekeeping_system_pull",
      "excel_hours_parsing",
      "budget_versus_actual_comparison",
      "realization_variance_flagging",
      "firm_wide_realization_summary",
    ],
    inputsRequired: ["budget_hours_reference", "actual_hours_reference", "engagement_reference"],
    outputType: "realization_sheet_package",
    evidenceRequirements: ["timekeeping_source_reference", "budget_reference", "variance_summary_reference"],
    reviewLevel: "cfo",
    materialitySensitivity: "high",
    canGenerateJournalEntry: false,
    canBeInitiatedByEmail: false,
    canBeInitiatedByPulse: false,
    canBeFullyAutomated: false,
    requiresReviewerIntervention: true,
    requiresOvernightProcessing: false,
    supportsAdHocRequest: false,
    supportsScheduledExecution: false,
    erpInteractionRequired: false,
    driveOutputRequired: true,
    workpaperRequired: true,
    leadSheetRequired: false,
    supportPackageRequired: false,
    fraudDetectionRequired: false,
    reasonablenessCheckRequired: true,
  },
  ad_hoc_request: {
    capabilityName: "Ad-Hoc Request",
    capabilityDescription: "Metadata taxonomy for ad-hoc request classification, checks, decline reason, and routing suggestions.",
    roleApplicability: ALL_ROLE_TYPES,
    taskFamily: "ad_hoc_request",
    subCapabilities: [
      "ad_hoc_request_classification",
      "ad_hoc_capability_check",
      "ad_hoc_restriction_check",
      "ad_hoc_authorization_check",
      "ad_hoc_decline_with_reason",
      "ad_hoc_alternative_role_suggestion",
    ],
    inputsRequired: ["request_content", "requester_reference", "role_restriction_reference"],
    outputType: "ad_hoc_request_classification",
    evidenceRequirements: ["request_reference", "classification_reference", "restriction_check_reference"],
    reviewLevel: "none",
    materialitySensitivity: "medium",
    canGenerateJournalEntry: false,
    canBeInitiatedByEmail: true,
    canBeInitiatedByPulse: true,
    canBeFullyAutomated: false,
    requiresReviewerIntervention: false,
    requiresOvernightProcessing: false,
    supportsAdHocRequest: true,
    supportsScheduledExecution: false,
    erpInteractionRequired: false,
    driveOutputRequired: false,
    workpaperRequired: false,
    leadSheetRequired: false,
    supportPackageRequired: false,
    fraudDetectionRequired: false,
    reasonablenessCheckRequired: false,
  },
  overnight_preparation: {
    capabilityName: "Overnight Preparation",
    capabilityDescription: "Metadata taxonomy for overnight queue execution, morning summaries, and role-specific preparation.",
    roleApplicability: ALL_ROLE_TYPES,
    taskFamily: "overnight_preparation",
    subCapabilities: [
      "overnight_queue_execution",
      "morning_summary_preparation",
      "pulse_queue_processing",
      "controller_overnight_preparation",
      "cfo_overnight_preparation",
      "audit_manager_overnight_preparation",
      "partner_overnight_preparation",
    ],
    inputsRequired: ["overnight_queue_reference", "timing_preference_reference", "output_destination_reference"],
    outputType: "morning_summary_package",
    evidenceRequirements: ["queue_reference", "completed_output_reference", "summary_reference"],
    reviewLevel: "human_required",
    materialitySensitivity: "high",
    canGenerateJournalEntry: false,
    canBeInitiatedByEmail: false,
    canBeInitiatedByPulse: true,
    canBeFullyAutomated: false,
    requiresReviewerIntervention: false,
    requiresOvernightProcessing: true,
    supportsAdHocRequest: false,
    supportsScheduledExecution: true,
    erpInteractionRequired: false,
    driveOutputRequired: true,
    workpaperRequired: false,
    leadSheetRequired: false,
    supportPackageRequired: false,
    fraudDetectionRequired: false,
    reasonablenessCheckRequired: true,
  },
};

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getDefinition(capabilityFamily: SyntheticRoleCapabilityFamily | undefined): RoleCapabilityDefinition | null {
  return capabilityFamily ? ROLE_CAPABILITY_DEFINITIONS[capabilityFamily] ?? null : null;
}

function getBoundPhase38SnapshotHash(input: BuildRoleCapabilityInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildRoleCapabilityInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildRoleCapabilityInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildRoleCapabilityInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildRoleCapabilityInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildRoleCapabilityInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildRoleCapabilityInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildRoleCapabilityInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildRoleCapabilityInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function getRoleApplicability(
  input: BuildRoleCapabilityInput,
  definition: RoleCapabilityDefinition,
): SyntheticRoleType[] {
  return input.roleApplicability ?? definition.roleApplicability;
}

function collectMissingRequiredIdentifiers(
  input: BuildRoleCapabilityInput,
  definition: RoleCapabilityDefinition,
): string[] {
  const missing: string[] = [];

  if (!hasValue(input.capabilityFamily)) {
    missing.push("capabilityFamily");
  }

  if (getRoleApplicability(input, definition).length === 0) {
    missing.push("roleApplicability");
  }

  if (!hasValue(getBoundPhase38SnapshotHash(input))) {
    missing.push("boundPhase38SnapshotHash");
  }

  if (!hasValue(getBoundPhase37SnapshotHash(input))) {
    missing.push("boundPhase37SnapshotHash");
  }

  if (!hasValue(getCompanyId(input))) {
    missing.push("companyId");
  }

  if (!getScope(input)) {
    missing.push("scope");
  }

  if (!getCustomerIsolation(input)) {
    missing.push("customerIsolation");
  }

  if (!getFirmIsolation(input)) {
    missing.push("firmIsolation");
  }

  if (!getClientIsolation(input)) {
    missing.push("clientIsolation");
  }

  return missing;
}

function buildDerivationHash(input: BuildRoleCapabilityInput, definition: RoleCapabilityDefinition): string {
  return stableSnapshotHash({
    capabilityFamily: input.capabilityFamily,
    capabilityName: input.capabilityName ?? definition.capabilityName,
    capabilityDescription: input.capabilityDescription ?? definition.capabilityDescription,
    roleApplicability: getRoleApplicability(input, definition),
    taskFamily: input.taskFamily ?? definition.taskFamily,
    subCapabilities: input.subCapabilities ?? definition.subCapabilities,
    inputsRequired: input.inputsRequired ?? definition.inputsRequired,
    outputType: input.outputType ?? definition.outputType,
    evidenceRequirements: input.evidenceRequirements ?? definition.evidenceRequirements,
    reviewLevel: input.reviewLevel ?? definition.reviewLevel,
    materialitySensitivity: input.materialitySensitivity ?? definition.materialitySensitivity,
    canGenerateJournalEntry: input.canGenerateJournalEntry ?? definition.canGenerateJournalEntry,
    canBeInitiatedByEmail: input.canBeInitiatedByEmail ?? definition.canBeInitiatedByEmail,
    canBeInitiatedByPulse: input.canBeInitiatedByPulse ?? definition.canBeInitiatedByPulse,
    canBeFullyAutomated: input.canBeFullyAutomated ?? definition.canBeFullyAutomated,
    requiresReviewerIntervention: input.requiresReviewerIntervention ?? definition.requiresReviewerIntervention,
    requiresOvernightProcessing: input.requiresOvernightProcessing ?? definition.requiresOvernightProcessing,
    supportsAdHocRequest: input.supportsAdHocRequest ?? definition.supportsAdHocRequest,
    supportsScheduledExecution: input.supportsScheduledExecution ?? definition.supportsScheduledExecution,
    erpInteractionRequired: input.erpInteractionRequired ?? definition.erpInteractionRequired,
    driveOutputRequired: input.driveOutputRequired ?? definition.driveOutputRequired,
    workpaperRequired: input.workpaperRequired ?? definition.workpaperRequired,
    leadSheetRequired: input.leadSheetRequired ?? definition.leadSheetRequired,
    supportPackageRequired: input.supportPackageRequired ?? definition.supportPackageRequired,
    fraudDetectionRequired: input.fraudDetectionRequired ?? definition.fraudDetectionRequired,
    reasonablenessCheckRequired: input.reasonablenessCheckRequired ?? definition.reasonablenessCheckRequired,
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildRoleCapability(input: BuildRoleCapabilityInput): BuildRoleCapabilityResult {
  const warnings = [...getInputArray(input.warnings)];
  const definition = getDefinition(input.capabilityFamily);

  if (!input.capabilityFamily || !definition) {
    return {
      roleCapability: null,
      skipped: true,
      warnings: [...warnings, "missing capabilityFamily or unsupported capabilityFamily"],
    };
  }

  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input, definition);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      roleCapability: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const capabilityFamily = input.capabilityFamily;
  const roleApplicability = getRoleApplicability(input, definition);
  const boundPhase38SnapshotHash = getBoundPhase38SnapshotHash(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);
  const companyId = getCompanyId(input);
  const scope = getScope(input);
  const customerIsolation = getCustomerIsolation(input);
  const firmIsolation = getFirmIsolation(input);
  const clientIsolation = getClientIsolation(input);
  const derivationHash = buildDerivationHash(input, definition);
  const capabilityKey = stableSnapshotHash({
    capabilityFamily,
    companyId,
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const capabilityId = stableSnapshotHash({
    capabilityKey,
    artifactType: "SyntheticRoleCapability",
  });

  return {
    roleCapability: {
      capabilityId,
      capabilityKey,
      capabilityFamily,
      capabilityName: input.capabilityName ?? definition.capabilityName,
      capabilityDescription: input.capabilityDescription ?? definition.capabilityDescription,
      roleApplicability,
      taskFamily: input.taskFamily ?? definition.taskFamily,
      subCapabilities: input.subCapabilities ?? definition.subCapabilities,
      inputsRequired: input.inputsRequired ?? definition.inputsRequired,
      outputType: input.outputType ?? definition.outputType,
      evidenceRequirements: input.evidenceRequirements ?? definition.evidenceRequirements,
      reviewLevel: input.reviewLevel ?? definition.reviewLevel,
      materialitySensitivity: input.materialitySensitivity ?? definition.materialitySensitivity,
      canGenerateJournalEntry: input.canGenerateJournalEntry ?? definition.canGenerateJournalEntry,
      canBeInitiatedByEmail: input.canBeInitiatedByEmail ?? definition.canBeInitiatedByEmail,
      canBeInitiatedByPulse: input.canBeInitiatedByPulse ?? definition.canBeInitiatedByPulse,
      canBeFullyAutomated: input.canBeFullyAutomated ?? definition.canBeFullyAutomated,
      requiresReviewerIntervention: input.requiresReviewerIntervention ?? definition.requiresReviewerIntervention,
      requiresOvernightProcessing: input.requiresOvernightProcessing ?? definition.requiresOvernightProcessing,
      supportsAdHocRequest: input.supportsAdHocRequest ?? definition.supportsAdHocRequest,
      supportsScheduledExecution: input.supportsScheduledExecution ?? definition.supportsScheduledExecution,
      erpInteractionRequired: input.erpInteractionRequired ?? definition.erpInteractionRequired,
      driveOutputRequired: input.driveOutputRequired ?? definition.driveOutputRequired,
      workpaperRequired: input.workpaperRequired ?? definition.workpaperRequired,
      leadSheetRequired: input.leadSheetRequired ?? definition.leadSheetRequired,
      supportPackageRequired: input.supportPackageRequired ?? definition.supportPackageRequired,
      fraudDetectionRequired: input.fraudDetectionRequired ?? definition.fraudDetectionRequired,
      reasonablenessCheckRequired: input.reasonablenessCheckRequired ?? definition.reasonablenessCheckRequired,
      boundPhase38SnapshotHash,
      boundPhase37SnapshotHash,
      phase39StaleMarker: getPhase39StaleMarker(input),
      executable: false,
      executionReady: input.executionReady === true,
      companyId,
      scope: scope as SyntheticAuditScope,
      customerIsolation: customerIsolation as SyntheticMemoryObjectIsolationDimension,
      firmIsolation: firmIsolation as SyntheticMemoryObjectIsolationDimension,
      clientIsolation: clientIsolation as SyntheticMemoryObjectIsolationDimension,
      derivationLineageIds: getInputArray(input.derivationLineageIds),
      derivationMethod: getDerivationMethod(input),
      derivationHash,
      confidenceFloorMetadata: getInputArray(input.confidenceFloorMetadata),
      sourceConfidenceReferenceIds: getInputArray(input.sourceConfidenceReferenceIds),
      evidenceReferenceIds: getInputArray(input.evidenceReferenceIds),
      lineageReferenceIds: getInputArray(input.lineageReferenceIds),
      trustMetadata: getInputArray(input.trustMetadata),
      confidenceMetadata: getInputArray(input.confidenceMetadata),
      governanceMetadata: getInputArray(input.governanceMetadata),
      materialityMetadata: getInputArray(input.materialityMetadata),
      warnings,
      skippedIndexes: getInputArray(input.skippedIndexes),
    },
    skipped: false,
    warnings,
  };
}
