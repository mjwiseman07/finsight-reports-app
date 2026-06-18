import { stableSnapshotHash } from "../../../../core/hash";
import type { IntegrationBaseContract } from "../../contracts";

export type HrisPayrollService = "gusto" | "adp" | "rippling" | "paychex";
export type HrisPayrollAuthModel = "oauth" | "api_key";
export type HrisPayrollReadScope = "payroll_data" | "fte_data" | "employee_roster" | "pay_history";

export interface BuildHrisPayrollConnectorInput extends Partial<IntegrationBaseContract> {
  connectorId?: string;
  connectorKind?: "hris";
  hrisPayrollService?: HrisPayrollService;
  firmTenantId?: string;
  clientTenantId?: string;
  connectorFrameworkReferenceId?: string;
  authModel?: HrisPayrollAuthModel;
  oauthTokenLifecycleReferenceId?: string;
  readModeSupported?: true;
  readScope?: HrisPayrollReadScope;
  feedsPhase40PayrollCommandCenter?: true;
  feedsPhase39FteIntelligence?: true;
  writeModeSupported?: boolean;
  writeModeEnabled?: false;
  startsReadOnly?: true;
  writeIsRecommendationOnlyByDefault?: true;
  writeModeRequiresHumanApproval?: true;
  writeModeRequiresGovernanceEntry?: true;
  noAutonomousPayrollRun?: true;
  noAutonomousPaymentAuthorization?: true;
  payrollApprovalRequiresHuman?: true;
  inboundDataClassificationReferenceId?: string;
  containsHighSensitivityPii?: true;
  containsSsnAndCompensationData?: true;
  ssnAndCompClassifiedHighestSensitivity?: true;
  containsPII?: true;
  activityAuditChainReferenceId?: string;
  syncStateReferenceId?: string;
  connectorVersionReferenceId?: string;
  dataResidencyReferenceId?: string;
  complianceDesignationReferenceId?: string;
  credentialReferenceId?: string;
  hrisPayrollConnectorComplete?: boolean;
}

export interface SyntheticHrisPayrollConnector extends IntegrationBaseContract {
  hrisPayrollConnectorId: string;
  hrisPayrollConnectorKey: string;
  connectorId: string;
  connectorKind: "hris";
  hrisPayrollService: HrisPayrollService;
  firmTenantId: string;
  clientTenantId: string;
  connectorFrameworkReferenceId: string;
  authModel: HrisPayrollAuthModel;
  oauthTokenLifecycleReferenceId: string;
  readModeSupported: true;
  readScope: HrisPayrollReadScope;
  feedsPhase40PayrollCommandCenter: true;
  feedsPhase39FteIntelligence: true;
  writeModeSupported: boolean;
  writeModeEnabled: false;
  startsReadOnly: true;
  writeIsRecommendationOnlyByDefault: true;
  writeModeRequiresHumanApproval: true;
  writeModeRequiresGovernanceEntry: true;
  noAutonomousPayrollRun: true;
  noAutonomousPaymentAuthorization: true;
  payrollApprovalRequiresHuman: true;
  inboundDataClassificationReferenceId: string;
  containsHighSensitivityPii: true;
  containsSsnAndCompensationData: true;
  ssnAndCompClassifiedHighestSensitivity: true;
  containsPII: true;
  activityAuditChainReferenceId: string;
  syncStateReferenceId: string;
  connectorVersionReferenceId: string;
  dataResidencyReferenceId: string;
  complianceDesignationReferenceId: string;
  credentialReferenceId: string;
  hrisPayrollConnectorComplete: boolean;
}

export interface BuildHrisPayrollConnectorResult {
  hrisPayrollConnector: SyntheticHrisPayrollConnector | null;
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

function getAuthModel(input: BuildHrisPayrollConnectorInput): HrisPayrollAuthModel {
  return input.authModel ?? "oauth";
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

function collectMissingRequiredIdentifiers(input: BuildHrisPayrollConnectorInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.connectorId)) {
    missing.push("connectorId");
  }

  if (!input.hrisPayrollService) {
    missing.push("hrisPayrollService");
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

function buildHrisPayrollConnectorKey(input: BuildHrisPayrollConnectorInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: "hris",
    hrisPayrollService: input.hrisPayrollService ?? "",
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

function buildHrisPayrollConnectorId(input: BuildHrisPayrollConnectorInput): string {
  return `synthetic-hris-payroll-connector:${stableSnapshotHash({
    hrisPayrollConnectorKey: buildHrisPayrollConnectorKey(input),
    artifactType: "SyntheticHrisPayrollConnector",
  })}`;
}

function buildDerivationHash(input: BuildHrisPayrollConnectorInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: "hris",
    hrisPayrollService: input.hrisPayrollService ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    connectorFrameworkReferenceId: input.connectorFrameworkReferenceId ?? "",
    authModel: getAuthModel(input),
    oauthTokenLifecycleReferenceId: input.oauthTokenLifecycleReferenceId ?? "",
    readModeSupported: true,
    readScope: input.readScope ?? "",
    feedsPhase40PayrollCommandCenter: true,
    feedsPhase39FteIntelligence: true,
    writeModeSupported: input.writeModeSupported === true,
    writeModeEnabled: false,
    startsReadOnly: true,
    writeIsRecommendationOnlyByDefault: true,
    writeModeRequiresHumanApproval: true,
    writeModeRequiresGovernanceEntry: true,
    noAutonomousPayrollRun: true,
    noAutonomousPaymentAuthorization: true,
    payrollApprovalRequiresHuman: true,
    inboundDataClassificationReferenceId: input.inboundDataClassificationReferenceId ?? "",
    containsHighSensitivityPii: true,
    containsSsnAndCompensationData: true,
    ssnAndCompClassifiedHighestSensitivity: true,
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

function getWarnings(input: BuildHrisPayrollConnectorInput): string[] {
  return [
    ...getInputArray(input.warnings),
    "HRIS/payroll connector is metadata only; no live HRIS API call, payroll run, payment authorization, or real data pull is performed",
    "live reads, gated writes, and highest-sensitivity PII handling must be validated in the live-execution pass and real-data test register",
    "SSNs and compensation are classified at the highest sensitivity and must never be logged or placed in artifacts in clear form",
  ];
}

export function buildHrisPayrollConnector(input: BuildHrisPayrollConnectorInput): BuildHrisPayrollConnectorResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      hrisPayrollConnector: null,
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
  const requiredHrisPayrollService = input.hrisPayrollService as HrisPayrollService;
  const requiredFirmTenantId = input.firmTenantId as string;
  const requiredClientTenantId = input.clientTenantId as string;
  const requiredConnectorFrameworkReferenceId = input.connectorFrameworkReferenceId as string;
  const requiredOAuthTokenLifecycleReferenceId = input.oauthTokenLifecycleReferenceId as string;
  const requiredReadScope = input.readScope as HrisPayrollReadScope;
  const requiredInboundDataClassificationReferenceId = input.inboundDataClassificationReferenceId as string;
  const requiredActivityAuditChainReferenceId = input.activityAuditChainReferenceId as string;
  const requiredSyncStateReferenceId = input.syncStateReferenceId as string;
  const requiredConnectorVersionReferenceId = input.connectorVersionReferenceId as string;
  const requiredDataResidencyReferenceId = input.dataResidencyReferenceId as string;
  const requiredComplianceDesignationReferenceId = input.complianceDesignationReferenceId as string;
  const requiredCredentialReferenceId = input.credentialReferenceId as string;

  const hrisPayrollConnector: SyntheticHrisPayrollConnector = {
    ...sharedBase,
    hrisPayrollConnectorId: buildHrisPayrollConnectorId(input),
    hrisPayrollConnectorKey: buildHrisPayrollConnectorKey(input),
    connectorId: requiredConnectorId,
    connectorKind: "hris",
    hrisPayrollService: requiredHrisPayrollService,
    firmTenantId: requiredFirmTenantId,
    clientTenantId: requiredClientTenantId,
    connectorFrameworkReferenceId: requiredConnectorFrameworkReferenceId,
    authModel: getAuthModel(input),
    oauthTokenLifecycleReferenceId: requiredOAuthTokenLifecycleReferenceId,
    readModeSupported: true,
    readScope: requiredReadScope,
    feedsPhase40PayrollCommandCenter: true,
    feedsPhase39FteIntelligence: true,
    writeModeSupported: input.writeModeSupported === true,
    writeModeEnabled: false,
    startsReadOnly: true,
    writeIsRecommendationOnlyByDefault: true,
    writeModeRequiresHumanApproval: true,
    writeModeRequiresGovernanceEntry: true,
    noAutonomousPayrollRun: true,
    noAutonomousPaymentAuthorization: true,
    payrollApprovalRequiresHuman: true,
    inboundDataClassificationReferenceId: requiredInboundDataClassificationReferenceId,
    containsHighSensitivityPii: true,
    containsSsnAndCompensationData: true,
    ssnAndCompClassifiedHighestSensitivity: true,
    containsPII: true,
    activityAuditChainReferenceId: requiredActivityAuditChainReferenceId,
    syncStateReferenceId: requiredSyncStateReferenceId,
    connectorVersionReferenceId: requiredConnectorVersionReferenceId,
    dataResidencyReferenceId: requiredDataResidencyReferenceId,
    complianceDesignationReferenceId: requiredComplianceDesignationReferenceId,
    credentialReferenceId: requiredCredentialReferenceId,
    hrisPayrollConnectorComplete: input.hrisPayrollConnectorComplete === true,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input),
  };

  return {
    hrisPayrollConnector,
    skipped: false,
    warnings: hrisPayrollConnector.warnings,
  };
}
