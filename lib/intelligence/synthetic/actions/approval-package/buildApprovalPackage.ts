import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticActionDerivationMethod,
  SyntheticApprovalGovernanceContract,
  SyntheticApprovalStatus,
  SyntheticPhase38StaleMarker,
} from "../contracts";
import type { SyntheticActionCandidate, SyntheticPhase37ActionHandoffArtifact } from "../action-candidate";
import type { SyntheticWorkflowCandidate } from "../workflow-candidate";
import type {
  SyntheticAuditConfidenceMetadata,
  SyntheticAuditGovernanceMetadata,
  SyntheticAuditMaterialityCompatibility,
  SyntheticAuditScope,
  SyntheticAuditTrustMetadata,
} from "../../audit/types";
import type { SyntheticKnowledgeConfidenceFloorMetadata } from "../../knowledge/contracts";

export const SYNTHETIC_APPROVAL_STATUSES: SyntheticApprovalStatus[] = [
  "approval_not_required",
  "approval_required",
  "approval_pending",
  "approval_satisfied",
  "approval_rejected",
  "approval_withdrawn",
  "approval_invalidated",
];

export interface BuildApprovalPackageInput {
  phase37Handoff: SyntheticPhase37ActionHandoffArtifact | null;
  actionCandidates?: SyntheticActionCandidate[];
  workflowCandidates?: SyntheticWorkflowCandidate[];
  actionCandidateIds?: string[];
  workflowCandidateIds?: string[];
  approvalRequired?: boolean;
  approvalStatus: SyntheticApprovalStatus;
  approvalQuorumRequired?: boolean;
  approvalQuorumSatisfied?: boolean;
  segregationOfDutiesRequired?: boolean;
  segregationOfDutiesSatisfied?: boolean;
  conflictOfInterestCheckRequired?: boolean;
  conflictOfInterestCheckSatisfied?: boolean;
  materialityThresholdReferenceIds?: string[];
  materialityGatePassed?: boolean;
  approvalAuthorityHierarchyReferenceIds?: string[];
  approvalDelegationChainReferenceIds?: string[];
  approvalDelegationSnapshotHash?: string;
  approvalAuthoritySnapshotHash?: string;
  approvalValidForSnapshotHash?: string;
  approvalInvalidated?: boolean;
  approvalInvalidationReasonReferenceIds?: string[];
  approvalAuthorityReferenceIds?: string[];
  approvalRequesterReferenceIds?: string[];
  approvalPolicyReferenceIds?: string[];
  approvalLineageIds?: string[];
  boundPhase37SnapshotHash?: string;
  phase37SupersessionReferenceIds?: string[];
  phase37StalenessReasonReferenceIds?: string[];
  phase38StaleMarker?: SyntheticPhase38StaleMarker;
  derivationLineageIds?: string[];
  derivationMethod?: SyntheticActionDerivationMethod;
  confidenceFloorMetadata?: SyntheticKnowledgeConfidenceFloorMetadata[];
  sourceConfidenceReferenceIds?: string[];
  evidenceReferenceIds?: string[];
  lineageReferenceIds?: string[];
  skippedIndexes?: number[];
}

export interface SyntheticApprovalGovernance extends SyntheticApprovalGovernanceContract {
  boundPhase37KnowledgeGraphSnapshotHash: string;
  boundPhase37MethodologySnapshotHash: string;
  phase37SupersessionReferenceIds: string[];
  phase37StalenessReasonReferenceIds: string[];
  scope: SyntheticAuditScope;
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
}

export interface BuildApprovalPackageResult {
  approvalGovernance: SyntheticApprovalGovernance | null;
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

function isSupportedApprovalStatus(approvalStatus: SyntheticApprovalStatus): boolean {
  return SYNTHETIC_APPROVAL_STATUSES.includes(approvalStatus);
}

function getPhase37Handoff(input: BuildApprovalPackageInput): SyntheticPhase37ActionHandoffArtifact | null {
  return input.phase37Handoff;
}

function getActionCandidates(input: BuildApprovalPackageInput): SyntheticActionCandidate[] {
  return getInputArray(input.actionCandidates);
}

function getWorkflowCandidates(input: BuildApprovalPackageInput): SyntheticWorkflowCandidate[] {
  return getInputArray(input.workflowCandidates);
}

function getActionCandidateIds(input: BuildApprovalPackageInput): string[] {
  return [
    ...getInputArray(input.actionCandidateIds),
    ...getActionCandidates(input).map((actionCandidate) => actionCandidate.actionCandidateId),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.actionCandidateIds),
  ];
}

function getWorkflowCandidateIds(input: BuildApprovalPackageInput): string[] {
  return [
    ...getInputArray(input.workflowCandidateIds),
    ...getWorkflowCandidates(input).map((workflowCandidate) => workflowCandidate.workflowCandidateId),
  ];
}

function getBoundPhase37SnapshotHash(input: BuildApprovalPackageInput): string {
  return input.boundPhase37SnapshotHash ?? getPhase37Handoff(input)?.boundPhase37SnapshotHash ?? "";
}

function getApprovalValidForSnapshotHash(input: BuildApprovalPackageInput): string {
  return input.approvalValidForSnapshotHash ?? getBoundPhase37SnapshotHash(input);
}

function getApprovalDelegationSnapshotHash(input: BuildApprovalPackageInput): string {
  if (hasValue(input.approvalDelegationSnapshotHash)) return input.approvalDelegationSnapshotHash ?? "";

  return stableSnapshotHash({
    approvalDelegationChainReferenceIds: getInputArray(input.approvalDelegationChainReferenceIds),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
  });
}

function getDerivationMethod(input: BuildApprovalPackageInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? "approval_governance_preservation";
}

function getPhase37SupersessionReferenceIds(input: BuildApprovalPackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(handoff?.phase37SupersessionReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.phase37SupersessionReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.phase37SupersessionReferenceIds),
    ...getInputArray(input.phase37SupersessionReferenceIds),
  ];
}

function getPhase37StalenessReasonReferenceIds(input: BuildApprovalPackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(handoff?.phase37StalenessReasonReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.phase37StalenessReasonReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.phase37StalenessReasonReferenceIds),
    ...getInputArray(input.phase37StalenessReasonReferenceIds),
  ];
}

function getPhase38StaleMarker(input: BuildApprovalPackageInput): SyntheticPhase38StaleMarker {
  return input.phase38StaleMarker ?? getPhase37Handoff(input)?.phase38StaleMarker ?? "current";
}

function getDerivationLineageIds(input: BuildApprovalPackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.derivationLineageIds),
    ...getActionCandidateIds(input),
    ...getWorkflowCandidateIds(input),
    ...getInputArray(input.approvalLineageIds),
    ...getInputArray(handoff?.sourceKnowledgeObjectIds),
    ...getInputArray(handoff?.sourceMethodologyObjectIds),
    ...getInputArray(handoff?.sourceMemoryObjectIds),
    ...getInputArray(handoff?.sourceEvidenceLineageGraphIds),
  ];
}

function getConfidenceFloorMetadata(input: BuildApprovalPackageInput): SyntheticKnowledgeConfidenceFloorMetadata[] {
  return [
    ...getInputArray(input.confidenceFloorMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.confidenceFloorMetadata),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.confidenceFloorMetadata),
    ...getInputArray(getPhase37Handoff(input)?.confidenceFloorMetadata),
  ];
}

function getSourceConfidenceReferenceIds(input: BuildApprovalPackageInput): string[] {
  return [
    ...getInputArray(input.sourceConfidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.sourceConfidenceReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.sourceConfidenceReferenceIds),
  ];
}

function getEvidenceReferenceIds(input: BuildApprovalPackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.evidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.evidenceReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.evidenceReferenceIds),
    ...getInputArray(handoff?.sourceEvidenceLineageGraphIds),
  ];
}

function getLineageReferenceIds(input: BuildApprovalPackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.lineageReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.lineageReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.lineageReferenceIds),
    ...getInputArray(input.approvalLineageIds),
    ...getInputArray(handoff?.sourceKnowledgeObjectIds),
    ...getInputArray(handoff?.sourceMethodologyObjectIds),
    ...getInputArray(handoff?.sourceMemoryObjectIds),
  ];
}

function hasSelfApproval(input: BuildApprovalPackageInput): boolean {
  return getInputArray(input.approvalRequesterReferenceIds).some((requesterReferenceId) =>
    getInputArray(input.approvalAuthorityReferenceIds).includes(requesterReferenceId),
  );
}

function buildApprovalGovernanceKey(input: BuildApprovalPackageInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    approvalRequired: input.approvalRequired,
    approvalStatus: input.approvalStatus,
    approvalQuorumRequired: input.approvalQuorumRequired ?? false,
    approvalQuorumSatisfied: input.approvalQuorumSatisfied ?? false,
    segregationOfDutiesRequired: input.segregationOfDutiesRequired ?? false,
    segregationOfDutiesSatisfied: input.segregationOfDutiesSatisfied ?? false,
    conflictOfInterestCheckRequired: input.conflictOfInterestCheckRequired ?? false,
    conflictOfInterestCheckSatisfied: input.conflictOfInterestCheckSatisfied ?? false,
    materialityThresholdReferenceIds: getInputArray(input.materialityThresholdReferenceIds),
    materialityGatePassed: input.materialityGatePassed ?? false,
    approvalAuthorityHierarchyReferenceIds: getInputArray(input.approvalAuthorityHierarchyReferenceIds),
    approvalDelegationChainReferenceIds: getInputArray(input.approvalDelegationChainReferenceIds),
    approvalDelegationSnapshotHash: getApprovalDelegationSnapshotHash(input),
    approvalAuthoritySnapshotHash: input.approvalAuthoritySnapshotHash ?? null,
    approvalValidForSnapshotHash: getApprovalValidForSnapshotHash(input),
    approvalInvalidated: input.approvalInvalidated ?? false,
    approvalInvalidationReasonReferenceIds: getInputArray(input.approvalInvalidationReasonReferenceIds),
    approvalAuthorityReferenceIds: getInputArray(input.approvalAuthorityReferenceIds),
    approvalPolicyReferenceIds: getInputArray(input.approvalPolicyReferenceIds),
    approvalLineageIds: getInputArray(input.approvalLineageIds),
    actionCandidateIds: getActionCandidateIds(input),
    workflowCandidateIds: getWorkflowCandidateIds(input),
    companyId: handoff?.companyId ?? null,
    scope: handoff?.scope ?? null,
    customerIsolation: handoff?.customerIsolation ?? null,
    firmIsolation: handoff?.firmIsolation ?? null,
    clientIsolation: handoff?.clientIsolation ?? null,
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    boundPhase37KnowledgeGraphSnapshotHash: handoff?.knowledgeGraphSnapshotHash ?? null,
    boundPhase37MethodologySnapshotHash: handoff?.methodologySnapshotHash ?? null,
    phase37SupersessionReferenceIds: getPhase37SupersessionReferenceIds(input),
    phase37StalenessReasonReferenceIds: getPhase37StalenessReasonReferenceIds(input),
  });
}

function buildApprovalGovernanceId(input: BuildApprovalPackageInput): string {
  return `synthetic-approval-governance:${stableSnapshotHash({
    approvalGovernanceKey: buildApprovalGovernanceKey(input),
    approvalStatus: input.approvalStatus,
    approvalRequired: input.approvalRequired,
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
  })}`;
}

function buildDerivationHash(input: BuildApprovalPackageInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    derivationMethod: getDerivationMethod(input),
    actionCandidateIds: getActionCandidateIds(input),
    workflowCandidateIds: getWorkflowCandidateIds(input),
    approvalLineageIds: getInputArray(input.approvalLineageIds),
    knowledgePackageHandle: handoff?.knowledgePackageHandle ?? null,
    methodologyPackageHandle: handoff?.methodologyPackageHandle ?? null,
    derivationLineageIds: getDerivationLineageIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
  });
}

function validateApprovalPackageInput(input: BuildApprovalPackageInput): string[] {
  const warnings: string[] = [];
  const handoff = getPhase37Handoff(input);

  if (!handoff) warnings.push("phase37Handoff is required.");
  if (typeof input.approvalRequired !== "boolean") warnings.push("approvalRequired is required.");
  if (!hasValue(input.approvalStatus)) warnings.push("approvalStatus is required.");
  if (!isSupportedApprovalStatus(input.approvalStatus)) warnings.push("approvalStatus must be supported.");
  if (!hasValue(getBoundPhase37SnapshotHash(input))) warnings.push("boundPhase37SnapshotHash is required.");
  if (getInputArray(input.approvalAuthorityHierarchyReferenceIds).length === 0) {
    warnings.push("approvalAuthorityHierarchyReferenceIds are required.");
  }
  if (!hasValue(input.approvalAuthoritySnapshotHash)) warnings.push("approvalAuthoritySnapshotHash is required.");
  if (hasSelfApproval(input)) warnings.push("self approval is not permitted.");
  if (input.approvalQuorumRequired === true && input.approvalStatus === "approval_satisfied" && input.approvalQuorumSatisfied !== true) {
    warnings.push("approvalQuorumSatisfied is required when quorum is required for satisfied approvals.");
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

export function buildApprovalPackage(input: BuildApprovalPackageInput): BuildApprovalPackageResult {
  const fatalWarnings = validateApprovalPackageInput(input);
  const handoff = getPhase37Handoff(input);

  if (fatalWarnings.length > 0 || !handoff || typeof input.approvalRequired !== "boolean") {
    return {
      approvalGovernance: null,
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
  ];

  return {
    approvalGovernance: {
      approvalGovernanceId: buildApprovalGovernanceId(input),
      approvalGovernanceKey: buildApprovalGovernanceKey(input),
      approvalRequired: input.approvalRequired,
      approvalStatus: input.approvalStatus,
      approvalQuorumRequired: input.approvalQuorumRequired ?? false,
      approvalQuorumSatisfied: input.approvalQuorumSatisfied ?? false,
      segregationOfDutiesRequired: input.segregationOfDutiesRequired ?? false,
      segregationOfDutiesSatisfied: input.segregationOfDutiesSatisfied ?? false,
      conflictOfInterestCheckRequired: input.conflictOfInterestCheckRequired ?? false,
      conflictOfInterestCheckSatisfied: input.conflictOfInterestCheckSatisfied ?? false,
      materialityThresholdReferenceIds: getInputArray(input.materialityThresholdReferenceIds),
      materialityGatePassed: input.materialityGatePassed ?? false,
      approvalAuthorityHierarchyReferenceIds: getInputArray(input.approvalAuthorityHierarchyReferenceIds),
      approvalDelegationChainReferenceIds: getInputArray(input.approvalDelegationChainReferenceIds),
      approvalDelegationSnapshotHash: getApprovalDelegationSnapshotHash(input),
      approvalAuthoritySnapshotHash: input.approvalAuthoritySnapshotHash ?? "",
      approvalValidForSnapshotHash: getApprovalValidForSnapshotHash(input),
      approvalInvalidated: input.approvalInvalidated ?? false,
      approvalInvalidationReasonReferenceIds: getInputArray(input.approvalInvalidationReasonReferenceIds),
      approvalAuthorityReferenceIds: getInputArray(input.approvalAuthorityReferenceIds),
      approvalPolicyReferenceIds: getInputArray(input.approvalPolicyReferenceIds),
      approvalLineageIds: getInputArray(input.approvalLineageIds),
      boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
      boundPhase37KnowledgeGraphSnapshotHash: handoff.knowledgeGraphSnapshotHash,
      boundPhase37MethodologySnapshotHash: handoff.methodologySnapshotHash,
      phase37SupersessionReferenceIds: getPhase37SupersessionReferenceIds(input),
      phase37StalenessReasonReferenceIds: getPhase37StalenessReasonReferenceIds(input),
      phase38StaleMarker: getPhase38StaleMarker(input),
      executable: false,
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
      ],
      confidenceMetadata: [
        ...getInputArray(handoff.confidenceMetadata),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.confidenceMetadata),
        ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.confidenceMetadata),
      ],
      governanceMetadata: [
        ...handoff.governanceMetadata,
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.governanceMetadata),
        ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.governanceMetadata),
      ],
      materialityMetadata: [
        ...getInputArray(handoff.materialityMetadata),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.materialityMetadata),
        ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.materialityMetadata),
      ],
      warnings,
      skippedIndexes: getInputArray(input.skippedIndexes),
    },
    skipped: false,
    warnings,
  };
}
