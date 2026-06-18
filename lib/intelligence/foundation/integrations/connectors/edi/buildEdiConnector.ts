import { stableSnapshotHash } from "../../../../core/hash";
import type { IntegrationBaseContract } from "../../contracts";

export type EdiStandard = "x12";
export type EdiTransactionSet = "810" | "850" | "855" | "856" | "997";
export type EdiAuthModel = "file_based" | "direct_feed";

export interface BuildEdiConnectorInput extends Partial<IntegrationBaseContract> {
  connectorId?: string;
  connectorKind?: "edi";
  ediStandard?: EdiStandard;
  supportedTransactionSets?: EdiTransactionSet[];
  tradingPartnerReference?: string;
  firmTenantId?: string;
  clientTenantId?: string;
  connectorFrameworkReferenceId?: string;
  authModel?: EdiAuthModel;
  readModeSupported?: true;
  inboundDocumentIntegrityVerificationRequired?: true;
  failClosedOnMalformedEdi?: true;
  partnerSpecificMappingRequired?: true;
  writeModeSupported?: boolean;
  writeModeEnabled?: false;
  startsReadOnly?: true;
  functionalAcknowledgment997IsProtocolResponse?: true;
  acknowledgment997GatedUnderWriteDiscipline?: true;
  outboundTransactionIsRecommendationOnlyByDefault?: true;
  outboundTransactionRequiresHumanApproval?: true;
  outboundTransactionRequiresGovernanceEntry?: true;
  neverAutonomousBusinessAction?: true;
  inboundDataClassificationReferenceId?: string;
  activityAuditChainReferenceId?: string;
  syncStateReferenceId?: string;
  connectorVersionReferenceId?: string;
  dataResidencyReferenceId?: string;
  complianceDesignationReferenceId?: string;
  credentialReferenceId?: string;
  canonicalMappingReference?: string;
  ediConnectorComplete?: boolean;
}

export interface SyntheticEdiConnector extends IntegrationBaseContract {
  ediConnectorId: string;
  ediConnectorKey: string;
  connectorId: string;
  connectorKind: "edi";
  ediStandard: "x12";
  supportedTransactionSets: EdiTransactionSet[];
  tradingPartnerReference: string;
  firmTenantId: string;
  clientTenantId: string;
  connectorFrameworkReferenceId: string;
  authModel: EdiAuthModel;
  readModeSupported: true;
  inboundDocumentIntegrityVerificationRequired: true;
  failClosedOnMalformedEdi: true;
  partnerSpecificMappingRequired: true;
  writeModeSupported: boolean;
  writeModeEnabled: false;
  startsReadOnly: true;
  functionalAcknowledgment997IsProtocolResponse: true;
  acknowledgment997GatedUnderWriteDiscipline: true;
  outboundTransactionIsRecommendationOnlyByDefault: true;
  outboundTransactionRequiresHumanApproval: true;
  outboundTransactionRequiresGovernanceEntry: true;
  neverAutonomousBusinessAction: true;
  inboundDataClassificationReferenceId: string;
  activityAuditChainReferenceId: string;
  syncStateReferenceId: string;
  connectorVersionReferenceId: string;
  dataResidencyReferenceId: string;
  complianceDesignationReferenceId: string;
  credentialReferenceId: string;
  canonicalMappingReference: string;
  ediConnectorComplete: boolean;
}

export interface BuildEdiConnectorResult {
  ediConnector: SyntheticEdiConnector | null;
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

function getAuthModel(input: BuildEdiConnectorInput): EdiAuthModel {
  return input.authModel ?? "file_based";
}

function getSupportedTransactionSets(input: BuildEdiConnectorInput): EdiTransactionSet[] {
  return getInputArray(input.supportedTransactionSets);
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

function collectMissingRequiredIdentifiers(input: BuildEdiConnectorInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.connectorId)) {
    missing.push("connectorId");
  }

  if (getSupportedTransactionSets(input).length === 0) {
    missing.push("supportedTransactionSets");
  }

  if (!hasValue(input.tradingPartnerReference)) {
    missing.push("tradingPartnerReference");
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

function buildEdiConnectorKey(input: BuildEdiConnectorInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: "edi",
    ediStandard: "x12",
    supportedTransactionSets: getSupportedTransactionSets(input),
    tradingPartnerReference: input.tradingPartnerReference ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    connectorFrameworkReferenceId: input.connectorFrameworkReferenceId ?? "",
    authModel: getAuthModel(input),
    inboundDataClassificationReferenceId: input.inboundDataClassificationReferenceId ?? "",
    activityAuditChainReferenceId: input.activityAuditChainReferenceId ?? "",
    syncStateReferenceId: input.syncStateReferenceId ?? "",
    connectorVersionReferenceId: input.connectorVersionReferenceId ?? "",
    dataResidencyReferenceId: input.dataResidencyReferenceId ?? "",
    complianceDesignationReferenceId: input.complianceDesignationReferenceId ?? "",
    credentialReferenceId: input.credentialReferenceId ?? "",
    canonicalMappingReference: input.canonicalMappingReference ?? "",
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
  });
}

function buildEdiConnectorId(input: BuildEdiConnectorInput): string {
  return `synthetic-edi-connector:${stableSnapshotHash({
    ediConnectorKey: buildEdiConnectorKey(input),
    artifactType: "SyntheticEdiConnector",
  })}`;
}

function buildDerivationHash(input: BuildEdiConnectorInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: "edi",
    ediStandard: "x12",
    supportedTransactionSets: getSupportedTransactionSets(input),
    tradingPartnerReference: input.tradingPartnerReference ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    connectorFrameworkReferenceId: input.connectorFrameworkReferenceId ?? "",
    authModel: getAuthModel(input),
    readModeSupported: true,
    inboundDocumentIntegrityVerificationRequired: true,
    failClosedOnMalformedEdi: true,
    partnerSpecificMappingRequired: true,
    writeModeSupported: input.writeModeSupported === true,
    writeModeEnabled: false,
    startsReadOnly: true,
    functionalAcknowledgment997IsProtocolResponse: true,
    acknowledgment997GatedUnderWriteDiscipline: true,
    outboundTransactionIsRecommendationOnlyByDefault: true,
    outboundTransactionRequiresHumanApproval: true,
    outboundTransactionRequiresGovernanceEntry: true,
    neverAutonomousBusinessAction: true,
    inboundDataClassificationReferenceId: input.inboundDataClassificationReferenceId ?? "",
    activityAuditChainReferenceId: input.activityAuditChainReferenceId ?? "",
    syncStateReferenceId: input.syncStateReferenceId ?? "",
    connectorVersionReferenceId: input.connectorVersionReferenceId ?? "",
    dataResidencyReferenceId: input.dataResidencyReferenceId ?? "",
    complianceDesignationReferenceId: input.complianceDesignationReferenceId ?? "",
    credentialReferenceId: input.credentialReferenceId ?? "",
    canonicalMappingReference: input.canonicalMappingReference ?? "",
    containsPHI: getContainsPHI(input.containsPHI),
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

function getWarnings(input: BuildEdiConnectorInput): string[] {
  return [
    ...getInputArray(input.warnings),
    "EDI connector is metadata only; no live EDI transmission, X12 parsing, acknowledgment emission, or real data exchange is performed",
    "live partner exchange, X12 parsing, integrity verification, and gated outbound transactions must be validated in the live-execution pass and real-data test register",
    "997 functional acknowledgment is a protocol response gated under write discipline, never an autonomous business action",
  ];
}

export function buildEdiConnector(input: BuildEdiConnectorInput): BuildEdiConnectorResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      ediConnector: null,
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
  const requiredTradingPartnerReference = input.tradingPartnerReference as string;
  const requiredFirmTenantId = input.firmTenantId as string;
  const requiredClientTenantId = input.clientTenantId as string;
  const requiredConnectorFrameworkReferenceId = input.connectorFrameworkReferenceId as string;
  const requiredInboundDataClassificationReferenceId = input.inboundDataClassificationReferenceId as string;
  const requiredActivityAuditChainReferenceId = input.activityAuditChainReferenceId as string;
  const requiredSyncStateReferenceId = input.syncStateReferenceId as string;
  const requiredConnectorVersionReferenceId = input.connectorVersionReferenceId as string;
  const requiredDataResidencyReferenceId = input.dataResidencyReferenceId as string;
  const requiredComplianceDesignationReferenceId = input.complianceDesignationReferenceId as string;
  const requiredCredentialReferenceId = input.credentialReferenceId as string;
  const requiredCanonicalMappingReference = input.canonicalMappingReference as string;

  const ediConnector: SyntheticEdiConnector = {
    ...sharedBase,
    ediConnectorId: buildEdiConnectorId(input),
    ediConnectorKey: buildEdiConnectorKey(input),
    connectorId: requiredConnectorId,
    connectorKind: "edi",
    ediStandard: "x12",
    supportedTransactionSets: getSupportedTransactionSets(input),
    tradingPartnerReference: requiredTradingPartnerReference,
    firmTenantId: requiredFirmTenantId,
    clientTenantId: requiredClientTenantId,
    connectorFrameworkReferenceId: requiredConnectorFrameworkReferenceId,
    authModel: getAuthModel(input),
    readModeSupported: true,
    inboundDocumentIntegrityVerificationRequired: true,
    failClosedOnMalformedEdi: true,
    partnerSpecificMappingRequired: true,
    writeModeSupported: input.writeModeSupported === true,
    writeModeEnabled: false,
    startsReadOnly: true,
    functionalAcknowledgment997IsProtocolResponse: true,
    acknowledgment997GatedUnderWriteDiscipline: true,
    outboundTransactionIsRecommendationOnlyByDefault: true,
    outboundTransactionRequiresHumanApproval: true,
    outboundTransactionRequiresGovernanceEntry: true,
    neverAutonomousBusinessAction: true,
    inboundDataClassificationReferenceId: requiredInboundDataClassificationReferenceId,
    activityAuditChainReferenceId: requiredActivityAuditChainReferenceId,
    syncStateReferenceId: requiredSyncStateReferenceId,
    connectorVersionReferenceId: requiredConnectorVersionReferenceId,
    dataResidencyReferenceId: requiredDataResidencyReferenceId,
    complianceDesignationReferenceId: requiredComplianceDesignationReferenceId,
    credentialReferenceId: requiredCredentialReferenceId,
    canonicalMappingReference: requiredCanonicalMappingReference,
    ediConnectorComplete: input.ediConnectorComplete === true,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input),
  };

  return {
    ediConnector,
    skipped: false,
    warnings: ediConnector.warnings,
  };
}
