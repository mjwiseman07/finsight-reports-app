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

export type SyntheticAttachmentFileType = "xlsx" | "xls" | "csv" | "pdf" | "docx" | "image" | "other";

export type SyntheticAttachmentParseStatus = "pending" | "parsed" | "partial" | "failed" | "unsupported_format";

export interface SyntheticAttachmentSizeMetadata {
  sizeReferenceId: string;
  sizeBytes: number;
  sizeCategory: "unknown" | "small" | "medium" | "large";
}

export interface SyntheticAttachmentParseConfidenceMetadata {
  confidenceReferenceId: string;
  confidenceLevel: "unknown" | "low" | "medium" | "high";
  confidenceReason: string;
}

export interface BuildAttachmentParseInput {
  roleType?: SyntheticRoleType;
  roleInstanceId?: string;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  emailIntakeReferenceId?: string;
  attachmentReference?: string;
  attachmentFileName?: string;
  attachmentFileType?: SyntheticAttachmentFileType;
  attachmentSizeMetadata?: SyntheticAttachmentSizeMetadata[];
  parseStatus?: SyntheticAttachmentParseStatus;
  extractedDataReference?: string;
  extractedFieldReferences?: string[];
  columnMappingReferences?: string[];
  accountMappingReferences?: string[];
  dimensionMappingReferences?: string[];
  dataQualityFlags?: string[];
  missingDataFlags?: string[];
  ambiguousDataFlags?: string[];
  parseConfidenceMetadata?: SyntheticAttachmentParseConfidenceMetadata[];
  requiresHumanReview?: boolean;
  humanReviewReason?: string;
  parseFailureReason?: string;
  linkedTaskReferenceIds?: string[];
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

export interface SyntheticAttachmentParse {
  attachmentParseId: string;
  attachmentParseKey: string;
  roleType: SyntheticRoleType;
  roleInstanceId: string;
  emailIntakeReferenceId: string;
  attachmentReference: string;
  attachmentFileName: string;
  attachmentFileType: SyntheticAttachmentFileType;
  attachmentSizeMetadata: SyntheticAttachmentSizeMetadata[];
  parseStatus: SyntheticAttachmentParseStatus;
  extractedDataReference: string;
  extractedFieldReferences: string[];
  columnMappingReferences: string[];
  accountMappingReferences: string[];
  dimensionMappingReferences: string[];
  dataQualityFlags: string[];
  missingDataFlags: string[];
  ambiguousDataFlags: string[];
  parseConfidenceMetadata: SyntheticAttachmentParseConfidenceMetadata[];
  requiresHumanReview: boolean;
  humanReviewReason: string;
  parseFailureReason: string;
  failClosedOnUnsupportedFormat: true;
  failClosedOnAmbiguousData: true;
  linkedTaskReferenceIds: string[];
  auditLogReferenceId: string;
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

export interface BuildAttachmentParseResult {
  attachmentParse: SyntheticAttachmentParse | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getBoundPhase38SnapshotHash(input: BuildAttachmentParseInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildAttachmentParseInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildAttachmentParseInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildAttachmentParseInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildAttachmentParseInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildAttachmentParseInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildAttachmentParseInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildAttachmentParseInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildAttachmentParseInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function getParseStatus(input: BuildAttachmentParseInput): SyntheticAttachmentParseStatus {
  if (input.parseStatus) {
    return input.parseStatus;
  }

  if (input.attachmentFileType === "other") {
    return "unsupported_format";
  }

  if (getInputArray(input.ambiguousDataFlags).length > 0 || getInputArray(input.missingDataFlags).length > 0) {
    return "partial";
  }

  return "pending";
}

function getRequiresHumanReview(input: BuildAttachmentParseInput): boolean {
  return (
    input.requiresHumanReview === true ||
    input.attachmentFileType === "other" ||
    getInputArray(input.dataQualityFlags).length > 0 ||
    getInputArray(input.missingDataFlags).length > 0 ||
    getInputArray(input.ambiguousDataFlags).length > 0
  );
}

function collectMissingRequiredIdentifiers(input: BuildAttachmentParseInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.roleType)) {
    missing.push("roleType");
  }

  if (!hasValue(input.roleInstanceId)) {
    missing.push("roleInstanceId");
  }

  if (!hasValue(input.attachmentFileType)) {
    missing.push("attachmentFileType");
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

function buildDerivationHash(input: BuildAttachmentParseInput): string {
  return stableSnapshotHash({
    roleType: input.roleType,
    roleInstanceId: input.roleInstanceId,
    emailIntakeReferenceId: input.emailIntakeReferenceId ?? "",
    attachmentReference: input.attachmentReference ?? "",
    attachmentFileName: input.attachmentFileName ?? "",
    attachmentFileType: input.attachmentFileType,
    attachmentSizeMetadata: getInputArray(input.attachmentSizeMetadata),
    parseStatus: getParseStatus(input),
    extractedDataReference: input.extractedDataReference ?? "",
    extractedFieldReferences: getInputArray(input.extractedFieldReferences),
    columnMappingReferences: getInputArray(input.columnMappingReferences),
    accountMappingReferences: getInputArray(input.accountMappingReferences),
    dimensionMappingReferences: getInputArray(input.dimensionMappingReferences),
    dataQualityFlags: getInputArray(input.dataQualityFlags),
    missingDataFlags: getInputArray(input.missingDataFlags),
    ambiguousDataFlags: getInputArray(input.ambiguousDataFlags),
    parseConfidenceMetadata: getInputArray(input.parseConfidenceMetadata),
    requiresHumanReview: getRequiresHumanReview(input),
    humanReviewReason: input.humanReviewReason ?? "",
    parseFailureReason: input.parseFailureReason ?? "",
    failClosedOnUnsupportedFormat: true,
    failClosedOnAmbiguousData: true,
    linkedTaskReferenceIds: getInputArray(input.linkedTaskReferenceIds),
    auditLogReferenceId: input.auditLogReferenceId ?? "",
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildAttachmentParse(input: BuildAttachmentParseInput): BuildAttachmentParseResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      attachmentParse: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const roleType = input.roleType as SyntheticRoleType;
  const roleInstanceId = input.roleInstanceId as string;
  const attachmentFileType = input.attachmentFileType as SyntheticAttachmentFileType;
  const boundPhase38SnapshotHash = getBoundPhase38SnapshotHash(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);
  const companyId = getCompanyId(input);
  const scope = getScope(input);
  const customerIsolation = getCustomerIsolation(input);
  const firmIsolation = getFirmIsolation(input);
  const clientIsolation = getClientIsolation(input);
  const parseStatus = getParseStatus(input);
  const requiresHumanReview = getRequiresHumanReview(input);
  const derivationHash = buildDerivationHash(input);
  const attachmentParseKey = stableSnapshotHash({
    roleType,
    roleInstanceId,
    companyId,
    emailIntakeReferenceId: input.emailIntakeReferenceId ?? "",
    attachmentReference: input.attachmentReference ?? "",
    attachmentFileName: input.attachmentFileName ?? "",
    attachmentFileType,
    parseStatus,
    requiresHumanReview,
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const attachmentParseId = stableSnapshotHash({
    attachmentParseKey,
    artifactType: "SyntheticAttachmentParse",
  });

  return {
    attachmentParse: {
      attachmentParseId,
      attachmentParseKey,
      roleType,
      roleInstanceId,
      emailIntakeReferenceId: input.emailIntakeReferenceId ?? "",
      attachmentReference: input.attachmentReference ?? "",
      attachmentFileName: input.attachmentFileName ?? "",
      attachmentFileType,
      attachmentSizeMetadata: getInputArray(input.attachmentSizeMetadata),
      parseStatus,
      extractedDataReference: input.extractedDataReference ?? "",
      extractedFieldReferences: getInputArray(input.extractedFieldReferences),
      columnMappingReferences: getInputArray(input.columnMappingReferences),
      accountMappingReferences: getInputArray(input.accountMappingReferences),
      dimensionMappingReferences: getInputArray(input.dimensionMappingReferences),
      dataQualityFlags: getInputArray(input.dataQualityFlags),
      missingDataFlags: getInputArray(input.missingDataFlags),
      ambiguousDataFlags: getInputArray(input.ambiguousDataFlags),
      parseConfidenceMetadata: getInputArray(input.parseConfidenceMetadata),
      requiresHumanReview,
      humanReviewReason: input.humanReviewReason ?? "",
      parseFailureReason: input.parseFailureReason ?? "",
      failClosedOnUnsupportedFormat: true,
      failClosedOnAmbiguousData: true,
      linkedTaskReferenceIds: getInputArray(input.linkedTaskReferenceIds),
      auditLogReferenceId: input.auditLogReferenceId ?? "",
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
