import { stableSnapshotHash } from "../../../core/hash";
import type { IntegrationBaseContract, IntegrationConnectorKind } from "../contracts";

export interface ConnectorFrameworkCapabilityNegotiation {
  availableEndpoints: string[];
  availableScopes: string[];
  tierLimitations: string[];
}

export interface BuildConnectorFrameworkInput extends Partial<IntegrationBaseContract> {
  connectorId?: string;
  connectorKind?: IntegrationConnectorKind;
  firmTenantId?: string;
  clientTenantId?: string;
  readModeSupported?: boolean;
  writeModeSupported?: boolean;
  writeModeEnabled?: false;
  startsReadOnly?: true;
  writeIsRecommendationOnlyByDefault?: true;
  writeModeRequiresHumanApproval?: true;
  rateLimitReference?: string;
  retryPolicyReference?: string;
  capabilityNegotiation?: ConnectorFrameworkCapabilityNegotiation;
  capabilityGatedFeaturesFailClosed?: true;
  crossTenantRateLimitCoordinationRequired?: boolean;
  perTenantQuotaWithinAggregateLimit?: true;
  rateLimitExhaustionEscalatesViaPhase40F?: true;
  sandboxModeSupported?: boolean;
  isSandbox?: boolean;
  sandboxCannotEnableWriteMode?: true;
  sandboxDataSegregatedFromProduction?: true;
  connectorFrameworkComplete?: boolean;
}

export interface SyntheticConnectorFramework extends IntegrationBaseContract {
  connectorFrameworkId: string;
  connectorFrameworkKey: string;
  connectorId: string;
  connectorKind: IntegrationConnectorKind;
  firmTenantId: string;
  clientTenantId: string;
  readModeSupported: boolean;
  writeModeSupported: boolean;
  writeModeEnabled: false;
  startsReadOnly: true;
  writeIsRecommendationOnlyByDefault: true;
  writeModeRequiresHumanApproval: true;
  rateLimitReference: string;
  retryPolicyReference: string;
  capabilityNegotiation: ConnectorFrameworkCapabilityNegotiation;
  capabilityGatedFeaturesFailClosed: true;
  crossTenantRateLimitCoordinationRequired: boolean;
  perTenantQuotaWithinAggregateLimit: true;
  rateLimitExhaustionEscalatesViaPhase40F: true;
  sandboxModeSupported: boolean;
  isSandbox: boolean;
  sandboxCannotEnableWriteMode: true;
  sandboxDataSegregatedFromProduction: true;
  connectorFrameworkComplete: boolean;
}

export interface BuildConnectorFrameworkResult {
  connectorFramework: SyntheticConnectorFramework | null;
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

function getCapabilityNegotiation(
  capabilityNegotiation: ConnectorFrameworkCapabilityNegotiation | undefined,
): ConnectorFrameworkCapabilityNegotiation {
  return {
    availableEndpoints: getInputArray(capabilityNegotiation?.availableEndpoints),
    availableScopes: getInputArray(capabilityNegotiation?.availableScopes),
    tierLimitations: getInputArray(capabilityNegotiation?.tierLimitations),
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

function collectMissingRequiredIdentifiers(input: BuildConnectorFrameworkInput): string[] {
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

  if (!hasValue(input.rateLimitReference)) {
    missing.push("rateLimitReference");
  }

  if (!hasValue(input.retryPolicyReference)) {
    missing.push("retryPolicyReference");
  }

  if (!input.capabilityNegotiation) {
    missing.push("capabilityNegotiation");
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

function buildConnectorFrameworkKey(input: BuildConnectorFrameworkInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: input.connectorKind ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    readModeSupported: input.readModeSupported === true,
    writeModeSupported: input.writeModeSupported === true,
    writeModeEnabled: false,
    rateLimitReference: input.rateLimitReference ?? "",
    retryPolicyReference: input.retryPolicyReference ?? "",
    capabilityNegotiation: getCapabilityNegotiation(input.capabilityNegotiation),
    crossTenantRateLimitCoordinationRequired: input.crossTenantRateLimitCoordinationRequired === true,
    sandboxModeSupported: input.sandboxModeSupported === true,
    isSandbox: input.isSandbox === true,
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
  });
}

function buildConnectorFrameworkId(input: BuildConnectorFrameworkInput): string {
  return `synthetic-connector-framework:${stableSnapshotHash({
    connectorFrameworkKey: buildConnectorFrameworkKey(input),
    artifactType: "SyntheticConnectorFramework",
  })}`;
}

function buildDerivationHash(input: BuildConnectorFrameworkInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: input.connectorKind ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    readModeSupported: input.readModeSupported === true,
    writeModeSupported: input.writeModeSupported === true,
    writeModeEnabled: false,
    startsReadOnly: true,
    writeIsRecommendationOnlyByDefault: true,
    writeModeRequiresHumanApproval: true,
    rateLimitReference: input.rateLimitReference ?? "",
    retryPolicyReference: input.retryPolicyReference ?? "",
    capabilityNegotiation: getCapabilityNegotiation(input.capabilityNegotiation),
    capabilityGatedFeaturesFailClosed: true,
    crossTenantRateLimitCoordinationRequired: input.crossTenantRateLimitCoordinationRequired === true,
    perTenantQuotaWithinAggregateLimit: true,
    rateLimitExhaustionEscalatesViaPhase40F: true,
    sandboxModeSupported: input.sandboxModeSupported === true,
    isSandbox: input.isSandbox === true,
    sandboxCannotEnableWriteMode: true,
    sandboxDataSegregatedFromProduction: true,
    containsPHI: getContainsPHI(input.containsPHI),
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

function getWarnings(input: BuildConnectorFrameworkInput): string[] {
  return [
    ...getInputArray(input.warnings),
    ...(input.isSandbox === true ? ["sandbox connector framework cannot enable write mode"] : []),
    ...(input.crossTenantRateLimitCoordinationRequired === true
      ? ["cross-tenant rate-limit coordination required by aggregate upstream limit"]
      : []),
  ];
}

export function buildConnectorFramework(input: BuildConnectorFrameworkInput): BuildConnectorFrameworkResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      connectorFramework: null,
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
  const requiredRateLimitReference = input.rateLimitReference as string;
  const requiredRetryPolicyReference = input.retryPolicyReference as string;

  const connectorFramework: SyntheticConnectorFramework = {
    ...sharedBase,
    connectorFrameworkId: buildConnectorFrameworkId(input),
    connectorFrameworkKey: buildConnectorFrameworkKey(input),
    connectorId: requiredConnectorId,
    connectorKind: requiredConnectorKind,
    firmTenantId: requiredFirmTenantId,
    clientTenantId: requiredClientTenantId,
    readModeSupported: input.readModeSupported === true,
    writeModeSupported: input.writeModeSupported === true,
    writeModeEnabled: false,
    startsReadOnly: true,
    writeIsRecommendationOnlyByDefault: true,
    writeModeRequiresHumanApproval: true,
    rateLimitReference: requiredRateLimitReference,
    retryPolicyReference: requiredRetryPolicyReference,
    capabilityNegotiation: getCapabilityNegotiation(input.capabilityNegotiation),
    capabilityGatedFeaturesFailClosed: true,
    crossTenantRateLimitCoordinationRequired: input.crossTenantRateLimitCoordinationRequired === true,
    perTenantQuotaWithinAggregateLimit: true,
    rateLimitExhaustionEscalatesViaPhase40F: true,
    sandboxModeSupported: input.sandboxModeSupported === true,
    isSandbox: input.isSandbox === true,
    sandboxCannotEnableWriteMode: true,
    sandboxDataSegregatedFromProduction: true,
    connectorFrameworkComplete: input.connectorFrameworkComplete === true,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input),
  };

  return {
    connectorFramework,
    skipped: false,
    warnings: connectorFramework.warnings,
  };
}
