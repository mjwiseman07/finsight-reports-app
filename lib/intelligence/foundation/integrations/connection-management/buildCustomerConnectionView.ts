import { stableSnapshotHash } from "../../../core/hash";
import type { IntegrationBaseContract } from "../contracts";

export type CustomerConnectionAvailableAction =
  | "view"
  | "disconnect"
  | "reauthenticate"
  | "toggle_write_mode"
  | "view_audit_trail";

export interface BuildCustomerConnectionViewInput extends Partial<IntegrationBaseContract> {
  firmTenantId?: string;
  clientTenantId?: string;
  entityReference?: string;
  activeConnectionReferenceIds?: string[];
  connectionHealthReferenceIds?: string[];
  lastSyncReferenceIds?: string[];
  activityAuditChainReferenceIds?: string[];
  availableActions?: CustomerConnectionAvailableAction[];
  disconnectRevokesCredentials?: true;
  viewIsReadOnlyRepresentation?: true;
  customerConnectionViewComplete?: boolean;
}

export interface SyntheticCustomerConnectionView extends IntegrationBaseContract {
  customerConnectionViewId: string;
  customerConnectionViewKey: string;
  firmTenantId: string;
  clientTenantId: string;
  entityReference: string;
  activeConnectionReferenceIds: string[];
  connectionHealthReferenceIds: string[];
  lastSyncReferenceIds: string[];
  activityAuditChainReferenceIds: string[];
  availableActions: CustomerConnectionAvailableAction[];
  disconnectRevokesCredentials: true;
  viewIsReadOnlyRepresentation: true;
  customerConnectionViewComplete: boolean;
}

export interface BuildCustomerConnectionViewResult {
  customerConnectionView: SyntheticCustomerConnectionView | null;
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

function getAvailableActions(input: BuildCustomerConnectionViewInput): CustomerConnectionAvailableAction[] {
  return input.availableActions ?? ["view", "disconnect", "reauthenticate", "toggle_write_mode", "view_audit_trail"];
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

function collectMissingRequiredIdentifiers(input: BuildCustomerConnectionViewInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.firmTenantId)) {
    missing.push("firmTenantId");
  }

  if (!hasValue(input.clientTenantId)) {
    missing.push("clientTenantId");
  }

  if (!hasValue(input.entityReference)) {
    missing.push("entityReference");
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

function buildCustomerConnectionViewKey(input: BuildCustomerConnectionViewInput): string {
  return stableSnapshotHash({
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    entityReference: input.entityReference ?? "",
    activeConnectionReferenceIds: getInputArray(input.activeConnectionReferenceIds),
    connectionHealthReferenceIds: getInputArray(input.connectionHealthReferenceIds),
    lastSyncReferenceIds: getInputArray(input.lastSyncReferenceIds),
    activityAuditChainReferenceIds: getInputArray(input.activityAuditChainReferenceIds),
    availableActions: getAvailableActions(input),
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
  });
}

function buildCustomerConnectionViewId(input: BuildCustomerConnectionViewInput): string {
  return `synthetic-customer-connection-view:${stableSnapshotHash({
    customerConnectionViewKey: buildCustomerConnectionViewKey(input),
    artifactType: "SyntheticCustomerConnectionView",
  })}`;
}

function buildDerivationHash(input: BuildCustomerConnectionViewInput): string {
  return stableSnapshotHash({
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    entityReference: input.entityReference ?? "",
    activeConnectionReferenceIds: getInputArray(input.activeConnectionReferenceIds),
    connectionHealthReferenceIds: getInputArray(input.connectionHealthReferenceIds),
    lastSyncReferenceIds: getInputArray(input.lastSyncReferenceIds),
    activityAuditChainReferenceIds: getInputArray(input.activityAuditChainReferenceIds),
    availableActions: getAvailableActions(input),
    disconnectRevokesCredentials: true,
    viewIsReadOnlyRepresentation: true,
    containsPHI: getContainsPHI(input.containsPHI),
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

export function buildCustomerConnectionView(input: BuildCustomerConnectionViewInput): BuildCustomerConnectionViewResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      customerConnectionView: null,
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
  const requiredFirmTenantId = input.firmTenantId as string;
  const requiredClientTenantId = input.clientTenantId as string;
  const requiredEntityReference = input.entityReference as string;

  const customerConnectionView: SyntheticCustomerConnectionView = {
    ...sharedBase,
    customerConnectionViewId: buildCustomerConnectionViewId(input),
    customerConnectionViewKey: buildCustomerConnectionViewKey(input),
    firmTenantId: requiredFirmTenantId,
    clientTenantId: requiredClientTenantId,
    entityReference: requiredEntityReference,
    activeConnectionReferenceIds: getInputArray(input.activeConnectionReferenceIds),
    connectionHealthReferenceIds: getInputArray(input.connectionHealthReferenceIds),
    lastSyncReferenceIds: getInputArray(input.lastSyncReferenceIds),
    activityAuditChainReferenceIds: getInputArray(input.activityAuditChainReferenceIds),
    availableActions: getAvailableActions(input),
    disconnectRevokesCredentials: true,
    viewIsReadOnlyRepresentation: true,
    customerConnectionViewComplete: input.customerConnectionViewComplete === true,
    derivationHash: buildDerivationHash(input),
  };

  return {
    customerConnectionView,
    skipped: false,
    warnings: customerConnectionView.warnings,
  };
}
