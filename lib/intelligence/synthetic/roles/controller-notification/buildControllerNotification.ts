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

export type SyntheticControllerNotificationType =
  | "work_ready_for_review"
  | "decline_with_warning"
  | "exception_flagged"
  | "decision_required"
  | "escalation"
  | "fraud_flag_escalation"
  | "reasonableness_flag_escalation";

export type SyntheticControllerNotificationTargetPersona =
  | "controller"
  | "cfo"
  | "manager"
  | "partner"
  | "audit_manager";

export type SyntheticControllerNotificationChannel = "email" | "pulse" | "both";

export type SyntheticControllerNotificationStatus = "prepared" | "not_prepared";

export interface BuildControllerNotificationInput {
  roleType?: SyntheticRoleType;
  roleInstanceId?: string;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  notificationType?: SyntheticControllerNotificationType;
  notificationTargetPersona?: SyntheticControllerNotificationTargetPersona;
  notificationTargetUserId?: string;
  notificationChannel?: SyntheticControllerNotificationChannel;
  notificationSubject?: string;
  notificationSummary?: string;
  relatedOutputReferenceIds?: string[];
  relatedWorkpaperReferenceIds?: string[];
  declineWarningReference?: string;
  exceptionReference?: string;
  decisionRequiredReference?: string;
  escalationReference?: string;
  fraudFlagReference?: string;
  reasonablenessFlagReference?: string;
  requiresHumanDecision?: boolean;
  decisionDeadlineReference?: string;
  linkedAuditLogReferenceId?: string;
  notificationStatus?: SyntheticControllerNotificationStatus;
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

export interface SyntheticControllerNotification {
  controllerNotificationId: string;
  controllerNotificationKey: string;
  roleType: SyntheticRoleType | "";
  roleInstanceId: string;
  notificationType: SyntheticControllerNotificationType;
  notificationTargetPersona: SyntheticControllerNotificationTargetPersona;
  notificationTargetUserId: string;
  notificationChannel: SyntheticControllerNotificationChannel;
  notificationSubject: string;
  notificationSummary: string;
  relatedOutputReferenceIds: string[];
  relatedWorkpaperReferenceIds: string[];
  declineWarningReference: string;
  exceptionReference: string;
  decisionRequiredReference: string;
  escalationReference: string;
  fraudFlagReference: string;
  reasonablenessFlagReference: string;
  requiresHumanDecision: boolean;
  decisionDeadlineReference: string;
  linkedAuditLogReferenceId: string;
  notificationPreservesTraceability: true;
  notificationStatus: SyntheticControllerNotificationStatus;
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

export interface BuildControllerNotificationResult {
  controllerNotification: SyntheticControllerNotification | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getBoundPhase38SnapshotHash(input: BuildControllerNotificationInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildControllerNotificationInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildControllerNotificationInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildControllerNotificationInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildControllerNotificationInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildControllerNotificationInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildControllerNotificationInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildControllerNotificationInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildControllerNotificationInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function getNotificationStatus(input: BuildControllerNotificationInput): SyntheticControllerNotificationStatus {
  return input.notificationStatus ?? "prepared";
}

function collectMissingRequiredIdentifiers(input: BuildControllerNotificationInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.roleInstanceId)) {
    missing.push("roleInstanceId");
  }

  if (!hasValue(input.notificationType)) {
    missing.push("notificationType");
  }

  if (!hasValue(input.notificationTargetPersona)) {
    missing.push("notificationTargetPersona");
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

function buildDerivationHash(input: BuildControllerNotificationInput): string {
  return stableSnapshotHash({
    roleType: input.roleType ?? "",
    roleInstanceId: input.roleInstanceId,
    notificationType: input.notificationType,
    notificationTargetPersona: input.notificationTargetPersona,
    notificationTargetUserId: input.notificationTargetUserId ?? "",
    notificationChannel: input.notificationChannel ?? "pulse",
    notificationSubject: input.notificationSubject ?? "",
    notificationSummary: input.notificationSummary ?? "",
    relatedOutputReferenceIds: getInputArray(input.relatedOutputReferenceIds),
    relatedWorkpaperReferenceIds: getInputArray(input.relatedWorkpaperReferenceIds),
    declineWarningReference: input.declineWarningReference ?? "",
    exceptionReference: input.exceptionReference ?? "",
    decisionRequiredReference: input.decisionRequiredReference ?? "",
    escalationReference: input.escalationReference ?? "",
    fraudFlagReference: input.fraudFlagReference ?? "",
    reasonablenessFlagReference: input.reasonablenessFlagReference ?? "",
    requiresHumanDecision: input.requiresHumanDecision === true,
    decisionDeadlineReference: input.decisionDeadlineReference ?? "",
    linkedAuditLogReferenceId: input.linkedAuditLogReferenceId ?? "",
    notificationPreservesTraceability: true,
    notificationStatus: getNotificationStatus(input),
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildControllerNotification(
  input: BuildControllerNotificationInput,
): BuildControllerNotificationResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      controllerNotification: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const roleType = input.roleType ?? "";
  const roleInstanceId = input.roleInstanceId as string;
  const notificationType = input.notificationType as SyntheticControllerNotificationType;
  const notificationTargetPersona = input.notificationTargetPersona as SyntheticControllerNotificationTargetPersona;
  const boundPhase38SnapshotHash = getBoundPhase38SnapshotHash(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);
  const companyId = getCompanyId(input);
  const scope = getScope(input);
  const customerIsolation = getCustomerIsolation(input);
  const firmIsolation = getFirmIsolation(input);
  const clientIsolation = getClientIsolation(input);
  const notificationChannel = input.notificationChannel ?? "pulse";
  const notificationStatus = getNotificationStatus(input);
  const derivationHash = buildDerivationHash(input);
  const controllerNotificationKey = stableSnapshotHash({
    roleType,
    roleInstanceId,
    notificationType,
    notificationTargetPersona,
    notificationChannel,
    companyId,
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const controllerNotificationId = stableSnapshotHash({
    controllerNotificationKey,
    artifactType: "SyntheticControllerNotification",
  });

  return {
    controllerNotification: {
      controllerNotificationId,
      controllerNotificationKey,
      roleType,
      roleInstanceId,
      notificationType,
      notificationTargetPersona,
      notificationTargetUserId: input.notificationTargetUserId ?? "",
      notificationChannel,
      notificationSubject: input.notificationSubject ?? "",
      notificationSummary: input.notificationSummary ?? "",
      relatedOutputReferenceIds: getInputArray(input.relatedOutputReferenceIds),
      relatedWorkpaperReferenceIds: getInputArray(input.relatedWorkpaperReferenceIds),
      declineWarningReference: input.declineWarningReference ?? "",
      exceptionReference: input.exceptionReference ?? "",
      decisionRequiredReference: input.decisionRequiredReference ?? "",
      escalationReference: input.escalationReference ?? "",
      fraudFlagReference: input.fraudFlagReference ?? "",
      reasonablenessFlagReference: input.reasonablenessFlagReference ?? "",
      requiresHumanDecision: input.requiresHumanDecision === true,
      decisionDeadlineReference: input.decisionDeadlineReference ?? "",
      linkedAuditLogReferenceId: input.linkedAuditLogReferenceId ?? "",
      notificationPreservesTraceability: true,
      notificationStatus,
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
