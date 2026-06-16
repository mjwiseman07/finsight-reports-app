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

export interface SyntheticLeadSheetLineSummary {
  lineSummaryAccounts: string[];
  lineSummaryDebits: number[];
  lineSummaryCredits: number[];
  lineSummaryDescriptions: string[];
}

export interface SyntheticLeadSheetReviewerFields {
  reviewerReferenceId: string;
  reviewerNotes: string;
  reviewerStatus: "not_started" | "in_review" | "approved" | "rejected" | "needs_remediation";
}

export interface BuildLeadSheetInput {
  roleType?: SyntheticRoleType;
  roleInstanceId?: string;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  rolePreparerIdentity?: string;
  journalEntryCandidateReferenceId?: string;
  workpaperReferenceId?: string;
  entityId?: string;
  accountingPeriod?: string;
  businessPurpose?: string;
  sourceTask?: string;
  sourceEmailReference?: string;
  lineSummary?: SyntheticLeadSheetLineSummary;
  lineSummaryAccounts?: string[];
  lineSummaryDebits?: number[];
  lineSummaryCredits?: number[];
  lineSummaryDescriptions?: string[];
  totalDebits?: number;
  totalCredits?: number;
  balanceConfirmed?: boolean;
  erpDestination?: string;
  erpStatus?: string;
  approvalStatus?: string;
  reviewerFields?: SyntheticLeadSheetReviewerFields[];
  backupDocumentationReferenceIds?: string[];
  sourceFileReferenceIds?: string[];
  leadSheetComplete?: boolean;
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

export interface SyntheticLeadSheet {
  leadSheetId: string;
  leadSheetKey: string;
  roleType: SyntheticRoleType;
  roleInstanceId: string;
  rolePreparerIdentity: string;
  journalEntryCandidateReferenceId: string;
  workpaperReferenceId: string;
  entityId: string;
  accountingPeriod: string;
  businessPurpose: string;
  sourceTask: string;
  sourceEmailReference: string;
  lineSummary: SyntheticLeadSheetLineSummary;
  lineSummaryAccounts: string[];
  lineSummaryDebits: number[];
  lineSummaryCredits: number[];
  lineSummaryDescriptions: string[];
  totalDebits: number;
  totalCredits: number;
  balanceConfirmed: boolean;
  erpDestination: string;
  erpStatus: string;
  approvalStatus: string;
  reviewerFields: SyntheticLeadSheetReviewerFields[];
  backupDocumentationReferenceIds: string[];
  sourceFileReferenceIds: string[];
  leadSheetComplete: boolean;
  isHardGateRequirement: true;
  outputCannotAdvanceWithoutLeadSheet: true;
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

export interface BuildLeadSheetResult {
  leadSheet: SyntheticLeadSheet | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getBoundPhase38SnapshotHash(input: BuildLeadSheetInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildLeadSheetInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildLeadSheetInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildLeadSheetInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildLeadSheetInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildLeadSheetInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildLeadSheetInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildLeadSheetInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildLeadSheetInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function getLineSummary(input: BuildLeadSheetInput): SyntheticLeadSheetLineSummary {
  return (
    input.lineSummary ?? {
      lineSummaryAccounts: getInputArray(input.lineSummaryAccounts),
      lineSummaryDebits: getInputArray(input.lineSummaryDebits),
      lineSummaryCredits: getInputArray(input.lineSummaryCredits),
      lineSummaryDescriptions: getInputArray(input.lineSummaryDescriptions),
    }
  );
}

function getTotalDebits(input: BuildLeadSheetInput): number {
  return input.totalDebits ?? getLineSummary(input).lineSummaryDebits.reduce((total, debit) => total + debit, 0);
}

function getTotalCredits(input: BuildLeadSheetInput): number {
  return input.totalCredits ?? getLineSummary(input).lineSummaryCredits.reduce((total, credit) => total + credit, 0);
}

function getBalanceConfirmed(input: BuildLeadSheetInput): boolean {
  if (input.balanceConfirmed !== undefined) {
    return input.balanceConfirmed;
  }

  return getTotalDebits(input) === getTotalCredits(input);
}

function getLeadSheetComplete(input: BuildLeadSheetInput): boolean {
  if (input.leadSheetComplete !== undefined) {
    return input.leadSheetComplete;
  }

  return (
    hasValue(input.rolePreparerIdentity) &&
    hasValue(input.businessPurpose) &&
    hasValue(input.sourceTask) &&
    getLineSummary(input).lineSummaryAccounts.length > 0 &&
    getInputArray(input.backupDocumentationReferenceIds).length > 0 &&
    getBalanceConfirmed(input)
  );
}

function collectMissingRequiredIdentifiers(input: BuildLeadSheetInput): string[] {
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

function buildDerivationHash(input: BuildLeadSheetInput): string {
  return stableSnapshotHash({
    roleType: input.roleType,
    roleInstanceId: input.roleInstanceId,
    rolePreparerIdentity: input.rolePreparerIdentity ?? "",
    journalEntryCandidateReferenceId: input.journalEntryCandidateReferenceId ?? "",
    workpaperReferenceId: input.workpaperReferenceId ?? "",
    entityId: input.entityId ?? "",
    accountingPeriod: input.accountingPeriod ?? "",
    businessPurpose: input.businessPurpose ?? "",
    sourceTask: input.sourceTask ?? "",
    sourceEmailReference: input.sourceEmailReference ?? "",
    lineSummary: getLineSummary(input),
    totalDebits: getTotalDebits(input),
    totalCredits: getTotalCredits(input),
    balanceConfirmed: getBalanceConfirmed(input),
    erpDestination: input.erpDestination ?? "",
    erpStatus: input.erpStatus ?? "",
    approvalStatus: input.approvalStatus ?? "",
    reviewerFields: getInputArray(input.reviewerFields),
    backupDocumentationReferenceIds: getInputArray(input.backupDocumentationReferenceIds),
    sourceFileReferenceIds: getInputArray(input.sourceFileReferenceIds),
    leadSheetComplete: getLeadSheetComplete(input),
    isHardGateRequirement: true,
    outputCannotAdvanceWithoutLeadSheet: true,
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildLeadSheet(input: BuildLeadSheetInput): BuildLeadSheetResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      leadSheet: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const roleType = input.roleType as SyntheticRoleType;
  const roleInstanceId = input.roleInstanceId as string;
  const boundPhase38SnapshotHash = getBoundPhase38SnapshotHash(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);
  const companyId = getCompanyId(input);
  const scope = getScope(input);
  const customerIsolation = getCustomerIsolation(input);
  const firmIsolation = getFirmIsolation(input);
  const clientIsolation = getClientIsolation(input);
  const lineSummary = getLineSummary(input);
  const totalDebits = getTotalDebits(input);
  const totalCredits = getTotalCredits(input);
  const balanceConfirmed = getBalanceConfirmed(input);
  const leadSheetComplete = getLeadSheetComplete(input);
  const derivationHash = buildDerivationHash(input);
  const leadSheetKey = stableSnapshotHash({
    roleType,
    roleInstanceId,
    companyId,
    journalEntryCandidateReferenceId: input.journalEntryCandidateReferenceId ?? "",
    workpaperReferenceId: input.workpaperReferenceId ?? "",
    entityId: input.entityId ?? "",
    accountingPeriod: input.accountingPeriod ?? "",
    leadSheetComplete,
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const leadSheetId = stableSnapshotHash({
    leadSheetKey,
    artifactType: "SyntheticLeadSheet",
  });

  return {
    leadSheet: {
      leadSheetId,
      leadSheetKey,
      roleType,
      roleInstanceId,
      rolePreparerIdentity: input.rolePreparerIdentity ?? "",
      journalEntryCandidateReferenceId: input.journalEntryCandidateReferenceId ?? "",
      workpaperReferenceId: input.workpaperReferenceId ?? "",
      entityId: input.entityId ?? "",
      accountingPeriod: input.accountingPeriod ?? "",
      businessPurpose: input.businessPurpose ?? "",
      sourceTask: input.sourceTask ?? "",
      sourceEmailReference: input.sourceEmailReference ?? "",
      lineSummary,
      lineSummaryAccounts: lineSummary.lineSummaryAccounts,
      lineSummaryDebits: lineSummary.lineSummaryDebits,
      lineSummaryCredits: lineSummary.lineSummaryCredits,
      lineSummaryDescriptions: lineSummary.lineSummaryDescriptions,
      totalDebits,
      totalCredits,
      balanceConfirmed,
      erpDestination: input.erpDestination ?? "",
      erpStatus: input.erpStatus ?? "",
      approvalStatus: input.approvalStatus ?? "",
      reviewerFields: getInputArray(input.reviewerFields),
      backupDocumentationReferenceIds: getInputArray(input.backupDocumentationReferenceIds),
      sourceFileReferenceIds: getInputArray(input.sourceFileReferenceIds),
      leadSheetComplete,
      isHardGateRequirement: true,
      outputCannotAdvanceWithoutLeadSheet: true,
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
