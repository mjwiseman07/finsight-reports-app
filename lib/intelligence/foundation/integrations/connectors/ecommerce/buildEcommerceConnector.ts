import { stableSnapshotHash } from "../../../../core/hash";
import type { IntegrationBaseContract } from "../../contracts";

export type EcommerceService = "shopify" | "amazon" | "woocommerce";
export type EcommerceAuthModel = "oauth" | "api_key";
export type EcommerceReadScope = "orders" | "fees" | "settlements" | "refunds" | "transaction_history";

export interface BuildEcommerceConnectorInput extends Partial<IntegrationBaseContract> {
  connectorId?: string;
  connectorKind?: "ecommerce";
  ecommerceService?: EcommerceService;
  firmTenantId?: string;
  clientTenantId?: string;
  connectorFrameworkReferenceId?: string;
  authModel?: EcommerceAuthModel;
  oauthTokenLifecycleReferenceId?: string;
  readModeSupported?: true;
  readScope?: EcommerceReadScope;
  feedsRevenueRecognitionAndReconciliation?: true;
  highTransactionVolume?: true;
  rateLimitCoordinationCritical?: true;
  syncStateDisciplineCritical?: true;
  writeModeSupported?: boolean;
  writeModeEnabled?: false;
  startsReadOnly?: true;
  writeIsRecommendationOnlyByDefault?: true;
  writeModeRequiresHumanApproval?: true;
  writeModeRequiresGovernanceEntry?: true;
  inboundDataClassificationReferenceId?: string;
  containsCustomerPii?: true;
  containsPII?: true;
  activityAuditChainReferenceId?: string;
  syncStateReferenceId?: string;
  connectorVersionReferenceId?: string;
  dataResidencyReferenceId?: string;
  complianceDesignationReferenceId?: string;
  credentialReferenceId?: string;
  ecommerceConnectorComplete?: boolean;
}

export interface SyntheticEcommerceConnector extends IntegrationBaseContract {
  ecommerceConnectorId: string;
  ecommerceConnectorKey: string;
  connectorId: string;
  connectorKind: "ecommerce";
  ecommerceService: EcommerceService;
  firmTenantId: string;
  clientTenantId: string;
  connectorFrameworkReferenceId: string;
  authModel: EcommerceAuthModel;
  oauthTokenLifecycleReferenceId: string;
  readModeSupported: true;
  readScope: EcommerceReadScope;
  feedsRevenueRecognitionAndReconciliation: true;
  highTransactionVolume: true;
  rateLimitCoordinationCritical: true;
  syncStateDisciplineCritical: true;
  writeModeSupported: boolean;
  writeModeEnabled: false;
  startsReadOnly: true;
  writeIsRecommendationOnlyByDefault: true;
  writeModeRequiresHumanApproval: true;
  writeModeRequiresGovernanceEntry: true;
  inboundDataClassificationReferenceId: string;
  containsCustomerPii: true;
  containsPII: true;
  activityAuditChainReferenceId: string;
  syncStateReferenceId: string;
  connectorVersionReferenceId: string;
  dataResidencyReferenceId: string;
  complianceDesignationReferenceId: string;
  credentialReferenceId: string;
  ecommerceConnectorComplete: boolean;
}

export interface BuildEcommerceConnectorResult {
  ecommerceConnector: SyntheticEcommerceConnector | null;
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

function getAuthModel(input: BuildEcommerceConnectorInput): EcommerceAuthModel {
  return input.authModel ?? (input.ecommerceService === "woocommerce" ? "api_key" : "oauth");
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

function collectMissingRequiredIdentifiers(input: BuildEcommerceConnectorInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.connectorId)) {
    missing.push("connectorId");
  }

  if (!input.ecommerceService) {
    missing.push("ecommerceService");
  }

  if (!hasValue(input.firmTenantId)) {
    missing.push("firmTenantId");
  }

  if (!hasValue(input.clientTenantId)) {
    missing.push("clientTenantId");
  }

  if (!hasValue(input.connectorFrameworkReferenceId)) {
    missing.push("connectorFrameworkReferenceId");
  }

  if (!hasValue(input.oauthTokenLifecycleReferenceId)) {
    missing.push("oauthTokenLifecycleReferenceId");
  }

  if (!input.readScope) {
    missing.push("readScope");
  }

  if (!hasValue(input.inboundDataClassificationReferenceId)) {
    missing.push("inboundDataClassificationReferenceId");
  }

  if (!hasValue(input.activityAuditChainReferenceId)) {
    missing.push("activityAuditChainReferenceId");
  }

  if (!hasValue(input.syncStateReferenceId)) {
    missing.push("syncStateReferenceId");
  }

  if (!hasValue(input.connectorVersionReferenceId)) {
    missing.push("connectorVersionReferenceId");
  }

  if (!hasValue(input.dataResidencyReferenceId)) {
    missing.push("dataResidencyReferenceId");
  }

  if (!hasValue(input.complianceDesignationReferenceId)) {
    missing.push("complianceDesignationReferenceId");
  }

  if (!hasValue(input.credentialReferenceId)) {
    missing.push("credentialReferenceId");
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

function buildEcommerceConnectorKey(input: BuildEcommerceConnectorInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: "ecommerce",
    ecommerceService: input.ecommerceService ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    connectorFrameworkReferenceId: input.connectorFrameworkReferenceId ?? "",
    authModel: getAuthModel(input),
    oauthTokenLifecycleReferenceId: input.oauthTokenLifecycleReferenceId ?? "",
    readScope: input.readScope ?? "",
    inboundDataClassificationReferenceId: input.inboundDataClassificationReferenceId ?? "",
    activityAuditChainReferenceId: input.activityAuditChainReferenceId ?? "",
    syncStateReferenceId: input.syncStateReferenceId ?? "",
    connectorVersionReferenceId: input.connectorVersionReferenceId ?? "",
    dataResidencyReferenceId: input.dataResidencyReferenceId ?? "",
    complianceDesignationReferenceId: input.complianceDesignationReferenceId ?? "",
    credentialReferenceId: input.credentialReferenceId ?? "",
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
  });
}

function buildEcommerceConnectorId(input: BuildEcommerceConnectorInput): string {
  return `synthetic-ecommerce-connector:${stableSnapshotHash({
    ecommerceConnectorKey: buildEcommerceConnectorKey(input),
    artifactType: "SyntheticEcommerceConnector",
  })}`;
}

function buildDerivationHash(input: BuildEcommerceConnectorInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: "ecommerce",
    ecommerceService: input.ecommerceService ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    connectorFrameworkReferenceId: input.connectorFrameworkReferenceId ?? "",
    authModel: getAuthModel(input),
    oauthTokenLifecycleReferenceId: input.oauthTokenLifecycleReferenceId ?? "",
    readModeSupported: true,
    readScope: input.readScope ?? "",
    feedsRevenueRecognitionAndReconciliation: true,
    highTransactionVolume: true,
    rateLimitCoordinationCritical: true,
    syncStateDisciplineCritical: true,
    writeModeSupported: input.writeModeSupported === true,
    writeModeEnabled: false,
    startsReadOnly: true,
    writeIsRecommendationOnlyByDefault: true,
    writeModeRequiresHumanApproval: true,
    writeModeRequiresGovernanceEntry: true,
    inboundDataClassificationReferenceId: input.inboundDataClassificationReferenceId ?? "",
    containsCustomerPii: true,
    containsPII: true,
    activityAuditChainReferenceId: input.activityAuditChainReferenceId ?? "",
    syncStateReferenceId: input.syncStateReferenceId ?? "",
    connectorVersionReferenceId: input.connectorVersionReferenceId ?? "",
    dataResidencyReferenceId: input.dataResidencyReferenceId ?? "",
    complianceDesignationReferenceId: input.complianceDesignationReferenceId ?? "",
    credentialReferenceId: input.credentialReferenceId ?? "",
    containsPHI: getContainsPHI(input.containsPHI),
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

function getWarnings(input: BuildEcommerceConnectorInput): string[] {
  return [
    ...getInputArray(input.warnings),
    "E-commerce connector is metadata only; no live e-commerce API call or real order data pull is performed",
    "live high-volume reads, rate-limit behavior, incremental sync, and PII handling must be validated in the live-execution pass and real-data test register",
    "rate-limit coordination and sync-state discipline are critical so one tenant's volume does not consume another tenant's capacity or duplicate transactions",
  ];
}

export function buildEcommerceConnector(input: BuildEcommerceConnectorInput): BuildEcommerceConnectorResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      ecommerceConnector: null,
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
  const requiredEcommerceService = input.ecommerceService as EcommerceService;
  const requiredFirmTenantId = input.firmTenantId as string;
  const requiredClientTenantId = input.clientTenantId as string;
  const requiredConnectorFrameworkReferenceId = input.connectorFrameworkReferenceId as string;
  const requiredOAuthTokenLifecycleReferenceId = input.oauthTokenLifecycleReferenceId as string;
  const requiredReadScope = input.readScope as EcommerceReadScope;
  const requiredInboundDataClassificationReferenceId = input.inboundDataClassificationReferenceId as string;
  const requiredActivityAuditChainReferenceId = input.activityAuditChainReferenceId as string;
  const requiredSyncStateReferenceId = input.syncStateReferenceId as string;
  const requiredConnectorVersionReferenceId = input.connectorVersionReferenceId as string;
  const requiredDataResidencyReferenceId = input.dataResidencyReferenceId as string;
  const requiredComplianceDesignationReferenceId = input.complianceDesignationReferenceId as string;
  const requiredCredentialReferenceId = input.credentialReferenceId as string;

  const ecommerceConnector: SyntheticEcommerceConnector = {
    ...sharedBase,
    ecommerceConnectorId: buildEcommerceConnectorId(input),
    ecommerceConnectorKey: buildEcommerceConnectorKey(input),
    connectorId: requiredConnectorId,
    connectorKind: "ecommerce",
    ecommerceService: requiredEcommerceService,
    firmTenantId: requiredFirmTenantId,
    clientTenantId: requiredClientTenantId,
    connectorFrameworkReferenceId: requiredConnectorFrameworkReferenceId,
    authModel: getAuthModel(input),
    oauthTokenLifecycleReferenceId: requiredOAuthTokenLifecycleReferenceId,
    readModeSupported: true,
    readScope: requiredReadScope,
    feedsRevenueRecognitionAndReconciliation: true,
    highTransactionVolume: true,
    rateLimitCoordinationCritical: true,
    syncStateDisciplineCritical: true,
    writeModeSupported: input.writeModeSupported === true,
    writeModeEnabled: false,
    startsReadOnly: true,
    writeIsRecommendationOnlyByDefault: true,
    writeModeRequiresHumanApproval: true,
    writeModeRequiresGovernanceEntry: true,
    inboundDataClassificationReferenceId: requiredInboundDataClassificationReferenceId,
    containsCustomerPii: true,
    containsPII: true,
    activityAuditChainReferenceId: requiredActivityAuditChainReferenceId,
    syncStateReferenceId: requiredSyncStateReferenceId,
    connectorVersionReferenceId: requiredConnectorVersionReferenceId,
    dataResidencyReferenceId: requiredDataResidencyReferenceId,
    complianceDesignationReferenceId: requiredComplianceDesignationReferenceId,
    credentialReferenceId: requiredCredentialReferenceId,
    ecommerceConnectorComplete: input.ecommerceConnectorComplete === true,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input),
  };

  return {
    ecommerceConnector,
    skipped: false,
    warnings: ecommerceConnector.warnings,
  };
}
