import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticActionConfidenceFloorMetadata,
  SyntheticActionDerivationMethod,
  SyntheticActionReversibilityClass,
  SyntheticPhase38StaleMarker,
} from "../contracts";
import type { SyntheticActionCandidate, SyntheticPhase37ActionHandoffArtifact } from "../action-candidate";
import type { SyntheticApprovalGovernance } from "../approval-package";
import type { SyntheticErpActionCandidatePackage } from "../erp-action-candidate";
import type { SyntheticAccountingActionCandidatePackage } from "../accounting-action-candidate";
import type {
  SyntheticAuditConfidenceMetadata,
  SyntheticAuditGovernanceMetadata,
  SyntheticAuditMaterialityCompatibility,
  SyntheticAuditScope,
  SyntheticAuditTrustMetadata,
} from "../../audit/types";
import type { SyntheticMemoryObjectIsolationDimension } from "../../organizational-memory/memory-object";
import type { SyntheticKnowledgeConfidenceFloorMetadata } from "../../knowledge/contracts";

export type SyntheticJournalEntryType =
  | "recurring"
  | "accrual"
  | "prepaid"
  | "fixed_asset"
  | "depreciation"
  | "allocation"
  | "reclass"
  | "revenue"
  | "intercompany"
  | "manual"
  | "correcting"
  | "closing";

export type SyntheticJournalEntryStatus = "draft" | "review_ready" | "import_ready" | "submitted" | "posted" | "rejected";

export const SYNTHETIC_JOURNAL_ENTRY_TYPES: SyntheticJournalEntryType[] = [
  "recurring",
  "accrual",
  "prepaid",
  "fixed_asset",
  "depreciation",
  "allocation",
  "reclass",
  "revenue",
  "intercompany",
  "manual",
  "correcting",
  "closing",
];

export const SYNTHETIC_JOURNAL_ENTRY_STATUSES: SyntheticJournalEntryStatus[] = [
  "draft",
  "review_ready",
  "import_ready",
  "submitted",
  "posted",
  "rejected",
];

export const SYNTHETIC_JOURNAL_ENTRY_REVERSIBILITY_CLASSES: SyntheticActionReversibilityClass[] = [
  "reversible",
  "compensatable",
  "irreversible",
];

export interface BuildJournalEntryCandidatePackageInput {
  phase37Handoff: SyntheticPhase37ActionHandoffArtifact | null;
  actionCandidates?: SyntheticActionCandidate[];
  approvalGovernancePackages?: SyntheticApprovalGovernance[];
  erpActionCandidatePackages?: SyntheticErpActionCandidatePackage[];
  accountingActionCandidatePackages?: SyntheticAccountingActionCandidatePackage[];
  journalEntryType: SyntheticJournalEntryType;
  journalEntryStatus?: SyntheticJournalEntryStatus;
  entityReferenceId: string;
  periodReferenceId: string;
  currencyReferenceId?: string;
  preparerRoleReferenceId?: string;
  sourceTaskReferenceId?: string;
  sourceEmailReferenceId?: string;
  journalEntryLineReferenceIds?: string[];
  accountReferenceIds?: string[];
  dimensionReferenceIds?: string[];
  departmentReferenceIds?: string[];
  classReferenceIds?: string[];
  locationReferenceIds?: string[];
  projectReferenceIds?: string[];
  customerReferenceIds?: string[];
  vendorReferenceIds?: string[];
  subsidiaryReferenceIds?: string[];
  intercompanyReferenceIds?: string[];
  debitTotal?: number | string;
  creditTotal?: number | string;
  balanced?: boolean;
  openPeriodValidated?: boolean;
  accountMappingValidated?: boolean;
  dimensionMappingValidated?: boolean;
  approvalValidated?: boolean;
  supportPackageValidated?: boolean;
  leadSheetReferenceId?: string;
  backupSheetReferenceId?: string;
  sourceDocumentReferenceIds?: string[];
  approvalGovernanceIds?: string[];
  erpActionCandidatePackageIds?: string[];
  accountingActionCandidatePackageIds?: string[];
  actionCandidateIds?: string[];
  approvalAuthorityReferenceIds?: string[];
  reversibilityClass: SyntheticActionReversibilityClass;
  reversalJournalEntryCandidateIds?: string[];
  compensationJournalEntryCandidateIds?: string[];
  rejectionReasonReferenceIds?: string[];
  withdrawalReasonReferenceIds?: string[];
  rejectionAuthorityReferenceIds?: string[];
  withdrawalAuthorityReferenceIds?: string[];
  riskReferenceIds?: string[];
  riskMetadataReferenceIds?: string[];
  actionConfidenceFloorMetadata?: SyntheticActionConfidenceFloorMetadata[];
  sourceKnowledgeConfidenceReferenceIds?: string[];
  sourceMethodologyConfidenceReferenceIds?: string[];
  boundPhase37SnapshotHash?: string;
  phase37SupersessionReferenceIds?: string[];
  phase37StalenessReasonReferenceIds?: string[];
  phase38StaleMarker?: SyntheticPhase38StaleMarker;
  executionReady?: boolean;
  derivationLineageIds?: string[];
  derivationMethod?: SyntheticActionDerivationMethod;
  confidenceFloorMetadata?: SyntheticKnowledgeConfidenceFloorMetadata[];
  sourceConfidenceReferenceIds?: string[];
  evidenceReferenceIds?: string[];
  lineageReferenceIds?: string[];
  skippedIndexes?: number[];
}

export interface SyntheticJournalEntryCandidatePackage {
  journalEntryCandidatePackageId: string;
  journalEntryCandidatePackageKey: string;
  journalEntryType: SyntheticJournalEntryType;
  journalEntryStatus: SyntheticJournalEntryStatus;
  entityReferenceId: string;
  periodReferenceId: string;
  currencyReferenceId: string;
  preparerRoleReferenceId: string;
  sourceTaskReferenceId: string;
  sourceEmailReferenceId: string;
  journalEntryLineReferenceIds: string[];
  accountReferenceIds: string[];
  dimensionReferenceIds: string[];
  departmentReferenceIds: string[];
  classReferenceIds: string[];
  locationReferenceIds: string[];
  projectReferenceIds: string[];
  customerReferenceIds: string[];
  vendorReferenceIds: string[];
  subsidiaryReferenceIds: string[];
  intercompanyReferenceIds: string[];
  debitTotal: number | string | null;
  creditTotal: number | string | null;
  balanced: boolean;
  openPeriodValidated: boolean;
  accountMappingValidated: boolean;
  dimensionMappingValidated: boolean;
  approvalValidated: boolean;
  supportPackageValidated: boolean;
  leadSheetReferenceId: string;
  backupSheetReferenceId: string;
  sourceDocumentReferenceIds: string[];
  approvalGovernanceIds: string[];
  erpActionCandidatePackageIds: string[];
  accountingActionCandidatePackageIds: string[];
  actionCandidateIds: string[];
  reversibilityClass: SyntheticActionReversibilityClass;
  reversalJournalEntryCandidateIds: string[];
  compensationJournalEntryCandidateIds: string[];
  rejectionReasonReferenceIds: string[];
  withdrawalReasonReferenceIds: string[];
  rejectionAuthorityReferenceIds: string[];
  withdrawalAuthorityReferenceIds: string[];
  riskReferenceIds: string[];
  riskMetadataReferenceIds: string[];
  actionConfidenceFloorMetadata: SyntheticActionConfidenceFloorMetadata[];
  sourceKnowledgeConfidenceReferenceIds: string[];
  sourceMethodologyConfidenceReferenceIds: string[];
  boundPhase37SnapshotHash: string;
  boundPhase37KnowledgeGraphSnapshotHash: string;
  boundPhase37MethodologySnapshotHash: string;
  phase37SupersessionReferenceIds: string[];
  phase37StalenessReasonReferenceIds: string[];
  phase38StaleMarker: SyntheticPhase38StaleMarker;
  executable: false;
  executionReady: boolean;
  executionReadyIsExecutionAuthority: false;
  phase38Executes: false;
  phase39RequiredForExecution: true;
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

export interface BuildJournalEntryCandidatePackageResult {
  journalEntryCandidatePackage: SyntheticJournalEntryCandidatePackage | null;
  skipped: boolean;
  warnings: string[];
}

type ReferenceRecord = Record<string, unknown>;

interface ResolvedJournalEntryStatus {
  journalEntryStatus: SyntheticJournalEntryStatus;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getOptionalString(value: string | undefined): string {
  return value ?? "";
}

function getStringArrayProperty(value: object, propertyName: string): string[] {
  const property = (value as ReferenceRecord)[propertyName];
  return Array.isArray(property) ? property.filter((item): item is string => typeof item === "string") : [];
}

function isSupportedJournalEntryType(journalEntryType: SyntheticJournalEntryType): boolean {
  return SYNTHETIC_JOURNAL_ENTRY_TYPES.includes(journalEntryType);
}

function isSupportedJournalEntryStatus(journalEntryStatus: SyntheticJournalEntryStatus): boolean {
  return SYNTHETIC_JOURNAL_ENTRY_STATUSES.includes(journalEntryStatus);
}

function isSupportedReversibilityClass(reversibilityClass: SyntheticActionReversibilityClass): boolean {
  return SYNTHETIC_JOURNAL_ENTRY_REVERSIBILITY_CLASSES.includes(reversibilityClass);
}

function getPhase37Handoff(input: BuildJournalEntryCandidatePackageInput): SyntheticPhase37ActionHandoffArtifact | null {
  return input.phase37Handoff;
}

function getActionCandidates(input: BuildJournalEntryCandidatePackageInput): SyntheticActionCandidate[] {
  return getInputArray(input.actionCandidates);
}

function getApprovalGovernancePackages(input: BuildJournalEntryCandidatePackageInput): SyntheticApprovalGovernance[] {
  return getInputArray(input.approvalGovernancePackages);
}

function getErpActionCandidatePackages(input: BuildJournalEntryCandidatePackageInput): SyntheticErpActionCandidatePackage[] {
  return getInputArray(input.erpActionCandidatePackages);
}

function getAccountingActionCandidatePackages(
  input: BuildJournalEntryCandidatePackageInput,
): SyntheticAccountingActionCandidatePackage[] {
  return getInputArray(input.accountingActionCandidatePackages);
}

function getActionCandidateIds(input: BuildJournalEntryCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.actionCandidateIds),
    ...getActionCandidates(input).map((actionCandidate) => actionCandidate.actionCandidateId),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.actionCandidateIds),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.actionCandidateIds,
    ),
  ];
}

function getApprovalGovernanceIds(input: BuildJournalEntryCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.approvalGovernanceIds),
    ...getApprovalGovernancePackages(input).map((approvalGovernance) => approvalGovernance.approvalGovernanceId),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.approvalGovernanceIds),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.approvalGovernanceIds,
    ),
  ];
}

function getErpActionCandidatePackageIds(input: BuildJournalEntryCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.erpActionCandidatePackageIds),
    ...getErpActionCandidatePackages(input).map((erpActionCandidatePackage) => erpActionCandidatePackage.erpActionCandidatePackageId),
  ];
}

function getAccountingActionCandidatePackageIds(input: BuildJournalEntryCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.accountingActionCandidatePackageIds),
    ...getAccountingActionCandidatePackages(input).map(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.accountingActionCandidatePackageId,
    ),
  ];
}

function getApprovalAuthorityReferenceIds(input: BuildJournalEntryCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.approvalAuthorityReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.approvalAuthorityReferenceIds),
  ];
}

function getBoundPhase37SnapshotHash(input: BuildJournalEntryCandidatePackageInput): string {
  return input.boundPhase37SnapshotHash ?? getPhase37Handoff(input)?.boundPhase37SnapshotHash ?? "";
}

function getPhase38StaleMarker(input: BuildJournalEntryCandidatePackageInput): SyntheticPhase38StaleMarker {
  return input.phase38StaleMarker ?? getPhase37Handoff(input)?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildJournalEntryCandidatePackageInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? "methodology_derived";
}

function getExecutionReady(input: BuildJournalEntryCandidatePackageInput): boolean {
  return input.executionReady === true && getApprovalGovernanceIds(input).length > 0;
}

function getReviewReadyConditions(input: BuildJournalEntryCandidatePackageInput): boolean {
  return (
    input.supportPackageValidated === true &&
    input.approvalValidated === true &&
    input.balanced === true &&
    hasValue(input.leadSheetReferenceId) &&
    hasValue(input.backupSheetReferenceId)
  );
}

function resolveJournalEntryStatus(input: BuildJournalEntryCandidatePackageInput): ResolvedJournalEntryStatus {
  const requestedStatus = input.journalEntryStatus ?? "draft";
  const warnings: string[] = [];

  if (!isSupportedJournalEntryStatus(requestedStatus)) {
    return {
      journalEntryStatus: "draft",
      warnings: ["journalEntryStatus must be supported; defaulted to draft."],
    };
  }

  if (requestedStatus === "draft") {
    return { journalEntryStatus: "draft", warnings };
  }

  if (requestedStatus === "review_ready") {
    if (getReviewReadyConditions(input)) return { journalEntryStatus: "review_ready", warnings };
    warnings.push("journalEntryStatus defaulted to draft because review_ready conditions were not met.");
    return { journalEntryStatus: "draft", warnings };
  }

  if (requestedStatus === "import_ready") {
    if (getReviewReadyConditions(input) && getExecutionReady(input)) return { journalEntryStatus: "import_ready", warnings };
    warnings.push("journalEntryStatus defaulted to draft because import_ready conditions were not met.");
    return { journalEntryStatus: "draft", warnings };
  }

  if (requestedStatus === "rejected") {
    return { journalEntryStatus: "rejected", warnings };
  }

  warnings.push("journalEntryStatus defaulted to draft because Phase 38 cannot submit or post journal entries.");
  return { journalEntryStatus: "draft", warnings };
}

function getActionConfidenceFloorMetadata(input: BuildJournalEntryCandidatePackageInput): SyntheticActionConfidenceFloorMetadata[] {
  return [
    ...getInputArray(input.actionConfidenceFloorMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.actionConfidenceFloorMetadata),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.actionConfidenceFloorMetadata,
    ),
  ];
}

function getSourceKnowledgeConfidenceReferenceIds(input: BuildJournalEntryCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.sourceKnowledgeConfidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.sourceKnowledgeConfidenceReferenceIds),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.sourceKnowledgeConfidenceReferenceIds,
    ),
    ...getActionConfidenceFloorMetadata(input).flatMap((metadata) => metadata.sourceKnowledgeConfidenceReferenceIds),
  ];
}

function getSourceMethodologyConfidenceReferenceIds(input: BuildJournalEntryCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.sourceMethodologyConfidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.sourceMethodologyConfidenceReferenceIds),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.sourceMethodologyConfidenceReferenceIds,
    ),
    ...getActionConfidenceFloorMetadata(input).flatMap((metadata) => metadata.sourceMethodologyConfidenceReferenceIds),
  ];
}

function getPhase37SupersessionReferenceIds(input: BuildJournalEntryCandidatePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(handoff?.phase37SupersessionReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.phase37SupersessionReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.phase37SupersessionReferenceIds),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.phase37SupersessionReferenceIds),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.phase37SupersessionReferenceIds,
    ),
    ...getInputArray(input.phase37SupersessionReferenceIds),
  ];
}

function getPhase37StalenessReasonReferenceIds(input: BuildJournalEntryCandidatePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(handoff?.phase37StalenessReasonReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.phase37StalenessReasonReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.phase37StalenessReasonReferenceIds),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.phase37StalenessReasonReferenceIds),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.phase37StalenessReasonReferenceIds,
    ),
    ...getInputArray(input.phase37StalenessReasonReferenceIds),
  ];
}

function getEvidenceReferenceIds(input: BuildJournalEntryCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.evidenceReferenceIds),
    ...getInputArray(input.sourceDocumentReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.evidenceReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.evidenceReferenceIds),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.evidenceReferenceIds),
    ...getInputArray(getPhase37Handoff(input)?.sourceEvidenceLineageGraphIds),
  ];
}

function getLineageReferenceIds(input: BuildJournalEntryCandidatePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.lineageReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.lineageReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.lineageReferenceIds),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.lineageReferenceIds),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.lineageReferenceIds,
    ),
    ...getInputArray(handoff?.sourceKnowledgeObjectIds),
    ...getInputArray(handoff?.sourceMethodologyObjectIds),
    ...getInputArray(handoff?.sourceMemoryObjectIds),
  ];
}

function getConfidenceFloorMetadata(input: BuildJournalEntryCandidatePackageInput): SyntheticKnowledgeConfidenceFloorMetadata[] {
  return [
    ...getInputArray(input.confidenceFloorMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.confidenceFloorMetadata),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.confidenceFloorMetadata),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.confidenceFloorMetadata),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.confidenceFloorMetadata,
    ),
    ...getInputArray(getPhase37Handoff(input)?.confidenceFloorMetadata),
  ];
}

function getSourceConfidenceReferenceIds(input: BuildJournalEntryCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.sourceConfidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.sourceConfidenceReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.sourceConfidenceReferenceIds),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.sourceConfidenceReferenceIds),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.sourceConfidenceReferenceIds,
    ),
  ];
}

function getDerivationLineageIds(input: BuildJournalEntryCandidatePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.derivationLineageIds),
    input.entityReferenceId,
    input.periodReferenceId,
    getOptionalString(input.currencyReferenceId),
    getOptionalString(input.preparerRoleReferenceId),
    getOptionalString(input.sourceTaskReferenceId),
    getOptionalString(input.sourceEmailReferenceId),
    ...getInputArray(input.journalEntryLineReferenceIds),
    ...getInputArray(input.accountReferenceIds),
    ...getInputArray(input.dimensionReferenceIds),
    ...getInputArray(input.departmentReferenceIds),
    ...getInputArray(input.classReferenceIds),
    ...getInputArray(input.locationReferenceIds),
    ...getInputArray(input.projectReferenceIds),
    ...getInputArray(input.customerReferenceIds),
    ...getInputArray(input.vendorReferenceIds),
    ...getInputArray(input.subsidiaryReferenceIds),
    ...getInputArray(input.intercompanyReferenceIds),
    getOptionalString(input.leadSheetReferenceId),
    getOptionalString(input.backupSheetReferenceId),
    ...getInputArray(input.sourceDocumentReferenceIds),
    ...getApprovalGovernanceIds(input),
    ...getErpActionCandidatePackageIds(input),
    ...getAccountingActionCandidatePackageIds(input),
    ...getActionCandidateIds(input),
    ...getInputArray(handoff?.sourceKnowledgeObjectIds),
    ...getInputArray(handoff?.sourceMethodologyObjectIds),
    ...getInputArray(handoff?.sourceMemoryObjectIds),
    ...getInputArray(handoff?.sourceEvidenceLineageGraphIds),
  ].filter((referenceId) => referenceId !== "");
}

function buildJournalEntryCandidatePackageKey(input: BuildJournalEntryCandidatePackageInput): string {
  const handoff = getPhase37Handoff(input);
  const statusResolution = resolveJournalEntryStatus(input);

  return stableSnapshotHash({
    journalEntryType: input.journalEntryType,
    journalEntryStatus: statusResolution.journalEntryStatus,
    entityReferenceId: input.entityReferenceId,
    periodReferenceId: input.periodReferenceId,
    currencyReferenceId: input.currencyReferenceId ?? null,
    preparerRoleReferenceId: input.preparerRoleReferenceId ?? null,
    sourceTaskReferenceId: input.sourceTaskReferenceId ?? null,
    sourceEmailReferenceId: input.sourceEmailReferenceId ?? null,
    journalEntryLineReferenceIds: getInputArray(input.journalEntryLineReferenceIds),
    accountReferenceIds: getInputArray(input.accountReferenceIds),
    dimensionReferenceIds: getInputArray(input.dimensionReferenceIds),
    departmentReferenceIds: getInputArray(input.departmentReferenceIds),
    classReferenceIds: getInputArray(input.classReferenceIds),
    locationReferenceIds: getInputArray(input.locationReferenceIds),
    projectReferenceIds: getInputArray(input.projectReferenceIds),
    customerReferenceIds: getInputArray(input.customerReferenceIds),
    vendorReferenceIds: getInputArray(input.vendorReferenceIds),
    subsidiaryReferenceIds: getInputArray(input.subsidiaryReferenceIds),
    intercompanyReferenceIds: getInputArray(input.intercompanyReferenceIds),
    debitTotal: input.debitTotal ?? null,
    creditTotal: input.creditTotal ?? null,
    balanced: input.balanced === true,
    openPeriodValidated: input.openPeriodValidated === true,
    accountMappingValidated: input.accountMappingValidated === true,
    dimensionMappingValidated: input.dimensionMappingValidated === true,
    approvalValidated: input.approvalValidated === true,
    supportPackageValidated: input.supportPackageValidated === true,
    leadSheetReferenceId: input.leadSheetReferenceId ?? null,
    backupSheetReferenceId: input.backupSheetReferenceId ?? null,
    sourceDocumentReferenceIds: getInputArray(input.sourceDocumentReferenceIds),
    approvalGovernanceIds: getApprovalGovernanceIds(input),
    erpActionCandidatePackageIds: getErpActionCandidatePackageIds(input),
    accountingActionCandidatePackageIds: getAccountingActionCandidatePackageIds(input),
    actionCandidateIds: getActionCandidateIds(input),
    reversibilityClass: input.reversibilityClass,
    riskReferenceIds: getInputArray(input.riskReferenceIds),
    riskMetadataReferenceIds: getInputArray(input.riskMetadataReferenceIds),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    boundPhase37KnowledgeGraphSnapshotHash: handoff?.knowledgeGraphSnapshotHash ?? null,
    boundPhase37MethodologySnapshotHash: handoff?.methodologySnapshotHash ?? null,
    companyId: handoff?.companyId ?? null,
    scope: handoff?.scope ?? null,
    customerIsolation: handoff?.customerIsolation ?? null,
    firmIsolation: handoff?.firmIsolation ?? null,
    clientIsolation: handoff?.clientIsolation ?? null,
  });
}

function buildJournalEntryCandidatePackageId(input: BuildJournalEntryCandidatePackageInput): string {
  return `synthetic-journal-entry-candidate-package:${stableSnapshotHash({
    journalEntryCandidatePackageKey: buildJournalEntryCandidatePackageKey(input),
    journalEntryType: input.journalEntryType,
    entityReferenceId: input.entityReferenceId,
    periodReferenceId: input.periodReferenceId,
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
  })}`;
}

function buildDerivationHash(input: BuildJournalEntryCandidatePackageInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    derivationMethod: getDerivationMethod(input),
    journalEntryType: input.journalEntryType,
    journalEntryStatus: resolveJournalEntryStatus(input).journalEntryStatus,
    approvalGovernanceIds: getApprovalGovernanceIds(input),
    erpActionCandidatePackageIds: getErpActionCandidatePackageIds(input),
    accountingActionCandidatePackageIds: getAccountingActionCandidatePackageIds(input),
    actionCandidateIds: getActionCandidateIds(input),
    knowledgePackageHandle: handoff?.knowledgePackageHandle ?? null,
    methodologyPackageHandle: handoff?.methodologyPackageHandle ?? null,
    derivationLineageIds: getDerivationLineageIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
  });
}

function validateJournalEntryCandidatePackageInput(input: BuildJournalEntryCandidatePackageInput): string[] {
  const warnings: string[] = [];
  const handoff = getPhase37Handoff(input);

  if (!handoff) warnings.push("phase37Handoff is required.");
  if (!hasValue(getBoundPhase37SnapshotHash(input))) warnings.push("boundPhase37SnapshotHash is required.");
  if (!hasValue(input.journalEntryType)) warnings.push("journalEntryType is required.");
  if (!isSupportedJournalEntryType(input.journalEntryType)) warnings.push("journalEntryType must be supported.");
  if (!hasValue(input.entityReferenceId)) warnings.push("entityReferenceId is required.");
  if (!hasValue(input.periodReferenceId)) warnings.push("periodReferenceId is required.");
  if (!hasValue(input.reversibilityClass)) warnings.push("reversibilityClass is required.");
  if (!isSupportedReversibilityClass(input.reversibilityClass)) warnings.push("reversibilityClass must be supported.");
  if (hasValue(input.preparerRoleReferenceId) && getApprovalAuthorityReferenceIds(input).includes(input.preparerRoleReferenceId ?? "")) {
    warnings.push("journal entry candidate cannot self-approve.");
  }
  if (!handoff) return warnings;

  if (!hasValue(handoff.companyId)) warnings.push("phase37Handoff.companyId is required.");
  if (!handoff.scope) warnings.push("phase37Handoff.scope is required.");
  if (!hasValue(handoff.knowledgeGraphSnapshotHash)) warnings.push("phase37Handoff.knowledgeGraphSnapshotHash is required.");
  if (!hasValue(handoff.methodologySnapshotHash)) warnings.push("phase37Handoff.methodologySnapshotHash is required.");
  if (handoff.phase38MayConsume !== true) warnings.push("phase37Handoff.phase38MayConsume must be true.");
  if (handoff.phase38MayMutate !== false) warnings.push("phase37Handoff.phase38MayMutate must be false.");
  if (handoff.phase38MayWriteBack !== false) warnings.push("phase37Handoff.phase38MayWriteBack must be false.");

  getActionCandidates(input).forEach((actionCandidate, index) => {
    if (!hasValue(actionCandidate.actionCandidateId)) warnings.push(`actionCandidates[${index}].actionCandidateId is required.`);
    if (actionCandidate.executable !== false) warnings.push(`actionCandidates[${index}].executable must be false.`);
    if (actionCandidate.companyId !== handoff.companyId) warnings.push(`actionCandidates[${index}].companyId must equal phase37Handoff.companyId.`);
  });

  return warnings;
}

export function buildJournalEntryCandidatePackage(
  input: BuildJournalEntryCandidatePackageInput,
): BuildJournalEntryCandidatePackageResult {
  const fatalWarnings = validateJournalEntryCandidatePackageInput(input);
  const handoff = getPhase37Handoff(input);

  if (fatalWarnings.length > 0 || !handoff) {
    return {
      journalEntryCandidatePackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const statusResolution = resolveJournalEntryStatus(input);
  const warnings = [
    ...statusResolution.warnings,
    ...getStringArrayProperty(handoff, "warnings").map((warning) => `phase37Handoff: ${warning}`),
    ...getActionCandidates(input).flatMap((actionCandidate, index) =>
      actionCandidate.warnings.map((warning) => `actionCandidates[${index}]: ${warning}`),
    ),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance, index) =>
      approvalGovernance.warnings.map((warning) => `approvalGovernancePackages[${index}]: ${warning}`),
    ),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage, index) =>
      erpActionCandidatePackage.warnings.map((warning) => `erpActionCandidatePackages[${index}]: ${warning}`),
    ),
    ...getAccountingActionCandidatePackages(input).flatMap((accountingActionCandidatePackage, index) =>
      accountingActionCandidatePackage.warnings.map((warning) => `accountingActionCandidatePackages[${index}]: ${warning}`),
    ),
  ];

  return {
    journalEntryCandidatePackage: {
      journalEntryCandidatePackageId: buildJournalEntryCandidatePackageId(input),
      journalEntryCandidatePackageKey: buildJournalEntryCandidatePackageKey(input),
      journalEntryType: input.journalEntryType,
      journalEntryStatus: statusResolution.journalEntryStatus,
      entityReferenceId: input.entityReferenceId,
      periodReferenceId: input.periodReferenceId,
      currencyReferenceId: getOptionalString(input.currencyReferenceId),
      preparerRoleReferenceId: getOptionalString(input.preparerRoleReferenceId),
      sourceTaskReferenceId: getOptionalString(input.sourceTaskReferenceId),
      sourceEmailReferenceId: getOptionalString(input.sourceEmailReferenceId),
      journalEntryLineReferenceIds: getInputArray(input.journalEntryLineReferenceIds),
      accountReferenceIds: getInputArray(input.accountReferenceIds),
      dimensionReferenceIds: getInputArray(input.dimensionReferenceIds),
      departmentReferenceIds: getInputArray(input.departmentReferenceIds),
      classReferenceIds: getInputArray(input.classReferenceIds),
      locationReferenceIds: getInputArray(input.locationReferenceIds),
      projectReferenceIds: getInputArray(input.projectReferenceIds),
      customerReferenceIds: getInputArray(input.customerReferenceIds),
      vendorReferenceIds: getInputArray(input.vendorReferenceIds),
      subsidiaryReferenceIds: getInputArray(input.subsidiaryReferenceIds),
      intercompanyReferenceIds: getInputArray(input.intercompanyReferenceIds),
      debitTotal: input.debitTotal ?? null,
      creditTotal: input.creditTotal ?? null,
      balanced: input.balanced === true,
      openPeriodValidated: input.openPeriodValidated === true,
      accountMappingValidated: input.accountMappingValidated === true,
      dimensionMappingValidated: input.dimensionMappingValidated === true,
      approvalValidated: input.approvalValidated === true,
      supportPackageValidated: input.supportPackageValidated === true,
      leadSheetReferenceId: getOptionalString(input.leadSheetReferenceId),
      backupSheetReferenceId: getOptionalString(input.backupSheetReferenceId),
      sourceDocumentReferenceIds: getInputArray(input.sourceDocumentReferenceIds),
      approvalGovernanceIds: getApprovalGovernanceIds(input),
      erpActionCandidatePackageIds: getErpActionCandidatePackageIds(input),
      accountingActionCandidatePackageIds: getAccountingActionCandidatePackageIds(input),
      actionCandidateIds: getActionCandidateIds(input),
      reversibilityClass: input.reversibilityClass,
      reversalJournalEntryCandidateIds: getInputArray(input.reversalJournalEntryCandidateIds),
      compensationJournalEntryCandidateIds: getInputArray(input.compensationJournalEntryCandidateIds),
      rejectionReasonReferenceIds: [
        ...getInputArray(input.rejectionReasonReferenceIds),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.rejectionReasonReferenceIds),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.rejectionReasonReferenceIds,
        ),
      ],
      withdrawalReasonReferenceIds: [
        ...getInputArray(input.withdrawalReasonReferenceIds),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.withdrawalReasonReferenceIds),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.withdrawalReasonReferenceIds,
        ),
      ],
      rejectionAuthorityReferenceIds: [
        ...getInputArray(input.rejectionAuthorityReferenceIds),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.rejectionAuthorityReferenceIds),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.rejectionAuthorityReferenceIds,
        ),
      ],
      withdrawalAuthorityReferenceIds: [
        ...getInputArray(input.withdrawalAuthorityReferenceIds),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.withdrawalAuthorityReferenceIds),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.withdrawalAuthorityReferenceIds,
        ),
      ],
      riskReferenceIds: getInputArray(input.riskReferenceIds),
      riskMetadataReferenceIds: getInputArray(input.riskMetadataReferenceIds),
      actionConfidenceFloorMetadata: getActionConfidenceFloorMetadata(input),
      sourceKnowledgeConfidenceReferenceIds: getSourceKnowledgeConfidenceReferenceIds(input),
      sourceMethodologyConfidenceReferenceIds: getSourceMethodologyConfidenceReferenceIds(input),
      boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
      boundPhase37KnowledgeGraphSnapshotHash: handoff.knowledgeGraphSnapshotHash,
      boundPhase37MethodologySnapshotHash: handoff.methodologySnapshotHash,
      phase37SupersessionReferenceIds: getPhase37SupersessionReferenceIds(input),
      phase37StalenessReasonReferenceIds: getPhase37StalenessReasonReferenceIds(input),
      phase38StaleMarker: getPhase38StaleMarker(input),
      executable: false,
      executionReady: getExecutionReady(input),
      executionReadyIsExecutionAuthority: false,
      phase38Executes: false,
      phase39RequiredForExecution: true,
      companyId: handoff.companyId,
      scope: handoff.scope,
      customerIsolation: handoff.customerIsolation,
      firmIsolation: handoff.firmIsolation,
      clientIsolation: handoff.clientIsolation,
      derivationLineageIds: getDerivationLineageIds(input),
      derivationMethod: getDerivationMethod(input),
      derivationHash: buildDerivationHash(input),
      confidenceFloorMetadata: getConfidenceFloorMetadata(input),
      sourceConfidenceReferenceIds: getSourceConfidenceReferenceIds(input),
      evidenceReferenceIds: getEvidenceReferenceIds(input),
      lineageReferenceIds: getLineageReferenceIds(input),
      trustMetadata: [
        ...handoff.trustMetadata,
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.trustMetadata),
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.trustMetadata),
        ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.trustMetadata),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.trustMetadata,
        ),
      ],
      confidenceMetadata: [
        ...getInputArray(handoff.confidenceMetadata),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.confidenceMetadata),
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.confidenceMetadata),
        ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.confidenceMetadata),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.confidenceMetadata,
        ),
      ],
      governanceMetadata: [
        ...handoff.governanceMetadata,
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.governanceMetadata),
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.governanceMetadata),
        ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.governanceMetadata),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.governanceMetadata,
        ),
      ],
      materialityMetadata: [
        ...getInputArray(handoff.materialityMetadata),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.materialityMetadata),
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.materialityMetadata),
        ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.materialityMetadata),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.materialityMetadata,
        ),
      ],
      warnings,
      skippedIndexes: getInputArray(input.skippedIndexes),
    },
    skipped: false,
    warnings,
  };
}
