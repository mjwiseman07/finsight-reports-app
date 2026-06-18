import { stableSnapshotHash } from "../../../../core/hash";
import type { IntegrationBaseContract } from "../../contracts";

export type CrmService = "salesforce" | "hubspot";
export type CrmReadScope = "customer_data" | "contact_data" | "deal_data" | "activity_history";

export interface BuildCrmConnectorInput extends Partial<IntegrationBaseContract> {
  connectorId?: string;
  connectorKind?: "crm";
  crmService?: CrmService;
  firmTenantId?: string;
  clientTenantId?: string;
  connectorFrameworkReferenceId?: string;
  authModel?: "oauth";
  oauthTokenLifecycleReferenceId?: string;
  readModeSupported?: true;
  readScope?: CrmReadScope;
  informsRevenueCycleAndAr?: true;
  writeModeSupported?: boolean;
  writeModeEnabled?: false;
  startsReadOnly?: true;
  writeScopeLimitedToNotesAndActivityLogging?: true;
  neverAltersFinancialRecords?: true;
  writeIsRecommendationOnlyByDefault?: true;
  writeModeRequiresHumanApproval?: true;
  writeModeRequiresGovernanceEntry?: true;
  inboundDataClassificationReferenceId?: string;
  containsContactPii?: true;
  containsPII?: true;
  activityAuditChainReferenceId?: string;
  syncStateReferenceId?: string;
  connectorVersionReferenceId?: string;
  dataResidencyReferenceId?: string;
  complianceDesignationReferenceId?: string;
  credentialReferenceId?: string;
  crmConnectorComplete?: boolean;
}

export interface SyntheticCrmConnector extends IntegrationBaseContract {
  crmConnectorId: string;
  crmConnectorKey: string;
  connectorId: string;
  connectorKind: "crm";
  crmService: CrmService;
  firmTenantId: string;
  clientTenantId: string;
  connectorFrameworkReferenceId: string;
  authModel: "oauth";
  oauthTokenLifecycleReferenceId: string;
  readModeSupported: true;
  readScope: CrmReadScope;
  informsRevenueCycleAndAr: true;
  writeModeSupported: boolean;
  writeModeEnabled: false;
  startsReadOnly: true;
  writeScopeLimitedToNotesAndActivityLogging: true;
  neverAltersFinancialRecords: true;
  writeIsRecommendationOnlyByDefault: true;
  writeModeRequiresHumanApproval: true;
  writeModeRequiresGovernanceEntry: true;
  inboundDataClassificationReferenceId: string;
  containsContactPii: true;
  containsPII: true;
  activityAuditChainReferenceId: string;
  syncStateReferenceId: string;
  connectorVersionReferenceId: string;
  dataResidencyReferenceId: string;
  complianceDesignationReferenceId: string;
  credentialReferenceId: string;
  crmConnectorComplete: boolean;
}

export interface BuildCrmConnectorResult {
  crmConnector: SyntheticCrmConnector | null;
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

function collectMissingRequiredIdentifiers(input: BuildCrmConnectorInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.connectorId)) {
    missing.push("connectorId");
  }

  if (!input.crmService) {
    missing.push("crmService");
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

function buildCrmConnectorKey(input: BuildCrmConnectorInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: "crm",
    crmService: input.crmService ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    connectorFrameworkReferenceId: input.connectorFrameworkReferenceId ?? "",
    authModel: "oauth",
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

function buildCrmConnectorId(input: BuildCrmConnectorInput): string {
  return `synthetic-crm-connector:${stableSnapshotHash({
    crmConnectorKey: buildCrmConnectorKey(input),
    artifactType: "SyntheticCrmConnector",
  })}`;
}

function buildDerivationHash(input: BuildCrmConnectorInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: "crm",
    crmService: input.crmService ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    connectorFrameworkReferenceId: input.connectorFrameworkReferenceId ?? "",
    authModel: "oauth",
    oauthTokenLifecycleReferenceId: input.oauthTokenLifecycleReferenceId ?? "",
    readModeSupported: true,
    readScope: input.readScope ?? "",
    informsRevenueCycleAndAr: true,
    writeModeSupported: input.writeModeSupported === true,
    writeModeEnabled: false,
    startsReadOnly: true,
    writeScopeLimitedToNotesAndActivityLogging: true,
    neverAltersFinancialRecords: true,
    writeIsRecommendationOnlyByDefault: true,
    writeModeRequiresHumanApproval: true,
    writeModeRequiresGovernanceEntry: true,
    inboundDataClassificationReferenceId: input.inboundDataClassificationReferenceId ?? "",
    containsContactPii: true,
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

function getWarnings(input: BuildCrmConnectorInput): string[] {
  return [
    ...getInputArray(input.warnings),
    "CRM connector is metadata only; no live CRM API call, record read/write, or real data pull is performed",
    "live reads, gated note/activity writes, and PII handling against real CRMs must be validated in the live-execution pass and real-data test register",
    "CRM writes are limited to notes and activity logging and never alter financial records",
  ];
}

export function buildCrmConnector(input: BuildCrmConnectorInput): BuildCrmConnectorResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      crmConnector: null,
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
  const requiredCrmService = input.crmService as CrmService;
  const requiredFirmTenantId = input.firmTenantId as string;
  const requiredClientTenantId = input.clientTenantId as string;
  const requiredConnectorFrameworkReferenceId = input.connectorFrameworkReferenceId as string;
  const requiredOAuthTokenLifecycleReferenceId = input.oauthTokenLifecycleReferenceId as string;
  const requiredReadScope = input.readScope as CrmReadScope;
  const requiredInboundDataClassificationReferenceId = input.inboundDataClassificationReferenceId as string;
  const requiredActivityAuditChainReferenceId = input.activityAuditChainReferenceId as string;
  const requiredSyncStateReferenceId = input.syncStateReferenceId as string;
  const requiredConnectorVersionReferenceId = input.connectorVersionReferenceId as string;
  const requiredDataResidencyReferenceId = input.dataResidencyReferenceId as string;
  const requiredComplianceDesignationReferenceId = input.complianceDesignationReferenceId as string;
  const requiredCredentialReferenceId = input.credentialReferenceId as string;

  const crmConnector: SyntheticCrmConnector = {
    ...sharedBase,
    crmConnectorId: buildCrmConnectorId(input),
    crmConnectorKey: buildCrmConnectorKey(input),
    connectorId: requiredConnectorId,
    connectorKind: "crm",
    crmService: requiredCrmService,
    firmTenantId: requiredFirmTenantId,
    clientTenantId: requiredClientTenantId,
    connectorFrameworkReferenceId: requiredConnectorFrameworkReferenceId,
    authModel: "oauth",
    oauthTokenLifecycleReferenceId: requiredOAuthTokenLifecycleReferenceId,
    readModeSupported: true,
    readScope: requiredReadScope,
    informsRevenueCycleAndAr: true,
    writeModeSupported: input.writeModeSupported === true,
    writeModeEnabled: false,
    startsReadOnly: true,
    writeScopeLimitedToNotesAndActivityLogging: true,
    neverAltersFinancialRecords: true,
    writeIsRecommendationOnlyByDefault: true,
    writeModeRequiresHumanApproval: true,
    writeModeRequiresGovernanceEntry: true,
    inboundDataClassificationReferenceId: requiredInboundDataClassificationReferenceId,
    containsContactPii: true,
    containsPII: true,
    activityAuditChainReferenceId: requiredActivityAuditChainReferenceId,
    syncStateReferenceId: requiredSyncStateReferenceId,
    connectorVersionReferenceId: requiredConnectorVersionReferenceId,
    dataResidencyReferenceId: requiredDataResidencyReferenceId,
    complianceDesignationReferenceId: requiredComplianceDesignationReferenceId,
    credentialReferenceId: requiredCredentialReferenceId,
    crmConnectorComplete: input.crmConnectorComplete === true,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input),
  };

  return {
    crmConnector,
    skipped: false,
    warnings: crmConnector.warnings,
  };
}
