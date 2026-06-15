import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticActionCandidateContract,
  SyntheticActionConfidenceFloorMetadata,
  SyntheticActionDerivationMethod,
  SyntheticActionReversibilityClass,
  SyntheticActionTriggerCategory,
  SyntheticPhase38StaleMarker,
} from "../contracts";
import type {
  SyntheticAuditConfidenceMetadata,
  SyntheticAuditMaterialityCompatibility,
  SyntheticAuditScope,
} from "../../audit/types";
import type {
  SyntheticKnowledgeConfidenceFloorMetadata,
  SyntheticPhase38HandoffContract,
} from "../../knowledge/contracts";
import type { SyntheticMemoryObjectIsolationDimension } from "../../organizational-memory/memory-object";

export const SYNTHETIC_ACTION_TRIGGER_CATEGORIES: SyntheticActionTriggerCategory[] = [
  "methodology_derived",
  "knowledge_pattern_derived",
  "memory_continuity_derived",
  "user_request_derived",
  "cross_period_derived",
  "cross_entity_derived",
  "cross_function_derived",
];

export const SYNTHETIC_ACTION_REVERSIBILITY_CLASSES: SyntheticActionReversibilityClass[] = [
  "reversible",
  "compensatable",
  "irreversible",
];

export interface SyntheticPhase37ActionHandoffArtifact extends SyntheticPhase38HandoffContract {
  companyId: string;
  scope: SyntheticAuditScope;
  boundPhase37SnapshotHash?: string;
  phase37SupersessionReferenceIds?: string[];
  phase37StalenessReasonReferenceIds?: string[];
  phase38StaleMarker?: SyntheticPhase38StaleMarker;
  confidenceMetadata?: SyntheticAuditConfidenceMetadata[];
  materialityMetadata?: SyntheticAuditMaterialityCompatibility[];
}

export interface BuildActionCandidateInput {
  phase37Handoff: SyntheticPhase37ActionHandoffArtifact | null;
  actionTriggerCategory: SyntheticActionTriggerCategory;
  reversibilityClass: SyntheticActionReversibilityClass;
  derivationMethod?: SyntheticActionDerivationMethod;
  reversalActionCandidateIds?: string[];
  compensationActionCandidateIds?: string[];
  alternativeActionCandidateIds?: string[];
  counterfactualActionCandidateIds?: string[];
  mutuallyExclusiveActionCandidateIds?: string[];
  riskReferenceIds?: string[];
  riskMetadataReferenceIds?: string[];
  rejectionReasonReferenceIds?: string[];
  withdrawalReasonReferenceIds?: string[];
  rejectionAuthorityReferenceIds?: string[];
  withdrawalAuthorityReferenceIds?: string[];
  actionConfidenceFloorMetadata?: SyntheticActionConfidenceFloorMetadata[];
  sourceKnowledgeConfidenceReferenceIds?: string[];
  sourceMethodologyConfidenceReferenceIds?: string[];
  confidenceFloorMetadata?: SyntheticKnowledgeConfidenceFloorMetadata[];
  sourceConfidenceReferenceIds?: string[];
  evidenceReferenceIds?: string[];
  lineageReferenceIds?: string[];
  derivationLineageIds?: string[];
  phase37SupersessionReferenceIds?: string[];
  phase37StalenessReasonReferenceIds?: string[];
  phase38StaleMarker?: SyntheticPhase38StaleMarker;
  skippedIndexes?: number[];
}

export interface SyntheticActionCandidate extends SyntheticActionCandidateContract {
  actionCandidateId: string;
  actionCandidateKey: string;
}

export interface BuildActionCandidateResult {
  actionCandidate: SyntheticActionCandidate | null;
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

function isSupportedActionTriggerCategory(actionTriggerCategory: SyntheticActionTriggerCategory): boolean {
  return SYNTHETIC_ACTION_TRIGGER_CATEGORIES.includes(actionTriggerCategory);
}

function isSupportedReversibilityClass(reversibilityClass: SyntheticActionReversibilityClass): boolean {
  return SYNTHETIC_ACTION_REVERSIBILITY_CLASSES.includes(reversibilityClass);
}

function getPhase37Handoff(input: BuildActionCandidateInput): SyntheticPhase37ActionHandoffArtifact | null {
  return input.phase37Handoff;
}

function getBoundPhase37SnapshotHash(input: BuildActionCandidateInput): string {
  const handoff = getPhase37Handoff(input);
  if (!handoff) return "";
  if (hasValue(handoff.boundPhase37SnapshotHash)) return handoff.boundPhase37SnapshotHash ?? "";

  return stableSnapshotHash({
    knowledgePackageHandle: handoff.knowledgePackageHandle,
    methodologyPackageHandle: handoff.methodologyPackageHandle,
    knowledgeGraphSnapshotHash: handoff.knowledgeGraphSnapshotHash,
    methodologySnapshotHash: handoff.methodologySnapshotHash,
  });
}

function getDerivationMethod(input: BuildActionCandidateInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.actionTriggerCategory;
}

function getPhase37SupersessionReferenceIds(input: BuildActionCandidateInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(handoff?.phase37SupersessionReferenceIds),
    ...getInputArray(input.phase37SupersessionReferenceIds),
  ];
}

function getPhase37StalenessReasonReferenceIds(input: BuildActionCandidateInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(handoff?.phase37StalenessReasonReferenceIds),
    ...getInputArray(input.phase37StalenessReasonReferenceIds),
  ];
}

function getPhase38StaleMarker(input: BuildActionCandidateInput): SyntheticPhase38StaleMarker {
  return input.phase38StaleMarker ?? getPhase37Handoff(input)?.phase38StaleMarker ?? "current";
}

function getConfidenceFloorMetadata(input: BuildActionCandidateInput): SyntheticKnowledgeConfidenceFloorMetadata[] {
  const handoff = getPhase37Handoff(input);
  return [...getInputArray(handoff?.confidenceFloorMetadata), ...getInputArray(input.confidenceFloorMetadata)];
}

function getSourceConfidenceReferenceIds(input: BuildActionCandidateInput): string[] {
  return [
    ...getInputArray(input.sourceConfidenceReferenceIds),
    ...getConfidenceFloorMetadata(input).flatMap((metadata) => metadata.sourceConfidenceReferenceIds),
  ];
}

function getSourceKnowledgeConfidenceReferenceIds(input: BuildActionCandidateInput): string[] {
  return [
    ...getInputArray(input.sourceKnowledgeConfidenceReferenceIds),
    ...getInputArray(input.actionConfidenceFloorMetadata).flatMap((metadata) => metadata.sourceKnowledgeConfidenceReferenceIds),
  ];
}

function getSourceMethodologyConfidenceReferenceIds(input: BuildActionCandidateInput): string[] {
  return [
    ...getInputArray(input.sourceMethodologyConfidenceReferenceIds),
    ...getInputArray(input.actionConfidenceFloorMetadata).flatMap((metadata) => metadata.sourceMethodologyConfidenceReferenceIds),
  ];
}

function getEvidenceReferenceIds(input: BuildActionCandidateInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [...getInputArray(handoff?.sourceEvidenceLineageGraphIds), ...getInputArray(input.evidenceReferenceIds)];
}

function getLineageReferenceIds(input: BuildActionCandidateInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(handoff?.sourceKnowledgeObjectIds),
    ...getInputArray(handoff?.sourceMethodologyObjectIds),
    ...getInputArray(handoff?.sourceMemoryObjectIds),
    ...getInputArray(input.lineageReferenceIds),
  ];
}

function getDerivationLineageIds(input: BuildActionCandidateInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.derivationLineageIds),
    ...getInputArray(handoff?.sourceKnowledgeObjectIds),
    ...getInputArray(handoff?.sourceMethodologyObjectIds),
    ...getInputArray(handoff?.sourceMemoryObjectIds),
    ...getInputArray(handoff?.sourceEvidenceLineageGraphIds),
  ];
}

function buildActionCandidateKey(input: BuildActionCandidateInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    actionTriggerCategory: input.actionTriggerCategory,
    reversibilityClass: input.reversibilityClass,
    derivationMethod: getDerivationMethod(input),
    companyId: handoff?.companyId ?? null,
    scope: handoff?.scope ?? null,
    customerIsolation: handoff?.customerIsolation ?? null,
    firmIsolation: handoff?.firmIsolation ?? null,
    clientIsolation: handoff?.clientIsolation ?? null,
    knowledgePackageHandle: handoff?.knowledgePackageHandle ?? null,
    methodologyPackageHandle: handoff?.methodologyPackageHandle ?? null,
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    boundPhase37KnowledgeGraphSnapshotHash: handoff?.knowledgeGraphSnapshotHash ?? null,
    boundPhase37MethodologySnapshotHash: handoff?.methodologySnapshotHash ?? null,
    phase37SupersessionReferenceIds: getPhase37SupersessionReferenceIds(input),
    phase37StalenessReasonReferenceIds: getPhase37StalenessReasonReferenceIds(input),
    sourceKnowledgeObjectIds: handoff?.sourceKnowledgeObjectIds ?? [],
    sourceMethodologyObjectIds: handoff?.sourceMethodologyObjectIds ?? [],
    sourceMemoryObjectIds: handoff?.sourceMemoryObjectIds ?? [],
    sourceEvidenceLineageGraphIds: handoff?.sourceEvidenceLineageGraphIds ?? [],
    reversalActionCandidateIds: getInputArray(input.reversalActionCandidateIds),
    compensationActionCandidateIds: getInputArray(input.compensationActionCandidateIds),
    alternativeActionCandidateIds: getInputArray(input.alternativeActionCandidateIds),
    counterfactualActionCandidateIds: getInputArray(input.counterfactualActionCandidateIds),
    mutuallyExclusiveActionCandidateIds: getInputArray(input.mutuallyExclusiveActionCandidateIds),
    riskReferenceIds: getInputArray(input.riskReferenceIds),
    riskMetadataReferenceIds: getInputArray(input.riskMetadataReferenceIds),
  });
}

function buildActionCandidateId(input: BuildActionCandidateInput): string {
  return `synthetic-action-candidate:${stableSnapshotHash({
    actionCandidateKey: buildActionCandidateKey(input),
    actionTriggerCategory: input.actionTriggerCategory,
    reversibilityClass: input.reversibilityClass,
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
  })}`;
}

function buildDerivationHash(input: BuildActionCandidateInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    actionTriggerCategory: input.actionTriggerCategory,
    derivationMethod: getDerivationMethod(input),
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

function validateActionCandidateInput(input: BuildActionCandidateInput): string[] {
  const warnings: string[] = [];
  const handoff = getPhase37Handoff(input);

  if (!handoff) warnings.push("phase37Handoff is required.");
  if (!hasValue(input.actionTriggerCategory)) warnings.push("actionTriggerCategory is required.");
  if (!isSupportedActionTriggerCategory(input.actionTriggerCategory)) warnings.push("actionTriggerCategory must be supported.");
  if (!hasValue(input.reversibilityClass)) warnings.push("reversibilityClass is required.");
  if (!isSupportedReversibilityClass(input.reversibilityClass)) warnings.push("reversibilityClass must be supported.");
  if (!handoff) return warnings;

  if (!hasValue(handoff.companyId)) warnings.push("phase37Handoff.companyId is required.");
  if (!handoff.scope) warnings.push("phase37Handoff.scope is required.");
  if (!hasValue(handoff.knowledgePackageHandle)) warnings.push("phase37Handoff.knowledgePackageHandle is required.");
  if (!hasValue(handoff.methodologyPackageHandle)) warnings.push("phase37Handoff.methodologyPackageHandle is required.");
  if (!hasValue(handoff.knowledgeGraphSnapshotHash)) warnings.push("phase37Handoff.knowledgeGraphSnapshotHash is required.");
  if (!hasValue(handoff.methodologySnapshotHash)) warnings.push("phase37Handoff.methodologySnapshotHash is required.");
  if (handoff.phase38MayConsume !== true) warnings.push("phase37Handoff.phase38MayConsume must be true.");
  if (handoff.phase38MayMutate !== false) warnings.push("phase37Handoff.phase38MayMutate must be false.");
  if (handoff.phase38MayWriteBack !== false) warnings.push("phase37Handoff.phase38MayWriteBack must be false.");

  validateIsolationDimension(handoff.customerIsolation, "phase37Handoff.customerIsolation", warnings);
  validateIsolationDimension(handoff.firmIsolation, "phase37Handoff.firmIsolation", warnings);
  validateIsolationDimension(handoff.clientIsolation, "phase37Handoff.clientIsolation", warnings);

  if (getDerivationLineageIds(input).length === 0) warnings.push("at least one Phase 37 lineage reference is required.");

  return warnings;
}

export function buildActionCandidate(input: BuildActionCandidateInput): BuildActionCandidateResult {
  const fatalWarnings = validateActionCandidateInput(input);
  const handoff = getPhase37Handoff(input);

  if (fatalWarnings.length > 0 || !handoff) {
    return {
      actionCandidate: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const warnings = [
    ...getStringArrayProperty(handoff, "warnings").map((warning) => `phase37Handoff: ${warning}`),
  ];

  return {
    actionCandidate: {
      actionCandidateId: buildActionCandidateId(input),
      actionCandidateKey: buildActionCandidateKey(input),
      actionTriggerCategory: input.actionTriggerCategory,
      reversibilityClass: input.reversibilityClass,
      reversalActionCandidateIds: getInputArray(input.reversalActionCandidateIds),
      compensationActionCandidateIds: getInputArray(input.compensationActionCandidateIds),
      alternativeActionCandidateIds: getInputArray(input.alternativeActionCandidateIds),
      counterfactualActionCandidateIds: getInputArray(input.counterfactualActionCandidateIds),
      mutuallyExclusiveActionCandidateIds: getInputArray(input.mutuallyExclusiveActionCandidateIds),
      riskReferenceIds: getInputArray(input.riskReferenceIds),
      riskMetadataReferenceIds: getInputArray(input.riskMetadataReferenceIds),
      rejectionReasonReferenceIds: getInputArray(input.rejectionReasonReferenceIds),
      withdrawalReasonReferenceIds: getInputArray(input.withdrawalReasonReferenceIds),
      rejectionAuthorityReferenceIds: getInputArray(input.rejectionAuthorityReferenceIds),
      withdrawalAuthorityReferenceIds: getInputArray(input.withdrawalAuthorityReferenceIds),
      actionConfidenceFloorMetadata: getInputArray(input.actionConfidenceFloorMetadata),
      sourceKnowledgeConfidenceReferenceIds: getSourceKnowledgeConfidenceReferenceIds(input),
      sourceMethodologyConfidenceReferenceIds: getSourceMethodologyConfidenceReferenceIds(input),
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
      trustMetadata: handoff.trustMetadata,
      confidenceMetadata: getInputArray(handoff.confidenceMetadata),
      governanceMetadata: handoff.governanceMetadata,
      materialityMetadata: getInputArray(handoff.materialityMetadata),
      warnings,
      skippedIndexes: getInputArray(input.skippedIndexes),
    },
    skipped: false,
    warnings,
  };
}
