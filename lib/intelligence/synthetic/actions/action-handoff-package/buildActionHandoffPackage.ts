import { stableSnapshotHash } from "../../../core/hash";
import type { SyntheticActionDerivationMethod, SyntheticPhase38StaleMarker } from "../contracts";
import type { SyntheticActionCandidate, SyntheticPhase37ActionHandoffArtifact } from "../action-candidate";
import type { SyntheticWorkflowCandidate } from "../workflow-candidate";
import type { SyntheticApprovalGovernance } from "../approval-package";
import type { SyntheticExecutionReadiness } from "../execution-readiness";
import type { SyntheticSimulationPackage } from "../simulation-package";
import type { SyntheticActionBundlePackage } from "../action-bundle-package";
import type { SyntheticAutomationGovernancePackage } from "../automation-governance-package";
import type { SyntheticActionLineagePackage } from "../action-lineage-package";
import type { SyntheticActionControlPackage } from "../action-control-package";
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

export interface BuildActionHandoffPackageInput {
  phase37Handoff: SyntheticPhase37ActionHandoffArtifact | null;
  actionCandidates?: SyntheticActionCandidate[];
  workflowCandidates?: SyntheticWorkflowCandidate[];
  journalEntryCandidatePackages?: SyntheticJournalEntryCandidatePackage[];
  accountingActionCandidatePackages?: SyntheticAccountingActionCandidatePackage[];
  erpActionCandidatePackages?: SyntheticErpActionCandidatePackage[];
  financialControlActionPackages?: SyntheticFinancialControlActionPackage[];
  auditActionCandidatePackages?: SyntheticAuditActionCandidatePackage[];
  controllerActionCandidatePackages?: SyntheticControllerActionCandidatePackage[];
  revenueCycleActionCandidatePackages?: SyntheticRevenueCycleActionCandidatePackage[];
  healthcarePpdActionCandidatePackages?: SyntheticHealthcarePpdActionCandidatePackage[];
  payrollActionCandidatePackages?: SyntheticPayrollActionCandidatePackage[];
  approvalGovernancePackages?: SyntheticApprovalGovernance[];
  automationGovernancePackages?: SyntheticAutomationGovernancePackage[];
  actionControlPackages?: SyntheticActionControlPackage[];
  actionLineagePackages?: SyntheticActionLineagePackage[];
  simulationPackages?: SyntheticSimulationPackage[];
  actionBundlePackages?: SyntheticActionBundlePackage[];
  executionReadinessPackages?: SyntheticExecutionReadiness[];
  actionCandidateIds?: string[];
  workflowCandidateIds?: string[];
  journalEntryCandidatePackageIds?: string[];
  accountingActionCandidatePackageIds?: string[];
  erpActionCandidatePackageIds?: string[];
  financialControlActionPackageIds?: string[];
  auditActionCandidatePackageIds?: string[];
  controllerActionCandidatePackageIds?: string[];
  revenueCycleActionCandidatePackageIds?: string[];
  healthcarePpdActionCandidatePackageIds?: string[];
  payrollActionCandidatePackageIds?: string[];
  approvalGovernanceIds?: string[];
  automationGovernancePackageIds?: string[];
  actionControlPackageIds?: string[];
  actionLineagePackageIds?: string[];
  simulationPackageIds?: string[];
  actionBundlePackageIds?: string[];
  executionReadinessIds?: string[];
  handoffReadinessGatesPassed?: boolean;
  allApprovalsConfirmed?: boolean;
  allGovernanceConfirmed?: boolean;
  allControlsConfirmed?: boolean;
  allLineageConfirmed?: boolean;
  allReadinessConfirmed?: boolean;
  boundPhase37SnapshotHash?: string;
  phase37SupersessionReferenceIds?: string[];
  phase37StalenessReasonReferenceIds?: string[];
  phase38StaleMarker?: SyntheticPhase38StaleMarker;
  executionReady?: boolean;
  phase39HandoffCreatedAt?: string;
  actionHandoffHandle?: string;
  executionHandoffHandle?: string;
  derivationLineageIds?: string[];
  derivationMethod?: SyntheticActionDerivationMethod;
  confidenceFloorMetadata?: SyntheticKnowledgeConfidenceFloorMetadata[];
  sourceConfidenceReferenceIds?: string[];
  evidenceReferenceIds?: string[];
  lineageReferenceIds?: string[];
  skippedIndexes?: number[];
}

export interface SyntheticActionHandoffPackage {
  actionHandoffPackageId: string;
  actionHandoffPackageKey: string;
  actionCandidateIds: string[];
  workflowCandidateIds: string[];
  journalEntryCandidatePackageIds: string[];
  accountingActionCandidatePackageIds: string[];
  erpActionCandidatePackageIds: string[];
  financialControlActionPackageIds: string[];
  auditActionCandidatePackageIds: string[];
  controllerActionCandidatePackageIds: string[];
  revenueCycleActionCandidatePackageIds: string[];
  healthcarePpdActionCandidatePackageIds: string[];
  payrollActionCandidatePackageIds: string[];
  approvalGovernanceIds: string[];
  automationGovernancePackageIds: string[];
  actionControlPackageIds: string[];
  actionLineagePackageIds: string[];
  simulationPackageIds: string[];
  actionBundlePackageIds: string[];
  executionReadinessIds: string[];
  handoffReadinessGatesPassed: boolean;
  allApprovalsConfirmed: boolean;
  allGovernanceConfirmed: boolean;
  allControlsConfirmed: boolean;
  allLineageConfirmed: boolean;
  allReadinessConfirmed: boolean;
  phase39HandoffReady: boolean;
  boundPhase37SnapshotHash: string;
  boundPhase37KnowledgeGraphSnapshotHash: string;
  boundPhase37MethodologySnapshotHash: string;
  phase37SupersessionReferenceIds: string[];
  phase37StalenessReasonReferenceIds: string[];
  phase38SnapshotHash: string;
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

export interface Phase39ExecutionHandoff {
  handoffId: string;
  handoffKey: string;
  actionHandoffHandle: string;
  executionHandoffHandle: string;
  approvedActionCandidateIds: string[];
  approvedWorkflowCandidateIds: string[];
  approvedErpActionCandidateIds: string[];
  approvedJournalEntryCandidateIds: string[];
  approvalPackageIds: string[];
  automationGovernancePackageIds: string[];
  actionControlPackageIds: string[];
  actionLineagePackageIds: string[];
  actionHandoffPackageId: string;
  boundPhase37SnapshotHash: string;
  boundPhase38SnapshotHash: string;
  phase39HandoffCreatedAt: string;
  executable: false;
  executionReady: boolean;
  executionReadyIsExecutionAuthority: false;
  phase38Executes: false;
  companyId: string;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  warnings: string[];
  skippedIndexes: number[];
}

export interface BuildActionHandoffPackageResult {
  actionHandoffPackage: SyntheticActionHandoffPackage | null;
  phase39ExecutionHandoff: Phase39ExecutionHandoff | null;
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

function getPhase37Handoff(input: BuildActionHandoffPackageInput): SyntheticPhase37ActionHandoffArtifact | null {
  return input.phase37Handoff;
}

function getActionCandidates(input: BuildActionHandoffPackageInput): SyntheticActionCandidate[] {
  return getInputArray(input.actionCandidates);
}

function getWorkflowCandidates(input: BuildActionHandoffPackageInput): SyntheticWorkflowCandidate[] {
  return getInputArray(input.workflowCandidates);
}

function getJournalEntryCandidatePackages(input: BuildActionHandoffPackageInput): SyntheticJournalEntryCandidatePackage[] {
  return getInputArray(input.journalEntryCandidatePackages);
}

function getAccountingActionCandidatePackages(input: BuildActionHandoffPackageInput): SyntheticAccountingActionCandidatePackage[] {
  return getInputArray(input.accountingActionCandidatePackages);
}

function getErpActionCandidatePackages(input: BuildActionHandoffPackageInput): SyntheticErpActionCandidatePackage[] {
  return getInputArray(input.erpActionCandidatePackages);
}

function getFinancialControlActionPackages(input: BuildActionHandoffPackageInput): SyntheticFinancialControlActionPackage[] {
  return getInputArray(input.financialControlActionPackages);
}

function getAuditActionCandidatePackages(input: BuildActionHandoffPackageInput): SyntheticAuditActionCandidatePackage[] {
  return getInputArray(input.auditActionCandidatePackages);
}

function getControllerActionCandidatePackages(input: BuildActionHandoffPackageInput): SyntheticControllerActionCandidatePackage[] {
  return getInputArray(input.controllerActionCandidatePackages);
}

function getRevenueCycleActionCandidatePackages(input: BuildActionHandoffPackageInput): SyntheticRevenueCycleActionCandidatePackage[] {
  return getInputArray(input.revenueCycleActionCandidatePackages);
}

function getHealthcarePpdActionCandidatePackages(input: BuildActionHandoffPackageInput): SyntheticHealthcarePpdActionCandidatePackage[] {
  return getInputArray(input.healthcarePpdActionCandidatePackages);
}

function getPayrollActionCandidatePackages(input: BuildActionHandoffPackageInput): SyntheticPayrollActionCandidatePackage[] {
  return getInputArray(input.payrollActionCandidatePackages);
}

function getApprovalGovernancePackages(input: BuildActionHandoffPackageInput): SyntheticApprovalGovernance[] {
  return getInputArray(input.approvalGovernancePackages);
}

function getAutomationGovernancePackages(input: BuildActionHandoffPackageInput): SyntheticAutomationGovernancePackage[] {
  return getInputArray(input.automationGovernancePackages);
}

function getActionControlPackages(input: BuildActionHandoffPackageInput): SyntheticActionControlPackage[] {
  return getInputArray(input.actionControlPackages);
}

function getActionLineagePackages(input: BuildActionHandoffPackageInput): SyntheticActionLineagePackage[] {
  return getInputArray(input.actionLineagePackages);
}

function getSimulationPackages(input: BuildActionHandoffPackageInput): SyntheticSimulationPackage[] {
  return getInputArray(input.simulationPackages);
}

function getActionBundlePackages(input: BuildActionHandoffPackageInput): SyntheticActionBundlePackage[] {
  return getInputArray(input.actionBundlePackages);
}

function getExecutionReadinessPackages(input: BuildActionHandoffPackageInput): SyntheticExecutionReadiness[] {
  return getInputArray(input.executionReadinessPackages);
}

function getDomainPackages(input: BuildActionHandoffPackageInput): object[] {
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

function getActionCandidateIds(input: BuildActionHandoffPackageInput): string[] {
  return [
    ...getInputArray(input.actionCandidateIds),
    ...getActionCandidates(input).map((actionCandidate) => actionCandidate.actionCandidateId),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.actionCandidateIds),
    ...getExecutionReadinessPackages(input).flatMap((executionReadiness) => executionReadiness.actionCandidateIds),
    ...getActionBundlePackages(input).flatMap((actionBundlePackage) => actionBundlePackage.bundleActionCandidateIds),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.actionCandidateIds),
    ...getActionControlPackages(input).flatMap((actionControlPackage) => actionControlPackage.actionCandidateIds),
    ...getActionLineagePackages(input).flatMap((actionLineagePackage) => actionLineagePackage.actionCandidateIds),
    ...getDomainPackages(input).flatMap((domainPackage) => getStringArrayProperty(domainPackage, "actionCandidateIds")),
  ];
}

function getWorkflowCandidateIds(input: BuildActionHandoffPackageInput): string[] {
  return [
    ...getInputArray(input.workflowCandidateIds),
    ...getWorkflowCandidates(input).map((workflowCandidate) => workflowCandidate.workflowCandidateId),
    ...getExecutionReadinessPackages(input).flatMap((executionReadiness) => executionReadiness.workflowCandidateIds),
    ...getActionBundlePackages(input).flatMap((actionBundlePackage) => actionBundlePackage.bundleWorkflowCandidateIds),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.workflowCandidateIds),
    ...getActionControlPackages(input).flatMap((actionControlPackage) => actionControlPackage.workflowCandidateIds),
    ...getActionLineagePackages(input).flatMap((actionLineagePackage) => actionLineagePackage.workflowCandidateIds),
    ...getDomainPackages(input).flatMap((domainPackage) => getStringArrayProperty(domainPackage, "workflowCandidateIds")),
  ];
}

function getPackageIds(
  inputIds: string[] | undefined,
  packageObjects: object[],
  singularObjectIdName: string,
  relatedObjects: object[],
  objectIdName: string,
): string[] {
  return [
    ...getInputArray(inputIds),
    ...packageObjects
      .map((packageObject) => (packageObject as ReferenceRecord)[singularObjectIdName])
      .filter((packageId): packageId is string => typeof packageId === "string"),
    ...relatedObjects.flatMap((relatedObject) => getStringArrayProperty(relatedObject, objectIdName)),
  ];
}

function getJournalEntryCandidatePackageIds(input: BuildActionHandoffPackageInput): string[] {
  return getPackageIds(input.journalEntryCandidatePackageIds, getJournalEntryCandidatePackages(input), "journalEntryCandidatePackageId", [
    ...getActionControlPackages(input),
    ...getActionLineagePackages(input),
  ], "journalEntryCandidatePackageIds");
}

function getAccountingActionCandidatePackageIds(input: BuildActionHandoffPackageInput): string[] {
  return getPackageIds(input.accountingActionCandidatePackageIds, getAccountingActionCandidatePackages(input), "accountingActionCandidatePackageId", [
    ...getActionControlPackages(input),
    ...getActionLineagePackages(input),
  ], "accountingActionCandidatePackageIds");
}

function getErpActionCandidatePackageIds(input: BuildActionHandoffPackageInput): string[] {
  return getPackageIds(input.erpActionCandidatePackageIds, getErpActionCandidatePackages(input), "erpActionCandidatePackageId", [
    ...getActionControlPackages(input),
    ...getActionLineagePackages(input),
  ], "erpActionCandidatePackageIds");
}

function getFinancialControlActionPackageIds(input: BuildActionHandoffPackageInput): string[] {
  return getPackageIds(
    input.financialControlActionPackageIds,
    getFinancialControlActionPackages(input),
    "financialControlActionPackageId",
    [...getActionControlPackages(input), ...getActionLineagePackages(input)],
    "financialControlActionPackageIds",
  );
}

function getAuditActionCandidatePackageIds(input: BuildActionHandoffPackageInput): string[] {
  return getPackageIds(input.auditActionCandidatePackageIds, getAuditActionCandidatePackages(input), "auditActionCandidatePackageId", [
    ...getActionControlPackages(input),
    ...getActionLineagePackages(input),
  ], "auditActionCandidatePackageIds");
}

function getControllerActionCandidatePackageIds(input: BuildActionHandoffPackageInput): string[] {
  return getPackageIds(
    input.controllerActionCandidatePackageIds,
    getControllerActionCandidatePackages(input),
    "controllerActionCandidatePackageId",
    [...getActionControlPackages(input), ...getActionLineagePackages(input)],
    "controllerActionCandidatePackageIds",
  );
}

function getRevenueCycleActionCandidatePackageIds(input: BuildActionHandoffPackageInput): string[] {
  return getPackageIds(
    input.revenueCycleActionCandidatePackageIds,
    getRevenueCycleActionCandidatePackages(input),
    "revenueCycleActionCandidatePackageId",
    [...getActionControlPackages(input), ...getActionLineagePackages(input)],
    "revenueCycleActionCandidatePackageIds",
  );
}

function getHealthcarePpdActionCandidatePackageIds(input: BuildActionHandoffPackageInput): string[] {
  return getPackageIds(
    input.healthcarePpdActionCandidatePackageIds,
    getHealthcarePpdActionCandidatePackages(input),
    "healthcarePpdActionCandidatePackageId",
    [...getActionControlPackages(input), ...getActionLineagePackages(input)],
    "healthcarePpdActionCandidatePackageIds",
  );
}

function getPayrollActionCandidatePackageIds(input: BuildActionHandoffPackageInput): string[] {
  return getPackageIds(input.payrollActionCandidatePackageIds, getPayrollActionCandidatePackages(input), "payrollActionCandidatePackageId", [
    ...getActionControlPackages(input),
    ...getActionLineagePackages(input),
  ], "payrollActionCandidatePackageIds");
}

function getApprovalGovernanceIds(input: BuildActionHandoffPackageInput): string[] {
  return [
    ...getInputArray(input.approvalGovernanceIds),
    ...getApprovalGovernancePackages(input).map((approvalGovernance) => approvalGovernance.approvalGovernanceId),
    ...getExecutionReadinessPackages(input).flatMap((executionReadiness) => executionReadiness.approvalGovernanceIds),
    ...getActionBundlePackages(input).flatMap((actionBundlePackage) => actionBundlePackage.approvalGovernanceIds),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.approvalGovernanceIds),
    ...getActionControlPackages(input).flatMap((actionControlPackage) => actionControlPackage.approvalGovernanceIds),
    ...getDomainPackages(input).flatMap((domainPackage) => getStringArrayProperty(domainPackage, "approvalGovernanceIds")),
  ];
}

function getAutomationGovernancePackageIds(input: BuildActionHandoffPackageInput): string[] {
  return [
    ...getInputArray(input.automationGovernancePackageIds),
    ...getAutomationGovernancePackages(input).map((automationGovernancePackage) => automationGovernancePackage.automationGovernancePackageId),
    ...getActionControlPackages(input).flatMap((actionControlPackage) => actionControlPackage.automationGovernancePackageIds),
  ];
}

function getActionControlPackageIds(input: BuildActionHandoffPackageInput): string[] {
  return [
    ...getInputArray(input.actionControlPackageIds),
    ...getActionControlPackages(input).map((actionControlPackage) => actionControlPackage.actionControlPackageId),
  ];
}

function getActionLineagePackageIds(input: BuildActionHandoffPackageInput): string[] {
  return [
    ...getInputArray(input.actionLineagePackageIds),
    ...getActionLineagePackages(input).map((actionLineagePackage) => actionLineagePackage.actionLineagePackageId),
    ...getActionControlPackages(input).flatMap((actionControlPackage) => actionControlPackage.actionLineagePackageIds),
  ];
}

function getSimulationPackageIds(input: BuildActionHandoffPackageInput): string[] {
  return [
    ...getInputArray(input.simulationPackageIds),
    ...getSimulationPackages(input).map((simulationPackage) => simulationPackage.simulationPackageId),
  ];
}

function getActionBundlePackageIds(input: BuildActionHandoffPackageInput): string[] {
  return [
    ...getInputArray(input.actionBundlePackageIds),
    ...getActionBundlePackages(input).map((actionBundlePackage) => actionBundlePackage.actionBundlePackageId),
  ];
}

function getExecutionReadinessIds(input: BuildActionHandoffPackageInput): string[] {
  return [
    ...getInputArray(input.executionReadinessIds),
    ...getExecutionReadinessPackages(input).map((executionReadiness) => executionReadiness.executionReadinessId),
  ];
}

function getBoundPhase37SnapshotHash(input: BuildActionHandoffPackageInput): string {
  return input.boundPhase37SnapshotHash ?? getPhase37Handoff(input)?.boundPhase37SnapshotHash ?? "";
}

function getPhase38StaleMarker(input: BuildActionHandoffPackageInput): SyntheticPhase38StaleMarker {
  return input.phase38StaleMarker ?? getPhase37Handoff(input)?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildActionHandoffPackageInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? "handoff_metadata_preservation";
}

function getHandoffReadinessGatesPassed(input: BuildActionHandoffPackageInput): boolean {
  return input.handoffReadinessGatesPassed === true;
}

function getAllApprovalsConfirmed(input: BuildActionHandoffPackageInput): boolean {
  const approvalStatusesConfirmed = getApprovalGovernancePackages(input).every(
    (approvalGovernance) =>
      approvalGovernance.approvalStatus === "approval_satisfied" || approvalGovernance.approvalStatus === "approval_not_required",
  );
  return input.allApprovalsConfirmed === true && approvalStatusesConfirmed;
}

function getAllGovernanceConfirmed(input: BuildActionHandoffPackageInput): boolean {
  const automationGovernanceConfirmed = getAutomationGovernancePackages(input).every(
    (automationGovernancePackage) => automationGovernancePackage.executionReady === true,
  );
  return input.allGovernanceConfirmed === true && automationGovernanceConfirmed;
}

function getAllControlsConfirmed(input: BuildActionHandoffPackageInput): boolean {
  const controlsConfirmed = getActionControlPackages(input).every(
    (actionControlPackage) => actionControlPackage.allControlGatesPassed === true && actionControlPackage.executionReady === true,
  );
  return input.allControlsConfirmed === true && controlsConfirmed;
}

function getAllLineageConfirmed(input: BuildActionHandoffPackageInput): boolean {
  const lineageConfirmed = getActionLineagePackages(input).every((actionLineagePackage) => actionLineagePackage.lineageCompleteness === "complete");
  return input.allLineageConfirmed === true && lineageConfirmed;
}

function getAllReadinessConfirmed(input: BuildActionHandoffPackageInput): boolean {
  const readinessConfirmed = getExecutionReadinessPackages(input).every((executionReadiness) => executionReadiness.executionReady === true);
  return input.allReadinessConfirmed === true && readinessConfirmed;
}

function getPhase39HandoffReady(input: BuildActionHandoffPackageInput): boolean {
  return (
    getHandoffReadinessGatesPassed(input) &&
    getAllApprovalsConfirmed(input) &&
    getAllGovernanceConfirmed(input) &&
    getAllControlsConfirmed(input) &&
    getAllLineageConfirmed(input) &&
    getAllReadinessConfirmed(input)
  );
}

function getExecutionReady(input: BuildActionHandoffPackageInput): boolean {
  return input.executionReady === true && getPhase39HandoffReady(input);
}

function getPhase37SupersessionReferenceIds(input: BuildActionHandoffPackageInput): string[] {
  return [
    ...getInputArray(getPhase37Handoff(input)?.phase37SupersessionReferenceIds),
    ...getInputArray(input.phase37SupersessionReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.phase37SupersessionReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.phase37SupersessionReferenceIds),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.phase37SupersessionReferenceIds),
    ...getActionControlPackages(input).flatMap((actionControlPackage) => actionControlPackage.phase37SupersessionReferenceIds),
    ...getActionLineagePackages(input).flatMap((actionLineagePackage) => actionLineagePackage.phase37SupersessionReferenceIds),
    ...getDomainPackages(input).flatMap((domainPackage) => getStringArrayProperty(domainPackage, "phase37SupersessionReferenceIds")),
  ];
}

function getPhase37StalenessReasonReferenceIds(input: BuildActionHandoffPackageInput): string[] {
  return [
    ...getInputArray(getPhase37Handoff(input)?.phase37StalenessReasonReferenceIds),
    ...getInputArray(input.phase37StalenessReasonReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.phase37StalenessReasonReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.phase37StalenessReasonReferenceIds),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.phase37StalenessReasonReferenceIds),
    ...getActionControlPackages(input).flatMap((actionControlPackage) => actionControlPackage.phase37StalenessReasonReferenceIds),
    ...getActionLineagePackages(input).flatMap((actionLineagePackage) => actionLineagePackage.phase37StalenessReasonReferenceIds),
    ...getDomainPackages(input).flatMap((domainPackage) => getStringArrayProperty(domainPackage, "phase37StalenessReasonReferenceIds")),
  ];
}

function getDerivationLineageIds(input: BuildActionHandoffPackageInput): string[] {
  return [
    ...getInputArray(input.derivationLineageIds),
    ...getActionCandidateIds(input),
    ...getWorkflowCandidateIds(input),
    ...getJournalEntryCandidatePackageIds(input),
    ...getAccountingActionCandidatePackageIds(input),
    ...getErpActionCandidatePackageIds(input),
    ...getFinancialControlActionPackageIds(input),
    ...getAuditActionCandidatePackageIds(input),
    ...getControllerActionCandidatePackageIds(input),
    ...getRevenueCycleActionCandidatePackageIds(input),
    ...getHealthcarePpdActionCandidatePackageIds(input),
    ...getPayrollActionCandidatePackageIds(input),
    ...getApprovalGovernanceIds(input),
    ...getAutomationGovernancePackageIds(input),
    ...getActionControlPackageIds(input),
    ...getActionLineagePackageIds(input),
    ...getSimulationPackageIds(input),
    ...getActionBundlePackageIds(input),
    ...getExecutionReadinessIds(input),
  ];
}

function getConfidenceFloorMetadata(input: BuildActionHandoffPackageInput): SyntheticKnowledgeConfidenceFloorMetadata[] {
  return [
    ...getInputArray(input.confidenceFloorMetadata),
    ...getInputArray(getPhase37Handoff(input)?.confidenceFloorMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.confidenceFloorMetadata),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.confidenceFloorMetadata),
    ...getExecutionReadinessPackages(input).flatMap((executionReadiness) => executionReadiness.confidenceFloorMetadata),
    ...getActionBundlePackages(input).flatMap((actionBundlePackage) => actionBundlePackage.confidenceFloorMetadata),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.confidenceFloorMetadata),
    ...getActionControlPackages(input).flatMap((actionControlPackage) => actionControlPackage.confidenceFloorMetadata),
    ...getActionLineagePackages(input).flatMap((actionLineagePackage) => actionLineagePackage.confidenceFloorMetadata),
    ...getDomainPackages(input).flatMap((domainPackage) => {
      const metadata = (domainPackage as ReferenceRecord).confidenceFloorMetadata;
      return Array.isArray(metadata) ? (metadata as SyntheticKnowledgeConfidenceFloorMetadata[]) : [];
    }),
  ];
}

function getSourceConfidenceReferenceIds(input: BuildActionHandoffPackageInput): string[] {
  return [
    ...getInputArray(input.sourceConfidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.sourceConfidenceReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.sourceConfidenceReferenceIds),
    ...getExecutionReadinessPackages(input).flatMap((executionReadiness) => executionReadiness.sourceConfidenceReferenceIds),
    ...getActionBundlePackages(input).flatMap((actionBundlePackage) => actionBundlePackage.sourceConfidenceReferenceIds),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.sourceConfidenceReferenceIds),
    ...getActionControlPackages(input).flatMap((actionControlPackage) => actionControlPackage.sourceConfidenceReferenceIds),
    ...getActionLineagePackages(input).flatMap((actionLineagePackage) => actionLineagePackage.sourceConfidenceReferenceIds),
    ...getDomainPackages(input).flatMap((domainPackage) => getStringArrayProperty(domainPackage, "sourceConfidenceReferenceIds")),
    ...getConfidenceFloorMetadata(input).flatMap((metadata) => metadata.sourceConfidenceReferenceIds),
  ];
}

function getEvidenceReferenceIds(input: BuildActionHandoffPackageInput): string[] {
  return [
    ...getInputArray(input.evidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.evidenceReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.evidenceReferenceIds),
    ...getExecutionReadinessPackages(input).flatMap((executionReadiness) => executionReadiness.evidenceReferenceIds),
    ...getActionBundlePackages(input).flatMap((actionBundlePackage) => actionBundlePackage.evidenceReferenceIds),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.evidenceReferenceIds),
    ...getActionControlPackages(input).flatMap((actionControlPackage) => actionControlPackage.evidenceReferenceIds),
    ...getActionLineagePackages(input).flatMap((actionLineagePackage) => actionLineagePackage.evidenceReferenceIds),
    ...getDomainPackages(input).flatMap((domainPackage) => getStringArrayProperty(domainPackage, "evidenceReferenceIds")),
  ];
}

function getLineageReferenceIds(input: BuildActionHandoffPackageInput): string[] {
  return [
    ...getInputArray(input.lineageReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.lineageReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.lineageReferenceIds),
    ...getExecutionReadinessPackages(input).flatMap((executionReadiness) => executionReadiness.lineageReferenceIds),
    ...getActionBundlePackages(input).flatMap((actionBundlePackage) => actionBundlePackage.lineageReferenceIds),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.lineageReferenceIds),
    ...getActionControlPackages(input).flatMap((actionControlPackage) => actionControlPackage.lineageReferenceIds),
    ...getActionLineagePackages(input).flatMap((actionLineagePackage) => actionLineagePackage.lineageReferenceIds),
    ...getDomainPackages(input).flatMap((domainPackage) => getStringArrayProperty(domainPackage, "lineageReferenceIds")),
  ];
}

function getTypedMetadata<T>(value: object, propertyName: string): T[] {
  const metadata = (value as ReferenceRecord)[propertyName];
  return Array.isArray(metadata) ? (metadata as T[]) : [];
}

function getTrustMetadata(input: BuildActionHandoffPackageInput): SyntheticAuditTrustMetadata[] {
  return [
    ...getInputArray(getPhase37Handoff(input)?.trustMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.trustMetadata),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.trustMetadata),
    ...getExecutionReadinessPackages(input).flatMap((executionReadiness) => executionReadiness.trustMetadata),
    ...getActionBundlePackages(input).flatMap((actionBundlePackage) => actionBundlePackage.trustMetadata),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.trustMetadata),
    ...getActionControlPackages(input).flatMap((actionControlPackage) => actionControlPackage.trustMetadata),
    ...getActionLineagePackages(input).flatMap((actionLineagePackage) => actionLineagePackage.trustMetadata),
    ...getDomainPackages(input).flatMap((domainPackage) => getTypedMetadata<SyntheticAuditTrustMetadata>(domainPackage, "trustMetadata")),
  ];
}

function getConfidenceMetadata(input: BuildActionHandoffPackageInput): SyntheticAuditConfidenceMetadata[] {
  return [
    ...getInputArray(getPhase37Handoff(input)?.confidenceMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.confidenceMetadata),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.confidenceMetadata),
    ...getExecutionReadinessPackages(input).flatMap((executionReadiness) => executionReadiness.confidenceMetadata),
    ...getActionBundlePackages(input).flatMap((actionBundlePackage) => actionBundlePackage.confidenceMetadata),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.confidenceMetadata),
    ...getActionControlPackages(input).flatMap((actionControlPackage) => actionControlPackage.confidenceMetadata),
    ...getActionLineagePackages(input).flatMap((actionLineagePackage) => actionLineagePackage.confidenceMetadata),
    ...getDomainPackages(input).flatMap((domainPackage) => getTypedMetadata<SyntheticAuditConfidenceMetadata>(domainPackage, "confidenceMetadata")),
  ];
}

function getGovernanceMetadata(input: BuildActionHandoffPackageInput): SyntheticAuditGovernanceMetadata[] {
  return [
    ...getInputArray(getPhase37Handoff(input)?.governanceMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.governanceMetadata),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.governanceMetadata),
    ...getExecutionReadinessPackages(input).flatMap((executionReadiness) => executionReadiness.governanceMetadata),
    ...getActionBundlePackages(input).flatMap((actionBundlePackage) => actionBundlePackage.governanceMetadata),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.governanceMetadata),
    ...getActionControlPackages(input).flatMap((actionControlPackage) => actionControlPackage.governanceMetadata),
    ...getActionLineagePackages(input).flatMap((actionLineagePackage) => actionLineagePackage.governanceMetadata),
    ...getDomainPackages(input).flatMap((domainPackage) => getTypedMetadata<SyntheticAuditGovernanceMetadata>(domainPackage, "governanceMetadata")),
  ];
}

function getMaterialityMetadata(input: BuildActionHandoffPackageInput): SyntheticAuditMaterialityCompatibility[] {
  return [
    ...getInputArray(getPhase37Handoff(input)?.materialityMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.materialityMetadata),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.materialityMetadata),
    ...getExecutionReadinessPackages(input).flatMap((executionReadiness) => executionReadiness.materialityMetadata),
    ...getActionBundlePackages(input).flatMap((actionBundlePackage) => actionBundlePackage.materialityMetadata),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.materialityMetadata),
    ...getActionControlPackages(input).flatMap((actionControlPackage) => actionControlPackage.materialityMetadata),
    ...getActionLineagePackages(input).flatMap((actionLineagePackage) => actionLineagePackage.materialityMetadata),
    ...getDomainPackages(input).flatMap((domainPackage) =>
      getTypedMetadata<SyntheticAuditMaterialityCompatibility>(domainPackage, "materialityMetadata"),
    ),
  ];
}

function buildPhase38SnapshotHash(input: BuildActionHandoffPackageInput): string {
  return stableSnapshotHash({
    actionCandidateIds: getActionCandidateIds(input),
    workflowCandidateIds: getWorkflowCandidateIds(input),
    journalEntryCandidatePackageIds: getJournalEntryCandidatePackageIds(input),
    accountingActionCandidatePackageIds: getAccountingActionCandidatePackageIds(input),
    erpActionCandidatePackageIds: getErpActionCandidatePackageIds(input),
    financialControlActionPackageIds: getFinancialControlActionPackageIds(input),
    auditActionCandidatePackageIds: getAuditActionCandidatePackageIds(input),
    controllerActionCandidatePackageIds: getControllerActionCandidatePackageIds(input),
    revenueCycleActionCandidatePackageIds: getRevenueCycleActionCandidatePackageIds(input),
    healthcarePpdActionCandidatePackageIds: getHealthcarePpdActionCandidatePackageIds(input),
    payrollActionCandidatePackageIds: getPayrollActionCandidatePackageIds(input),
    approvalGovernanceIds: getApprovalGovernanceIds(input),
    automationGovernancePackageIds: getAutomationGovernancePackageIds(input),
    actionControlPackageIds: getActionControlPackageIds(input),
    actionLineagePackageIds: getActionLineagePackageIds(input),
    simulationPackageIds: getSimulationPackageIds(input),
    actionBundlePackageIds: getActionBundlePackageIds(input),
    executionReadinessIds: getExecutionReadinessIds(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
  });
}

function buildActionHandoffPackageKey(input: BuildActionHandoffPackageInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    phase38SnapshotHash: buildPhase38SnapshotHash(input),
    handoffReadinessGatesPassed: getHandoffReadinessGatesPassed(input),
    allApprovalsConfirmed: getAllApprovalsConfirmed(input),
    allGovernanceConfirmed: getAllGovernanceConfirmed(input),
    allControlsConfirmed: getAllControlsConfirmed(input),
    allLineageConfirmed: getAllLineageConfirmed(input),
    allReadinessConfirmed: getAllReadinessConfirmed(input),
    phase39HandoffReady: getPhase39HandoffReady(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    boundPhase37KnowledgeGraphSnapshotHash: handoff?.knowledgeGraphSnapshotHash ?? null,
    boundPhase37MethodologySnapshotHash: handoff?.methodologySnapshotHash ?? null,
    companyId: handoff?.companyId ?? null,
    customerIsolation: handoff?.customerIsolation ?? null,
    firmIsolation: handoff?.firmIsolation ?? null,
    clientIsolation: handoff?.clientIsolation ?? null,
  });
}

function buildActionHandoffPackageId(input: BuildActionHandoffPackageInput): string {
  return `synthetic-action-handoff-package:${stableSnapshotHash({
    actionHandoffPackageKey: buildActionHandoffPackageKey(input),
    phase38SnapshotHash: buildPhase38SnapshotHash(input),
  })}`;
}

function buildDerivationHash(input: BuildActionHandoffPackageInput): string {
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

function getActionHandoffHandle(input: BuildActionHandoffPackageInput): string {
  return (
    input.actionHandoffHandle ??
    `synthetic-action-handoff-handle:${stableSnapshotHash({
      actionHandoffPackageKey: buildActionHandoffPackageKey(input),
      phase38SnapshotHash: buildPhase38SnapshotHash(input),
    })}`
  );
}

function getExecutionHandoffHandle(input: BuildActionHandoffPackageInput): string {
  return (
    input.executionHandoffHandle ??
    `synthetic-phase39-execution-handoff-handle:${stableSnapshotHash({
      actionHandoffHandle: getActionHandoffHandle(input),
      phase38SnapshotHash: buildPhase38SnapshotHash(input),
      boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    })}`
  );
}

function getPhase39HandoffCreatedAt(input: BuildActionHandoffPackageInput): string {
  return (
    input.phase39HandoffCreatedAt ??
    `deterministic-phase39-handoff-created-at:${stableSnapshotHash({
      executionHandoffHandle: getExecutionHandoffHandle(input),
      phase38SnapshotHash: buildPhase38SnapshotHash(input),
    })}`
  );
}

function buildPhase39HandoffKey(input: BuildActionHandoffPackageInput, actionHandoffPackageId: string): string {
  return stableSnapshotHash({
    actionHandoffHandle: getActionHandoffHandle(input),
    executionHandoffHandle: getExecutionHandoffHandle(input),
    approvedActionCandidateIds: getActionCandidateIds(input),
    approvedWorkflowCandidateIds: getWorkflowCandidateIds(input),
    approvedErpActionCandidateIds: getErpActionCandidatePackageIds(input),
    approvedJournalEntryCandidateIds: getJournalEntryCandidatePackageIds(input),
    approvalPackageIds: getApprovalGovernanceIds(input),
    automationGovernancePackageIds: getAutomationGovernancePackageIds(input),
    actionControlPackageIds: getActionControlPackageIds(input),
    actionLineagePackageIds: getActionLineagePackageIds(input),
    actionHandoffPackageId,
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    boundPhase38SnapshotHash: buildPhase38SnapshotHash(input),
  });
}

function buildPhase39HandoffId(input: BuildActionHandoffPackageInput, actionHandoffPackageId: string): string {
  return `synthetic-phase39-execution-handoff:${stableSnapshotHash({
    handoffKey: buildPhase39HandoffKey(input, actionHandoffPackageId),
    actionHandoffPackageId,
  })}`;
}

function validateActionHandoffPackageInput(input: BuildActionHandoffPackageInput): string[] {
  const warnings: string[] = [];
  const handoff = getPhase37Handoff(input);

  if (!handoff) warnings.push("phase37Handoff is required.");
  if (!hasValue(getBoundPhase37SnapshotHash(input))) warnings.push("boundPhase37SnapshotHash is required.");
  if (getActionCandidateIds(input).length === 0) warnings.push("actionCandidateIds is required.");
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

function getWarnings(input: BuildActionHandoffPackageInput): string[] {
  const gateWarnings = [
    ...(getHandoffReadinessGatesPassed(input) ? [] : ["actionHandoffPackage: handoffReadinessGatesPassed is false."]),
    ...(getAllApprovalsConfirmed(input) ? [] : ["actionHandoffPackage: allApprovalsConfirmed is false."]),
    ...(getAllGovernanceConfirmed(input) ? [] : ["actionHandoffPackage: allGovernanceConfirmed is false."]),
    ...(getAllControlsConfirmed(input) ? [] : ["actionHandoffPackage: allControlsConfirmed is false."]),
    ...(getAllLineageConfirmed(input) ? [] : ["actionHandoffPackage: allLineageConfirmed is false."]),
    ...(getAllReadinessConfirmed(input) ? [] : ["actionHandoffPackage: allReadinessConfirmed is false."]),
  ];

  return [
    ...gateWarnings,
    ...getStringArrayProperty(getPhase37Handoff(input) ?? {}, "warnings").map((warning) => `phase37Handoff: ${warning}`),
    ...[
      ["actionCandidates", getActionCandidates(input)],
      ["workflowCandidates", getWorkflowCandidates(input)],
      ["approvalGovernancePackages", getApprovalGovernancePackages(input)],
      ["executionReadinessPackages", getExecutionReadinessPackages(input)],
      ["simulationPackages", getSimulationPackages(input)],
      ["actionBundlePackages", getActionBundlePackages(input)],
      ["automationGovernancePackages", getAutomationGovernancePackages(input)],
      ["actionControlPackages", getActionControlPackages(input)],
      ["actionLineagePackages", getActionLineagePackages(input)],
      ["domainPackages", getDomainPackages(input)],
    ].flatMap(([label, values]) =>
      (values as object[]).flatMap((value, index) => getStringArrayProperty(value, "warnings").map((warning) => `${label}[${index}]: ${warning}`)),
    ),
  ];
}

function buildPhase39ExecutionHandoff(
  input: BuildActionHandoffPackageInput,
  actionHandoffPackage: SyntheticActionHandoffPackage,
): Phase39ExecutionHandoff {
  const handoffKey = buildPhase39HandoffKey(input, actionHandoffPackage.actionHandoffPackageId);

  return {
    handoffId: buildPhase39HandoffId(input, actionHandoffPackage.actionHandoffPackageId),
    handoffKey,
    actionHandoffHandle: getActionHandoffHandle(input),
    executionHandoffHandle: getExecutionHandoffHandle(input),
    approvedActionCandidateIds: actionHandoffPackage.actionCandidateIds,
    approvedWorkflowCandidateIds: actionHandoffPackage.workflowCandidateIds,
    approvedErpActionCandidateIds: actionHandoffPackage.erpActionCandidatePackageIds,
    approvedJournalEntryCandidateIds: actionHandoffPackage.journalEntryCandidatePackageIds,
    approvalPackageIds: actionHandoffPackage.approvalGovernanceIds,
    automationGovernancePackageIds: actionHandoffPackage.automationGovernancePackageIds,
    actionControlPackageIds: actionHandoffPackage.actionControlPackageIds,
    actionLineagePackageIds: actionHandoffPackage.actionLineagePackageIds,
    actionHandoffPackageId: actionHandoffPackage.actionHandoffPackageId,
    boundPhase37SnapshotHash: actionHandoffPackage.boundPhase37SnapshotHash,
    boundPhase38SnapshotHash: actionHandoffPackage.phase38SnapshotHash,
    phase39HandoffCreatedAt: getPhase39HandoffCreatedAt(input),
    executable: false,
    executionReady: actionHandoffPackage.executionReady,
    executionReadyIsExecutionAuthority: false,
    phase38Executes: false,
    companyId: actionHandoffPackage.companyId,
    customerIsolation: actionHandoffPackage.customerIsolation,
    firmIsolation: actionHandoffPackage.firmIsolation,
    clientIsolation: actionHandoffPackage.clientIsolation,
    warnings: actionHandoffPackage.warnings,
    skippedIndexes: actionHandoffPackage.skippedIndexes,
  };
}

export function buildActionHandoffPackage(input: BuildActionHandoffPackageInput): BuildActionHandoffPackageResult {
  const fatalWarnings = validateActionHandoffPackageInput(input);
  const handoff = getPhase37Handoff(input);

  if (fatalWarnings.length > 0 || !handoff) {
    return {
      actionHandoffPackage: null,
      phase39ExecutionHandoff: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const warnings = getWarnings(input);
  const actionHandoffPackage: SyntheticActionHandoffPackage = {
    actionHandoffPackageId: buildActionHandoffPackageId(input),
    actionHandoffPackageKey: buildActionHandoffPackageKey(input),
    actionCandidateIds: getActionCandidateIds(input),
    workflowCandidateIds: getWorkflowCandidateIds(input),
    journalEntryCandidatePackageIds: getJournalEntryCandidatePackageIds(input),
    accountingActionCandidatePackageIds: getAccountingActionCandidatePackageIds(input),
    erpActionCandidatePackageIds: getErpActionCandidatePackageIds(input),
    financialControlActionPackageIds: getFinancialControlActionPackageIds(input),
    auditActionCandidatePackageIds: getAuditActionCandidatePackageIds(input),
    controllerActionCandidatePackageIds: getControllerActionCandidatePackageIds(input),
    revenueCycleActionCandidatePackageIds: getRevenueCycleActionCandidatePackageIds(input),
    healthcarePpdActionCandidatePackageIds: getHealthcarePpdActionCandidatePackageIds(input),
    payrollActionCandidatePackageIds: getPayrollActionCandidatePackageIds(input),
    approvalGovernanceIds: getApprovalGovernanceIds(input),
    automationGovernancePackageIds: getAutomationGovernancePackageIds(input),
    actionControlPackageIds: getActionControlPackageIds(input),
    actionLineagePackageIds: getActionLineagePackageIds(input),
    simulationPackageIds: getSimulationPackageIds(input),
    actionBundlePackageIds: getActionBundlePackageIds(input),
    executionReadinessIds: getExecutionReadinessIds(input),
    handoffReadinessGatesPassed: getHandoffReadinessGatesPassed(input),
    allApprovalsConfirmed: getAllApprovalsConfirmed(input),
    allGovernanceConfirmed: getAllGovernanceConfirmed(input),
    allControlsConfirmed: getAllControlsConfirmed(input),
    allLineageConfirmed: getAllLineageConfirmed(input),
    allReadinessConfirmed: getAllReadinessConfirmed(input),
    phase39HandoffReady: getPhase39HandoffReady(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    boundPhase37KnowledgeGraphSnapshotHash: handoff.knowledgeGraphSnapshotHash,
    boundPhase37MethodologySnapshotHash: handoff.methodologySnapshotHash,
    phase37SupersessionReferenceIds: getPhase37SupersessionReferenceIds(input),
    phase37StalenessReasonReferenceIds: getPhase37StalenessReasonReferenceIds(input),
    phase38SnapshotHash: buildPhase38SnapshotHash(input),
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
  };

  return {
    actionHandoffPackage,
    phase39ExecutionHandoff: buildPhase39ExecutionHandoff(input, actionHandoffPackage),
    skipped: false,
    warnings,
  };
}
