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

export type SyntheticControllerHelperAssignedCapability =
  | "overnight_controller_preparation_queue"
  | "staff_and_senior_exception_review"
  | "flux_analysis_drafting"
  | "close_status_summary_preparation"
  | "reconciliation_exception_flagging"
  | "journal_entry_exception_flagging"
  | "approval_routing_within_policy"
  | "controller_review_package_assembly"
  | "morning_summary_preparation";

export interface BuildControllerHelperRoleInput {
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
  assignedCapabilities?: SyntheticControllerHelperAssignedCapability[];
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

export interface SyntheticControllerHelperRole {
  controllerHelperRoleId: string;
  controllerHelperRoleKey: string;
  roleType: "controller_helper";
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
  assignedCapabilities: SyntheticControllerHelperAssignedCapability[];
  canGenerateJournalEntry: false;
  canReviewStaffAndSeniorOutput: true;
  canDraftFluxAnalysis: true;
  canPrepareCloseStatusSummary: true;
  canReviewReconciliationsWithExceptionFlagging: true;
  canReviewJournalEntriesWithExceptionFlagging: true;
  canRouteApprovalsWithinPolicy: true;
  canAssembleControllerReviewPackage: true;
  canSendMorningSummary: true;
  canBeInitiatedByEmail: true;
  canBeInitiatedByPulse: true;
  supportsAdHocRequest: true;
  supportsOvernightProcessing: true;
  canPostDirectly: false;
  canSubmitToERP: false;
  canSelfApprove: false;
  canMakeFinalDecisionOnMaterialItems: false;
  canApproveAboveMaterialityWithoutHumanConfirmation: false;
  canOverrideFraudDetection: false;
  canOverrideReasonablenessCheck: false;
  mustEscalateFraudFlagsToHumanController: true;
  mustEscalateReasonablenessFlagsToHumanController: true;
  canSignOffOnFinancialStatements: false;
  canCommunicateExternally: false;
  auditOpinionProhibited: true;
  escalationTargetRoleType: "human_controller";
  requiresWorkpaperOnEveryOutput: true;
  requiresSupportPackageOnEveryOutput: true;
  allOutputsArePreparationAndDraftingOnly: true;
  commercialPositioningNote: string;
  roleCompositionComplete: boolean;
  isNotReplacementForHuman: true;
  humanControllerReviewsAndDecides: true;
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

export interface BuildControllerHelperRoleResult {
  controllerHelperRole: SyntheticControllerHelperRole | null;
  skipped: boolean;
  warnings: string[];
}

export const CONTROLLER_HELPER_ASSIGNED_CAPABILITIES: SyntheticControllerHelperAssignedCapability[] = [
  "overnight_controller_preparation_queue",
  "staff_and_senior_exception_review",
  "flux_analysis_drafting",
  "close_status_summary_preparation",
  "reconciliation_exception_flagging",
  "journal_entry_exception_flagging",
  "approval_routing_within_policy",
  "controller_review_package_assembly",
  "morning_summary_preparation",
];

export const CONTROLLER_HELPER_COMMERCIAL_POSITIONING_NOTE =
  "What if you never had to stay late during close week again; this role helps the human controller and does not replace the controller.";

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getBoundPhase38SnapshotHash(input: BuildControllerHelperRoleInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildControllerHelperRoleInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildControllerHelperRoleInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildControllerHelperRoleInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildControllerHelperRoleInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildControllerHelperRoleInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildControllerHelperRoleInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildControllerHelperRoleInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildControllerHelperRoleInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function getAssignedCapabilities(input: BuildControllerHelperRoleInput): SyntheticControllerHelperAssignedCapability[] {
  return input.assignedCapabilities ?? CONTROLLER_HELPER_ASSIGNED_CAPABILITIES;
}

function getCommercialPositioningNote(input: BuildControllerHelperRoleInput): string {
  return input.commercialPositioningNote ?? CONTROLLER_HELPER_COMMERCIAL_POSITIONING_NOTE;
}

function getRoleCompositionComplete(input: BuildControllerHelperRoleInput): boolean {
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

function collectMissingRequiredIdentifiers(input: BuildControllerHelperRoleInput): string[] {
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

function buildDerivationHash(input: BuildControllerHelperRoleInput): string {
  return stableSnapshotHash({
    roleType: "controller_helper",
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
    assignedCapabilities: getAssignedCapabilities(input),
    canGenerateJournalEntry: false,
    canReviewStaffAndSeniorOutput: true,
    canDraftFluxAnalysis: true,
    canPrepareCloseStatusSummary: true,
    canReviewReconciliationsWithExceptionFlagging: true,
    canReviewJournalEntriesWithExceptionFlagging: true,
    canRouteApprovalsWithinPolicy: true,
    canAssembleControllerReviewPackage: true,
    canSendMorningSummary: true,
    canBeInitiatedByEmail: true,
    canBeInitiatedByPulse: true,
    supportsAdHocRequest: true,
    supportsOvernightProcessing: true,
    canPostDirectly: false,
    canSubmitToERP: false,
    canSelfApprove: false,
    canMakeFinalDecisionOnMaterialItems: false,
    canApproveAboveMaterialityWithoutHumanConfirmation: false,
    canOverrideFraudDetection: false,
    canOverrideReasonablenessCheck: false,
    mustEscalateFraudFlagsToHumanController: true,
    mustEscalateReasonablenessFlagsToHumanController: true,
    canSignOffOnFinancialStatements: false,
    canCommunicateExternally: false,
    auditOpinionProhibited: true,
    escalationTargetRoleType: "human_controller",
    requiresWorkpaperOnEveryOutput: true,
    requiresSupportPackageOnEveryOutput: true,
    allOutputsArePreparationAndDraftingOnly: true,
    commercialPositioningNote: getCommercialPositioningNote(input),
    roleCompositionComplete: getRoleCompositionComplete(input),
    isNotReplacementForHuman: true,
    humanControllerReviewsAndDecides: true,
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildControllerHelperRole(input: BuildControllerHelperRoleInput): BuildControllerHelperRoleResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      controllerHelperRole: null,
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
  const controllerHelperRoleKey = stableSnapshotHash({
    roleType: "controller_helper",
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
  const controllerHelperRoleId = stableSnapshotHash({
    controllerHelperRoleKey,
    artifactType: "SyntheticControllerHelperRole",
  });

  return {
    controllerHelperRole: {
      controllerHelperRoleId,
      controllerHelperRoleKey,
      roleType: "controller_helper",
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
      assignedCapabilities: getAssignedCapabilities(input),
      canGenerateJournalEntry: false,
      canReviewStaffAndSeniorOutput: true,
      canDraftFluxAnalysis: true,
      canPrepareCloseStatusSummary: true,
      canReviewReconciliationsWithExceptionFlagging: true,
      canReviewJournalEntriesWithExceptionFlagging: true,
      canRouteApprovalsWithinPolicy: true,
      canAssembleControllerReviewPackage: true,
      canSendMorningSummary: true,
      canBeInitiatedByEmail: true,
      canBeInitiatedByPulse: true,
      supportsAdHocRequest: true,
      supportsOvernightProcessing: true,
      canPostDirectly: false,
      canSubmitToERP: false,
      canSelfApprove: false,
      canMakeFinalDecisionOnMaterialItems: false,
      canApproveAboveMaterialityWithoutHumanConfirmation: false,
      canOverrideFraudDetection: false,
      canOverrideReasonablenessCheck: false,
      mustEscalateFraudFlagsToHumanController: true,
      mustEscalateReasonablenessFlagsToHumanController: true,
      canSignOffOnFinancialStatements: false,
      canCommunicateExternally: false,
      auditOpinionProhibited: true,
      escalationTargetRoleType: "human_controller",
      requiresWorkpaperOnEveryOutput: true,
      requiresSupportPackageOnEveryOutput: true,
      allOutputsArePreparationAndDraftingOnly: true,
      commercialPositioningNote: getCommercialPositioningNote(input),
      roleCompositionComplete,
      isNotReplacementForHuman: true,
      humanControllerReviewsAndDecides: true,
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
