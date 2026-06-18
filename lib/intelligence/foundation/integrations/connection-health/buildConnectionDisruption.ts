import { stableSnapshotHash } from "../../../core/hash";
import type { IntegrationBaseContract } from "../contracts";

export type ConnectionDisruptionType =
  | "credential_error"
  | "token_refresh_failure"
  | "upstream_outage"
  | "rate_limit_exhaustion"
  | "network_failure"
  | "other";

export interface BuildConnectionDisruptionInput extends Partial<IntegrationBaseContract> {
  connectorId?: string;
  firmTenantId?: string;
  clientTenantId?: string;
  disruptionType?: ConnectionDisruptionType;
  gracePeriodBeforeStaleFlag?: string;
  gracePeriodBeforeCustomerAlert?: string;
  gracePeriodBeforeAutoSuspend?: string;
  reconnectionPlaybookReference?: string;
  escalatesViaPhase40F?: true;
  surfacesCustomerStatusAndImpact?: true;
  impactedDownstreamWorkflowReferenceIds?: string[];
  failClosedOnDisruption?: true;
  connectionDisruptionComplete?: boolean;
}

export interface SyntheticConnectionDisruption extends IntegrationBaseContract {
  connectionDisruptionId: string;
  connectionDisruptionKey: string;
  connectorId: string;
  firmTenantId: string;
  clientTenantId: string;
  disruptionType: ConnectionDisruptionType;
  gracePeriodBeforeStaleFlag: string;
  gracePeriodBeforeCustomerAlert: string;
  gracePeriodBeforeAutoSuspend: string;
  reconnectionPlaybookReference: string;
  escalatesViaPhase40F: true;
  surfacesCustomerStatusAndImpact: true;
  impactedDownstreamWorkflowReferenceIds: string[];
  failClosedOnDisruption: true;
  connectionDisruptionComplete: boolean;
}

export interface BuildConnectionDisruptionResult {
  connectionDisruption: SyntheticConnectionDisruption | null;
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

function collectMissingRequiredIdentifiers(input: BuildConnectionDisruptionInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.connectorId)) {
    missing.push("connectorId");
  }

  if (!hasValue(input.firmTenantId)) {
    missing.push("firmTenantId");
  }

  if (!hasValue(input.clientTenantId)) {
    missing.push("clientTenantId");
  }

  if (!input.disruptionType) {
    missing.push("disruptionType");
  }

  if (!hasValue(input.gracePeriodBeforeStaleFlag)) {
    missing.push("gracePeriodBeforeStaleFlag");
  }

  if (!hasValue(input.gracePeriodBeforeCustomerAlert)) {
    missing.push("gracePeriodBeforeCustomerAlert");
  }

  if (!hasValue(input.gracePeriodBeforeAutoSuspend)) {
    missing.push("gracePeriodBeforeAutoSuspend");
  }

  if (!hasValue(input.reconnectionPlaybookReference)) {
    missing.push("reconnectionPlaybookReference");
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

function buildConnectionDisruptionKey(input: BuildConnectionDisruptionInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    disruptionType: input.disruptionType ?? "",
    gracePeriodBeforeStaleFlag: input.gracePeriodBeforeStaleFlag ?? "",
    gracePeriodBeforeCustomerAlert: input.gracePeriodBeforeCustomerAlert ?? "",
    gracePeriodBeforeAutoSuspend: input.gracePeriodBeforeAutoSuspend ?? "",
    reconnectionPlaybookReference: input.reconnectionPlaybookReference ?? "",
    impactedDownstreamWorkflowReferenceIds: getInputArray(input.impactedDownstreamWorkflowReferenceIds),
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
  });
}

function buildConnectionDisruptionId(input: BuildConnectionDisruptionInput): string {
  return `synthetic-connection-disruption:${stableSnapshotHash({
    connectionDisruptionKey: buildConnectionDisruptionKey(input),
    artifactType: "SyntheticConnectionDisruption",
  })}`;
}

function buildDerivationHash(input: BuildConnectionDisruptionInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    disruptionType: input.disruptionType ?? "",
    gracePeriodBeforeStaleFlag: input.gracePeriodBeforeStaleFlag ?? "",
    gracePeriodBeforeCustomerAlert: input.gracePeriodBeforeCustomerAlert ?? "",
    gracePeriodBeforeAutoSuspend: input.gracePeriodBeforeAutoSuspend ?? "",
    reconnectionPlaybookReference: input.reconnectionPlaybookReference ?? "",
    escalatesViaPhase40F: true,
    surfacesCustomerStatusAndImpact: true,
    impactedDownstreamWorkflowReferenceIds: getInputArray(input.impactedDownstreamWorkflowReferenceIds),
    failClosedOnDisruption: true,
    containsPHI: getContainsPHI(input.containsPHI),
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

function getWarnings(input: BuildConnectionDisruptionInput): string[] {
  return [
    ...getInputArray(input.warnings),
    "connection disruption is metadata only; escalation and auto-suspend execution are not performed",
    ...(input.disruptionType === "rate_limit_exhaustion"
      ? ["rate limit exhaustion must escalate via Phase 40F"]
      : []),
  ];
}

export function buildConnectionDisruption(
  input: BuildConnectionDisruptionInput,
): BuildConnectionDisruptionResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      connectionDisruption: null,
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
  const requiredFirmTenantId = input.firmTenantId as string;
  const requiredClientTenantId = input.clientTenantId as string;
  const requiredDisruptionType = input.disruptionType as ConnectionDisruptionType;
  const requiredGracePeriodBeforeStaleFlag = input.gracePeriodBeforeStaleFlag as string;
  const requiredGracePeriodBeforeCustomerAlert = input.gracePeriodBeforeCustomerAlert as string;
  const requiredGracePeriodBeforeAutoSuspend = input.gracePeriodBeforeAutoSuspend as string;
  const requiredReconnectionPlaybookReference = input.reconnectionPlaybookReference as string;

  const connectionDisruption: SyntheticConnectionDisruption = {
    ...sharedBase,
    connectionDisruptionId: buildConnectionDisruptionId(input),
    connectionDisruptionKey: buildConnectionDisruptionKey(input),
    connectorId: requiredConnectorId,
    firmTenantId: requiredFirmTenantId,
    clientTenantId: requiredClientTenantId,
    disruptionType: requiredDisruptionType,
    gracePeriodBeforeStaleFlag: requiredGracePeriodBeforeStaleFlag,
    gracePeriodBeforeCustomerAlert: requiredGracePeriodBeforeCustomerAlert,
    gracePeriodBeforeAutoSuspend: requiredGracePeriodBeforeAutoSuspend,
    reconnectionPlaybookReference: requiredReconnectionPlaybookReference,
    escalatesViaPhase40F: true,
    surfacesCustomerStatusAndImpact: true,
    impactedDownstreamWorkflowReferenceIds: getInputArray(input.impactedDownstreamWorkflowReferenceIds),
    failClosedOnDisruption: true,
    connectionDisruptionComplete: input.connectionDisruptionComplete === true,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input),
  };

  return {
    connectionDisruption,
    skipped: false,
    warnings: connectionDisruption.warnings,
  };
}
