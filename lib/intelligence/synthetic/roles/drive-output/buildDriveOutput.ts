import { stableSnapshotHash } from "../../../core/hash";
import type { SyntheticActionDerivationMethod, SyntheticPhase38StaleMarker } from "../../actions/contracts";
import type { SyntheticActionHandoffPackage } from "../../actions/action-handoff-package";
import type {
  SyntheticAuditConfidenceMetadata,
  SyntheticAuditGovernanceMetadata,
  SyntheticAuditMaterialityCompatibility,
  SyntheticAuditScope,
  SyntheticAuditTrustMetadata,
} from "../../audit/types";
import type { SyntheticKnowledgeConfidenceFloorMetadata } from "../../knowledge/contracts";
import type { SyntheticMemoryObjectIsolationDimension } from "../../organizational-memory/memory-object";
import type { SyntheticRoleType } from "../contracts";

export type SyntheticDriveOutputFileType =
  | "pdf"
  | "excel"
  | "word"
  | "csv"
  | "image"
  | "visio"
  | "powerpoint"
  | "other";

export type SyntheticDriveStorageEnvironment = "sharepoint" | "onedrive" | "google_drive" | "other";

export type SyntheticDrivePlacementStatus =
  | "pending"
  | "placed"
  | "failed"
  | "folder_unavailable"
  | "access_denied";

export interface BuildDriveOutputInput {
  roleType?: SyntheticRoleType;
  roleInstanceId?: string;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  workpaperPackageReferenceId?: string;
  outputFileType?: SyntheticDriveOutputFileType;
  outputFileName?: string;
  outputFileNamingConvention?: string;
  designatedOutputFolderPath?: string;
  folderMappingReferenceId?: string;
  storageEnvironment?: SyntheticDriveStorageEnvironment;
  authenticationReferenceId?: string;
  placementStatus?: SyntheticDrivePlacementStatus;
  placementConfirmed?: boolean;
  placementTimestamp?: string;
  placementFailureReason?: string;
  notificationTargetUserId?: string;
  notificationSent?: boolean;
  writeAccessEnabled?: boolean;
  placementLoggedReference?: string;
  auditLogReferenceId?: string;
  boundPhase38SnapshotHash?: string;
  boundPhase37SnapshotHash?: string;
  phase39StaleMarker?: SyntheticPhase38StaleMarker;
  executionReady?: boolean;
  companyId?: string;
  scope?: SyntheticAuditScope;
  customerIsolation?: SyntheticMemoryObjectIsolationDimension;
  firmIsolation?: SyntheticMemoryObjectIsolationDimension;
  clientIsolation?: SyntheticMemoryObjectIsolationDimension;
  derivationLineageIds?: string[];
  derivationMethod?: SyntheticActionDerivationMethod;
  confidenceFloorMetadata?: SyntheticKnowledgeConfidenceFloorMetadata[];
  sourceConfidenceReferenceIds?: string[];
  evidenceReferenceIds?: string[];
  lineageReferenceIds?: string[];
  trustMetadata?: SyntheticAuditTrustMetadata[];
  confidenceMetadata?: SyntheticAuditConfidenceMetadata[];
  governanceMetadata?: SyntheticAuditGovernanceMetadata[];
  materialityMetadata?: SyntheticAuditMaterialityCompatibility[];
  warnings?: string[];
  skippedIndexes?: number[];
}

export interface SyntheticDriveOutput {
  driveOutputId: string;
  driveOutputKey: string;
  roleType: SyntheticRoleType;
  roleInstanceId: string;
  workpaperPackageReferenceId: string;
  outputFileType: SyntheticDriveOutputFileType;
  outputFileName: string;
  outputFileNamingConvention: string;
  designatedOutputFolderPath: string;
  folderMappingReferenceId: string;
  storageEnvironment: SyntheticDriveStorageEnvironment;
  authenticationReferenceId: string;
  placementStatus: SyntheticDrivePlacementStatus;
  placementConfirmed: boolean;
  placementTimestamp: string;
  placementFailureReason: string;
  notificationTargetUserId: string;
  notificationSent: boolean;
  writeAccessEnabled: boolean;
  modifyDeleteMoveProhibited: true;
  placementLoggedReference: string;
  auditLogReferenceId: string;
  failClosedOnFolderUnavailable: true;
  failClosedOnAccessDenied: true;
  boundPhase38SnapshotHash: string;
  boundPhase37SnapshotHash: string;
  phase39StaleMarker: SyntheticPhase38StaleMarker;
  executable: false;
  executionReady: boolean;
  companyId: string;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  derivationLineageIds: string[];
  derivationMethod: SyntheticActionDerivationMethod;
  derivationHash: string;
  confidenceFloorMetadata: SyntheticKnowledgeConfidenceFloorMetadata[];
  sourceConfidenceReferenceIds: string[];
  evidenceReferenceIds: string[];
  lineageReferenceIds: string[];
  trustMetadata: SyntheticAuditTrustMetadata[];
  confidenceMetadata: SyntheticAuditConfidenceMetadata[];
  governanceMetadata: SyntheticAuditGovernanceMetadata[];
  materialityMetadata: SyntheticAuditMaterialityCompatibility[];
  warnings: string[];
  skippedIndexes: number[];
}

export interface BuildDriveOutputResult {
  driveOutput: SyntheticDriveOutput | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getBoundPhase38SnapshotHash(input: BuildDriveOutputInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildDriveOutputInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildDriveOutputInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildDriveOutputInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildDriveOutputInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildDriveOutputInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildDriveOutputInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildDriveOutputInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildDriveOutputInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function getPlacementStatus(input: BuildDriveOutputInput): SyntheticDrivePlacementStatus {
  return input.placementStatus ?? "pending";
}

function getPlacementConfirmed(input: BuildDriveOutputInput): boolean {
  return input.placementConfirmed ?? getPlacementStatus(input) === "placed";
}

function collectMissingRequiredIdentifiers(input: BuildDriveOutputInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.roleType)) {
    missing.push("roleType");
  }

  if (!hasValue(input.roleInstanceId)) {
    missing.push("roleInstanceId");
  }

  if (!hasValue(input.workpaperPackageReferenceId)) {
    missing.push("workpaperPackageReferenceId");
  }

  if (!hasValue(input.storageEnvironment)) {
    missing.push("storageEnvironment");
  }

  if (!hasValue(getBoundPhase38SnapshotHash(input))) {
    missing.push("boundPhase38SnapshotHash");
  }

  if (!hasValue(getBoundPhase37SnapshotHash(input))) {
    missing.push("boundPhase37SnapshotHash");
  }

  if (!hasValue(getCompanyId(input))) {
    missing.push("companyId");
  }

  if (!getScope(input)) {
    missing.push("scope");
  }

  if (!getCustomerIsolation(input)) {
    missing.push("customerIsolation");
  }

  if (!getFirmIsolation(input)) {
    missing.push("firmIsolation");
  }

  if (!getClientIsolation(input)) {
    missing.push("clientIsolation");
  }

  return missing;
}

function buildDerivationHash(input: BuildDriveOutputInput): string {
  return stableSnapshotHash({
    roleType: input.roleType,
    roleInstanceId: input.roleInstanceId,
    workpaperPackageReferenceId: input.workpaperPackageReferenceId ?? "",
    outputFileType: input.outputFileType ?? "other",
    outputFileName: input.outputFileName ?? "",
    outputFileNamingConvention: input.outputFileNamingConvention ?? "",
    designatedOutputFolderPath: input.designatedOutputFolderPath ?? "",
    folderMappingReferenceId: input.folderMappingReferenceId ?? "",
    storageEnvironment: input.storageEnvironment,
    authenticationReferenceId: input.authenticationReferenceId ?? "",
    placementStatus: getPlacementStatus(input),
    placementConfirmed: getPlacementConfirmed(input),
    placementTimestamp: input.placementTimestamp ?? "",
    placementFailureReason: input.placementFailureReason ?? "",
    notificationTargetUserId: input.notificationTargetUserId ?? "",
    notificationSent: input.notificationSent === true,
    writeAccessEnabled: input.writeAccessEnabled === true,
    modifyDeleteMoveProhibited: true,
    placementLoggedReference: input.placementLoggedReference ?? "",
    auditLogReferenceId: input.auditLogReferenceId ?? "",
    failClosedOnFolderUnavailable: true,
    failClosedOnAccessDenied: true,
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildDriveOutput(input: BuildDriveOutputInput): BuildDriveOutputResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      driveOutput: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const roleType = input.roleType as SyntheticRoleType;
  const roleInstanceId = input.roleInstanceId as string;
  const workpaperPackageReferenceId = input.workpaperPackageReferenceId as string;
  const storageEnvironment = input.storageEnvironment as SyntheticDriveStorageEnvironment;
  const boundPhase38SnapshotHash = getBoundPhase38SnapshotHash(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);
  const companyId = getCompanyId(input);
  const scope = getScope(input);
  const customerIsolation = getCustomerIsolation(input);
  const firmIsolation = getFirmIsolation(input);
  const clientIsolation = getClientIsolation(input);
  const placementStatus = getPlacementStatus(input);
  const placementConfirmed = getPlacementConfirmed(input);
  const outputFileType = input.outputFileType ?? "other";
  const derivationHash = buildDerivationHash(input);
  const driveOutputKey = stableSnapshotHash({
    roleType,
    roleInstanceId,
    companyId,
    workpaperPackageReferenceId,
    outputFileName: input.outputFileName ?? "",
    outputFileType,
    storageEnvironment,
    designatedOutputFolderPath: input.designatedOutputFolderPath ?? "",
    placementStatus,
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const driveOutputId = stableSnapshotHash({
    driveOutputKey,
    artifactType: "SyntheticDriveOutput",
  });

  return {
    driveOutput: {
      driveOutputId,
      driveOutputKey,
      roleType,
      roleInstanceId,
      workpaperPackageReferenceId,
      outputFileType,
      outputFileName: input.outputFileName ?? "",
      outputFileNamingConvention: input.outputFileNamingConvention ?? "",
      designatedOutputFolderPath: input.designatedOutputFolderPath ?? "",
      folderMappingReferenceId: input.folderMappingReferenceId ?? "",
      storageEnvironment,
      authenticationReferenceId: input.authenticationReferenceId ?? "",
      placementStatus,
      placementConfirmed,
      placementTimestamp: input.placementTimestamp ?? "",
      placementFailureReason: input.placementFailureReason ?? "",
      notificationTargetUserId: input.notificationTargetUserId ?? "",
      notificationSent: input.notificationSent === true,
      writeAccessEnabled: input.writeAccessEnabled === true,
      modifyDeleteMoveProhibited: true,
      placementLoggedReference: input.placementLoggedReference ?? "",
      auditLogReferenceId: input.auditLogReferenceId ?? "",
      failClosedOnFolderUnavailable: true,
      failClosedOnAccessDenied: true,
      boundPhase38SnapshotHash,
      boundPhase37SnapshotHash,
      phase39StaleMarker: getPhase39StaleMarker(input),
      executable: false,
      executionReady: input.executionReady === true,
      companyId,
      scope: scope as SyntheticAuditScope,
      customerIsolation: customerIsolation as SyntheticMemoryObjectIsolationDimension,
      firmIsolation: firmIsolation as SyntheticMemoryObjectIsolationDimension,
      clientIsolation: clientIsolation as SyntheticMemoryObjectIsolationDimension,
      derivationLineageIds: getInputArray(input.derivationLineageIds),
      derivationMethod: getDerivationMethod(input),
      derivationHash,
      confidenceFloorMetadata: getInputArray(input.confidenceFloorMetadata),
      sourceConfidenceReferenceIds: getInputArray(input.sourceConfidenceReferenceIds),
      evidenceReferenceIds: getInputArray(input.evidenceReferenceIds),
      lineageReferenceIds: getInputArray(input.lineageReferenceIds),
      trustMetadata: getInputArray(input.trustMetadata),
      confidenceMetadata: getInputArray(input.confidenceMetadata),
      governanceMetadata: getInputArray(input.governanceMetadata),
      materialityMetadata: getInputArray(input.materialityMetadata),
      warnings,
      skippedIndexes: getInputArray(input.skippedIndexes),
    },
    skipped: false,
    warnings,
  };
}
