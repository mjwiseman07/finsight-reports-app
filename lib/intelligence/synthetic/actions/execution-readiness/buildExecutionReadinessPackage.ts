import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticActionDerivationMethod,
  SyntheticExecutionReadinessContract,
  SyntheticPhase38StaleMarker,
} from "../contracts";
import type { SyntheticActionCandidate, SyntheticPhase37ActionHandoffArtifact } from "../action-candidate";
import type { SyntheticWorkflowCandidate } from "../workflow-candidate";
import type { SyntheticApprovalGovernance } from "../approval-package";
import type {
  SyntheticAuditConfidenceMetadata,
  SyntheticAuditGovernanceMetadata,
  SyntheticAuditMaterialityCompatibility,
  SyntheticAuditScope,
  SyntheticAuditTrustMetadata,
} from "../../audit/types";
import type { SyntheticKnowledgeConfidenceFloorMetadata } from "../../knowledge/contracts";

export interface BuildExecutionReadinessPackageInput {
  phase37Handoff: SyntheticPhase37ActionHandoffArtifact | null;
  actionCandidates?: SyntheticActionCandidate[];
  workflowCandidates?: SyntheticWorkflowCandidate[];
  approvalGovernancePackages?: SyntheticApprovalGovernance[];
  actionCandidateIds?: string[];
  workflowCandidateIds?: string[];
  approvalGovernanceIds?: string[];
  boundPhase37SnapshotHash?: string;
  readinessGatesPassed?: boolean;
  approvalGatePassed?: boolean;
  quorumGatePassed?: boolean;
  segregationOfDutiesGatePassed?: boolean;
  conflictCheckGatePassed?: boolean;
  materialityGatePassed?: boolean;
  governanceGatePassed?: boolean;
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

export interface SyntheticExecutionReadiness extends SyntheticExecutionReadinessContract {
  phase37SupersessionReferenceIds: string[];
  phase37StalenessReasonReferenceIds: string[];
  scope: SyntheticAuditScope;
  derivationLineageIds: string[];
  derivationMethod: SyntheticActionDerivationMethod;
  confidenceFloorMetadata: SyntheticKnowledgeConfidenceFloorMetadata[];
  sourceConfidenceReferenceIds: string[];
  evidenceReferenceIds: string[];
  lineageReferenceIds: string[];
  trustMetadata: SyntheticAuditTrustMetadata[];
  confidenceMetadata: SyntheticAuditConfidenceMetadata[];
  governanceMetadata: SyntheticAuditGovernanceMetadata[];
  materialityMetadata: SyntheticAuditMaterialityCompatibility[];
}

export interface BuildExecutionReadinessPackageResult {
  executionReadiness: SyntheticExecutionReadiness | null;
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

function getPhase37Handoff(input: BuildExecutionReadinessPackageInput): SyntheticPhase37ActionHandoffArtifact | null {
  return input.phase37Handoff;
}

function getActionCandidates(input: BuildExecutionReadinessPackageInput): SyntheticActionCandidate[] {
  return getInputArray(input.actionCandidates);
}

function getWorkflowCandidates(input: BuildExecutionReadinessPackageInput): SyntheticWorkflowCandidate[] {
  return getInputArray(input.workflowCandidates);
}

function getApprovalGovernancePackages(input: BuildExecutionReadinessPackageInput): SyntheticApprovalGovernance[] {
  return getInputArray(input.approvalGovernancePackages);
}

function getActionCandidateIds(input: BuildExecutionReadinessPackageInput): string[] {
  return [
    ...getInputArray(input.actionCandidateIds),
    ...getActionCandidates(input).map((actionCandidate) => actionCandidate.actionCandidateId),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.actionCandidateIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) =>
      getStringArrayProperty(approvalGovernance, "actionCandidateIds"),
    ),
  ];
}

function getWorkflowCandidateIds(input: BuildExecutionReadinessPackageInput): string[] {
  return [
    ...getInputArray(input.workflowCandidateIds),
    ...getWorkflowCandidates(input).map((workflowCandidate) => workflowCandidate.workflowCandidateId),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) =>
      getStringArrayProperty(approvalGovernance, "workflowCandidateIds"),
    ),
  ];
}

function getApprovalGovernanceIds(input: BuildExecutionReadinessPackageInput): string[] {
  return [
    ...getInputArray(input.approvalGovernanceIds),
    ...getApprovalGovernancePackages(input).map((approvalGovernance) => approvalGovernance.approvalGovernanceId),
  ];
}

function getBoundPhase37SnapshotHash(input: BuildExecutionReadinessPackageInput): string {
  return input.boundPhase37SnapshotHash ?? getPhase37Handoff(input)?.boundPhase37SnapshotHash ?? "";
}

function getDerivationMethod(input: BuildExecutionReadinessPackageInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? "execution_readiness_preservation";
}

function getPhase37SupersessionReferenceIds(input: BuildExecutionReadinessPackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(handoff?.phase37SupersessionReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.phase37SupersessionReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.phase37SupersessionReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.phase37SupersessionReferenceIds),
    ...getInputArray(input.phase37SupersessionReferenceIds),
  ];
}

function getPhase37StalenessReasonReferenceIds(input: BuildExecutionReadinessPackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(handoff?.phase37StalenessReasonReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.phase37StalenessReasonReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.phase37StalenessReasonReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.phase37StalenessReasonReferenceIds),
    ...getInputArray(input.phase37StalenessReasonReferenceIds),
  ];
}

function getPhase38StaleMarker(input: BuildExecutionReadinessPackageInput): SyntheticPhase38StaleMarker {
  return input.phase38StaleMarker ?? getPhase37Handoff(input)?.phase38StaleMarker ?? "current";
}

function getApprovalGatePassed(input: BuildExecutionReadinessPackageInput): boolean {
  if (typeof input.approvalGatePassed === "boolean") return input.approvalGatePassed;

  const approvalGovernancePackages = getApprovalGovernancePackages(input);
  return approvalGovernancePackages.length > 0 && approvalGovernancePackages.every((approvalGovernance) =>
    approvalGovernance.approvalRequired === false ||
    (approvalGovernance.approvalStatus === "approval_satisfied" && approvalGovernance.approvalInvalidated === false),
  );
}

function getQuorumGatePassed(input: BuildExecutionReadinessPackageInput): boolean {
  if (typeof input.quorumGatePassed === "boolean") return input.quorumGatePassed;

  return getApprovalGovernancePackages(input).every((approvalGovernance) =>
    approvalGovernance.approvalQuorumRequired === false || approvalGovernance.approvalQuorumSatisfied === true,
  );
}

function getSegregationOfDutiesGatePassed(input: BuildExecutionReadinessPackageInput): boolean {
  if (typeof input.segregationOfDutiesGatePassed === "boolean") return input.segregationOfDutiesGatePassed;

  return getApprovalGovernancePackages(input).every((approvalGovernance) =>
    approvalGovernance.segregationOfDutiesRequired === false || approvalGovernance.segregationOfDutiesSatisfied === true,
  );
}

function getConflictCheckGatePassed(input: BuildExecutionReadinessPackageInput): boolean {
  if (typeof input.conflictCheckGatePassed === "boolean") return input.conflictCheckGatePassed;

  return getApprovalGovernancePackages(input).every((approvalGovernance) =>
    approvalGovernance.conflictOfInterestCheckRequired === false || approvalGovernance.conflictOfInterestCheckSatisfied === true,
  );
}

function getMaterialityGatePassed(input: BuildExecutionReadinessPackageInput): boolean {
  if (typeof input.materialityGatePassed === "boolean") return input.materialityGatePassed;

  return getApprovalGovernancePackages(input).every((approvalGovernance) => approvalGovernance.materialityGatePassed === true);
}

function getGovernanceGatePassed(input: BuildExecutionReadinessPackageInput): boolean {
  if (typeof input.governanceGatePassed === "boolean") return input.governanceGatePassed;

  return (
    getApprovalGatePassed(input) &&
    getQuorumGatePassed(input) &&
    getSegregationOfDutiesGatePassed(input) &&
    getConflictCheckGatePassed(input) &&
    getMaterialityGatePassed(input) &&
    getApprovalGovernancePackages(input).every((approvalGovernance) => approvalGovernance.executable === false)
  );
}

function getReadinessGatesPassed(input: BuildExecutionReadinessPackageInput): boolean {
  if (typeof input.readinessGatesPassed === "boolean") return input.readinessGatesPassed;

  return (
    getApprovalGatePassed(input) &&
    getQuorumGatePassed(input) &&
    getSegregationOfDutiesGatePassed(input) &&
    getConflictCheckGatePassed(input) &&
    getMaterialityGatePassed(input) &&
    getGovernanceGatePassed(input)
  );
}

function getExecutionReady(input: BuildExecutionReadinessPackageInput): boolean {
  return (
    getReadinessGatesPassed(input) &&
    getApprovalGatePassed(input) &&
    getQuorumGatePassed(input) &&
    getSegregationOfDutiesGatePassed(input) &&
    getConflictCheckGatePassed(input) &&
    getMaterialityGatePassed(input) &&
    getGovernanceGatePassed(input)
  );
}

function getDerivationLineageIds(input: BuildExecutionReadinessPackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.derivationLineageIds),
    ...getActionCandidateIds(input),
    ...getWorkflowCandidateIds(input),
    ...getApprovalGovernanceIds(input),
    ...getInputArray(handoff?.sourceKnowledgeObjectIds),
    ...getInputArray(handoff?.sourceMethodologyObjectIds),
    ...getInputArray(handoff?.sourceMemoryObjectIds),
    ...getInputArray(handoff?.sourceEvidenceLineageGraphIds),
  ];
}

function getConfidenceFloorMetadata(input: BuildExecutionReadinessPackageInput): SyntheticKnowledgeConfidenceFloorMetadata[] {
  return [
    ...getInputArray(input.confidenceFloorMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.confidenceFloorMetadata),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.confidenceFloorMetadata),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.confidenceFloorMetadata),
    ...getInputArray(getPhase37Handoff(input)?.confidenceFloorMetadata),
  ];
}

function getSourceConfidenceReferenceIds(input: BuildExecutionReadinessPackageInput): string[] {
  return [
    ...getInputArray(input.sourceConfidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.sourceConfidenceReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.sourceConfidenceReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.sourceConfidenceReferenceIds),
  ];
}

function getEvidenceReferenceIds(input: BuildExecutionReadinessPackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.evidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.evidenceReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.evidenceReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.evidenceReferenceIds),
    ...getInputArray(handoff?.sourceEvidenceLineageGraphIds),
  ];
}

function getLineageReferenceIds(input: BuildExecutionReadinessPackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.lineageReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.lineageReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.lineageReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.lineageReferenceIds),
    ...getInputArray(handoff?.sourceKnowledgeObjectIds),
    ...getInputArray(handoff?.sourceMethodologyObjectIds),
    ...getInputArray(handoff?.sourceMemoryObjectIds),
  ];
}

function buildExecutionReadinessKey(input: BuildExecutionReadinessPackageInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    actionCandidateIds: getActionCandidateIds(input),
    workflowCandidateIds: getWorkflowCandidateIds(input),
    approvalGovernanceIds: getApprovalGovernanceIds(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    boundPhase37KnowledgeGraphSnapshotHash: handoff?.knowledgeGraphSnapshotHash ?? null,
    boundPhase37MethodologySnapshotHash: handoff?.methodologySnapshotHash ?? null,
    readinessGatesPassed: getReadinessGatesPassed(input),
    approvalGatePassed: getApprovalGatePassed(input),
    quorumGatePassed: getQuorumGatePassed(input),
    segregationOfDutiesGatePassed: getSegregationOfDutiesGatePassed(input),
    conflictCheckGatePassed: getConflictCheckGatePassed(input),
    materialityGatePassed: getMaterialityGatePassed(input),
    governanceGatePassed: getGovernanceGatePassed(input),
    executionReady: getExecutionReady(input),
    companyId: handoff?.companyId ?? null,
    scope: handoff?.scope ?? null,
    customerIsolation: handoff?.customerIsolation ?? null,
    firmIsolation: handoff?.firmIsolation ?? null,
    clientIsolation: handoff?.clientIsolation ?? null,
    phase37SupersessionReferenceIds: getPhase37SupersessionReferenceIds(input),
    phase37StalenessReasonReferenceIds: getPhase37StalenessReasonReferenceIds(input),
  });
}

function buildExecutionReadinessId(input: BuildExecutionReadinessPackageInput): string {
  return `synthetic-execution-readiness:${stableSnapshotHash({
    executionReadinessKey: buildExecutionReadinessKey(input),
    actionCandidateIds: getActionCandidateIds(input),
    approvalGovernanceIds: getApprovalGovernanceIds(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    executionReady: getExecutionReady(input),
  })}`;
}

function buildDerivationHash(input: BuildExecutionReadinessPackageInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    derivationMethod: getDerivationMethod(input),
    actionCandidateIds: getActionCandidateIds(input),
    workflowCandidateIds: getWorkflowCandidateIds(input),
    approvalGovernanceIds: getApprovalGovernanceIds(input),
    knowledgePackageHandle: handoff?.knowledgePackageHandle ?? null,
    methodologyPackageHandle: handoff?.methodologyPackageHandle ?? null,
    derivationLineageIds: getDerivationLineageIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
  });
}

function validateExecutionReadinessPackageInput(input: BuildExecutionReadinessPackageInput): string[] {
  const warnings: string[] = [];
  const handoff = getPhase37Handoff(input);
  const actionCandidateIds = getActionCandidateIds(input);
  const approvalGovernanceIds = getApprovalGovernanceIds(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);

  if (!handoff) warnings.push("phase37Handoff is required.");
  if (!hasValue(boundPhase37SnapshotHash)) warnings.push("boundPhase37SnapshotHash is required.");
  if (actionCandidateIds.length === 0) warnings.push("at least one actionCandidateId is required.");
  if (approvalGovernanceIds.length === 0) warnings.push("at least one approvalGovernanceId is required.");
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
    if (actionCandidate.boundPhase37SnapshotHash !== boundPhase37SnapshotHash) {
      warnings.push(`actionCandidates[${index}].boundPhase37SnapshotHash must equal boundPhase37SnapshotHash.`);
    }
  });

  getApprovalGovernancePackages(input).forEach((approvalGovernance, index) => {
    if (!hasValue(approvalGovernance.approvalGovernanceId)) {
      warnings.push(`approvalGovernancePackages[${index}].approvalGovernanceId is required.`);
    }
    if (approvalGovernance.executable !== false) warnings.push(`approvalGovernancePackages[${index}].executable must be false.`);
    if (approvalGovernance.companyId !== handoff.companyId) {
      warnings.push(`approvalGovernancePackages[${index}].companyId must equal phase37Handoff.companyId.`);
    }
    if (approvalGovernance.boundPhase37SnapshotHash !== boundPhase37SnapshotHash) {
      warnings.push(`approvalGovernancePackages[${index}].boundPhase37SnapshotHash must equal boundPhase37SnapshotHash.`);
    }
  });

  return warnings;
}

export function buildExecutionReadinessPackage(
  input: BuildExecutionReadinessPackageInput,
): BuildExecutionReadinessPackageResult {
  const fatalWarnings = validateExecutionReadinessPackageInput(input);
  const handoff = getPhase37Handoff(input);

  if (fatalWarnings.length > 0 || !handoff) {
    return {
      executionReadiness: null,
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
  ];

  return {
    executionReadiness: {
      executionReadinessId: buildExecutionReadinessId(input),
      executionReadinessKey: buildExecutionReadinessKey(input),
      executionReady: getExecutionReady(input),
      readinessGatesPassed: getReadinessGatesPassed(input),
      approvalGatePassed: getApprovalGatePassed(input),
      quorumGatePassed: getQuorumGatePassed(input),
      segregationOfDutiesGatePassed: getSegregationOfDutiesGatePassed(input),
      conflictCheckGatePassed: getConflictCheckGatePassed(input),
      materialityGatePassed: getMaterialityGatePassed(input),
      governanceGatePassed: getGovernanceGatePassed(input),
      actionCandidateIds: getActionCandidateIds(input),
      workflowCandidateIds: getWorkflowCandidateIds(input),
      approvalGovernanceIds: getApprovalGovernanceIds(input),
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
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.trustMetadata),
      ],
      confidenceMetadata: [
        ...getInputArray(handoff.confidenceMetadata),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.confidenceMetadata),
        ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.confidenceMetadata),
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.confidenceMetadata),
      ],
      governanceMetadata: [
        ...handoff.governanceMetadata,
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.governanceMetadata),
        ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.governanceMetadata),
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.governanceMetadata),
      ],
      materialityMetadata: [
        ...getInputArray(handoff.materialityMetadata),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.materialityMetadata),
        ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.materialityMetadata),
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.materialityMetadata),
      ],
      warnings,
      skippedIndexes: getInputArray(input.skippedIndexes),
    },
    skipped: false,
    warnings,
  };
}
