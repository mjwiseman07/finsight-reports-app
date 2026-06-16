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
import type { SyntheticDriveStorageEnvironment } from "../drive-output";

export type SyntheticReadAccessRequestedContextType =
  | "prior_period_workpaper"
  | "reference_document"
  | "supporting_file"
  | "prior_schedule"
  | "prior_reconciliation"
  | "other";

export type SyntheticContextRetrievalStatus =
  | "pending"
  | "retrieved"
  | "failed"
  | "access_denied"
  | "folder_unavailable";

export interface BuildReadAccessContextInput {
  roleType?: SyntheticRoleType;
  roleInstanceId?: string;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  readAccessFolderPaths?: string[];
  storageEnvironment?: SyntheticDriveStorageEnvironment;
  authenticationReferenceId?: string;
  readAccessEnabled?: boolean;
  readAccessConfiguredByUserId?: string;
  requestedContextType?: SyntheticReadAccessRequestedContextType;
  retrievedDocumentReferenceIds?: string[];
  contextRetrievalStatus?: SyntheticContextRetrievalStatus;
  contextRetrievalFailureReason?: string;
  accessEventLoggedReference?: string;
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

export interface SyntheticReadAccessContext {
  readAccessContextId: string;
  readAccessContextKey: string;
  roleType: SyntheticRoleType;
  roleInstanceId: string;
  readAccessFolderPaths: string[];
  storageEnvironment: SyntheticDriveStorageEnvironment;
  authenticationReferenceId: string;
  readAccessEnabled: boolean;
  readAccessConfiguredByUserId: string;
  requestedContextType: SyntheticReadAccessRequestedContextType;
  retrievedDocumentReferenceIds: string[];
  contextRetrievalStatus: SyntheticContextRetrievalStatus;
  contextRetrievalFailureReason: string;
  readOnlyEnforced: true;
  modifyProhibited: true;
  deleteProhibited: true;
  moveProhibited: true;
  writeAccessSeparateFromReadAccess: true;
  accessEventLoggedReference: string;
  auditLogReferenceId: string;
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

export interface BuildReadAccessContextResult {
  readAccessContext: SyntheticReadAccessContext | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getBoundPhase38SnapshotHash(input: BuildReadAccessContextInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildReadAccessContextInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildReadAccessContextInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildReadAccessContextInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildReadAccessContextInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildReadAccessContextInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildReadAccessContextInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildReadAccessContextInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildReadAccessContextInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function getRequestedContextType(input: BuildReadAccessContextInput): SyntheticReadAccessRequestedContextType {
  return input.requestedContextType ?? "other";
}

function getContextRetrievalStatus(input: BuildReadAccessContextInput): SyntheticContextRetrievalStatus {
  return input.contextRetrievalStatus ?? "pending";
}

function collectMissingRequiredIdentifiers(input: BuildReadAccessContextInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.roleType)) {
    missing.push("roleType");
  }

  if (!hasValue(input.roleInstanceId)) {
    missing.push("roleInstanceId");
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

function buildDerivationHash(input: BuildReadAccessContextInput): string {
  return stableSnapshotHash({
    roleType: input.roleType,
    roleInstanceId: input.roleInstanceId,
    readAccessFolderPaths: getInputArray(input.readAccessFolderPaths),
    storageEnvironment: input.storageEnvironment ?? "other",
    authenticationReferenceId: input.authenticationReferenceId ?? "",
    readAccessEnabled: input.readAccessEnabled === true,
    readAccessConfiguredByUserId: input.readAccessConfiguredByUserId ?? "",
    requestedContextType: getRequestedContextType(input),
    retrievedDocumentReferenceIds: getInputArray(input.retrievedDocumentReferenceIds),
    contextRetrievalStatus: getContextRetrievalStatus(input),
    contextRetrievalFailureReason: input.contextRetrievalFailureReason ?? "",
    readOnlyEnforced: true,
    modifyProhibited: true,
    deleteProhibited: true,
    moveProhibited: true,
    writeAccessSeparateFromReadAccess: true,
    accessEventLoggedReference: input.accessEventLoggedReference ?? "",
    auditLogReferenceId: input.auditLogReferenceId ?? "",
    failClosedOnAccessDenied: true,
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildReadAccessContext(input: BuildReadAccessContextInput): BuildReadAccessContextResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      readAccessContext: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const roleType = input.roleType as SyntheticRoleType;
  const roleInstanceId = input.roleInstanceId as string;
  const storageEnvironment = input.storageEnvironment ?? "other";
  const requestedContextType = getRequestedContextType(input);
  const contextRetrievalStatus = getContextRetrievalStatus(input);
  const boundPhase38SnapshotHash = getBoundPhase38SnapshotHash(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);
  const companyId = getCompanyId(input);
  const scope = getScope(input);
  const customerIsolation = getCustomerIsolation(input);
  const firmIsolation = getFirmIsolation(input);
  const clientIsolation = getClientIsolation(input);
  const derivationHash = buildDerivationHash(input);
  const readAccessContextKey = stableSnapshotHash({
    roleType,
    roleInstanceId,
    companyId,
    readAccessFolderPaths: getInputArray(input.readAccessFolderPaths),
    storageEnvironment,
    requestedContextType,
    contextRetrievalStatus,
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const readAccessContextId = stableSnapshotHash({
    readAccessContextKey,
    artifactType: "SyntheticReadAccessContext",
  });

  return {
    readAccessContext: {
      readAccessContextId,
      readAccessContextKey,
      roleType,
      roleInstanceId,
      readAccessFolderPaths: getInputArray(input.readAccessFolderPaths),
      storageEnvironment,
      authenticationReferenceId: input.authenticationReferenceId ?? "",
      readAccessEnabled: input.readAccessEnabled === true,
      readAccessConfiguredByUserId: input.readAccessConfiguredByUserId ?? "",
      requestedContextType,
      retrievedDocumentReferenceIds: getInputArray(input.retrievedDocumentReferenceIds),
      contextRetrievalStatus,
      contextRetrievalFailureReason: input.contextRetrievalFailureReason ?? "",
      readOnlyEnforced: true,
      modifyProhibited: true,
      deleteProhibited: true,
      moveProhibited: true,
      writeAccessSeparateFromReadAccess: true,
      accessEventLoggedReference: input.accessEventLoggedReference ?? "",
      auditLogReferenceId: input.auditLogReferenceId ?? "",
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
