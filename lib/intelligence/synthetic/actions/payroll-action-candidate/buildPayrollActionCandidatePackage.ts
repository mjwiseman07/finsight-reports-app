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

export type SyntheticPayrollActionType =
  | "payroll_review"
  | "payroll_reconciliation"
  | "payroll_journal_entry"
  | "payroll_tax_review"
  | "payroll_accrual"
  | "pto_accrual"
  | "bonus_accrual"
  | "commission_accrual"
  | "benefit_reconciliation"
  | "garnishment_review"
  | "payroll_variance_review"
  | "payroll_close_support"
  | "payroll_audit_support"
  | "headcount_review"
  | "fte_analysis"
  | "payroll_compliance_review";

export type SyntheticPayrollActionStatus = "candidate" | "review_ready" | "approved" | "rejected" | "withdrawn";

export const SYNTHETIC_PAYROLL_ACTION_TYPES: SyntheticPayrollActionType[] = [
  "payroll_review",
  "payroll_reconciliation",
  "payroll_journal_entry",
  "payroll_tax_review",
  "payroll_accrual",
  "pto_accrual",
  "bonus_accrual",
  "commission_accrual",
  "benefit_reconciliation",
  "garnishment_review",
  "payroll_variance_review",
  "payroll_close_support",
  "payroll_audit_support",
  "headcount_review",
  "fte_analysis",
  "payroll_compliance_review",
];

export const SYNTHETIC_PAYROLL_ACTION_STATUSES: SyntheticPayrollActionStatus[] = [
  "candidate",
  "review_ready",
  "approved",
  "rejected",
  "withdrawn",
];

export const SYNTHETIC_PAYROLL_REVERSIBILITY_CLASSES: SyntheticActionReversibilityClass[] = [
  "reversible",
  "compensatable",
  "irreversible",
];

export interface BuildPayrollActionCandidatePackageInput {
  phase37Handoff: SyntheticPhase37ActionHandoffArtifact | null;
  actionCandidates?: SyntheticActionCandidate[];
  workflowCandidates?: SyntheticWorkflowCandidate[];
  approvalGovernancePackages?: SyntheticApprovalGovernance[];
  journalEntryCandidatePackages?: SyntheticJournalEntryCandidatePackage[];
  accountingActionCandidatePackages?: SyntheticAccountingActionCandidatePackage[];
  financialControlActionPackages?: SyntheticFinancialControlActionPackage[];
  erpActionCandidatePackages?: SyntheticErpActionCandidatePackage[];
  payrollActionType: SyntheticPayrollActionType;
  payrollActionStatus?: SyntheticPayrollActionStatus;
  actionCandidateIds?: string[];
  workflowCandidateIds?: string[];
  approvalGovernanceIds?: string[];
  journalEntryCandidatePackageIds?: string[];
  accountingActionCandidatePackageIds?: string[];
  financialControlActionPackageIds?: string[];
  erpActionCandidatePackageIds?: string[];
  payrollSystemReferenceIds?: string[];
  payrollPeriodReferenceIds?: string[];
  payrollRunReferenceIds?: string[];
  employeeReferenceIds?: string[];
  departmentReferenceIds?: string[];
  payrollTaxReferenceIds?: string[];
  payrollAccrualReferenceIds?: string[];
  benefitReferenceIds?: string[];
  garnishmentReferenceIds?: string[];
  payrollVarianceReferenceIds?: string[];
  payrollReconciliationReferenceIds?: string[];
  payrollAuditReferenceIds?: string[];
  fteReferenceIds?: string[];
  headcountReferenceIds?: string[];
  complianceReferenceIds?: string[];
  materialityThresholdReferenceIds?: string[];
  materialityGatePassed?: boolean;
  approvalQuorumRequired?: boolean;
  approvalQuorumSatisfied?: boolean;
  segregationOfDutiesRequired?: boolean;
  segregationOfDutiesSatisfied?: boolean;
  approvalRequesterReferenceIds?: string[];
  approvalAuthorityReferenceIds?: string[];
  reversibilityClass: SyntheticActionReversibilityClass;
  reversalPayrollActionCandidateIds?: string[];
  compensationPayrollActionCandidateIds?: string[];
  alternativePayrollActionCandidateIds?: string[];
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

export interface SyntheticPayrollActionCandidatePackage {
  payrollActionCandidatePackageId: string;
  payrollActionCandidatePackageKey: string;
  payrollActionType: SyntheticPayrollActionType;
  payrollActionStatus: SyntheticPayrollActionStatus;
  actionCandidateIds: string[];
  workflowCandidateIds: string[];
  approvalGovernanceIds: string[];
  journalEntryCandidatePackageIds: string[];
  accountingActionCandidatePackageIds: string[];
  financialControlActionPackageIds: string[];
  erpActionCandidatePackageIds: string[];
  payrollSystemReferenceIds: string[];
  payrollPeriodReferenceIds: string[];
  payrollRunReferenceIds: string[];
  employeeReferenceIds: string[];
  departmentReferenceIds: string[];
  payrollTaxReferenceIds: string[];
  payrollAccrualReferenceIds: string[];
  benefitReferenceIds: string[];
  garnishmentReferenceIds: string[];
  payrollVarianceReferenceIds: string[];
  payrollReconciliationReferenceIds: string[];
  payrollAuditReferenceIds: string[];
  fteReferenceIds: string[];
  headcountReferenceIds: string[];
  complianceReferenceIds: string[];
  materialityThresholdReferenceIds: string[];
  materialityGatePassed: boolean;
  approvalQuorumRequired: boolean;
  approvalQuorumSatisfied: boolean;
  segregationOfDutiesRequired: boolean;
  segregationOfDutiesSatisfied: boolean;
  reversibilityClass: SyntheticActionReversibilityClass;
  reversalPayrollActionCandidateIds: string[];
  compensationPayrollActionCandidateIds: string[];
  alternativePayrollActionCandidateIds: string[];
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

export interface BuildPayrollActionCandidatePackageResult {
  payrollActionCandidatePackage: SyntheticPayrollActionCandidatePackage | null;
  skipped: boolean;
  warnings: string[];
}

type ReferenceRecord = Record<string, unknown>;

interface ResolvedPayrollActionStatus {
  payrollActionStatus: SyntheticPayrollActionStatus;
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

function isSupportedPayrollActionType(payrollActionType: SyntheticPayrollActionType): boolean {
  return SYNTHETIC_PAYROLL_ACTION_TYPES.includes(payrollActionType);
}

function isSupportedPayrollActionStatus(payrollActionStatus: SyntheticPayrollActionStatus): boolean {
  return SYNTHETIC_PAYROLL_ACTION_STATUSES.includes(payrollActionStatus);
}

function isSupportedReversibilityClass(reversibilityClass: SyntheticActionReversibilityClass): boolean {
  return SYNTHETIC_PAYROLL_REVERSIBILITY_CLASSES.includes(reversibilityClass);
}

function getPhase37Handoff(input: BuildPayrollActionCandidatePackageInput): SyntheticPhase37ActionHandoffArtifact | null {
  return input.phase37Handoff;
}

function getActionCandidates(input: BuildPayrollActionCandidatePackageInput): SyntheticActionCandidate[] {
  return getInputArray(input.actionCandidates);
}

function getWorkflowCandidates(input: BuildPayrollActionCandidatePackageInput): SyntheticWorkflowCandidate[] {
  return getInputArray(input.workflowCandidates);
}

function getApprovalGovernancePackages(input: BuildPayrollActionCandidatePackageInput): SyntheticApprovalGovernance[] {
  return getInputArray(input.approvalGovernancePackages);
}

function getJournalEntryCandidatePackages(input: BuildPayrollActionCandidatePackageInput): SyntheticJournalEntryCandidatePackage[] {
  return getInputArray(input.journalEntryCandidatePackages);
}

function getAccountingActionCandidatePackages(input: BuildPayrollActionCandidatePackageInput): SyntheticAccountingActionCandidatePackage[] {
  return getInputArray(input.accountingActionCandidatePackages);
}

function getFinancialControlActionPackages(input: BuildPayrollActionCandidatePackageInput): SyntheticFinancialControlActionPackage[] {
  return getInputArray(input.financialControlActionPackages);
}

function getErpActionCandidatePackages(input: BuildPayrollActionCandidatePackageInput): SyntheticErpActionCandidatePackage[] {
  return getInputArray(input.erpActionCandidatePackages);
}

function getActionCandidateIds(input: BuildPayrollActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.actionCandidateIds),
    ...getActionCandidates(input).map((actionCandidate) => actionCandidate.actionCandidateId),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.actionCandidateIds),
    ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.actionCandidateIds),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.actionCandidateIds,
    ),
    ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.actionCandidateIds),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.actionCandidateIds),
  ];
}

function getWorkflowCandidateIds(input: BuildPayrollActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.workflowCandidateIds),
    ...getWorkflowCandidates(input).map((workflowCandidate) => workflowCandidate.workflowCandidateId),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.workflowCandidateIds,
    ),
    ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.workflowCandidateIds),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.workflowCandidateIds),
  ];
}

function getApprovalGovernanceIds(input: BuildPayrollActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.approvalGovernanceIds),
    ...getApprovalGovernancePackages(input).map((approvalGovernance) => approvalGovernance.approvalGovernanceId),
    ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.approvalGovernanceIds),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.approvalGovernanceIds,
    ),
    ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.approvalGovernanceIds),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.approvalGovernanceIds),
  ];
}

function getJournalEntryCandidatePackageIds(input: BuildPayrollActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.journalEntryCandidatePackageIds),
    ...getJournalEntryCandidatePackages(input).map(
      (journalEntryCandidatePackage) => journalEntryCandidatePackage.journalEntryCandidatePackageId,
    ),
  ];
}

function getAccountingActionCandidatePackageIds(input: BuildPayrollActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.accountingActionCandidatePackageIds),
    ...getAccountingActionCandidatePackages(input).map(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.accountingActionCandidatePackageId,
    ),
  ];
}

function getFinancialControlActionPackageIds(input: BuildPayrollActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.financialControlActionPackageIds),
    ...getFinancialControlActionPackages(input).map(
      (financialControlActionPackage) => financialControlActionPackage.financialControlActionPackageId,
    ),
  ];
}

function getErpActionCandidatePackageIds(input: BuildPayrollActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.erpActionCandidatePackageIds),
    ...getErpActionCandidatePackages(input).map((erpActionCandidatePackage) => erpActionCandidatePackage.erpActionCandidatePackageId),
  ];
}

function getApprovalRequesterReferenceIds(input: BuildPayrollActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.approvalRequesterReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) =>
      getStringArrayProperty(approvalGovernance, "approvalRequesterReferenceIds"),
    ),
  ];
}

function getApprovalAuthorityReferenceIds(input: BuildPayrollActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.approvalAuthorityReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.approvalAuthorityReferenceIds),
  ];
}

function hasSelfApproval(input: BuildPayrollActionCandidatePackageInput): boolean {
  const requesterReferenceIds = getApprovalRequesterReferenceIds(input);
  const authorityReferenceIds = getApprovalAuthorityReferenceIds(input);
  return requesterReferenceIds.some((requesterReferenceId) => authorityReferenceIds.includes(requesterReferenceId));
}

function getBoundPhase37SnapshotHash(input: BuildPayrollActionCandidatePackageInput): string {
  return input.boundPhase37SnapshotHash ?? getPhase37Handoff(input)?.boundPhase37SnapshotHash ?? "";
}

function getPhase38StaleMarker(input: BuildPayrollActionCandidatePackageInput): SyntheticPhase38StaleMarker {
  return input.phase38StaleMarker ?? getPhase37Handoff(input)?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildPayrollActionCandidatePackageInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? "methodology_derived";
}

function getMaterialityGatePassed(input: BuildPayrollActionCandidatePackageInput): boolean {
  return input.materialityGatePassed === true;
}

function getApprovalQuorumRequired(input: BuildPayrollActionCandidatePackageInput): boolean {
  return input.approvalQuorumRequired === true;
}

function getApprovalQuorumSatisfied(input: BuildPayrollActionCandidatePackageInput): boolean {
  return input.approvalQuorumSatisfied === true;
}

function getSegregationOfDutiesRequired(input: BuildPayrollActionCandidatePackageInput): boolean {
  return input.segregationOfDutiesRequired === true;
}

function getSegregationOfDutiesSatisfied(input: BuildPayrollActionCandidatePackageInput): boolean {
  return input.segregationOfDutiesSatisfied === true;
}

function getPayrollGovernanceSatisfied(input: BuildPayrollActionCandidatePackageInput): boolean {
  const materialitySatisfied = getInputArray(input.materialityThresholdReferenceIds).length === 0 || getMaterialityGatePassed(input);
  const quorumSatisfied = !getApprovalQuorumRequired(input) || getApprovalQuorumSatisfied(input);
  const segregationSatisfied = !getSegregationOfDutiesRequired(input) || getSegregationOfDutiesSatisfied(input);
  return materialitySatisfied && quorumSatisfied && segregationSatisfied && !hasSelfApproval(input);
}

function resolvePayrollActionStatus(input: BuildPayrollActionCandidatePackageInput): ResolvedPayrollActionStatus {
  const requestedStatus = input.payrollActionStatus ?? "candidate";
  const warnings: string[] = [];

  if (!isSupportedPayrollActionStatus(requestedStatus)) {
    return {
      payrollActionStatus: "candidate",
      warnings: ["payrollActionStatus must be supported; defaulted to candidate."],
    };
  }

  if (requestedStatus === "approved" && !getPayrollGovernanceSatisfied(input)) {
    warnings.push("payrollActionStatus defaulted to candidate because preserved payroll governance gates were not satisfied.");
    return {
      payrollActionStatus: "candidate",
      warnings,
    };
  }

  return {
    payrollActionStatus: requestedStatus,
    warnings,
  };
}

function getExecutionReady(input: BuildPayrollActionCandidatePackageInput): boolean {
  return input.executionReady === true && resolvePayrollActionStatus(input).payrollActionStatus === "approved";
}

function getPayrollReferenceIds(input: BuildPayrollActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.payrollSystemReferenceIds),
    ...getInputArray(input.payrollPeriodReferenceIds),
    ...getInputArray(input.payrollRunReferenceIds),
    ...getInputArray(input.employeeReferenceIds),
    ...getInputArray(input.departmentReferenceIds),
    ...getInputArray(input.payrollTaxReferenceIds),
    ...getInputArray(input.payrollAccrualReferenceIds),
    ...getInputArray(input.benefitReferenceIds),
    ...getInputArray(input.garnishmentReferenceIds),
    ...getInputArray(input.payrollVarianceReferenceIds),
    ...getInputArray(input.payrollReconciliationReferenceIds),
    ...getInputArray(input.payrollAuditReferenceIds),
    ...getInputArray(input.fteReferenceIds),
    ...getInputArray(input.headcountReferenceIds),
    ...getInputArray(input.complianceReferenceIds),
  ];
}

function getActionConfidenceFloorMetadata(input: BuildPayrollActionCandidatePackageInput): SyntheticActionConfidenceFloorMetadata[] {
  return [
    ...getInputArray(input.actionConfidenceFloorMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.actionConfidenceFloorMetadata),
    ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.actionConfidenceFloorMetadata),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.actionConfidenceFloorMetadata,
    ),
    ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.actionConfidenceFloorMetadata),
  ];
}

function getSourceKnowledgeConfidenceReferenceIds(input: BuildPayrollActionCandidatePackageInput): string[] {
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
    ...getActionConfidenceFloorMetadata(input).flatMap((metadata) => metadata.sourceKnowledgeConfidenceReferenceIds),
  ];
}

function getSourceMethodologyConfidenceReferenceIds(input: BuildPayrollActionCandidatePackageInput): string[] {
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
    ...getActionConfidenceFloorMetadata(input).flatMap((metadata) => metadata.sourceMethodologyConfidenceReferenceIds),
  ];
}

function getEvidenceReferenceIds(input: BuildPayrollActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.evidenceReferenceIds),
    ...getPayrollReferenceIds(input),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.evidenceReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.evidenceReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.evidenceReferenceIds),
    ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.evidenceReferenceIds),
    ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.evidenceReferenceIds),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.evidenceReferenceIds),
    ...getInputArray(getPhase37Handoff(input)?.sourceEvidenceLineageGraphIds),
  ];
}

function getLineageReferenceIds(input: BuildPayrollActionCandidatePackageInput): string[] {
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
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.lineageReferenceIds),
    ...getInputArray(handoff?.sourceKnowledgeObjectIds),
    ...getInputArray(handoff?.sourceMethodologyObjectIds),
    ...getInputArray(handoff?.sourceMemoryObjectIds),
  ];
}

function getConfidenceFloorMetadata(input: BuildPayrollActionCandidatePackageInput): SyntheticKnowledgeConfidenceFloorMetadata[] {
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
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.confidenceFloorMetadata),
    ...getInputArray(getPhase37Handoff(input)?.confidenceFloorMetadata),
  ];
}

function getSourceConfidenceReferenceIds(input: BuildPayrollActionCandidatePackageInput): string[] {
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
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.sourceConfidenceReferenceIds),
  ];
}

function getPhase37SupersessionReferenceIds(input: BuildPayrollActionCandidatePackageInput): string[] {
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
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.phase37SupersessionReferenceIds),
    ...getInputArray(input.phase37SupersessionReferenceIds),
  ];
}

function getPhase37StalenessReasonReferenceIds(input: BuildPayrollActionCandidatePackageInput): string[] {
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
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.phase37StalenessReasonReferenceIds),
    ...getInputArray(input.phase37StalenessReasonReferenceIds),
  ];
}

function getDerivationLineageIds(input: BuildPayrollActionCandidatePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.derivationLineageIds),
    ...getActionCandidateIds(input),
    ...getWorkflowCandidateIds(input),
    ...getApprovalGovernanceIds(input),
    ...getJournalEntryCandidatePackageIds(input),
    ...getAccountingActionCandidatePackageIds(input),
    ...getFinancialControlActionPackageIds(input),
    ...getErpActionCandidatePackageIds(input),
    ...getPayrollReferenceIds(input),
    ...getInputArray(input.materialityThresholdReferenceIds),
    ...getInputArray(input.riskReferenceIds),
    ...getInputArray(input.riskMetadataReferenceIds),
    ...getInputArray(handoff?.sourceKnowledgeObjectIds),
    ...getInputArray(handoff?.sourceMethodologyObjectIds),
    ...getInputArray(handoff?.sourceMemoryObjectIds),
    ...getInputArray(handoff?.sourceEvidenceLineageGraphIds),
  ];
}

function buildPayrollActionCandidatePackageKey(input: BuildPayrollActionCandidatePackageInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    payrollActionType: input.payrollActionType,
    payrollActionStatus: resolvePayrollActionStatus(input).payrollActionStatus,
    actionCandidateIds: getActionCandidateIds(input),
    workflowCandidateIds: getWorkflowCandidateIds(input),
    approvalGovernanceIds: getApprovalGovernanceIds(input),
    journalEntryCandidatePackageIds: getJournalEntryCandidatePackageIds(input),
    accountingActionCandidatePackageIds: getAccountingActionCandidatePackageIds(input),
    financialControlActionPackageIds: getFinancialControlActionPackageIds(input),
    erpActionCandidatePackageIds: getErpActionCandidatePackageIds(input),
    payrollSystemReferenceIds: getInputArray(input.payrollSystemReferenceIds),
    payrollPeriodReferenceIds: getInputArray(input.payrollPeriodReferenceIds),
    payrollRunReferenceIds: getInputArray(input.payrollRunReferenceIds),
    employeeReferenceIds: getInputArray(input.employeeReferenceIds),
    departmentReferenceIds: getInputArray(input.departmentReferenceIds),
    payrollTaxReferenceIds: getInputArray(input.payrollTaxReferenceIds),
    payrollAccrualReferenceIds: getInputArray(input.payrollAccrualReferenceIds),
    benefitReferenceIds: getInputArray(input.benefitReferenceIds),
    garnishmentReferenceIds: getInputArray(input.garnishmentReferenceIds),
    payrollVarianceReferenceIds: getInputArray(input.payrollVarianceReferenceIds),
    payrollReconciliationReferenceIds: getInputArray(input.payrollReconciliationReferenceIds),
    payrollAuditReferenceIds: getInputArray(input.payrollAuditReferenceIds),
    fteReferenceIds: getInputArray(input.fteReferenceIds),
    headcountReferenceIds: getInputArray(input.headcountReferenceIds),
    complianceReferenceIds: getInputArray(input.complianceReferenceIds),
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

function buildPayrollActionCandidatePackageId(input: BuildPayrollActionCandidatePackageInput): string {
  return `synthetic-payroll-action-candidate-package:${stableSnapshotHash({
    payrollActionCandidatePackageKey: buildPayrollActionCandidatePackageKey(input),
    payrollActionType: input.payrollActionType,
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
  })}`;
}

function buildDerivationHash(input: BuildPayrollActionCandidatePackageInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    derivationMethod: getDerivationMethod(input),
    payrollActionType: input.payrollActionType,
    payrollActionStatus: resolvePayrollActionStatus(input).payrollActionStatus,
    knowledgePackageHandle: handoff?.knowledgePackageHandle ?? null,
    methodologyPackageHandle: handoff?.methodologyPackageHandle ?? null,
    derivationLineageIds: getDerivationLineageIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
  });
}

function validatePayrollActionCandidatePackageInput(input: BuildPayrollActionCandidatePackageInput): string[] {
  const warnings: string[] = [];
  const handoff = getPhase37Handoff(input);

  if (!handoff) warnings.push("phase37Handoff is required.");
  if (!hasValue(getBoundPhase37SnapshotHash(input))) warnings.push("boundPhase37SnapshotHash is required.");
  if (!hasValue(input.payrollActionType)) warnings.push("payrollActionType is required.");
  if (!isSupportedPayrollActionType(input.payrollActionType)) warnings.push("payrollActionType must be supported.");
  if (!hasValue(input.reversibilityClass)) warnings.push("reversibilityClass is required.");
  if (!isSupportedReversibilityClass(input.reversibilityClass)) warnings.push("reversibilityClass must be supported.");
  if (hasSelfApproval(input)) warnings.push("payroll action candidate cannot self-approve.");
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

export function buildPayrollActionCandidatePackage(
  input: BuildPayrollActionCandidatePackageInput,
): BuildPayrollActionCandidatePackageResult {
  const fatalWarnings = validatePayrollActionCandidatePackageInput(input);
  const handoff = getPhase37Handoff(input);

  if (fatalWarnings.length > 0 || !handoff) {
    return {
      payrollActionCandidatePackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const statusResolution = resolvePayrollActionStatus(input);
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
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage, index) =>
      erpActionCandidatePackage.warnings.map((warning) => `erpActionCandidatePackages[${index}]: ${warning}`),
    ),
  ];

  return {
    payrollActionCandidatePackage: {
      payrollActionCandidatePackageId: buildPayrollActionCandidatePackageId(input),
      payrollActionCandidatePackageKey: buildPayrollActionCandidatePackageKey(input),
      payrollActionType: input.payrollActionType,
      payrollActionStatus: statusResolution.payrollActionStatus,
      actionCandidateIds: getActionCandidateIds(input),
      workflowCandidateIds: getWorkflowCandidateIds(input),
      approvalGovernanceIds: getApprovalGovernanceIds(input),
      journalEntryCandidatePackageIds: getJournalEntryCandidatePackageIds(input),
      accountingActionCandidatePackageIds: getAccountingActionCandidatePackageIds(input),
      financialControlActionPackageIds: getFinancialControlActionPackageIds(input),
      erpActionCandidatePackageIds: getErpActionCandidatePackageIds(input),
      payrollSystemReferenceIds: getInputArray(input.payrollSystemReferenceIds),
      payrollPeriodReferenceIds: getInputArray(input.payrollPeriodReferenceIds),
      payrollRunReferenceIds: getInputArray(input.payrollRunReferenceIds),
      employeeReferenceIds: getInputArray(input.employeeReferenceIds),
      departmentReferenceIds: getInputArray(input.departmentReferenceIds),
      payrollTaxReferenceIds: getInputArray(input.payrollTaxReferenceIds),
      payrollAccrualReferenceIds: getInputArray(input.payrollAccrualReferenceIds),
      benefitReferenceIds: getInputArray(input.benefitReferenceIds),
      garnishmentReferenceIds: getInputArray(input.garnishmentReferenceIds),
      payrollVarianceReferenceIds: getInputArray(input.payrollVarianceReferenceIds),
      payrollReconciliationReferenceIds: getInputArray(input.payrollReconciliationReferenceIds),
      payrollAuditReferenceIds: getInputArray(input.payrollAuditReferenceIds),
      fteReferenceIds: getInputArray(input.fteReferenceIds),
      headcountReferenceIds: getInputArray(input.headcountReferenceIds),
      complianceReferenceIds: getInputArray(input.complianceReferenceIds),
      materialityThresholdReferenceIds: getInputArray(input.materialityThresholdReferenceIds),
      materialityGatePassed: getMaterialityGatePassed(input),
      approvalQuorumRequired: getApprovalQuorumRequired(input),
      approvalQuorumSatisfied: getApprovalQuorumSatisfied(input),
      segregationOfDutiesRequired: getSegregationOfDutiesRequired(input),
      segregationOfDutiesSatisfied: getSegregationOfDutiesSatisfied(input),
      reversibilityClass: input.reversibilityClass,
      reversalPayrollActionCandidateIds: getInputArray(input.reversalPayrollActionCandidateIds),
      compensationPayrollActionCandidateIds: getInputArray(input.compensationPayrollActionCandidateIds),
      alternativePayrollActionCandidateIds: getInputArray(input.alternativePayrollActionCandidateIds),
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
        ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.materialityMetadata),
      ],
      warnings,
      skippedIndexes: getInputArray(input.skippedIndexes),
    },
    skipped: false,
    warnings,
  };
}
