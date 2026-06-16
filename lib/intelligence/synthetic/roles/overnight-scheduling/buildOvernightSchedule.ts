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

export type SyntheticOvernightExecutionStatus =
  | "pending_confirmation"
  | "confirmed"
  | "scheduled"
  | "processing"
  | "completed"
  | "failed";

export interface BuildOvernightScheduleInput {
  roleType?: SyntheticRoleType;
  roleInstanceId?: string;
  taskQueueReferenceId?: string;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  scheduledTaskReferenceIds?: string[];
  queueConfirmedByUserId?: string;
  queueConfirmedAt?: string;
  overnightExecutionAuthorized?: boolean;
  overnightExecutionAuthorizedAt?: string;
  scheduledStartTime?: string;
  expectedCompletionTime?: string;
  morningSummaryScheduleTime?: string;
  morningSummaryReferenceId?: string;
  taskExecutionOrder?: string[];
  perTaskGovernanceReferenceIds?: Record<string, string[]>;
  perTaskRestrictionReferenceIds?: Record<string, string[]>;
  overnightExecutionStatus?: SyntheticOvernightExecutionStatus;
  completedTaskReferenceIds?: string[];
  declinedTaskReferenceIds?: string[];
  exceptionsFlaggedReferenceIds?: string[];
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

export interface SyntheticOvernightSchedule {
  overnightScheduleId: string;
  overnightScheduleKey: string;
  roleType: SyntheticRoleType;
  roleInstanceId: string;
  taskQueueReferenceId: string;
  scheduledTaskReferenceIds: string[];
  queueConfirmedByUserId: string;
  queueConfirmedAt: string;
  queueConfirmationRequired: true;
  overnightExecutionAuthorized: boolean;
  overnightExecutionAuthorizedAt: string;
  scheduledStartTime: string;
  expectedCompletionTime: string;
  morningSummaryScheduleTime: string;
  morningSummaryReferenceId: string;
  taskExecutionOrder: string[];
  perTaskGovernanceReferenceIds: Record<string, string[]>;
  perTaskRestrictionReferenceIds: Record<string, string[]>;
  overnightExecutionStatus: SyntheticOvernightExecutionStatus;
  completedTaskReferenceIds: string[];
  declinedTaskReferenceIds: string[];
  exceptionsFlaggedReferenceIds: string[];
  failClosedOnUnconfirmedQueue: true;
  notAutonomousAgentMarker: true;
  governedAndLoggedMarker: true;
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

export interface BuildOvernightScheduleResult {
  overnightSchedule: SyntheticOvernightSchedule | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getInputRecord<T>(values: Record<string, T[]> | undefined): Record<string, T[]> {
  return values ?? {};
}

function getBoundPhase38SnapshotHash(input: BuildOvernightScheduleInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildOvernightScheduleInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildOvernightScheduleInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildOvernightScheduleInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildOvernightScheduleInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildOvernightScheduleInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildOvernightScheduleInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildOvernightScheduleInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildOvernightScheduleInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function getTaskExecutionOrder(input: BuildOvernightScheduleInput): string[] {
  return input.taskExecutionOrder ?? getInputArray(input.scheduledTaskReferenceIds);
}

function getOvernightExecutionAuthorized(input: BuildOvernightScheduleInput): boolean {
  return input.overnightExecutionAuthorized === true && hasValue(input.queueConfirmedByUserId) && hasValue(input.queueConfirmedAt);
}

function collectMissingRequiredIdentifiers(input: BuildOvernightScheduleInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.roleType)) {
    missing.push("roleType");
  }

  if (!hasValue(input.roleInstanceId)) {
    missing.push("roleInstanceId");
  }

  if (!hasValue(input.taskQueueReferenceId)) {
    missing.push("taskQueueReferenceId");
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

function buildDerivationHash(input: BuildOvernightScheduleInput): string {
  return stableSnapshotHash({
    roleType: input.roleType,
    roleInstanceId: input.roleInstanceId,
    taskQueueReferenceId: input.taskQueueReferenceId,
    scheduledTaskReferenceIds: getInputArray(input.scheduledTaskReferenceIds),
    queueConfirmedByUserId: input.queueConfirmedByUserId ?? "",
    queueConfirmedAt: input.queueConfirmedAt ?? "",
    queueConfirmationRequired: true,
    overnightExecutionAuthorized: getOvernightExecutionAuthorized(input),
    overnightExecutionAuthorizedAt: input.overnightExecutionAuthorizedAt ?? "",
    scheduledStartTime: input.scheduledStartTime ?? "",
    expectedCompletionTime: input.expectedCompletionTime ?? "",
    morningSummaryScheduleTime: input.morningSummaryScheduleTime ?? "",
    morningSummaryReferenceId: input.morningSummaryReferenceId ?? "",
    taskExecutionOrder: getTaskExecutionOrder(input),
    perTaskGovernanceReferenceIds: getInputRecord(input.perTaskGovernanceReferenceIds),
    perTaskRestrictionReferenceIds: getInputRecord(input.perTaskRestrictionReferenceIds),
    overnightExecutionStatus: input.overnightExecutionStatus ?? "pending_confirmation",
    completedTaskReferenceIds: getInputArray(input.completedTaskReferenceIds),
    declinedTaskReferenceIds: getInputArray(input.declinedTaskReferenceIds),
    exceptionsFlaggedReferenceIds: getInputArray(input.exceptionsFlaggedReferenceIds),
    failClosedOnUnconfirmedQueue: true,
    notAutonomousAgentMarker: true,
    governedAndLoggedMarker: true,
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildOvernightSchedule(input: BuildOvernightScheduleInput): BuildOvernightScheduleResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      overnightSchedule: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const roleType = input.roleType as SyntheticRoleType;
  const roleInstanceId = input.roleInstanceId as string;
  const taskQueueReferenceId = input.taskQueueReferenceId as string;
  const boundPhase38SnapshotHash = getBoundPhase38SnapshotHash(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);
  const companyId = getCompanyId(input);
  const scope = getScope(input);
  const customerIsolation = getCustomerIsolation(input);
  const firmIsolation = getFirmIsolation(input);
  const clientIsolation = getClientIsolation(input);
  const overnightExecutionAuthorized = getOvernightExecutionAuthorized(input);
  const taskExecutionOrder = getTaskExecutionOrder(input);
  const derivationHash = buildDerivationHash(input);
  const overnightScheduleKey = stableSnapshotHash({
    roleType,
    roleInstanceId,
    taskQueueReferenceId,
    companyId,
    queueConfirmedByUserId: input.queueConfirmedByUserId ?? "",
    queueConfirmedAt: input.queueConfirmedAt ?? "",
    overnightExecutionAuthorized,
    scheduledStartTime: input.scheduledStartTime ?? "",
    morningSummaryScheduleTime: input.morningSummaryScheduleTime ?? "",
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const overnightScheduleId = stableSnapshotHash({
    overnightScheduleKey,
    artifactType: "SyntheticOvernightSchedule",
  });

  return {
    overnightSchedule: {
      overnightScheduleId,
      overnightScheduleKey,
      roleType,
      roleInstanceId,
      taskQueueReferenceId,
      scheduledTaskReferenceIds: getInputArray(input.scheduledTaskReferenceIds),
      queueConfirmedByUserId: input.queueConfirmedByUserId ?? "",
      queueConfirmedAt: input.queueConfirmedAt ?? "",
      queueConfirmationRequired: true,
      overnightExecutionAuthorized,
      overnightExecutionAuthorizedAt: input.overnightExecutionAuthorizedAt ?? "",
      scheduledStartTime: input.scheduledStartTime ?? "",
      expectedCompletionTime: input.expectedCompletionTime ?? "",
      morningSummaryScheduleTime: input.morningSummaryScheduleTime ?? "",
      morningSummaryReferenceId: input.morningSummaryReferenceId ?? "",
      taskExecutionOrder,
      perTaskGovernanceReferenceIds: getInputRecord(input.perTaskGovernanceReferenceIds),
      perTaskRestrictionReferenceIds: getInputRecord(input.perTaskRestrictionReferenceIds),
      overnightExecutionStatus: input.overnightExecutionStatus ?? "pending_confirmation",
      completedTaskReferenceIds: getInputArray(input.completedTaskReferenceIds),
      declinedTaskReferenceIds: getInputArray(input.declinedTaskReferenceIds),
      exceptionsFlaggedReferenceIds: getInputArray(input.exceptionsFlaggedReferenceIds),
      failClosedOnUnconfirmedQueue: true,
      notAutonomousAgentMarker: true,
      governedAndLoggedMarker: true,
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
