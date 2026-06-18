import { stableSnapshotHash } from "../../../../core/hash";
import type { IntegrationBaseContract } from "../../contracts";

export type NetSuiteConnectorAuthModel = "token_based_auth" | "oauth";

export interface BuildNetSuiteConnectorInput extends Partial<IntegrationBaseContract> {
  connectorId?: string;
  connectorKind?: "erp";
  connectorService?: "netsuite";
  firmTenantId?: string;
  clientTenantId?: string;
  connectorFrameworkReferenceId?: string;
  authModel?: NetSuiteConnectorAuthModel;
  oauthTokenLifecycleReferenceId?: string;
  tokenBasedAuthSupported?: boolean;
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
  phase39NetSuiteAdapterReferenceId?: string;
  reusesPhase39AdapterContracts?: true;
  signAwareClassificationRequired?: true;
  negativeCashReclassToLiabilityRequired?: true;
  contraAccountSignAwareHandlingRequired?: true;
  respectsSourceSystemClassification?: true;
  classificationOverrideRequiresDocumentedRule?: true;
  nativeMultiSubsidiarySupported?: true;
  multiSubsidiaryScopedToTenant?: true;
  subsidiaryScopeReferenceIds?: string[];
  canonicalMappingReference?: string;
  postsAsDraftNeverAutoApproves?: true;
  netSuiteConnectorComplete?: boolean;
}

export interface SyntheticNetSuiteConnector extends IntegrationBaseContract {
  netSuiteConnectorId: string;
  netSuiteConnectorKey: string;
  connectorId: string;
  connectorKind: "erp";
  connectorService: "netsuite";
  firmTenantId: string;
  clientTenantId: string;
  connectorFrameworkReferenceId: string;
  authModel: NetSuiteConnectorAuthModel;
  oauthTokenLifecycleReferenceId: string;
  tokenBasedAuthSupported: boolean;
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
  phase39NetSuiteAdapterReferenceId: string;
  reusesPhase39AdapterContracts: true;
  signAwareClassificationRequired: true;
  negativeCashReclassToLiabilityRequired: true;
  contraAccountSignAwareHandlingRequired: true;
  respectsSourceSystemClassification: true;
  classificationOverrideRequiresDocumentedRule: true;
  nativeMultiSubsidiarySupported: true;
  multiSubsidiaryScopedToTenant: true;
  subsidiaryScopeReferenceIds: string[];
  canonicalMappingReference: string;
  postsAsDraftNeverAutoApproves: true;
  netSuiteConnectorComplete: boolean;
}

export interface BuildNetSuiteConnectorResult {
  netSuiteConnector: SyntheticNetSuiteConnector | null;
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

function getAuthModel(input: BuildNetSuiteConnectorInput): NetSuiteConnectorAuthModel {
  return input.authModel ?? (input.tokenBasedAuthSupported === true ? "token_based_auth" : "oauth");
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

function collectMissingRequiredIdentifiers(input: BuildNetSuiteConnectorInput): string[] {
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

  if (!hasValue(input.phase39NetSuiteAdapterReferenceId)) {
    missing.push("phase39NetSuiteAdapterReferenceId");
  }

  if (getInputArray(input.subsidiaryScopeReferenceIds).length === 0) {
    missing.push("subsidiaryScopeReferenceIds");
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

function buildNetSuiteConnectorKey(input: BuildNetSuiteConnectorInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: "erp",
    connectorService: "netsuite",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    connectorFrameworkReferenceId: input.connectorFrameworkReferenceId ?? "",
    authModel: getAuthModel(input),
    oauthTokenLifecycleReferenceId: input.oauthTokenLifecycleReferenceId ?? "",
    tokenBasedAuthSupported: input.tokenBasedAuthSupported === true,
    inboundDataClassificationReferenceId: input.inboundDataClassificationReferenceId ?? "",
    activityAuditChainReferenceId: input.activityAuditChainReferenceId ?? "",
    syncStateReferenceId: input.syncStateReferenceId ?? "",
    connectorVersionReferenceId: input.connectorVersionReferenceId ?? "",
    dataResidencyReferenceId: input.dataResidencyReferenceId ?? "",
    complianceDesignationReferenceId: input.complianceDesignationReferenceId ?? "",
    credentialReferenceId: input.credentialReferenceId ?? "",
    phase39NetSuiteAdapterReferenceId: input.phase39NetSuiteAdapterReferenceId ?? "",
    subsidiaryScopeReferenceIds: getInputArray(input.subsidiaryScopeReferenceIds),
    canonicalMappingReference: input.canonicalMappingReference ?? "",
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
  });
}

function buildNetSuiteConnectorId(input: BuildNetSuiteConnectorInput): string {
  return `synthetic-netsuite-connector:${stableSnapshotHash({
    netSuiteConnectorKey: buildNetSuiteConnectorKey(input),
    artifactType: "SyntheticNetSuiteConnector",
  })}`;
}

function buildDerivationHash(input: BuildNetSuiteConnectorInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: "erp",
    connectorService: "netsuite",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    connectorFrameworkReferenceId: input.connectorFrameworkReferenceId ?? "",
    authModel: getAuthModel(input),
    oauthTokenLifecycleReferenceId: input.oauthTokenLifecycleReferenceId ?? "",
    tokenBasedAuthSupported: input.tokenBasedAuthSupported === true,
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
    phase39NetSuiteAdapterReferenceId: input.phase39NetSuiteAdapterReferenceId ?? "",
    reusesPhase39AdapterContracts: true,
    signAwareClassificationRequired: true,
    negativeCashReclassToLiabilityRequired: true,
    contraAccountSignAwareHandlingRequired: true,
    respectsSourceSystemClassification: true,
    classificationOverrideRequiresDocumentedRule: true,
    nativeMultiSubsidiarySupported: true,
    multiSubsidiaryScopedToTenant: true,
    subsidiaryScopeReferenceIds: getInputArray(input.subsidiaryScopeReferenceIds),
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

function getWarnings(input: BuildNetSuiteConnectorInput): string[] {
  return [
    ...getInputArray(input.warnings),
    "NetSuite connector is metadata only; no live NetSuite API call, auth flow, or data pull is performed",
    "live NetSuite subsidiary scoping, TBA/OAuth handling, and sign-aware classification must be validated in the live-execution pass",
  ];
}

export function buildNetSuiteConnector(input: BuildNetSuiteConnectorInput): BuildNetSuiteConnectorResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      netSuiteConnector: null,
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
  const requiredPhase39NetSuiteAdapterReferenceId = input.phase39NetSuiteAdapterReferenceId as string;
  const requiredCanonicalMappingReference = input.canonicalMappingReference as string;

  const netSuiteConnector: SyntheticNetSuiteConnector = {
    ...sharedBase,
    netSuiteConnectorId: buildNetSuiteConnectorId(input),
    netSuiteConnectorKey: buildNetSuiteConnectorKey(input),
    connectorId: requiredConnectorId,
    connectorKind: "erp",
    connectorService: "netsuite",
    firmTenantId: requiredFirmTenantId,
    clientTenantId: requiredClientTenantId,
    connectorFrameworkReferenceId: requiredConnectorFrameworkReferenceId,
    authModel: getAuthModel(input),
    oauthTokenLifecycleReferenceId: requiredOAuthTokenLifecycleReferenceId,
    tokenBasedAuthSupported: input.tokenBasedAuthSupported === true,
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
    phase39NetSuiteAdapterReferenceId: requiredPhase39NetSuiteAdapterReferenceId,
    reusesPhase39AdapterContracts: true,
    signAwareClassificationRequired: true,
    negativeCashReclassToLiabilityRequired: true,
    contraAccountSignAwareHandlingRequired: true,
    respectsSourceSystemClassification: true,
    classificationOverrideRequiresDocumentedRule: true,
    nativeMultiSubsidiarySupported: true,
    multiSubsidiaryScopedToTenant: true,
    subsidiaryScopeReferenceIds: getInputArray(input.subsidiaryScopeReferenceIds),
    canonicalMappingReference: requiredCanonicalMappingReference,
    postsAsDraftNeverAutoApproves: true,
    netSuiteConnectorComplete: input.netSuiteConnectorComplete === true,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input),
  };

  return {
    netSuiteConnector,
    skipped: false,
    warnings: netSuiteConnector.warnings,
  };
}
