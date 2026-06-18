import { stableSnapshotHash } from "../../../../core/hash";
import type { IntegrationBaseContract } from "../../contracts";

export type FileBasedFormat = "bai2" | "ofx" | "qfx" | "csv" | "excel" | "edi_x12" | "custom_flat_file";

export interface BuildFileBasedConnectorInput extends Partial<IntegrationBaseContract> {
  connectorId?: string;
  connectorKind?: "file_based";
  fileFormat?: FileBasedFormat;
  firmTenantId?: string;
  clientTenantId?: string;
  connectorFrameworkReferenceId?: string;
  authModel?: "file_based";
  readModeSupported?: true;
  isUploadIngestionNotApiPull?: true;
  fileIntegrityVerificationRequired?: true;
  failClosedOnMalformedFile?: true;
  checksumOrSignatureVerification?: true;
  reusesPhase39UniversalCanonicalSchema?: true;
  phase39UniversalCanonicalSchemaReferenceId?: string;
  signAwareClassificationRequired?: true;
  inboundDataClassificationReferenceId?: string;
  writeModeSupported?: false;
  writeModeEnabled?: false;
  isInboundOnly?: true;
  startsReadOnly?: true;
  activityAuditChainReferenceId?: string;
  connectorVersionReferenceId?: string;
  dataResidencyReferenceId?: string;
  complianceDesignationReferenceId?: string;
  credentialReferenceId?: string;
  canonicalMappingReference?: string;
  fileBasedConnectorComplete?: boolean;
}

export interface SyntheticFileBasedConnector extends IntegrationBaseContract {
  fileBasedConnectorId: string;
  fileBasedConnectorKey: string;
  connectorId: string;
  connectorKind: "file_based";
  fileFormat: FileBasedFormat;
  firmTenantId: string;
  clientTenantId: string;
  connectorFrameworkReferenceId: string;
  authModel: "file_based";
  readModeSupported: true;
  isUploadIngestionNotApiPull: true;
  fileIntegrityVerificationRequired: true;
  failClosedOnMalformedFile: true;
  checksumOrSignatureVerification: true;
  reusesPhase39UniversalCanonicalSchema: true;
  phase39UniversalCanonicalSchemaReferenceId: string;
  signAwareClassificationRequired: true;
  inboundDataClassificationReferenceId: string;
  writeModeSupported: false;
  writeModeEnabled: false;
  isInboundOnly: true;
  startsReadOnly: true;
  activityAuditChainReferenceId: string;
  connectorVersionReferenceId: string;
  dataResidencyReferenceId: string;
  complianceDesignationReferenceId: string;
  credentialReferenceId: string;
  canonicalMappingReference: string;
  fileBasedConnectorComplete: boolean;
}

export interface BuildFileBasedConnectorResult {
  fileBasedConnector: SyntheticFileBasedConnector | null;
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

function collectMissingRequiredIdentifiers(input: BuildFileBasedConnectorInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.connectorId)) {
    missing.push("connectorId");
  }

  if (!input.fileFormat) {
    missing.push("fileFormat");
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

  if (!hasValue(input.phase39UniversalCanonicalSchemaReferenceId)) {
    missing.push("phase39UniversalCanonicalSchemaReferenceId");
  }

  if (!hasValue(input.inboundDataClassificationReferenceId)) {
    missing.push("inboundDataClassificationReferenceId");
  }

  if (!hasValue(input.activityAuditChainReferenceId)) {
    missing.push("activityAuditChainReferenceId");
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

function buildFileBasedConnectorKey(input: BuildFileBasedConnectorInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: "file_based",
    fileFormat: input.fileFormat ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    connectorFrameworkReferenceId: input.connectorFrameworkReferenceId ?? "",
    authModel: "file_based",
    phase39UniversalCanonicalSchemaReferenceId: input.phase39UniversalCanonicalSchemaReferenceId ?? "",
    inboundDataClassificationReferenceId: input.inboundDataClassificationReferenceId ?? "",
    activityAuditChainReferenceId: input.activityAuditChainReferenceId ?? "",
    connectorVersionReferenceId: input.connectorVersionReferenceId ?? "",
    dataResidencyReferenceId: input.dataResidencyReferenceId ?? "",
    complianceDesignationReferenceId: input.complianceDesignationReferenceId ?? "",
    credentialReferenceId: input.credentialReferenceId ?? "",
    canonicalMappingReference: input.canonicalMappingReference ?? "",
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
  });
}

function buildFileBasedConnectorId(input: BuildFileBasedConnectorInput): string {
  return `synthetic-file-based-connector:${stableSnapshotHash({
    fileBasedConnectorKey: buildFileBasedConnectorKey(input),
    artifactType: "SyntheticFileBasedConnector",
  })}`;
}

function buildDerivationHash(input: BuildFileBasedConnectorInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: "file_based",
    fileFormat: input.fileFormat ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    connectorFrameworkReferenceId: input.connectorFrameworkReferenceId ?? "",
    authModel: "file_based",
    readModeSupported: true,
    isUploadIngestionNotApiPull: true,
    fileIntegrityVerificationRequired: true,
    failClosedOnMalformedFile: true,
    checksumOrSignatureVerification: true,
    reusesPhase39UniversalCanonicalSchema: true,
    phase39UniversalCanonicalSchemaReferenceId: input.phase39UniversalCanonicalSchemaReferenceId ?? "",
    signAwareClassificationRequired: true,
    inboundDataClassificationReferenceId: input.inboundDataClassificationReferenceId ?? "",
    writeModeSupported: false,
    writeModeEnabled: false,
    isInboundOnly: true,
    startsReadOnly: true,
    activityAuditChainReferenceId: input.activityAuditChainReferenceId ?? "",
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

function getWarnings(input: BuildFileBasedConnectorInput): string[] {
  return [
    ...getInputArray(input.warnings),
    "File-based connector is metadata only; no real file parsing, format decoding, or data ingestion is performed",
    "live upload, integrity verification, format parsing, canonical mapping, and sign-aware classification must be validated in the live-execution pass and real-data test register",
    "malformed files fail closed and Phase 39 universal canonical schema is reused for long-tail file coverage",
  ];
}

export function buildFileBasedConnector(input: BuildFileBasedConnectorInput): BuildFileBasedConnectorResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      fileBasedConnector: null,
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
  const requiredFileFormat = input.fileFormat as FileBasedFormat;
  const requiredFirmTenantId = input.firmTenantId as string;
  const requiredClientTenantId = input.clientTenantId as string;
  const requiredConnectorFrameworkReferenceId = input.connectorFrameworkReferenceId as string;
  const requiredPhase39UniversalCanonicalSchemaReferenceId =
    input.phase39UniversalCanonicalSchemaReferenceId as string;
  const requiredInboundDataClassificationReferenceId = input.inboundDataClassificationReferenceId as string;
  const requiredActivityAuditChainReferenceId = input.activityAuditChainReferenceId as string;
  const requiredConnectorVersionReferenceId = input.connectorVersionReferenceId as string;
  const requiredDataResidencyReferenceId = input.dataResidencyReferenceId as string;
  const requiredComplianceDesignationReferenceId = input.complianceDesignationReferenceId as string;
  const requiredCredentialReferenceId = input.credentialReferenceId as string;
  const requiredCanonicalMappingReference = input.canonicalMappingReference as string;

  const fileBasedConnector: SyntheticFileBasedConnector = {
    ...sharedBase,
    fileBasedConnectorId: buildFileBasedConnectorId(input),
    fileBasedConnectorKey: buildFileBasedConnectorKey(input),
    connectorId: requiredConnectorId,
    connectorKind: "file_based",
    fileFormat: requiredFileFormat,
    firmTenantId: requiredFirmTenantId,
    clientTenantId: requiredClientTenantId,
    connectorFrameworkReferenceId: requiredConnectorFrameworkReferenceId,
    authModel: "file_based",
    readModeSupported: true,
    isUploadIngestionNotApiPull: true,
    fileIntegrityVerificationRequired: true,
    failClosedOnMalformedFile: true,
    checksumOrSignatureVerification: true,
    reusesPhase39UniversalCanonicalSchema: true,
    phase39UniversalCanonicalSchemaReferenceId: requiredPhase39UniversalCanonicalSchemaReferenceId,
    signAwareClassificationRequired: true,
    inboundDataClassificationReferenceId: requiredInboundDataClassificationReferenceId,
    writeModeSupported: false,
    writeModeEnabled: false,
    isInboundOnly: true,
    startsReadOnly: true,
    activityAuditChainReferenceId: requiredActivityAuditChainReferenceId,
    connectorVersionReferenceId: requiredConnectorVersionReferenceId,
    dataResidencyReferenceId: requiredDataResidencyReferenceId,
    complianceDesignationReferenceId: requiredComplianceDesignationReferenceId,
    credentialReferenceId: requiredCredentialReferenceId,
    canonicalMappingReference: requiredCanonicalMappingReference,
    fileBasedConnectorComplete: input.fileBasedConnectorComplete === true,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input),
  };

  return {
    fileBasedConnector,
    skipped: false,
    warnings: fileBasedConnector.warnings,
  };
}
