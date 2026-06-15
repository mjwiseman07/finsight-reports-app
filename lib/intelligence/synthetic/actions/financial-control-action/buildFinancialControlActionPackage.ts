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

export type SyntheticControlActionType =
  | "segregation_of_duties_check"
  | "reconciliation_control"
  | "journal_entry_control"
  | "approval_control"
  | "materiality_control"
  | "period_close_control"
  | "financial_statement_control"
  | "compliance_control"
  | "sox_control"
  | "internal_control"
  | "exception_control"
  | "variance_control";

export type SyntheticControlStatus = "candidate" | "review_ready" | "approved" | "rejected" | "withdrawn";

export const SYNTHETIC_CONTROL_ACTION_TYPES: SyntheticControlActionType[] = [
  "segregation_of_duties_check",
  "reconciliation_control",
  "journal_entry_control",
  "approval_control",
  "materiality_control",
  "period_close_control",
  "financial_statement_control",
  "compliance_control",
  "sox_control",
  "internal_control",
  "exception_control",
  "variance_control",
];

export const SYNTHETIC_CONTROL_STATUSES: SyntheticControlStatus[] = [
  "candidate",
  "review_ready",
  "approved",
  "rejected",
  "withdrawn",
];

export const SYNTHETIC_CONTROL_REVERSIBILITY_CLASSES: SyntheticActionReversibilityClass[] = [
  "reversible",
  "compensatable",
  "irreversible",
];

export interface BuildFinancialControlActionPackageInput {
  phase37Handoff: SyntheticPhase37ActionHandoffArtifact | null;
  actionCandidates?: SyntheticActionCandidate[];
  workflowCandidates?: SyntheticWorkflowCandidate[];
  approvalGovernancePackages?: SyntheticApprovalGovernance[];
  journalEntryCandidatePackages?: SyntheticJournalEntryCandidatePackage[];
  accountingActionCandidatePackages?: SyntheticAccountingActionCandidatePackage[];
  erpActionCandidatePackages?: SyntheticErpActionCandidatePackage[];
  controlActionType: SyntheticControlActionType;
  controlStatus?: SyntheticControlStatus;
  actionCandidateIds?: string[];
  workflowCandidateIds?: string[];
  approvalGovernanceIds?: string[];
  journalEntryCandidatePackageIds?: string[];
  accountingActionCandidatePackageIds?: string[];
  erpActionCandidatePackageIds?: string[];
  controlPolicyReferenceIds?: string[];
  controlRuleReferenceIds?: string[];
  controlEvidenceReferenceIds?: string[];
  controlTestingReferenceIds?: string[];
  controlDeficiencyReferenceIds?: string[];
  controlRemediationReferenceIds?: string[];
  materialityThresholdReferenceIds?: string[];
  materialityGatePassed?: boolean;
  segregationOfDutiesRequired?: boolean;
  segregationOfDutiesSatisfied?: boolean;
  conflictOfInterestCheckRequired?: boolean;
  conflictOfInterestCheckSatisfied?: boolean;
  approvalQuorumRequired?: boolean;
  approvalQuorumSatisfied?: boolean;
  approvalRequesterReferenceIds?: string[];
  approvalAuthorityReferenceIds?: string[];
  reversibilityClass: SyntheticActionReversibilityClass;
  reversalFinancialControlActionIds?: string[];
  compensationFinancialControlActionIds?: string[];
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

export interface SyntheticFinancialControlActionPackage {
  financialControlActionPackageId: string;
  financialControlActionPackageKey: string;
  controlActionType: SyntheticControlActionType;
  controlStatus: SyntheticControlStatus;
  actionCandidateIds: string[];
  workflowCandidateIds: string[];
  approvalGovernanceIds: string[];
  journalEntryCandidatePackageIds: string[];
  accountingActionCandidatePackageIds: string[];
  erpActionCandidatePackageIds: string[];
  controlPolicyReferenceIds: string[];
  controlRuleReferenceIds: string[];
  controlEvidenceReferenceIds: string[];
  controlTestingReferenceIds: string[];
  controlDeficiencyReferenceIds: string[];
  controlRemediationReferenceIds: string[];
  materialityThresholdReferenceIds: string[];
  materialityGatePassed: boolean;
  segregationOfDutiesRequired: boolean;
  segregationOfDutiesSatisfied: boolean;
  conflictOfInterestCheckRequired: boolean;
  conflictOfInterestCheckSatisfied: boolean;
  approvalQuorumRequired: boolean;
  approvalQuorumSatisfied: boolean;
  reversibilityClass: SyntheticActionReversibilityClass;
  reversalFinancialControlActionIds: string[];
  compensationFinancialControlActionIds: string[];
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

export interface BuildFinancialControlActionPackageResult {
  financialControlActionPackage: SyntheticFinancialControlActionPackage | null;
  skipped: boolean;
  warnings: string[];
}

type ReferenceRecord = Record<string, unknown>;

interface ResolvedControlStatus {
  controlStatus: SyntheticControlStatus;
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

function isSupportedControlActionType(controlActionType: SyntheticControlActionType): boolean {
  return SYNTHETIC_CONTROL_ACTION_TYPES.includes(controlActionType);
}

function isSupportedControlStatus(controlStatus: SyntheticControlStatus): boolean {
  return SYNTHETIC_CONTROL_STATUSES.includes(controlStatus);
}

function isSupportedReversibilityClass(reversibilityClass: SyntheticActionReversibilityClass): boolean {
  return SYNTHETIC_CONTROL_REVERSIBILITY_CLASSES.includes(reversibilityClass);
}

function getPhase37Handoff(input: BuildFinancialControlActionPackageInput): SyntheticPhase37ActionHandoffArtifact | null {
  return input.phase37Handoff;
}

function getActionCandidates(input: BuildFinancialControlActionPackageInput): SyntheticActionCandidate[] {
  return getInputArray(input.actionCandidates);
}

function getWorkflowCandidates(input: BuildFinancialControlActionPackageInput): SyntheticWorkflowCandidate[] {
  return getInputArray(input.workflowCandidates);
}

function getApprovalGovernancePackages(input: BuildFinancialControlActionPackageInput): SyntheticApprovalGovernance[] {
  return getInputArray(input.approvalGovernancePackages);
}

function getJournalEntryCandidatePackages(input: BuildFinancialControlActionPackageInput): SyntheticJournalEntryCandidatePackage[] {
  return getInputArray(input.journalEntryCandidatePackages);
}

function getAccountingActionCandidatePackages(
  input: BuildFinancialControlActionPackageInput,
): SyntheticAccountingActionCandidatePackage[] {
  return getInputArray(input.accountingActionCandidatePackages);
}

function getErpActionCandidatePackages(input: BuildFinancialControlActionPackageInput): SyntheticErpActionCandidatePackage[] {
  return getInputArray(input.erpActionCandidatePackages);
}

function getActionCandidateIds(input: BuildFinancialControlActionPackageInput): string[] {
  return [
    ...getInputArray(input.actionCandidateIds),
    ...getActionCandidates(input).map((actionCandidate) => actionCandidate.actionCandidateId),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.actionCandidateIds),
    ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.actionCandidateIds),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.actionCandidateIds,
    ),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.actionCandidateIds),
  ];
}

function getWorkflowCandidateIds(input: BuildFinancialControlActionPackageInput): string[] {
  return [
    ...getInputArray(input.workflowCandidateIds),
    ...getWorkflowCandidates(input).map((workflowCandidate) => workflowCandidate.workflowCandidateId),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.workflowCandidateIds,
    ),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.workflowCandidateIds),
  ];
}

function getApprovalGovernanceIds(input: BuildFinancialControlActionPackageInput): string[] {
  return [
    ...getInputArray(input.approvalGovernanceIds),
    ...getApprovalGovernancePackages(input).map((approvalGovernance) => approvalGovernance.approvalGovernanceId),
    ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.approvalGovernanceIds),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.approvalGovernanceIds,
    ),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.approvalGovernanceIds),
  ];
}

function getJournalEntryCandidatePackageIds(input: BuildFinancialControlActionPackageInput): string[] {
  return [
    ...getInputArray(input.journalEntryCandidatePackageIds),
    ...getJournalEntryCandidatePackages(input).map(
      (journalEntryCandidatePackage) => journalEntryCandidatePackage.journalEntryCandidatePackageId,
    ),
  ];
}

function getAccountingActionCandidatePackageIds(input: BuildFinancialControlActionPackageInput): string[] {
  return [
    ...getInputArray(input.accountingActionCandidatePackageIds),
    ...getAccountingActionCandidatePackages(input).map(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.accountingActionCandidatePackageId,
    ),
  ];
}

function getErpActionCandidatePackageIds(input: BuildFinancialControlActionPackageInput): string[] {
  return [
    ...getInputArray(input.erpActionCandidatePackageIds),
    ...getErpActionCandidatePackages(input).map((erpActionCandidatePackage) => erpActionCandidatePackage.erpActionCandidatePackageId),
  ];
}

function getApprovalRequesterReferenceIds(input: BuildFinancialControlActionPackageInput): string[] {
  return [
    ...getInputArray(input.approvalRequesterReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) =>
      getStringArrayProperty(approvalGovernance, "approvalRequesterReferenceIds"),
    ),
  ];
}

function getApprovalAuthorityReferenceIds(input: BuildFinancialControlActionPackageInput): string[] {
  return [
    ...getInputArray(input.approvalAuthorityReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.approvalAuthorityReferenceIds),
  ];
}

function hasSelfApproval(input: BuildFinancialControlActionPackageInput): boolean {
  const requesterReferenceIds = getApprovalRequesterReferenceIds(input);
  const authorityReferenceIds = getApprovalAuthorityReferenceIds(input);
  return requesterReferenceIds.some((requesterReferenceId) => authorityReferenceIds.includes(requesterReferenceId));
}

function getBoundPhase37SnapshotHash(input: BuildFinancialControlActionPackageInput): string {
  return input.boundPhase37SnapshotHash ?? getPhase37Handoff(input)?.boundPhase37SnapshotHash ?? "";
}

function getPhase38StaleMarker(input: BuildFinancialControlActionPackageInput): SyntheticPhase38StaleMarker {
  return input.phase38StaleMarker ?? getPhase37Handoff(input)?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildFinancialControlActionPackageInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? "methodology_derived";
}

function getMaterialityGatePassed(input: BuildFinancialControlActionPackageInput): boolean {
  return input.materialityGatePassed === true;
}

function getSegregationOfDutiesRequired(input: BuildFinancialControlActionPackageInput): boolean {
  return input.segregationOfDutiesRequired === true;
}

function getSegregationOfDutiesSatisfied(input: BuildFinancialControlActionPackageInput): boolean {
  return input.segregationOfDutiesSatisfied === true;
}

function getConflictOfInterestCheckRequired(input: BuildFinancialControlActionPackageInput): boolean {
  return input.conflictOfInterestCheckRequired === true;
}

function getConflictOfInterestCheckSatisfied(input: BuildFinancialControlActionPackageInput): boolean {
  return input.conflictOfInterestCheckSatisfied === true;
}

function getApprovalQuorumRequired(input: BuildFinancialControlActionPackageInput): boolean {
  return input.approvalQuorumRequired === true;
}

function getApprovalQuorumSatisfied(input: BuildFinancialControlActionPackageInput): boolean {
  return input.approvalQuorumSatisfied === true;
}

function getControlGovernanceSatisfied(input: BuildFinancialControlActionPackageInput): boolean {
  const materialitySatisfied = getInputArray(input.materialityThresholdReferenceIds).length === 0 || getMaterialityGatePassed(input);
  const segregationSatisfied = !getSegregationOfDutiesRequired(input) || getSegregationOfDutiesSatisfied(input);
  const conflictSatisfied = !getConflictOfInterestCheckRequired(input) || getConflictOfInterestCheckSatisfied(input);
  const quorumSatisfied = !getApprovalQuorumRequired(input) || getApprovalQuorumSatisfied(input);
  return materialitySatisfied && segregationSatisfied && conflictSatisfied && quorumSatisfied && !hasSelfApproval(input);
}

function resolveControlStatus(input: BuildFinancialControlActionPackageInput): ResolvedControlStatus {
  const requestedStatus = input.controlStatus ?? "candidate";
  const warnings: string[] = [];

  if (!isSupportedControlStatus(requestedStatus)) {
    return {
      controlStatus: "candidate",
      warnings: ["controlStatus must be supported; defaulted to candidate."],
    };
  }

  if (requestedStatus === "approved" && !getControlGovernanceSatisfied(input)) {
    warnings.push("controlStatus defaulted to candidate because preserved control governance gates were not satisfied.");
    return {
      controlStatus: "candidate",
      warnings,
    };
  }

  return {
    controlStatus: requestedStatus,
    warnings,
  };
}

function getExecutionReady(input: BuildFinancialControlActionPackageInput): boolean {
  return input.executionReady === true && resolveControlStatus(input).controlStatus === "approved";
}

function getActionConfidenceFloorMetadata(input: BuildFinancialControlActionPackageInput): SyntheticActionConfidenceFloorMetadata[] {
  return [
    ...getInputArray(input.actionConfidenceFloorMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.actionConfidenceFloorMetadata),
    ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.actionConfidenceFloorMetadata),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.actionConfidenceFloorMetadata,
    ),
  ];
}

function getSourceKnowledgeConfidenceReferenceIds(input: BuildFinancialControlActionPackageInput): string[] {
  return [
    ...getInputArray(input.sourceKnowledgeConfidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.sourceKnowledgeConfidenceReferenceIds),
    ...getJournalEntryCandidatePackages(input).flatMap(
      (journalEntryCandidatePackage) => journalEntryCandidatePackage.sourceKnowledgeConfidenceReferenceIds,
    ),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.sourceKnowledgeConfidenceReferenceIds,
    ),
    ...getActionConfidenceFloorMetadata(input).flatMap((metadata) => metadata.sourceKnowledgeConfidenceReferenceIds),
  ];
}

function getSourceMethodologyConfidenceReferenceIds(input: BuildFinancialControlActionPackageInput): string[] {
  return [
    ...getInputArray(input.sourceMethodologyConfidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.sourceMethodologyConfidenceReferenceIds),
    ...getJournalEntryCandidatePackages(input).flatMap(
      (journalEntryCandidatePackage) => journalEntryCandidatePackage.sourceMethodologyConfidenceReferenceIds,
    ),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.sourceMethodologyConfidenceReferenceIds,
    ),
    ...getActionConfidenceFloorMetadata(input).flatMap((metadata) => metadata.sourceMethodologyConfidenceReferenceIds),
  ];
}

function getEvidenceReferenceIds(input: BuildFinancialControlActionPackageInput): string[] {
  return [
    ...getInputArray(input.evidenceReferenceIds),
    ...getInputArray(input.controlEvidenceReferenceIds),
    ...getInputArray(input.controlTestingReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.evidenceReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.evidenceReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.evidenceReferenceIds),
    ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.evidenceReferenceIds),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.evidenceReferenceIds),
    ...getInputArray(getPhase37Handoff(input)?.sourceEvidenceLineageGraphIds),
  ];
}

function getLineageReferenceIds(input: BuildFinancialControlActionPackageInput): string[] {
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
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.lineageReferenceIds),
    ...getInputArray(handoff?.sourceKnowledgeObjectIds),
    ...getInputArray(handoff?.sourceMethodologyObjectIds),
    ...getInputArray(handoff?.sourceMemoryObjectIds),
  ];
}

function getConfidenceFloorMetadata(input: BuildFinancialControlActionPackageInput): SyntheticKnowledgeConfidenceFloorMetadata[] {
  return [
    ...getInputArray(input.confidenceFloorMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.confidenceFloorMetadata),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.confidenceFloorMetadata),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.confidenceFloorMetadata),
    ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.confidenceFloorMetadata),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.confidenceFloorMetadata,
    ),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.confidenceFloorMetadata),
    ...getInputArray(getPhase37Handoff(input)?.confidenceFloorMetadata),
  ];
}

function getSourceConfidenceReferenceIds(input: BuildFinancialControlActionPackageInput): string[] {
  return [
    ...getInputArray(input.sourceConfidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.sourceConfidenceReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.sourceConfidenceReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.sourceConfidenceReferenceIds),
    ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.sourceConfidenceReferenceIds),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.sourceConfidenceReferenceIds,
    ),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.sourceConfidenceReferenceIds),
  ];
}

function getPhase37SupersessionReferenceIds(input: BuildFinancialControlActionPackageInput): string[] {
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
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.phase37SupersessionReferenceIds),
    ...getInputArray(input.phase37SupersessionReferenceIds),
  ];
}

function getPhase37StalenessReasonReferenceIds(input: BuildFinancialControlActionPackageInput): string[] {
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
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.phase37StalenessReasonReferenceIds),
    ...getInputArray(input.phase37StalenessReasonReferenceIds),
  ];
}

function getDerivationLineageIds(input: BuildFinancialControlActionPackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.derivationLineageIds),
    ...getActionCandidateIds(input),
    ...getWorkflowCandidateIds(input),
    ...getApprovalGovernanceIds(input),
    ...getJournalEntryCandidatePackageIds(input),
    ...getAccountingActionCandidatePackageIds(input),
    ...getErpActionCandidatePackageIds(input),
    ...getInputArray(input.controlPolicyReferenceIds),
    ...getInputArray(input.controlRuleReferenceIds),
    ...getInputArray(input.controlEvidenceReferenceIds),
    ...getInputArray(input.controlTestingReferenceIds),
    ...getInputArray(input.controlDeficiencyReferenceIds),
    ...getInputArray(input.controlRemediationReferenceIds),
    ...getInputArray(input.materialityThresholdReferenceIds),
    ...getInputArray(input.riskReferenceIds),
    ...getInputArray(input.riskMetadataReferenceIds),
    ...getInputArray(handoff?.sourceKnowledgeObjectIds),
    ...getInputArray(handoff?.sourceMethodologyObjectIds),
    ...getInputArray(handoff?.sourceMemoryObjectIds),
    ...getInputArray(handoff?.sourceEvidenceLineageGraphIds),
  ];
}

function buildFinancialControlActionPackageKey(input: BuildFinancialControlActionPackageInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    controlActionType: input.controlActionType,
    controlStatus: resolveControlStatus(input).controlStatus,
    actionCandidateIds: getActionCandidateIds(input),
    workflowCandidateIds: getWorkflowCandidateIds(input),
    approvalGovernanceIds: getApprovalGovernanceIds(input),
    journalEntryCandidatePackageIds: getJournalEntryCandidatePackageIds(input),
    accountingActionCandidatePackageIds: getAccountingActionCandidatePackageIds(input),
    erpActionCandidatePackageIds: getErpActionCandidatePackageIds(input),
    controlPolicyReferenceIds: getInputArray(input.controlPolicyReferenceIds),
    controlRuleReferenceIds: getInputArray(input.controlRuleReferenceIds),
    controlEvidenceReferenceIds: getInputArray(input.controlEvidenceReferenceIds),
    controlTestingReferenceIds: getInputArray(input.controlTestingReferenceIds),
    controlDeficiencyReferenceIds: getInputArray(input.controlDeficiencyReferenceIds),
    controlRemediationReferenceIds: getInputArray(input.controlRemediationReferenceIds),
    materialityThresholdReferenceIds: getInputArray(input.materialityThresholdReferenceIds),
    materialityGatePassed: getMaterialityGatePassed(input),
    segregationOfDutiesRequired: getSegregationOfDutiesRequired(input),
    segregationOfDutiesSatisfied: getSegregationOfDutiesSatisfied(input),
    conflictOfInterestCheckRequired: getConflictOfInterestCheckRequired(input),
    conflictOfInterestCheckSatisfied: getConflictOfInterestCheckSatisfied(input),
    approvalQuorumRequired: getApprovalQuorumRequired(input),
    approvalQuorumSatisfied: getApprovalQuorumSatisfied(input),
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

function buildFinancialControlActionPackageId(input: BuildFinancialControlActionPackageInput): string {
  return `synthetic-financial-control-action-package:${stableSnapshotHash({
    financialControlActionPackageKey: buildFinancialControlActionPackageKey(input),
    controlActionType: input.controlActionType,
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
  })}`;
}

function buildDerivationHash(input: BuildFinancialControlActionPackageInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    derivationMethod: getDerivationMethod(input),
    controlActionType: input.controlActionType,
    controlStatus: resolveControlStatus(input).controlStatus,
    knowledgePackageHandle: handoff?.knowledgePackageHandle ?? null,
    methodologyPackageHandle: handoff?.methodologyPackageHandle ?? null,
    derivationLineageIds: getDerivationLineageIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
  });
}

function validateFinancialControlActionPackageInput(input: BuildFinancialControlActionPackageInput): string[] {
  const warnings: string[] = [];
  const handoff = getPhase37Handoff(input);

  if (!handoff) warnings.push("phase37Handoff is required.");
  if (!hasValue(getBoundPhase37SnapshotHash(input))) warnings.push("boundPhase37SnapshotHash is required.");
  if (!hasValue(input.controlActionType)) warnings.push("controlActionType is required.");
  if (!isSupportedControlActionType(input.controlActionType)) warnings.push("controlActionType must be supported.");
  if (!hasValue(input.reversibilityClass)) warnings.push("reversibilityClass is required.");
  if (!isSupportedReversibilityClass(input.reversibilityClass)) warnings.push("reversibilityClass must be supported.");
  if (hasSelfApproval(input)) warnings.push("financial control action cannot self-approve.");
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

export function buildFinancialControlActionPackage(
  input: BuildFinancialControlActionPackageInput,
): BuildFinancialControlActionPackageResult {
  const fatalWarnings = validateFinancialControlActionPackageInput(input);
  const handoff = getPhase37Handoff(input);

  if (fatalWarnings.length > 0 || !handoff) {
    return {
      financialControlActionPackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const statusResolution = resolveControlStatus(input);
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
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage, index) =>
      erpActionCandidatePackage.warnings.map((warning) => `erpActionCandidatePackages[${index}]: ${warning}`),
    ),
  ];

  return {
    financialControlActionPackage: {
      financialControlActionPackageId: buildFinancialControlActionPackageId(input),
      financialControlActionPackageKey: buildFinancialControlActionPackageKey(input),
      controlActionType: input.controlActionType,
      controlStatus: statusResolution.controlStatus,
      actionCandidateIds: getActionCandidateIds(input),
      workflowCandidateIds: getWorkflowCandidateIds(input),
      approvalGovernanceIds: getApprovalGovernanceIds(input),
      journalEntryCandidatePackageIds: getJournalEntryCandidatePackageIds(input),
      accountingActionCandidatePackageIds: getAccountingActionCandidatePackageIds(input),
      erpActionCandidatePackageIds: getErpActionCandidatePackageIds(input),
      controlPolicyReferenceIds: getInputArray(input.controlPolicyReferenceIds),
      controlRuleReferenceIds: getInputArray(input.controlRuleReferenceIds),
      controlEvidenceReferenceIds: getInputArray(input.controlEvidenceReferenceIds),
      controlTestingReferenceIds: getInputArray(input.controlTestingReferenceIds),
      controlDeficiencyReferenceIds: getInputArray(input.controlDeficiencyReferenceIds),
      controlRemediationReferenceIds: getInputArray(input.controlRemediationReferenceIds),
      materialityThresholdReferenceIds: getInputArray(input.materialityThresholdReferenceIds),
      materialityGatePassed: getMaterialityGatePassed(input),
      segregationOfDutiesRequired: getSegregationOfDutiesRequired(input),
      segregationOfDutiesSatisfied: getSegregationOfDutiesSatisfied(input),
      conflictOfInterestCheckRequired: getConflictOfInterestCheckRequired(input),
      conflictOfInterestCheckSatisfied: getConflictOfInterestCheckSatisfied(input),
      approvalQuorumRequired: getApprovalQuorumRequired(input),
      approvalQuorumSatisfied: getApprovalQuorumSatisfied(input),
      reversibilityClass: input.reversibilityClass,
      reversalFinancialControlActionIds: getInputArray(input.reversalFinancialControlActionIds),
      compensationFinancialControlActionIds: getInputArray(input.compensationFinancialControlActionIds),
      rejectionReasonReferenceIds: [
        ...getInputArray(input.rejectionReasonReferenceIds),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.rejectionReasonReferenceIds),
        ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.rejectionReasonReferenceIds),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.rejectionReasonReferenceIds,
        ),
      ],
      withdrawalReasonReferenceIds: [
        ...getInputArray(input.withdrawalReasonReferenceIds),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.withdrawalReasonReferenceIds),
        ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.withdrawalReasonReferenceIds),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.withdrawalReasonReferenceIds,
        ),
      ],
      rejectionAuthorityReferenceIds: [
        ...getInputArray(input.rejectionAuthorityReferenceIds),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.rejectionAuthorityReferenceIds),
        ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.rejectionAuthorityReferenceIds),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.rejectionAuthorityReferenceIds,
        ),
      ],
      withdrawalAuthorityReferenceIds: [
        ...getInputArray(input.withdrawalAuthorityReferenceIds),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.withdrawalAuthorityReferenceIds),
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
        ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.trustMetadata),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.trustMetadata,
        ),
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
        ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.confidenceMetadata),
      ],
      governanceMetadata: [
        ...handoff.governanceMetadata,
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.governanceMetadata),
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.governanceMetadata),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.governanceMetadata,
        ),
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
        ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.materialityMetadata),
      ],
      warnings,
      skippedIndexes: getInputArray(input.skippedIndexes),
    },
    skipped: false,
    warnings,
  };
}
