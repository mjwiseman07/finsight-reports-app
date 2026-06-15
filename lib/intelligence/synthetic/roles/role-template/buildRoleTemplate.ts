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
import type { SyntheticAdHocRequestIntakeType, SyntheticRoleType } from "../contracts";

export type SyntheticRoleTemplateOutputType =
  | "reconciliation_package"
  | "draft_journal_entry"
  | "workpaper"
  | "audit_support_package"
  | "exception_report"
  | "schedule"
  | "reviewed_reconciliation"
  | "revenue_memo"
  | "flux_analysis"
  | "controller_summary"
  | "reviewed_journal_entry_package"
  | "close_status_summary"
  | "management_summary"
  | "exception_escalation_memo"
  | "reviewed_package"
  | "controller_review_package"
  | "flux_analysis_draft"
  | "exception_flagging_report"
  | "morning_summary"
  | "board_package_draft"
  | "investor_summary"
  | "kpi_dashboard_update"
  | "variance_analysis"
  | "covenant_compliance_summary"
  | "audit_workpaper"
  | "evidence_package"
  | "exception_summary"
  | "testing_documentation"
  | "pbc_status_update"
  | "reviewed_workpaper"
  | "audit_review_notes"
  | "escalation_memo"
  | "workpaper_review_notes"
  | "audit_status_update"
  | "fieldwork_summary"
  | "issues_memo_draft"
  | "partner_review_notes"
  | "engagement_status_memo"
  | "quality_control_package"
  | "management_letter_draft"
  | "realization_sheet_update"
  | "firm_wide_realization_summary";

export type SyntheticRoleTemplateRealizationSheetDeliveryMethod =
  | "drive_placement"
  | "email"
  | "both"
  | "not_applicable";

export type SyntheticRoleTemplateTimekeepingSourceType =
  | "system_pull"
  | "excel_upload"
  | "csv_export"
  | "not_applicable";

const AD_HOC_REQUEST_SUPPORTED = true;
const AD_HOC_REQUEST_INTAKE_TYPES: SyntheticAdHocRequestIntakeType = "both";

interface RoleTemplateDefinition {
  roleTemplateName: string;
  roleTemplateDescription: string;
  canGenerateJournalEntry: boolean;
  canBeInitiatedByEmail: boolean;
  canSubmitToERP: boolean;
  clientEmailEnabled: boolean;
  scheduledDocumentCheckingEnabled: boolean;
  overnightSchedulingSupported: boolean;
  pulseQueueSupported: boolean;
  driveOutputSupported: boolean;
  realizationSheetSupported: boolean;
  realizationSheetDeliveryMethod: SyntheticRoleTemplateRealizationSheetDeliveryMethod;
  timekeepingSourceSupported: boolean;
  timekeepingSourceTypes: SyntheticRoleTemplateTimekeepingSourceType[];
  defaultOutputTypes: SyntheticRoleTemplateOutputType[];
  defaultReviewLevel: string;
}

export interface BuildRoleTemplateInput {
  roleType?: SyntheticRoleType;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  roleTemplateName?: string;
  roleTemplateDescription?: string;
  defaultCapabilityIds?: string[];
  defaultRestrictionIds?: string[];
  defaultApprovalPolicyIds?: string[];
  defaultGovernanceModelIds?: string[];
  defaultOutputTypes?: SyntheticRoleTemplateOutputType[];
  defaultEvidenceRequirements?: string[];
  defaultMaterialityThresholdReferenceIds?: string[];
  defaultEscalationRules?: string[];
  defaultReviewLevel?: string;
  canGenerateJournalEntry?: boolean;
  canBeInitiatedByEmail?: boolean;
  canSubmitToERP?: boolean;
  clientEmailEnabled?: boolean;
  scheduledDocumentCheckingEnabled?: boolean;
  overnightSchedulingSupported?: boolean;
  pulseQueueSupported?: boolean;
  driveOutputSupported?: boolean;
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

export interface SyntheticRoleTemplate {
  roleTemplateId: string;
  roleTemplateKey: string;
  roleType: SyntheticRoleType;
  roleTemplateName: string;
  roleTemplateDescription: string;
  defaultCapabilityIds: string[];
  defaultRestrictionIds: string[];
  defaultApprovalPolicyIds: string[];
  defaultGovernanceModelIds: string[];
  defaultOutputTypes: SyntheticRoleTemplateOutputType[];
  defaultEvidenceRequirements: string[];
  defaultMaterialityThresholdReferenceIds: string[];
  defaultEscalationRules: string[];
  defaultReviewLevel: string;
  canGenerateJournalEntry: boolean;
  canBeInitiatedByEmail: boolean;
  canSubmitToERP: boolean;
  canPostDirectly: boolean;
  clientEmailEnabled: boolean;
  clientEmailDefaultOff: true;
  scheduledDocumentCheckingEnabled: boolean;
  scheduledCheckingDefaultOff: true;
  selfApprovalProhibited: true;
  auditOpinionProhibited: true;
  reviewerSignOffProhibited: true;
  approverSignOffProhibited: true;
  overnightSchedulingSupported: boolean;
  pulseQueueSupported: boolean;
  driveOutputSupported: boolean;
  adHocRequestSupported: true;
  adHocRequestIntakeTypes: SyntheticAdHocRequestIntakeType;
  realizationSheetSupported: boolean;
  realizationSheetDeliveryMethod: SyntheticRoleTemplateRealizationSheetDeliveryMethod;
  timekeepingSourceSupported: boolean;
  timekeepingSourceTypes: SyntheticRoleTemplateTimekeepingSourceType[];
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

export interface BuildRoleTemplateResult {
  roleTemplate: SyntheticRoleTemplate | null;
  skipped: boolean;
  warnings: string[];
}

const ROLE_TEMPLATE_DEFINITIONS: Record<SyntheticRoleType, RoleTemplateDefinition> = {
  staff_accountant: {
    roleTemplateName: "AI Staff Accountant",
    roleTemplateDescription: "Metadata template for staff accountant preparation, support, and exception workflows.",
    canGenerateJournalEntry: true,
    canBeInitiatedByEmail: true,
    canSubmitToERP: false,
    clientEmailEnabled: true,
    scheduledDocumentCheckingEnabled: true,
    overnightSchedulingSupported: true,
    pulseQueueSupported: true,
    driveOutputSupported: true,
    realizationSheetSupported: false,
    realizationSheetDeliveryMethod: "not_applicable",
    timekeepingSourceSupported: false,
    timekeepingSourceTypes: ["not_applicable"],
    defaultOutputTypes: [
      "reconciliation_package",
      "draft_journal_entry",
      "workpaper",
      "audit_support_package",
      "exception_report",
      "schedule",
    ],
    defaultReviewLevel: "preparer_review",
  },
  senior_accountant: {
    roleTemplateName: "AI Senior Accountant",
    roleTemplateDescription: "Metadata template for senior accountant review, analysis, and package preparation workflows.",
    canGenerateJournalEntry: true,
    canBeInitiatedByEmail: true,
    canSubmitToERP: false,
    clientEmailEnabled: true,
    scheduledDocumentCheckingEnabled: true,
    overnightSchedulingSupported: true,
    pulseQueueSupported: true,
    driveOutputSupported: true,
    realizationSheetSupported: false,
    realizationSheetDeliveryMethod: "not_applicable",
    timekeepingSourceSupported: false,
    timekeepingSourceTypes: ["not_applicable"],
    defaultOutputTypes: [
      "reviewed_reconciliation",
      "revenue_memo",
      "flux_analysis",
      "controller_summary",
      "reviewed_journal_entry_package",
    ],
    defaultReviewLevel: "senior_review",
  },
  accounting_manager: {
    roleTemplateName: "AI Accounting Manager",
    roleTemplateDescription: "Metadata template for accounting manager oversight, escalation, and close monitoring workflows.",
    canGenerateJournalEntry: false,
    canBeInitiatedByEmail: true,
    canSubmitToERP: false,
    clientEmailEnabled: true,
    scheduledDocumentCheckingEnabled: true,
    overnightSchedulingSupported: true,
    pulseQueueSupported: true,
    driveOutputSupported: true,
    realizationSheetSupported: false,
    realizationSheetDeliveryMethod: "not_applicable",
    timekeepingSourceSupported: false,
    timekeepingSourceTypes: ["not_applicable"],
    defaultOutputTypes: [
      "close_status_summary",
      "management_summary",
      "exception_escalation_memo",
      "reviewed_package",
    ],
    defaultReviewLevel: "manager_review",
  },
  controller_helper: {
    roleTemplateName: "AI Controller Helper",
    roleTemplateDescription: "Metadata template for controller-level review support, close visibility, and exception surfacing.",
    canGenerateJournalEntry: false,
    canBeInitiatedByEmail: true,
    canSubmitToERP: false,
    clientEmailEnabled: true,
    scheduledDocumentCheckingEnabled: true,
    overnightSchedulingSupported: true,
    pulseQueueSupported: true,
    driveOutputSupported: true,
    realizationSheetSupported: false,
    realizationSheetDeliveryMethod: "not_applicable",
    timekeepingSourceSupported: false,
    timekeepingSourceTypes: ["not_applicable"],
    defaultOutputTypes: [
      "controller_review_package",
      "flux_analysis_draft",
      "close_status_summary",
      "exception_flagging_report",
      "morning_summary",
    ],
    defaultReviewLevel: "controller_review",
  },
  cfo_helper: {
    roleTemplateName: "AI CFO Helper",
    roleTemplateDescription: "Metadata template for CFO briefing, executive summary, KPI, variance, and covenant support.",
    canGenerateJournalEntry: false,
    canBeInitiatedByEmail: true,
    canSubmitToERP: false,
    clientEmailEnabled: true,
    scheduledDocumentCheckingEnabled: true,
    overnightSchedulingSupported: true,
    pulseQueueSupported: true,
    driveOutputSupported: true,
    realizationSheetSupported: true,
    realizationSheetDeliveryMethod: "drive_placement",
    timekeepingSourceSupported: false,
    timekeepingSourceTypes: ["not_applicable"],
    defaultOutputTypes: [
      "board_package_draft",
      "investor_summary",
      "kpi_dashboard_update",
      "variance_analysis",
      "covenant_compliance_summary",
      "morning_summary",
      "firm_wide_realization_summary",
    ],
    defaultReviewLevel: "executive_review",
  },
  staff_auditor: {
    roleTemplateName: "AI Staff Auditor",
    roleTemplateDescription: "Metadata template for staff auditor evidence, testing, workpaper, and PBC support workflows.",
    canGenerateJournalEntry: false,
    canBeInitiatedByEmail: true,
    canSubmitToERP: false,
    clientEmailEnabled: false,
    scheduledDocumentCheckingEnabled: true,
    overnightSchedulingSupported: true,
    pulseQueueSupported: true,
    driveOutputSupported: true,
    realizationSheetSupported: false,
    realizationSheetDeliveryMethod: "not_applicable",
    timekeepingSourceSupported: false,
    timekeepingSourceTypes: ["not_applicable"],
    defaultOutputTypes: [
      "audit_workpaper",
      "evidence_package",
      "exception_summary",
      "testing_documentation",
      "pbc_status_update",
    ],
    defaultReviewLevel: "audit_preparer_review",
  },
  senior_auditor: {
    roleTemplateName: "AI Senior Auditor",
    roleTemplateDescription: "Metadata template for senior auditor review, notes, and escalation workflows.",
    canGenerateJournalEntry: false,
    canBeInitiatedByEmail: true,
    canSubmitToERP: false,
    clientEmailEnabled: false,
    scheduledDocumentCheckingEnabled: true,
    overnightSchedulingSupported: true,
    pulseQueueSupported: true,
    driveOutputSupported: true,
    realizationSheetSupported: false,
    realizationSheetDeliveryMethod: "not_applicable",
    timekeepingSourceSupported: false,
    timekeepingSourceTypes: ["not_applicable"],
    defaultOutputTypes: ["reviewed_workpaper", "audit_review_notes", "escalation_memo"],
    defaultReviewLevel: "audit_senior_review",
  },
  audit_manager_helper: {
    roleTemplateName: "AI Audit Manager Helper",
    roleTemplateDescription: "Metadata template for audit manager review support, fieldwork status, and issue surfacing.",
    canGenerateJournalEntry: false,
    canBeInitiatedByEmail: true,
    canSubmitToERP: false,
    clientEmailEnabled: false,
    scheduledDocumentCheckingEnabled: true,
    overnightSchedulingSupported: true,
    pulseQueueSupported: true,
    driveOutputSupported: true,
    realizationSheetSupported: true,
    realizationSheetDeliveryMethod: "both",
    timekeepingSourceSupported: true,
    timekeepingSourceTypes: ["system_pull", "excel_upload", "csv_export"],
    defaultOutputTypes: [
      "workpaper_review_notes",
      "audit_status_update",
      "fieldwork_summary",
      "issues_memo_draft",
      "morning_summary",
      "realization_sheet_update",
    ],
    defaultReviewLevel: "audit_manager_review",
  },
  partner_helper: {
    roleTemplateName: "AI Partner Helper",
    roleTemplateDescription: "Metadata template for partner review support, engagement status, quality control, and letter drafting.",
    canGenerateJournalEntry: false,
    canBeInitiatedByEmail: true,
    canSubmitToERP: false,
    clientEmailEnabled: false,
    scheduledDocumentCheckingEnabled: true,
    overnightSchedulingSupported: true,
    pulseQueueSupported: true,
    driveOutputSupported: true,
    realizationSheetSupported: true,
    realizationSheetDeliveryMethod: "both",
    timekeepingSourceSupported: true,
    timekeepingSourceTypes: ["system_pull", "excel_upload", "csv_export"],
    defaultOutputTypes: [
      "partner_review_notes",
      "engagement_status_memo",
      "quality_control_package",
      "management_letter_draft",
      "morning_summary",
      "realization_sheet_update",
      "firm_wide_realization_summary",
    ],
    defaultReviewLevel: "partner_review",
  },
};

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getDefinition(roleType: SyntheticRoleType | undefined): RoleTemplateDefinition | null {
  return roleType ? ROLE_TEMPLATE_DEFINITIONS[roleType] ?? null : null;
}

function getBoundPhase38SnapshotHash(input: BuildRoleTemplateInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildRoleTemplateInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildRoleTemplateInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildRoleTemplateInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildRoleTemplateInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildRoleTemplateInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildRoleTemplateInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildRoleTemplateInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildRoleTemplateInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function collectMissingRequiredIdentifiers(input: BuildRoleTemplateInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.roleType)) {
    missing.push("roleType");
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

function buildDerivationHash(input: BuildRoleTemplateInput, definition: RoleTemplateDefinition): string {
  return stableSnapshotHash({
    roleType: input.roleType,
    roleTemplateName: input.roleTemplateName ?? definition.roleTemplateName,
    roleTemplateDescription: input.roleTemplateDescription ?? definition.roleTemplateDescription,
    defaultCapabilityIds: getInputArray(input.defaultCapabilityIds),
    defaultRestrictionIds: getInputArray(input.defaultRestrictionIds),
    defaultApprovalPolicyIds: getInputArray(input.defaultApprovalPolicyIds),
    defaultGovernanceModelIds: getInputArray(input.defaultGovernanceModelIds),
    defaultOutputTypes: input.defaultOutputTypes ?? definition.defaultOutputTypes,
    defaultEvidenceRequirements: getInputArray(input.defaultEvidenceRequirements),
    defaultMaterialityThresholdReferenceIds: getInputArray(input.defaultMaterialityThresholdReferenceIds),
    defaultEscalationRules: getInputArray(input.defaultEscalationRules),
    defaultReviewLevel: input.defaultReviewLevel ?? definition.defaultReviewLevel,
    adHocRequestSupported: AD_HOC_REQUEST_SUPPORTED,
    adHocRequestIntakeTypes: AD_HOC_REQUEST_INTAKE_TYPES,
    realizationSheetSupported: definition.realizationSheetSupported,
    realizationSheetDeliveryMethod: definition.realizationSheetDeliveryMethod,
    timekeepingSourceSupported: definition.timekeepingSourceSupported,
    timekeepingSourceTypes: definition.timekeepingSourceTypes,
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildRoleTemplate(input: BuildRoleTemplateInput): BuildRoleTemplateResult {
  const warnings = [...getInputArray(input.warnings)];
  const definition = getDefinition(input.roleType);

  if (!input.roleType || !definition) {
    return {
      roleTemplate: null,
      skipped: true,
      warnings: [...warnings, "missing roleType or unsupported roleType"],
    };
  }

  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      roleTemplate: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const roleType = input.roleType;
  const boundPhase38SnapshotHash = getBoundPhase38SnapshotHash(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);
  const companyId = getCompanyId(input);
  const scope = getScope(input);
  const customerIsolation = getCustomerIsolation(input);
  const firmIsolation = getFirmIsolation(input);
  const clientIsolation = getClientIsolation(input);
  const derivationHash = buildDerivationHash(input, definition);
  const roleTemplateKey = stableSnapshotHash({
    roleType,
    companyId,
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const roleTemplateId = stableSnapshotHash({
    roleTemplateKey,
    artifactType: "SyntheticRoleTemplate",
  });

  return {
    roleTemplate: {
      roleTemplateId,
      roleTemplateKey,
      roleType,
      roleTemplateName: input.roleTemplateName ?? definition.roleTemplateName,
      roleTemplateDescription: input.roleTemplateDescription ?? definition.roleTemplateDescription,
      defaultCapabilityIds: getInputArray(input.defaultCapabilityIds),
      defaultRestrictionIds: getInputArray(input.defaultRestrictionIds),
      defaultApprovalPolicyIds: getInputArray(input.defaultApprovalPolicyIds),
      defaultGovernanceModelIds: getInputArray(input.defaultGovernanceModelIds),
      defaultOutputTypes: input.defaultOutputTypes ?? definition.defaultOutputTypes,
      defaultEvidenceRequirements: getInputArray(input.defaultEvidenceRequirements),
      defaultMaterialityThresholdReferenceIds: getInputArray(input.defaultMaterialityThresholdReferenceIds),
      defaultEscalationRules: getInputArray(input.defaultEscalationRules),
      defaultReviewLevel: input.defaultReviewLevel ?? definition.defaultReviewLevel,
      canGenerateJournalEntry: input.canGenerateJournalEntry ?? definition.canGenerateJournalEntry,
      canBeInitiatedByEmail: input.canBeInitiatedByEmail ?? definition.canBeInitiatedByEmail,
      canSubmitToERP: input.canSubmitToERP ?? definition.canSubmitToERP,
      canPostDirectly: false,
      clientEmailEnabled: input.clientEmailEnabled ?? definition.clientEmailEnabled,
      clientEmailDefaultOff: true,
      scheduledDocumentCheckingEnabled:
        input.scheduledDocumentCheckingEnabled ?? definition.scheduledDocumentCheckingEnabled,
      scheduledCheckingDefaultOff: true,
      selfApprovalProhibited: true,
      auditOpinionProhibited: true,
      reviewerSignOffProhibited: true,
      approverSignOffProhibited: true,
      overnightSchedulingSupported: input.overnightSchedulingSupported ?? definition.overnightSchedulingSupported,
      pulseQueueSupported: input.pulseQueueSupported ?? definition.pulseQueueSupported,
      driveOutputSupported: input.driveOutputSupported ?? definition.driveOutputSupported,
      adHocRequestSupported: AD_HOC_REQUEST_SUPPORTED,
      adHocRequestIntakeTypes: AD_HOC_REQUEST_INTAKE_TYPES,
      realizationSheetSupported: definition.realizationSheetSupported,
      realizationSheetDeliveryMethod: definition.realizationSheetDeliveryMethod,
      timekeepingSourceSupported: definition.timekeepingSourceSupported,
      timekeepingSourceTypes: definition.timekeepingSourceTypes,
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
