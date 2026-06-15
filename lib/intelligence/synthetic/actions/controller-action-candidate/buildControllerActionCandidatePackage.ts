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
import type { SyntheticJournalEntryCandidatePackage } from "../journal-entry-candidate";
import type { SyntheticAccountingActionCandidatePackage } from "../accounting-action-candidate";
import type { SyntheticFinancialControlActionPackage } from "../financial-control-action";
import type { SyntheticAuditActionCandidatePackage } from "../audit-action-candidate";
import type { SyntheticErpActionCandidatePackage } from "../erp-action-candidate";
import type {
  SyntheticAuditConfidenceMetadata,
  SyntheticAuditGovernanceMetadata,
  SyntheticAuditMaterialityCompatibility,
  SyntheticAuditScope,
  SyntheticAuditTrustMetadata,
} from "../../audit/types";
import type { SyntheticMemoryObjectIsolationDimension } from "../../organizational-memory/memory-object";
import type { SyntheticKnowledgeConfidenceFloorMetadata } from "../../knowledge/contracts";

export type SyntheticControllerActionType =
  | "close_review"
  | "reconciliation_review"
  | "journal_entry_review"
  | "financial_analysis_review"
  | "flux_analysis_review"
  | "variance_review"
  | "approval_routing"
  | "exception_management"
  | "escalation_routing"
  | "staff_review"
  | "controller_summary"
  | "controller_briefing"
  | "board_package_review"
  | "cfo_package_review";

export type SyntheticControllerActionStatus = "candidate" | "review_ready" | "approved" | "rejected" | "withdrawn";

export const SYNTHETIC_CONTROLLER_ACTION_TYPES: SyntheticControllerActionType[] = [
  "close_review",
  "reconciliation_review",
  "journal_entry_review",
  "financial_analysis_review",
  "flux_analysis_review",
  "variance_review",
  "approval_routing",
  "exception_management",
  "escalation_routing",
  "staff_review",
  "controller_summary",
  "controller_briefing",
  "board_package_review",
  "cfo_package_review",
];

export const SYNTHETIC_CONTROLLER_ACTION_STATUSES: SyntheticControllerActionStatus[] = [
  "candidate",
  "review_ready",
  "approved",
  "rejected",
  "withdrawn",
];

export const SYNTHETIC_CONTROLLER_REVERSIBILITY_CLASSES: SyntheticActionReversibilityClass[] = [
  "reversible",
  "compensatable",
  "irreversible",
];

export interface BuildControllerActionCandidatePackageInput {
  phase37Handoff: SyntheticPhase37ActionHandoffArtifact | null;
  actionCandidates?: SyntheticActionCandidate[];
  workflowCandidates?: SyntheticWorkflowCandidate[];
  approvalGovernancePackages?: SyntheticApprovalGovernance[];
  journalEntryCandidatePackages?: SyntheticJournalEntryCandidatePackage[];
  accountingActionCandidatePackages?: SyntheticAccountingActionCandidatePackage[];
  financialControlActionPackages?: SyntheticFinancialControlActionPackage[];
  auditActionCandidatePackages?: SyntheticAuditActionCandidatePackage[];
  erpActionCandidatePackages?: SyntheticErpActionCandidatePackage[];
  controllerActionType: SyntheticControllerActionType;
  controllerActionStatus?: SyntheticControllerActionStatus;
  actionCandidateIds?: string[];
  workflowCandidateIds?: string[];
  approvalGovernanceIds?: string[];
  journalEntryCandidatePackageIds?: string[];
  accountingActionCandidatePackageIds?: string[];
  financialControlActionPackageIds?: string[];
  auditActionCandidatePackageIds?: string[];
  erpActionCandidatePackageIds?: string[];
  controllerPolicyReferenceIds?: string[];
  controllerReviewReferenceIds?: string[];
  controllerEscalationReferenceIds?: string[];
  closeChecklistReferenceIds?: string[];
  reconciliationReviewReferenceIds?: string[];
  fluxAnalysisReferenceIds?: string[];
  varianceAnalysisReferenceIds?: string[];
  financialStatementReferenceIds?: string[];
  boardPackageReferenceIds?: string[];
  materialityThresholdReferenceIds?: string[];
  materialityGatePassed?: boolean;
  approvalQuorumRequired?: boolean;
  approvalQuorumSatisfied?: boolean;
  segregationOfDutiesRequired?: boolean;
  segregationOfDutiesSatisfied?: boolean;
  approvalRequesterReferenceIds?: string[];
  approvalAuthorityReferenceIds?: string[];
  reversibilityClass: SyntheticActionReversibilityClass;
  reversalControllerActionCandidateIds?: string[];
  compensationControllerActionCandidateIds?: string[];
  alternativeControllerActionCandidateIds?: string[];
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

export interface SyntheticControllerActionCandidatePackage {
  controllerActionCandidatePackageId: string;
  controllerActionCandidatePackageKey: string;
  controllerActionType: SyntheticControllerActionType;
  controllerActionStatus: SyntheticControllerActionStatus;
  actionCandidateIds: string[];
  workflowCandidateIds: string[];
  approvalGovernanceIds: string[];
  journalEntryCandidatePackageIds: string[];
  accountingActionCandidatePackageIds: string[];
  financialControlActionPackageIds: string[];
  auditActionCandidatePackageIds: string[];
  erpActionCandidatePackageIds: string[];
  controllerPolicyReferenceIds: string[];
  controllerReviewReferenceIds: string[];
  controllerEscalationReferenceIds: string[];
  closeChecklistReferenceIds: string[];
  reconciliationReviewReferenceIds: string[];
  fluxAnalysisReferenceIds: string[];
  varianceAnalysisReferenceIds: string[];
  financialStatementReferenceIds: string[];
  boardPackageReferenceIds: string[];
  materialityThresholdReferenceIds: string[];
  materialityGatePassed: boolean;
  approvalQuorumRequired: boolean;
  approvalQuorumSatisfied: boolean;
  segregationOfDutiesRequired: boolean;
  segregationOfDutiesSatisfied: boolean;
  reversibilityClass: SyntheticActionReversibilityClass;
  reversalControllerActionCandidateIds: string[];
  compensationControllerActionCandidateIds: string[];
  alternativeControllerActionCandidateIds: string[];
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

export interface BuildControllerActionCandidatePackageResult {
  controllerActionCandidatePackage: SyntheticControllerActionCandidatePackage | null;
  skipped: boolean;
  warnings: string[];
}

type ReferenceRecord = Record<string, unknown>;

interface ResolvedControllerActionStatus {
  controllerActionStatus: SyntheticControllerActionStatus;
  warnings: string[];
}

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

function isSupportedControllerActionType(controllerActionType: SyntheticControllerActionType): boolean {
  return SYNTHETIC_CONTROLLER_ACTION_TYPES.includes(controllerActionType);
}

function isSupportedControllerActionStatus(controllerActionStatus: SyntheticControllerActionStatus): boolean {
  return SYNTHETIC_CONTROLLER_ACTION_STATUSES.includes(controllerActionStatus);
}

function isSupportedReversibilityClass(reversibilityClass: SyntheticActionReversibilityClass): boolean {
  return SYNTHETIC_CONTROLLER_REVERSIBILITY_CLASSES.includes(reversibilityClass);
}

function getPhase37Handoff(input: BuildControllerActionCandidatePackageInput): SyntheticPhase37ActionHandoffArtifact | null {
  return input.phase37Handoff;
}

function getActionCandidates(input: BuildControllerActionCandidatePackageInput): SyntheticActionCandidate[] {
  return getInputArray(input.actionCandidates);
}

function getWorkflowCandidates(input: BuildControllerActionCandidatePackageInput): SyntheticWorkflowCandidate[] {
  return getInputArray(input.workflowCandidates);
}

function getApprovalGovernancePackages(input: BuildControllerActionCandidatePackageInput): SyntheticApprovalGovernance[] {
  return getInputArray(input.approvalGovernancePackages);
}

function getJournalEntryCandidatePackages(input: BuildControllerActionCandidatePackageInput): SyntheticJournalEntryCandidatePackage[] {
  return getInputArray(input.journalEntryCandidatePackages);
}

function getAccountingActionCandidatePackages(
  input: BuildControllerActionCandidatePackageInput,
): SyntheticAccountingActionCandidatePackage[] {
  return getInputArray(input.accountingActionCandidatePackages);
}

function getFinancialControlActionPackages(input: BuildControllerActionCandidatePackageInput): SyntheticFinancialControlActionPackage[] {
  return getInputArray(input.financialControlActionPackages);
}

function getAuditActionCandidatePackages(input: BuildControllerActionCandidatePackageInput): SyntheticAuditActionCandidatePackage[] {
  return getInputArray(input.auditActionCandidatePackages);
}

function getErpActionCandidatePackages(input: BuildControllerActionCandidatePackageInput): SyntheticErpActionCandidatePackage[] {
  return getInputArray(input.erpActionCandidatePackages);
}

function getActionCandidateIds(input: BuildControllerActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.actionCandidateIds),
    ...getActionCandidates(input).map((actionCandidate) => actionCandidate.actionCandidateId),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.actionCandidateIds),
    ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.actionCandidateIds),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.actionCandidateIds,
    ),
    ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.actionCandidateIds),
    ...getAuditActionCandidatePackages(input).flatMap((auditActionCandidatePackage) => auditActionCandidatePackage.actionCandidateIds),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.actionCandidateIds),
  ];
}

function getWorkflowCandidateIds(input: BuildControllerActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.workflowCandidateIds),
    ...getWorkflowCandidates(input).map((workflowCandidate) => workflowCandidate.workflowCandidateId),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.workflowCandidateIds,
    ),
    ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.workflowCandidateIds),
    ...getAuditActionCandidatePackages(input).flatMap((auditActionCandidatePackage) => auditActionCandidatePackage.workflowCandidateIds),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.workflowCandidateIds),
  ];
}

function getApprovalGovernanceIds(input: BuildControllerActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.approvalGovernanceIds),
    ...getApprovalGovernancePackages(input).map((approvalGovernance) => approvalGovernance.approvalGovernanceId),
    ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.approvalGovernanceIds),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.approvalGovernanceIds,
    ),
    ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.approvalGovernanceIds),
    ...getAuditActionCandidatePackages(input).flatMap((auditActionCandidatePackage) => auditActionCandidatePackage.approvalGovernanceIds),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.approvalGovernanceIds),
  ];
}

function getJournalEntryCandidatePackageIds(input: BuildControllerActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.journalEntryCandidatePackageIds),
    ...getJournalEntryCandidatePackages(input).map(
      (journalEntryCandidatePackage) => journalEntryCandidatePackage.journalEntryCandidatePackageId,
    ),
  ];
}

function getAccountingActionCandidatePackageIds(input: BuildControllerActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.accountingActionCandidatePackageIds),
    ...getAccountingActionCandidatePackages(input).map(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.accountingActionCandidatePackageId,
    ),
  ];
}

function getFinancialControlActionPackageIds(input: BuildControllerActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.financialControlActionPackageIds),
    ...getFinancialControlActionPackages(input).map(
      (financialControlActionPackage) => financialControlActionPackage.financialControlActionPackageId,
    ),
  ];
}

function getAuditActionCandidatePackageIds(input: BuildControllerActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.auditActionCandidatePackageIds),
    ...getAuditActionCandidatePackages(input).map((auditActionCandidatePackage) => auditActionCandidatePackage.auditActionCandidatePackageId),
  ];
}

function getErpActionCandidatePackageIds(input: BuildControllerActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.erpActionCandidatePackageIds),
    ...getErpActionCandidatePackages(input).map((erpActionCandidatePackage) => erpActionCandidatePackage.erpActionCandidatePackageId),
  ];
}

function getApprovalRequesterReferenceIds(input: BuildControllerActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.approvalRequesterReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) =>
      getStringArrayProperty(approvalGovernance, "approvalRequesterReferenceIds"),
    ),
  ];
}

function getApprovalAuthorityReferenceIds(input: BuildControllerActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.approvalAuthorityReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.approvalAuthorityReferenceIds),
  ];
}

function hasSelfApproval(input: BuildControllerActionCandidatePackageInput): boolean {
  const requesterReferenceIds = getApprovalRequesterReferenceIds(input);
  const authorityReferenceIds = getApprovalAuthorityReferenceIds(input);
  return requesterReferenceIds.some((requesterReferenceId) => authorityReferenceIds.includes(requesterReferenceId));
}

function getBoundPhase37SnapshotHash(input: BuildControllerActionCandidatePackageInput): string {
  return input.boundPhase37SnapshotHash ?? getPhase37Handoff(input)?.boundPhase37SnapshotHash ?? "";
}

function getPhase38StaleMarker(input: BuildControllerActionCandidatePackageInput): SyntheticPhase38StaleMarker {
  return input.phase38StaleMarker ?? getPhase37Handoff(input)?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildControllerActionCandidatePackageInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? "methodology_derived";
}

function getMaterialityGatePassed(input: BuildControllerActionCandidatePackageInput): boolean {
  return input.materialityGatePassed === true;
}

function getApprovalQuorumRequired(input: BuildControllerActionCandidatePackageInput): boolean {
  return input.approvalQuorumRequired === true;
}

function getApprovalQuorumSatisfied(input: BuildControllerActionCandidatePackageInput): boolean {
  return input.approvalQuorumSatisfied === true;
}

function getSegregationOfDutiesRequired(input: BuildControllerActionCandidatePackageInput): boolean {
  return input.segregationOfDutiesRequired === true;
}

function getSegregationOfDutiesSatisfied(input: BuildControllerActionCandidatePackageInput): boolean {
  return input.segregationOfDutiesSatisfied === true;
}

function getControllerGovernanceSatisfied(input: BuildControllerActionCandidatePackageInput): boolean {
  const materialitySatisfied = getInputArray(input.materialityThresholdReferenceIds).length === 0 || getMaterialityGatePassed(input);
  const quorumSatisfied = !getApprovalQuorumRequired(input) || getApprovalQuorumSatisfied(input);
  const segregationSatisfied = !getSegregationOfDutiesRequired(input) || getSegregationOfDutiesSatisfied(input);
  return materialitySatisfied && quorumSatisfied && segregationSatisfied && !hasSelfApproval(input);
}

function resolveControllerActionStatus(input: BuildControllerActionCandidatePackageInput): ResolvedControllerActionStatus {
  const requestedStatus = input.controllerActionStatus ?? "candidate";
  const warnings: string[] = [];

  if (!isSupportedControllerActionStatus(requestedStatus)) {
    return {
      controllerActionStatus: "candidate",
      warnings: ["controllerActionStatus must be supported; defaulted to candidate."],
    };
  }

  if (requestedStatus === "approved" && !getControllerGovernanceSatisfied(input)) {
    warnings.push("controllerActionStatus defaulted to candidate because preserved controller governance gates were not satisfied.");
    return {
      controllerActionStatus: "candidate",
      warnings,
    };
  }

  return {
    controllerActionStatus: requestedStatus,
    warnings,
  };
}

function getExecutionReady(input: BuildControllerActionCandidatePackageInput): boolean {
  return input.executionReady === true && resolveControllerActionStatus(input).controllerActionStatus === "approved";
}

function getActionConfidenceFloorMetadata(input: BuildControllerActionCandidatePackageInput): SyntheticActionConfidenceFloorMetadata[] {
  return [
    ...getInputArray(input.actionConfidenceFloorMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.actionConfidenceFloorMetadata),
    ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.actionConfidenceFloorMetadata),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.actionConfidenceFloorMetadata,
    ),
    ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.actionConfidenceFloorMetadata),
    ...getAuditActionCandidatePackages(input).flatMap((auditActionCandidatePackage) => auditActionCandidatePackage.actionConfidenceFloorMetadata),
  ];
}

function getSourceKnowledgeConfidenceReferenceIds(input: BuildControllerActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.sourceKnowledgeConfidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.sourceKnowledgeConfidenceReferenceIds),
    ...getJournalEntryCandidatePackages(input).flatMap(
      (journalEntryCandidatePackage) => journalEntryCandidatePackage.sourceKnowledgeConfidenceReferenceIds,
    ),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.sourceKnowledgeConfidenceReferenceIds,
    ),
    ...getFinancialControlActionPackages(input).flatMap(
      (financialControlActionPackage) => financialControlActionPackage.sourceKnowledgeConfidenceReferenceIds,
    ),
    ...getAuditActionCandidatePackages(input).flatMap((auditActionCandidatePackage) => auditActionCandidatePackage.sourceKnowledgeConfidenceReferenceIds),
    ...getActionConfidenceFloorMetadata(input).flatMap((metadata) => metadata.sourceKnowledgeConfidenceReferenceIds),
  ];
}

function getSourceMethodologyConfidenceReferenceIds(input: BuildControllerActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.sourceMethodologyConfidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.sourceMethodologyConfidenceReferenceIds),
    ...getJournalEntryCandidatePackages(input).flatMap(
      (journalEntryCandidatePackage) => journalEntryCandidatePackage.sourceMethodologyConfidenceReferenceIds,
    ),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.sourceMethodologyConfidenceReferenceIds,
    ),
    ...getFinancialControlActionPackages(input).flatMap(
      (financialControlActionPackage) => financialControlActionPackage.sourceMethodologyConfidenceReferenceIds,
    ),
    ...getAuditActionCandidatePackages(input).flatMap((auditActionCandidatePackage) => auditActionCandidatePackage.sourceMethodologyConfidenceReferenceIds),
    ...getActionConfidenceFloorMetadata(input).flatMap((metadata) => metadata.sourceMethodologyConfidenceReferenceIds),
  ];
}

function getEvidenceReferenceIds(input: BuildControllerActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.evidenceReferenceIds),
    ...getInputArray(input.controllerReviewReferenceIds),
    ...getInputArray(input.closeChecklistReferenceIds),
    ...getInputArray(input.reconciliationReviewReferenceIds),
    ...getInputArray(input.fluxAnalysisReferenceIds),
    ...getInputArray(input.varianceAnalysisReferenceIds),
    ...getInputArray(input.financialStatementReferenceIds),
    ...getInputArray(input.boardPackageReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.evidenceReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.evidenceReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.evidenceReferenceIds),
    ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.evidenceReferenceIds),
    ...getAuditActionCandidatePackages(input).flatMap((auditActionCandidatePackage) => auditActionCandidatePackage.evidenceReferenceIds),
    ...getInputArray(getPhase37Handoff(input)?.sourceEvidenceLineageGraphIds),
  ];
}

function getLineageReferenceIds(input: BuildControllerActionCandidatePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.lineageReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.lineageReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.lineageReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.lineageReferenceIds),
    ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.lineageReferenceIds),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.lineageReferenceIds,
    ),
    ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.lineageReferenceIds),
    ...getAuditActionCandidatePackages(input).flatMap((auditActionCandidatePackage) => auditActionCandidatePackage.lineageReferenceIds),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.lineageReferenceIds),
    ...getInputArray(handoff?.sourceKnowledgeObjectIds),
    ...getInputArray(handoff?.sourceMethodologyObjectIds),
    ...getInputArray(handoff?.sourceMemoryObjectIds),
  ];
}

function getConfidenceFloorMetadata(input: BuildControllerActionCandidatePackageInput): SyntheticKnowledgeConfidenceFloorMetadata[] {
  return [
    ...getInputArray(input.confidenceFloorMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.confidenceFloorMetadata),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.confidenceFloorMetadata),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.confidenceFloorMetadata),
    ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.confidenceFloorMetadata),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.confidenceFloorMetadata,
    ),
    ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.confidenceFloorMetadata),
    ...getAuditActionCandidatePackages(input).flatMap((auditActionCandidatePackage) => auditActionCandidatePackage.confidenceFloorMetadata),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.confidenceFloorMetadata),
    ...getInputArray(getPhase37Handoff(input)?.confidenceFloorMetadata),
  ];
}

function getSourceConfidenceReferenceIds(input: BuildControllerActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.sourceConfidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.sourceConfidenceReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.sourceConfidenceReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.sourceConfidenceReferenceIds),
    ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.sourceConfidenceReferenceIds),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.sourceConfidenceReferenceIds,
    ),
    ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.sourceConfidenceReferenceIds),
    ...getAuditActionCandidatePackages(input).flatMap((auditActionCandidatePackage) => auditActionCandidatePackage.sourceConfidenceReferenceIds),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.sourceConfidenceReferenceIds),
  ];
}

function getPhase37SupersessionReferenceIds(input: BuildControllerActionCandidatePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(handoff?.phase37SupersessionReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.phase37SupersessionReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.phase37SupersessionReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.phase37SupersessionReferenceIds),
    ...getJournalEntryCandidatePackages(input).flatMap(
      (journalEntryCandidatePackage) => journalEntryCandidatePackage.phase37SupersessionReferenceIds,
    ),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.phase37SupersessionReferenceIds,
    ),
    ...getFinancialControlActionPackages(input).flatMap(
      (financialControlActionPackage) => financialControlActionPackage.phase37SupersessionReferenceIds,
    ),
    ...getAuditActionCandidatePackages(input).flatMap((auditActionCandidatePackage) => auditActionCandidatePackage.phase37SupersessionReferenceIds),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.phase37SupersessionReferenceIds),
    ...getInputArray(input.phase37SupersessionReferenceIds),
  ];
}

function getPhase37StalenessReasonReferenceIds(input: BuildControllerActionCandidatePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(handoff?.phase37StalenessReasonReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.phase37StalenessReasonReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.phase37StalenessReasonReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.phase37StalenessReasonReferenceIds),
    ...getJournalEntryCandidatePackages(input).flatMap(
      (journalEntryCandidatePackage) => journalEntryCandidatePackage.phase37StalenessReasonReferenceIds,
    ),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.phase37StalenessReasonReferenceIds,
    ),
    ...getFinancialControlActionPackages(input).flatMap(
      (financialControlActionPackage) => financialControlActionPackage.phase37StalenessReasonReferenceIds,
    ),
    ...getAuditActionCandidatePackages(input).flatMap((auditActionCandidatePackage) => auditActionCandidatePackage.phase37StalenessReasonReferenceIds),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.phase37StalenessReasonReferenceIds),
    ...getInputArray(input.phase37StalenessReasonReferenceIds),
  ];
}

function getDerivationLineageIds(input: BuildControllerActionCandidatePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.derivationLineageIds),
    ...getActionCandidateIds(input),
    ...getWorkflowCandidateIds(input),
    ...getApprovalGovernanceIds(input),
    ...getJournalEntryCandidatePackageIds(input),
    ...getAccountingActionCandidatePackageIds(input),
    ...getFinancialControlActionPackageIds(input),
    ...getAuditActionCandidatePackageIds(input),
    ...getErpActionCandidatePackageIds(input),
    ...getInputArray(input.controllerPolicyReferenceIds),
    ...getInputArray(input.controllerReviewReferenceIds),
    ...getInputArray(input.controllerEscalationReferenceIds),
    ...getInputArray(input.closeChecklistReferenceIds),
    ...getInputArray(input.reconciliationReviewReferenceIds),
    ...getInputArray(input.fluxAnalysisReferenceIds),
    ...getInputArray(input.varianceAnalysisReferenceIds),
    ...getInputArray(input.financialStatementReferenceIds),
    ...getInputArray(input.boardPackageReferenceIds),
    ...getInputArray(input.materialityThresholdReferenceIds),
    ...getInputArray(input.riskReferenceIds),
    ...getInputArray(input.riskMetadataReferenceIds),
    ...getInputArray(handoff?.sourceKnowledgeObjectIds),
    ...getInputArray(handoff?.sourceMethodologyObjectIds),
    ...getInputArray(handoff?.sourceMemoryObjectIds),
    ...getInputArray(handoff?.sourceEvidenceLineageGraphIds),
  ];
}

function buildControllerActionCandidatePackageKey(input: BuildControllerActionCandidatePackageInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    controllerActionType: input.controllerActionType,
    controllerActionStatus: resolveControllerActionStatus(input).controllerActionStatus,
    actionCandidateIds: getActionCandidateIds(input),
    workflowCandidateIds: getWorkflowCandidateIds(input),
    approvalGovernanceIds: getApprovalGovernanceIds(input),
    journalEntryCandidatePackageIds: getJournalEntryCandidatePackageIds(input),
    accountingActionCandidatePackageIds: getAccountingActionCandidatePackageIds(input),
    financialControlActionPackageIds: getFinancialControlActionPackageIds(input),
    auditActionCandidatePackageIds: getAuditActionCandidatePackageIds(input),
    erpActionCandidatePackageIds: getErpActionCandidatePackageIds(input),
    controllerPolicyReferenceIds: getInputArray(input.controllerPolicyReferenceIds),
    controllerReviewReferenceIds: getInputArray(input.controllerReviewReferenceIds),
    controllerEscalationReferenceIds: getInputArray(input.controllerEscalationReferenceIds),
    closeChecklistReferenceIds: getInputArray(input.closeChecklistReferenceIds),
    reconciliationReviewReferenceIds: getInputArray(input.reconciliationReviewReferenceIds),
    fluxAnalysisReferenceIds: getInputArray(input.fluxAnalysisReferenceIds),
    varianceAnalysisReferenceIds: getInputArray(input.varianceAnalysisReferenceIds),
    financialStatementReferenceIds: getInputArray(input.financialStatementReferenceIds),
    boardPackageReferenceIds: getInputArray(input.boardPackageReferenceIds),
    materialityThresholdReferenceIds: getInputArray(input.materialityThresholdReferenceIds),
    materialityGatePassed: getMaterialityGatePassed(input),
    approvalQuorumRequired: getApprovalQuorumRequired(input),
    approvalQuorumSatisfied: getApprovalQuorumSatisfied(input),
    segregationOfDutiesRequired: getSegregationOfDutiesRequired(input),
    segregationOfDutiesSatisfied: getSegregationOfDutiesSatisfied(input),
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

function buildControllerActionCandidatePackageId(input: BuildControllerActionCandidatePackageInput): string {
  return `synthetic-controller-action-candidate-package:${stableSnapshotHash({
    controllerActionCandidatePackageKey: buildControllerActionCandidatePackageKey(input),
    controllerActionType: input.controllerActionType,
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
  })}`;
}

function buildDerivationHash(input: BuildControllerActionCandidatePackageInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    derivationMethod: getDerivationMethod(input),
    controllerActionType: input.controllerActionType,
    controllerActionStatus: resolveControllerActionStatus(input).controllerActionStatus,
    knowledgePackageHandle: handoff?.knowledgePackageHandle ?? null,
    methodologyPackageHandle: handoff?.methodologyPackageHandle ?? null,
    derivationLineageIds: getDerivationLineageIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
  });
}

function validateControllerActionCandidatePackageInput(input: BuildControllerActionCandidatePackageInput): string[] {
  const warnings: string[] = [];
  const handoff = getPhase37Handoff(input);

  if (!handoff) warnings.push("phase37Handoff is required.");
  if (!hasValue(getBoundPhase37SnapshotHash(input))) warnings.push("boundPhase37SnapshotHash is required.");
  if (!hasValue(input.controllerActionType)) warnings.push("controllerActionType is required.");
  if (!isSupportedControllerActionType(input.controllerActionType)) warnings.push("controllerActionType must be supported.");
  if (!hasValue(input.reversibilityClass)) warnings.push("reversibilityClass is required.");
  if (!isSupportedReversibilityClass(input.reversibilityClass)) warnings.push("reversibilityClass must be supported.");
  if (hasSelfApproval(input)) warnings.push("controller action candidate cannot self-approve.");
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

export function buildControllerActionCandidatePackage(
  input: BuildControllerActionCandidatePackageInput,
): BuildControllerActionCandidatePackageResult {
  const fatalWarnings = validateControllerActionCandidatePackageInput(input);
  const handoff = getPhase37Handoff(input);

  if (fatalWarnings.length > 0 || !handoff) {
    return {
      controllerActionCandidatePackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const statusResolution = resolveControllerActionStatus(input);
  const warnings = [
    ...statusResolution.warnings,
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
    ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage, index) =>
      journalEntryCandidatePackage.warnings.map((warning) => `journalEntryCandidatePackages[${index}]: ${warning}`),
    ),
    ...getAccountingActionCandidatePackages(input).flatMap((accountingActionCandidatePackage, index) =>
      accountingActionCandidatePackage.warnings.map((warning) => `accountingActionCandidatePackages[${index}]: ${warning}`),
    ),
    ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage, index) =>
      financialControlActionPackage.warnings.map((warning) => `financialControlActionPackages[${index}]: ${warning}`),
    ),
    ...getAuditActionCandidatePackages(input).flatMap((auditActionCandidatePackage, index) =>
      auditActionCandidatePackage.warnings.map((warning) => `auditActionCandidatePackages[${index}]: ${warning}`),
    ),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage, index) =>
      erpActionCandidatePackage.warnings.map((warning) => `erpActionCandidatePackages[${index}]: ${warning}`),
    ),
  ];

  return {
    controllerActionCandidatePackage: {
      controllerActionCandidatePackageId: buildControllerActionCandidatePackageId(input),
      controllerActionCandidatePackageKey: buildControllerActionCandidatePackageKey(input),
      controllerActionType: input.controllerActionType,
      controllerActionStatus: statusResolution.controllerActionStatus,
      actionCandidateIds: getActionCandidateIds(input),
      workflowCandidateIds: getWorkflowCandidateIds(input),
      approvalGovernanceIds: getApprovalGovernanceIds(input),
      journalEntryCandidatePackageIds: getJournalEntryCandidatePackageIds(input),
      accountingActionCandidatePackageIds: getAccountingActionCandidatePackageIds(input),
      financialControlActionPackageIds: getFinancialControlActionPackageIds(input),
      auditActionCandidatePackageIds: getAuditActionCandidatePackageIds(input),
      erpActionCandidatePackageIds: getErpActionCandidatePackageIds(input),
      controllerPolicyReferenceIds: getInputArray(input.controllerPolicyReferenceIds),
      controllerReviewReferenceIds: getInputArray(input.controllerReviewReferenceIds),
      controllerEscalationReferenceIds: getInputArray(input.controllerEscalationReferenceIds),
      closeChecklistReferenceIds: getInputArray(input.closeChecklistReferenceIds),
      reconciliationReviewReferenceIds: getInputArray(input.reconciliationReviewReferenceIds),
      fluxAnalysisReferenceIds: getInputArray(input.fluxAnalysisReferenceIds),
      varianceAnalysisReferenceIds: getInputArray(input.varianceAnalysisReferenceIds),
      financialStatementReferenceIds: getInputArray(input.financialStatementReferenceIds),
      boardPackageReferenceIds: getInputArray(input.boardPackageReferenceIds),
      materialityThresholdReferenceIds: getInputArray(input.materialityThresholdReferenceIds),
      materialityGatePassed: getMaterialityGatePassed(input),
      approvalQuorumRequired: getApprovalQuorumRequired(input),
      approvalQuorumSatisfied: getApprovalQuorumSatisfied(input),
      segregationOfDutiesRequired: getSegregationOfDutiesRequired(input),
      segregationOfDutiesSatisfied: getSegregationOfDutiesSatisfied(input),
      reversibilityClass: input.reversibilityClass,
      reversalControllerActionCandidateIds: getInputArray(input.reversalControllerActionCandidateIds),
      compensationControllerActionCandidateIds: getInputArray(input.compensationControllerActionCandidateIds),
      alternativeControllerActionCandidateIds: getInputArray(input.alternativeControllerActionCandidateIds),
      rejectionReasonReferenceIds: [
        ...getInputArray(input.rejectionReasonReferenceIds),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.rejectionReasonReferenceIds),
        ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.rejectionReasonReferenceIds),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.rejectionReasonReferenceIds,
        ),
        ...getFinancialControlActionPackages(input).flatMap(
          (financialControlActionPackage) => financialControlActionPackage.rejectionReasonReferenceIds,
        ),
        ...getAuditActionCandidatePackages(input).flatMap((auditActionCandidatePackage) => auditActionCandidatePackage.rejectionReasonReferenceIds),
      ],
      withdrawalReasonReferenceIds: [
        ...getInputArray(input.withdrawalReasonReferenceIds),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.withdrawalReasonReferenceIds),
        ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.withdrawalReasonReferenceIds),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.withdrawalReasonReferenceIds,
        ),
        ...getFinancialControlActionPackages(input).flatMap(
          (financialControlActionPackage) => financialControlActionPackage.withdrawalReasonReferenceIds,
        ),
        ...getAuditActionCandidatePackages(input).flatMap((auditActionCandidatePackage) => auditActionCandidatePackage.withdrawalReasonReferenceIds),
      ],
      rejectionAuthorityReferenceIds: [
        ...getInputArray(input.rejectionAuthorityReferenceIds),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.rejectionAuthorityReferenceIds),
        ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.rejectionAuthorityReferenceIds),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.rejectionAuthorityReferenceIds,
        ),
        ...getFinancialControlActionPackages(input).flatMap(
          (financialControlActionPackage) => financialControlActionPackage.rejectionAuthorityReferenceIds,
        ),
        ...getAuditActionCandidatePackages(input).flatMap((auditActionCandidatePackage) => auditActionCandidatePackage.rejectionAuthorityReferenceIds),
      ],
      withdrawalAuthorityReferenceIds: [
        ...getInputArray(input.withdrawalAuthorityReferenceIds),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.withdrawalAuthorityReferenceIds),
        ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.withdrawalAuthorityReferenceIds),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.withdrawalAuthorityReferenceIds,
        ),
        ...getFinancialControlActionPackages(input).flatMap(
          (financialControlActionPackage) => financialControlActionPackage.withdrawalAuthorityReferenceIds,
        ),
        ...getAuditActionCandidatePackages(input).flatMap((auditActionCandidatePackage) => auditActionCandidatePackage.withdrawalAuthorityReferenceIds),
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
        ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.trustMetadata),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.trustMetadata,
        ),
        ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.trustMetadata),
        ...getAuditActionCandidatePackages(input).flatMap((auditActionCandidatePackage) => auditActionCandidatePackage.trustMetadata),
        ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.trustMetadata),
      ],
      confidenceMetadata: [
        ...getInputArray(handoff.confidenceMetadata),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.confidenceMetadata),
        ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.confidenceMetadata),
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.confidenceMetadata),
        ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.confidenceMetadata),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.confidenceMetadata,
        ),
        ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.confidenceMetadata),
        ...getAuditActionCandidatePackages(input).flatMap((auditActionCandidatePackage) => auditActionCandidatePackage.confidenceMetadata),
        ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.confidenceMetadata),
      ],
      governanceMetadata: [
        ...handoff.governanceMetadata,
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.governanceMetadata),
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.governanceMetadata),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.governanceMetadata,
        ),
        ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.governanceMetadata),
        ...getAuditActionCandidatePackages(input).flatMap((auditActionCandidatePackage) => auditActionCandidatePackage.governanceMetadata),
        ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.governanceMetadata),
      ],
      materialityMetadata: [
        ...getInputArray(handoff.materialityMetadata),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.materialityMetadata),
        ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.materialityMetadata),
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.materialityMetadata),
        ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.materialityMetadata),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.materialityMetadata,
        ),
        ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.materialityMetadata),
        ...getAuditActionCandidatePackages(input).flatMap((auditActionCandidatePackage) => auditActionCandidatePackage.materialityMetadata),
        ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.materialityMetadata),
      ],
      warnings,
      skippedIndexes: getInputArray(input.skippedIndexes),
    },
    skipped: false,
    warnings,
  };
}
