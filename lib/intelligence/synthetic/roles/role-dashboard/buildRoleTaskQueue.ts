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

export type SyntheticRoleTaskQueueStatus = "idle" | "active" | "processing" | "review_pending";

export type SyntheticRoleTaskQueueSourceType =
  | "email"
  | "pulse_queue"
  | "ad_hoc_request"
  | "scheduled"
  | "manual";

export interface SyntheticRoleTaskCounts {
  assignedCount: number;
  inProgressCount: number;
  completedCount: number;
  declinedCount: number;
  reviewNeededCount: number;
  totalCount: number;
}

export interface BuildRoleTaskQueueInput {
  roleType?: SyntheticRoleType;
  roleInstanceId?: string;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  assignedTaskReferenceIds?: string[];
  inProgressTaskReferenceIds?: string[];
  completedTaskReferenceIds?: string[];
  declinedTaskReferenceIds?: string[];
  reviewNeededTaskReferenceIds?: string[];
  taskQueueStatus?: SyntheticRoleTaskQueueStatus;
  taskCounts?: SyntheticRoleTaskCounts;
  overnightScheduleEnabled?: boolean;
  overnightScheduleTime?: string;
  morningSummaryScheduleTime?: string;
  queueSourceTypes?: SyntheticRoleTaskQueueSourceType[];
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

export interface SyntheticRoleTaskQueue {
  taskQueueId: string;
  taskQueueKey: string;
  roleType: SyntheticRoleType;
  roleInstanceId: string;
  assignedTaskReferenceIds: string[];
  inProgressTaskReferenceIds: string[];
  completedTaskReferenceIds: string[];
  declinedTaskReferenceIds: string[];
  reviewNeededTaskReferenceIds: string[];
  taskQueueStatus: SyntheticRoleTaskQueueStatus;
  taskCounts: SyntheticRoleTaskCounts;
  overnightScheduleEnabled: boolean;
  overnightScheduleTime: string;
  morningSummaryScheduleTime: string;
  queueSourceTypes: SyntheticRoleTaskQueueSourceType[];
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

export interface BuildRoleTaskQueueResult {
  taskQueue: SyntheticRoleTaskQueue | null;
  skipped: boolean;
  warnings: string[];
}

export const ROLE_TASK_QUEUE_SOURCE_TYPES: SyntheticRoleTaskQueueSourceType[] = [
  "email",
  "pulse_queue",
  "ad_hoc_request",
  "scheduled",
  "manual",
];

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getBoundPhase38SnapshotHash(input: BuildRoleTaskQueueInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildRoleTaskQueueInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildRoleTaskQueueInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildRoleTaskQueueInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildRoleTaskQueueInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildRoleTaskQueueInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildRoleTaskQueueInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildRoleTaskQueueInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildRoleTaskQueueInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function deriveTaskCounts(input: BuildRoleTaskQueueInput): SyntheticRoleTaskCounts {
  if (input.taskCounts) {
    return input.taskCounts;
  }

  const assignedCount = getInputArray(input.assignedTaskReferenceIds).length;
  const inProgressCount = getInputArray(input.inProgressTaskReferenceIds).length;
  const completedCount = getInputArray(input.completedTaskReferenceIds).length;
  const declinedCount = getInputArray(input.declinedTaskReferenceIds).length;
  const reviewNeededCount = getInputArray(input.reviewNeededTaskReferenceIds).length;

  return {
    assignedCount,
    inProgressCount,
    completedCount,
    declinedCount,
    reviewNeededCount,
    totalCount: assignedCount + inProgressCount + completedCount + declinedCount + reviewNeededCount,
  };
}

function collectMissingRequiredIdentifiers(input: BuildRoleTaskQueueInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.roleType)) {
    missing.push("roleType");
  }

  if (!hasValue(input.roleInstanceId)) {
    missing.push("roleInstanceId");
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

function buildDerivationHash(input: BuildRoleTaskQueueInput): string {
  return stableSnapshotHash({
    roleType: input.roleType,
    roleInstanceId: input.roleInstanceId,
    assignedTaskReferenceIds: getInputArray(input.assignedTaskReferenceIds),
    inProgressTaskReferenceIds: getInputArray(input.inProgressTaskReferenceIds),
    completedTaskReferenceIds: getInputArray(input.completedTaskReferenceIds),
    declinedTaskReferenceIds: getInputArray(input.declinedTaskReferenceIds),
    reviewNeededTaskReferenceIds: getInputArray(input.reviewNeededTaskReferenceIds),
    taskQueueStatus: input.taskQueueStatus ?? "idle",
    taskCounts: deriveTaskCounts(input),
    overnightScheduleEnabled: input.overnightScheduleEnabled === true,
    overnightScheduleTime: input.overnightScheduleTime ?? "",
    morningSummaryScheduleTime: input.morningSummaryScheduleTime ?? "",
    queueSourceTypes: input.queueSourceTypes ?? ROLE_TASK_QUEUE_SOURCE_TYPES,
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildRoleTaskQueue(input: BuildRoleTaskQueueInput): BuildRoleTaskQueueResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      taskQueue: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const roleType = input.roleType as SyntheticRoleType;
  const roleInstanceId = input.roleInstanceId as string;
  const boundPhase38SnapshotHash = getBoundPhase38SnapshotHash(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);
  const companyId = getCompanyId(input);
  const scope = getScope(input);
  const customerIsolation = getCustomerIsolation(input);
  const firmIsolation = getFirmIsolation(input);
  const clientIsolation = getClientIsolation(input);
  const taskCounts = deriveTaskCounts(input);
  const derivationHash = buildDerivationHash(input);
  const taskQueueKey = stableSnapshotHash({
    roleType,
    roleInstanceId,
    companyId,
    taskCounts,
    taskQueueStatus: input.taskQueueStatus ?? "idle",
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const taskQueueId = stableSnapshotHash({
    taskQueueKey,
    artifactType: "SyntheticRoleTaskQueue",
  });

  return {
    taskQueue: {
      taskQueueId,
      taskQueueKey,
      roleType,
      roleInstanceId,
      assignedTaskReferenceIds: getInputArray(input.assignedTaskReferenceIds),
      inProgressTaskReferenceIds: getInputArray(input.inProgressTaskReferenceIds),
      completedTaskReferenceIds: getInputArray(input.completedTaskReferenceIds),
      declinedTaskReferenceIds: getInputArray(input.declinedTaskReferenceIds),
      reviewNeededTaskReferenceIds: getInputArray(input.reviewNeededTaskReferenceIds),
      taskQueueStatus: input.taskQueueStatus ?? "idle",
      taskCounts,
      overnightScheduleEnabled: input.overnightScheduleEnabled === true,
      overnightScheduleTime: input.overnightScheduleTime ?? "",
      morningSummaryScheduleTime: input.morningSummaryScheduleTime ?? "",
      queueSourceTypes: input.queueSourceTypes ?? ROLE_TASK_QUEUE_SOURCE_TYPES,
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
