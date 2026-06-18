import { stableSnapshotHash } from "../../../../core/hash";
import type { IntegrationBaseContract } from "../../contracts";

export interface BuildXeroConnectorInput extends Partial<IntegrationBaseContract> {
  connectorId?: string;
  connectorKind?: "erp";
  connectorService?: "xero";
  firmTenantId?: string;
  clientTenantId?: string;
  connectorFrameworkReferenceId?: string;
  authModel?: "oauth";
  oauthTokenLifecycleReferenceId?: string;
  readModeSupported?: true;
  writeModeSupported?: boolean;
  writeModeEnabled?: false;
  startsReadOnly?: true;
  writeIsRecommendationOnlyByDefault?: true;
  writeModeRequiresHumanApproval?: true;
  writeModeRequiresGovernanceEntry?: true;
  inboundDataClassificationReferenceId?: string;
  activityAuditChainReferenceId?: string;
  syncStateReferenceId?: string;
  connectorVersionReferenceId?: string;
  dataResidencyReferenceId?: string;
  complianceDesignationReferenceId?: string;
  credentialReferenceId?: string;
  phase39XeroAdapterReferenceId?: string;
  reusesPhase39AdapterContracts?: true;
  signAwareClassificationRequired?: true;
  negativeCashReclassToLiabilityRequired?: true;
  contraAccountSignAwareHandlingRequired?: true;
  respectsSourceSystemClassification?: true;
  classificationOverrideRequiresDocumentedRule?: true;
  xeroOverdraftPresentedAsLiabilityHandled?: true;
  classifyBySignAndSourcePresentationNotAccountTypeAlone?: true;
  canonicalMappingReference?: string;
  postsAsDraftNeverAutoApproves?: true;
  xeroConnectorComplete?: boolean;
}

export interface SyntheticXeroConnector extends IntegrationBaseContract {
  xeroConnectorId: string;
  xeroConnectorKey: string;
  connectorId: string;
  connectorKind: "erp";
  connectorService: "xero";
  firmTenantId: string;
  clientTenantId: string;
  connectorFrameworkReferenceId: string;
  authModel: "oauth";
  oauthTokenLifecycleReferenceId: string;
  readModeSupported: true;
  writeModeSupported: boolean;
  writeModeEnabled: false;
  startsReadOnly: true;
  writeIsRecommendationOnlyByDefault: true;
  writeModeRequiresHumanApproval: true;
  writeModeRequiresGovernanceEntry: true;
  inboundDataClassificationReferenceId: string;
  activityAuditChainReferenceId: string;
  syncStateReferenceId: string;
  connectorVersionReferenceId: string;
  dataResidencyReferenceId: string;
  complianceDesignationReferenceId: string;
  credentialReferenceId: string;
  phase39XeroAdapterReferenceId: string;
  reusesPhase39AdapterContracts: true;
  signAwareClassificationRequired: true;
  negativeCashReclassToLiabilityRequired: true;
  contraAccountSignAwareHandlingRequired: true;
  respectsSourceSystemClassification: true;
  classificationOverrideRequiresDocumentedRule: true;
  xeroOverdraftPresentedAsLiabilityHandled: true;
  classifyBySignAndSourcePresentationNotAccountTypeAlone: true;
  canonicalMappingReference: string;
  postsAsDraftNeverAutoApproves: true;
  xeroConnectorComplete: boolean;
}

export interface BuildXeroConnectorResult {
  xeroConnector: SyntheticXeroConnector | null;
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

function collectMissingRequiredIdentifiers(input: BuildXeroConnectorInput): string[] {
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

  if (!hasValue(input.phase39XeroAdapterReferenceId)) {
    missing.push("phase39XeroAdapterReferenceId");
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

function buildXeroConnectorKey(input: BuildXeroConnectorInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: "erp",
    connectorService: "xero",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    connectorFrameworkReferenceId: input.connectorFrameworkReferenceId ?? "",
    authModel: "oauth",
    oauthTokenLifecycleReferenceId: input.oauthTokenLifecycleReferenceId ?? "",
    inboundDataClassificationReferenceId: input.inboundDataClassificationReferenceId ?? "",
    activityAuditChainReferenceId: input.activityAuditChainReferenceId ?? "",
    syncStateReferenceId: input.syncStateReferenceId ?? "",
    connectorVersionReferenceId: input.connectorVersionReferenceId ?? "",
    dataResidencyReferenceId: input.dataResidencyReferenceId ?? "",
    complianceDesignationReferenceId: input.complianceDesignationReferenceId ?? "",
    credentialReferenceId: input.credentialReferenceId ?? "",
    phase39XeroAdapterReferenceId: input.phase39XeroAdapterReferenceId ?? "",
    canonicalMappingReference: input.canonicalMappingReference ?? "",
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
  });
}

function buildXeroConnectorId(input: BuildXeroConnectorInput): string {
  return `synthetic-xero-connector:${stableSnapshotHash({
    xeroConnectorKey: buildXeroConnectorKey(input),
    artifactType: "SyntheticXeroConnector",
  })}`;
}

function buildDerivationHash(input: BuildXeroConnectorInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: "erp",
    connectorService: "xero",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    connectorFrameworkReferenceId: input.connectorFrameworkReferenceId ?? "",
    authModel: "oauth",
    oauthTokenLifecycleReferenceId: input.oauthTokenLifecycleReferenceId ?? "",
    readModeSupported: true,
    writeModeSupported: input.writeModeSupported === true,
    writeModeEnabled: false,
    startsReadOnly: true,
    writeIsRecommendationOnlyByDefault: true,
    writeModeRequiresHumanApproval: true,
    writeModeRequiresGovernanceEntry: true,
    inboundDataClassificationReferenceId: input.inboundDataClassificationReferenceId ?? "",
    activityAuditChainReferenceId: input.activityAuditChainReferenceId ?? "",
    syncStateReferenceId: input.syncStateReferenceId ?? "",
    connectorVersionReferenceId: input.connectorVersionReferenceId ?? "",
    dataResidencyReferenceId: input.dataResidencyReferenceId ?? "",
    complianceDesignationReferenceId: input.complianceDesignationReferenceId ?? "",
    credentialReferenceId: input.credentialReferenceId ?? "",
    phase39XeroAdapterReferenceId: input.phase39XeroAdapterReferenceId ?? "",
    reusesPhase39AdapterContracts: true,
    signAwareClassificationRequired: true,
    negativeCashReclassToLiabilityRequired: true,
    contraAccountSignAwareHandlingRequired: true,
    respectsSourceSystemClassification: true,
    classificationOverrideRequiresDocumentedRule: true,
    xeroOverdraftPresentedAsLiabilityHandled: true,
    classifyBySignAndSourcePresentationNotAccountTypeAlone: true,
    canonicalMappingReference: input.canonicalMappingReference ?? "",
    postsAsDraftNeverAutoApproves: true,
    containsPHI: getContainsPHI(input.containsPHI),
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

function getWarnings(input: BuildXeroConnectorInput): string[] {
  return [
    ...getInputArray(input.warnings),
    "Xero connector is metadata only; no live Xero API call, OAuth flow, or data pull is performed",
    "Xero overdraft/sign-aware classification must be validated against a real Xero sandbox in the live-execution pass",
  ];
}

export function buildXeroConnector(input: BuildXeroConnectorInput): BuildXeroConnectorResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      xeroConnector: null,
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
  const requiredConnectorFrameworkReferenceId = input.connectorFrameworkReferenceId as string;
  const requiredOAuthTokenLifecycleReferenceId = input.oauthTokenLifecycleReferenceId as string;
  const requiredInboundDataClassificationReferenceId = input.inboundDataClassificationReferenceId as string;
  const requiredActivityAuditChainReferenceId = input.activityAuditChainReferenceId as string;
  const requiredSyncStateReferenceId = input.syncStateReferenceId as string;
  const requiredConnectorVersionReferenceId = input.connectorVersionReferenceId as string;
  const requiredDataResidencyReferenceId = input.dataResidencyReferenceId as string;
  const requiredComplianceDesignationReferenceId = input.complianceDesignationReferenceId as string;
  const requiredCredentialReferenceId = input.credentialReferenceId as string;
  const requiredPhase39XeroAdapterReferenceId = input.phase39XeroAdapterReferenceId as string;
  const requiredCanonicalMappingReference = input.canonicalMappingReference as string;

  const xeroConnector: SyntheticXeroConnector = {
    ...sharedBase,
    xeroConnectorId: buildXeroConnectorId(input),
    xeroConnectorKey: buildXeroConnectorKey(input),
    connectorId: requiredConnectorId,
    connectorKind: "erp",
    connectorService: "xero",
    firmTenantId: requiredFirmTenantId,
    clientTenantId: requiredClientTenantId,
    connectorFrameworkReferenceId: requiredConnectorFrameworkReferenceId,
    authModel: "oauth",
    oauthTokenLifecycleReferenceId: requiredOAuthTokenLifecycleReferenceId,
    readModeSupported: true,
    writeModeSupported: input.writeModeSupported === true,
    writeModeEnabled: false,
    startsReadOnly: true,
    writeIsRecommendationOnlyByDefault: true,
    writeModeRequiresHumanApproval: true,
    writeModeRequiresGovernanceEntry: true,
    inboundDataClassificationReferenceId: requiredInboundDataClassificationReferenceId,
    activityAuditChainReferenceId: requiredActivityAuditChainReferenceId,
    syncStateReferenceId: requiredSyncStateReferenceId,
    connectorVersionReferenceId: requiredConnectorVersionReferenceId,
    dataResidencyReferenceId: requiredDataResidencyReferenceId,
    complianceDesignationReferenceId: requiredComplianceDesignationReferenceId,
    credentialReferenceId: requiredCredentialReferenceId,
    phase39XeroAdapterReferenceId: requiredPhase39XeroAdapterReferenceId,
    reusesPhase39AdapterContracts: true,
    signAwareClassificationRequired: true,
    negativeCashReclassToLiabilityRequired: true,
    contraAccountSignAwareHandlingRequired: true,
    respectsSourceSystemClassification: true,
    classificationOverrideRequiresDocumentedRule: true,
    xeroOverdraftPresentedAsLiabilityHandled: true,
    classifyBySignAndSourcePresentationNotAccountTypeAlone: true,
    canonicalMappingReference: requiredCanonicalMappingReference,
    postsAsDraftNeverAutoApproves: true,
    xeroConnectorComplete: input.xeroConnectorComplete === true,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input),
  };

  return {
    xeroConnector,
    skipped: false,
    warnings: xeroConnector.warnings,
  };
}
