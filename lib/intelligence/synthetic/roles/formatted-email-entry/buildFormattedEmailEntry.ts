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

export interface SyntheticFormattedEntryLayout {
  layoutName: string;
  sectionOrder: string[];
  lineGroupingRule: string;
}

export interface SyntheticFormattedEntrySectionFormat {
  formatName: string;
  fieldOrder: string[];
  separator: string;
}

export interface SyntheticDebitCreditPresentation {
  presentationType: "separate_columns" | "signed_amount" | "debit_credit_indicator" | "other";
  debitLabel: string;
  creditLabel: string;
}

export interface SyntheticAccountPresentationFormat {
  accountIdentifierFormat: string;
  accountNameIncluded: boolean;
  accountNumberIncluded: boolean;
}

export interface SyntheticDimensionPresentationFormat {
  dimensionOrder: string[];
  includeEmptyDimensions: boolean;
  dimensionSeparator: string;
}

export interface BuildFormattedEmailEntryInput {
  roleType?: SyntheticRoleType;
  roleInstanceId?: string;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  journalEntryCandidateReferenceId?: string;
  workpaperPackageReferenceId?: string;
  companyPreferredFormatReferenceId?: string;
  formattedEntryLayout?: SyntheticFormattedEntryLayout;
  entryHeaderFormat?: SyntheticFormattedEntrySectionFormat;
  entryLineFormat?: SyntheticFormattedEntrySectionFormat;
  debitCreditPresentation?: SyntheticDebitCreditPresentation;
  accountPresentationFormat?: SyntheticAccountPresentationFormat;
  dimensionPresentationFormat?: SyntheticDimensionPresentationFormat;
  recipientUserId?: string;
  recipientEmailAddress?: string;
  emailSubjectFormat?: string;
  emailBodyFormat?: string;
  workpaperPackageAttachmentReference?: string;
  formattedEntryReadyForDelivery?: boolean;
  formattedEmailEntryComplete?: boolean;
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

export interface SyntheticFormattedEmailEntry {
  formattedEmailEntryId: string;
  formattedEmailEntryKey: string;
  roleType: SyntheticRoleType;
  roleInstanceId: string;
  journalEntryCandidateReferenceId: string;
  workpaperPackageReferenceId: string;
  companyPreferredFormatReferenceId: string;
  formattedEntryLayout: SyntheticFormattedEntryLayout | null;
  entryHeaderFormat: SyntheticFormattedEntrySectionFormat | null;
  entryLineFormat: SyntheticFormattedEntrySectionFormat | null;
  debitCreditPresentation: SyntheticDebitCreditPresentation | null;
  accountPresentationFormat: SyntheticAccountPresentationFormat | null;
  dimensionPresentationFormat: SyntheticDimensionPresentationFormat | null;
  recipientUserId: string;
  recipientEmailAddress: string;
  emailSubjectFormat: string;
  emailBodyFormat: string;
  workpaperPackageAttachmentReference: string;
  deliveredWithWorkpaperPackage: true;
  manualEntryByRecipient: true;
  noDirectSystemAccessRequired: true;
  firstClassFallbackPath: true;
  formattedEntryReadyForDelivery: boolean;
  formattedEmailEntryComplete: boolean;
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

export interface BuildFormattedEmailEntryResult {
  formattedEmailEntry: SyntheticFormattedEmailEntry | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getBoundPhase38SnapshotHash(input: BuildFormattedEmailEntryInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildFormattedEmailEntryInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildFormattedEmailEntryInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildFormattedEmailEntryInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildFormattedEmailEntryInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildFormattedEmailEntryInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildFormattedEmailEntryInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildFormattedEmailEntryInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildFormattedEmailEntryInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function getFormattedEmailEntryComplete(input: BuildFormattedEmailEntryInput): boolean {
  if (input.formattedEmailEntryComplete !== undefined) {
    return input.formattedEmailEntryComplete;
  }

  return (
    hasValue(input.journalEntryCandidateReferenceId) &&
    hasValue(input.companyPreferredFormatReferenceId) &&
    hasValue(input.emailSubjectFormat) &&
    hasValue(input.emailBodyFormat)
  );
}

function collectMissingRequiredIdentifiers(input: BuildFormattedEmailEntryInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.roleType)) {
    missing.push("roleType");
  }

  if (!hasValue(input.roleInstanceId)) {
    missing.push("roleInstanceId");
  }

  if (!hasValue(input.journalEntryCandidateReferenceId)) {
    missing.push("journalEntryCandidateReferenceId");
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

function buildDerivationHash(input: BuildFormattedEmailEntryInput): string {
  return stableSnapshotHash({
    roleType: input.roleType,
    roleInstanceId: input.roleInstanceId,
    journalEntryCandidateReferenceId: input.journalEntryCandidateReferenceId ?? "",
    workpaperPackageReferenceId: input.workpaperPackageReferenceId ?? "",
    companyPreferredFormatReferenceId: input.companyPreferredFormatReferenceId ?? "",
    formattedEntryLayout: input.formattedEntryLayout ?? null,
    entryHeaderFormat: input.entryHeaderFormat ?? null,
    entryLineFormat: input.entryLineFormat ?? null,
    debitCreditPresentation: input.debitCreditPresentation ?? null,
    accountPresentationFormat: input.accountPresentationFormat ?? null,
    dimensionPresentationFormat: input.dimensionPresentationFormat ?? null,
    recipientUserId: input.recipientUserId ?? "",
    recipientEmailAddress: input.recipientEmailAddress ?? "",
    emailSubjectFormat: input.emailSubjectFormat ?? "",
    emailBodyFormat: input.emailBodyFormat ?? "",
    workpaperPackageAttachmentReference: input.workpaperPackageAttachmentReference ?? "",
    deliveredWithWorkpaperPackage: true,
    manualEntryByRecipient: true,
    noDirectSystemAccessRequired: true,
    firstClassFallbackPath: true,
    formattedEntryReadyForDelivery: input.formattedEntryReadyForDelivery === true,
    formattedEmailEntryComplete: getFormattedEmailEntryComplete(input),
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildFormattedEmailEntry(input: BuildFormattedEmailEntryInput): BuildFormattedEmailEntryResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      formattedEmailEntry: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const roleType = input.roleType as SyntheticRoleType;
  const roleInstanceId = input.roleInstanceId as string;
  const journalEntryCandidateReferenceId = input.journalEntryCandidateReferenceId as string;
  const boundPhase38SnapshotHash = getBoundPhase38SnapshotHash(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);
  const companyId = getCompanyId(input);
  const scope = getScope(input);
  const customerIsolation = getCustomerIsolation(input);
  const firmIsolation = getFirmIsolation(input);
  const clientIsolation = getClientIsolation(input);
  const formattedEmailEntryComplete = getFormattedEmailEntryComplete(input);
  const derivationHash = buildDerivationHash(input);
  const formattedEmailEntryKey = stableSnapshotHash({
    roleType,
    roleInstanceId,
    companyId,
    journalEntryCandidateReferenceId,
    workpaperPackageReferenceId: input.workpaperPackageReferenceId ?? "",
    companyPreferredFormatReferenceId: input.companyPreferredFormatReferenceId ?? "",
    recipientUserId: input.recipientUserId ?? "",
    recipientEmailAddress: input.recipientEmailAddress ?? "",
    formattedEmailEntryComplete,
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const formattedEmailEntryId = stableSnapshotHash({
    formattedEmailEntryKey,
    artifactType: "SyntheticFormattedEmailEntry",
  });

  return {
    formattedEmailEntry: {
      formattedEmailEntryId,
      formattedEmailEntryKey,
      roleType,
      roleInstanceId,
      journalEntryCandidateReferenceId,
      workpaperPackageReferenceId: input.workpaperPackageReferenceId ?? "",
      companyPreferredFormatReferenceId: input.companyPreferredFormatReferenceId ?? "",
      formattedEntryLayout: input.formattedEntryLayout ?? null,
      entryHeaderFormat: input.entryHeaderFormat ?? null,
      entryLineFormat: input.entryLineFormat ?? null,
      debitCreditPresentation: input.debitCreditPresentation ?? null,
      accountPresentationFormat: input.accountPresentationFormat ?? null,
      dimensionPresentationFormat: input.dimensionPresentationFormat ?? null,
      recipientUserId: input.recipientUserId ?? "",
      recipientEmailAddress: input.recipientEmailAddress ?? "",
      emailSubjectFormat: input.emailSubjectFormat ?? "",
      emailBodyFormat: input.emailBodyFormat ?? "",
      workpaperPackageAttachmentReference: input.workpaperPackageAttachmentReference ?? "",
      deliveredWithWorkpaperPackage: true,
      manualEntryByRecipient: true,
      noDirectSystemAccessRequired: true,
      firstClassFallbackPath: true,
      formattedEntryReadyForDelivery: input.formattedEntryReadyForDelivery === true,
      formattedEmailEntryComplete,
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
