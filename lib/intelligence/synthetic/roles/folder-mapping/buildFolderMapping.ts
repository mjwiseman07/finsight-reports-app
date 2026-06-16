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

export type SyntheticFolderMappingLevel = "firm" | "company" | "engagement" | "role";

export type SyntheticFolderMappingConfiguredByAuthority =
  | "firm_admin"
  | "company_admin"
  | "controller"
  | "manager";

export type SyntheticFolderMappingStatus = "active" | "inactive";

export interface SyntheticFolderMappingFallback {
  fallbackMappingReferenceId: string;
  fallbackFolderPath: string;
  fallbackReason: string;
}

export interface BuildFolderMappingInput {
  mappingLevel?: SyntheticFolderMappingLevel;
  roleType?: SyntheticRoleType;
  roleInstanceId?: string;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  firmId?: string;
  companyId?: string;
  engagementId?: string;
  taskFamily?: string;
  entityId?: string;
  accountingPeriod?: string;
  storageEnvironment?: SyntheticDriveStorageEnvironment;
  designatedFolderPath?: string;
  folderPathTemplate?: string;
  fileNamingConvention?: string;
  fileNamingComponents?: string[];
  mappingPriority?: number;
  mappingResolutionOrder?: SyntheticFolderMappingLevel[];
  configuredByUserId?: string;
  configuredByAuthority?: SyntheticFolderMappingConfiguredByAuthority;
  mappingStatus?: SyntheticFolderMappingStatus;
  defaultMappingFallback?: SyntheticFolderMappingFallback;
  folderMappingComplete?: boolean;
  boundPhase38SnapshotHash?: string;
  boundPhase37SnapshotHash?: string;
  phase39StaleMarker?: SyntheticPhase38StaleMarker;
  executionReady?: boolean;
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

export interface SyntheticFolderMapping {
  folderMappingId: string;
  folderMappingKey: string;
  mappingLevel: SyntheticFolderMappingLevel;
  roleType: SyntheticRoleType | "";
  roleInstanceId: string;
  firmId: string;
  companyId: string;
  engagementId: string;
  taskFamily: string;
  entityId: string;
  accountingPeriod: string;
  storageEnvironment: SyntheticDriveStorageEnvironment;
  designatedFolderPath: string;
  folderPathTemplate: string;
  fileNamingConvention: string;
  fileNamingComponents: string[];
  mappingPriority: number;
  mappingResolutionOrder: SyntheticFolderMappingLevel[];
  configuredByUserId: string;
  configuredByAuthority: SyntheticFolderMappingConfiguredByAuthority | "";
  mappingStatus: SyntheticFolderMappingStatus;
  defaultMappingFallback: SyntheticFolderMappingFallback | null;
  folderMappingComplete: boolean;
  boundPhase38SnapshotHash: string;
  boundPhase37SnapshotHash: string;
  phase39StaleMarker: SyntheticPhase38StaleMarker;
  executable: false;
  executionReady: boolean;
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

export interface BuildFolderMappingResult {
  folderMapping: SyntheticFolderMapping | null;
  skipped: boolean;
  warnings: string[];
}

const DEFAULT_MAPPING_RESOLUTION_ORDER: SyntheticFolderMappingLevel[] = [
  "role",
  "engagement",
  "company",
  "firm",
];

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getBoundPhase38SnapshotHash(input: BuildFolderMappingInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildFolderMappingInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildFolderMappingInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildFolderMappingInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildFolderMappingInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildFolderMappingInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildFolderMappingInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildFolderMappingInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildFolderMappingInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function getMappingResolutionOrder(input: BuildFolderMappingInput): SyntheticFolderMappingLevel[] {
  return input.mappingResolutionOrder ?? DEFAULT_MAPPING_RESOLUTION_ORDER;
}

function getFolderMappingComplete(input: BuildFolderMappingInput): boolean {
  if (input.folderMappingComplete !== undefined) {
    return input.folderMappingComplete;
  }

  return hasValue(input.designatedFolderPath) || hasValue(input.folderPathTemplate);
}

function collectMissingRequiredIdentifiers(input: BuildFolderMappingInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.mappingLevel)) {
    missing.push("mappingLevel");
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

function buildDerivationHash(input: BuildFolderMappingInput): string {
  return stableSnapshotHash({
    mappingLevel: input.mappingLevel,
    roleType: input.roleType ?? "",
    roleInstanceId: input.roleInstanceId ?? "",
    firmId: input.firmId ?? "",
    companyId: getCompanyId(input),
    engagementId: input.engagementId ?? "",
    taskFamily: input.taskFamily ?? "",
    entityId: input.entityId ?? "",
    accountingPeriod: input.accountingPeriod ?? "",
    storageEnvironment: input.storageEnvironment,
    designatedFolderPath: input.designatedFolderPath ?? "",
    folderPathTemplate: input.folderPathTemplate ?? "",
    fileNamingConvention: input.fileNamingConvention ?? "",
    fileNamingComponents: getInputArray(input.fileNamingComponents),
    mappingPriority: input.mappingPriority ?? 0,
    mappingResolutionOrder: getMappingResolutionOrder(input),
    configuredByUserId: input.configuredByUserId ?? "",
    configuredByAuthority: input.configuredByAuthority ?? "",
    mappingStatus: input.mappingStatus ?? "active",
    defaultMappingFallback: input.defaultMappingFallback ?? null,
    folderMappingComplete: getFolderMappingComplete(input),
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildFolderMapping(input: BuildFolderMappingInput): BuildFolderMappingResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      folderMapping: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const mappingLevel = input.mappingLevel as SyntheticFolderMappingLevel;
  const storageEnvironment = input.storageEnvironment as SyntheticDriveStorageEnvironment;
  const boundPhase38SnapshotHash = getBoundPhase38SnapshotHash(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);
  const companyId = getCompanyId(input);
  const scope = getScope(input);
  const customerIsolation = getCustomerIsolation(input);
  const firmIsolation = getFirmIsolation(input);
  const clientIsolation = getClientIsolation(input);
  const folderMappingComplete = getFolderMappingComplete(input);
  const derivationHash = buildDerivationHash(input);
  const folderMappingKey = stableSnapshotHash({
    mappingLevel,
    roleType: input.roleType ?? "",
    roleInstanceId: input.roleInstanceId ?? "",
    firmId: input.firmId ?? "",
    companyId,
    engagementId: input.engagementId ?? "",
    taskFamily: input.taskFamily ?? "",
    entityId: input.entityId ?? "",
    accountingPeriod: input.accountingPeriod ?? "",
    storageEnvironment,
    designatedFolderPath: input.designatedFolderPath ?? "",
    folderPathTemplate: input.folderPathTemplate ?? "",
    mappingPriority: input.mappingPriority ?? 0,
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const folderMappingId = stableSnapshotHash({
    folderMappingKey,
    artifactType: "SyntheticFolderMapping",
  });

  return {
    folderMapping: {
      folderMappingId,
      folderMappingKey,
      mappingLevel,
      roleType: input.roleType ?? "",
      roleInstanceId: input.roleInstanceId ?? "",
      firmId: input.firmId ?? "",
      companyId,
      engagementId: input.engagementId ?? "",
      taskFamily: input.taskFamily ?? "",
      entityId: input.entityId ?? "",
      accountingPeriod: input.accountingPeriod ?? "",
      storageEnvironment,
      designatedFolderPath: input.designatedFolderPath ?? "",
      folderPathTemplate: input.folderPathTemplate ?? "",
      fileNamingConvention: input.fileNamingConvention ?? "",
      fileNamingComponents: getInputArray(input.fileNamingComponents),
      mappingPriority: input.mappingPriority ?? 0,
      mappingResolutionOrder: getMappingResolutionOrder(input),
      configuredByUserId: input.configuredByUserId ?? "",
      configuredByAuthority: input.configuredByAuthority ?? "",
      mappingStatus: input.mappingStatus ?? "active",
      defaultMappingFallback: input.defaultMappingFallback ?? null,
      folderMappingComplete,
      boundPhase38SnapshotHash,
      boundPhase37SnapshotHash,
      phase39StaleMarker: getPhase39StaleMarker(input),
      executable: false,
      executionReady: input.executionReady === true,
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
