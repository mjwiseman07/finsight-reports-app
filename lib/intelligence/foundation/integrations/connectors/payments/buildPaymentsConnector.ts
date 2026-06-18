import { stableSnapshotHash } from "../../../../core/hash";
import type { IntegrationBaseContract } from "../../contracts";

export type PaymentsService = "stripe" | "ach_processor" | "card_network";
export type PaymentsConnectorAuthModel = "oauth" | "api_key";
export type PaymentsReadScope = "reconciliation" | "settlement" | "transaction_history";

export interface BuildPaymentsConnectorInput extends Partial<IntegrationBaseContract> {
  connectorId?: string;
  connectorKind?: "payments";
  paymentsService?: PaymentsService;
  firmTenantId?: string;
  clientTenantId?: string;
  connectorFrameworkReferenceId?: string;
  authModel?: PaymentsConnectorAuthModel;
  oauthTokenLifecycleReferenceId?: string;
  readModeSupported?: true;
  readScope?: PaymentsReadScope;
  writeModeSupported?: boolean;
  writeModeEnabled?: false;
  startsReadOnly?: true;
  neverAutonomouslyMovesMoney?: true;
  neverAutonomouslyReleasesPayment?: true;
  paymentActionIsRecommendationOnly?: true;
  paymentActionRequiresHumanApproval?: true;
  paymentActionRequiresGovernanceEntry?: true;
  paymentActionRequiresDualConfirmation?: true;
  mostHeavilyGatedConnectorCategory?: true;
  paymentActionRequested?: boolean;
  paymentActionHumanApprovalReferenceId?: string;
  paymentActionGovernanceEntryReferenceId?: string;
  paymentActionDualConfirmationReferenceId?: string;
  inboundDataClassificationReferenceId?: string;
  containsHighSensitivityFinancialData?: true;
  containsPII?: true;
  activityAuditChainReferenceId?: string;
  syncStateReferenceId?: string;
  connectorVersionReferenceId?: string;
  dataResidencyReferenceId?: string;
  complianceDesignationReferenceId?: string;
  credentialReferenceId?: string;
  paymentsConnectorComplete?: boolean;
}

export interface SyntheticPaymentsConnector extends IntegrationBaseContract {
  paymentsConnectorId: string;
  paymentsConnectorKey: string;
  connectorId: string;
  connectorKind: "payments";
  paymentsService: PaymentsService;
  firmTenantId: string;
  clientTenantId: string;
  connectorFrameworkReferenceId: string;
  authModel: PaymentsConnectorAuthModel;
  oauthTokenLifecycleReferenceId: string;
  readModeSupported: true;
  readScope: PaymentsReadScope;
  writeModeSupported: boolean;
  writeModeEnabled: false;
  startsReadOnly: true;
  neverAutonomouslyMovesMoney: true;
  neverAutonomouslyReleasesPayment: true;
  paymentActionIsRecommendationOnly: true;
  paymentActionRequiresHumanApproval: true;
  paymentActionRequiresGovernanceEntry: true;
  paymentActionRequiresDualConfirmation: true;
  mostHeavilyGatedConnectorCategory: true;
  inboundDataClassificationReferenceId: string;
  containsHighSensitivityFinancialData: true;
  containsPII: true;
  activityAuditChainReferenceId: string;
  syncStateReferenceId: string;
  connectorVersionReferenceId: string;
  dataResidencyReferenceId: string;
  complianceDesignationReferenceId: string;
  credentialReferenceId: string;
  paymentsConnectorComplete: boolean;
}

export interface BuildPaymentsConnectorResult {
  paymentsConnector: SyntheticPaymentsConnector | null;
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

function getAuthModel(input: BuildPaymentsConnectorInput): PaymentsConnectorAuthModel {
  return input.authModel ?? (input.paymentsService === "stripe" ? "oauth" : "api_key");
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

function collectMissingRequiredIdentifiers(input: BuildPaymentsConnectorInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.connectorId)) {
    missing.push("connectorId");
  }

  if (!input.paymentsService) {
    missing.push("paymentsService");
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

  if (input.paymentActionRequested === true && !hasValue(input.paymentActionHumanApprovalReferenceId)) {
    missing.push("paymentActionHumanApprovalReferenceId");
  }

  if (input.paymentActionRequested === true && !hasValue(input.paymentActionGovernanceEntryReferenceId)) {
    missing.push("paymentActionGovernanceEntryReferenceId");
  }

  if (input.paymentActionRequested === true && !hasValue(input.paymentActionDualConfirmationReferenceId)) {
    missing.push("paymentActionDualConfirmationReferenceId");
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

function buildPaymentsConnectorKey(input: BuildPaymentsConnectorInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: "payments",
    paymentsService: input.paymentsService ?? "",
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

function buildPaymentsConnectorId(input: BuildPaymentsConnectorInput): string {
  return `synthetic-payments-connector:${stableSnapshotHash({
    paymentsConnectorKey: buildPaymentsConnectorKey(input),
    artifactType: "SyntheticPaymentsConnector",
  })}`;
}

function buildDerivationHash(input: BuildPaymentsConnectorInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: "payments",
    paymentsService: input.paymentsService ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    connectorFrameworkReferenceId: input.connectorFrameworkReferenceId ?? "",
    authModel: getAuthModel(input),
    oauthTokenLifecycleReferenceId: input.oauthTokenLifecycleReferenceId ?? "",
    readModeSupported: true,
    readScope: input.readScope ?? "",
    writeModeSupported: input.writeModeSupported === true,
    writeModeEnabled: false,
    startsReadOnly: true,
    neverAutonomouslyMovesMoney: true,
    neverAutonomouslyReleasesPayment: true,
    paymentActionIsRecommendationOnly: true,
    paymentActionRequiresHumanApproval: true,
    paymentActionRequiresGovernanceEntry: true,
    paymentActionRequiresDualConfirmation: true,
    mostHeavilyGatedConnectorCategory: true,
    inboundDataClassificationReferenceId: input.inboundDataClassificationReferenceId ?? "",
    containsHighSensitivityFinancialData: true,
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

function getWarnings(input: BuildPaymentsConnectorInput): string[] {
  return [
    ...getInputArray(input.warnings),
    "Payments connector is metadata only; no live payments API call, money movement, or real data pull is performed",
    "live reconciliation reads and any gated payment-action flow must be validated in the live-execution pass against real sandboxes",
    "money-movement safety is the highest priority on the real-data test register",
  ];
}

export function buildPaymentsConnector(input: BuildPaymentsConnectorInput): BuildPaymentsConnectorResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      paymentsConnector: null,
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
  const requiredPaymentsService = input.paymentsService as PaymentsService;
  const requiredFirmTenantId = input.firmTenantId as string;
  const requiredClientTenantId = input.clientTenantId as string;
  const requiredConnectorFrameworkReferenceId = input.connectorFrameworkReferenceId as string;
  const requiredOAuthTokenLifecycleReferenceId = input.oauthTokenLifecycleReferenceId as string;
  const requiredReadScope = input.readScope as PaymentsReadScope;
  const requiredInboundDataClassificationReferenceId = input.inboundDataClassificationReferenceId as string;
  const requiredActivityAuditChainReferenceId = input.activityAuditChainReferenceId as string;
  const requiredSyncStateReferenceId = input.syncStateReferenceId as string;
  const requiredConnectorVersionReferenceId = input.connectorVersionReferenceId as string;
  const requiredDataResidencyReferenceId = input.dataResidencyReferenceId as string;
  const requiredComplianceDesignationReferenceId = input.complianceDesignationReferenceId as string;
  const requiredCredentialReferenceId = input.credentialReferenceId as string;

  const paymentsConnector: SyntheticPaymentsConnector = {
    ...sharedBase,
    paymentsConnectorId: buildPaymentsConnectorId(input),
    paymentsConnectorKey: buildPaymentsConnectorKey(input),
    connectorId: requiredConnectorId,
    connectorKind: "payments",
    paymentsService: requiredPaymentsService,
    firmTenantId: requiredFirmTenantId,
    clientTenantId: requiredClientTenantId,
    connectorFrameworkReferenceId: requiredConnectorFrameworkReferenceId,
    authModel: getAuthModel(input),
    oauthTokenLifecycleReferenceId: requiredOAuthTokenLifecycleReferenceId,
    readModeSupported: true,
    readScope: requiredReadScope,
    writeModeSupported: input.writeModeSupported === true,
    writeModeEnabled: false,
    startsReadOnly: true,
    neverAutonomouslyMovesMoney: true,
    neverAutonomouslyReleasesPayment: true,
    paymentActionIsRecommendationOnly: true,
    paymentActionRequiresHumanApproval: true,
    paymentActionRequiresGovernanceEntry: true,
    paymentActionRequiresDualConfirmation: true,
    mostHeavilyGatedConnectorCategory: true,
    inboundDataClassificationReferenceId: requiredInboundDataClassificationReferenceId,
    containsHighSensitivityFinancialData: true,
    containsPII: true,
    activityAuditChainReferenceId: requiredActivityAuditChainReferenceId,
    syncStateReferenceId: requiredSyncStateReferenceId,
    connectorVersionReferenceId: requiredConnectorVersionReferenceId,
    dataResidencyReferenceId: requiredDataResidencyReferenceId,
    complianceDesignationReferenceId: requiredComplianceDesignationReferenceId,
    credentialReferenceId: requiredCredentialReferenceId,
    paymentsConnectorComplete: input.paymentsConnectorComplete === true,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input),
  };

  return {
    paymentsConnector,
    skipped: false,
    warnings: paymentsConnector.warnings,
  };
}
