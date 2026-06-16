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

export type SyntheticJournalEntryApprovalStatus =
  | "draft"
  | "pending_validation"
  | "pending_review"
  | "declined_with_warning"
  | "controller_override_pending"
  | "approved_for_import"
  | "submitted"
  | "posted"
  | "rejected";

export type SyntheticJournalEntryErpSubmissionStatus = "not_submitted" | "pending" | "submitted" | "posted" | "failed";

export type SyntheticJournalEntryErpPostingMode = "direct_api" | "import_file" | "formatted_email" | "not_set";

export type SyntheticJournalEntryValidationStatus = "not_run" | "passed" | "failed";

export type SyntheticJournalEntryFraudDetectionStatus = "not_run" | "passed" | "flagged";

export type SyntheticJournalEntryReasonablenessStatus = "not_run" | "passed" | "flagged";

export type SyntheticJournalEntryCandidateState = "draft";

export interface SyntheticJournalEntryHeader {
  entity: string;
  period: string;
  date: string;
  currency: string;
  memo: string;
  sourceTask: string;
  sourceRole: SyntheticRoleType | "";
}

export interface SyntheticJournalEntryOrigin {
  workflowId: string;
  emailId: string;
  sender: string;
  subject: string;
  attachmentReferences: string[];
  extractionNotes: string;
}

export interface SyntheticJournalEntryDimensions {
  location: string;
  class: string;
  department: string;
  project: string;
  customer: string;
  vendor: string;
  subsidiary: string;
  intercompany: string;
  customTags: string[];
}

export interface SyntheticJournalEntryCandidateLine {
  lineAccountId: string;
  lineDescription: string;
  lineDebit: number;
  lineCredit: number;
  dimensions: SyntheticJournalEntryDimensions;
}

export interface BuildJournalEntryCandidateInput {
  roleType?: SyntheticRoleType;
  roleInstanceId?: string;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  taskMappingReferenceId?: string;
  header?: SyntheticJournalEntryHeader;
  entityId?: string;
  accountingPeriod?: string;
  entryDate?: string;
  currency?: string;
  memo?: string;
  origin?: SyntheticJournalEntryOrigin;
  lines?: SyntheticJournalEntryCandidateLine[];
  evidenceLinkReferenceIds?: string[];
  supportPackageReferenceId?: string;
  leadSheetReferenceId?: string;
  totalDebits?: number;
  totalCredits?: number;
  balanceConfirmed?: boolean;
  approvalStatus?: SyntheticJournalEntryApprovalStatus;
  erpSubmissionStatus?: SyntheticJournalEntryErpSubmissionStatus;
  erpPostingMode?: SyntheticJournalEntryErpPostingMode;
  validationStatus?: SyntheticJournalEntryValidationStatus;
  fraudDetectionStatus?: SyntheticJournalEntryFraudDetectionStatus;
  reasonablenessStatus?: SyntheticJournalEntryReasonablenessStatus;
  declineReason?: string;
  warningReason?: string;
  overrideReason?: string;
  overrideRequesterId?: string;
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

export interface SyntheticJournalEntryCandidate {
  journalEntryCandidateId: string;
  journalEntryCandidateKey: string;
  roleType: SyntheticRoleType;
  roleInstanceId: string;
  taskMappingReferenceId: string;
  header: SyntheticJournalEntryHeader;
  entityId: string;
  accountingPeriod: string;
  entryDate: string;
  currency: string;
  memo: string;
  origin: SyntheticJournalEntryOrigin;
  lines: SyntheticJournalEntryCandidateLine[];
  lineAccountId: string;
  lineDescription: string;
  lineDebit: number;
  lineCredit: number;
  dimensions: SyntheticJournalEntryDimensions;
  evidenceLinkReferenceIds: string[];
  supportPackageReferenceId: string;
  leadSheetReferenceId: string;
  totalDebits: number;
  totalCredits: number;
  balanceConfirmed: boolean;
  approvalStatus: SyntheticJournalEntryApprovalStatus;
  erpSubmissionStatus: SyntheticJournalEntryErpSubmissionStatus;
  erpPostingMode: SyntheticJournalEntryErpPostingMode;
  validationStatus: SyntheticJournalEntryValidationStatus;
  fraudDetectionStatus: SyntheticJournalEntryFraudDetectionStatus;
  reasonablenessStatus: SyntheticJournalEntryReasonablenessStatus;
  declineReason: string;
  warningReason: string;
  overrideReason: string;
  overrideRequesterId: string;
  candidateState: SyntheticJournalEntryCandidateState;
  isMetadataOnly: true;
  notPostableUntilGatesPassed: true;
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

export interface BuildJournalEntryCandidateResult {
  journalEntryCandidate: SyntheticJournalEntryCandidate | null;
  skipped: boolean;
  warnings: string[];
}

const EMPTY_DIMENSIONS: SyntheticJournalEntryDimensions = {
  location: "",
  class: "",
  department: "",
  project: "",
  customer: "",
  vendor: "",
  subsidiary: "",
  intercompany: "",
  customTags: [],
};

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getBoundPhase38SnapshotHash(input: BuildJournalEntryCandidateInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildJournalEntryCandidateInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildJournalEntryCandidateInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildJournalEntryCandidateInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildJournalEntryCandidateInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildJournalEntryCandidateInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildJournalEntryCandidateInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildJournalEntryCandidateInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildJournalEntryCandidateInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function getHeader(input: BuildJournalEntryCandidateInput): SyntheticJournalEntryHeader {
  return (
    input.header ?? {
      entity: input.entityId ?? "",
      period: input.accountingPeriod ?? "",
      date: input.entryDate ?? "",
      currency: input.currency ?? "",
      memo: input.memo ?? "",
      sourceTask: input.taskMappingReferenceId ?? "",
      sourceRole: input.roleType ?? "",
    }
  );
}

function getOrigin(input: BuildJournalEntryCandidateInput): SyntheticJournalEntryOrigin {
  return (
    input.origin ?? {
      workflowId: "",
      emailId: "",
      sender: "",
      subject: "",
      attachmentReferences: [],
      extractionNotes: "",
    }
  );
}

function getTotalDebits(input: BuildJournalEntryCandidateInput): number {
  return input.totalDebits ?? getInputArray(input.lines).reduce((total, line) => total + line.lineDebit, 0);
}

function getTotalCredits(input: BuildJournalEntryCandidateInput): number {
  return input.totalCredits ?? getInputArray(input.lines).reduce((total, line) => total + line.lineCredit, 0);
}

function getBalanceConfirmed(input: BuildJournalEntryCandidateInput): boolean {
  if (input.balanceConfirmed !== undefined) {
    return input.balanceConfirmed;
  }

  return getTotalDebits(input) === getTotalCredits(input);
}

function getFirstLine(input: BuildJournalEntryCandidateInput): SyntheticJournalEntryCandidateLine {
  return getInputArray(input.lines)[0] ?? {
    lineAccountId: "",
    lineDescription: "",
    lineDebit: 0,
    lineCredit: 0,
    dimensions: EMPTY_DIMENSIONS,
  };
}

function collectMissingRequiredIdentifiers(input: BuildJournalEntryCandidateInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.roleType)) {
    missing.push("roleType");
  }

  if (!hasValue(input.roleInstanceId)) {
    missing.push("roleInstanceId");
  }

  if (!hasValue(input.entityId)) {
    missing.push("entityId");
  }

  if (!hasValue(input.accountingPeriod)) {
    missing.push("accountingPeriod");
  }

  if (getInputArray(input.lines).length === 0) {
    missing.push("lines");
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

function buildDerivationHash(input: BuildJournalEntryCandidateInput): string {
  return stableSnapshotHash({
    roleType: input.roleType,
    roleInstanceId: input.roleInstanceId,
    taskMappingReferenceId: input.taskMappingReferenceId ?? "",
    header: getHeader(input),
    entityId: input.entityId,
    accountingPeriod: input.accountingPeriod,
    entryDate: input.entryDate ?? "",
    currency: input.currency ?? "",
    memo: input.memo ?? "",
    origin: getOrigin(input),
    lines: getInputArray(input.lines),
    evidenceLinkReferenceIds: getInputArray(input.evidenceLinkReferenceIds),
    supportPackageReferenceId: input.supportPackageReferenceId ?? "",
    leadSheetReferenceId: input.leadSheetReferenceId ?? "",
    totalDebits: getTotalDebits(input),
    totalCredits: getTotalCredits(input),
    balanceConfirmed: getBalanceConfirmed(input),
    approvalStatus: input.approvalStatus ?? "draft",
    erpSubmissionStatus: input.erpSubmissionStatus ?? "not_submitted",
    erpPostingMode: input.erpPostingMode ?? "not_set",
    validationStatus: input.validationStatus ?? "not_run",
    fraudDetectionStatus: input.fraudDetectionStatus ?? "not_run",
    reasonablenessStatus: input.reasonablenessStatus ?? "not_run",
    declineReason: input.declineReason ?? "",
    warningReason: input.warningReason ?? "",
    overrideReason: input.overrideReason ?? "",
    overrideRequesterId: input.overrideRequesterId ?? "",
    candidateState: "draft",
    isMetadataOnly: true,
    notPostableUntilGatesPassed: true,
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildJournalEntryCandidate(
  input: BuildJournalEntryCandidateInput,
): BuildJournalEntryCandidateResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      journalEntryCandidate: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const roleType = input.roleType as SyntheticRoleType;
  const roleInstanceId = input.roleInstanceId as string;
  const entityId = input.entityId as string;
  const accountingPeriod = input.accountingPeriod as string;
  const firstLine = getFirstLine(input);
  const boundPhase38SnapshotHash = getBoundPhase38SnapshotHash(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);
  const companyId = getCompanyId(input);
  const scope = getScope(input);
  const customerIsolation = getCustomerIsolation(input);
  const firmIsolation = getFirmIsolation(input);
  const clientIsolation = getClientIsolation(input);
  const totalDebits = getTotalDebits(input);
  const totalCredits = getTotalCredits(input);
  const balanceConfirmed = getBalanceConfirmed(input);
  const derivationHash = buildDerivationHash(input);
  const journalEntryCandidateKey = stableSnapshotHash({
    roleType,
    roleInstanceId,
    companyId,
    entityId,
    accountingPeriod,
    entryDate: input.entryDate ?? "",
    totalDebits,
    totalCredits,
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const journalEntryCandidateId = stableSnapshotHash({
    journalEntryCandidateKey,
    artifactType: "SyntheticJournalEntryCandidate",
  });

  return {
    journalEntryCandidate: {
      journalEntryCandidateId,
      journalEntryCandidateKey,
      roleType,
      roleInstanceId,
      taskMappingReferenceId: input.taskMappingReferenceId ?? "",
      header: getHeader(input),
      entityId,
      accountingPeriod,
      entryDate: input.entryDate ?? "",
      currency: input.currency ?? "",
      memo: input.memo ?? "",
      origin: getOrigin(input),
      lines: getInputArray(input.lines),
      lineAccountId: firstLine.lineAccountId,
      lineDescription: firstLine.lineDescription,
      lineDebit: firstLine.lineDebit,
      lineCredit: firstLine.lineCredit,
      dimensions: firstLine.dimensions,
      evidenceLinkReferenceIds: getInputArray(input.evidenceLinkReferenceIds),
      supportPackageReferenceId: input.supportPackageReferenceId ?? "",
      leadSheetReferenceId: input.leadSheetReferenceId ?? "",
      totalDebits,
      totalCredits,
      balanceConfirmed,
      approvalStatus: input.approvalStatus ?? "draft",
      erpSubmissionStatus: input.erpSubmissionStatus ?? "not_submitted",
      erpPostingMode: input.erpPostingMode ?? "not_set",
      validationStatus: input.validationStatus ?? "not_run",
      fraudDetectionStatus: input.fraudDetectionStatus ?? "not_run",
      reasonablenessStatus: input.reasonablenessStatus ?? "not_run",
      declineReason: input.declineReason ?? "",
      warningReason: input.warningReason ?? "",
      overrideReason: input.overrideReason ?? "",
      overrideRequesterId: input.overrideRequesterId ?? "",
      candidateState: "draft",
      isMetadataOnly: true,
      notPostableUntilGatesPassed: true,
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
