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

export type SyntheticPartnerHelperAssignedCapability =
  | "audit_manager_summary_review"
  | "partner_review_note_preparation"
  | "engagement_status_memo_drafting"
  | "quality_control_package_preparation"
  | "risk_assessment_update"
  | "fee_analysis_preparation"
  | "client_relationship_summary_preparation"
  | "management_letter_point_drafting"
  | "engagement_completion_checklist_preparation"
  | "financial_statement_consistency_review"
  | "financial_statement_inconsistency_flagging"
  | "financial_statement_review_summary_preparation"
  | "firm_wide_realization_summary_preparation";

export interface BuildPartnerHelperRoleInput {
  roleInstanceId?: string;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  roleTemplateReferenceId?: string;
  capabilityReferenceIds?: string[];
  restrictionReferenceId?: string;
  governanceReferenceId?: string;
  approvalPolicyReferenceId?: string;
  auditLogReferenceId?: string;
  onboardingSessionReferenceId?: string;
  roleActivationReferenceId?: string;
  taskQueueReferenceId?: string;
  overnightScheduleReferenceId?: string;
  emailIntakeReferenceId?: string;
  pulseQueueReferenceId?: string;
  driveOutputReferenceId?: string;
  folderMappingReferenceId?: string;
  realizationSheetReferenceId?: string;
  assignedCapabilities?: SyntheticPartnerHelperAssignedCapability[];
  commercialPositioningNote?: string;
  roleCompositionComplete?: boolean;
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

export interface SyntheticPartnerHelperRole {
  partnerHelperRoleId: string;
  partnerHelperRoleKey: string;
  roleType: "partner_helper";
  roleInstanceId: string;
  roleTemplateReferenceId: string;
  capabilityReferenceIds: string[];
  restrictionReferenceId: string;
  governanceReferenceId: string;
  approvalPolicyReferenceId: string;
  auditLogReferenceId: string;
  onboardingSessionReferenceId: string;
  roleActivationReferenceId: string;
  taskQueueReferenceId: string;
  overnightScheduleReferenceId: string;
  emailIntakeReferenceId: string;
  pulseQueueReferenceId: string;
  driveOutputReferenceId: string;
  folderMappingReferenceId: string;
  realizationSheetReferenceId: string;
  assignedCapabilities: SyntheticPartnerHelperAssignedCapability[];
  canGenerateJournalEntry: false;
  canReviewAuditManagerSummary: true;
  canPrepareePartnerReviewNotes: true;
  canDraftEngagementStatusMemo: true;
  canPrepareQualityControlPackage: true;
  canUpdateRiskAssessment: true;
  canPrepareFeeAnalysis: true;
  canPrepareClientRelationshipSummary: true;
  canDraftManagementLetterPoints: true;
  canPrepareEngagementCompletionChecklist: true;
  canReviewFinancialStatementsForConsistency: true;
  canFlagFinancialStatementInconsistencies: true;
  canPrepareFinancialStatementReviewSummary: true;
  canPrepareFirmWideRealizationSummary: true;
  realizationSheetSupported: true;
  canSignOffOnAuditOpinion: false;
  canConcludeOnEngagements: false;
  canCommunicateWithClientsAuditCommitteesRegulatorsWithoutApproval: false;
  canMakeIndependenceOrEthicsDeterminations: false;
  canMakeMaterialityConclusions: false;
  canSignOffAsReviewer: false;
  canSignOffAsApprover: false;
  canGenerateAuditOpinion: false;
  clientEmailEnabled: false;
  clientEmailDefaultOff: true;
  canBeInitiatedByEmail: true;
  canBeInitiatedByPulse: true;
  supportsAdHocRequest: true;
  supportsOvernightProcessing: true;
  canPostDirectly: false;
  canSubmitToERP: false;
  canSelfApprove: false;
  canCommunicateExternally: false;
  auditOpinionProhibited: true;
  escalationTargetRoleType: "human_partner";
  requiresWorkpaperOnEveryOutput: true;
  allOutputsArePreparationAndDraftingOnly: true;
  partnerReviewsEditsApproves: true;
  commercialPositioningNote: string;
  roleCompositionComplete: boolean;
  isNotReplacementForHuman: true;
  humanPartnerReviewsAndDecides: true;
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

export interface BuildPartnerHelperRoleResult {
  partnerHelperRole: SyntheticPartnerHelperRole | null;
  skipped: boolean;
  warnings: string[];
}

export const PARTNER_HELPER_ASSIGNED_CAPABILITIES: SyntheticPartnerHelperAssignedCapability[] = [
  "audit_manager_summary_review",
  "partner_review_note_preparation",
  "engagement_status_memo_drafting",
  "quality_control_package_preparation",
  "risk_assessment_update",
  "fee_analysis_preparation",
  "client_relationship_summary_preparation",
  "management_letter_point_drafting",
  "engagement_completion_checklist_preparation",
  "financial_statement_consistency_review",
  "financial_statement_inconsistency_flagging",
  "financial_statement_review_summary_preparation",
  "firm_wide_realization_summary_preparation",
];

export const PARTNER_HELPER_COMMERCIAL_POSITIONING_NOTE =
  "Busy season does not have to mean missing everything. Your AI Partner Helper handles the overnight preparation so you can be present for what matters.";

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getBoundPhase38SnapshotHash(input: BuildPartnerHelperRoleInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildPartnerHelperRoleInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildPartnerHelperRoleInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildPartnerHelperRoleInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildPartnerHelperRoleInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildPartnerHelperRoleInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildPartnerHelperRoleInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildPartnerHelperRoleInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildPartnerHelperRoleInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function getAssignedCapabilities(input: BuildPartnerHelperRoleInput): SyntheticPartnerHelperAssignedCapability[] {
  return input.assignedCapabilities ?? PARTNER_HELPER_ASSIGNED_CAPABILITIES;
}

function getCommercialPositioningNote(input: BuildPartnerHelperRoleInput): string {
  return input.commercialPositioningNote ?? PARTNER_HELPER_COMMERCIAL_POSITIONING_NOTE;
}

function getRoleCompositionComplete(input: BuildPartnerHelperRoleInput): boolean {
  if (input.roleCompositionComplete !== undefined) {
    return input.roleCompositionComplete;
  }

  return (
    hasValue(input.roleInstanceId) &&
    hasValue(input.roleTemplateReferenceId) &&
    hasValue(input.governanceReferenceId) &&
    hasValue(input.restrictionReferenceId) &&
    getInputArray(input.capabilityReferenceIds).length > 0
  );
}

function collectMissingRequiredIdentifiers(input: BuildPartnerHelperRoleInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.roleInstanceId)) {
    missing.push("roleInstanceId");
  }

  if (!hasValue(input.roleTemplateReferenceId)) {
    missing.push("roleTemplateReferenceId");
  }

  if (!hasValue(input.governanceReferenceId)) {
    missing.push("governanceReferenceId");
  }

  if (!hasValue(input.restrictionReferenceId)) {
    missing.push("restrictionReferenceId");
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

function buildDerivationHash(input: BuildPartnerHelperRoleInput): string {
  return stableSnapshotHash({
    roleType: "partner_helper",
    roleInstanceId: input.roleInstanceId,
    roleTemplateReferenceId: input.roleTemplateReferenceId ?? "",
    capabilityReferenceIds: getInputArray(input.capabilityReferenceIds),
    restrictionReferenceId: input.restrictionReferenceId ?? "",
    governanceReferenceId: input.governanceReferenceId ?? "",
    approvalPolicyReferenceId: input.approvalPolicyReferenceId ?? "",
    auditLogReferenceId: input.auditLogReferenceId ?? "",
    onboardingSessionReferenceId: input.onboardingSessionReferenceId ?? "",
    roleActivationReferenceId: input.roleActivationReferenceId ?? "",
    taskQueueReferenceId: input.taskQueueReferenceId ?? "",
    overnightScheduleReferenceId: input.overnightScheduleReferenceId ?? "",
    emailIntakeReferenceId: input.emailIntakeReferenceId ?? "",
    pulseQueueReferenceId: input.pulseQueueReferenceId ?? "",
    driveOutputReferenceId: input.driveOutputReferenceId ?? "",
    folderMappingReferenceId: input.folderMappingReferenceId ?? "",
    realizationSheetReferenceId: input.realizationSheetReferenceId ?? "",
    assignedCapabilities: getAssignedCapabilities(input),
    canGenerateJournalEntry: false,
    canReviewAuditManagerSummary: true,
    canPrepareePartnerReviewNotes: true,
    canDraftEngagementStatusMemo: true,
    canPrepareQualityControlPackage: true,
    canUpdateRiskAssessment: true,
    canPrepareFeeAnalysis: true,
    canPrepareClientRelationshipSummary: true,
    canDraftManagementLetterPoints: true,
    canPrepareEngagementCompletionChecklist: true,
    canReviewFinancialStatementsForConsistency: true,
    canFlagFinancialStatementInconsistencies: true,
    canPrepareFinancialStatementReviewSummary: true,
    canPrepareFirmWideRealizationSummary: true,
    realizationSheetSupported: true,
    canSignOffOnAuditOpinion: false,
    canConcludeOnEngagements: false,
    canCommunicateWithClientsAuditCommitteesRegulatorsWithoutApproval: false,
    canMakeIndependenceOrEthicsDeterminations: false,
    canMakeMaterialityConclusions: false,
    canSignOffAsReviewer: false,
    canSignOffAsApprover: false,
    canGenerateAuditOpinion: false,
    clientEmailEnabled: false,
    clientEmailDefaultOff: true,
    canBeInitiatedByEmail: true,
    canBeInitiatedByPulse: true,
    supportsAdHocRequest: true,
    supportsOvernightProcessing: true,
    canPostDirectly: false,
    canSubmitToERP: false,
    canSelfApprove: false,
    canCommunicateExternally: false,
    auditOpinionProhibited: true,
    escalationTargetRoleType: "human_partner",
    requiresWorkpaperOnEveryOutput: true,
    allOutputsArePreparationAndDraftingOnly: true,
    partnerReviewsEditsApproves: true,
    commercialPositioningNote: getCommercialPositioningNote(input),
    roleCompositionComplete: getRoleCompositionComplete(input),
    isNotReplacementForHuman: true,
    humanPartnerReviewsAndDecides: true,
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildPartnerHelperRole(input: BuildPartnerHelperRoleInput): BuildPartnerHelperRoleResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      partnerHelperRole: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const roleInstanceId = input.roleInstanceId as string;
  const roleTemplateReferenceId = input.roleTemplateReferenceId as string;
  const restrictionReferenceId = input.restrictionReferenceId as string;
  const governanceReferenceId = input.governanceReferenceId as string;
  const boundPhase38SnapshotHash = getBoundPhase38SnapshotHash(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);
  const companyId = getCompanyId(input);
  const scope = getScope(input);
  const customerIsolation = getCustomerIsolation(input);
  const firmIsolation = getFirmIsolation(input);
  const clientIsolation = getClientIsolation(input);
  const roleCompositionComplete = getRoleCompositionComplete(input);
  const derivationHash = buildDerivationHash(input);
  const partnerHelperRoleKey = stableSnapshotHash({
    roleType: "partner_helper",
    roleInstanceId,
    companyId,
    roleTemplateReferenceId,
    restrictionReferenceId,
    governanceReferenceId,
    capabilityReferenceIds: getInputArray(input.capabilityReferenceIds),
    roleCompositionComplete,
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const partnerHelperRoleId = stableSnapshotHash({
    partnerHelperRoleKey,
    artifactType: "SyntheticPartnerHelperRole",
  });

  return {
    partnerHelperRole: {
      partnerHelperRoleId,
      partnerHelperRoleKey,
      roleType: "partner_helper",
      roleInstanceId,
      roleTemplateReferenceId,
      capabilityReferenceIds: getInputArray(input.capabilityReferenceIds),
      restrictionReferenceId,
      governanceReferenceId,
      approvalPolicyReferenceId: input.approvalPolicyReferenceId ?? "",
      auditLogReferenceId: input.auditLogReferenceId ?? "",
      onboardingSessionReferenceId: input.onboardingSessionReferenceId ?? "",
      roleActivationReferenceId: input.roleActivationReferenceId ?? "",
      taskQueueReferenceId: input.taskQueueReferenceId ?? "",
      overnightScheduleReferenceId: input.overnightScheduleReferenceId ?? "",
      emailIntakeReferenceId: input.emailIntakeReferenceId ?? "",
      pulseQueueReferenceId: input.pulseQueueReferenceId ?? "",
      driveOutputReferenceId: input.driveOutputReferenceId ?? "",
      folderMappingReferenceId: input.folderMappingReferenceId ?? "",
      realizationSheetReferenceId: input.realizationSheetReferenceId ?? "",
      assignedCapabilities: getAssignedCapabilities(input),
      canGenerateJournalEntry: false,
      canReviewAuditManagerSummary: true,
      canPrepareePartnerReviewNotes: true,
      canDraftEngagementStatusMemo: true,
      canPrepareQualityControlPackage: true,
      canUpdateRiskAssessment: true,
      canPrepareFeeAnalysis: true,
      canPrepareClientRelationshipSummary: true,
      canDraftManagementLetterPoints: true,
      canPrepareEngagementCompletionChecklist: true,
      canReviewFinancialStatementsForConsistency: true,
      canFlagFinancialStatementInconsistencies: true,
      canPrepareFinancialStatementReviewSummary: true,
      canPrepareFirmWideRealizationSummary: true,
      realizationSheetSupported: true,
      canSignOffOnAuditOpinion: false,
      canConcludeOnEngagements: false,
      canCommunicateWithClientsAuditCommitteesRegulatorsWithoutApproval: false,
      canMakeIndependenceOrEthicsDeterminations: false,
      canMakeMaterialityConclusions: false,
      canSignOffAsReviewer: false,
      canSignOffAsApprover: false,
      canGenerateAuditOpinion: false,
      clientEmailEnabled: false,
      clientEmailDefaultOff: true,
      canBeInitiatedByEmail: true,
      canBeInitiatedByPulse: true,
      supportsAdHocRequest: true,
      supportsOvernightProcessing: true,
      canPostDirectly: false,
      canSubmitToERP: false,
      canSelfApprove: false,
      canCommunicateExternally: false,
      auditOpinionProhibited: true,
      escalationTargetRoleType: "human_partner",
      requiresWorkpaperOnEveryOutput: true,
      allOutputsArePreparationAndDraftingOnly: true,
      partnerReviewsEditsApproves: true,
      commercialPositioningNote: getCommercialPositioningNote(input),
      roleCompositionComplete,
      isNotReplacementForHuman: true,
      humanPartnerReviewsAndDecides: true,
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
