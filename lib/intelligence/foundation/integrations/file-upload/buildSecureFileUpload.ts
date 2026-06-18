import { stableSnapshotHash } from "../../../core/hash";
import type { IntegrationBaseContract } from "../contracts";

export type SecureFileUploadMalwareScanResult = "clean" | "flagged" | "not_scanned";
export type SecureFileUploadStatus = "pending_verification" | "verified" | "rejected";

export interface BuildSecureFileUploadInput extends Partial<IntegrationBaseContract> {
  fileBasedConnectorReferenceId?: string;
  firmTenantId?: string;
  clientTenantId?: string;
  uploadChannelReference?: string;
  uploadChannelPerTenant?: true;
  noSharedUploadChannels?: true;
  fileFormat?: string;
  declaredChecksum?: string;
  checksumVerified?: boolean;
  signatureVerified?: boolean;
  integrityVerificationRequiredBeforeProcessing?: true;
  malwareScanRequiredBeforeProcessing?: true;
  malwareScanResult?: SecureFileUploadMalwareScanResult;
  failClosedOnIntegrityFailure?: true;
  failClosedOnMalwareFlag?: true;
  failClosedOnMalformedFile?: true;
  failClosedOnUnverifiedFile?: true;
  noProcessingBeforeVerification?: true;
  producesConnectorActivityEntryOnUpload?: true;
  activityAuditChainReferenceId?: string;
  inboundDataClassificationReferenceId?: string;
  uploadStatus?: SecureFileUploadStatus;
  secureFileUploadComplete?: boolean;
}

export interface SyntheticSecureFileUpload extends IntegrationBaseContract {
  secureFileUploadId: string;
  secureFileUploadKey: string;
  fileBasedConnectorReferenceId: string;
  firmTenantId: string;
  clientTenantId: string;
  uploadChannelReference: string;
  uploadChannelPerTenant: true;
  noSharedUploadChannels: true;
  fileFormat: string;
  declaredChecksum: string;
  checksumVerified: boolean;
  signatureVerified: boolean;
  integrityVerificationRequiredBeforeProcessing: true;
  malwareScanRequiredBeforeProcessing: true;
  malwareScanResult: SecureFileUploadMalwareScanResult;
  failClosedOnIntegrityFailure: true;
  failClosedOnMalwareFlag: true;
  failClosedOnMalformedFile: true;
  failClosedOnUnverifiedFile: true;
  noProcessingBeforeVerification: true;
  producesConnectorActivityEntryOnUpload: true;
  activityAuditChainReferenceId: string;
  inboundDataClassificationReferenceId: string;
  uploadStatus: SecureFileUploadStatus;
  secureFileUploadComplete: boolean;
}

export interface BuildSecureFileUploadResult {
  secureFileUpload: SyntheticSecureFileUpload | null;
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

function getMalwareScanResult(input: BuildSecureFileUploadInput): SecureFileUploadMalwareScanResult {
  return input.malwareScanResult ?? "not_scanned";
}

function isUploadVerified(input: BuildSecureFileUploadInput): boolean {
  return (
    input.checksumVerified === true &&
    input.signatureVerified === true &&
    getMalwareScanResult(input) === "clean"
  );
}

function getUploadStatus(input: BuildSecureFileUploadInput): SecureFileUploadStatus {
  if (isUploadVerified(input)) {
    return "verified";
  }

  if (
    input.checksumVerified === false ||
    input.signatureVerified === false ||
    getMalwareScanResult(input) !== "clean"
  ) {
    return "rejected";
  }

  return input.uploadStatus === "verified" ? "pending_verification" : input.uploadStatus ?? "pending_verification";
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

function collectMissingRequiredIdentifiers(input: BuildSecureFileUploadInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.fileBasedConnectorReferenceId)) {
    missing.push("fileBasedConnectorReferenceId");
  }

  if (!hasValue(input.firmTenantId)) {
    missing.push("firmTenantId");
  }

  if (!hasValue(input.clientTenantId)) {
    missing.push("clientTenantId");
  }

  if (!hasValue(input.uploadChannelReference)) {
    missing.push("uploadChannelReference");
  }

  if (!hasValue(input.fileFormat)) {
    missing.push("fileFormat");
  }

  if (!hasValue(input.declaredChecksum)) {
    missing.push("declaredChecksum");
  }

  if (input.checksumVerified === undefined) {
    missing.push("checksumVerified");
  }

  if (input.signatureVerified === undefined) {
    missing.push("signatureVerified");
  }

  if (!input.malwareScanResult) {
    missing.push("malwareScanResult");
  }

  if (!hasValue(input.activityAuditChainReferenceId)) {
    missing.push("activityAuditChainReferenceId");
  }

  if (!hasValue(input.inboundDataClassificationReferenceId)) {
    missing.push("inboundDataClassificationReferenceId");
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

function buildSecureFileUploadKey(input: BuildSecureFileUploadInput): string {
  return stableSnapshotHash({
    fileBasedConnectorReferenceId: input.fileBasedConnectorReferenceId ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    uploadChannelReference: input.uploadChannelReference ?? "",
    fileFormat: input.fileFormat ?? "",
    declaredChecksum: input.declaredChecksum ?? "",
    activityAuditChainReferenceId: input.activityAuditChainReferenceId ?? "",
    inboundDataClassificationReferenceId: input.inboundDataClassificationReferenceId ?? "",
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
  });
}

function buildSecureFileUploadId(input: BuildSecureFileUploadInput): string {
  return `synthetic-secure-file-upload:${stableSnapshotHash({
    secureFileUploadKey: buildSecureFileUploadKey(input),
    artifactType: "SyntheticSecureFileUpload",
  })}`;
}

function buildDerivationHash(input: BuildSecureFileUploadInput): string {
  return stableSnapshotHash({
    fileBasedConnectorReferenceId: input.fileBasedConnectorReferenceId ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    uploadChannelReference: input.uploadChannelReference ?? "",
    uploadChannelPerTenant: true,
    noSharedUploadChannels: true,
    fileFormat: input.fileFormat ?? "",
    declaredChecksum: input.declaredChecksum ?? "",
    checksumVerified: input.checksumVerified === true,
    signatureVerified: input.signatureVerified === true,
    integrityVerificationRequiredBeforeProcessing: true,
    malwareScanRequiredBeforeProcessing: true,
    malwareScanResult: getMalwareScanResult(input),
    failClosedOnIntegrityFailure: true,
    failClosedOnMalwareFlag: true,
    failClosedOnMalformedFile: true,
    failClosedOnUnverifiedFile: true,
    noProcessingBeforeVerification: true,
    producesConnectorActivityEntryOnUpload: true,
    activityAuditChainReferenceId: input.activityAuditChainReferenceId ?? "",
    inboundDataClassificationReferenceId: input.inboundDataClassificationReferenceId ?? "",
    uploadStatus: getUploadStatus(input),
    containsPHI: getContainsPHI(input.containsPHI),
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

function getWarnings(input: BuildSecureFileUploadInput): string[] {
  const warnings = [
    ...getInputArray(input.warnings),
    "Secure file upload is metadata only; no real file upload, checksum computation, malware scan, or file processing is performed",
    "live upload, integrity verification, and malware scanning against real files must be validated in the live-execution pass and real-data test register",
  ];

  if (getUploadStatus(input) === "rejected") {
    warnings.push("upload failed closed because checksum, signature, or malware scan verification did not pass");
  }

  return warnings;
}

export function buildSecureFileUpload(input: BuildSecureFileUploadInput): BuildSecureFileUploadResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      secureFileUpload: null,
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
  const requiredFileBasedConnectorReferenceId = input.fileBasedConnectorReferenceId as string;
  const requiredFirmTenantId = input.firmTenantId as string;
  const requiredClientTenantId = input.clientTenantId as string;
  const requiredUploadChannelReference = input.uploadChannelReference as string;
  const requiredFileFormat = input.fileFormat as string;
  const requiredDeclaredChecksum = input.declaredChecksum as string;
  const requiredActivityAuditChainReferenceId = input.activityAuditChainReferenceId as string;
  const requiredInboundDataClassificationReferenceId = input.inboundDataClassificationReferenceId as string;

  const secureFileUpload: SyntheticSecureFileUpload = {
    ...sharedBase,
    secureFileUploadId: buildSecureFileUploadId(input),
    secureFileUploadKey: buildSecureFileUploadKey(input),
    fileBasedConnectorReferenceId: requiredFileBasedConnectorReferenceId,
    firmTenantId: requiredFirmTenantId,
    clientTenantId: requiredClientTenantId,
    uploadChannelReference: requiredUploadChannelReference,
    uploadChannelPerTenant: true,
    noSharedUploadChannels: true,
    fileFormat: requiredFileFormat,
    declaredChecksum: requiredDeclaredChecksum,
    checksumVerified: input.checksumVerified === true,
    signatureVerified: input.signatureVerified === true,
    integrityVerificationRequiredBeforeProcessing: true,
    malwareScanRequiredBeforeProcessing: true,
    malwareScanResult: getMalwareScanResult(input),
    failClosedOnIntegrityFailure: true,
    failClosedOnMalwareFlag: true,
    failClosedOnMalformedFile: true,
    failClosedOnUnverifiedFile: true,
    noProcessingBeforeVerification: true,
    producesConnectorActivityEntryOnUpload: true,
    activityAuditChainReferenceId: requiredActivityAuditChainReferenceId,
    inboundDataClassificationReferenceId: requiredInboundDataClassificationReferenceId,
    uploadStatus: getUploadStatus(input),
    secureFileUploadComplete: input.secureFileUploadComplete === true && isUploadVerified(input),
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input),
  };

  return {
    secureFileUpload,
    skipped: secureFileUpload.uploadStatus === "rejected",
    warnings: secureFileUpload.warnings,
  };
}
