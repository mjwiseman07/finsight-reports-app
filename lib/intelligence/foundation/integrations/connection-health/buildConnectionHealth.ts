import { stableSnapshotHash } from "../../../core/hash";
import type { IntegrationBaseContract, IntegrationConnectionHealthStatus, IntegrationConnectorKind } from "../contracts";

export interface ConnectionTelemetryMetadata {
  requestVolume: string;
  errorRate: string;
  averageLatency: string;
  tokenRefreshSuccessRate: string;
  webhookDeliverySuccessRate: string;
  customerFacingReliabilityMetric: string;
}

export interface BuildConnectionHealthInput extends Partial<IntegrationBaseContract> {
  connectorId?: string;
  connectorKind?: IntegrationConnectorKind;
  firmTenantId?: string;
  clientTenantId?: string;
  healthStatus?: IntegrationConnectionHealthStatus;
  lastSuccessfulOperationReference?: string;
  telemetryMetadata?: ConnectionTelemetryMetadata;
  telemetryIsOperationalMetricsOnly?: true;
  noCustomerBehaviorProfiling?: true;
  feedsPhase40GHealth?: true;
  failClosedOnFailure?: true;
  connectionHealthComplete?: boolean;
}

export interface SyntheticConnectionHealth extends IntegrationBaseContract {
  connectionHealthId: string;
  connectionHealthKey: string;
  connectorId: string;
  connectorKind: IntegrationConnectorKind;
  firmTenantId: string;
  clientTenantId: string;
  healthStatus: IntegrationConnectionHealthStatus;
  lastSuccessfulOperationReference: string;
  telemetryMetadata: ConnectionTelemetryMetadata;
  telemetryIsOperationalMetricsOnly: true;
  noCustomerBehaviorProfiling: true;
  feedsPhase40GHealth: true;
  failClosedOnFailure: true;
  connectionHealthComplete: boolean;
}

export interface BuildConnectionHealthResult {
  connectionHealth: SyntheticConnectionHealth | null;
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

function getTelemetryMetadata(telemetryMetadata: ConnectionTelemetryMetadata | undefined): ConnectionTelemetryMetadata {
  return {
    requestVolume: telemetryMetadata?.requestVolume ?? "",
    errorRate: telemetryMetadata?.errorRate ?? "",
    averageLatency: telemetryMetadata?.averageLatency ?? "",
    tokenRefreshSuccessRate: telemetryMetadata?.tokenRefreshSuccessRate ?? "",
    webhookDeliverySuccessRate: telemetryMetadata?.webhookDeliverySuccessRate ?? "",
    customerFacingReliabilityMetric: telemetryMetadata?.customerFacingReliabilityMetric ?? "",
  };
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

function collectMissingRequiredIdentifiers(input: BuildConnectionHealthInput): string[] {
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

  if (!input.healthStatus) {
    missing.push("healthStatus");
  }

  if (!hasValue(input.lastSuccessfulOperationReference)) {
    missing.push("lastSuccessfulOperationReference");
  }

  if (!input.telemetryMetadata) {
    missing.push("telemetryMetadata");
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

function buildConnectionHealthKey(input: BuildConnectionHealthInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: input.connectorKind ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    healthStatus: input.healthStatus ?? "",
    lastSuccessfulOperationReference: input.lastSuccessfulOperationReference ?? "",
    telemetryMetadata: getTelemetryMetadata(input.telemetryMetadata),
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
  });
}

function buildConnectionHealthId(input: BuildConnectionHealthInput): string {
  return `synthetic-connection-health:${stableSnapshotHash({
    connectionHealthKey: buildConnectionHealthKey(input),
    artifactType: "SyntheticConnectionHealth",
  })}`;
}

function buildDerivationHash(input: BuildConnectionHealthInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: input.connectorKind ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    healthStatus: input.healthStatus ?? "",
    lastSuccessfulOperationReference: input.lastSuccessfulOperationReference ?? "",
    telemetryMetadata: getTelemetryMetadata(input.telemetryMetadata),
    telemetryIsOperationalMetricsOnly: true,
    noCustomerBehaviorProfiling: true,
    feedsPhase40GHealth: true,
    failClosedOnFailure: true,
    containsPHI: getContainsPHI(input.containsPHI),
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

function getWarnings(input: BuildConnectionHealthInput): string[] {
  return [
    ...getInputArray(input.warnings),
    ...(input.healthStatus === "failed" ? ["connection health failed and must fail closed"] : []),
    ...(input.healthStatus === "degraded" ? ["connection health degraded and should be monitored"] : []),
    "telemetry metadata is operational metrics only and does not profile customer behavior",
  ];
}

export function buildConnectionHealth(input: BuildConnectionHealthInput): BuildConnectionHealthResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      connectionHealth: null,
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
  const requiredHealthStatus = input.healthStatus as IntegrationConnectionHealthStatus;
  const requiredLastSuccessfulOperationReference = input.lastSuccessfulOperationReference as string;

  const connectionHealth: SyntheticConnectionHealth = {
    ...sharedBase,
    connectionHealthId: buildConnectionHealthId(input),
    connectionHealthKey: buildConnectionHealthKey(input),
    connectorId: requiredConnectorId,
    connectorKind: requiredConnectorKind,
    firmTenantId: requiredFirmTenantId,
    clientTenantId: requiredClientTenantId,
    healthStatus: requiredHealthStatus,
    lastSuccessfulOperationReference: requiredLastSuccessfulOperationReference,
    telemetryMetadata: getTelemetryMetadata(input.telemetryMetadata),
    telemetryIsOperationalMetricsOnly: true,
    noCustomerBehaviorProfiling: true,
    feedsPhase40GHealth: true,
    failClosedOnFailure: true,
    connectionHealthComplete: input.connectionHealthComplete === true,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input),
  };

  return {
    connectionHealth,
    skipped: false,
    warnings: connectionHealth.warnings,
  };
}
