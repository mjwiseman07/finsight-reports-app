import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticKnowledgeConfidenceFloorMetadata,
  SyntheticKnowledgeDerivationMethod,
  SyntheticKnowledgeRelationshipCategory,
  SyntheticKnowledgeRelationshipContract,
  SyntheticKnowledgeRelationshipType,
  SyntheticKnowledgeStaleMarker,
  SyntheticKnowledgeValidityWindow,
} from "../contracts";
import type { SyntheticKnowledgeObject } from "../knowledge-object";
import type {
  SyntheticAuditConfidenceMetadata,
  SyntheticAuditGovernanceMetadata,
  SyntheticAuditLearningCompatibility,
  SyntheticAuditMaterialityCompatibility,
  SyntheticAuditMemoryCompatibility,
  SyntheticAuditPackageCompatibility,
  SyntheticAuditPersonaCompatibility,
  SyntheticAuditScope,
  SyntheticAuditSurfaceCompatibility,
  SyntheticAuditTrustMetadata,
} from "../../audit/types";
import type { SyntheticEvidenceLineageGraph } from "../../organizational-memory/evidence-lineage-graph";
import type { SyntheticMemoryObject, SyntheticMemoryObjectIsolationDimension } from "../../organizational-memory/memory-object";
import type { SyntheticMemoryRelationship } from "../../organizational-memory/memory-relationship";
import type { SyntheticOrganizationalMemoryGraph } from "../../organizational-memory/organizational-memory-graph";

export const SYNTHETIC_KNOWLEDGE_RELATIONSHIP_CATEGORIES: SyntheticKnowledgeRelationshipCategory[] = [
  "knowledge_derivation_relationship",
  "knowledge_context_relationship",
  "knowledge_evidence_relationship",
  "knowledge_memory_relationship",
  "knowledge_methodology_context_relationship",
];

export const SYNTHETIC_KNOWLEDGE_RELATIONSHIP_TYPES: SyntheticKnowledgeRelationshipType[] = [
  "derived_from",
  "contextualizes",
  "preserves_relationship",
  "supports",
  "supersedes",
  "is_superseded_by",
];

export interface BuildKnowledgeRelationshipInput {
  sourceKnowledgeObject: SyntheticKnowledgeObject | null;
  targetKnowledgeObject: SyntheticKnowledgeObject | null;
  relationshipCategory: SyntheticKnowledgeRelationshipCategory;
  relationshipType: SyntheticKnowledgeRelationshipType;
  crossScopeReference?: boolean;
  memoryRelationships?: SyntheticMemoryRelationship[];
  memoryObjects?: SyntheticMemoryObject[];
  evidenceLineageGraphs?: SyntheticEvidenceLineageGraph[];
  organizationalMemoryGraphs?: SyntheticOrganizationalMemoryGraph[];
  healthcarePpdObservationIds?: string[];
  payrollObservationIds?: string[];
  methodologyObservationIds?: string[];
}

export interface SyntheticKnowledgeRelationship
  extends SyntheticKnowledgeRelationshipContract {
  knowledgeRelationshipId: string;
  knowledgeRelationshipKey: string;
  relationshipCategory: SyntheticKnowledgeRelationshipCategory;
  relationshipType: SyntheticKnowledgeRelationshipType;
  companyId: string;
  scope: SyntheticAuditScope;
  sourceKnowledgeObjectId: string;
  targetKnowledgeObjectId: string;
  sourceKnowledgeObjectKey: string;
  targetKnowledgeObjectKey: string;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  sourceCustomerIsolation: SyntheticMemoryObjectIsolationDimension;
  sourceFirmIsolation: SyntheticMemoryObjectIsolationDimension;
  sourceClientIsolation: SyntheticMemoryObjectIsolationDimension;
  targetCustomerIsolation: SyntheticMemoryObjectIsolationDimension;
  targetFirmIsolation: SyntheticMemoryObjectIsolationDimension;
  targetClientIsolation: SyntheticMemoryObjectIsolationDimension;
  crossScopeReference: boolean;
  derivationLineageIds: string[];
  sourceMemoryObjectIds: string[];
  sourceMemoryRelationshipIds: string[];
  sourceEvidenceLineageGraphIds: string[];
  sourceOrganizationalMemoryPackageIds: string[];
  sourceOrganizationalMemoryGraphIds: string[];
  derivationMethod: SyntheticKnowledgeDerivationMethod;
  derivationHash: string;
  knowledgeValidityWindow: SyntheticKnowledgeValidityWindow;
  sourceMemorySnapshotIds: string[];
  supersedesKnowledgeIds: string[];
  supersededByKnowledgeIds: string[];
  staleMarker: SyntheticKnowledgeStaleMarker;
  stalenessReasonReferenceIds: string[];
  confidenceFloorMetadata: SyntheticKnowledgeConfidenceFloorMetadata[];
  sourceConfidenceReferenceIds: string[];
  evidenceReferenceIds: string[];
  sourceReferenceIds: string[];
  lineageReferenceIds: string[];
  upstreamObservationIds: string[];
  upstreamPackageIds: string[];
  memoryObjectIds: string[];
  memoryRelationshipIds: string[];
  evidenceLineageGraphIds: string[];
  organizationalMemoryPackageIds: string[];
  organizationalMemoryGraphIds: string[];
  auditContractReferenceIds: string[];
  auditCandidateIds: string[];
  auditEvidencePackageIds: string[];
  auditFindingArtifactIds: string[];
  auditConfidenceIds: string[];
  auditSurfaceIds: string[];
  auditWatchlistIds: string[];
  auditBriefingIds: string[];
  healthcarePpdObservationIds: string[];
  payrollObservationIds: string[];
  methodologyObservationIds: string[];
  trustMetadata: SyntheticAuditTrustMetadata[];
  confidenceMetadata: SyntheticAuditConfidenceMetadata[];
  governanceMetadata: SyntheticAuditGovernanceMetadata[];
  materialityMetadata: SyntheticAuditMaterialityCompatibility[];
  personaCompatibility: SyntheticAuditPersonaCompatibility[];
  packageCompatibility: SyntheticAuditPackageCompatibility[];
  memoryCompatibility: SyntheticAuditMemoryCompatibility[];
  learningCompatibility: SyntheticAuditLearningCompatibility[];
  surfaceCompatibility: SyntheticAuditSurfaceCompatibility[];
  executable: false;
  actionReady: false;
  workflowReady: false;
  phase38Required: true;
  sourceKnowledgeObject: SyntheticKnowledgeObject;
  targetKnowledgeObject: SyntheticKnowledgeObject;
  memoryRelationships: SyntheticMemoryRelationship[];
  memoryObjects: SyntheticMemoryObject[];
  evidenceLineageGraphs: SyntheticEvidenceLineageGraph[];
  organizationalMemoryGraphs: SyntheticOrganizationalMemoryGraph[];
  warnings: string[];
}

export interface BuildKnowledgeRelationshipResult {
  knowledgeRelationship: SyntheticKnowledgeRelationship | null;
  skipped: boolean;
  warnings: string[];
}

type RelationshipPhase36Artifact =
  | SyntheticMemoryRelationship
  | SyntheticMemoryObject
  | SyntheticEvidenceLineageGraph
  | SyntheticOrganizationalMemoryGraph;

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getStringArrayProperty(value: object, propertyName: string): string[] {
  const property = (value as Record<string, unknown>)[propertyName];
  return Array.isArray(property) ? property.filter((item): item is string => typeof item === "string") : [];
}

function getStringProperty(value: object, propertyName: string): string[] {
  const property = (value as Record<string, unknown>)[propertyName];
  return typeof property === "string" ? [property] : [];
}

function compactStrings(values: Array<string | undefined>): string[] {
  return values.filter((value): value is string => hasValue(value));
}

function areIsolationDimensionsEqual(
  sourceIsolation: SyntheticMemoryObjectIsolationDimension,
  targetIsolation: SyntheticMemoryObjectIsolationDimension,
): boolean {
  return stableSnapshotHash(sourceIsolation) === stableSnapshotHash(targetIsolation);
}

function isCrossScope(sourceKnowledgeObject: SyntheticKnowledgeObject, targetKnowledgeObject: SyntheticKnowledgeObject): boolean {
  return !(
    areIsolationDimensionsEqual(sourceKnowledgeObject.customerIsolation, targetKnowledgeObject.customerIsolation) &&
    areIsolationDimensionsEqual(sourceKnowledgeObject.firmIsolation, targetKnowledgeObject.firmIsolation) &&
    areIsolationDimensionsEqual(sourceKnowledgeObject.clientIsolation, targetKnowledgeObject.clientIsolation)
  );
}

function isSupportedRelationshipCategory(relationshipCategory: SyntheticKnowledgeRelationshipCategory): boolean {
  return SYNTHETIC_KNOWLEDGE_RELATIONSHIP_CATEGORIES.includes(relationshipCategory);
}

function isSupportedRelationshipType(relationshipType: SyntheticKnowledgeRelationshipType): boolean {
  return SYNTHETIC_KNOWLEDGE_RELATIONSHIP_TYPES.includes(relationshipType);
}

function getMemoryRelationships(input: BuildKnowledgeRelationshipInput): SyntheticMemoryRelationship[] {
  return getInputArray(input.memoryRelationships);
}

function getMemoryObjects(input: BuildKnowledgeRelationshipInput): SyntheticMemoryObject[] {
  return getInputArray(input.memoryObjects);
}

function getEvidenceLineageGraphs(input: BuildKnowledgeRelationshipInput): SyntheticEvidenceLineageGraph[] {
  return getInputArray(input.evidenceLineageGraphs);
}

function getOrganizationalMemoryGraphs(input: BuildKnowledgeRelationshipInput): SyntheticOrganizationalMemoryGraph[] {
  return getInputArray(input.organizationalMemoryGraphs);
}

function getPhase36Artifacts(input: BuildKnowledgeRelationshipInput): RelationshipPhase36Artifact[] {
  return [
    ...getMemoryRelationships(input),
    ...getMemoryObjects(input),
    ...getEvidenceLineageGraphs(input),
    ...getOrganizationalMemoryGraphs(input),
  ];
}

function getSourceMemoryObjectIds(input: BuildKnowledgeRelationshipInput): string[] {
  const sourceKnowledgeObject = input.sourceKnowledgeObject;
  const targetKnowledgeObject = input.targetKnowledgeObject;
  return [
    ...(sourceKnowledgeObject?.sourceMemoryObjectIds ?? []),
    ...(targetKnowledgeObject?.sourceMemoryObjectIds ?? []),
    ...getMemoryObjects(input).map((artifact) => artifact.memoryObjectId),
    ...getPhase36Artifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "memoryObjectIds")),
  ].filter(hasValue) as string[];
}

function getSourceMemoryRelationshipIds(input: BuildKnowledgeRelationshipInput): string[] {
  const sourceKnowledgeObject = input.sourceKnowledgeObject;
  const targetKnowledgeObject = input.targetKnowledgeObject;
  return [
    ...(sourceKnowledgeObject?.sourceMemoryRelationshipIds ?? []),
    ...(targetKnowledgeObject?.sourceMemoryRelationshipIds ?? []),
    ...getMemoryRelationships(input).map((artifact) => artifact.memoryRelationshipId),
    ...getPhase36Artifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "memoryRelationshipIds")),
  ].filter(hasValue) as string[];
}

function getSourceEvidenceLineageGraphIds(input: BuildKnowledgeRelationshipInput): string[] {
  const sourceKnowledgeObject = input.sourceKnowledgeObject;
  const targetKnowledgeObject = input.targetKnowledgeObject;
  return [
    ...(sourceKnowledgeObject?.sourceEvidenceLineageGraphIds ?? []),
    ...(targetKnowledgeObject?.sourceEvidenceLineageGraphIds ?? []),
    ...getEvidenceLineageGraphs(input).map((artifact) => artifact.evidenceLineageGraphId),
    ...getPhase36Artifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "evidenceLineageGraphIds")),
  ].filter(hasValue) as string[];
}

function getSourceOrganizationalMemoryPackageIds(input: BuildKnowledgeRelationshipInput): string[] {
  return [
    ...(input.sourceKnowledgeObject?.sourceOrganizationalMemoryPackageIds ?? []),
    ...(input.targetKnowledgeObject?.sourceOrganizationalMemoryPackageIds ?? []),
    ...getPhase36Artifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryPackageIds")),
  ].filter(hasValue) as string[];
}

function getSourceOrganizationalMemoryGraphIds(input: BuildKnowledgeRelationshipInput): string[] {
  return [
    ...(input.sourceKnowledgeObject?.sourceOrganizationalMemoryGraphIds ?? []),
    ...(input.targetKnowledgeObject?.sourceOrganizationalMemoryGraphIds ?? []),
    ...getOrganizationalMemoryGraphs(input).map((artifact) => artifact.organizationalMemoryGraphId),
    ...getPhase36Artifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryGraphIds")),
  ].filter(hasValue) as string[];
}

function getDerivationLineageIds(input: BuildKnowledgeRelationshipInput): string[] {
  return [
    ...(input.sourceKnowledgeObject?.derivationLineageIds ?? []),
    ...(input.targetKnowledgeObject?.derivationLineageIds ?? []),
    ...getSourceMemoryObjectIds(input),
    ...getSourceMemoryRelationshipIds(input),
    ...getSourceEvidenceLineageGraphIds(input),
    ...getSourceOrganizationalMemoryPackageIds(input),
    ...getSourceOrganizationalMemoryGraphIds(input),
  ];
}

function getReferenceIdsFromKnowledgeAndMemory(input: BuildKnowledgeRelationshipInput, arrayName: string): string[] {
  return [
    ...((input.sourceKnowledgeObject as unknown as Record<string, string[] | undefined> | null)?.[arrayName] ?? []),
    ...((input.targetKnowledgeObject as unknown as Record<string, string[] | undefined> | null)?.[arrayName] ?? []),
    ...getPhase36Artifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, arrayName)),
  ].filter(hasValue) as string[];
}

function getReferenceIds(input: BuildKnowledgeRelationshipInput, singularName: string, arrayName: string): string[] {
  return [
    ...getReferenceIdsFromKnowledgeAndMemory(input, arrayName),
    ...getPhase36Artifacts(input).flatMap((artifact) => getStringProperty(artifact, singularName)),
  ].filter(hasValue) as string[];
}

function buildDerivationHash(input: BuildKnowledgeRelationshipInput): string {
  return stableSnapshotHash({
    sourceKnowledgeObjectId: input.sourceKnowledgeObject?.knowledgeObjectId ?? null,
    targetKnowledgeObjectId: input.targetKnowledgeObject?.knowledgeObjectId ?? null,
    relationshipCategory: input.relationshipCategory,
    relationshipType: input.relationshipType,
    derivationLineageIds: getDerivationLineageIds(input),
    sourceMemoryObjectIds: getSourceMemoryObjectIds(input),
    sourceMemoryRelationshipIds: getSourceMemoryRelationshipIds(input),
    sourceEvidenceLineageGraphIds: getSourceEvidenceLineageGraphIds(input),
    sourceOrganizationalMemoryPackageIds: getSourceOrganizationalMemoryPackageIds(input),
    sourceOrganizationalMemoryGraphIds: getSourceOrganizationalMemoryGraphIds(input),
  });
}

function buildKnowledgeRelationshipKey(input: BuildKnowledgeRelationshipInput): string {
  const sourceKnowledgeObject = input.sourceKnowledgeObject;
  const targetKnowledgeObject = input.targetKnowledgeObject;
  return stableSnapshotHash({
    relationshipCategory: input.relationshipCategory,
    relationshipType: input.relationshipType,
    companyId: sourceKnowledgeObject?.companyId ?? null,
    scope: sourceKnowledgeObject?.scope ?? null,
    sourceKnowledgeObjectId: sourceKnowledgeObject?.knowledgeObjectId ?? null,
    targetKnowledgeObjectId: targetKnowledgeObject?.knowledgeObjectId ?? null,
    sourceKnowledgeObjectKey: sourceKnowledgeObject?.knowledgeObjectKey ?? null,
    targetKnowledgeObjectKey: targetKnowledgeObject?.knowledgeObjectKey ?? null,
    customerIsolation: sourceKnowledgeObject?.customerIsolation ?? null,
    firmIsolation: sourceKnowledgeObject?.firmIsolation ?? null,
    clientIsolation: sourceKnowledgeObject?.clientIsolation ?? null,
    sourceCustomerIsolation: sourceKnowledgeObject?.customerIsolation ?? null,
    sourceFirmIsolation: sourceKnowledgeObject?.firmIsolation ?? null,
    sourceClientIsolation: sourceKnowledgeObject?.clientIsolation ?? null,
    targetCustomerIsolation: targetKnowledgeObject?.customerIsolation ?? null,
    targetFirmIsolation: targetKnowledgeObject?.firmIsolation ?? null,
    targetClientIsolation: targetKnowledgeObject?.clientIsolation ?? null,
    derivationLineageIds: getDerivationLineageIds(input),
    sourceMemoryObjectIds: getSourceMemoryObjectIds(input),
    sourceMemoryRelationshipIds: getSourceMemoryRelationshipIds(input),
    sourceEvidenceLineageGraphIds: getSourceEvidenceLineageGraphIds(input),
  });
}

function buildKnowledgeRelationshipId(input: BuildKnowledgeRelationshipInput): string {
  return `synthetic-knowledge-relationship:${stableSnapshotHash({
    knowledgeRelationshipKey: buildKnowledgeRelationshipKey(input),
    relationshipCategory: input.relationshipCategory,
    relationshipType: input.relationshipType,
    sourceKnowledgeObjectId: input.sourceKnowledgeObject?.knowledgeObjectId ?? null,
    targetKnowledgeObjectId: input.targetKnowledgeObject?.knowledgeObjectId ?? null,
  })}`;
}

function getForwardCompatibilityWarnings(input: BuildKnowledgeRelationshipInput): string[] {
  return [
    ...(getInputArray(input.healthcarePpdObservationIds).length > 0
      ? ["healthcare PPD observation ids are forward-compatible references."]
      : []),
    ...(getInputArray(input.payrollObservationIds).length > 0 ? ["payroll observation ids are forward-compatible references."] : []),
    ...(getInputArray(input.methodologyObservationIds).length > 0
      ? ["methodology observation ids are Phase 37 reference-only inputs."]
      : []),
  ];
}

function validateInput(input: BuildKnowledgeRelationshipInput): string[] {
  const warnings: string[] = [];
  const sourceKnowledgeObject = input.sourceKnowledgeObject;
  const targetKnowledgeObject = input.targetKnowledgeObject;

  if (!sourceKnowledgeObject) warnings.push("sourceKnowledgeObject is required.");
  if (!targetKnowledgeObject) warnings.push("targetKnowledgeObject is required.");
  if (!hasValue(input.relationshipCategory)) warnings.push("relationshipCategory is required.");
  if (!isSupportedRelationshipCategory(input.relationshipCategory)) warnings.push("relationshipCategory must be supported.");
  if (!hasValue(input.relationshipType)) warnings.push("relationshipType is required.");
  if (!isSupportedRelationshipType(input.relationshipType)) warnings.push("relationshipType must be supported.");
  if (!sourceKnowledgeObject || !targetKnowledgeObject) return warnings;

  if (!hasValue(sourceKnowledgeObject.knowledgeObjectId)) warnings.push("sourceKnowledgeObject.knowledgeObjectId is required.");
  if (!hasValue(sourceKnowledgeObject.knowledgeObjectKey)) warnings.push("sourceKnowledgeObject.knowledgeObjectKey is required.");
  if (!hasValue(targetKnowledgeObject.knowledgeObjectId)) warnings.push("targetKnowledgeObject.knowledgeObjectId is required.");
  if (!hasValue(targetKnowledgeObject.knowledgeObjectKey)) warnings.push("targetKnowledgeObject.knowledgeObjectKey is required.");
  if (!hasValue(sourceKnowledgeObject.companyId)) warnings.push("sourceKnowledgeObject.companyId is required.");
  if (!hasValue(targetKnowledgeObject.companyId)) warnings.push("targetKnowledgeObject.companyId is required.");
  if (sourceKnowledgeObject.companyId !== targetKnowledgeObject.companyId) {
    warnings.push("sourceKnowledgeObject.companyId must equal targetKnowledgeObject.companyId.");
  }
  if (!sourceKnowledgeObject.scope) warnings.push("sourceKnowledgeObject.scope is required.");
  if (!targetKnowledgeObject.scope) warnings.push("targetKnowledgeObject.scope is required.");
  if (!sourceKnowledgeObject.customerIsolation) warnings.push("sourceKnowledgeObject.customerIsolation is required.");
  if (!sourceKnowledgeObject.firmIsolation) warnings.push("sourceKnowledgeObject.firmIsolation is required.");
  if (!sourceKnowledgeObject.clientIsolation) warnings.push("sourceKnowledgeObject.clientIsolation is required.");
  if (!targetKnowledgeObject.customerIsolation) warnings.push("targetKnowledgeObject.customerIsolation is required.");
  if (!targetKnowledgeObject.firmIsolation) warnings.push("targetKnowledgeObject.firmIsolation is required.");
  if (!targetKnowledgeObject.clientIsolation) warnings.push("targetKnowledgeObject.clientIsolation is required.");

  const crossScope = isCrossScope(sourceKnowledgeObject, targetKnowledgeObject);
  if (crossScope && input.crossScopeReference !== true) {
    warnings.push("crossScopeReference must be true when source and target isolation differ.");
  }

  for (const [inputName, values, idName, keyName] of [
    ["memoryRelationships", getMemoryRelationships(input), "memoryRelationshipId", "memoryRelationshipKey"],
    ["memoryObjects", getMemoryObjects(input), "memoryObjectId", "memoryObjectKey"],
    ["evidenceLineageGraphs", getEvidenceLineageGraphs(input), "evidenceLineageGraphId", "evidenceLineageGraphKey"],
    ["organizationalMemoryGraphs", getOrganizationalMemoryGraphs(input), "organizationalMemoryGraphId", "organizationalMemoryGraphKey"],
  ] as const) {
    values.forEach((artifact, index) => {
      if (!hasValue((artifact as unknown as Record<string, unknown>)[idName])) warnings.push(`${inputName}[${index}].${idName} is required.`);
      if (!hasValue((artifact as unknown as Record<string, unknown>)[keyName])) warnings.push(`${inputName}[${index}].${keyName} is required.`);
      if (artifact.companyId !== sourceKnowledgeObject.companyId) warnings.push(`${inputName}[${index}].companyId must equal sourceKnowledgeObject.companyId.`);
    });
  }

  return warnings;
}

export function buildKnowledgeRelationship(input: BuildKnowledgeRelationshipInput): BuildKnowledgeRelationshipResult {
  const fatalWarnings = validateInput(input);
  if (fatalWarnings.length > 0 || !input.sourceKnowledgeObject || !input.targetKnowledgeObject) {
    return {
      knowledgeRelationship: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const sourceKnowledgeObject = input.sourceKnowledgeObject;
  const targetKnowledgeObject = input.targetKnowledgeObject;
  const crossScopeReference = isCrossScope(sourceKnowledgeObject, targetKnowledgeObject) ? input.crossScopeReference === true : input.crossScopeReference === true;
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    knowledgeRelationship: {
      knowledgeRelationshipId: buildKnowledgeRelationshipId(input),
      knowledgeRelationshipKey: buildKnowledgeRelationshipKey(input),
      relationshipCategory: input.relationshipCategory,
      relationshipType: input.relationshipType,
      companyId: sourceKnowledgeObject.companyId,
      scope: sourceKnowledgeObject.scope,
      sourceKnowledgeObjectId: sourceKnowledgeObject.knowledgeObjectId,
      targetKnowledgeObjectId: targetKnowledgeObject.knowledgeObjectId,
      sourceKnowledgeObjectKey: sourceKnowledgeObject.knowledgeObjectKey,
      targetKnowledgeObjectKey: targetKnowledgeObject.knowledgeObjectKey,
      customerIsolation: sourceKnowledgeObject.customerIsolation,
      firmIsolation: sourceKnowledgeObject.firmIsolation,
      clientIsolation: sourceKnowledgeObject.clientIsolation,
      sourceCustomerIsolation: sourceKnowledgeObject.customerIsolation,
      sourceFirmIsolation: sourceKnowledgeObject.firmIsolation,
      sourceClientIsolation: sourceKnowledgeObject.clientIsolation,
      targetCustomerIsolation: targetKnowledgeObject.customerIsolation,
      targetFirmIsolation: targetKnowledgeObject.firmIsolation,
      targetClientIsolation: targetKnowledgeObject.clientIsolation,
      crossScopeReference,
      derivationLineageIds: getDerivationLineageIds(input),
      sourceMemoryObjectIds: getSourceMemoryObjectIds(input),
      sourceMemoryRelationshipIds: getSourceMemoryRelationshipIds(input),
      sourceEvidenceLineageGraphIds: getSourceEvidenceLineageGraphIds(input),
      sourceOrganizationalMemoryPackageIds: getSourceOrganizationalMemoryPackageIds(input),
      sourceOrganizationalMemoryGraphIds: getSourceOrganizationalMemoryGraphIds(input),
      derivationMethod: "relationship_preservation",
      derivationHash: buildDerivationHash(input),
      knowledgeValidityWindow: sourceKnowledgeObject.knowledgeValidityWindow,
      sourceMemorySnapshotIds: [
        ...sourceKnowledgeObject.sourceMemorySnapshotIds,
        ...targetKnowledgeObject.sourceMemorySnapshotIds,
      ],
      supersedesKnowledgeIds: [
        ...sourceKnowledgeObject.supersedesKnowledgeIds,
        ...targetKnowledgeObject.supersedesKnowledgeIds,
      ],
      supersededByKnowledgeIds: [
        ...sourceKnowledgeObject.supersededByKnowledgeIds,
        ...targetKnowledgeObject.supersededByKnowledgeIds,
      ],
      staleMarker: sourceKnowledgeObject.staleMarker,
      stalenessReasonReferenceIds: [
        ...sourceKnowledgeObject.stalenessReasonReferenceIds,
        ...targetKnowledgeObject.stalenessReasonReferenceIds,
      ],
      confidenceFloorMetadata: [
        ...sourceKnowledgeObject.confidenceFloorMetadata,
        ...targetKnowledgeObject.confidenceFloorMetadata,
      ],
      sourceConfidenceReferenceIds: [
        ...sourceKnowledgeObject.sourceConfidenceReferenceIds,
        ...targetKnowledgeObject.sourceConfidenceReferenceIds,
      ],
      evidenceReferenceIds: getReferenceIdsFromKnowledgeAndMemory(input, "evidenceReferenceIds"),
      sourceReferenceIds: getReferenceIdsFromKnowledgeAndMemory(input, "sourceReferenceIds"),
      lineageReferenceIds: getReferenceIdsFromKnowledgeAndMemory(input, "lineageReferenceIds"),
      upstreamObservationIds: getReferenceIdsFromKnowledgeAndMemory(input, "upstreamObservationIds"),
      upstreamPackageIds: getReferenceIdsFromKnowledgeAndMemory(input, "upstreamPackageIds"),
      memoryObjectIds: getSourceMemoryObjectIds(input),
      memoryRelationshipIds: getSourceMemoryRelationshipIds(input),
      evidenceLineageGraphIds: getSourceEvidenceLineageGraphIds(input),
      organizationalMemoryPackageIds: getSourceOrganizationalMemoryPackageIds(input),
      organizationalMemoryGraphIds: getSourceOrganizationalMemoryGraphIds(input),
      auditContractReferenceIds: getReferenceIds(input, "auditContractReferenceId", "auditContractReferenceIds"),
      auditCandidateIds: getReferenceIds(input, "auditCandidateId", "auditCandidateIds"),
      auditEvidencePackageIds: getReferenceIds(input, "auditEvidencePackageId", "auditEvidencePackageIds"),
      auditFindingArtifactIds: getReferenceIds(input, "auditFindingArtifactId", "auditFindingArtifactIds"),
      auditConfidenceIds: getReferenceIds(input, "auditConfidenceId", "auditConfidenceIds"),
      auditSurfaceIds: getReferenceIds(input, "auditSurfaceId", "auditSurfaceIds"),
      auditWatchlistIds: getReferenceIds(input, "auditWatchlistId", "auditWatchlistIds"),
      auditBriefingIds: getReferenceIds(input, "auditBriefingId", "auditBriefingIds"),
      healthcarePpdObservationIds: getInputArray(input.healthcarePpdObservationIds),
      payrollObservationIds: getInputArray(input.payrollObservationIds),
      methodologyObservationIds: getInputArray(input.methodologyObservationIds),
      trustMetadata: [
        ...sourceKnowledgeObject.trustMetadata,
        ...targetKnowledgeObject.trustMetadata,
        ...getPhase36Artifacts(input).flatMap((artifact) => artifact.trustMetadata),
      ],
      confidenceMetadata: [
        ...sourceKnowledgeObject.confidenceMetadata,
        ...targetKnowledgeObject.confidenceMetadata,
        ...getPhase36Artifacts(input).flatMap((artifact) => artifact.confidenceMetadata),
      ],
      governanceMetadata: [
        ...sourceKnowledgeObject.governanceMetadata,
        ...targetKnowledgeObject.governanceMetadata,
        ...getPhase36Artifacts(input).flatMap((artifact) => artifact.governanceMetadata),
      ],
      materialityMetadata: [
        ...sourceKnowledgeObject.materialityMetadata,
        ...targetKnowledgeObject.materialityMetadata,
        ...getPhase36Artifacts(input).flatMap((artifact) => artifact.materialityMetadata),
      ],
      personaCompatibility: [
        ...sourceKnowledgeObject.personaCompatibility,
        ...targetKnowledgeObject.personaCompatibility,
        ...getPhase36Artifacts(input).flatMap((artifact) => artifact.personaCompatibility),
      ],
      packageCompatibility: [
        ...sourceKnowledgeObject.packageCompatibility,
        ...targetKnowledgeObject.packageCompatibility,
        ...getPhase36Artifacts(input).flatMap((artifact) => artifact.packageCompatibility),
      ],
      memoryCompatibility: [
        ...sourceKnowledgeObject.memoryCompatibility,
        ...targetKnowledgeObject.memoryCompatibility,
        ...getPhase36Artifacts(input).flatMap((artifact) => artifact.memoryCompatibility),
      ],
      learningCompatibility: [
        ...sourceKnowledgeObject.learningCompatibility,
        ...targetKnowledgeObject.learningCompatibility,
        ...getPhase36Artifacts(input).flatMap((artifact) => artifact.learningCompatibility),
      ],
      surfaceCompatibility: [
        ...sourceKnowledgeObject.surfaceCompatibility,
        ...targetKnowledgeObject.surfaceCompatibility,
        ...getPhase36Artifacts(input).flatMap((artifact) => artifact.surfaceCompatibility),
      ],
      executable: false,
      actionReady: false,
      workflowReady: false,
      phase38Required: true,
      sourceKnowledgeObject,
      targetKnowledgeObject,
      memoryRelationships: getMemoryRelationships(input),
      memoryObjects: getMemoryObjects(input),
      evidenceLineageGraphs: getEvidenceLineageGraphs(input),
      organizationalMemoryGraphs: getOrganizationalMemoryGraphs(input),
      warnings,
    },
    skipped: false,
    warnings,
  };
}
