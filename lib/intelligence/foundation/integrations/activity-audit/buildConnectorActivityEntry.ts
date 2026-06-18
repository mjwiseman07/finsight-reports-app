import { stableSnapshotHash } from "../../../core/hash";
import type {
  ConnectorActivityEntry,
  ConnectorActivityOperation,
  IntegrationBaseContract,
  IntegrationConnectorKind,
} from "../contracts";

export interface BuildConnectorActivityEntryInput extends Partial<ConnectorActivityEntry> {
  connectorKind?: IntegrationConnectorKind;
  containsCredentials?: false;
  containsFullPhiPiiPayload?: false;
  writeRequiresHumanApproval?: true;
  supersedingCreatesNewEntry?: true;
  supportsSoc1Evidence?: true;
  supportsSoc2Evidence?: true;
  supportsHipaaEvidence?: true;
  attestationDeferredToPhase42_5?: true;
}

export interface SyntheticConnectorActivityEntry extends ConnectorActivityEntry {
  connectorActivityEntryId: string;
  connectorActivityEntryKey: string;
  connectorId: string;
  connectorKind: IntegrationConnectorKind;
  firmTenantId: string;
  clientTenantId: string;
  operation: ConnectorActivityOperation;
  requestSummary: string;
  responseStatus: string;
  recordCountAffected: number;
  humanApprovalReference: string;
  linkedRecommendationAuditEntryId: string;
  priorEntryReferenceId: string;
  containsCredentials: false;
  containsFullPhiPiiPayload: false;
  writeRequiresHumanApproval: true;
  appendOnly: true;
  immutableRecord: true;
  neverEditedOrDeleted: true;
  supersedingCreatesNewEntry: true;
  supportsSoc1Evidence: true;
  supportsSoc2Evidence: true;
  supportsHipaaEvidence: true;
  attestationDeferredToPhase42_5: true;
  containsPHI: boolean;
  connectorActivityEntryComplete: boolean;
}

export interface BuildConnectorActivityEntryResult {
  connectorActivityEntry: SyntheticConnectorActivityEntry | null;
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

function collectMissingRequiredIdentifiers(input: BuildConnectorActivityEntryInput): string[] {
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

  if (!input.operation) {
    missing.push("operation");
  }

  if (!hasValue(input.requestSummary)) {
    missing.push("requestSummary");
  }

  if (!hasValue(input.responseStatus)) {
    missing.push("responseStatus");
  }

  if (!hasValue(input.phase40OrganizationalHandoffHandle)) {
    missing.push("phase40OrganizationalHandoffHandle");
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

  if (input.operation === "write" && !hasValue(input.humanApprovalReference)) {
    missing.push("humanApprovalReference");
  }

  if (input.operation === "write" && !hasValue(input.linkedRecommendationAuditEntryId)) {
    missing.push("linkedRecommendationAuditEntryId");
  }

  return missing;
}

function buildConnectorActivityEntryKey(input: BuildConnectorActivityEntryInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: input.connectorKind ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    operation: input.operation ?? "",
    requestSummary: input.requestSummary ?? "",
    responseStatus: input.responseStatus ?? "",
    recordCountAffected: input.recordCountAffected ?? 0,
    humanApprovalReference: input.humanApprovalReference ?? "",
    linkedRecommendationAuditEntryId: input.linkedRecommendationAuditEntryId ?? "",
    priorEntryReferenceId: input.priorEntryReferenceId ?? "",
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
  });
}

function buildConnectorActivityEntryId(input: BuildConnectorActivityEntryInput): string {
  return `synthetic-connector-activity-entry:${stableSnapshotHash({
    connectorActivityEntryKey: buildConnectorActivityEntryKey(input),
    artifactType: "SyntheticConnectorActivityEntry",
  })}`;
}

function buildDerivationHash(input: BuildConnectorActivityEntryInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: input.connectorKind ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    operation: input.operation ?? "",
    requestSummary: input.requestSummary ?? "",
    responseStatus: input.responseStatus ?? "",
    recordCountAffected: input.recordCountAffected ?? 0,
    humanApprovalReference: input.humanApprovalReference ?? "",
    linkedRecommendationAuditEntryId: input.linkedRecommendationAuditEntryId ?? "",
    priorEntryReferenceId: input.priorEntryReferenceId ?? "",
    containsCredentials: false,
    containsFullPhiPiiPayload: false,
    writeRequiresHumanApproval: true,
    appendOnly: true,
    immutableRecord: true,
    neverEditedOrDeleted: true,
    supersedingCreatesNewEntry: true,
    supportsSoc1Evidence: true,
    supportsSoc2Evidence: true,
    supportsHipaaEvidence: true,
    attestationDeferredToPhase42_5: true,
    containsPHI: getContainsPHI(input.containsPHI),
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

export function buildConnectorActivityEntry(
  input: BuildConnectorActivityEntryInput,
): BuildConnectorActivityEntryResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      connectorActivityEntry: null,
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
  const requiredPhase40OrganizationalHandoffHandle = input.phase40OrganizationalHandoffHandle as string;
  const requiredConnectorId = input.connectorId as string;
  const requiredConnectorKind = input.connectorKind as IntegrationConnectorKind;
  const requiredFirmTenantId = input.firmTenantId as string;
  const requiredClientTenantId = input.clientTenantId as string;
  const requiredOperation = input.operation as ConnectorActivityOperation;
  const requiredRequestSummary = input.requestSummary as string;
  const requiredResponseStatus = input.responseStatus as string;

  const connectorActivityEntry: SyntheticConnectorActivityEntry = {
    ...sharedBase,
    phase40OrganizationalHandoffHandle: requiredPhase40OrganizationalHandoffHandle,
    phase40HandoffReferenceIds: getInputArray(input.phase40HandoffReferenceIds),
    firmTenantId: requiredFirmTenantId,
    clientTenantId: requiredClientTenantId,
    perTenantCredentialIsolation: true,
    connectorActivityEntryId: buildConnectorActivityEntryId(input),
    connectorActivityEntryKey: buildConnectorActivityEntryKey(input),
    connectorId: requiredConnectorId,
    connectorKind: requiredConnectorKind,
    operation: requiredOperation,
    requestSummary: requiredRequestSummary,
    responseStatus: requiredResponseStatus,
    recordCountAffected: input.recordCountAffected ?? 0,
    humanApprovalReference: input.humanApprovalReference ?? "",
    linkedRecommendationAuditEntryId: input.linkedRecommendationAuditEntryId ?? "",
    priorEntryReferenceId: input.priorEntryReferenceId ?? "",
    containsCredentials: false,
    containsFullPhiPiiPayload: false,
    writeRequiresHumanApproval: true,
    appendOnly: true,
    immutableRecord: true,
    neverEditedOrDeleted: true,
    supersedingCreatesNewEntry: true,
    supportsSoc1Evidence: true,
    supportsSoc2Evidence: true,
    supportsHipaaEvidence: true,
    attestationDeferredToPhase42_5: true,
    containsPHI: getContainsPHI(input.containsPHI),
    connectorActivityEntryComplete: input.connectorActivityEntryComplete === true,
    derivationHash: buildDerivationHash(input),
    warnings: getInputArray(input.warnings),
  };

  return {
    connectorActivityEntry,
    skipped: false,
    warnings: connectorActivityEntry.warnings,
  };
}
