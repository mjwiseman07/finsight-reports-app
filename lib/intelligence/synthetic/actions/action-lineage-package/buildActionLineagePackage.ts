import { stableSnapshotHash } from "../../../core/hash";
import type { SyntheticActionDerivationMethod, SyntheticPhase38StaleMarker } from "../contracts";
import type { SyntheticActionCandidate, SyntheticPhase37ActionHandoffArtifact } from "../action-candidate";
import type { SyntheticWorkflowCandidate } from "../workflow-candidate";
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

export type SyntheticActionLineageCompleteness = "complete" | "partial" | "gap_detected";

export interface BuildActionLineagePackageInput {
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
  sourcePhase37KnowledgeObjectIds?: string[];
  sourcePhase37KnowledgeRelationshipIds?: string[];
  sourcePhase37MethodologyObjectIds?: string[];
  sourcePhase37MethodologyRelationshipIds?: string[];
  sourcePhase37KnowledgePackageIds?: string[];
  sourcePhase37MethodologyPackageIds?: string[];
  sourcePhase36MemoryObjectIds?: string[];
  sourcePhase36MemoryRelationshipIds?: string[];
  sourcePhase35PackageIds?: string[];
  sourcePhase34ObservationIds?: string[];
  sourceEvidenceIds?: string[];
  derivationLineageIds?: string[];
  derivationChainReferenceIds?: string[];
  lineageGapReferenceIds?: string[];
  lineageValidationReferenceIds?: string[];
  crossPeriodLineageReferenceIds?: string[];
  crossEntityLineageReferenceIds?: string[];
  crossFunctionLineageReferenceIds?: string[];
  boundPhase37SnapshotHash?: string;
  phase37SupersessionReferenceIds?: string[];
  phase37StalenessReasonReferenceIds?: string[];
  phase38StaleMarker?: SyntheticPhase38StaleMarker;
  executionReady?: boolean;
  derivationMethod?: SyntheticActionDerivationMethod;
  confidenceFloorMetadata?: SyntheticKnowledgeConfidenceFloorMetadata[];
  sourceConfidenceReferenceIds?: string[];
  evidenceReferenceIds?: string[];
  lineageReferenceIds?: string[];
  skippedIndexes?: number[];
}

export interface SyntheticActionLineagePackage {
  actionLineagePackageId: string;
  actionLineagePackageKey: string;
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
  sourcePhase37KnowledgeObjectIds: string[];
  sourcePhase37KnowledgeRelationshipIds: string[];
  sourcePhase37MethodologyObjectIds: string[];
  sourcePhase37MethodologyRelationshipIds: string[];
  sourcePhase37KnowledgePackageIds: string[];
  sourcePhase37MethodologyPackageIds: string[];
  sourcePhase36MemoryObjectIds: string[];
  sourcePhase36MemoryRelationshipIds: string[];
  sourcePhase35PackageIds: string[];
  sourcePhase34ObservationIds: string[];
  sourceEvidenceIds: string[];
  derivationLineageIds: string[];
  derivationChainReferenceIds: string[];
  lineageDepth: number;
  lineageCompleteness: SyntheticActionLineageCompleteness;
  lineageGapReferenceIds: string[];
  lineageValidationReferenceIds: string[];
  crossPeriodLineageReferenceIds: string[];
  crossEntityLineageReferenceIds: string[];
  crossFunctionLineageReferenceIds: string[];
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

export interface BuildActionLineagePackageResult {
  actionLineagePackage: SyntheticActionLineagePackage | null;
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

function getPhase37Handoff(input: BuildActionLineagePackageInput): SyntheticPhase37ActionHandoffArtifact | null {
  return input.phase37Handoff;
}

function getActionCandidates(input: BuildActionLineagePackageInput): SyntheticActionCandidate[] {
  return getInputArray(input.actionCandidates);
}

function getWorkflowCandidates(input: BuildActionLineagePackageInput): SyntheticWorkflowCandidate[] {
  return getInputArray(input.workflowCandidates);
}

function getJournalEntryCandidatePackages(input: BuildActionLineagePackageInput): SyntheticJournalEntryCandidatePackage[] {
  return getInputArray(input.journalEntryCandidatePackages);
}

function getAccountingActionCandidatePackages(input: BuildActionLineagePackageInput): SyntheticAccountingActionCandidatePackage[] {
  return getInputArray(input.accountingActionCandidatePackages);
}

function getErpActionCandidatePackages(input: BuildActionLineagePackageInput): SyntheticErpActionCandidatePackage[] {
  return getInputArray(input.erpActionCandidatePackages);
}

function getFinancialControlActionPackages(input: BuildActionLineagePackageInput): SyntheticFinancialControlActionPackage[] {
  return getInputArray(input.financialControlActionPackages);
}

function getAuditActionCandidatePackages(input: BuildActionLineagePackageInput): SyntheticAuditActionCandidatePackage[] {
  return getInputArray(input.auditActionCandidatePackages);
}

function getControllerActionCandidatePackages(input: BuildActionLineagePackageInput): SyntheticControllerActionCandidatePackage[] {
  return getInputArray(input.controllerActionCandidatePackages);
}

function getRevenueCycleActionCandidatePackages(input: BuildActionLineagePackageInput): SyntheticRevenueCycleActionCandidatePackage[] {
  return getInputArray(input.revenueCycleActionCandidatePackages);
}

function getHealthcarePpdActionCandidatePackages(input: BuildActionLineagePackageInput): SyntheticHealthcarePpdActionCandidatePackage[] {
  return getInputArray(input.healthcarePpdActionCandidatePackages);
}

function getPayrollActionCandidatePackages(input: BuildActionLineagePackageInput): SyntheticPayrollActionCandidatePackage[] {
  return getInputArray(input.payrollActionCandidatePackages);
}

function getActionCandidateIds(input: BuildActionLineagePackageInput): string[] {
  return [
    ...getInputArray(input.actionCandidateIds),
    ...getActionCandidates(input).map((actionCandidate) => actionCandidate.actionCandidateId),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.actionCandidateIds),
    ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.actionCandidateIds),
    ...getAccountingActionCandidatePackages(input).flatMap((accountingActionCandidatePackage) => accountingActionCandidatePackage.actionCandidateIds),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.actionCandidateIds),
    ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.actionCandidateIds),
    ...getAuditActionCandidatePackages(input).flatMap((auditActionCandidatePackage) => auditActionCandidatePackage.actionCandidateIds),
    ...getControllerActionCandidatePackages(input).flatMap((controllerActionCandidatePackage) => controllerActionCandidatePackage.actionCandidateIds),
    ...getRevenueCycleActionCandidatePackages(input).flatMap((revenueCycleActionCandidatePackage) => revenueCycleActionCandidatePackage.actionCandidateIds),
    ...getHealthcarePpdActionCandidatePackages(input).flatMap(
      (healthcarePpdActionCandidatePackage) => healthcarePpdActionCandidatePackage.actionCandidateIds,
    ),
    ...getPayrollActionCandidatePackages(input).flatMap((payrollActionCandidatePackage) => payrollActionCandidatePackage.actionCandidateIds),
  ];
}

function getWorkflowCandidateIds(input: BuildActionLineagePackageInput): string[] {
  return [
    ...getInputArray(input.workflowCandidateIds),
    ...getWorkflowCandidates(input).map((workflowCandidate) => workflowCandidate.workflowCandidateId),
    ...getAccountingActionCandidatePackages(input).flatMap((accountingActionCandidatePackage) => accountingActionCandidatePackage.workflowCandidateIds),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.workflowCandidateIds),
    ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.workflowCandidateIds),
    ...getAuditActionCandidatePackages(input).flatMap((auditActionCandidatePackage) => auditActionCandidatePackage.workflowCandidateIds),
    ...getControllerActionCandidatePackages(input).flatMap((controllerActionCandidatePackage) => controllerActionCandidatePackage.workflowCandidateIds),
    ...getRevenueCycleActionCandidatePackages(input).flatMap((revenueCycleActionCandidatePackage) => revenueCycleActionCandidatePackage.workflowCandidateIds),
    ...getHealthcarePpdActionCandidatePackages(input).flatMap(
      (healthcarePpdActionCandidatePackage) => healthcarePpdActionCandidatePackage.workflowCandidateIds,
    ),
    ...getPayrollActionCandidatePackages(input).flatMap((payrollActionCandidatePackage) => payrollActionCandidatePackage.workflowCandidateIds),
  ];
}

function getJournalEntryCandidatePackageIds(input: BuildActionLineagePackageInput): string[] {
  return [
    ...getInputArray(input.journalEntryCandidatePackageIds),
    ...getJournalEntryCandidatePackages(input).map((journalEntryCandidatePackage) => journalEntryCandidatePackage.journalEntryCandidatePackageId),
    ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.journalEntryCandidatePackageIds),
    ...getAuditActionCandidatePackages(input).flatMap((auditActionCandidatePackage) => auditActionCandidatePackage.journalEntryCandidatePackageIds),
    ...getControllerActionCandidatePackages(input).flatMap(
      (controllerActionCandidatePackage) => controllerActionCandidatePackage.journalEntryCandidatePackageIds,
    ),
    ...getPayrollActionCandidatePackages(input).flatMap((payrollActionCandidatePackage) => payrollActionCandidatePackage.journalEntryCandidatePackageIds),
  ];
}

function getAccountingActionCandidatePackageIds(input: BuildActionLineagePackageInput): string[] {
  return [
    ...getInputArray(input.accountingActionCandidatePackageIds),
    ...getAccountingActionCandidatePackages(input).map(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.accountingActionCandidatePackageId,
    ),
    ...getJournalEntryCandidatePackages(input).flatMap((journalEntryCandidatePackage) => journalEntryCandidatePackage.accountingActionCandidatePackageIds),
    ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.accountingActionCandidatePackageIds),
    ...getAuditActionCandidatePackages(input).flatMap((auditActionCandidatePackage) => auditActionCandidatePackage.accountingActionCandidatePackageIds),
    ...getControllerActionCandidatePackages(input).flatMap(
      (controllerActionCandidatePackage) => controllerActionCandidatePackage.accountingActionCandidatePackageIds,
    ),
    ...getRevenueCycleActionCandidatePackages(input).flatMap(
      (revenueCycleActionCandidatePackage) => revenueCycleActionCandidatePackage.accountingActionCandidatePackageIds,
    ),
    ...getHealthcarePpdActionCandidatePackages(input).flatMap(
      (healthcarePpdActionCandidatePackage) => healthcarePpdActionCandidatePackage.accountingActionCandidatePackageIds,
    ),
    ...getPayrollActionCandidatePackages(input).flatMap((payrollActionCandidatePackage) => payrollActionCandidatePackage.accountingActionCandidatePackageIds),
  ];
}

function getErpActionCandidatePackageIds(input: BuildActionLineagePackageInput): string[] {
  return [
    ...getInputArray(input.erpActionCandidatePackageIds),
    ...getErpActionCandidatePackages(input).map((erpActionCandidatePackage) => erpActionCandidatePackage.erpActionCandidatePackageId),
    ...getAccountingActionCandidatePackages(input).flatMap((accountingActionCandidatePackage) => accountingActionCandidatePackage.erpActionCandidatePackageIds),
    ...getFinancialControlActionPackages(input).flatMap((financialControlActionPackage) => financialControlActionPackage.erpActionCandidatePackageIds),
    ...getControllerActionCandidatePackages(input).flatMap(
      (controllerActionCandidatePackage) => controllerActionCandidatePackage.erpActionCandidatePackageIds,
    ),
    ...getRevenueCycleActionCandidatePackages(input).flatMap((revenueCycleActionCandidatePackage) => revenueCycleActionCandidatePackage.erpActionCandidatePackageIds),
    ...getHealthcarePpdActionCandidatePackages(input).flatMap(
      (healthcarePpdActionCandidatePackage) => healthcarePpdActionCandidatePackage.erpActionCandidatePackageIds,
    ),
    ...getPayrollActionCandidatePackages(input).flatMap((payrollActionCandidatePackage) => payrollActionCandidatePackage.erpActionCandidatePackageIds),
  ];
}

function getFinancialControlActionPackageIds(input: BuildActionLineagePackageInput): string[] {
  return [
    ...getInputArray(input.financialControlActionPackageIds),
    ...getFinancialControlActionPackages(input).map(
      (financialControlActionPackage) => financialControlActionPackage.financialControlActionPackageId,
    ),
    ...getAuditActionCandidatePackages(input).flatMap((auditActionCandidatePackage) => auditActionCandidatePackage.financialControlActionPackageIds),
    ...getControllerActionCandidatePackages(input).flatMap(
      (controllerActionCandidatePackage) => controllerActionCandidatePackage.financialControlActionPackageIds,
    ),
    ...getPayrollActionCandidatePackages(input).flatMap((payrollActionCandidatePackage) => payrollActionCandidatePackage.financialControlActionPackageIds),
  ];
}

function getAuditActionCandidatePackageIds(input: BuildActionLineagePackageInput): string[] {
  return [
    ...getInputArray(input.auditActionCandidatePackageIds),
    ...getAuditActionCandidatePackages(input).map((auditActionCandidatePackage) => auditActionCandidatePackage.auditActionCandidatePackageId),
    ...getControllerActionCandidatePackages(input).flatMap(
      (controllerActionCandidatePackage) => controllerActionCandidatePackage.auditActionCandidatePackageIds,
    ),
  ];
}

function getControllerActionCandidatePackageIds(input: BuildActionLineagePackageInput): string[] {
  return [
    ...getInputArray(input.controllerActionCandidatePackageIds),
    ...getControllerActionCandidatePackages(input).map(
      (controllerActionCandidatePackage) => controllerActionCandidatePackage.controllerActionCandidatePackageId,
    ),
  ];
}

function getRevenueCycleActionCandidatePackageIds(input: BuildActionLineagePackageInput): string[] {
  return [
    ...getInputArray(input.revenueCycleActionCandidatePackageIds),
    ...getRevenueCycleActionCandidatePackages(input).map(
      (revenueCycleActionCandidatePackage) => revenueCycleActionCandidatePackage.revenueCycleActionCandidatePackageId,
    ),
    ...getHealthcarePpdActionCandidatePackages(input).flatMap(
      (healthcarePpdActionCandidatePackage) => healthcarePpdActionCandidatePackage.revenueCycleActionCandidatePackageIds,
    ),
  ];
}

function getHealthcarePpdActionCandidatePackageIds(input: BuildActionLineagePackageInput): string[] {
  return [
    ...getInputArray(input.healthcarePpdActionCandidatePackageIds),
    ...getHealthcarePpdActionCandidatePackages(input).map(
      (healthcarePpdActionCandidatePackage) => healthcarePpdActionCandidatePackage.healthcarePpdActionCandidatePackageId,
    ),
  ];
}

function getPayrollActionCandidatePackageIds(input: BuildActionLineagePackageInput): string[] {
  return [
    ...getInputArray(input.payrollActionCandidatePackageIds),
    ...getPayrollActionCandidatePackages(input).map((payrollActionCandidatePackage) => payrollActionCandidatePackage.payrollActionCandidatePackageId),
  ];
}

function getBoundPhase37SnapshotHash(input: BuildActionLineagePackageInput): string {
  return input.boundPhase37SnapshotHash ?? getPhase37Handoff(input)?.boundPhase37SnapshotHash ?? "";
}

function getPhase38StaleMarker(input: BuildActionLineagePackageInput): SyntheticPhase38StaleMarker {
  return input.phase38StaleMarker ?? getPhase37Handoff(input)?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildActionLineagePackageInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? "methodology_derived";
}

function getSourcePhase37KnowledgeObjectIds(input: BuildActionLineagePackageInput): string[] {
  return [
    ...getInputArray(input.sourcePhase37KnowledgeObjectIds),
    ...getInputArray(getPhase37Handoff(input)?.sourceKnowledgeObjectIds),
  ];
}

function getSourcePhase37KnowledgeRelationshipIds(input: BuildActionLineagePackageInput): string[] {
  return [
    ...getInputArray(input.sourcePhase37KnowledgeRelationshipIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => getStringArrayProperty(actionCandidate, "sourcePhase37KnowledgeRelationshipIds")),
  ];
}

function getSourcePhase37MethodologyObjectIds(input: BuildActionLineagePackageInput): string[] {
  return [
    ...getInputArray(input.sourcePhase37MethodologyObjectIds),
    ...getInputArray(getPhase37Handoff(input)?.sourceMethodologyObjectIds),
  ];
}

function getSourcePhase37MethodologyRelationshipIds(input: BuildActionLineagePackageInput): string[] {
  return [
    ...getInputArray(input.sourcePhase37MethodologyRelationshipIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => getStringArrayProperty(actionCandidate, "sourcePhase37MethodologyRelationshipIds")),
  ];
}

function getSourcePhase37KnowledgePackageIds(input: BuildActionLineagePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.sourcePhase37KnowledgePackageIds),
    ...(hasValue(handoff?.knowledgePackageHandle) ? [handoff?.knowledgePackageHandle ?? ""] : []),
  ];
}

function getSourcePhase37MethodologyPackageIds(input: BuildActionLineagePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.sourcePhase37MethodologyPackageIds),
    ...(hasValue(handoff?.methodologyPackageHandle) ? [handoff?.methodologyPackageHandle ?? ""] : []),
  ];
}

function getSourcePhase36MemoryObjectIds(input: BuildActionLineagePackageInput): string[] {
  return [
    ...getInputArray(input.sourcePhase36MemoryObjectIds),
    ...getInputArray(getPhase37Handoff(input)?.sourceMemoryObjectIds),
  ];
}

function getSourceEvidenceIds(input: BuildActionLineagePackageInput): string[] {
  return [
    ...getInputArray(input.sourceEvidenceIds),
    ...getInputArray(getPhase37Handoff(input)?.sourceEvidenceLineageGraphIds),
    ...getEvidenceReferenceIds(input),
  ];
}

function getDerivationLineageIds(input: BuildActionLineagePackageInput): string[] {
  return [
    ...getInputArray(input.derivationLineageIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.derivationLineageIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.derivationLineageIds),
    ...getAllDomainPackages(input).flatMap((domainPackage) => getStringArrayProperty(domainPackage, "derivationLineageIds")),
  ];
}

function getDerivationChainReferenceIds(input: BuildActionLineagePackageInput): string[] {
  return [
    ...getInputArray(input.derivationChainReferenceIds),
    ...getDerivationLineageIds(input),
    ...getLineageReferenceIds(input),
  ];
}

function getAllDomainPackages(input: BuildActionLineagePackageInput): object[] {
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

function getPhase37SupersessionReferenceIds(input: BuildActionLineagePackageInput): string[] {
  return [
    ...getInputArray(getPhase37Handoff(input)?.phase37SupersessionReferenceIds),
    ...getInputArray(input.phase37SupersessionReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.phase37SupersessionReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.phase37SupersessionReferenceIds),
    ...getAllDomainPackages(input).flatMap((domainPackage) => getStringArrayProperty(domainPackage, "phase37SupersessionReferenceIds")),
  ];
}

function getPhase37StalenessReasonReferenceIds(input: BuildActionLineagePackageInput): string[] {
  return [
    ...getInputArray(getPhase37Handoff(input)?.phase37StalenessReasonReferenceIds),
    ...getInputArray(input.phase37StalenessReasonReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.phase37StalenessReasonReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.phase37StalenessReasonReferenceIds),
    ...getAllDomainPackages(input).flatMap((domainPackage) => getStringArrayProperty(domainPackage, "phase37StalenessReasonReferenceIds")),
  ];
}

function getConfidenceFloorMetadata(input: BuildActionLineagePackageInput): SyntheticKnowledgeConfidenceFloorMetadata[] {
  return [
    ...getInputArray(input.confidenceFloorMetadata),
    ...getInputArray(getPhase37Handoff(input)?.confidenceFloorMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.confidenceFloorMetadata),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.confidenceFloorMetadata),
    ...getAllDomainPackages(input).flatMap((domainPackage) => {
      const metadata = (domainPackage as ReferenceRecord).confidenceFloorMetadata;
      return Array.isArray(metadata) ? (metadata as SyntheticKnowledgeConfidenceFloorMetadata[]) : [];
    }),
  ];
}

function getSourceConfidenceReferenceIds(input: BuildActionLineagePackageInput): string[] {
  return [
    ...getInputArray(input.sourceConfidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.sourceConfidenceReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.sourceConfidenceReferenceIds),
    ...getAllDomainPackages(input).flatMap((domainPackage) => getStringArrayProperty(domainPackage, "sourceConfidenceReferenceIds")),
    ...getConfidenceFloorMetadata(input).flatMap((metadata) => metadata.sourceConfidenceReferenceIds),
  ];
}

function getEvidenceReferenceIds(input: BuildActionLineagePackageInput): string[] {
  return [
    ...getInputArray(input.evidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.evidenceReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.evidenceReferenceIds),
    ...getAllDomainPackages(input).flatMap((domainPackage) => getStringArrayProperty(domainPackage, "evidenceReferenceIds")),
  ];
}

function getLineageReferenceIds(input: BuildActionLineagePackageInput): string[] {
  return [
    ...getInputArray(input.lineageReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.lineageReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.lineageReferenceIds),
    ...getAllDomainPackages(input).flatMap((domainPackage) => getStringArrayProperty(domainPackage, "lineageReferenceIds")),
  ];
}

function getTrustMetadata(input: BuildActionLineagePackageInput): SyntheticAuditTrustMetadata[] {
  return [
    ...getInputArray(getPhase37Handoff(input)?.trustMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.trustMetadata),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.trustMetadata),
    ...getAllDomainPackages(input).flatMap((domainPackage) => {
      const metadata = (domainPackage as ReferenceRecord).trustMetadata;
      return Array.isArray(metadata) ? (metadata as SyntheticAuditTrustMetadata[]) : [];
    }),
  ];
}

function getConfidenceMetadata(input: BuildActionLineagePackageInput): SyntheticAuditConfidenceMetadata[] {
  return [
    ...getInputArray(getPhase37Handoff(input)?.confidenceMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.confidenceMetadata),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.confidenceMetadata),
    ...getAllDomainPackages(input).flatMap((domainPackage) => {
      const metadata = (domainPackage as ReferenceRecord).confidenceMetadata;
      return Array.isArray(metadata) ? (metadata as SyntheticAuditConfidenceMetadata[]) : [];
    }),
  ];
}

function getGovernanceMetadata(input: BuildActionLineagePackageInput): SyntheticAuditGovernanceMetadata[] {
  return [
    ...getInputArray(getPhase37Handoff(input)?.governanceMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.governanceMetadata),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.governanceMetadata),
    ...getAllDomainPackages(input).flatMap((domainPackage) => {
      const metadata = (domainPackage as ReferenceRecord).governanceMetadata;
      return Array.isArray(metadata) ? (metadata as SyntheticAuditGovernanceMetadata[]) : [];
    }),
  ];
}

function getMaterialityMetadata(input: BuildActionLineagePackageInput): SyntheticAuditMaterialityCompatibility[] {
  return [
    ...getInputArray(getPhase37Handoff(input)?.materialityMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.materialityMetadata),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.materialityMetadata),
    ...getAllDomainPackages(input).flatMap((domainPackage) => {
      const metadata = (domainPackage as ReferenceRecord).materialityMetadata;
      return Array.isArray(metadata) ? (metadata as SyntheticAuditMaterialityCompatibility[]) : [];
    }),
  ];
}

function getMissingLineageGapReferenceIds(input: BuildActionLineagePackageInput): string[] {
  const gaps: string[] = [];
  if (getSourcePhase37KnowledgeObjectIds(input).length === 0) gaps.push("missing-source-phase37-knowledge-object-ids");
  if (getSourcePhase37MethodologyObjectIds(input).length === 0) gaps.push("missing-source-phase37-methodology-object-ids");
  if (getSourcePhase36MemoryObjectIds(input).length === 0) gaps.push("missing-source-phase36-memory-object-ids");
  if (getInputArray(input.sourcePhase35PackageIds).length === 0) gaps.push("missing-source-phase35-package-ids");
  if (getInputArray(input.sourcePhase34ObservationIds).length === 0) gaps.push("missing-source-phase34-observation-ids");
  if (getSourceEvidenceIds(input).length === 0) gaps.push("missing-source-evidence-ids");
  return gaps;
}

function getLineageGapReferenceIds(input: BuildActionLineagePackageInput): string[] {
  return [
    ...getInputArray(input.lineageGapReferenceIds),
    ...getMissingLineageGapReferenceIds(input),
  ];
}

function getLineageCompleteness(input: BuildActionLineagePackageInput): SyntheticActionLineageCompleteness {
  const gapCount = getLineageGapReferenceIds(input).length;
  if (gapCount === 0) return "complete";
  if (getSourcePhase37KnowledgeObjectIds(input).length > 0 && getSourcePhase37MethodologyObjectIds(input).length > 0) return "partial";
  return "gap_detected";
}

function getLineageDepth(input: BuildActionLineagePackageInput): number {
  let depth = 0;
  if (getActionCandidateIds(input).length > 0) depth += 1;
  if (getSourcePhase37KnowledgeObjectIds(input).length > 0 || getSourcePhase37MethodologyObjectIds(input).length > 0) depth += 1;
  if (getSourcePhase36MemoryObjectIds(input).length > 0) depth += 1;
  if (getInputArray(input.sourcePhase35PackageIds).length > 0) depth += 1;
  if (getInputArray(input.sourcePhase34ObservationIds).length > 0 || getSourceEvidenceIds(input).length > 0) depth += 1;
  return depth;
}

function getExecutionReady(input: BuildActionLineagePackageInput): boolean {
  return input.executionReady === true && getLineageCompleteness(input) === "complete";
}

function buildActionLineagePackageKey(input: BuildActionLineagePackageInput): string {
  const handoff = getPhase37Handoff(input);
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
    sourcePhase37KnowledgeObjectIds: getSourcePhase37KnowledgeObjectIds(input),
    sourcePhase37KnowledgeRelationshipIds: getSourcePhase37KnowledgeRelationshipIds(input),
    sourcePhase37MethodologyObjectIds: getSourcePhase37MethodologyObjectIds(input),
    sourcePhase37MethodologyRelationshipIds: getSourcePhase37MethodologyRelationshipIds(input),
    sourcePhase37KnowledgePackageIds: getSourcePhase37KnowledgePackageIds(input),
    sourcePhase37MethodologyPackageIds: getSourcePhase37MethodologyPackageIds(input),
    sourcePhase36MemoryObjectIds: getSourcePhase36MemoryObjectIds(input),
    sourcePhase36MemoryRelationshipIds: getInputArray(input.sourcePhase36MemoryRelationshipIds),
    sourcePhase35PackageIds: getInputArray(input.sourcePhase35PackageIds),
    sourcePhase34ObservationIds: getInputArray(input.sourcePhase34ObservationIds),
    sourceEvidenceIds: getSourceEvidenceIds(input),
    lineageGapReferenceIds: getLineageGapReferenceIds(input),
    lineageCompleteness: getLineageCompleteness(input),
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

function buildActionLineagePackageId(input: BuildActionLineagePackageInput): string {
  return `synthetic-action-lineage-package:${stableSnapshotHash({
    actionLineagePackageKey: buildActionLineagePackageKey(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
  })}`;
}

function buildDerivationHash(input: BuildActionLineagePackageInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    derivationMethod: getDerivationMethod(input),
    knowledgePackageHandle: handoff?.knowledgePackageHandle ?? null,
    methodologyPackageHandle: handoff?.methodologyPackageHandle ?? null,
    derivationLineageIds: getDerivationLineageIds(input),
    derivationChainReferenceIds: getDerivationChainReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
  });
}

function validateActionLineagePackageInput(input: BuildActionLineagePackageInput): string[] {
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

function getWarnings(input: BuildActionLineagePackageInput): string[] {
  return [
    ...getStringArrayProperty(getPhase37Handoff(input) ?? {}, "warnings").map((warning) => `phase37Handoff: ${warning}`),
    ...getLineageGapReferenceIds(input).map((gapReferenceId) => `actionLineagePackage: ${gapReferenceId}`),
    ...getActionCandidates(input).flatMap((actionCandidate, index) =>
      actionCandidate.warnings.map((warning) => `actionCandidates[${index}]: ${warning}`),
    ),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate, index) =>
      workflowCandidate.warnings.map((warning) => `workflowCandidates[${index}]: ${warning}`),
    ),
    ...getAllDomainPackages(input).flatMap((domainPackage, index) =>
      getStringArrayProperty(domainPackage, "warnings").map((warning) => `domainPackages[${index}]: ${warning}`),
    ),
  ];
}

export function buildActionLineagePackage(input: BuildActionLineagePackageInput): BuildActionLineagePackageResult {
  const fatalWarnings = validateActionLineagePackageInput(input);
  const handoff = getPhase37Handoff(input);

  if (fatalWarnings.length > 0 || !handoff) {
    return {
      actionLineagePackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const warnings = getWarnings(input);

  return {
    actionLineagePackage: {
      actionLineagePackageId: buildActionLineagePackageId(input),
      actionLineagePackageKey: buildActionLineagePackageKey(input),
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
      sourcePhase37KnowledgeObjectIds: getSourcePhase37KnowledgeObjectIds(input),
      sourcePhase37KnowledgeRelationshipIds: getSourcePhase37KnowledgeRelationshipIds(input),
      sourcePhase37MethodologyObjectIds: getSourcePhase37MethodologyObjectIds(input),
      sourcePhase37MethodologyRelationshipIds: getSourcePhase37MethodologyRelationshipIds(input),
      sourcePhase37KnowledgePackageIds: getSourcePhase37KnowledgePackageIds(input),
      sourcePhase37MethodologyPackageIds: getSourcePhase37MethodologyPackageIds(input),
      sourcePhase36MemoryObjectIds: getSourcePhase36MemoryObjectIds(input),
      sourcePhase36MemoryRelationshipIds: getInputArray(input.sourcePhase36MemoryRelationshipIds),
      sourcePhase35PackageIds: getInputArray(input.sourcePhase35PackageIds),
      sourcePhase34ObservationIds: getInputArray(input.sourcePhase34ObservationIds),
      sourceEvidenceIds: getSourceEvidenceIds(input),
      derivationLineageIds: getDerivationLineageIds(input),
      derivationChainReferenceIds: getDerivationChainReferenceIds(input),
      lineageDepth: getLineageDepth(input),
      lineageCompleteness: getLineageCompleteness(input),
      lineageGapReferenceIds: getLineageGapReferenceIds(input),
      lineageValidationReferenceIds: getInputArray(input.lineageValidationReferenceIds),
      crossPeriodLineageReferenceIds: getInputArray(input.crossPeriodLineageReferenceIds),
      crossEntityLineageReferenceIds: getInputArray(input.crossEntityLineageReferenceIds),
      crossFunctionLineageReferenceIds: getInputArray(input.crossFunctionLineageReferenceIds),
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
