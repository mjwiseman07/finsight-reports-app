import { stableSnapshotHash } from "../../../../core/hash";
import type { IntegrationBaseContract } from "../../contracts";

export type BankingSource = "plaid" | "direct_bank_feed" | "bai2_file";
export type BankingConnectorAuthModel = "oauth" | "api_key" | "file_based" | "direct_feed";

export interface BuildBankingConnectorInput extends Partial<IntegrationBaseContract> {
  connectorId?: string;
  connectorKind?: "banking";
  bankingSource?: BankingSource;
  firmTenantId?: string;
  clientTenantId?: string;
  connectorFrameworkReferenceId?: string;
  authModel?: BankingConnectorAuthModel;
  oauthTokenLifecycleReferenceId?: string;
  readModeSupported?: true;
  writeModeSupported?: false;
  writeModeEnabled?: false;
  isInboundDataSourceOnly?: true;
  neverWritesToBank?: true;
  startsReadOnly?: true;
  inboundDataClassificationReferenceId?: string;
  containsHighSensitivityFinancialData?: true;
  containsPII?: true;
  bankAccountNumbersClassifiedSensitive?: true;
  activityAuditChainReferenceId?: string;
  syncStateReferenceId?: string;
  connectorVersionReferenceId?: string;
  dataResidencyReferenceId?: string;
  complianceDesignationReferenceId?: string;
  credentialReferenceId?: string;
  bai2FileIntegrityVerificationRequired?: boolean;
  canonicalMappingReference?: string;
  bankingConnectorComplete?: boolean;
}

export interface SyntheticBankingConnector extends IntegrationBaseContract {
  bankingConnectorId: string;
  bankingConnectorKey: string;
  connectorId: string;
  connectorKind: "banking";
  bankingSource: BankingSource;
  firmTenantId: string;
  clientTenantId: string;
  connectorFrameworkReferenceId: string;
  authModel: BankingConnectorAuthModel;
  oauthTokenLifecycleReferenceId: string;
  readModeSupported: true;
  writeModeSupported: false;
  writeModeEnabled: false;
  isInboundDataSourceOnly: true;
  neverWritesToBank: true;
  startsReadOnly: true;
  inboundDataClassificationReferenceId: string;
  containsHighSensitivityFinancialData: true;
  containsPII: true;
  bankAccountNumbersClassifiedSensitive: true;
  activityAuditChainReferenceId: string;
  syncStateReferenceId: string;
  connectorVersionReferenceId: string;
  dataResidencyReferenceId: string;
  complianceDesignationReferenceId: string;
  credentialReferenceId: string;
  bai2FileIntegrityVerificationRequired: boolean;
  canonicalMappingReference: string;
  bankingConnectorComplete: boolean;
}

export interface BuildBankingConnectorResult {
  bankingConnector: SyntheticBankingConnector | null;
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

function getAuthModel(input: BuildBankingConnectorInput): BankingConnectorAuthModel {
  if (input.authModel) {
    return input.authModel;
  }

  if (input.bankingSource === "bai2_file") {
    return "file_based";
  }

  if (input.bankingSource === "direct_bank_feed") {
    return "direct_feed";
  }

  return "oauth";
}

function getBai2FileIntegrityVerificationRequired(input: BuildBankingConnectorInput): boolean {
  return input.bankingSource === "bai2_file" ? true : input.bai2FileIntegrityVerificationRequired === true;
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

function collectMissingRequiredIdentifiers(input: BuildBankingConnectorInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.connectorId)) {
    missing.push("connectorId");
  }

  if (!input.bankingSource) {
    missing.push("bankingSource");
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

  if (!hasValue(input.canonicalMappingReference)) {
    missing.push("canonicalMappingReference");
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

function buildBankingConnectorKey(input: BuildBankingConnectorInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: "banking",
    bankingSource: input.bankingSource ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    connectorFrameworkReferenceId: input.connectorFrameworkReferenceId ?? "",
    authModel: getAuthModel(input),
    oauthTokenLifecycleReferenceId: input.oauthTokenLifecycleReferenceId ?? "",
    inboundDataClassificationReferenceId: input.inboundDataClassificationReferenceId ?? "",
    activityAuditChainReferenceId: input.activityAuditChainReferenceId ?? "",
    syncStateReferenceId: input.syncStateReferenceId ?? "",
    connectorVersionReferenceId: input.connectorVersionReferenceId ?? "",
    dataResidencyReferenceId: input.dataResidencyReferenceId ?? "",
    complianceDesignationReferenceId: input.complianceDesignationReferenceId ?? "",
    credentialReferenceId: input.credentialReferenceId ?? "",
    bai2FileIntegrityVerificationRequired: getBai2FileIntegrityVerificationRequired(input),
    canonicalMappingReference: input.canonicalMappingReference ?? "",
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
  });
}

function buildBankingConnectorId(input: BuildBankingConnectorInput): string {
  return `synthetic-banking-connector:${stableSnapshotHash({
    bankingConnectorKey: buildBankingConnectorKey(input),
    artifactType: "SyntheticBankingConnector",
  })}`;
}

function buildDerivationHash(input: BuildBankingConnectorInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: "banking",
    bankingSource: input.bankingSource ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    connectorFrameworkReferenceId: input.connectorFrameworkReferenceId ?? "",
    authModel: getAuthModel(input),
    oauthTokenLifecycleReferenceId: input.oauthTokenLifecycleReferenceId ?? "",
    readModeSupported: true,
    writeModeSupported: false,
    writeModeEnabled: false,
    isInboundDataSourceOnly: true,
    neverWritesToBank: true,
    startsReadOnly: true,
    inboundDataClassificationReferenceId: input.inboundDataClassificationReferenceId ?? "",
    containsHighSensitivityFinancialData: true,
    containsPII: true,
    bankAccountNumbersClassifiedSensitive: true,
    activityAuditChainReferenceId: input.activityAuditChainReferenceId ?? "",
    syncStateReferenceId: input.syncStateReferenceId ?? "",
    connectorVersionReferenceId: input.connectorVersionReferenceId ?? "",
    dataResidencyReferenceId: input.dataResidencyReferenceId ?? "",
    complianceDesignationReferenceId: input.complianceDesignationReferenceId ?? "",
    credentialReferenceId: input.credentialReferenceId ?? "",
    bai2FileIntegrityVerificationRequired: getBai2FileIntegrityVerificationRequired(input),
    canonicalMappingReference: input.canonicalMappingReference ?? "",
    containsPHI: getContainsPHI(input.containsPHI),
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

function getWarnings(input: BuildBankingConnectorInput): string[] {
  return [
    ...getInputArray(input.warnings),
    "Banking connector is metadata only; no live Plaid or bank API call, BAI2 parsing, or data pull is performed",
    "live Plaid linking, direct bank feeds, BAI2 parsing, and sensitive-data handling must be validated in the live-execution pass and real-data test register",
    "bank account numbers are classified sensitive and must never be logged or placed in artifacts in clear form",
  ];
}

export function buildBankingConnector(input: BuildBankingConnectorInput): BuildBankingConnectorResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      bankingConnector: null,
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
  const requiredBankingSource = input.bankingSource as BankingSource;
  const requiredFirmTenantId = input.firmTenantId as string;
  const requiredClientTenantId = input.clientTenantId as string;
  const requiredConnectorFrameworkReferenceId = input.connectorFrameworkReferenceId as string;
  const requiredOAuthTokenLifecycleReferenceId = input.oauthTokenLifecycleReferenceId as string;
  const requiredInboundDataClassificationReferenceId = input.inboundDataClassificationReferenceId as string;
  const requiredActivityAuditChainReferenceId = input.activityAuditChainReferenceId as string;
  const requiredSyncStateReferenceId = input.syncStateReferenceId as string;
  const requiredConnectorVersionReferenceId = input.connectorVersionReferenceId as string;
  const requiredDataResidencyReferenceId = input.dataResidencyReferenceId as string;
  const requiredComplianceDesignationReferenceId = input.complianceDesignationReferenceId as string;
  const requiredCredentialReferenceId = input.credentialReferenceId as string;
  const requiredCanonicalMappingReference = input.canonicalMappingReference as string;

  const bankingConnector: SyntheticBankingConnector = {
    ...sharedBase,
    bankingConnectorId: buildBankingConnectorId(input),
    bankingConnectorKey: buildBankingConnectorKey(input),
    connectorId: requiredConnectorId,
    connectorKind: "banking",
    bankingSource: requiredBankingSource,
    firmTenantId: requiredFirmTenantId,
    clientTenantId: requiredClientTenantId,
    connectorFrameworkReferenceId: requiredConnectorFrameworkReferenceId,
    authModel: getAuthModel(input),
    oauthTokenLifecycleReferenceId: requiredOAuthTokenLifecycleReferenceId,
    readModeSupported: true,
    writeModeSupported: false,
    writeModeEnabled: false,
    isInboundDataSourceOnly: true,
    neverWritesToBank: true,
    startsReadOnly: true,
    inboundDataClassificationReferenceId: requiredInboundDataClassificationReferenceId,
    containsHighSensitivityFinancialData: true,
    containsPII: true,
    bankAccountNumbersClassifiedSensitive: true,
    activityAuditChainReferenceId: requiredActivityAuditChainReferenceId,
    syncStateReferenceId: requiredSyncStateReferenceId,
    connectorVersionReferenceId: requiredConnectorVersionReferenceId,
    dataResidencyReferenceId: requiredDataResidencyReferenceId,
    complianceDesignationReferenceId: requiredComplianceDesignationReferenceId,
    credentialReferenceId: requiredCredentialReferenceId,
    bai2FileIntegrityVerificationRequired: getBai2FileIntegrityVerificationRequired(input),
    canonicalMappingReference: requiredCanonicalMappingReference,
    bankingConnectorComplete: input.bankingConnectorComplete === true,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input),
  };

  return {
    bankingConnector,
    skipped: false,
    warnings: bankingConnector.warnings,
  };
}
