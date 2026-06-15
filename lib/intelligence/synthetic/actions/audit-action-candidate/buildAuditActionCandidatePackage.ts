import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticActionConfidenceFloorMetadata,
  SyntheticActionDerivationMethod,
  SyntheticActionReversibilityClass,
  SyntheticPhase38StaleMarker,
} from "../contracts";
import type { SyntheticActionCandidate, SyntheticPhase37ActionHandoffArtifact } from "../action-candidate";
import type { SyntheticWorkflowCandidate } from "../workflow-candidate";
import type { SyntheticApprovalGovernance } from "../approval-package";
import type { SyntheticFinancialControlActionPackage } from "../financial-control-action";
import type { SyntheticJournalEntryCandidatePackage } from "../journal-entry-candidate";
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

export type SyntheticAuditActionType =
  | "evidence_collection"
  | "workpaper_preparation"
  | "audit_program_execution"
  | "tie_out"
  | "testing_procedure"
  | "exception_summary"
  | "audit_support_package"
  | "review_note"
  | "escalation_memo"
  | "sox_testing"
  | "control_testing"
  | "reconciliation_review"
  | "evidence_sufficiency_review"
  | "audit_schedule"
  | "pbc_request"
  | "audit_readiness";

export type SyntheticAuditActionStatus = "candidate" | "review_ready" | "approved" | "rejected" | "withdrawn";

export const SYNTHETIC_AUDIT_ACTION_TYPES: SyntheticAuditActionType[] = [
  "evidence_collection",
  "workpaper_preparation",
  "audit_program_execution",
  "tie_out",
  "testing_procedure",
  "exception_summary",
  "audit_support_package",
  "review_note",
  "escalation_memo",
  "sox_testing",
  "control_testing",
  "reconciliation_review",
  "evidence_sufficiency_review",
  "audit_schedule",
  "pbc_request",
  "audit_readiness",
];

export const SYNTHETIC_AUDIT_ACTION_STATUSES: SyntheticAuditActionStatus[] = [
  "candidate",
  "review_ready",
  "approved",
  "rejected",
  "withdrawn",
];

export const SYNTHETIC_AUDIT_REVERSIBILITY_CLASSES: SyntheticActionReversibilityClass[] = [
  "reversible",
  "compensatable",
  "irreversible",
];

export interface BuildAuditActionCandidatePackageInput {
  phase37Handoff: SyntheticPhase37ActionHandoffArtifact | null;
  actionCandidates?: SyntheticActionCandidate[];
  workflowCandidates?: SyntheticWorkflowCandidate[];
  approvalGovernancePackages?: SyntheticApprovalGovernance[];
  financialControlActionPackages?: SyntheticFinancialControlActionPackage[];
  journalEntryCandidatePackages?: SyntheticJournalEntryCandidatePackage[];
  accountingActionCandidatePackages?: SyntheticAccountingActionCandidatePackage[];
  auditActionType: SyntheticAuditActionType;
  auditActionStatus?: SyntheticAuditActionStatus;
  actionCandidateIds?: string[];
  workflowCandidateIds?: string[];
  approvalGovernanceIds?: string[];
  financialControlActionPackageIds?: string[];
  journalEntryCandidatePackageIds?: string[];
  accountingActionCandidatePackageIds?: string[];
  auditProgramReferenceIds?: string[];
  auditEvidenceReferenceIds?: string[];
  auditWorkpaperReferenceIds?: string[];
  auditFindingReferenceIds?: string[];
  auditExceptionReferenceIds?: string[];
  auditScheduleReferenceIds?: string[];
  pbcRequestReferenceIds?: string[];
  auditSupportPackageReferenceIds?: string[];
  controlTestingReferenceIds?: string[];
  soxTestingReferenceIds?: string[];
  evidenceSufficiencyReferenceIds?: string[];
  materialityThresholdReferenceIds?: string[];
  materialityGatePassed?: boolean;
  reversibilityClass: SyntheticActionReversibilityClass;
  reversalAuditActionCandidateIds?: string[];
  compensationAuditActionCandidateIds?: string[];
  alternativeAuditActionCandidateIds?: string[];
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

export interface SyntheticAuditActionCandidatePackage {
  auditActionCandidatePackageId: string;
  auditActionCandidatePackageKey: string;
  auditActionType: SyntheticAuditActionType;
  auditActionStatus: SyntheticAuditActionStatus;
  actionCandidateIds: string[];
  workflowCandidateIds: string[];
  approvalGovernanceIds: string[];
  financialControlActionPackageIds: string[];
  journalEntryCandidatePackageIds: string[];
  accountingActionCandidatePackageIds: string[];
  auditProgramReferenceIds: string[];
  auditEvidenceReferenceIds: string[];
  auditWorkpaperReferenceIds: string[];
  auditFindingReferenceIds: string[];
  auditExceptionReferenceIds: string[];
  auditScheduleReferenceIds: string[];
  pbcRequestReferenceIds: string[];
  auditSupportPackageReferenceIds: string[];
  controlTestingReferenceIds: string[];
  soxTestingReferenceIds: string[];
  evidenceSufficiencyReferenceIds: string[];
  materialityThresholdReferenceIds: string[];
  materialityGatePassed: boolean;
  reversibilityClass: SyntheticActionReversibilityClass;
  reversalAuditActionCandidateIds: string[];
  compensationAuditActionCandidateIds: string[];
  alternativeAuditActionCandidateIds: string[];
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

export interface BuildAuditActionCandidatePackageResult {
  auditActionCandidatePackage: SyntheticAuditActionCandidatePackage | null;
  skipped: boolean;
  warnings: string[];
}

type ReferenceRecord = Record<string, unknown>;

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getStringArrayProperty(value: object, propertyName: string): string[] {
  const property = (value as ReferenceRecord)[propertyName];
  return Array.isArray(property) ? property.filter((item): item is string => typeof item === "string") : [];
}

function isSupportedAuditActionType(auditActionType: SyntheticAuditActionType): boolean {
  return SYNTHETIC_AUDIT_ACTION_TYPES.includes(auditActionType);
}

function isSupportedAuditActionStatus(auditActionStatus: SyntheticAuditActionStatus): boolean {
  return SYNTHETIC_AUDIT_ACTION_STATUSES.includes(auditActionStatus);
}

function isSupportedReversibilityClass(reversibilityClass: SyntheticActionReversibilityClass): boolean {
  return SYNTHETIC_AUDIT_REVERSIBILITY_CLASSES.includes(reversibilityClass);
}

function getPhase37Handoff(input: BuildAuditActionCandidatePackageInput): SyntheticPhase37ActionHandoffArtifact | null {
  return input.phase37Handoff;
}

function getActionCandidates(input: BuildAuditActionCandidatePackageInput): SyntheticActionCandidate[] {
  return getInputArray(input.actionCandidates);
}

function getWorkflowCandidates(input: BuildAuditActionCandidatePackageInput): SyntheticWorkflowCandidate[] {
  return getInputArray(input.workflowCandidates);
}

function getApprovalGovernancePackages(input: BuildAuditActionCandidatePackageInput): SyntheticApprovalGovernance[] {
  return getInputArray(input.approvalGovernancePackages);
}

function getFinancialControlActionPackages(input: BuildAuditActionCandidatePackageInput): SyntheticFinancialControlActionPackage[] {
  return getInputArray(input.financialControlActionPackages);
}

function getJournalEntryCandidatePackages(input: BuildAuditActionCandidatePackageInput): SyntheticJournalEntryCandidatePackage[] {
  return getInputArray(input.journalEntryCandidatePackages);
}

function getAccountingActionCandidatePackages(input: BuildAuditActionCandidatePackageInput): SyntheticAccountingActionCandidatePackage[] {
  return getInputArray(input.accountingActionCandidatePackages);
}

function getActionCandidateIds(input: BuildAuditActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.actionCandidateIds),
    ...getActionCandidates(input).map((actionCandidate) => actionCandidate.actionCandidateId),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.actionCandidateIds),
    ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.actionCandidateIds),
    ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.actionCandidateIds),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.actionCandidateIds,
    ),
  ];
}

function getWorkflowCandidateIds(input: BuildAuditActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.workflowCandidateIds),
    ...getWorkflowCandidates(input).map((workflowCandidate) => workflowCandidate.workflowCandidateId),
    ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.workflowCandidateIds),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.workflowCandidateIds,
    ),
  ];
}

function getApprovalGovernanceIds(input: BuildAuditActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.approvalGovernanceIds),
    ...getApprovalGovernancePackages(input).map((approvalGovernance) => approvalGovernance.approvalGovernanceId),
    ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.approvalGovernanceIds),
    ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.approvalGovernanceIds),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.approvalGovernanceIds,
    ),
  ];
}

function getFinancialControlActionPackageIds(input: BuildAuditActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.financialControlActionPackageIds),
    ...getFinancialControlActionPackages(input).map(
      (financialControlActionPackage) => financialControlActionPackage.financialControlActionPackageId,
    ),
  ];
}

function getJournalEntryCandidatePackageIds(input: BuildAuditActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.journalEntryCandidatePackageIds),
    ...getJournalEntryCandidatePackages(input).map(
      (journalEntryCandidatePackage) => journalEntryCandidatePackage.journalEntryCandidatePackageId,
    ),
  ];
}

function getAccountingActionCandidatePackageIds(input: BuildAuditActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.accountingActionCandidatePackageIds),
    ...getAccountingActionCandidatePackages(input).map(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.accountingActionCandidatePackageId,
    ),
  ];
}

function getBoundPhase37SnapshotHash(input: BuildAuditActionCandidatePackageInput): string {
  return input.boundPhase37SnapshotHash ?? getPhase37Handoff(input)?.boundPhase37SnapshotHash ?? "";
}

function getPhase38StaleMarker(input: BuildAuditActionCandidatePackageInput): SyntheticPhase38StaleMarker {
  return input.phase38StaleMarker ?? getPhase37Handoff(input)?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildAuditActionCandidatePackageInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? "methodology_derived";
}

function getAuditActionStatus(input: BuildAuditActionCandidatePackageInput): SyntheticAuditActionStatus {
  const requestedStatus = input.auditActionStatus ?? "candidate";
  return isSupportedAuditActionStatus(requestedStatus) ? requestedStatus : "candidate";
}

function getExecutionReady(input: BuildAuditActionCandidatePackageInput): boolean {
  return input.executionReady === true && getAuditActionStatus(input) === "approved";
}

function getActionConfidenceFloorMetadata(input: BuildAuditActionCandidatePackageInput): SyntheticActionConfidenceFloorMetadata[] {
  return [
    ...getInputArray(input.actionConfidenceFloorMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.actionConfidenceFloorMetadata),
    ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.actionConfidenceFloorMetadata),
    ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.actionConfidenceFloorMetadata),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.actionConfidenceFloorMetadata,
    ),
  ];
}

function getSourceKnowledgeConfidenceReferenceIds(input: BuildAuditActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.sourceKnowledgeConfidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.sourceKnowledgeConfidenceReferenceIds),
    ...getFinancialControlActionPackages(input).flatMap(
      (financialControlActionPackage) => financialControlActionPackage.sourceKnowledgeConfidenceReferenceIds,
    ),
    ...getJournalEntryCandidatePackages(input).flatMap(
      (journalEntryCandidatePackage) => journalEntryCandidatePackage.sourceKnowledgeConfidenceReferenceIds,
    ),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.sourceKnowledgeConfidenceReferenceIds,
    ),
    ...getActionConfidenceFloorMetadata(input).flatMap((metadata) => metadata.sourceKnowledgeConfidenceReferenceIds),
  ];
}

function getSourceMethodologyConfidenceReferenceIds(input: BuildAuditActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.sourceMethodologyConfidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.sourceMethodologyConfidenceReferenceIds),
    ...getFinancialControlActionPackages(input).flatMap(
      (financialControlActionPackage) => financialControlActionPackage.sourceMethodologyConfidenceReferenceIds,
    ),
    ...getJournalEntryCandidatePackages(input).flatMap(
      (journalEntryCandidatePackage) => journalEntryCandidatePackage.sourceMethodologyConfidenceReferenceIds,
    ),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.sourceMethodologyConfidenceReferenceIds,
    ),
    ...getActionConfidenceFloorMetadata(input).flatMap((metadata) => metadata.sourceMethodologyConfidenceReferenceIds),
  ];
}

function getEvidenceReferenceIds(input: BuildAuditActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.evidenceReferenceIds),
    ...getInputArray(input.auditEvidenceReferenceIds),
    ...getInputArray(input.controlTestingReferenceIds),
    ...getInputArray(input.soxTestingReferenceIds),
    ...getInputArray(input.evidenceSufficiencyReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.evidenceReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.evidenceReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.evidenceReferenceIds),
    ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.evidenceReferenceIds),
    ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.evidenceReferenceIds),
    ...getInputArray(getPhase37Handoff(input)?.sourceEvidenceLineageGraphIds),
  ];
}

function getLineageReferenceIds(input: BuildAuditActionCandidatePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.lineageReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.lineageReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.lineageReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.lineageReferenceIds),
    ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.lineageReferenceIds),
    ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.lineageReferenceIds),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.lineageReferenceIds,
    ),
    ...getInputArray(handoff?.sourceKnowledgeObjectIds),
    ...getInputArray(handoff?.sourceMethodologyObjectIds),
    ...getInputArray(handoff?.sourceMemoryObjectIds),
  ];
}

function getConfidenceFloorMetadata(input: BuildAuditActionCandidatePackageInput): SyntheticKnowledgeConfidenceFloorMetadata[] {
  return [
    ...getInputArray(input.confidenceFloorMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.confidenceFloorMetadata),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.confidenceFloorMetadata),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.confidenceFloorMetadata),
    ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.confidenceFloorMetadata),
    ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.confidenceFloorMetadata),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.confidenceFloorMetadata,
    ),
    ...getInputArray(getPhase37Handoff(input)?.confidenceFloorMetadata),
  ];
}

function getSourceConfidenceReferenceIds(input: BuildAuditActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.sourceConfidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.sourceConfidenceReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.sourceConfidenceReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.sourceConfidenceReferenceIds),
    ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.sourceConfidenceReferenceIds),
    ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.sourceConfidenceReferenceIds),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.sourceConfidenceReferenceIds,
    ),
  ];
}

function getPhase37SupersessionReferenceIds(input: BuildAuditActionCandidatePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(handoff?.phase37SupersessionReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.phase37SupersessionReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.phase37SupersessionReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.phase37SupersessionReferenceIds),
    ...getFinancialControlActionPackages(input).flatMap(
      (financialControlActionPackage) => financialControlActionPackage.phase37SupersessionReferenceIds,
    ),
    ...getJournalEntryCandidatePackages(input).flatMap(
      (journalEntryCandidatePackage) => journalEntryCandidatePackage.phase37SupersessionReferenceIds,
    ),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.phase37SupersessionReferenceIds,
    ),
    ...getInputArray(input.phase37SupersessionReferenceIds),
  ];
}

function getPhase37StalenessReasonReferenceIds(input: BuildAuditActionCandidatePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(handoff?.phase37StalenessReasonReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.phase37StalenessReasonReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.phase37StalenessReasonReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.phase37StalenessReasonReferenceIds),
    ...getFinancialControlActionPackages(input).flatMap(
      (financialControlActionPackage) => financialControlActionPackage.phase37StalenessReasonReferenceIds,
    ),
    ...getJournalEntryCandidatePackages(input).flatMap(
      (journalEntryCandidatePackage) => journalEntryCandidatePackage.phase37StalenessReasonReferenceIds,
    ),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.phase37StalenessReasonReferenceIds,
    ),
    ...getInputArray(input.phase37StalenessReasonReferenceIds),
  ];
}

function getDerivationLineageIds(input: BuildAuditActionCandidatePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.derivationLineageIds),
    ...getActionCandidateIds(input),
    ...getWorkflowCandidateIds(input),
    ...getApprovalGovernanceIds(input),
    ...getFinancialControlActionPackageIds(input),
    ...getJournalEntryCandidatePackageIds(input),
    ...getAccountingActionCandidatePackageIds(input),
    ...getInputArray(input.auditProgramReferenceIds),
    ...getInputArray(input.auditEvidenceReferenceIds),
    ...getInputArray(input.auditWorkpaperReferenceIds),
    ...getInputArray(input.auditFindingReferenceIds),
    ...getInputArray(input.auditExceptionReferenceIds),
    ...getInputArray(input.auditScheduleReferenceIds),
    ...getInputArray(input.pbcRequestReferenceIds),
    ...getInputArray(input.auditSupportPackageReferenceIds),
    ...getInputArray(input.controlTestingReferenceIds),
    ...getInputArray(input.soxTestingReferenceIds),
    ...getInputArray(input.evidenceSufficiencyReferenceIds),
    ...getInputArray(input.materialityThresholdReferenceIds),
    ...getInputArray(input.riskReferenceIds),
    ...getInputArray(input.riskMetadataReferenceIds),
    ...getInputArray(handoff?.sourceKnowledgeObjectIds),
    ...getInputArray(handoff?.sourceMethodologyObjectIds),
    ...getInputArray(handoff?.sourceMemoryObjectIds),
    ...getInputArray(handoff?.sourceEvidenceLineageGraphIds),
  ];
}

function buildAuditActionCandidatePackageKey(input: BuildAuditActionCandidatePackageInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    auditActionType: input.auditActionType,
    auditActionStatus: getAuditActionStatus(input),
    actionCandidateIds: getActionCandidateIds(input),
    workflowCandidateIds: getWorkflowCandidateIds(input),
    approvalGovernanceIds: getApprovalGovernanceIds(input),
    financialControlActionPackageIds: getFinancialControlActionPackageIds(input),
    journalEntryCandidatePackageIds: getJournalEntryCandidatePackageIds(input),
    accountingActionCandidatePackageIds: getAccountingActionCandidatePackageIds(input),
    auditProgramReferenceIds: getInputArray(input.auditProgramReferenceIds),
    auditEvidenceReferenceIds: getInputArray(input.auditEvidenceReferenceIds),
    auditWorkpaperReferenceIds: getInputArray(input.auditWorkpaperReferenceIds),
    auditFindingReferenceIds: getInputArray(input.auditFindingReferenceIds),
    auditExceptionReferenceIds: getInputArray(input.auditExceptionReferenceIds),
    auditScheduleReferenceIds: getInputArray(input.auditScheduleReferenceIds),
    pbcRequestReferenceIds: getInputArray(input.pbcRequestReferenceIds),
    auditSupportPackageReferenceIds: getInputArray(input.auditSupportPackageReferenceIds),
    controlTestingReferenceIds: getInputArray(input.controlTestingReferenceIds),
    soxTestingReferenceIds: getInputArray(input.soxTestingReferenceIds),
    evidenceSufficiencyReferenceIds: getInputArray(input.evidenceSufficiencyReferenceIds),
    materialityThresholdReferenceIds: getInputArray(input.materialityThresholdReferenceIds),
    materialityGatePassed: input.materialityGatePassed === true,
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

function buildAuditActionCandidatePackageId(input: BuildAuditActionCandidatePackageInput): string {
  return `synthetic-audit-action-candidate-package:${stableSnapshotHash({
    auditActionCandidatePackageKey: buildAuditActionCandidatePackageKey(input),
    auditActionType: input.auditActionType,
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
  })}`;
}

function buildDerivationHash(input: BuildAuditActionCandidatePackageInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    derivationMethod: getDerivationMethod(input),
    auditActionType: input.auditActionType,
    auditActionStatus: getAuditActionStatus(input),
    knowledgePackageHandle: handoff?.knowledgePackageHandle ?? null,
    methodologyPackageHandle: handoff?.methodologyPackageHandle ?? null,
    derivationLineageIds: getDerivationLineageIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
  });
}

function validateAuditActionCandidatePackageInput(input: BuildAuditActionCandidatePackageInput): string[] {
  const warnings: string[] = [];
  const handoff = getPhase37Handoff(input);

  if (!handoff) warnings.push("phase37Handoff is required.");
  if (!hasValue(getBoundPhase37SnapshotHash(input))) warnings.push("boundPhase37SnapshotHash is required.");
  if (!hasValue(input.auditActionType)) warnings.push("auditActionType is required.");
  if (!isSupportedAuditActionType(input.auditActionType)) warnings.push("auditActionType must be supported.");
  if (input.auditActionStatus && !isSupportedAuditActionStatus(input.auditActionStatus)) warnings.push("auditActionStatus defaulted to candidate.");
  if (!hasValue(input.reversibilityClass)) warnings.push("reversibilityClass is required.");
  if (!isSupportedReversibilityClass(input.reversibilityClass)) warnings.push("reversibilityClass must be supported.");
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

  getWorkflowCandidates(input).forEach((workflowCandidate, index) => {
    if (!hasValue(workflowCandidate.workflowCandidateId)) warnings.push(`workflowCandidates[${index}].workflowCandidateId is required.`);
    if (workflowCandidate.executable !== false) warnings.push(`workflowCandidates[${index}].executable must be false.`);
    if (workflowCandidate.companyId !== handoff.companyId) warnings.push(`workflowCandidates[${index}].companyId must equal phase37Handoff.companyId.`);
  });

  return warnings;
}

export function buildAuditActionCandidatePackage(
  input: BuildAuditActionCandidatePackageInput,
): BuildAuditActionCandidatePackageResult {
  const fatalWarnings = validateAuditActionCandidatePackageInput(input);
  const handoff = getPhase37Handoff(input);

  if (fatalWarnings.some((warning) => !warning.includes("defaulted")) || !handoff) {
    return {
      auditActionCandidatePackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const warnings = [
    ...fatalWarnings.filter((warning) => warning.includes("defaulted")),
    ...getStringArrayProperty(handoff, "warnings").map((warning) => `phase37Handoff: ${warning}`),
    ...getActionCandidates(input).flatMap((actionCandidate, index) =>
      actionCandidate.warnings.map((warning) => `actionCandidates[${index}]: ${warning}`),
    ),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate, index) =>
      workflowCandidate.warnings.map((warning) => `workflowCandidates[${index}]: ${warning}`),
    ),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance, index) =>
      approvalGovernance.warnings.map((warning) => `approvalGovernancePackages[${index}]: ${warning}`),
    ),
    ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage, index) =>
      financialControlActionPackage.warnings.map((warning) => `financialControlActionPackages[${index}]: ${warning}`),
    ),
    ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage, index) =>
      journalEntryCandidatePackage.warnings.map((warning) => `journalEntryCandidatePackages[${index}]: ${warning}`),
    ),
    ...getAccountingActionCandidatePackages(input).flatMap((accountingActionCandidatePackage, index) =>
      accountingActionCandidatePackage.warnings.map((warning) => `accountingActionCandidatePackages[${index}]: ${warning}`),
    ),
  ];

  return {
    auditActionCandidatePackage: {
      auditActionCandidatePackageId: buildAuditActionCandidatePackageId(input),
      auditActionCandidatePackageKey: buildAuditActionCandidatePackageKey(input),
      auditActionType: input.auditActionType,
      auditActionStatus: getAuditActionStatus(input),
      actionCandidateIds: getActionCandidateIds(input),
      workflowCandidateIds: getWorkflowCandidateIds(input),
      approvalGovernanceIds: getApprovalGovernanceIds(input),
      financialControlActionPackageIds: getFinancialControlActionPackageIds(input),
      journalEntryCandidatePackageIds: getJournalEntryCandidatePackageIds(input),
      accountingActionCandidatePackageIds: getAccountingActionCandidatePackageIds(input),
      auditProgramReferenceIds: getInputArray(input.auditProgramReferenceIds),
      auditEvidenceReferenceIds: getInputArray(input.auditEvidenceReferenceIds),
      auditWorkpaperReferenceIds: getInputArray(input.auditWorkpaperReferenceIds),
      auditFindingReferenceIds: getInputArray(input.auditFindingReferenceIds),
      auditExceptionReferenceIds: getInputArray(input.auditExceptionReferenceIds),
      auditScheduleReferenceIds: getInputArray(input.auditScheduleReferenceIds),
      pbcRequestReferenceIds: getInputArray(input.pbcRequestReferenceIds),
      auditSupportPackageReferenceIds: getInputArray(input.auditSupportPackageReferenceIds),
      controlTestingReferenceIds: getInputArray(input.controlTestingReferenceIds),
      soxTestingReferenceIds: getInputArray(input.soxTestingReferenceIds),
      evidenceSufficiencyReferenceIds: getInputArray(input.evidenceSufficiencyReferenceIds),
      materialityThresholdReferenceIds: getInputArray(input.materialityThresholdReferenceIds),
      materialityGatePassed: input.materialityGatePassed === true,
      reversibilityClass: input.reversibilityClass,
      reversalAuditActionCandidateIds: getInputArray(input.reversalAuditActionCandidateIds),
      compensationAuditActionCandidateIds: getInputArray(input.compensationAuditActionCandidateIds),
      alternativeAuditActionCandidateIds: getInputArray(input.alternativeAuditActionCandidateIds),
      rejectionReasonReferenceIds: [
        ...getInputArray(input.rejectionReasonReferenceIds),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.rejectionReasonReferenceIds),
        ...getFinancialControlActionPackages(input).flatMap(
          (financialControlActionPackage) => financialControlActionPackage.rejectionReasonReferenceIds,
        ),
        ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.rejectionReasonReferenceIds),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.rejectionReasonReferenceIds,
        ),
      ],
      withdrawalReasonReferenceIds: [
        ...getInputArray(input.withdrawalReasonReferenceIds),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.withdrawalReasonReferenceIds),
        ...getFinancialControlActionPackages(input).flatMap(
          (financialControlActionPackage) => financialControlActionPackage.withdrawalReasonReferenceIds,
        ),
        ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.withdrawalReasonReferenceIds),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.withdrawalReasonReferenceIds,
        ),
      ],
      rejectionAuthorityReferenceIds: [
        ...getInputArray(input.rejectionAuthorityReferenceIds),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.rejectionAuthorityReferenceIds),
        ...getFinancialControlActionPackages(input).flatMap(
          (financialControlActionPackage) => financialControlActionPackage.rejectionAuthorityReferenceIds,
        ),
        ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.rejectionAuthorityReferenceIds),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.rejectionAuthorityReferenceIds,
        ),
      ],
      withdrawalAuthorityReferenceIds: [
        ...getInputArray(input.withdrawalAuthorityReferenceIds),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.withdrawalAuthorityReferenceIds),
        ...getFinancialControlActionPackages(input).flatMap(
          (financialControlActionPackage) => financialControlActionPackage.withdrawalAuthorityReferenceIds,
        ),
        ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.withdrawalAuthorityReferenceIds),
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
        ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.trustMetadata),
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.trustMetadata),
        ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.trustMetadata),
        ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.trustMetadata),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.trustMetadata,
        ),
      ],
      confidenceMetadata: [
        ...getInputArray(handoff.confidenceMetadata),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.confidenceMetadata),
        ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.confidenceMetadata),
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.confidenceMetadata),
        ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.confidenceMetadata),
        ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.confidenceMetadata),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.confidenceMetadata,
        ),
      ],
      governanceMetadata: [
        ...handoff.governanceMetadata,
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.governanceMetadata),
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.governanceMetadata),
        ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.governanceMetadata),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.governanceMetadata,
        ),
      ],
      materialityMetadata: [
        ...getInputArray(handoff.materialityMetadata),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.materialityMetadata),
        ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.materialityMetadata),
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.materialityMetadata),
        ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.materialityMetadata),
        ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.materialityMetadata),
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
