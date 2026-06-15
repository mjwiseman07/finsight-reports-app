import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticActionBundlePackageContract,
  SyntheticActionDerivationMethod,
  SyntheticPhase38StaleMarker,
} from "../contracts";
import type { SyntheticActionCandidate, SyntheticPhase37ActionHandoffArtifact } from "../action-candidate";
import type { SyntheticWorkflowCandidate } from "../workflow-candidate";
import type { SyntheticApprovalGovernance } from "../approval-package";
import type { SyntheticExecutionReadiness } from "../execution-readiness";
import type {
  SyntheticAuditConfidenceMetadata,
  SyntheticAuditGovernanceMetadata,
  SyntheticAuditMaterialityCompatibility,
  SyntheticAuditScope,
  SyntheticAuditTrustMetadata,
} from "../../audit/types";
import type { SyntheticKnowledgeConfidenceFloorMetadata } from "../../knowledge/contracts";

export interface BuildActionBundlePackageInput {
  phase37Handoff: SyntheticPhase37ActionHandoffArtifact | null;
  actionCandidates?: SyntheticActionCandidate[];
  workflowCandidates?: SyntheticWorkflowCandidate[];
  approvalGovernancePackages?: SyntheticApprovalGovernance[];
  executionReadinessPackages?: SyntheticExecutionReadiness[];
  bundleActionCandidateIds?: string[];
  bundleWorkflowCandidateIds?: string[];
  bundleApprovalAtomicityRequired?: boolean;
  bundleAtomicityRequired?: boolean;
  bundleRollbackPolicyReferenceIds?: string[];
  approvalGovernanceIds?: string[];
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

export interface SyntheticActionBundlePackage extends SyntheticActionBundlePackageContract {
  boundPhase37KnowledgeGraphSnapshotHash: string;
  boundPhase37MethodologySnapshotHash: string;
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

export interface BuildActionBundlePackageResult {
  actionBundlePackage: SyntheticActionBundlePackage | null;
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

function getPhase37Handoff(input: BuildActionBundlePackageInput): SyntheticPhase37ActionHandoffArtifact | null {
  return input.phase37Handoff;
}

function getActionCandidates(input: BuildActionBundlePackageInput): SyntheticActionCandidate[] {
  return getInputArray(input.actionCandidates);
}

function getWorkflowCandidates(input: BuildActionBundlePackageInput): SyntheticWorkflowCandidate[] {
  return getInputArray(input.workflowCandidates);
}

function getApprovalGovernancePackages(input: BuildActionBundlePackageInput): SyntheticApprovalGovernance[] {
  return getInputArray(input.approvalGovernancePackages);
}

function getExecutionReadinessPackages(input: BuildActionBundlePackageInput): SyntheticExecutionReadiness[] {
  return getInputArray(input.executionReadinessPackages);
}

function getBundleActionCandidateIds(input: BuildActionBundlePackageInput): string[] {
  return [
    ...getInputArray(input.bundleActionCandidateIds),
    ...getActionCandidates(input).map((actionCandidate) => actionCandidate.actionCandidateId),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.actionCandidateIds),
    ...getExecutionReadinessPackages(input).flatMap((executionReadiness) => executionReadiness.actionCandidateIds),
  ];
}

function getBundleWorkflowCandidateIds(input: BuildActionBundlePackageInput): string[] {
  return [
    ...getInputArray(input.bundleWorkflowCandidateIds),
    ...getWorkflowCandidates(input).map((workflowCandidate) => workflowCandidate.workflowCandidateId),
    ...getExecutionReadinessPackages(input).flatMap((executionReadiness) => executionReadiness.workflowCandidateIds),
  ];
}

function getApprovalGovernanceIds(input: BuildActionBundlePackageInput): string[] {
  return [
    ...getInputArray(input.approvalGovernanceIds),
    ...getApprovalGovernancePackages(input).map((approvalGovernance) => approvalGovernance.approvalGovernanceId),
    ...getExecutionReadinessPackages(input).flatMap((executionReadiness) => executionReadiness.approvalGovernanceIds),
  ];
}

function getBoundPhase37SnapshotHash(input: BuildActionBundlePackageInput): string {
  return input.boundPhase37SnapshotHash ?? getPhase37Handoff(input)?.boundPhase37SnapshotHash ?? "";
}

function getPhase38StaleMarker(input: BuildActionBundlePackageInput): SyntheticPhase38StaleMarker {
  return input.phase38StaleMarker ?? getPhase37Handoff(input)?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildActionBundlePackageInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? "bundle_metadata_preservation";
}

function getPhase37SupersessionReferenceIds(input: BuildActionBundlePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(handoff?.phase37SupersessionReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.phase37SupersessionReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.phase37SupersessionReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.phase37SupersessionReferenceIds),
    ...getExecutionReadinessPackages(input).flatMap((executionReadiness) => executionReadiness.phase37SupersessionReferenceIds),
    ...getInputArray(input.phase37SupersessionReferenceIds),
  ];
}

function getPhase37StalenessReasonReferenceIds(input: BuildActionBundlePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(handoff?.phase37StalenessReasonReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.phase37StalenessReasonReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.phase37StalenessReasonReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.phase37StalenessReasonReferenceIds),
    ...getExecutionReadinessPackages(input).flatMap((executionReadiness) => executionReadiness.phase37StalenessReasonReferenceIds),
    ...getInputArray(input.phase37StalenessReasonReferenceIds),
  ];
}

function getExecutionReady(input: BuildActionBundlePackageInput): boolean {
  if (input.executionReady !== true) return false;

  const executionReadinessPackages = getExecutionReadinessPackages(input);
  if (executionReadinessPackages.length === 0) return false;

  return executionReadinessPackages.every((executionReadiness) => executionReadiness.executionReady === true);
}

function getDerivationLineageIds(input: BuildActionBundlePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.derivationLineageIds),
    ...getBundleActionCandidateIds(input),
    ...getBundleWorkflowCandidateIds(input),
    ...getApprovalGovernanceIds(input),
    ...getExecutionReadinessPackages(input).map((executionReadiness) => executionReadiness.executionReadinessId),
    ...getInputArray(handoff?.sourceKnowledgeObjectIds),
    ...getInputArray(handoff?.sourceMethodologyObjectIds),
    ...getInputArray(handoff?.sourceMemoryObjectIds),
    ...getInputArray(handoff?.sourceEvidenceLineageGraphIds),
  ];
}

function getConfidenceFloorMetadata(input: BuildActionBundlePackageInput): SyntheticKnowledgeConfidenceFloorMetadata[] {
  return [
    ...getInputArray(input.confidenceFloorMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.confidenceFloorMetadata),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.confidenceFloorMetadata),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.confidenceFloorMetadata),
    ...getExecutionReadinessPackages(input).flatMap((executionReadiness) => executionReadiness.confidenceFloorMetadata),
    ...getInputArray(getPhase37Handoff(input)?.confidenceFloorMetadata),
  ];
}

function getSourceConfidenceReferenceIds(input: BuildActionBundlePackageInput): string[] {
  return [
    ...getInputArray(input.sourceConfidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.sourceConfidenceReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.sourceConfidenceReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.sourceConfidenceReferenceIds),
    ...getExecutionReadinessPackages(input).flatMap((executionReadiness) => executionReadiness.sourceConfidenceReferenceIds),
  ];
}

function getEvidenceReferenceIds(input: BuildActionBundlePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.evidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.evidenceReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.evidenceReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.evidenceReferenceIds),
    ...getExecutionReadinessPackages(input).flatMap((executionReadiness) => executionReadiness.evidenceReferenceIds),
    ...getInputArray(handoff?.sourceEvidenceLineageGraphIds),
  ];
}

function getLineageReferenceIds(input: BuildActionBundlePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.lineageReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.lineageReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.lineageReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.lineageReferenceIds),
    ...getExecutionReadinessPackages(input).flatMap((executionReadiness) => executionReadiness.lineageReferenceIds),
    ...getInputArray(handoff?.sourceKnowledgeObjectIds),
    ...getInputArray(handoff?.sourceMethodologyObjectIds),
    ...getInputArray(handoff?.sourceMemoryObjectIds),
  ];
}

function buildActionBundlePackageKey(input: BuildActionBundlePackageInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    bundleActionCandidateIds: getBundleActionCandidateIds(input),
    bundleWorkflowCandidateIds: getBundleWorkflowCandidateIds(input),
    bundleApprovalAtomicityRequired: input.bundleApprovalAtomicityRequired ?? false,
    bundleAtomicityRequired: input.bundleAtomicityRequired ?? false,
    bundleRollbackPolicyReferenceIds: getInputArray(input.bundleRollbackPolicyReferenceIds),
    approvalGovernanceIds: getApprovalGovernanceIds(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    boundPhase37KnowledgeGraphSnapshotHash: handoff?.knowledgeGraphSnapshotHash ?? null,
    boundPhase37MethodologySnapshotHash: handoff?.methodologySnapshotHash ?? null,
    phase37SupersessionReferenceIds: getPhase37SupersessionReferenceIds(input),
    phase37StalenessReasonReferenceIds: getPhase37StalenessReasonReferenceIds(input),
    executionReady: getExecutionReady(input),
    companyId: handoff?.companyId ?? null,
    scope: handoff?.scope ?? null,
    customerIsolation: handoff?.customerIsolation ?? null,
    firmIsolation: handoff?.firmIsolation ?? null,
    clientIsolation: handoff?.clientIsolation ?? null,
  });
}

function buildActionBundlePackageId(input: BuildActionBundlePackageInput): string {
  return `synthetic-action-bundle-package:${stableSnapshotHash({
    actionBundlePackageKey: buildActionBundlePackageKey(input),
    bundleActionCandidateIds: getBundleActionCandidateIds(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
  })}`;
}

function buildDerivationHash(input: BuildActionBundlePackageInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    derivationMethod: getDerivationMethod(input),
    bundleActionCandidateIds: getBundleActionCandidateIds(input),
    bundleWorkflowCandidateIds: getBundleWorkflowCandidateIds(input),
    approvalGovernanceIds: getApprovalGovernanceIds(input),
    knowledgePackageHandle: handoff?.knowledgePackageHandle ?? null,
    methodologyPackageHandle: handoff?.methodologyPackageHandle ?? null,
    derivationLineageIds: getDerivationLineageIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
  });
}

function validateActionBundlePackageInput(input: BuildActionBundlePackageInput): string[] {
  const warnings: string[] = [];
  const handoff = getPhase37Handoff(input);
  const bundleActionCandidateIds = getBundleActionCandidateIds(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);

  if (!handoff) warnings.push("phase37Handoff is required.");
  if (!hasValue(boundPhase37SnapshotHash)) warnings.push("boundPhase37SnapshotHash is required.");
  if (bundleActionCandidateIds.length === 0) warnings.push("at least one bundleActionCandidateId is required.");
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

  getWorkflowCandidates(input).forEach((workflowCandidate, index) => {
    if (!hasValue(workflowCandidate.workflowCandidateId)) warnings.push(`workflowCandidates[${index}].workflowCandidateId is required.`);
    if (workflowCandidate.executable !== false) warnings.push(`workflowCandidates[${index}].executable must be false.`);
    if (workflowCandidate.companyId !== handoff.companyId) warnings.push(`workflowCandidates[${index}].companyId must equal phase37Handoff.companyId.`);
  });

  return warnings;
}

export function buildActionBundlePackage(input: BuildActionBundlePackageInput): BuildActionBundlePackageResult {
  const fatalWarnings = validateActionBundlePackageInput(input);
  const handoff = getPhase37Handoff(input);

  if (fatalWarnings.length > 0 || !handoff) {
    return {
      actionBundlePackage: null,
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
    ...getExecutionReadinessPackages(input).flatMap((executionReadiness, index) =>
      executionReadiness.warnings.map((warning) => `executionReadinessPackages[${index}]: ${warning}`),
    ),
  ];

  return {
    actionBundlePackage: {
      actionBundlePackageId: buildActionBundlePackageId(input),
      actionBundlePackageKey: buildActionBundlePackageKey(input),
      bundleActionCandidateIds: getBundleActionCandidateIds(input),
      bundleWorkflowCandidateIds: getBundleWorkflowCandidateIds(input),
      bundleApprovalAtomicityRequired: input.bundleApprovalAtomicityRequired ?? false,
      bundleAtomicityRequired: input.bundleAtomicityRequired ?? false,
      bundleRollbackPolicyReferenceIds: getInputArray(input.bundleRollbackPolicyReferenceIds),
      approvalGovernanceIds: getApprovalGovernanceIds(input),
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
        ...getExecutionReadinessPackages(input).flatMap((executionReadiness) => executionReadiness.trustMetadata),
      ],
      confidenceMetadata: [
        ...getInputArray(handoff.confidenceMetadata),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.confidenceMetadata),
        ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.confidenceMetadata),
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.confidenceMetadata),
        ...getExecutionReadinessPackages(input).flatMap((executionReadiness) => executionReadiness.confidenceMetadata),
      ],
      governanceMetadata: [
        ...handoff.governanceMetadata,
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.governanceMetadata),
        ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.governanceMetadata),
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.governanceMetadata),
        ...getExecutionReadinessPackages(input).flatMap((executionReadiness) => executionReadiness.governanceMetadata),
      ],
      materialityMetadata: [
        ...getInputArray(handoff.materialityMetadata),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.materialityMetadata),
        ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.materialityMetadata),
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.materialityMetadata),
        ...getExecutionReadinessPackages(input).flatMap((executionReadiness) => executionReadiness.materialityMetadata),
      ],
      warnings,
      skippedIndexes: getInputArray(input.skippedIndexes),
    },
    skipped: false,
    warnings,
  };
}
