import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticActionDerivationMethod,
  SyntheticPhase38StaleMarker,
} from "../contracts";
import type { SyntheticActionCandidate, SyntheticPhase37ActionHandoffArtifact } from "../action-candidate";
import type { SyntheticWorkflowCandidate } from "../workflow-candidate";
import type { SyntheticApprovalGovernance } from "../approval-package";
import type { SyntheticActionBundlePackage } from "../action-bundle-package";
import type {
  SyntheticAuditConfidenceMetadata,
  SyntheticAuditGovernanceMetadata,
  SyntheticAuditMaterialityCompatibility,
  SyntheticAuditScope,
  SyntheticAuditTrustMetadata,
} from "../../audit/types";
import type { SyntheticMemoryObjectIsolationDimension } from "../../organizational-memory/memory-object";
import type { SyntheticKnowledgeConfidenceFloorMetadata } from "../../knowledge/contracts";

export interface BuildAutomationGovernancePackageInput {
  phase37Handoff: SyntheticPhase37ActionHandoffArtifact | null;
  actionCandidates?: SyntheticActionCandidate[];
  workflowCandidates?: SyntheticWorkflowCandidate[];
  approvalGovernancePackages?: SyntheticApprovalGovernance[];
  actionBundlePackages?: SyntheticActionBundlePackage[];
  actionCandidateIds?: string[];
  workflowCandidateIds?: string[];
  approvalGovernanceIds?: string[];
  automationPolicyReferenceIds?: string[];
  automationRuleReferenceIds?: string[];
  automationScopeReferenceIds?: string[];
  automationRestrictionReferenceIds?: string[];
  automationEscalationReferenceIds?: string[];
  automationAuditReferenceIds?: string[];
  governanceQuorumRequired?: boolean;
  governanceQuorumSatisfied?: boolean;
  segregationOfDutiesRequired?: boolean;
  segregationOfDutiesSatisfied?: boolean;
  conflictOfInterestCheckRequired?: boolean;
  conflictOfInterestCheckSatisfied?: boolean;
  materialityThresholdReferenceIds?: string[];
  materialityGatePassed?: boolean;
  authorityHierarchyReferenceIds?: string[];
  delegationChainReferenceIds?: string[];
  delegationSnapshotHash?: string;
  authoritySnapshotHash?: string;
  governanceValidForSnapshotHash?: string;
  governanceInvalidated?: boolean;
  governanceInvalidationReasonReferenceIds?: string[];
  governanceAuthorityReferenceIds?: string[];
  governanceRequesterReferenceIds?: string[];
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

export interface SyntheticAutomationGovernancePackage {
  automationGovernancePackageId: string;
  automationGovernancePackageKey: string;
  actionCandidateIds: string[];
  workflowCandidateIds: string[];
  approvalGovernanceIds: string[];
  automationPolicyReferenceIds: string[];
  automationRuleReferenceIds: string[];
  automationScopeReferenceIds: string[];
  automationRestrictionReferenceIds: string[];
  automationEscalationReferenceIds: string[];
  automationAuditReferenceIds: string[];
  governanceQuorumRequired: boolean;
  governanceQuorumSatisfied: boolean;
  segregationOfDutiesRequired: boolean;
  segregationOfDutiesSatisfied: boolean;
  conflictOfInterestCheckRequired: boolean;
  conflictOfInterestCheckSatisfied: boolean;
  materialityThresholdReferenceIds: string[];
  materialityGatePassed: boolean;
  authorityHierarchyReferenceIds: string[];
  delegationChainReferenceIds: string[];
  delegationSnapshotHash: string;
  authoritySnapshotHash: string;
  governanceValidForSnapshotHash: string;
  governanceInvalidated: boolean;
  governanceInvalidationReasonReferenceIds: string[];
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

export interface BuildAutomationGovernancePackageResult {
  automationGovernancePackage: SyntheticAutomationGovernancePackage | null;
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

function getPhase37Handoff(input: BuildAutomationGovernancePackageInput): SyntheticPhase37ActionHandoffArtifact | null {
  return input.phase37Handoff;
}

function getActionCandidates(input: BuildAutomationGovernancePackageInput): SyntheticActionCandidate[] {
  return getInputArray(input.actionCandidates);
}

function getWorkflowCandidates(input: BuildAutomationGovernancePackageInput): SyntheticWorkflowCandidate[] {
  return getInputArray(input.workflowCandidates);
}

function getApprovalGovernancePackages(input: BuildAutomationGovernancePackageInput): SyntheticApprovalGovernance[] {
  return getInputArray(input.approvalGovernancePackages);
}

function getActionBundlePackages(input: BuildAutomationGovernancePackageInput): SyntheticActionBundlePackage[] {
  return getInputArray(input.actionBundlePackages);
}

function getActionCandidateIds(input: BuildAutomationGovernancePackageInput): string[] {
  return [
    ...getInputArray(input.actionCandidateIds),
    ...getActionCandidates(input).map((actionCandidate) => actionCandidate.actionCandidateId),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.actionCandidateIds),
    ...getActionBundlePackages(input).flatMap((actionBundlePackage) => actionBundlePackage.bundleActionCandidateIds),
  ];
}

function getWorkflowCandidateIds(input: BuildAutomationGovernancePackageInput): string[] {
  return [
    ...getInputArray(input.workflowCandidateIds),
    ...getWorkflowCandidates(input).map((workflowCandidate) => workflowCandidate.workflowCandidateId),
    ...getActionBundlePackages(input).flatMap((actionBundlePackage) => actionBundlePackage.bundleWorkflowCandidateIds),
  ];
}

function getApprovalGovernanceIds(input: BuildAutomationGovernancePackageInput): string[] {
  return [
    ...getInputArray(input.approvalGovernanceIds),
    ...getApprovalGovernancePackages(input).map((approvalGovernance) => approvalGovernance.approvalGovernanceId),
    ...getActionBundlePackages(input).flatMap((actionBundlePackage) => actionBundlePackage.approvalGovernanceIds),
  ];
}

function getBoundPhase37SnapshotHash(input: BuildAutomationGovernancePackageInput): string {
  return input.boundPhase37SnapshotHash ?? getPhase37Handoff(input)?.boundPhase37SnapshotHash ?? "";
}

function getDelegationSnapshotHash(input: BuildAutomationGovernancePackageInput): string {
  if (hasValue(input.delegationSnapshotHash)) return input.delegationSnapshotHash ?? "";

  return stableSnapshotHash({
    delegationChainReferenceIds: getInputArray(input.delegationChainReferenceIds),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
  });
}

function getGovernanceValidForSnapshotHash(input: BuildAutomationGovernancePackageInput): string {
  return input.governanceValidForSnapshotHash ?? getBoundPhase37SnapshotHash(input);
}

function getPhase38StaleMarker(input: BuildAutomationGovernancePackageInput): SyntheticPhase38StaleMarker {
  return input.phase38StaleMarker ?? getPhase37Handoff(input)?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildAutomationGovernancePackageInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? "approval_governance_preservation";
}

function getExecutionReady(input: BuildAutomationGovernancePackageInput): boolean {
  return (
    input.executionReady === true &&
    (input.governanceQuorumRequired !== true || input.governanceQuorumSatisfied === true) &&
    (input.segregationOfDutiesRequired !== true || input.segregationOfDutiesSatisfied === true) &&
    (input.conflictOfInterestCheckRequired !== true || input.conflictOfInterestCheckSatisfied === true) &&
    input.materialityGatePassed === true &&
    input.governanceInvalidated !== true
  );
}

function getPhase37SupersessionReferenceIds(input: BuildAutomationGovernancePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(handoff?.phase37SupersessionReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.phase37SupersessionReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.phase37SupersessionReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.phase37SupersessionReferenceIds),
    ...getActionBundlePackages(input).flatMap((actionBundlePackage) => actionBundlePackage.phase37SupersessionReferenceIds),
    ...getInputArray(input.phase37SupersessionReferenceIds),
  ];
}

function getPhase37StalenessReasonReferenceIds(input: BuildAutomationGovernancePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(handoff?.phase37StalenessReasonReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.phase37StalenessReasonReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.phase37StalenessReasonReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.phase37StalenessReasonReferenceIds),
    ...getActionBundlePackages(input).flatMap((actionBundlePackage) => actionBundlePackage.phase37StalenessReasonReferenceIds),
    ...getInputArray(input.phase37StalenessReasonReferenceIds),
  ];
}

function getDerivationLineageIds(input: BuildAutomationGovernancePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.derivationLineageIds),
    ...getActionCandidateIds(input),
    ...getWorkflowCandidateIds(input),
    ...getApprovalGovernanceIds(input),
    ...getInputArray(input.automationPolicyReferenceIds),
    ...getInputArray(input.automationRuleReferenceIds),
    ...getInputArray(input.automationAuditReferenceIds),
    ...getInputArray(handoff?.sourceKnowledgeObjectIds),
    ...getInputArray(handoff?.sourceMethodologyObjectIds),
    ...getInputArray(handoff?.sourceMemoryObjectIds),
    ...getInputArray(handoff?.sourceEvidenceLineageGraphIds),
  ];
}

function getConfidenceFloorMetadata(input: BuildAutomationGovernancePackageInput): SyntheticKnowledgeConfidenceFloorMetadata[] {
  return [
    ...getInputArray(input.confidenceFloorMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.confidenceFloorMetadata),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.confidenceFloorMetadata),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.confidenceFloorMetadata),
    ...getActionBundlePackages(input).flatMap((actionBundlePackage) => actionBundlePackage.confidenceFloorMetadata),
    ...getInputArray(getPhase37Handoff(input)?.confidenceFloorMetadata),
  ];
}

function getSourceConfidenceReferenceIds(input: BuildAutomationGovernancePackageInput): string[] {
  return [
    ...getInputArray(input.sourceConfidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.sourceConfidenceReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.sourceConfidenceReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.sourceConfidenceReferenceIds),
    ...getActionBundlePackages(input).flatMap((actionBundlePackage) => actionBundlePackage.sourceConfidenceReferenceIds),
  ];
}

function getEvidenceReferenceIds(input: BuildAutomationGovernancePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.evidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.evidenceReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.evidenceReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.evidenceReferenceIds),
    ...getActionBundlePackages(input).flatMap((actionBundlePackage) => actionBundlePackage.evidenceReferenceIds),
    ...getInputArray(handoff?.sourceEvidenceLineageGraphIds),
  ];
}

function getLineageReferenceIds(input: BuildAutomationGovernancePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.lineageReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.lineageReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.lineageReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.lineageReferenceIds),
    ...getActionBundlePackages(input).flatMap((actionBundlePackage) => actionBundlePackage.lineageReferenceIds),
    ...getInputArray(handoff?.sourceKnowledgeObjectIds),
    ...getInputArray(handoff?.sourceMethodologyObjectIds),
    ...getInputArray(handoff?.sourceMemoryObjectIds),
  ];
}

function hasSelfApproval(input: BuildAutomationGovernancePackageInput): boolean {
  return getInputArray(input.governanceRequesterReferenceIds).some((requesterReferenceId) =>
    getInputArray(input.governanceAuthorityReferenceIds).includes(requesterReferenceId),
  );
}

function buildAutomationGovernancePackageKey(input: BuildAutomationGovernancePackageInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    actionCandidateIds: getActionCandidateIds(input),
    workflowCandidateIds: getWorkflowCandidateIds(input),
    approvalGovernanceIds: getApprovalGovernanceIds(input),
    automationPolicyReferenceIds: getInputArray(input.automationPolicyReferenceIds),
    automationRuleReferenceIds: getInputArray(input.automationRuleReferenceIds),
    automationScopeReferenceIds: getInputArray(input.automationScopeReferenceIds),
    automationRestrictionReferenceIds: getInputArray(input.automationRestrictionReferenceIds),
    automationEscalationReferenceIds: getInputArray(input.automationEscalationReferenceIds),
    automationAuditReferenceIds: getInputArray(input.automationAuditReferenceIds),
    governanceQuorumRequired: input.governanceQuorumRequired ?? false,
    governanceQuorumSatisfied: input.governanceQuorumSatisfied ?? false,
    segregationOfDutiesRequired: input.segregationOfDutiesRequired ?? false,
    segregationOfDutiesSatisfied: input.segregationOfDutiesSatisfied ?? false,
    conflictOfInterestCheckRequired: input.conflictOfInterestCheckRequired ?? false,
    conflictOfInterestCheckSatisfied: input.conflictOfInterestCheckSatisfied ?? false,
    materialityThresholdReferenceIds: getInputArray(input.materialityThresholdReferenceIds),
    materialityGatePassed: input.materialityGatePassed ?? false,
    authorityHierarchyReferenceIds: getInputArray(input.authorityHierarchyReferenceIds),
    delegationChainReferenceIds: getInputArray(input.delegationChainReferenceIds),
    delegationSnapshotHash: getDelegationSnapshotHash(input),
    authoritySnapshotHash: input.authoritySnapshotHash ?? null,
    governanceValidForSnapshotHash: getGovernanceValidForSnapshotHash(input),
    governanceInvalidated: input.governanceInvalidated ?? false,
    governanceInvalidationReasonReferenceIds: getInputArray(input.governanceInvalidationReasonReferenceIds),
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

function buildAutomationGovernancePackageId(input: BuildAutomationGovernancePackageInput): string {
  return `synthetic-automation-governance-package:${stableSnapshotHash({
    automationGovernancePackageKey: buildAutomationGovernancePackageKey(input),
    actionCandidateIds: getActionCandidateIds(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
  })}`;
}

function buildDerivationHash(input: BuildAutomationGovernancePackageInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    derivationMethod: getDerivationMethod(input),
    actionCandidateIds: getActionCandidateIds(input),
    workflowCandidateIds: getWorkflowCandidateIds(input),
    approvalGovernanceIds: getApprovalGovernanceIds(input),
    automationPolicyReferenceIds: getInputArray(input.automationPolicyReferenceIds),
    automationRuleReferenceIds: getInputArray(input.automationRuleReferenceIds),
    knowledgePackageHandle: handoff?.knowledgePackageHandle ?? null,
    methodologyPackageHandle: handoff?.methodologyPackageHandle ?? null,
    derivationLineageIds: getDerivationLineageIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
  });
}

function validateAutomationGovernancePackageInput(input: BuildAutomationGovernancePackageInput): string[] {
  const warnings: string[] = [];
  const handoff = getPhase37Handoff(input);
  const actionCandidateIds = getActionCandidateIds(input);

  if (!handoff) warnings.push("phase37Handoff is required.");
  if (!hasValue(getBoundPhase37SnapshotHash(input))) warnings.push("boundPhase37SnapshotHash is required.");
  if (actionCandidateIds.length === 0) warnings.push("at least one actionCandidateId is required.");
  if (getInputArray(input.authorityHierarchyReferenceIds).length === 0) warnings.push("authorityHierarchyReferenceIds are required.");
  if (!hasValue(input.authoritySnapshotHash)) warnings.push("authoritySnapshotHash is required.");
  if (hasSelfApproval(input)) warnings.push("self approval is not permitted.");
  if (input.governanceQuorumRequired === true && input.governanceQuorumSatisfied !== true) {
    warnings.push("governanceQuorumSatisfied is required when governance quorum is required.");
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

  getWorkflowCandidates(input).forEach((workflowCandidate, index) => {
    if (!hasValue(workflowCandidate.workflowCandidateId)) warnings.push(`workflowCandidates[${index}].workflowCandidateId is required.`);
    if (workflowCandidate.executable !== false) warnings.push(`workflowCandidates[${index}].executable must be false.`);
    if (workflowCandidate.companyId !== handoff.companyId) warnings.push(`workflowCandidates[${index}].companyId must equal phase37Handoff.companyId.`);
  });

  return warnings;
}

export function buildAutomationGovernancePackage(
  input: BuildAutomationGovernancePackageInput,
): BuildAutomationGovernancePackageResult {
  const fatalWarnings = validateAutomationGovernancePackageInput(input);
  const handoff = getPhase37Handoff(input);

  if (fatalWarnings.length > 0 || !handoff) {
    return {
      automationGovernancePackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const warnings = [
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
    ...getActionBundlePackages(input).flatMap((actionBundlePackage, index) =>
      actionBundlePackage.warnings.map((warning) => `actionBundlePackages[${index}]: ${warning}`),
    ),
  ];

  return {
    automationGovernancePackage: {
      automationGovernancePackageId: buildAutomationGovernancePackageId(input),
      automationGovernancePackageKey: buildAutomationGovernancePackageKey(input),
      actionCandidateIds: getActionCandidateIds(input),
      workflowCandidateIds: getWorkflowCandidateIds(input),
      approvalGovernanceIds: getApprovalGovernanceIds(input),
      automationPolicyReferenceIds: getInputArray(input.automationPolicyReferenceIds),
      automationRuleReferenceIds: getInputArray(input.automationRuleReferenceIds),
      automationScopeReferenceIds: getInputArray(input.automationScopeReferenceIds),
      automationRestrictionReferenceIds: getInputArray(input.automationRestrictionReferenceIds),
      automationEscalationReferenceIds: getInputArray(input.automationEscalationReferenceIds),
      automationAuditReferenceIds: getInputArray(input.automationAuditReferenceIds),
      governanceQuorumRequired: input.governanceQuorumRequired ?? false,
      governanceQuorumSatisfied: input.governanceQuorumSatisfied ?? false,
      segregationOfDutiesRequired: input.segregationOfDutiesRequired ?? false,
      segregationOfDutiesSatisfied: input.segregationOfDutiesSatisfied ?? false,
      conflictOfInterestCheckRequired: input.conflictOfInterestCheckRequired ?? false,
      conflictOfInterestCheckSatisfied: input.conflictOfInterestCheckSatisfied ?? false,
      materialityThresholdReferenceIds: getInputArray(input.materialityThresholdReferenceIds),
      materialityGatePassed: input.materialityGatePassed ?? false,
      authorityHierarchyReferenceIds: getInputArray(input.authorityHierarchyReferenceIds),
      delegationChainReferenceIds: getInputArray(input.delegationChainReferenceIds),
      delegationSnapshotHash: getDelegationSnapshotHash(input),
      authoritySnapshotHash: input.authoritySnapshotHash ?? "",
      governanceValidForSnapshotHash: getGovernanceValidForSnapshotHash(input),
      governanceInvalidated: input.governanceInvalidated ?? false,
      governanceInvalidationReasonReferenceIds: getInputArray(input.governanceInvalidationReasonReferenceIds),
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
        ...getActionBundlePackages(input).flatMap((actionBundlePackage) => actionBundlePackage.trustMetadata),
      ],
      confidenceMetadata: [
        ...getInputArray(handoff.confidenceMetadata),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.confidenceMetadata),
        ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.confidenceMetadata),
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.confidenceMetadata),
        ...getActionBundlePackages(input).flatMap((actionBundlePackage) => actionBundlePackage.confidenceMetadata),
      ],
      governanceMetadata: [
        ...handoff.governanceMetadata,
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.governanceMetadata),
        ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.governanceMetadata),
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.governanceMetadata),
        ...getActionBundlePackages(input).flatMap((actionBundlePackage) => actionBundlePackage.governanceMetadata),
      ],
      materialityMetadata: [
        ...getInputArray(handoff.materialityMetadata),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.materialityMetadata),
        ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.materialityMetadata),
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.materialityMetadata),
        ...getActionBundlePackages(input).flatMap((actionBundlePackage) => actionBundlePackage.materialityMetadata),
      ],
      warnings,
      skippedIndexes: getInputArray(input.skippedIndexes),
    },
    skipped: false,
    warnings,
  };
}
