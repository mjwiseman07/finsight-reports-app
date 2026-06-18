import { stableSnapshotHash } from "../../../../core/hash";
import type { IntegrationBaseContract } from "../../contracts";

export type EmailService = "google_workspace" | "microsoft_365";

export interface BuildEmailConnectorInput extends Partial<IntegrationBaseContract> {
  connectorId?: string;
  connectorKind?: "email";
  emailService?: EmailService;
  firmTenantId?: string;
  clientTenantId?: string;
  connectorFrameworkReferenceId?: string;
  authModel?: "oauth";
  oauthTokenLifecycleReferenceId?: string;
  readModeSupported?: true;
  inboundIntakeFirst?: true;
  feedsPhase39EmailIntake?: true;
  phase39EmailIntakeReferenceId?: string;
  sendModeSupported?: boolean;
  sendModeEnabled?: false;
  startsReadOnly?: true;
  sendIsRecommendationOnlyByDefault?: true;
  sendModeRequiresHumanApproval?: true;
  sendModeRequiresGovernanceEntry?: true;
  clientEmailDefaultOff?: true;
  neverSendsToClientWithoutHumanEnablement?: true;
  scheduledDocCheckingDefaultOff?: true;
  inboundDataClassificationReferenceId?: string;
  emailMayContainPhiPii?: true;
  emailClassifiedAtIngest?: true;
  activityAuditChainReferenceId?: string;
  syncStateReferenceId?: string;
  connectorVersionReferenceId?: string;
  dataResidencyReferenceId?: string;
  complianceDesignationReferenceId?: string;
  credentialReferenceId?: string;
  emailConnectorComplete?: boolean;
}

export interface SyntheticEmailConnector extends IntegrationBaseContract {
  emailConnectorId: string;
  emailConnectorKey: string;
  connectorId: string;
  connectorKind: "email";
  emailService: EmailService;
  firmTenantId: string;
  clientTenantId: string;
  connectorFrameworkReferenceId: string;
  authModel: "oauth";
  oauthTokenLifecycleReferenceId: string;
  readModeSupported: true;
  inboundIntakeFirst: true;
  feedsPhase39EmailIntake: true;
  phase39EmailIntakeReferenceId: string;
  sendModeSupported: boolean;
  sendModeEnabled: false;
  startsReadOnly: true;
  sendIsRecommendationOnlyByDefault: true;
  sendModeRequiresHumanApproval: true;
  sendModeRequiresGovernanceEntry: true;
  clientEmailDefaultOff: true;
  neverSendsToClientWithoutHumanEnablement: true;
  scheduledDocCheckingDefaultOff: true;
  inboundDataClassificationReferenceId: string;
  emailMayContainPhiPii: true;
  emailClassifiedAtIngest: true;
  activityAuditChainReferenceId: string;
  syncStateReferenceId: string;
  connectorVersionReferenceId: string;
  dataResidencyReferenceId: string;
  complianceDesignationReferenceId: string;
  credentialReferenceId: string;
  emailConnectorComplete: boolean;
}

export interface BuildEmailConnectorResult {
  emailConnector: SyntheticEmailConnector | null;
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

function collectMissingRequiredIdentifiers(input: BuildEmailConnectorInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.connectorId)) {
    missing.push("connectorId");
  }

  if (!input.emailService) {
    missing.push("emailService");
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

  if (!hasValue(input.phase39EmailIntakeReferenceId)) {
    missing.push("phase39EmailIntakeReferenceId");
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

function buildEmailConnectorKey(input: BuildEmailConnectorInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: "email",
    emailService: input.emailService ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    connectorFrameworkReferenceId: input.connectorFrameworkReferenceId ?? "",
    authModel: "oauth",
    oauthTokenLifecycleReferenceId: input.oauthTokenLifecycleReferenceId ?? "",
    phase39EmailIntakeReferenceId: input.phase39EmailIntakeReferenceId ?? "",
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

function buildEmailConnectorId(input: BuildEmailConnectorInput): string {
  return `synthetic-email-connector:${stableSnapshotHash({
    emailConnectorKey: buildEmailConnectorKey(input),
    artifactType: "SyntheticEmailConnector",
  })}`;
}

function buildDerivationHash(input: BuildEmailConnectorInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: "email",
    emailService: input.emailService ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    connectorFrameworkReferenceId: input.connectorFrameworkReferenceId ?? "",
    authModel: "oauth",
    oauthTokenLifecycleReferenceId: input.oauthTokenLifecycleReferenceId ?? "",
    readModeSupported: true,
    inboundIntakeFirst: true,
    feedsPhase39EmailIntake: true,
    phase39EmailIntakeReferenceId: input.phase39EmailIntakeReferenceId ?? "",
    sendModeSupported: input.sendModeSupported === true,
    sendModeEnabled: false,
    startsReadOnly: true,
    sendIsRecommendationOnlyByDefault: true,
    sendModeRequiresHumanApproval: true,
    sendModeRequiresGovernanceEntry: true,
    clientEmailDefaultOff: true,
    neverSendsToClientWithoutHumanEnablement: true,
    scheduledDocCheckingDefaultOff: true,
    inboundDataClassificationReferenceId: input.inboundDataClassificationReferenceId ?? "",
    emailMayContainPhiPii: true,
    emailClassifiedAtIngest: true,
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

function getWarnings(input: BuildEmailConnectorInput): string[] {
  return [
    ...getInputArray(input.warnings),
    "Email connector is metadata only; no live email API call, sending, or real mailbox read is performed",
    "live intake, sending under explicit human enablement, and PHI/PII classification must be validated in the live-execution pass and real-data test register",
    "client email and scheduled document checking remain default-off, carrying forward the Phase 39 email discipline",
  ];
}

export function buildEmailConnector(input: BuildEmailConnectorInput): BuildEmailConnectorResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      emailConnector: null,
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
  const requiredEmailService = input.emailService as EmailService;
  const requiredFirmTenantId = input.firmTenantId as string;
  const requiredClientTenantId = input.clientTenantId as string;
  const requiredConnectorFrameworkReferenceId = input.connectorFrameworkReferenceId as string;
  const requiredOAuthTokenLifecycleReferenceId = input.oauthTokenLifecycleReferenceId as string;
  const requiredPhase39EmailIntakeReferenceId = input.phase39EmailIntakeReferenceId as string;
  const requiredInboundDataClassificationReferenceId = input.inboundDataClassificationReferenceId as string;
  const requiredActivityAuditChainReferenceId = input.activityAuditChainReferenceId as string;
  const requiredSyncStateReferenceId = input.syncStateReferenceId as string;
  const requiredConnectorVersionReferenceId = input.connectorVersionReferenceId as string;
  const requiredDataResidencyReferenceId = input.dataResidencyReferenceId as string;
  const requiredComplianceDesignationReferenceId = input.complianceDesignationReferenceId as string;
  const requiredCredentialReferenceId = input.credentialReferenceId as string;

  const emailConnector: SyntheticEmailConnector = {
    ...sharedBase,
    emailConnectorId: buildEmailConnectorId(input),
    emailConnectorKey: buildEmailConnectorKey(input),
    connectorId: requiredConnectorId,
    connectorKind: "email",
    emailService: requiredEmailService,
    firmTenantId: requiredFirmTenantId,
    clientTenantId: requiredClientTenantId,
    connectorFrameworkReferenceId: requiredConnectorFrameworkReferenceId,
    authModel: "oauth",
    oauthTokenLifecycleReferenceId: requiredOAuthTokenLifecycleReferenceId,
    readModeSupported: true,
    inboundIntakeFirst: true,
    feedsPhase39EmailIntake: true,
    phase39EmailIntakeReferenceId: requiredPhase39EmailIntakeReferenceId,
    sendModeSupported: input.sendModeSupported === true,
    sendModeEnabled: false,
    startsReadOnly: true,
    sendIsRecommendationOnlyByDefault: true,
    sendModeRequiresHumanApproval: true,
    sendModeRequiresGovernanceEntry: true,
    clientEmailDefaultOff: true,
    neverSendsToClientWithoutHumanEnablement: true,
    scheduledDocCheckingDefaultOff: true,
    inboundDataClassificationReferenceId: requiredInboundDataClassificationReferenceId,
    emailMayContainPhiPii: true,
    emailClassifiedAtIngest: true,
    activityAuditChainReferenceId: requiredActivityAuditChainReferenceId,
    syncStateReferenceId: requiredSyncStateReferenceId,
    connectorVersionReferenceId: requiredConnectorVersionReferenceId,
    dataResidencyReferenceId: requiredDataResidencyReferenceId,
    complianceDesignationReferenceId: requiredComplianceDesignationReferenceId,
    credentialReferenceId: requiredCredentialReferenceId,
    emailConnectorComplete: input.emailConnectorComplete === true,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input),
  };

  return {
    emailConnector,
    skipped: false,
    warnings: emailConnector.warnings,
  };
}
