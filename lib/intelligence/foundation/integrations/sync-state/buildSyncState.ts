import { stableSnapshotHash } from "../../../core/hash";
import type { IntegrationBaseContract, IntegrationConnectorKind } from "../contracts";

export type SyncFrequency = "real_time" | "near_real_time" | "batch_hourly" | "batch_daily" | "on_demand";

export type MissedSyncWindowHandler = "fail_closed_escalate_via_phase40F";

export interface BuildSyncStateInput extends Partial<IntegrationBaseContract> {
  connectorId?: string;
  connectorKind?: IntegrationConnectorKind;
  firmTenantId?: string;
  clientTenantId?: string;
  lastSyncTimestamp?: string;
  lastSyncCursor?: string;
  syncFrequency?: SyncFrequency;
  missedSyncWindowHandler?: MissedSyncWindowHandler;
  staleDataThreshold?: string;
  isStale?: boolean;
  staleMarkerMirrorsPhase40Recommendation?: true;
  missedSyncEscalatesViaPhase40F?: true;
  syncStateComplete?: boolean;
}

export interface SyntheticSyncState extends IntegrationBaseContract {
  syncStateId: string;
  syncStateKey: string;
  connectorId: string;
  connectorKind: IntegrationConnectorKind;
  firmTenantId: string;
  clientTenantId: string;
  lastSyncTimestamp: string;
  lastSyncCursor: string;
  syncFrequency: SyncFrequency;
  missedSyncWindowHandler: MissedSyncWindowHandler;
  staleDataThreshold: string;
  isStale: boolean;
  staleMarkerMirrorsPhase40Recommendation: true;
  missedSyncEscalatesViaPhase40F: true;
  syncStateComplete: boolean;
}

export interface BuildSyncStateResult {
  syncState: SyntheticSyncState | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getContainsPHI(inputContainsPHI: boolean | undefined): boolean {
  return inputContainsPHI ?? true;
}

function getSharedBase(input: Partial<IntegrationBaseContract>): IntegrationBaseContract {
  return {
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    phase405StaleMarker: input.phase405StaleMarker ?? "current",
    executable: false,
    executionReady: input.executionReady === true,
    scope: input.scope,
    customerIsolation: input.customerIsolation,
    firmIsolation: input.firmIsolation,
    clientIsolation: input.clientIsolation,
    containsPHI: getContainsPHI(input.containsPHI),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
    derivationHash: "",
    confidenceFloorMetadata: getInputArray(input.confidenceFloorMetadata),
    sourceConfidenceReferenceIds: getInputArray(input.sourceConfidenceReferenceIds),
    evidenceReferenceIds: getInputArray(input.evidenceReferenceIds),
    lineageReferenceIds: getInputArray(input.lineageReferenceIds),
    trustMetadata: getInputArray(input.trustMetadata),
    confidenceMetadata: getInputArray(input.confidenceMetadata),
    governanceMetadata: getInputArray(input.governanceMetadata),
    warnings: getInputArray(input.warnings),
    skippedIndexes: getInputArray(input.skippedIndexes),
  } as IntegrationBaseContract;
}

function collectMissingRequiredIdentifiers(input: BuildSyncStateInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.connectorId)) {
    missing.push("connectorId");
  }

  if (!input.connectorKind) {
    missing.push("connectorKind");
  }

  if (!hasValue(input.firmTenantId)) {
    missing.push("firmTenantId");
  }

  if (!hasValue(input.clientTenantId)) {
    missing.push("clientTenantId");
  }

  if (!hasValue(input.lastSyncTimestamp)) {
    missing.push("lastSyncTimestamp");
  }

  if (!hasValue(input.lastSyncCursor)) {
    missing.push("lastSyncCursor");
  }

  if (!input.syncFrequency) {
    missing.push("syncFrequency");
  }

  if (!hasValue(input.staleDataThreshold)) {
    missing.push("staleDataThreshold");
  }

  if (!hasValue(input.boundPhase40SnapshotHash)) {
    missing.push("boundPhase40SnapshotHash");
  }

  if (!hasValue(input.boundPhase39SnapshotHash)) {
    missing.push("boundPhase39SnapshotHash");
  }

  if (!hasValue(input.boundPhase38SnapshotHash)) {
    missing.push("boundPhase38SnapshotHash");
  }

  if (!input.scope) {
    missing.push("scope");
  }

  if (!input.customerIsolation) {
    missing.push("customerIsolation");
  }

  if (!input.firmIsolation) {
    missing.push("firmIsolation");
  }

  if (!input.clientIsolation) {
    missing.push("clientIsolation");
  }

  return missing;
}

function buildSyncStateKey(input: BuildSyncStateInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: input.connectorKind ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    lastSyncTimestamp: input.lastSyncTimestamp ?? "",
    lastSyncCursor: input.lastSyncCursor ?? "",
    syncFrequency: input.syncFrequency ?? "",
    staleDataThreshold: input.staleDataThreshold ?? "",
    isStale: input.isStale === true,
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
  });
}

function buildSyncStateId(input: BuildSyncStateInput): string {
  return `synthetic-sync-state:${stableSnapshotHash({
    syncStateKey: buildSyncStateKey(input),
    artifactType: "SyntheticSyncState",
  })}`;
}

function buildDerivationHash(input: BuildSyncStateInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: input.connectorKind ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    lastSyncTimestamp: input.lastSyncTimestamp ?? "",
    lastSyncCursor: input.lastSyncCursor ?? "",
    syncFrequency: input.syncFrequency ?? "",
    missedSyncWindowHandler: "fail_closed_escalate_via_phase40F",
    staleDataThreshold: input.staleDataThreshold ?? "",
    isStale: input.isStale === true,
    staleMarkerMirrorsPhase40Recommendation: true,
    missedSyncEscalatesViaPhase40F: true,
    containsPHI: getContainsPHI(input.containsPHI),
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

export function buildSyncState(input: BuildSyncStateInput): BuildSyncStateResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      syncState: null,
      skipped: true,
      warnings: [
        ...getInputArray(input.warnings),
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const sharedBase = getSharedBase({
    ...input,
    containsPHI: getContainsPHI(input.containsPHI),
  });
  const requiredConnectorId = input.connectorId as string;
  const requiredConnectorKind = input.connectorKind as IntegrationConnectorKind;
  const requiredFirmTenantId = input.firmTenantId as string;
  const requiredClientTenantId = input.clientTenantId as string;
  const requiredLastSyncTimestamp = input.lastSyncTimestamp as string;
  const requiredLastSyncCursor = input.lastSyncCursor as string;
  const requiredSyncFrequency = input.syncFrequency as SyncFrequency;
  const requiredStaleDataThreshold = input.staleDataThreshold as string;

  const syncState: SyntheticSyncState = {
    ...sharedBase,
    syncStateId: buildSyncStateId(input),
    syncStateKey: buildSyncStateKey(input),
    connectorId: requiredConnectorId,
    connectorKind: requiredConnectorKind,
    firmTenantId: requiredFirmTenantId,
    clientTenantId: requiredClientTenantId,
    lastSyncTimestamp: requiredLastSyncTimestamp,
    lastSyncCursor: requiredLastSyncCursor,
    syncFrequency: requiredSyncFrequency,
    missedSyncWindowHandler: "fail_closed_escalate_via_phase40F",
    staleDataThreshold: requiredStaleDataThreshold,
    isStale: input.isStale === true,
    staleMarkerMirrorsPhase40Recommendation: true,
    missedSyncEscalatesViaPhase40F: true,
    syncStateComplete: input.syncStateComplete === true,
    derivationHash: buildDerivationHash(input),
    warnings: getInputArray(input.warnings),
  };

  return {
    syncState,
    skipped: false,
    warnings: syncState.warnings,
  };
}
