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

export type SyntheticStaffAuditorAssignedCapability =
  | "audit_program_step_execution"
  | "evidence_collection"
  | "workpaper_preparation"
  | "tie_out_performance"
  | "testing_procedure_performance"
  | "audit_support_package_assembly"
  | "cash_audit_section_support";

export interface BuildStaffAuditorRoleInput {
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
  driveOutputReferenceId?: string;
  folderMappingReferenceId?: string;
  assignedCapabilities?: SyntheticStaffAuditorAssignedCapability[];
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

export interface SyntheticStaffAuditorRole {
  staffAuditorRoleId: string;
  staffAuditorRoleKey: string;
  roleType: "staff_auditor";
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
  driveOutputReferenceId: string;
  folderMappingReferenceId: string;
  assignedCapabilities: SyntheticStaffAuditorAssignedCapability[];
  canGenerateJournalEntry: false;
  canExecuteAuditProgramSteps: true;
  canCollectEvidence: true;
  canPrepareWorkpapers: true;
  canPerformTieOuts: true;
  canPerformTestingProcedures: true;
  canAssembleAuditSupportPackages: true;
  canSignOffAsPreparer: true;
  canSignOffAsReviewer: false;
  canSignOffAsApprover: false;
  canGenerateAuditOpinion: false;
  canConcludeOnAuditAreas: false;
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
  escalationTargetRoleType: "senior_auditor";
  requiresWorkpaperOnEveryOutput: true;
  requiresEvidenceSufficiency: true;
  roleCompositionComplete: boolean;
  isNotReplacementForHuman: true;
  humanRetainsReviewAndOpinion: true;
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

export interface BuildStaffAuditorRoleResult {
  staffAuditorRole: SyntheticStaffAuditorRole | null;
  skipped: boolean;
  warnings: string[];
}

export const STAFF_AUDITOR_ASSIGNED_CAPABILITIES: SyntheticStaffAuditorAssignedCapability[] = [
  "audit_program_step_execution",
  "evidence_collection",
  "workpaper_preparation",
  "tie_out_performance",
  "testing_procedure_performance",
  "audit_support_package_assembly",
  "cash_audit_section_support",
];

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getBoundPhase38SnapshotHash(input: BuildStaffAuditorRoleInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildStaffAuditorRoleInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildStaffAuditorRoleInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildStaffAuditorRoleInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildStaffAuditorRoleInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildStaffAuditorRoleInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildStaffAuditorRoleInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildStaffAuditorRoleInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildStaffAuditorRoleInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function getAssignedCapabilities(input: BuildStaffAuditorRoleInput): SyntheticStaffAuditorAssignedCapability[] {
  return input.assignedCapabilities ?? STAFF_AUDITOR_ASSIGNED_CAPABILITIES;
}

function getRoleCompositionComplete(input: BuildStaffAuditorRoleInput): boolean {
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

function collectMissingRequiredIdentifiers(input: BuildStaffAuditorRoleInput): string[] {
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

function buildDerivationHash(input: BuildStaffAuditorRoleInput): string {
  return stableSnapshotHash({
    roleType: "staff_auditor",
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
    driveOutputReferenceId: input.driveOutputReferenceId ?? "",
    folderMappingReferenceId: input.folderMappingReferenceId ?? "",
    assignedCapabilities: getAssignedCapabilities(input),
    canGenerateJournalEntry: false,
    canExecuteAuditProgramSteps: true,
    canCollectEvidence: true,
    canPrepareWorkpapers: true,
    canPerformTieOuts: true,
    canPerformTestingProcedures: true,
    canAssembleAuditSupportPackages: true,
    canSignOffAsPreparer: true,
    canSignOffAsReviewer: false,
    canSignOffAsApprover: false,
    canGenerateAuditOpinion: false,
    canConcludeOnAuditAreas: false,
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
    escalationTargetRoleType: "senior_auditor",
    requiresWorkpaperOnEveryOutput: true,
    requiresEvidenceSufficiency: true,
    roleCompositionComplete: getRoleCompositionComplete(input),
    isNotReplacementForHuman: true,
    humanRetainsReviewAndOpinion: true,
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildStaffAuditorRole(input: BuildStaffAuditorRoleInput): BuildStaffAuditorRoleResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      staffAuditorRole: null,
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
  const staffAuditorRoleKey = stableSnapshotHash({
    roleType: "staff_auditor",
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
  const staffAuditorRoleId = stableSnapshotHash({
    staffAuditorRoleKey,
    artifactType: "SyntheticStaffAuditorRole",
  });

  return {
    staffAuditorRole: {
      staffAuditorRoleId,
      staffAuditorRoleKey,
      roleType: "staff_auditor",
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
      driveOutputReferenceId: input.driveOutputReferenceId ?? "",
      folderMappingReferenceId: input.folderMappingReferenceId ?? "",
      assignedCapabilities: getAssignedCapabilities(input),
      canGenerateJournalEntry: false,
      canExecuteAuditProgramSteps: true,
      canCollectEvidence: true,
      canPrepareWorkpapers: true,
      canPerformTieOuts: true,
      canPerformTestingProcedures: true,
      canAssembleAuditSupportPackages: true,
      canSignOffAsPreparer: true,
      canSignOffAsReviewer: false,
      canSignOffAsApprover: false,
      canGenerateAuditOpinion: false,
      canConcludeOnAuditAreas: false,
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
      escalationTargetRoleType: "senior_auditor",
      requiresWorkpaperOnEveryOutput: true,
      requiresEvidenceSufficiency: true,
      roleCompositionComplete,
      isNotReplacementForHuman: true,
      humanRetainsReviewAndOpinion: true,
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
