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
import type { SyntheticSupportPackageOutputType } from "../support-package";

export type SyntheticWorkpaperPreparerSignOffType = "preparer_only";

export interface SyntheticWorkpaperTabStructure {
  tabOrder: string[];
  tabLabels: string[];
  tabReferenceIds: string[];
}

export interface SyntheticAuditWorkpaperExtension {
  auditProgramReferenceId: string;
  auditAssertionReferenceIds: string[];
  auditProcedureReferenceIds: string[];
  auditConclusionProhibited: true;
}

export interface BuildWorkpaperPackageInput {
  roleType?: SyntheticRoleType;
  roleInstanceId?: string;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  rolePreparerIdentity?: string;
  outputType?: SyntheticSupportPackageOutputType;
  leadSheetReferenceId?: string;
  supportPackageReferenceId?: string;
  journalEntryCandidateReferenceId?: string;
  tabStructure?: SyntheticWorkpaperTabStructure;
  tab1LeadSheetReference?: string;
  tab2BackupCalculationsReference?: string;
  additionalTabReferences?: string[];
  reviewSummaryReference?: string;
  auditWorkpaperExtension?: SyntheticAuditWorkpaperExtension[];
  testingSheetReferences?: string[];
  sampleSupportReferences?: string[];
  evidenceTieOutReferences?: string[];
  exceptionMemoReferences?: string[];
  reviewerNoteReferences?: string[];
  preparerSignOffReference?: string;
  preparerSignOffType?: SyntheticWorkpaperPreparerSignOffType;
  workpaperPackageComplete?: boolean;
  leadSheetPresent?: boolean;
  supportPackagePresent?: boolean;
  driveOutputReady?: boolean;
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

export interface SyntheticWorkpaperPackage {
  workpaperPackageId: string;
  workpaperPackageKey: string;
  roleType: SyntheticRoleType;
  roleInstanceId: string;
  rolePreparerIdentity: string;
  outputType: SyntheticSupportPackageOutputType;
  leadSheetReferenceId: string;
  supportPackageReferenceId: string;
  journalEntryCandidateReferenceId: string;
  tabStructure: SyntheticWorkpaperTabStructure;
  tab1LeadSheetReference: string;
  tab2BackupCalculationsReference: string;
  additionalTabReferences: string[];
  reviewSummaryReference: string;
  auditWorkpaperExtension: SyntheticAuditWorkpaperExtension[];
  testingSheetReferences: string[];
  sampleSupportReferences: string[];
  evidenceTieOutReferences: string[];
  exceptionMemoReferences: string[];
  reviewerNoteReferences: string[];
  preparerSignOffReference: string;
  preparerSignOffType: SyntheticWorkpaperPreparerSignOffType;
  reviewerSignOffProhibited: true;
  approverSignOffProhibited: true;
  auditOpinionProhibited: true;
  workpaperPackageComplete: boolean;
  leadSheetPresent: boolean;
  supportPackagePresent: boolean;
  isHardGateRequirement: true;
  outputCannotAdvanceWithoutCompletePackage: true;
  driveOutputReady: boolean;
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

export interface BuildWorkpaperPackageResult {
  workpaperPackage: SyntheticWorkpaperPackage | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getBoundPhase38SnapshotHash(input: BuildWorkpaperPackageInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildWorkpaperPackageInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildWorkpaperPackageInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildWorkpaperPackageInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildWorkpaperPackageInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildWorkpaperPackageInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildWorkpaperPackageInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildWorkpaperPackageInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildWorkpaperPackageInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function getLeadSheetPresent(input: BuildWorkpaperPackageInput): boolean {
  return input.leadSheetPresent ?? hasValue(input.leadSheetReferenceId);
}

function getSupportPackagePresent(input: BuildWorkpaperPackageInput): boolean {
  return input.supportPackagePresent ?? hasValue(input.supportPackageReferenceId);
}

function getTabStructure(input: BuildWorkpaperPackageInput): SyntheticWorkpaperTabStructure {
  return (
    input.tabStructure ?? {
      tabOrder: ["tab_1_lead_sheet", "tab_2_backup_calculations", ...getInputArray(input.additionalTabReferences)],
      tabLabels: ["Lead Sheet", "Backup and Calculations"],
      tabReferenceIds: [
        input.tab1LeadSheetReference ?? input.leadSheetReferenceId ?? "",
        input.tab2BackupCalculationsReference ?? input.supportPackageReferenceId ?? "",
        ...getInputArray(input.additionalTabReferences),
      ],
    }
  );
}

function getWorkpaperPackageComplete(input: BuildWorkpaperPackageInput): boolean {
  if (input.workpaperPackageComplete !== undefined) {
    return input.workpaperPackageComplete;
  }

  return getLeadSheetPresent(input) && getSupportPackagePresent(input);
}

function getDriveOutputReady(input: BuildWorkpaperPackageInput): boolean {
  return input.driveOutputReady ?? getWorkpaperPackageComplete(input);
}

function collectMissingRequiredIdentifiers(input: BuildWorkpaperPackageInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.roleType)) {
    missing.push("roleType");
  }

  if (!hasValue(input.roleInstanceId)) {
    missing.push("roleInstanceId");
  }

  if (!hasValue(input.outputType)) {
    missing.push("outputType");
  }

  if (!hasValue(input.leadSheetReferenceId)) {
    missing.push("leadSheetReferenceId");
  }

  if (!hasValue(input.supportPackageReferenceId)) {
    missing.push("supportPackageReferenceId");
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

function buildDerivationHash(input: BuildWorkpaperPackageInput): string {
  return stableSnapshotHash({
    roleType: input.roleType,
    roleInstanceId: input.roleInstanceId,
    rolePreparerIdentity: input.rolePreparerIdentity ?? "",
    outputType: input.outputType,
    leadSheetReferenceId: input.leadSheetReferenceId ?? "",
    supportPackageReferenceId: input.supportPackageReferenceId ?? "",
    journalEntryCandidateReferenceId: input.journalEntryCandidateReferenceId ?? "",
    tabStructure: getTabStructure(input),
    tab1LeadSheetReference: input.tab1LeadSheetReference ?? input.leadSheetReferenceId ?? "",
    tab2BackupCalculationsReference: input.tab2BackupCalculationsReference ?? input.supportPackageReferenceId ?? "",
    additionalTabReferences: getInputArray(input.additionalTabReferences),
    reviewSummaryReference: input.reviewSummaryReference ?? "",
    auditWorkpaperExtension: getInputArray(input.auditWorkpaperExtension),
    testingSheetReferences: getInputArray(input.testingSheetReferences),
    sampleSupportReferences: getInputArray(input.sampleSupportReferences),
    evidenceTieOutReferences: getInputArray(input.evidenceTieOutReferences),
    exceptionMemoReferences: getInputArray(input.exceptionMemoReferences),
    reviewerNoteReferences: getInputArray(input.reviewerNoteReferences),
    preparerSignOffReference: input.preparerSignOffReference ?? "",
    preparerSignOffType: "preparer_only",
    reviewerSignOffProhibited: true,
    approverSignOffProhibited: true,
    auditOpinionProhibited: true,
    workpaperPackageComplete: getWorkpaperPackageComplete(input),
    leadSheetPresent: getLeadSheetPresent(input),
    supportPackagePresent: getSupportPackagePresent(input),
    isHardGateRequirement: true,
    outputCannotAdvanceWithoutCompletePackage: true,
    driveOutputReady: getDriveOutputReady(input),
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildWorkpaperPackage(input: BuildWorkpaperPackageInput): BuildWorkpaperPackageResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      workpaperPackage: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const roleType = input.roleType as SyntheticRoleType;
  const roleInstanceId = input.roleInstanceId as string;
  const outputType = input.outputType as SyntheticSupportPackageOutputType;
  const leadSheetReferenceId = input.leadSheetReferenceId as string;
  const supportPackageReferenceId = input.supportPackageReferenceId as string;
  const boundPhase38SnapshotHash = getBoundPhase38SnapshotHash(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);
  const companyId = getCompanyId(input);
  const scope = getScope(input);
  const customerIsolation = getCustomerIsolation(input);
  const firmIsolation = getFirmIsolation(input);
  const clientIsolation = getClientIsolation(input);
  const workpaperPackageComplete = getWorkpaperPackageComplete(input);
  const driveOutputReady = getDriveOutputReady(input);
  const derivationHash = buildDerivationHash(input);
  const workpaperPackageKey = stableSnapshotHash({
    roleType,
    roleInstanceId,
    companyId,
    outputType,
    leadSheetReferenceId,
    supportPackageReferenceId,
    journalEntryCandidateReferenceId: input.journalEntryCandidateReferenceId ?? "",
    workpaperPackageComplete,
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const workpaperPackageId = stableSnapshotHash({
    workpaperPackageKey,
    artifactType: "SyntheticWorkpaperPackage",
  });

  return {
    workpaperPackage: {
      workpaperPackageId,
      workpaperPackageKey,
      roleType,
      roleInstanceId,
      rolePreparerIdentity: input.rolePreparerIdentity ?? "",
      outputType,
      leadSheetReferenceId,
      supportPackageReferenceId,
      journalEntryCandidateReferenceId: input.journalEntryCandidateReferenceId ?? "",
      tabStructure: getTabStructure(input),
      tab1LeadSheetReference: input.tab1LeadSheetReference ?? leadSheetReferenceId,
      tab2BackupCalculationsReference: input.tab2BackupCalculationsReference ?? supportPackageReferenceId,
      additionalTabReferences: getInputArray(input.additionalTabReferences),
      reviewSummaryReference: input.reviewSummaryReference ?? "",
      auditWorkpaperExtension: getInputArray(input.auditWorkpaperExtension),
      testingSheetReferences: getInputArray(input.testingSheetReferences),
      sampleSupportReferences: getInputArray(input.sampleSupportReferences),
      evidenceTieOutReferences: getInputArray(input.evidenceTieOutReferences),
      exceptionMemoReferences: getInputArray(input.exceptionMemoReferences),
      reviewerNoteReferences: getInputArray(input.reviewerNoteReferences),
      preparerSignOffReference: input.preparerSignOffReference ?? "",
      preparerSignOffType: "preparer_only",
      reviewerSignOffProhibited: true,
      approverSignOffProhibited: true,
      auditOpinionProhibited: true,
      workpaperPackageComplete,
      leadSheetPresent: getLeadSheetPresent(input),
      supportPackagePresent: getSupportPackagePresent(input),
      isHardGateRequirement: true,
      outputCannotAdvanceWithoutCompletePackage: true,
      driveOutputReady,
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
