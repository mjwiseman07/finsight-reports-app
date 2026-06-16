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

export type SyntheticRoleDashboardStatus =
  | "available"
  | "working"
  | "review_needed"
  | "declined_action_required"
  | "suspended";

export type SyntheticRoleDashboardPersonaType = "controller" | "cfo" | "manager" | "partner";

export interface SyntheticRoleDashboardPerformanceSummary {
  entriesPreparedCount: number;
  entriesPostedCount: number;
  entriesDeclinedCount: number;
  outputsDeliveredCount: number;
  performanceSummaryText: string;
}

export interface SyntheticRoleDashboardMemoryHealthMetadata {
  memoryHealthReferenceIds: string[];
  memoryHealthStatus: "unknown" | "limited" | "healthy" | "rich" | "stale";
  organizationalContextSummary: string;
  memoryCompoundingLoopActive: boolean;
}

export interface BuildRoleDashboardInput {
  roleType?: SyntheticRoleType;
  roleInstanceId?: string;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  roleDisplayName?: string;
  roleStatus?: SyntheticRoleDashboardStatus;
  taskQueueReferenceId?: string;
  recentInboxMessageReferenceIds?: string[];
  overnightQueueReferenceId?: string;
  performanceSummary?: SyntheticRoleDashboardPerformanceSummary;
  entriesPreparedCount?: number;
  entriesPostedCount?: number;
  entriesDeclinedCount?: number;
  outputsDeliveredCount?: number;
  memoryHealthMetadata?: SyntheticRoleDashboardMemoryHealthMetadata[];
  memoryMonthsAccumulated?: number;
  viewablePersonaTypes?: SyntheticRoleDashboardPersonaType[];
  dashboardLastUpdatedAt?: string;
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

export interface SyntheticRoleDashboard {
  dashboardId: string;
  dashboardKey: string;
  roleType: SyntheticRoleType;
  roleInstanceId: string;
  roleDisplayName: string;
  roleStatus: SyntheticRoleDashboardStatus;
  taskQueueReferenceId: string;
  recentInboxMessageReferenceIds: string[];
  overnightQueueReferenceId: string;
  performanceSummary: SyntheticRoleDashboardPerformanceSummary;
  entriesPreparedCount: number;
  entriesPostedCount: number;
  entriesDeclinedCount: number;
  outputsDeliveredCount: number;
  memoryHealthMetadata: SyntheticRoleDashboardMemoryHealthMetadata[];
  memoryMonthsAccumulated: number;
  viewablePersonaTypes: SyntheticRoleDashboardPersonaType[];
  dashboardLastUpdatedAt: string;
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

export interface BuildRoleDashboardResult {
  dashboard: SyntheticRoleDashboard | null;
  skipped: boolean;
  warnings: string[];
}

export const ROLE_DASHBOARD_VIEWABLE_PERSONA_TYPES: SyntheticRoleDashboardPersonaType[] = [
  "controller",
  "cfo",
  "manager",
  "partner",
];

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getBoundPhase38SnapshotHash(input: BuildRoleDashboardInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildRoleDashboardInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildRoleDashboardInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildRoleDashboardInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildRoleDashboardInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildRoleDashboardInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildRoleDashboardInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildRoleDashboardInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildRoleDashboardInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function getEntriesPreparedCount(input: BuildRoleDashboardInput): number {
  return input.entriesPreparedCount ?? input.performanceSummary?.entriesPreparedCount ?? 0;
}

function getEntriesPostedCount(input: BuildRoleDashboardInput): number {
  return input.entriesPostedCount ?? input.performanceSummary?.entriesPostedCount ?? 0;
}

function getEntriesDeclinedCount(input: BuildRoleDashboardInput): number {
  return input.entriesDeclinedCount ?? input.performanceSummary?.entriesDeclinedCount ?? 0;
}

function getOutputsDeliveredCount(input: BuildRoleDashboardInput): number {
  return input.outputsDeliveredCount ?? input.performanceSummary?.outputsDeliveredCount ?? 0;
}

function getPerformanceSummary(input: BuildRoleDashboardInput): SyntheticRoleDashboardPerformanceSummary {
  return (
    input.performanceSummary ?? {
      entriesPreparedCount: getEntriesPreparedCount(input),
      entriesPostedCount: getEntriesPostedCount(input),
      entriesDeclinedCount: getEntriesDeclinedCount(input),
      outputsDeliveredCount: getOutputsDeliveredCount(input),
      performanceSummaryText: "",
    }
  );
}

function collectMissingRequiredIdentifiers(input: BuildRoleDashboardInput): string[] {
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

function buildDerivationHash(input: BuildRoleDashboardInput): string {
  return stableSnapshotHash({
    roleType: input.roleType,
    roleInstanceId: input.roleInstanceId,
    roleDisplayName: input.roleDisplayName ?? "",
    roleStatus: input.roleStatus ?? "available",
    taskQueueReferenceId: input.taskQueueReferenceId ?? "",
    recentInboxMessageReferenceIds: getInputArray(input.recentInboxMessageReferenceIds),
    overnightQueueReferenceId: input.overnightQueueReferenceId ?? "",
    performanceSummary: getPerformanceSummary(input),
    entriesPreparedCount: getEntriesPreparedCount(input),
    entriesPostedCount: getEntriesPostedCount(input),
    entriesDeclinedCount: getEntriesDeclinedCount(input),
    outputsDeliveredCount: getOutputsDeliveredCount(input),
    memoryHealthMetadata: getInputArray(input.memoryHealthMetadata),
    memoryMonthsAccumulated: input.memoryMonthsAccumulated ?? 0,
    viewablePersonaTypes: input.viewablePersonaTypes ?? ROLE_DASHBOARD_VIEWABLE_PERSONA_TYPES,
    dashboardLastUpdatedAt: input.dashboardLastUpdatedAt ?? "",
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildRoleDashboard(input: BuildRoleDashboardInput): BuildRoleDashboardResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      dashboard: null,
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
  const performanceSummary = getPerformanceSummary(input);
  const entriesPreparedCount = getEntriesPreparedCount(input);
  const entriesPostedCount = getEntriesPostedCount(input);
  const entriesDeclinedCount = getEntriesDeclinedCount(input);
  const outputsDeliveredCount = getOutputsDeliveredCount(input);
  const derivationHash = buildDerivationHash(input);
  const dashboardKey = stableSnapshotHash({
    roleType,
    roleInstanceId,
    companyId,
    roleStatus: input.roleStatus ?? "available",
    taskQueueReferenceId: input.taskQueueReferenceId ?? "",
    dashboardLastUpdatedAt: input.dashboardLastUpdatedAt ?? "",
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const dashboardId = stableSnapshotHash({
    dashboardKey,
    artifactType: "SyntheticRoleDashboard",
  });

  return {
    dashboard: {
      dashboardId,
      dashboardKey,
      roleType,
      roleInstanceId,
      roleDisplayName: input.roleDisplayName ?? "",
      roleStatus: input.roleStatus ?? "available",
      taskQueueReferenceId: input.taskQueueReferenceId ?? "",
      recentInboxMessageReferenceIds: getInputArray(input.recentInboxMessageReferenceIds),
      overnightQueueReferenceId: input.overnightQueueReferenceId ?? "",
      performanceSummary,
      entriesPreparedCount,
      entriesPostedCount,
      entriesDeclinedCount,
      outputsDeliveredCount,
      memoryHealthMetadata: getInputArray(input.memoryHealthMetadata),
      memoryMonthsAccumulated: input.memoryMonthsAccumulated ?? 0,
      viewablePersonaTypes: input.viewablePersonaTypes ?? ROLE_DASHBOARD_VIEWABLE_PERSONA_TYPES,
      dashboardLastUpdatedAt: input.dashboardLastUpdatedAt ?? "",
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
