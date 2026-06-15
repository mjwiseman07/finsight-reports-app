import { stableSnapshotHash } from "../../../core/hash";
import type { SyntheticActionDerivationMethod, SyntheticPhase38StaleMarker } from "../contracts";
import type { SyntheticActionCandidate, SyntheticPhase37ActionHandoffArtifact } from "../action-candidate";
import type { SyntheticWorkflowCandidate } from "../workflow-candidate";
import type { SyntheticApprovalGovernance } from "../approval-package";
import type { SyntheticAutomationGovernancePackage } from "../automation-governance-package";
import type { SyntheticActionLineagePackage } from "../action-lineage-package";
import type { SyntheticJournalEntryCandidatePackage } from "../journal-entry-candidate";
import type { SyntheticAccountingActionCandidatePackage } from "../accounting-action-candidate";
import type { SyntheticErpActionCandidatePackage } from "../erp-action-candidate";
import type { SyntheticFinancialControlActionPackage } from "../financial-control-action";
import type { SyntheticAuditActionCandidatePackage } from "../audit-action-candidate";
import type { SyntheticControllerActionCandidatePackage } from "../controller-action-candidate";
import type { SyntheticRevenueCycleActionCandidatePackage } from "../revenue-cycle-action-candidate";
import type { SyntheticHealthcarePpdActionCandidatePackage } from "../healthcare-ppd-action-candidate";
import type { SyntheticPayrollActionCandidatePackage } from "../payroll-action-candidate";
import type {
  SyntheticAuditConfidenceMetadata,
  SyntheticAuditGovernanceMetadata,
  SyntheticAuditMaterialityCompatibility,
  SyntheticAuditScope,
  SyntheticAuditTrustMetadata,
} from "../../audit/types";
import type { SyntheticMemoryObjectIsolationDimension } from "../../organizational-memory/memory-object";
import type { SyntheticKnowledgeConfidenceFloorMetadata } from "../../knowledge/contracts";

export interface BuildActionControlPackageInput {
  phase37Handoff: SyntheticPhase37ActionHandoffArtifact | null;
  actionCandidates?: SyntheticActionCandidate[];
  workflowCandidates?: SyntheticWorkflowCandidate[];
  approvalGovernancePackages?: SyntheticApprovalGovernance[];
  automationGovernancePackages?: SyntheticAutomationGovernancePackage[];
  actionLineagePackages?: SyntheticActionLineagePackage[];
  journalEntryCandidatePackages?: SyntheticJournalEntryCandidatePackage[];
  accountingActionCandidatePackages?: SyntheticAccountingActionCandidatePackage[];
  erpActionCandidatePackages?: SyntheticErpActionCandidatePackage[];
  financialControlActionPackages?: SyntheticFinancialControlActionPackage[];
  auditActionCandidatePackages?: SyntheticAuditActionCandidatePackage[];
  controllerActionCandidatePackages?: SyntheticControllerActionCandidatePackage[];
  revenueCycleActionCandidatePackages?: SyntheticRevenueCycleActionCandidatePackage[];
  healthcarePpdActionCandidatePackages?: SyntheticHealthcarePpdActionCandidatePackage[];
  payrollActionCandidatePackages?: SyntheticPayrollActionCandidatePackage[];
  actionCandidateIds?: string[];
  workflowCandidateIds?: string[];
  approvalGovernanceIds?: string[];
  automationGovernancePackageIds?: string[];
  actionLineagePackageIds?: string[];
  journalEntryCandidatePackageIds?: string[];
  accountingActionCandidatePackageIds?: string[];
  erpActionCandidatePackageIds?: string[];
  financialControlActionPackageIds?: string[];
  auditActionCandidatePackageIds?: string[];
  controllerActionCandidatePackageIds?: string[];
  revenueCycleActionCandidatePackageIds?: string[];
  healthcarePpdActionCandidatePackageIds?: string[];
  payrollActionCandidatePackageIds?: string[];
  controlPolicyReferenceIds?: string[];
  controlRuleReferenceIds?: string[];
  controlScopeReferenceIds?: string[];
  controlRestrictionReferenceIds?: string[];
  controlEscalationReferenceIds?: string[];
  controlAuditReferenceIds?: string[];
  controlValidationReferenceIds?: string[];
  segregationOfDutiesRequired?: boolean;
  segregationOfDutiesSatisfied?: boolean;
  conflictOfInterestCheckRequired?: boolean;
  conflictOfInterestCheckSatisfied?: boolean;
  approvalQuorumRequired?: boolean;
  approvalQuorumSatisfied?: boolean;
  materialityThresholdReferenceIds?: string[];
  materialityGatePassed?: boolean;
  controlGatesPassed?: boolean;
  approvalGatePassed?: boolean;
  lineageGatePassed?: boolean;
  governanceGatePassed?: boolean;
  executionReadinessGatePassed?: boolean;
  approvalRequesterReferenceIds?: string[];
  approvalAuthorityReferenceIds?: string[];
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

export interface SyntheticActionControlPackage {
  actionControlPackageId: string;
  actionControlPackageKey: string;
  actionCandidateIds: string[];
  workflowCandidateIds: string[];
  approvalGovernanceIds: string[];
  automationGovernancePackageIds: string[];
  actionLineagePackageIds: string[];
  journalEntryCandidatePackageIds: string[];
  accountingActionCandidatePackageIds: string[];
  erpActionCandidatePackageIds: string[];
  financialControlActionPackageIds: string[];
  auditActionCandidatePackageIds: string[];
  controllerActionCandidatePackageIds: string[];
  revenueCycleActionCandidatePackageIds: string[];
  healthcarePpdActionCandidatePackageIds: string[];
  payrollActionCandidatePackageIds: string[];
  controlPolicyReferenceIds: string[];
  controlRuleReferenceIds: string[];
  controlScopeReferenceIds: string[];
  controlRestrictionReferenceIds: string[];
  controlEscalationReferenceIds: string[];
  controlAuditReferenceIds: string[];
  controlValidationReferenceIds: string[];
  segregationOfDutiesRequired: boolean;
  segregationOfDutiesSatisfied: boolean;
  conflictOfInterestCheckRequired: boolean;
  conflictOfInterestCheckSatisfied: boolean;
  approvalQuorumRequired: boolean;
  approvalQuorumSatisfied: boolean;
  materialityThresholdReferenceIds: string[];
  materialityGatePassed: boolean;
  controlGatesPassed: boolean;
  approvalGatePassed: boolean;
  lineageGatePassed: boolean;
  governanceGatePassed: boolean;
  executionReadinessGatePassed: boolean;
  allControlGatesPassed: boolean;
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

export interface BuildActionControlPackageResult {
  actionControlPackage: SyntheticActionControlPackage | null;
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

function getPhase37Handoff(input: BuildActionControlPackageInput): SyntheticPhase37ActionHandoffArtifact | null {
  return input.phase37Handoff;
}

function getActionCandidates(input: BuildActionControlPackageInput): SyntheticActionCandidate[] {
  return getInputArray(input.actionCandidates);
}

function getWorkflowCandidates(input: BuildActionControlPackageInput): SyntheticWorkflowCandidate[] {
  return getInputArray(input.workflowCandidates);
}

function getApprovalGovernancePackages(input: BuildActionControlPackageInput): SyntheticApprovalGovernance[] {
  return getInputArray(input.approvalGovernancePackages);
}

function getAutomationGovernancePackages(input: BuildActionControlPackageInput): SyntheticAutomationGovernancePackage[] {
  return getInputArray(input.automationGovernancePackages);
}

function getActionLineagePackages(input: BuildActionControlPackageInput): SyntheticActionLineagePackage[] {
  return getInputArray(input.actionLineagePackages);
}

function getJournalEntryCandidatePackages(input: BuildActionControlPackageInput): SyntheticJournalEntryCandidatePackage[] {
  return getInputArray(input.journalEntryCandidatePackages);
}

function getAccountingActionCandidatePackages(input: BuildActionControlPackageInput): SyntheticAccountingActionCandidatePackage[] {
  return getInputArray(input.accountingActionCandidatePackages);
}

function getErpActionCandidatePackages(input: BuildActionControlPackageInput): SyntheticErpActionCandidatePackage[] {
  return getInputArray(input.erpActionCandidatePackages);
}

function getFinancialControlActionPackages(input: BuildActionControlPackageInput): SyntheticFinancialControlActionPackage[] {
  return getInputArray(input.financialControlActionPackages);
}

function getAuditActionCandidatePackages(input: BuildActionControlPackageInput): SyntheticAuditActionCandidatePackage[] {
  return getInputArray(input.auditActionCandidatePackages);
}

function getControllerActionCandidatePackages(input: BuildActionControlPackageInput): SyntheticControllerActionCandidatePackage[] {
  return getInputArray(input.controllerActionCandidatePackages);
}

function getRevenueCycleActionCandidatePackages(input: BuildActionControlPackageInput): SyntheticRevenueCycleActionCandidatePackage[] {
  return getInputArray(input.revenueCycleActionCandidatePackages);
}

function getHealthcarePpdActionCandidatePackages(input: BuildActionControlPackageInput): SyntheticHealthcarePpdActionCandidatePackage[] {
  return getInputArray(input.healthcarePpdActionCandidatePackages);
}

function getPayrollActionCandidatePackages(input: BuildActionControlPackageInput): SyntheticPayrollActionCandidatePackage[] {
  return getInputArray(input.payrollActionCandidatePackages);
}

function getDomainPackages(input: BuildActionControlPackageInput): object[] {
  return [
    ...getJournalEntryCandidatePackages(input),
    ...getAccountingActionCandidatePackages(input),
    ...getErpActionCandidatePackages(input),
    ...getFinancialControlActionPackages(input),
    ...getAuditActionCandidatePackages(input),
    ...getControllerActionCandidatePackages(input),
    ...getRevenueCycleActionCandidatePackages(input),
    ...getHealthcarePpdActionCandidatePackages(input),
    ...getPayrollActionCandidatePackages(input),
  ];
}

function getActionCandidateIds(input: BuildActionControlPackageInput): string[] {
  return [
    ...getInputArray(input.actionCandidateIds),
    ...getActionCandidates(input).map((actionCandidate) => actionCandidate.actionCandidateId),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.actionCandidateIds),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.actionCandidateIds),
    ...getActionLineagePackages(input).flatMap((actionLineagePackage) => actionLineagePackage.actionCandidateIds),
    ...getDomainPackages(input).flatMap((domainPackage) => getStringArrayProperty(domainPackage, "actionCandidateIds")),
  ];
}

function getWorkflowCandidateIds(input: BuildActionControlPackageInput): string[] {
  return [
    ...getInputArray(input.workflowCandidateIds),
    ...getWorkflowCandidates(input).map((workflowCandidate) => workflowCandidate.workflowCandidateId),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.workflowCandidateIds),
    ...getActionLineagePackages(input).flatMap((actionLineagePackage) => actionLineagePackage.workflowCandidateIds),
    ...getDomainPackages(input).flatMap((domainPackage) => getStringArrayProperty(domainPackage, "workflowCandidateIds")),
  ];
}

function getApprovalGovernanceIds(input: BuildActionControlPackageInput): string[] {
  return [
    ...getInputArray(input.approvalGovernanceIds),
    ...getApprovalGovernancePackages(input).map((approvalGovernance) => approvalGovernance.approvalGovernanceId),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.approvalGovernanceIds),
    ...getDomainPackages(input).flatMap((domainPackage) => getStringArrayProperty(domainPackage, "approvalGovernanceIds")),
  ];
}

function getAutomationGovernancePackageIds(input: BuildActionControlPackageInput): string[] {
  return [
    ...getInputArray(input.automationGovernancePackageIds),
    ...getAutomationGovernancePackages(input).map((automationGovernancePackage) => automationGovernancePackage.automationGovernancePackageId),
  ];
}

function getActionLineagePackageIds(input: BuildActionControlPackageInput): string[] {
  return [
    ...getInputArray(input.actionLineagePackageIds),
    ...getActionLineagePackages(input).map((actionLineagePackage) => actionLineagePackage.actionLineagePackageId),
  ];
}

function getPackageIds(
  input: BuildActionControlPackageInput,
  inputIds: string[] | undefined,
  packageObjects: object[],
  singularObjectIdName: string,
  objectIdName: string,
): string[] {
  return [
    ...getInputArray(inputIds),
    ...packageObjects
      .map((packageObject) => (packageObject as ReferenceRecord)[singularObjectIdName])
      .filter((packageId): packageId is string => typeof packageId === "string"),
    ...getActionLineagePackages(input).flatMap((actionLineagePackage) => getStringArrayProperty(actionLineagePackage, objectIdName)),
    ...getDomainPackages(input).flatMap((domainPackage) => getStringArrayProperty(domainPackage, objectIdName)),
  ];
}

function getJournalEntryCandidatePackageIds(input: BuildActionControlPackageInput): string[] {
  return getPackageIds(
    input,
    input.journalEntryCandidatePackageIds,
    getJournalEntryCandidatePackages(input),
    "journalEntryCandidatePackageId",
    "journalEntryCandidatePackageIds",
  );
}

function getAccountingActionCandidatePackageIds(input: BuildActionControlPackageInput): string[] {
  return getPackageIds(
    input,
    input.accountingActionCandidatePackageIds,
    getAccountingActionCandidatePackages(input),
    "accountingActionCandidatePackageId",
    "accountingActionCandidatePackageIds",
  );
}

function getErpActionCandidatePackageIds(input: BuildActionControlPackageInput): string[] {
  return getPackageIds(
    input,
    input.erpActionCandidatePackageIds,
    getErpActionCandidatePackages(input),
    "erpActionCandidatePackageId",
    "erpActionCandidatePackageIds",
  );
}

function getFinancialControlActionPackageIds(input: BuildActionControlPackageInput): string[] {
  return getPackageIds(
    input,
    input.financialControlActionPackageIds,
    getFinancialControlActionPackages(input),
    "financialControlActionPackageId",
    "financialControlActionPackageIds",
  );
}

function getAuditActionCandidatePackageIds(input: BuildActionControlPackageInput): string[] {
  return getPackageIds(
    input,
    input.auditActionCandidatePackageIds,
    getAuditActionCandidatePackages(input),
    "auditActionCandidatePackageId",
    "auditActionCandidatePackageIds",
  );
}

function getControllerActionCandidatePackageIds(input: BuildActionControlPackageInput): string[] {
  return getPackageIds(
    input,
    input.controllerActionCandidatePackageIds,
    getControllerActionCandidatePackages(input),
    "controllerActionCandidatePackageId",
    "controllerActionCandidatePackageIds",
  );
}

function getRevenueCycleActionCandidatePackageIds(input: BuildActionControlPackageInput): string[] {
  return getPackageIds(
    input,
    input.revenueCycleActionCandidatePackageIds,
    getRevenueCycleActionCandidatePackages(input),
    "revenueCycleActionCandidatePackageId",
    "revenueCycleActionCandidatePackageIds",
  );
}

function getHealthcarePpdActionCandidatePackageIds(input: BuildActionControlPackageInput): string[] {
  return getPackageIds(
    input,
    input.healthcarePpdActionCandidatePackageIds,
    getHealthcarePpdActionCandidatePackages(input),
    "healthcarePpdActionCandidatePackageId",
    "healthcarePpdActionCandidatePackageIds",
  );
}

function getPayrollActionCandidatePackageIds(input: BuildActionControlPackageInput): string[] {
  return getPackageIds(
    input,
    input.payrollActionCandidatePackageIds,
    getPayrollActionCandidatePackages(input),
    "payrollActionCandidatePackageId",
    "payrollActionCandidatePackageIds",
  );
}

function getApprovalRequesterReferenceIds(input: BuildActionControlPackageInput): string[] {
  return [
    ...getInputArray(input.approvalRequesterReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => getStringArrayProperty(approvalGovernance, "approvalRequesterReferenceIds")),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) =>
      getStringArrayProperty(automationGovernancePackage, "governanceRequesterReferenceIds"),
    ),
  ];
}

function getApprovalAuthorityReferenceIds(input: BuildActionControlPackageInput): string[] {
  return [
    ...getInputArray(input.approvalAuthorityReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.approvalAuthorityReferenceIds),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) =>
      getStringArrayProperty(automationGovernancePackage, "governanceAuthorityReferenceIds"),
    ),
  ];
}

function hasSelfApproval(input: BuildActionControlPackageInput): boolean {
  const requesterReferenceIds = getApprovalRequesterReferenceIds(input);
  const authorityReferenceIds = getApprovalAuthorityReferenceIds(input);
  return requesterReferenceIds.some((requesterReferenceId) => authorityReferenceIds.includes(requesterReferenceId));
}

function getBoundPhase37SnapshotHash(input: BuildActionControlPackageInput): string {
  return input.boundPhase37SnapshotHash ?? getPhase37Handoff(input)?.boundPhase37SnapshotHash ?? "";
}

function getPhase38StaleMarker(input: BuildActionControlPackageInput): SyntheticPhase38StaleMarker {
  return input.phase38StaleMarker ?? getPhase37Handoff(input)?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildActionControlPackageInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? "methodology_derived";
}

function getSegregationOfDutiesRequired(input: BuildActionControlPackageInput): boolean {
  return input.segregationOfDutiesRequired === true;
}

function getSegregationOfDutiesSatisfied(input: BuildActionControlPackageInput): boolean {
  return input.segregationOfDutiesSatisfied === true;
}

function getConflictOfInterestCheckRequired(input: BuildActionControlPackageInput): boolean {
  return input.conflictOfInterestCheckRequired === true;
}

function getConflictOfInterestCheckSatisfied(input: BuildActionControlPackageInput): boolean {
  return input.conflictOfInterestCheckSatisfied === true;
}

function getApprovalQuorumRequired(input: BuildActionControlPackageInput): boolean {
  return input.approvalQuorumRequired === true;
}

function getApprovalQuorumSatisfied(input: BuildActionControlPackageInput): boolean {
  return input.approvalQuorumSatisfied === true;
}

function getMaterialityGatePassed(input: BuildActionControlPackageInput): boolean {
  return input.materialityGatePassed === true;
}

function getControlGatesPassed(input: BuildActionControlPackageInput): boolean {
  const segregationGatePassed = !getSegregationOfDutiesRequired(input) || getSegregationOfDutiesSatisfied(input);
  const conflictGatePassed = !getConflictOfInterestCheckRequired(input) || getConflictOfInterestCheckSatisfied(input);
  return input.controlGatesPassed === true && segregationGatePassed && conflictGatePassed && !hasSelfApproval(input);
}

function getApprovalGatePassed(input: BuildActionControlPackageInput): boolean {
  const quorumGatePassed = !getApprovalQuorumRequired(input) || getApprovalQuorumSatisfied(input);
  return input.approvalGatePassed === true && quorumGatePassed && !hasSelfApproval(input);
}

function getLineageGatePassed(input: BuildActionControlPackageInput): boolean {
  return input.lineageGatePassed === true && getActionLineagePackages(input).every((actionLineagePackage) => actionLineagePackage.lineageCompleteness === "complete");
}

function getGovernanceGatePassed(input: BuildActionControlPackageInput): boolean {
  const automationGovernancePassed = getAutomationGovernancePackages(input).every((automationGovernancePackage) => automationGovernancePackage.executionReady === true);
  return input.governanceGatePassed === true && automationGovernancePassed && !hasSelfApproval(input);
}

function getExecutionReadinessGatePassed(input: BuildActionControlPackageInput): boolean {
  return input.executionReadinessGatePassed === true;
}

function getAllControlGatesPassed(input: BuildActionControlPackageInput): boolean {
  return (
    getControlGatesPassed(input) &&
    getApprovalGatePassed(input) &&
    getLineageGatePassed(input) &&
    getGovernanceGatePassed(input) &&
    getExecutionReadinessGatePassed(input) &&
    getMaterialityGatePassed(input)
  );
}

function getExecutionReady(input: BuildActionControlPackageInput): boolean {
  return input.executionReady === true && getAllControlGatesPassed(input);
}

function getPhase37SupersessionReferenceIds(input: BuildActionControlPackageInput): string[] {
  return [
    ...getInputArray(getPhase37Handoff(input)?.phase37SupersessionReferenceIds),
    ...getInputArray(input.phase37SupersessionReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.phase37SupersessionReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.phase37SupersessionReferenceIds),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.phase37SupersessionReferenceIds),
    ...getActionLineagePackages(input).flatMap((actionLineagePackage) => actionLineagePackage.phase37SupersessionReferenceIds),
    ...getDomainPackages(input).flatMap((domainPackage) => getStringArrayProperty(domainPackage, "phase37SupersessionReferenceIds")),
  ];
}

function getPhase37StalenessReasonReferenceIds(input: BuildActionControlPackageInput): string[] {
  return [
    ...getInputArray(getPhase37Handoff(input)?.phase37StalenessReasonReferenceIds),
    ...getInputArray(input.phase37StalenessReasonReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.phase37StalenessReasonReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.phase37StalenessReasonReferenceIds),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.phase37StalenessReasonReferenceIds),
    ...getActionLineagePackages(input).flatMap((actionLineagePackage) => actionLineagePackage.phase37StalenessReasonReferenceIds),
    ...getDomainPackages(input).flatMap((domainPackage) => getStringArrayProperty(domainPackage, "phase37StalenessReasonReferenceIds")),
  ];
}

function getDerivationLineageIds(input: BuildActionControlPackageInput): string[] {
  return [
    ...getInputArray(input.derivationLineageIds),
    ...getActionCandidateIds(input),
    ...getWorkflowCandidateIds(input),
    ...getApprovalGovernanceIds(input),
    ...getAutomationGovernancePackageIds(input),
    ...getActionLineagePackageIds(input),
    ...getJournalEntryCandidatePackageIds(input),
    ...getAccountingActionCandidatePackageIds(input),
    ...getErpActionCandidatePackageIds(input),
    ...getFinancialControlActionPackageIds(input),
    ...getAuditActionCandidatePackageIds(input),
    ...getControllerActionCandidatePackageIds(input),
    ...getRevenueCycleActionCandidatePackageIds(input),
    ...getHealthcarePpdActionCandidatePackageIds(input),
    ...getPayrollActionCandidatePackageIds(input),
    ...getInputArray(input.controlPolicyReferenceIds),
    ...getInputArray(input.controlRuleReferenceIds),
    ...getInputArray(input.controlScopeReferenceIds),
    ...getInputArray(input.controlRestrictionReferenceIds),
    ...getInputArray(input.controlEscalationReferenceIds),
    ...getInputArray(input.controlAuditReferenceIds),
    ...getInputArray(input.controlValidationReferenceIds),
    ...getInputArray(input.materialityThresholdReferenceIds),
  ];
}

function getConfidenceFloorMetadata(input: BuildActionControlPackageInput): SyntheticKnowledgeConfidenceFloorMetadata[] {
  return [
    ...getInputArray(input.confidenceFloorMetadata),
    ...getInputArray(getPhase37Handoff(input)?.confidenceFloorMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.confidenceFloorMetadata),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.confidenceFloorMetadata),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.confidenceFloorMetadata),
    ...getActionLineagePackages(input).flatMap((actionLineagePackage) => actionLineagePackage.confidenceFloorMetadata),
    ...getDomainPackages(input).flatMap((domainPackage) => {
      const metadata = (domainPackage as ReferenceRecord).confidenceFloorMetadata;
      return Array.isArray(metadata) ? (metadata as SyntheticKnowledgeConfidenceFloorMetadata[]) : [];
    }),
  ];
}

function getSourceConfidenceReferenceIds(input: BuildActionControlPackageInput): string[] {
  return [
    ...getInputArray(input.sourceConfidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.sourceConfidenceReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.sourceConfidenceReferenceIds),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.sourceConfidenceReferenceIds),
    ...getActionLineagePackages(input).flatMap((actionLineagePackage) => actionLineagePackage.sourceConfidenceReferenceIds),
    ...getDomainPackages(input).flatMap((domainPackage) => getStringArrayProperty(domainPackage, "sourceConfidenceReferenceIds")),
    ...getConfidenceFloorMetadata(input).flatMap((metadata) => metadata.sourceConfidenceReferenceIds),
  ];
}

function getEvidenceReferenceIds(input: BuildActionControlPackageInput): string[] {
  return [
    ...getInputArray(input.evidenceReferenceIds),
    ...getInputArray(input.controlAuditReferenceIds),
    ...getInputArray(input.controlValidationReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.evidenceReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.evidenceReferenceIds),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.evidenceReferenceIds),
    ...getActionLineagePackages(input).flatMap((actionLineagePackage) => actionLineagePackage.evidenceReferenceIds),
    ...getDomainPackages(input).flatMap((domainPackage) => getStringArrayProperty(domainPackage, "evidenceReferenceIds")),
  ];
}

function getLineageReferenceIds(input: BuildActionControlPackageInput): string[] {
  return [
    ...getInputArray(input.lineageReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.lineageReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.lineageReferenceIds),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.lineageReferenceIds),
    ...getActionLineagePackages(input).flatMap((actionLineagePackage) => actionLineagePackage.lineageReferenceIds),
    ...getDomainPackages(input).flatMap((domainPackage) => getStringArrayProperty(domainPackage, "lineageReferenceIds")),
  ];
}

function getTrustMetadata(input: BuildActionControlPackageInput): SyntheticAuditTrustMetadata[] {
  return [
    ...getInputArray(getPhase37Handoff(input)?.trustMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.trustMetadata),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.trustMetadata),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.trustMetadata),
    ...getActionLineagePackages(input).flatMap((actionLineagePackage) => actionLineagePackage.trustMetadata),
    ...getDomainPackages(input).flatMap((domainPackage) => {
      const metadata = (domainPackage as ReferenceRecord).trustMetadata;
      return Array.isArray(metadata) ? (metadata as SyntheticAuditTrustMetadata[]) : [];
    }),
  ];
}

function getConfidenceMetadata(input: BuildActionControlPackageInput): SyntheticAuditConfidenceMetadata[] {
  return [
    ...getInputArray(getPhase37Handoff(input)?.confidenceMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.confidenceMetadata),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.confidenceMetadata),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.confidenceMetadata),
    ...getActionLineagePackages(input).flatMap((actionLineagePackage) => actionLineagePackage.confidenceMetadata),
    ...getDomainPackages(input).flatMap((domainPackage) => {
      const metadata = (domainPackage as ReferenceRecord).confidenceMetadata;
      return Array.isArray(metadata) ? (metadata as SyntheticAuditConfidenceMetadata[]) : [];
    }),
  ];
}

function getGovernanceMetadata(input: BuildActionControlPackageInput): SyntheticAuditGovernanceMetadata[] {
  return [
    ...getInputArray(getPhase37Handoff(input)?.governanceMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.governanceMetadata),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.governanceMetadata),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.governanceMetadata),
    ...getActionLineagePackages(input).flatMap((actionLineagePackage) => actionLineagePackage.governanceMetadata),
    ...getDomainPackages(input).flatMap((domainPackage) => {
      const metadata = (domainPackage as ReferenceRecord).governanceMetadata;
      return Array.isArray(metadata) ? (metadata as SyntheticAuditGovernanceMetadata[]) : [];
    }),
  ];
}

function getMaterialityMetadata(input: BuildActionControlPackageInput): SyntheticAuditMaterialityCompatibility[] {
  return [
    ...getInputArray(getPhase37Handoff(input)?.materialityMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.materialityMetadata),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.materialityMetadata),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.materialityMetadata),
    ...getActionLineagePackages(input).flatMap((actionLineagePackage) => actionLineagePackage.materialityMetadata),
    ...getDomainPackages(input).flatMap((domainPackage) => {
      const metadata = (domainPackage as ReferenceRecord).materialityMetadata;
      return Array.isArray(metadata) ? (metadata as SyntheticAuditMaterialityCompatibility[]) : [];
    }),
  ];
}

function buildActionControlPackageKey(input: BuildActionControlPackageInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    actionCandidateIds: getActionCandidateIds(input),
    workflowCandidateIds: getWorkflowCandidateIds(input),
    approvalGovernanceIds: getApprovalGovernanceIds(input),
    automationGovernancePackageIds: getAutomationGovernancePackageIds(input),
    actionLineagePackageIds: getActionLineagePackageIds(input),
    journalEntryCandidatePackageIds: getJournalEntryCandidatePackageIds(input),
    accountingActionCandidatePackageIds: getAccountingActionCandidatePackageIds(input),
    erpActionCandidatePackageIds: getErpActionCandidatePackageIds(input),
    financialControlActionPackageIds: getFinancialControlActionPackageIds(input),
    auditActionCandidatePackageIds: getAuditActionCandidatePackageIds(input),
    controllerActionCandidatePackageIds: getControllerActionCandidatePackageIds(input),
    revenueCycleActionCandidatePackageIds: getRevenueCycleActionCandidatePackageIds(input),
    healthcarePpdActionCandidatePackageIds: getHealthcarePpdActionCandidatePackageIds(input),
    payrollActionCandidatePackageIds: getPayrollActionCandidatePackageIds(input),
    controlPolicyReferenceIds: getInputArray(input.controlPolicyReferenceIds),
    controlRuleReferenceIds: getInputArray(input.controlRuleReferenceIds),
    controlScopeReferenceIds: getInputArray(input.controlScopeReferenceIds),
    controlRestrictionReferenceIds: getInputArray(input.controlRestrictionReferenceIds),
    controlEscalationReferenceIds: getInputArray(input.controlEscalationReferenceIds),
    controlAuditReferenceIds: getInputArray(input.controlAuditReferenceIds),
    controlValidationReferenceIds: getInputArray(input.controlValidationReferenceIds),
    controlGatesPassed: getControlGatesPassed(input),
    approvalGatePassed: getApprovalGatePassed(input),
    lineageGatePassed: getLineageGatePassed(input),
    governanceGatePassed: getGovernanceGatePassed(input),
    executionReadinessGatePassed: getExecutionReadinessGatePassed(input),
    materialityGatePassed: getMaterialityGatePassed(input),
    allControlGatesPassed: getAllControlGatesPassed(input),
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

function buildActionControlPackageId(input: BuildActionControlPackageInput): string {
  return `synthetic-action-control-package:${stableSnapshotHash({
    actionControlPackageKey: buildActionControlPackageKey(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
  })}`;
}

function buildDerivationHash(input: BuildActionControlPackageInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    derivationMethod: getDerivationMethod(input),
    knowledgePackageHandle: handoff?.knowledgePackageHandle ?? null,
    methodologyPackageHandle: handoff?.methodologyPackageHandle ?? null,
    derivationLineageIds: getDerivationLineageIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
  });
}

function validateActionControlPackageInput(input: BuildActionControlPackageInput): string[] {
  const warnings: string[] = [];
  const handoff = getPhase37Handoff(input);

  if (!handoff) warnings.push("phase37Handoff is required.");
  if (!hasValue(getBoundPhase37SnapshotHash(input))) warnings.push("boundPhase37SnapshotHash is required.");
  if (getActionCandidateIds(input).length === 0) warnings.push("actionCandidateIds is required.");
  if (hasSelfApproval(input)) warnings.push("action control package cannot self-approve.");
  if (!handoff) return warnings;

  if (!hasValue(handoff.companyId)) warnings.push("phase37Handoff.companyId is required.");
  if (!handoff.scope) warnings.push("phase37Handoff.scope is required.");
  if (!hasValue(handoff.knowledgeGraphSnapshotHash)) warnings.push("phase37Handoff.knowledgeGraphSnapshotHash is required.");
  if (!hasValue(handoff.methodologySnapshotHash)) warnings.push("phase37Handoff.methodologySnapshotHash is required.");
  if (handoff.phase38MayConsume !== true) warnings.push("phase37Handoff.phase38MayConsume must be true.");
  if (handoff.phase38MayMutate !== false) warnings.push("phase37Handoff.phase38MayMutate must be false.");
  if (handoff.phase38MayWriteBack !== false) warnings.push("phase37Handoff.phase38MayWriteBack must be false.");

  return warnings;
}

function getWarnings(input: BuildActionControlPackageInput): string[] {
  const gateWarnings = [
    ...(getControlGatesPassed(input) ? [] : ["actionControlPackage: controlGatesPassed is false."]),
    ...(getApprovalGatePassed(input) ? [] : ["actionControlPackage: approvalGatePassed is false."]),
    ...(getLineageGatePassed(input) ? [] : ["actionControlPackage: lineageGatePassed is false."]),
    ...(getGovernanceGatePassed(input) ? [] : ["actionControlPackage: governanceGatePassed is false."]),
    ...(getExecutionReadinessGatePassed(input) ? [] : ["actionControlPackage: executionReadinessGatePassed is false."]),
    ...(getMaterialityGatePassed(input) ? [] : ["actionControlPackage: materialityGatePassed is false."]),
  ];

  return [
    ...gateWarnings,
    ...getStringArrayProperty(getPhase37Handoff(input) ?? {}, "warnings").map((warning) => `phase37Handoff: ${warning}`),
    ...getActionCandidates(input).flatMap((actionCandidate, index) =>
      actionCandidate.warnings.map((warning) => `actionCandidates[${index}]: ${warning}`),
    ),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate, index) =>
      workflowCandidate.warnings.map((warning) => `workflowCandidates[${index}]: ${warning}`),
    ),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance, index) =>
      approvalGovernance.warnings.map((warning) => `approvalGovernancePackages[${index}]: ${warning}`),
    ),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage, index) =>
      automationGovernancePackage.warnings.map((warning) => `automationGovernancePackages[${index}]: ${warning}`),
    ),
    ...getActionLineagePackages(input).flatMap((actionLineagePackage, index) =>
      actionLineagePackage.warnings.map((warning) => `actionLineagePackages[${index}]: ${warning}`),
    ),
    ...getDomainPackages(input).flatMap((domainPackage, index) =>
      getStringArrayProperty(domainPackage, "warnings").map((warning) => `domainPackages[${index}]: ${warning}`),
    ),
  ];
}

export function buildActionControlPackage(input: BuildActionControlPackageInput): BuildActionControlPackageResult {
  const fatalWarnings = validateActionControlPackageInput(input);
  const handoff = getPhase37Handoff(input);

  if (fatalWarnings.length > 0 || !handoff) {
    return {
      actionControlPackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const warnings = getWarnings(input);

  return {
    actionControlPackage: {
      actionControlPackageId: buildActionControlPackageId(input),
      actionControlPackageKey: buildActionControlPackageKey(input),
      actionCandidateIds: getActionCandidateIds(input),
      workflowCandidateIds: getWorkflowCandidateIds(input),
      approvalGovernanceIds: getApprovalGovernanceIds(input),
      automationGovernancePackageIds: getAutomationGovernancePackageIds(input),
      actionLineagePackageIds: getActionLineagePackageIds(input),
      journalEntryCandidatePackageIds: getJournalEntryCandidatePackageIds(input),
      accountingActionCandidatePackageIds: getAccountingActionCandidatePackageIds(input),
      erpActionCandidatePackageIds: getErpActionCandidatePackageIds(input),
      financialControlActionPackageIds: getFinancialControlActionPackageIds(input),
      auditActionCandidatePackageIds: getAuditActionCandidatePackageIds(input),
      controllerActionCandidatePackageIds: getControllerActionCandidatePackageIds(input),
      revenueCycleActionCandidatePackageIds: getRevenueCycleActionCandidatePackageIds(input),
      healthcarePpdActionCandidatePackageIds: getHealthcarePpdActionCandidatePackageIds(input),
      payrollActionCandidatePackageIds: getPayrollActionCandidatePackageIds(input),
      controlPolicyReferenceIds: getInputArray(input.controlPolicyReferenceIds),
      controlRuleReferenceIds: getInputArray(input.controlRuleReferenceIds),
      controlScopeReferenceIds: getInputArray(input.controlScopeReferenceIds),
      controlRestrictionReferenceIds: getInputArray(input.controlRestrictionReferenceIds),
      controlEscalationReferenceIds: getInputArray(input.controlEscalationReferenceIds),
      controlAuditReferenceIds: getInputArray(input.controlAuditReferenceIds),
      controlValidationReferenceIds: getInputArray(input.controlValidationReferenceIds),
      segregationOfDutiesRequired: getSegregationOfDutiesRequired(input),
      segregationOfDutiesSatisfied: getSegregationOfDutiesSatisfied(input),
      conflictOfInterestCheckRequired: getConflictOfInterestCheckRequired(input),
      conflictOfInterestCheckSatisfied: getConflictOfInterestCheckSatisfied(input),
      approvalQuorumRequired: getApprovalQuorumRequired(input),
      approvalQuorumSatisfied: getApprovalQuorumSatisfied(input),
      materialityThresholdReferenceIds: getInputArray(input.materialityThresholdReferenceIds),
      materialityGatePassed: getMaterialityGatePassed(input),
      controlGatesPassed: getControlGatesPassed(input),
      approvalGatePassed: getApprovalGatePassed(input),
      lineageGatePassed: getLineageGatePassed(input),
      governanceGatePassed: getGovernanceGatePassed(input),
      executionReadinessGatePassed: getExecutionReadinessGatePassed(input),
      allControlGatesPassed: getAllControlGatesPassed(input),
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
      trustMetadata: getTrustMetadata(input),
      confidenceMetadata: getConfidenceMetadata(input),
      governanceMetadata: getGovernanceMetadata(input),
      materialityMetadata: getMaterialityMetadata(input),
      warnings,
      skippedIndexes: getInputArray(input.skippedIndexes),
    },
    skipped: false,
    warnings,
  };
}
