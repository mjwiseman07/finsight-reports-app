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

export type SyntheticAuditManagerHelperAssignedCapability =
  | "staff_auditor_workpaper_review"
  | "review_note_preparation"
  | "insufficient_evidence_flagging"
  | "review_status_summary_preparation"
  | "audit_program_tracker_update"
  | "audit_status_update_preparation"
  | "time_budget_actual_update"
  | "open_items_list_preparation"
  | "pbc_follow_up_drafting_for_review"
  | "fieldwork_summary_assembly"
  | "exception_summary_preparation"
  | "issues_memo_drafting"
  | "client_communication_drafting_for_review"
  | "realization_sheet_update";

export type SyntheticAuditManagerHelperTimekeepingSourceType =
  | "system_pull"
  | "excel_upload"
  | "csv_export";

export interface BuildAuditManagerHelperRoleInput {
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
  assignedCapabilities?: SyntheticAuditManagerHelperAssignedCapability[];
  timekeepingSourceTypes?: SyntheticAuditManagerHelperTimekeepingSourceType[];
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

export interface SyntheticAuditManagerHelperRole {
  auditManagerHelperRoleId: string;
  auditManagerHelperRoleKey: string;
  roleType: "audit_manager_helper";
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
  assignedCapabilities: SyntheticAuditManagerHelperAssignedCapability[];
  canGenerateJournalEntry: false;
  canReviewStaffAuditorWorkpapers: true;
  canPrepareReviewNotes: true;
  canFlagInsufficientEvidence: true;
  canPrepareReviewStatusSummaries: true;
  canUpdateAuditProgramTracker: true;
  canPrepareAuditStatusUpdates: true;
  canUpdateTimeBudgetVersusActual: true;
  canPrepareOpenItemsList: true;
  canDraftPbcFollowUpForReview: true;
  canAssembleFieldworkSummary: true;
  canSummarizeExceptions: true;
  canDraftIssuesMemo: true;
  canDraftClientCommunicationForReview: true;
  canUpdateRealizationSheet: true;
  realizationSheetSupported: true;
  timekeepingSourceSupported: true;
  timekeepingSourceTypes: SyntheticAuditManagerHelperTimekeepingSourceType[];
  canFinalizeWorkpaperReviewSignOff: false;
  canCommunicateWithClientsWithoutApproval: false;
  canMakeMaterialityOrScopeDecisions: false;
  canConcludeOnAuditAreas: false;
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
  escalationTargetRoleType: "human_audit_manager";
  requiresWorkpaperOnEveryOutput: true;
  allOutputsArePreparationAndDraftingOnly: true;
  auditManagerReviewsEditsApproves: true;
  commercialPositioningNote: string;
  roleCompositionComplete: boolean;
  isNotReplacementForHuman: true;
  humanAuditManagerReviewsAndDecides: true;
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

export interface BuildAuditManagerHelperRoleResult {
  auditManagerHelperRole: SyntheticAuditManagerHelperRole | null;
  skipped: boolean;
  warnings: string[];
}

export const AUDIT_MANAGER_HELPER_ASSIGNED_CAPABILITIES: SyntheticAuditManagerHelperAssignedCapability[] = [
  "staff_auditor_workpaper_review",
  "review_note_preparation",
  "insufficient_evidence_flagging",
  "review_status_summary_preparation",
  "audit_program_tracker_update",
  "audit_status_update_preparation",
  "time_budget_actual_update",
  "open_items_list_preparation",
  "pbc_follow_up_drafting_for_review",
  "fieldwork_summary_assembly",
  "exception_summary_preparation",
  "issues_memo_drafting",
  "client_communication_drafting_for_review",
  "realization_sheet_update",
];

export const AUDIT_MANAGER_HELPER_TIMEKEEPING_SOURCE_TYPES: SyntheticAuditManagerHelperTimekeepingSourceType[] = [
  "system_pull",
  "excel_upload",
  "csv_export",
];

export const AUDIT_MANAGER_HELPER_COMMERCIAL_POSITIONING_NOTE =
  "Your kids game is at 6pm. Your workpapers will be reviewed by morning. We work the night shift so you do not have to.";

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getBoundPhase38SnapshotHash(input: BuildAuditManagerHelperRoleInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildAuditManagerHelperRoleInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildAuditManagerHelperRoleInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildAuditManagerHelperRoleInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildAuditManagerHelperRoleInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildAuditManagerHelperRoleInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildAuditManagerHelperRoleInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildAuditManagerHelperRoleInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildAuditManagerHelperRoleInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function getAssignedCapabilities(input: BuildAuditManagerHelperRoleInput): SyntheticAuditManagerHelperAssignedCapability[] {
  return input.assignedCapabilities ?? AUDIT_MANAGER_HELPER_ASSIGNED_CAPABILITIES;
}

function getTimekeepingSourceTypes(input: BuildAuditManagerHelperRoleInput): SyntheticAuditManagerHelperTimekeepingSourceType[] {
  return input.timekeepingSourceTypes ?? AUDIT_MANAGER_HELPER_TIMEKEEPING_SOURCE_TYPES;
}

function getCommercialPositioningNote(input: BuildAuditManagerHelperRoleInput): string {
  return input.commercialPositioningNote ?? AUDIT_MANAGER_HELPER_COMMERCIAL_POSITIONING_NOTE;
}

function getRoleCompositionComplete(input: BuildAuditManagerHelperRoleInput): boolean {
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

function collectMissingRequiredIdentifiers(input: BuildAuditManagerHelperRoleInput): string[] {
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

function buildDerivationHash(input: BuildAuditManagerHelperRoleInput): string {
  return stableSnapshotHash({
    roleType: "audit_manager_helper",
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
    canReviewStaffAuditorWorkpapers: true,
    canPrepareReviewNotes: true,
    canFlagInsufficientEvidence: true,
    canPrepareReviewStatusSummaries: true,
    canUpdateAuditProgramTracker: true,
    canPrepareAuditStatusUpdates: true,
    canUpdateTimeBudgetVersusActual: true,
    canPrepareOpenItemsList: true,
    canDraftPbcFollowUpForReview: true,
    canAssembleFieldworkSummary: true,
    canSummarizeExceptions: true,
    canDraftIssuesMemo: true,
    canDraftClientCommunicationForReview: true,
    canUpdateRealizationSheet: true,
    realizationSheetSupported: true,
    timekeepingSourceSupported: true,
    timekeepingSourceTypes: getTimekeepingSourceTypes(input),
    canFinalizeWorkpaperReviewSignOff: false,
    canCommunicateWithClientsWithoutApproval: false,
    canMakeMaterialityOrScopeDecisions: false,
    canConcludeOnAuditAreas: false,
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
    escalationTargetRoleType: "human_audit_manager",
    requiresWorkpaperOnEveryOutput: true,
    allOutputsArePreparationAndDraftingOnly: true,
    auditManagerReviewsEditsApproves: true,
    commercialPositioningNote: getCommercialPositioningNote(input),
    roleCompositionComplete: getRoleCompositionComplete(input),
    isNotReplacementForHuman: true,
    humanAuditManagerReviewsAndDecides: true,
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildAuditManagerHelperRole(input: BuildAuditManagerHelperRoleInput): BuildAuditManagerHelperRoleResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      auditManagerHelperRole: null,
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
  const auditManagerHelperRoleKey = stableSnapshotHash({
    roleType: "audit_manager_helper",
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
  const auditManagerHelperRoleId = stableSnapshotHash({
    auditManagerHelperRoleKey,
    artifactType: "SyntheticAuditManagerHelperRole",
  });

  return {
    auditManagerHelperRole: {
      auditManagerHelperRoleId,
      auditManagerHelperRoleKey,
      roleType: "audit_manager_helper",
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
      canReviewStaffAuditorWorkpapers: true,
      canPrepareReviewNotes: true,
      canFlagInsufficientEvidence: true,
      canPrepareReviewStatusSummaries: true,
      canUpdateAuditProgramTracker: true,
      canPrepareAuditStatusUpdates: true,
      canUpdateTimeBudgetVersusActual: true,
      canPrepareOpenItemsList: true,
      canDraftPbcFollowUpForReview: true,
      canAssembleFieldworkSummary: true,
      canSummarizeExceptions: true,
      canDraftIssuesMemo: true,
      canDraftClientCommunicationForReview: true,
      canUpdateRealizationSheet: true,
      realizationSheetSupported: true,
      timekeepingSourceSupported: true,
      timekeepingSourceTypes: getTimekeepingSourceTypes(input),
      canFinalizeWorkpaperReviewSignOff: false,
      canCommunicateWithClientsWithoutApproval: false,
      canMakeMaterialityOrScopeDecisions: false,
      canConcludeOnAuditAreas: false,
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
      escalationTargetRoleType: "human_audit_manager",
      requiresWorkpaperOnEveryOutput: true,
      allOutputsArePreparationAndDraftingOnly: true,
      auditManagerReviewsEditsApproves: true,
      commercialPositioningNote: getCommercialPositioningNote(input),
      roleCompositionComplete,
      isNotReplacementForHuman: true,
      humanAuditManagerReviewsAndDecides: true,
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
