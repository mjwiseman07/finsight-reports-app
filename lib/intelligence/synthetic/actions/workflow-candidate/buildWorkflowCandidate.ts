import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticActionDerivationMethod,
  SyntheticActionReversibilityClass,
  SyntheticPhase38StaleMarker,
  SyntheticWorkflowCandidateContract,
  SyntheticWorkflowTriggerCategory,
} from "../contracts";
import type { SyntheticActionCandidate, SyntheticPhase37ActionHandoffArtifact } from "../action-candidate";
import type {
  SyntheticAuditConfidenceMetadata,
  SyntheticAuditMaterialityCompatibility,
  SyntheticAuditScope,
  SyntheticAuditTrustMetadata,
} from "../../audit/types";
import type { SyntheticKnowledgeConfidenceFloorMetadata } from "../../knowledge/contracts";
import type { SyntheticMemoryObjectIsolationDimension } from "../../organizational-memory/memory-object";

export const SYNTHETIC_WORKFLOW_TRIGGER_CATEGORIES: SyntheticWorkflowTriggerCategory[] = [
  "methodology_derived",
  "knowledge_pattern_derived",
  "memory_continuity_derived",
  "user_request_derived",
  "cross_period_derived",
  "cross_entity_derived",
  "cross_function_derived",
];

export const SYNTHETIC_WORKFLOW_REVERSIBILITY_CLASSES: SyntheticActionReversibilityClass[] = [
  "reversible",
  "compensatable",
  "irreversible",
];

export interface BuildWorkflowCandidateInput {
  phase37Handoff: SyntheticPhase37ActionHandoffArtifact | null;
  actionCandidates?: SyntheticActionCandidate[];
  actionCandidateIds?: string[];
  workflowTriggerCategory: SyntheticWorkflowTriggerCategory;
  reversibilityClass: SyntheticActionReversibilityClass;
  derivationMethod?: SyntheticActionDerivationMethod;
  boundPhase37SnapshotHash?: string;
  reversalWorkflowCandidateIds?: string[];
  compensationWorkflowCandidateIds?: string[];
  alternativeWorkflowCandidateIds?: string[];
  riskReferenceIds?: string[];
  riskMetadataReferenceIds?: string[];
  rejectionReasonReferenceIds?: string[];
  withdrawalReasonReferenceIds?: string[];
  rejectionAuthorityReferenceIds?: string[];
  withdrawalAuthorityReferenceIds?: string[];
  phase37SupersessionReferenceIds?: string[];
  phase37StalenessReasonReferenceIds?: string[];
  phase38StaleMarker?: SyntheticPhase38StaleMarker;
  derivationLineageIds?: string[];
  confidenceFloorMetadata?: SyntheticKnowledgeConfidenceFloorMetadata[];
  sourceConfidenceReferenceIds?: string[];
  evidenceReferenceIds?: string[];
  lineageReferenceIds?: string[];
  skippedIndexes?: number[];
}

export interface SyntheticWorkflowCandidate extends SyntheticWorkflowCandidateContract {
  riskMetadataReferenceIds: string[];
  rejectionAuthorityReferenceIds: string[];
  withdrawalAuthorityReferenceIds: string[];
  boundPhase37KnowledgeGraphSnapshotHash: string;
  phase37SupersessionReferenceIds: string[];
  phase37StalenessReasonReferenceIds: string[];
  scope: SyntheticAuditScope;
  derivationMethod: SyntheticActionDerivationMethod;
  sourceConfidenceReferenceIds: string[];
  evidenceReferenceIds: string[];
  lineageReferenceIds: string[];
  trustMetadata: SyntheticAuditTrustMetadata[];
  confidenceMetadata: SyntheticAuditConfidenceMetadata[];
  materialityMetadata: SyntheticAuditMaterialityCompatibility[];
}

export interface BuildWorkflowCandidateResult {
  workflowCandidate: SyntheticWorkflowCandidate | null;
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

function isSupportedWorkflowTriggerCategory(workflowTriggerCategory: SyntheticWorkflowTriggerCategory): boolean {
  return SYNTHETIC_WORKFLOW_TRIGGER_CATEGORIES.includes(workflowTriggerCategory);
}

function isSupportedReversibilityClass(reversibilityClass: SyntheticActionReversibilityClass): boolean {
  return SYNTHETIC_WORKFLOW_REVERSIBILITY_CLASSES.includes(reversibilityClass);
}

function getPhase37Handoff(input: BuildWorkflowCandidateInput): SyntheticPhase37ActionHandoffArtifact | null {
  return input.phase37Handoff;
}

function getActionCandidates(input: BuildWorkflowCandidateInput): SyntheticActionCandidate[] {
  return getInputArray(input.actionCandidates);
}

function getActionCandidateIds(input: BuildWorkflowCandidateInput): string[] {
  return [
    ...getInputArray(input.actionCandidateIds),
    ...getActionCandidates(input).map((actionCandidate) => actionCandidate.actionCandidateId),
  ];
}

function getBoundPhase37SnapshotHash(input: BuildWorkflowCandidateInput): string {
  return input.boundPhase37SnapshotHash ?? getPhase37Handoff(input)?.boundPhase37SnapshotHash ?? "";
}

function getDerivationMethod(input: BuildWorkflowCandidateInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.workflowTriggerCategory;
}

function getPhase37SupersessionReferenceIds(input: BuildWorkflowCandidateInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(handoff?.phase37SupersessionReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.phase37SupersessionReferenceIds),
    ...getInputArray(input.phase37SupersessionReferenceIds),
  ];
}

function getPhase37StalenessReasonReferenceIds(input: BuildWorkflowCandidateInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(handoff?.phase37StalenessReasonReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.phase37StalenessReasonReferenceIds),
    ...getInputArray(input.phase37StalenessReasonReferenceIds),
  ];
}

function getPhase38StaleMarker(input: BuildWorkflowCandidateInput): SyntheticPhase38StaleMarker {
  return input.phase38StaleMarker ?? getPhase37Handoff(input)?.phase38StaleMarker ?? "current";
}

function getDerivationLineageIds(input: BuildWorkflowCandidateInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.derivationLineageIds),
    ...getActionCandidateIds(input),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.derivationLineageIds),
    ...getInputArray(handoff?.sourceKnowledgeObjectIds),
    ...getInputArray(handoff?.sourceMethodologyObjectIds),
    ...getInputArray(handoff?.sourceMemoryObjectIds),
    ...getInputArray(handoff?.sourceEvidenceLineageGraphIds),
  ];
}

function getConfidenceFloorMetadata(input: BuildWorkflowCandidateInput): SyntheticKnowledgeConfidenceFloorMetadata[] {
  return [
    ...getInputArray(input.confidenceFloorMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.confidenceFloorMetadata),
    ...getInputArray(getPhase37Handoff(input)?.confidenceFloorMetadata),
  ];
}

function getSourceConfidenceReferenceIds(input: BuildWorkflowCandidateInput): string[] {
  return [
    ...getInputArray(input.sourceConfidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.sourceConfidenceReferenceIds),
  ];
}

function getEvidenceReferenceIds(input: BuildWorkflowCandidateInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.evidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.evidenceReferenceIds),
    ...getInputArray(handoff?.sourceEvidenceLineageGraphIds),
  ];
}

function getLineageReferenceIds(input: BuildWorkflowCandidateInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.lineageReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.lineageReferenceIds),
    ...getInputArray(handoff?.sourceKnowledgeObjectIds),
    ...getInputArray(handoff?.sourceMethodologyObjectIds),
    ...getInputArray(handoff?.sourceMemoryObjectIds),
  ];
}

function getRiskReferenceIds(input: BuildWorkflowCandidateInput): string[] {
  return [
    ...getInputArray(input.riskReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.riskReferenceIds),
  ];
}

function getRiskMetadataReferenceIds(input: BuildWorkflowCandidateInput): string[] {
  return [
    ...getInputArray(input.riskMetadataReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.riskMetadataReferenceIds),
  ];
}

function buildWorkflowCandidateKey(input: BuildWorkflowCandidateInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    workflowTriggerCategory: input.workflowTriggerCategory,
    reversibilityClass: input.reversibilityClass,
    derivationMethod: getDerivationMethod(input),
    actionCandidateIds: getActionCandidateIds(input),
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
    reversalWorkflowCandidateIds: getInputArray(input.reversalWorkflowCandidateIds),
    compensationWorkflowCandidateIds: getInputArray(input.compensationWorkflowCandidateIds),
    alternativeWorkflowCandidateIds: getInputArray(input.alternativeWorkflowCandidateIds),
    riskReferenceIds: getRiskReferenceIds(input),
    riskMetadataReferenceIds: getRiskMetadataReferenceIds(input),
  });
}

function buildWorkflowCandidateId(input: BuildWorkflowCandidateInput): string {
  return `synthetic-workflow-candidate:${stableSnapshotHash({
    workflowCandidateKey: buildWorkflowCandidateKey(input),
    workflowTriggerCategory: input.workflowTriggerCategory,
    reversibilityClass: input.reversibilityClass,
    actionCandidateIds: getActionCandidateIds(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
  })}`;
}

function buildDerivationHash(input: BuildWorkflowCandidateInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    workflowTriggerCategory: input.workflowTriggerCategory,
    derivationMethod: getDerivationMethod(input),
    actionCandidateIds: getActionCandidateIds(input),
    knowledgePackageHandle: handoff?.knowledgePackageHandle ?? null,
    methodologyPackageHandle: handoff?.methodologyPackageHandle ?? null,
    derivationLineageIds: getDerivationLineageIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
  });
}

function validateIsolationDimension(
  dimension: SyntheticMemoryObjectIsolationDimension | undefined,
  dimensionName: string,
  warnings: string[],
): void {
  if (!dimension) {
    warnings.push(`${dimensionName} is required.`);
    return;
  }

  if (!Array.isArray(dimension.referenceIds)) warnings.push(`${dimensionName}.referenceIds must be an array.`);
  if (Array.isArray(dimension.referenceIds) && dimension.referenceIds.length === 0) {
    warnings.push(`${dimensionName}.referenceIds are required.`);
  }
}

function validateWorkflowCandidateInput(input: BuildWorkflowCandidateInput): string[] {
  const warnings: string[] = [];
  const handoff = getPhase37Handoff(input);
  const actionCandidateIds = getActionCandidateIds(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);

  if (!handoff) warnings.push("phase37Handoff is required.");
  if (!hasValue(input.workflowTriggerCategory)) warnings.push("workflowTriggerCategory is required.");
  if (!isSupportedWorkflowTriggerCategory(input.workflowTriggerCategory)) warnings.push("workflowTriggerCategory must be supported.");
  if (!hasValue(input.reversibilityClass)) warnings.push("reversibilityClass is required.");
  if (!isSupportedReversibilityClass(input.reversibilityClass)) warnings.push("reversibilityClass must be supported.");
  if (!hasValue(boundPhase37SnapshotHash)) warnings.push("boundPhase37SnapshotHash is required.");
  if (actionCandidateIds.length === 0) warnings.push("at least one actionCandidateId is required.");
  if (!handoff) return warnings;

  if (!hasValue(handoff.companyId)) warnings.push("phase37Handoff.companyId is required.");
  if (!handoff.scope) warnings.push("phase37Handoff.scope is required.");
  if (!hasValue(handoff.knowledgeGraphSnapshotHash)) warnings.push("phase37Handoff.knowledgeGraphSnapshotHash is required.");
  if (!hasValue(handoff.methodologySnapshotHash)) warnings.push("phase37Handoff.methodologySnapshotHash is required.");
  if (handoff.phase38MayConsume !== true) warnings.push("phase37Handoff.phase38MayConsume must be true.");
  if (handoff.phase38MayMutate !== false) warnings.push("phase37Handoff.phase38MayMutate must be false.");
  if (handoff.phase38MayWriteBack !== false) warnings.push("phase37Handoff.phase38MayWriteBack must be false.");

  validateIsolationDimension(handoff.customerIsolation, "phase37Handoff.customerIsolation", warnings);
  validateIsolationDimension(handoff.firmIsolation, "phase37Handoff.firmIsolation", warnings);
  validateIsolationDimension(handoff.clientIsolation, "phase37Handoff.clientIsolation", warnings);

  getActionCandidates(input).forEach((actionCandidate, index) => {
    if (!hasValue(actionCandidate.actionCandidateId)) warnings.push(`actionCandidates[${index}].actionCandidateId is required.`);
    if (!hasValue(actionCandidate.actionCandidateKey)) warnings.push(`actionCandidates[${index}].actionCandidateKey is required.`);
    if (actionCandidate.executable !== false) warnings.push(`actionCandidates[${index}].executable must be false.`);
    if (actionCandidate.companyId !== handoff.companyId) warnings.push(`actionCandidates[${index}].companyId must equal phase37Handoff.companyId.`);
    if (actionCandidate.boundPhase37SnapshotHash !== boundPhase37SnapshotHash) {
      warnings.push(`actionCandidates[${index}].boundPhase37SnapshotHash must equal boundPhase37SnapshotHash.`);
    }
  });

  return warnings;
}

export function buildWorkflowCandidate(input: BuildWorkflowCandidateInput): BuildWorkflowCandidateResult {
  const fatalWarnings = validateWorkflowCandidateInput(input);
  const handoff = getPhase37Handoff(input);

  if (fatalWarnings.length > 0 || !handoff) {
    return {
      workflowCandidate: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const warnings = [
    ...getStringArrayProperty(handoff, "warnings").map((warning) => `phase37Handoff: ${warning}`),
    ...getActionCandidates(input).flatMap((actionCandidate, index) =>
      actionCandidate.warnings.map((warning) => `actionCandidates[${index}]: ${warning}`),
    ),
  ];

  return {
    workflowCandidate: {
      workflowCandidateId: buildWorkflowCandidateId(input),
      workflowCandidateKey: buildWorkflowCandidateKey(input),
      actionCandidateIds: getActionCandidateIds(input),
      workflowTriggerCategory: input.workflowTriggerCategory,
      reversibilityClass: input.reversibilityClass,
      reversalWorkflowCandidateIds: getInputArray(input.reversalWorkflowCandidateIds),
      compensationWorkflowCandidateIds: getInputArray(input.compensationWorkflowCandidateIds),
      alternativeWorkflowCandidateIds: getInputArray(input.alternativeWorkflowCandidateIds),
      riskReferenceIds: getRiskReferenceIds(input),
      riskMetadataReferenceIds: getRiskMetadataReferenceIds(input),
      rejectionReasonReferenceIds: [
        ...getInputArray(input.rejectionReasonReferenceIds),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.rejectionReasonReferenceIds),
      ],
      withdrawalReasonReferenceIds: [
        ...getInputArray(input.withdrawalReasonReferenceIds),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.withdrawalReasonReferenceIds),
      ],
      rejectionAuthorityReferenceIds: [
        ...getInputArray(input.rejectionAuthorityReferenceIds),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.rejectionAuthorityReferenceIds),
      ],
      withdrawalAuthorityReferenceIds: [
        ...getInputArray(input.withdrawalAuthorityReferenceIds),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.withdrawalAuthorityReferenceIds),
      ],
      boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
      boundPhase37KnowledgeGraphSnapshotHash: handoff.knowledgeGraphSnapshotHash,
      boundPhase37MethodologySnapshotHash: handoff.methodologySnapshotHash,
      phase37SupersessionReferenceIds: getPhase37SupersessionReferenceIds(input),
      phase37StalenessReasonReferenceIds: getPhase37StalenessReasonReferenceIds(input),
      phase38StaleMarker: getPhase38StaleMarker(input),
      executable: false,
      executionReady: false,
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
      ],
      confidenceMetadata: [
        ...getInputArray(handoff.confidenceMetadata),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.confidenceMetadata),
      ],
      governanceMetadata: [
        ...handoff.governanceMetadata,
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.governanceMetadata),
      ],
      materialityMetadata: [
        ...getInputArray(handoff.materialityMetadata),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.materialityMetadata),
      ],
      warnings,
      skippedIndexes: getInputArray(input.skippedIndexes),
    },
    skipped: false,
    warnings,
  };
}
