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

export type SyntheticRoleExecutionAuditLogTaskSourceType =
  | "email"
  | "workflow"
  | "scheduled"
  | "manual"
  | "pulse_queue"
  | "ad_hoc_request";

export type SyntheticRoleExecutionAuditLogEscalationTargetRoleType =
  | SyntheticRoleType
  | "human_controller"
  | "human_cfo"
  | "human_audit_manager"
  | "human_partner";

export interface BuildRoleExecutionAuditLogInput {
  roleType?: SyntheticRoleType;
  roleInstanceId?: string;
  taskSourceType?: SyntheticRoleExecutionAuditLogTaskSourceType;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  taskSourceReference?: string;
  taskDescription?: string;
  evidenceReferenceIds?: string[];
  organizationalMemoryReferenceIds?: string[];
  methodologyReferenceIds?: string[];
  rulesApplied?: string[];
  validationCheckResult?: string;
  fraudDetectionCheckResult?: string;
  reasonablenessCheckResult?: string;
  outputsGenerated?: string[];
  outputReferenceIds?: string[];
  workpaperReferenceIds?: string[];
  approvalActions?: string[];
  approvalStatus?: string;
  erpStatusChanges?: string[];
  declineReasons?: string[];
  warningReasons?: string[];
  overrideReasons?: string[];
  overrideRequesterId?: string;
  clientEmailsSent?: string[];
  clientEmailRecipients?: string[];
  clientEmailSentTimestamps?: string[];
  driveOutputPlacements?: string[];
  driveOutputFolderPaths?: string[];
  escalationActions?: string[];
  escalationTargetRoleType?: SyntheticRoleExecutionAuditLogEscalationTargetRoleType;
  humanDecisionRecorded?: boolean;
  humanDecisionMakerId?: string;
  auditLogCreatedAt?: string;
  auditLogSequenceNumber?: number;
  priorAuditLogReferenceId?: string;
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
  lineageReferenceIds?: string[];
  trustMetadata?: SyntheticAuditTrustMetadata[];
  confidenceMetadata?: SyntheticAuditConfidenceMetadata[];
  governanceMetadata?: SyntheticAuditGovernanceMetadata[];
  materialityMetadata?: SyntheticAuditMaterialityCompatibility[];
  warnings?: string[];
  skippedIndexes?: number[];
}

export interface SyntheticRoleExecutionAuditLog {
  auditLogId: string;
  auditLogKey: string;
  roleType: SyntheticRoleType;
  roleInstanceId: string;
  taskSourceType: SyntheticRoleExecutionAuditLogTaskSourceType;
  taskSourceReference: string;
  taskDescription: string;
  evidenceReferenceIds: string[];
  organizationalMemoryReferenceIds: string[];
  methodologyReferenceIds: string[];
  rulesApplied: string[];
  validationCheckResult: string;
  fraudDetectionCheckResult: string;
  reasonablenessCheckResult: string;
  outputsGenerated: string[];
  outputReferenceIds: string[];
  workpaperReferenceIds: string[];
  approvalActions: string[];
  approvalStatus: string;
  erpStatusChanges: string[];
  declineReasons: string[];
  warningReasons: string[];
  overrideReasons: string[];
  overrideRequesterId: string;
  clientEmailsSent: string[];
  clientEmailRecipients: string[];
  clientEmailSentTimestamps: string[];
  driveOutputPlacements: string[];
  driveOutputFolderPaths: string[];
  escalationActions: string[];
  escalationTargetRoleType: SyntheticRoleExecutionAuditLogEscalationTargetRoleType | "";
  humanDecisionRecorded: boolean;
  humanDecisionMakerId: string;
  appendOnly: true;
  immutableRecord: true;
  auditLogCreatedAt: string;
  auditLogSequenceNumber: number;
  priorAuditLogReferenceId: string;
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
  lineageReferenceIds: string[];
  trustMetadata: SyntheticAuditTrustMetadata[];
  confidenceMetadata: SyntheticAuditConfidenceMetadata[];
  governanceMetadata: SyntheticAuditGovernanceMetadata[];
  materialityMetadata: SyntheticAuditMaterialityCompatibility[];
  warnings: string[];
  skippedIndexes: number[];
}

export interface BuildRoleExecutionAuditLogResult {
  roleExecutionAuditLog: SyntheticRoleExecutionAuditLog | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getBoundPhase38SnapshotHash(input: BuildRoleExecutionAuditLogInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildRoleExecutionAuditLogInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildRoleExecutionAuditLogInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildRoleExecutionAuditLogInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildRoleExecutionAuditLogInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildRoleExecutionAuditLogInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildRoleExecutionAuditLogInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildRoleExecutionAuditLogInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildRoleExecutionAuditLogInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function collectMissingRequiredIdentifiers(input: BuildRoleExecutionAuditLogInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.roleType)) {
    missing.push("roleType");
  }

  if (!hasValue(input.roleInstanceId)) {
    missing.push("roleInstanceId");
  }

  if (!hasValue(input.taskSourceType)) {
    missing.push("taskSourceType");
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

function buildDerivationHash(input: BuildRoleExecutionAuditLogInput): string {
  return stableSnapshotHash({
    roleType: input.roleType,
    roleInstanceId: input.roleInstanceId,
    taskSourceType: input.taskSourceType,
    taskSourceReference: input.taskSourceReference ?? "",
    taskDescription: input.taskDescription ?? "",
    evidenceReferenceIds: getInputArray(input.evidenceReferenceIds),
    organizationalMemoryReferenceIds: getInputArray(input.organizationalMemoryReferenceIds),
    methodologyReferenceIds: getInputArray(input.methodologyReferenceIds),
    rulesApplied: getInputArray(input.rulesApplied),
    validationCheckResult: input.validationCheckResult ?? "",
    fraudDetectionCheckResult: input.fraudDetectionCheckResult ?? "",
    reasonablenessCheckResult: input.reasonablenessCheckResult ?? "",
    outputsGenerated: getInputArray(input.outputsGenerated),
    outputReferenceIds: getInputArray(input.outputReferenceIds),
    workpaperReferenceIds: getInputArray(input.workpaperReferenceIds),
    approvalActions: getInputArray(input.approvalActions),
    approvalStatus: input.approvalStatus ?? "",
    erpStatusChanges: getInputArray(input.erpStatusChanges),
    declineReasons: getInputArray(input.declineReasons),
    warningReasons: getInputArray(input.warningReasons),
    overrideReasons: getInputArray(input.overrideReasons),
    overrideRequesterId: input.overrideRequesterId ?? "",
    clientEmailsSent: getInputArray(input.clientEmailsSent),
    clientEmailRecipients: getInputArray(input.clientEmailRecipients),
    clientEmailSentTimestamps: getInputArray(input.clientEmailSentTimestamps),
    driveOutputPlacements: getInputArray(input.driveOutputPlacements),
    driveOutputFolderPaths: getInputArray(input.driveOutputFolderPaths),
    escalationActions: getInputArray(input.escalationActions),
    escalationTargetRoleType: input.escalationTargetRoleType ?? "",
    humanDecisionRecorded: input.humanDecisionRecorded === true,
    humanDecisionMakerId: input.humanDecisionMakerId ?? "",
    auditLogCreatedAt: input.auditLogCreatedAt ?? "",
    auditLogSequenceNumber: input.auditLogSequenceNumber ?? 0,
    priorAuditLogReferenceId: input.priorAuditLogReferenceId ?? "",
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildRoleExecutionAuditLog(
  input: BuildRoleExecutionAuditLogInput,
): BuildRoleExecutionAuditLogResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      roleExecutionAuditLog: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const roleType = input.roleType as SyntheticRoleType;
  const roleInstanceId = input.roleInstanceId as string;
  const taskSourceType = input.taskSourceType as SyntheticRoleExecutionAuditLogTaskSourceType;
  const boundPhase38SnapshotHash = getBoundPhase38SnapshotHash(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);
  const companyId = getCompanyId(input);
  const scope = getScope(input);
  const customerIsolation = getCustomerIsolation(input);
  const firmIsolation = getFirmIsolation(input);
  const clientIsolation = getClientIsolation(input);
  const derivationHash = buildDerivationHash(input);
  const auditLogKey = stableSnapshotHash({
    roleType,
    roleInstanceId,
    taskSourceType,
    companyId,
    auditLogSequenceNumber: input.auditLogSequenceNumber ?? 0,
    priorAuditLogReferenceId: input.priorAuditLogReferenceId ?? "",
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const auditLogId = stableSnapshotHash({
    auditLogKey,
    artifactType: "SyntheticRoleExecutionAuditLog",
  });

  return {
    roleExecutionAuditLog: {
      auditLogId,
      auditLogKey,
      roleType,
      roleInstanceId,
      taskSourceType,
      taskSourceReference: input.taskSourceReference ?? "",
      taskDescription: input.taskDescription ?? "",
      evidenceReferenceIds: getInputArray(input.evidenceReferenceIds),
      organizationalMemoryReferenceIds: getInputArray(input.organizationalMemoryReferenceIds),
      methodologyReferenceIds: getInputArray(input.methodologyReferenceIds),
      rulesApplied: getInputArray(input.rulesApplied),
      validationCheckResult: input.validationCheckResult ?? "",
      fraudDetectionCheckResult: input.fraudDetectionCheckResult ?? "",
      reasonablenessCheckResult: input.reasonablenessCheckResult ?? "",
      outputsGenerated: getInputArray(input.outputsGenerated),
      outputReferenceIds: getInputArray(input.outputReferenceIds),
      workpaperReferenceIds: getInputArray(input.workpaperReferenceIds),
      approvalActions: getInputArray(input.approvalActions),
      approvalStatus: input.approvalStatus ?? "",
      erpStatusChanges: getInputArray(input.erpStatusChanges),
      declineReasons: getInputArray(input.declineReasons),
      warningReasons: getInputArray(input.warningReasons),
      overrideReasons: getInputArray(input.overrideReasons),
      overrideRequesterId: input.overrideRequesterId ?? "",
      clientEmailsSent: getInputArray(input.clientEmailsSent),
      clientEmailRecipients: getInputArray(input.clientEmailRecipients),
      clientEmailSentTimestamps: getInputArray(input.clientEmailSentTimestamps),
      driveOutputPlacements: getInputArray(input.driveOutputPlacements),
      driveOutputFolderPaths: getInputArray(input.driveOutputFolderPaths),
      escalationActions: getInputArray(input.escalationActions),
      escalationTargetRoleType: input.escalationTargetRoleType ?? "",
      humanDecisionRecorded: input.humanDecisionRecorded === true,
      humanDecisionMakerId: input.humanDecisionMakerId ?? "",
      appendOnly: true,
      immutableRecord: true,
      auditLogCreatedAt: input.auditLogCreatedAt ?? "",
      auditLogSequenceNumber: input.auditLogSequenceNumber ?? 0,
      priorAuditLogReferenceId: input.priorAuditLogReferenceId ?? "",
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
