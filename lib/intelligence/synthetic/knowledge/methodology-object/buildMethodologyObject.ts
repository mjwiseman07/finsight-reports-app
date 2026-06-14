import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticKnowledgeConfidenceFloorMetadata,
  SyntheticMethodologyDerivationMethod,
  SyntheticMethodologyObjectContract,
  SyntheticMethodologyRelationshipCategory,
  SyntheticMethodologyRelationshipContract,
  SyntheticMethodologyRelationshipType,
  SyntheticMethodologyStaleMarker,
} from "../contracts";
import type { SyntheticKnowledgeObject } from "../knowledge-object";
import type { SyntheticKnowledgeRelationship } from "../knowledge-relationship";
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
import type { SyntheticMemoryObjectIsolationDimension } from "../../organizational-memory/memory-object";
import type { SyntheticMemoryPreservationPackage } from "../../organizational-memory/memory-preservation-package";
import type { SyntheticOrganizationalMemoryArchive } from "../../organizational-memory/organizational-memory-archive";
import type { SyntheticOrganizationalMemoryGraph } from "../../organizational-memory/organizational-memory-graph";
import type { SyntheticOrganizationalMemoryPackage } from "../../organizational-memory/organizational-memory-package";

export type SyntheticMethodologyCategory =
  | "procedure_methodology"
  | "approach_methodology"
  | "review_methodology"
  | "operating_methodology"
  | "historical_methodology"
  | "knowledge_methodology";

export const SYNTHETIC_METHODOLOGY_CATEGORIES: SyntheticMethodologyCategory[] = [
  "procedure_methodology",
  "approach_methodology",
  "review_methodology",
  "operating_methodology",
  "historical_methodology",
  "knowledge_methodology",
];

export const SYNTHETIC_METHODOLOGY_RELATIONSHIP_CATEGORIES: SyntheticMethodologyRelationshipCategory[] = [
  "methodology_derivation_relationship",
  "methodology_lineage_relationship",
  "methodology_evidence_relationship",
  "methodology_knowledge_relationship",
  "methodology_supersession_relationship",
];

export const SYNTHETIC_METHODOLOGY_RELATIONSHIP_TYPES: SyntheticMethodologyRelationshipType[] = [
  "derived_from",
  "preserves_approach",
  "preserves_procedure",
  "preserves_review_method",
  "supersedes",
  "is_superseded_by",
];

export interface BuildMethodologyObjectInput {
  methodologyCategory: SyntheticMethodologyCategory;
  methodologyVersion: string;
  methodologyDerivationMethod: SyntheticMethodologyDerivationMethod;
  methodologyAncestryIds?: string[];
  sourceKnowledgeObjects?: SyntheticKnowledgeObject[];
  sourceKnowledgeRelationships?: SyntheticKnowledgeRelationship[];
  sourceKnowledgePackageIds?: string[];
  sourceOrganizationalMemoryPackages?: SyntheticOrganizationalMemoryPackage[];
  sourceOrganizationalMemoryGraphs?: SyntheticOrganizationalMemoryGraph[];
  sourceOrganizationalMemoryArchives?: SyntheticOrganizationalMemoryArchive[];
  sourceMemoryPreservationPackages?: SyntheticMemoryPreservationPackage[];
  supersedesMethodologyIds?: string[];
  supersededByMethodologyIds?: string[];
  methodologyStaleMarker?: SyntheticMethodologyStaleMarker;
  methodologyStalenessReasonReferenceIds?: string[];
  healthcarePpdObservationIds?: string[];
  payrollObservationIds?: string[];
  methodologyObservationIds?: string[];
}

export interface BuildMethodologyRelationshipInput {
  sourceMethodologyObject: SyntheticMethodologyObject | null;
  targetMethodologyObject: SyntheticMethodologyObject | null;
  methodologyRelationshipCategory: SyntheticMethodologyRelationshipCategory;
  methodologyRelationshipType: SyntheticMethodologyRelationshipType;
  crossScopeReference?: boolean;
  healthcarePpdObservationIds?: string[];
  payrollObservationIds?: string[];
  methodologyObservationIds?: string[];
}

export interface SyntheticMethodologyObject extends SyntheticMethodologyObjectContract {
  methodologyObjectId: string;
  methodologyObjectKey: string;
  methodologyCategory: SyntheticMethodologyCategory;
  methodologyVersion: string;
  companyId: string;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  methodologyDerivationMethod: SyntheticMethodologyDerivationMethod;
  methodologyDerivationHash: string;
  methodologyAncestryIds: string[];
  sourceKnowledgeObjectIds: string[];
  sourceKnowledgePackageIds: string[];
  sourceOrganizationalMemoryPackageIds: string[];
  methodologyLineageReferenceIds: string[];
  methodologyEvidenceReferenceIds: string[];
  methodologySourceReferenceIds: string[];
  supersedesMethodologyIds: string[];
  supersededByMethodologyIds: string[];
  methodologyStaleMarker: SyntheticMethodologyStaleMarker;
  methodologyStalenessReasonReferenceIds: string[];
  confidenceFloorMetadata: SyntheticKnowledgeConfidenceFloorMetadata[];
  sourceConfidenceReferenceIds: string[];
  evidenceReferenceIds: string[];
  sourceReferenceIds: string[];
  lineageReferenceIds: string[];
  upstreamObservationIds: string[];
  upstreamPackageIds: string[];
  knowledgeObjectIds: string[];
  knowledgeRelationshipIds: string[];
  organizationalMemoryPackageIds: string[];
  organizationalMemoryGraphIds: string[];
  organizationalMemoryArchiveIds: string[];
  memoryPreservationPackageIds: string[];
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
  sourceKnowledgeObjects: SyntheticKnowledgeObject[];
  sourceKnowledgeRelationships: SyntheticKnowledgeRelationship[];
  sourceOrganizationalMemoryPackages: SyntheticOrganizationalMemoryPackage[];
  sourceOrganizationalMemoryGraphs: SyntheticOrganizationalMemoryGraph[];
  sourceOrganizationalMemoryArchives: SyntheticOrganizationalMemoryArchive[];
  sourceMemoryPreservationPackages: SyntheticMemoryPreservationPackage[];
  warnings: string[];
}

export interface SyntheticMethodologyRelationship extends SyntheticMethodologyRelationshipContract {
  methodologyRelationshipId: string;
  methodologyRelationshipKey: string;
  methodologyRelationshipCategory: SyntheticMethodologyRelationshipCategory;
  methodologyRelationshipType: SyntheticMethodologyRelationshipType;
  companyId: string;
  scope: SyntheticAuditScope;
  sourceMethodologyObjectId: string;
  targetMethodologyObjectId: string;
  sourceMethodologyObjectKey: string;
  targetMethodologyObjectKey: string;
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
  methodologyAncestryIds: string[];
  sourceKnowledgeObjectIds: string[];
  sourceKnowledgePackageIds: string[];
  sourceOrganizationalMemoryPackageIds: string[];
  methodologyLineageReferenceIds: string[];
  methodologyEvidenceReferenceIds: string[];
  methodologySourceReferenceIds: string[];
  methodologyDerivationMethod: SyntheticMethodologyDerivationMethod;
  methodologyDerivationHash: string;
  supersedesMethodologyIds: string[];
  supersededByMethodologyIds: string[];
  methodologyStaleMarker: SyntheticMethodologyStaleMarker;
  methodologyStalenessReasonReferenceIds: string[];
  confidenceFloorMetadata: SyntheticKnowledgeConfidenceFloorMetadata[];
  sourceConfidenceReferenceIds: string[];
  evidenceReferenceIds: string[];
  sourceReferenceIds: string[];
  lineageReferenceIds: string[];
  upstreamObservationIds: string[];
  upstreamPackageIds: string[];
  knowledgeObjectIds: string[];
  knowledgeRelationshipIds: string[];
  organizationalMemoryPackageIds: string[];
  organizationalMemoryGraphIds: string[];
  organizationalMemoryArchiveIds: string[];
  memoryPreservationPackageIds: string[];
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
  sourceMethodologyObject: SyntheticMethodologyObject;
  targetMethodologyObject: SyntheticMethodologyObject;
  warnings: string[];
}

export interface BuildMethodologyObjectResult {
  methodologyObject: SyntheticMethodologyObject | null;
  skipped: boolean;
  warnings: string[];
}

export interface BuildMethodologyRelationshipResult {
  methodologyRelationship: SyntheticMethodologyRelationship | null;
  skipped: boolean;
  warnings: string[];
}

type MethodologySourceArtifact =
  | SyntheticKnowledgeObject
  | SyntheticKnowledgeRelationship
  | SyntheticOrganizationalMemoryPackage
  | SyntheticOrganizationalMemoryGraph
  | SyntheticOrganizationalMemoryArchive
  | SyntheticMemoryPreservationPackage;

type ReferenceRecord = Record<string, unknown>;

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function compactStrings(values: Array<string | undefined>): string[] {
  return values.filter((value): value is string => hasValue(value));
}

function getStringProperty(value: object, propertyName: string): string[] {
  const property = (value as ReferenceRecord)[propertyName];
  return typeof property === "string" ? [property] : [];
}

function getStringArrayProperty(value: object, propertyName: string): string[] {
  const property = (value as ReferenceRecord)[propertyName];
  return Array.isArray(property) ? property.filter((item): item is string => typeof item === "string") : [];
}

function getObjectArrayProperty<T>(value: object, propertyName: string): T[] {
  const property = (value as ReferenceRecord)[propertyName];
  return Array.isArray(property) ? (property as T[]) : [];
}

function isSupportedMethodologyCategory(methodologyCategory: SyntheticMethodologyCategory): boolean {
  return SYNTHETIC_METHODOLOGY_CATEGORIES.includes(methodologyCategory);
}

function isSupportedMethodologyDerivationMethod(methodologyDerivationMethod: SyntheticMethodologyDerivationMethod): boolean {
  return [
    "knowledge_to_methodology",
    "procedure_preservation",
    "approach_preservation",
    "review_method_preservation",
    "operating_method_preservation",
    "historical_methodology_preservation",
    "methodology_relationship_preservation",
  ].includes(methodologyDerivationMethod);
}

function isSupportedMethodologyRelationshipCategory(category: SyntheticMethodologyRelationshipCategory): boolean {
  return SYNTHETIC_METHODOLOGY_RELATIONSHIP_CATEGORIES.includes(category);
}

function isSupportedMethodologyRelationshipType(type: SyntheticMethodologyRelationshipType): boolean {
  return SYNTHETIC_METHODOLOGY_RELATIONSHIP_TYPES.includes(type);
}

function areIsolationDimensionsEqual(
  sourceIsolation: SyntheticMemoryObjectIsolationDimension,
  targetIsolation: SyntheticMemoryObjectIsolationDimension,
): boolean {
  return stableSnapshotHash(sourceIsolation) === stableSnapshotHash(targetIsolation);
}

function isCrossScope(sourceObject: SyntheticMethodologyObject, targetObject: SyntheticMethodologyObject): boolean {
  return !(
    areIsolationDimensionsEqual(sourceObject.customerIsolation, targetObject.customerIsolation) &&
    areIsolationDimensionsEqual(sourceObject.firmIsolation, targetObject.firmIsolation) &&
    areIsolationDimensionsEqual(sourceObject.clientIsolation, targetObject.clientIsolation)
  );
}

function getKnowledgeObjects(input: BuildMethodologyObjectInput): SyntheticKnowledgeObject[] {
  return getInputArray(input.sourceKnowledgeObjects);
}

function getKnowledgeRelationships(input: BuildMethodologyObjectInput): SyntheticKnowledgeRelationship[] {
  return getInputArray(input.sourceKnowledgeRelationships);
}

function getOrganizationalMemoryPackages(input: BuildMethodologyObjectInput): SyntheticOrganizationalMemoryPackage[] {
  return getInputArray(input.sourceOrganizationalMemoryPackages);
}

function getOrganizationalMemoryGraphs(input: BuildMethodologyObjectInput): SyntheticOrganizationalMemoryGraph[] {
  return getInputArray(input.sourceOrganizationalMemoryGraphs);
}

function getOrganizationalMemoryArchives(input: BuildMethodologyObjectInput): SyntheticOrganizationalMemoryArchive[] {
  return getInputArray(input.sourceOrganizationalMemoryArchives);
}

function getMemoryPreservationPackages(input: BuildMethodologyObjectInput): SyntheticMemoryPreservationPackage[] {
  return getInputArray(input.sourceMemoryPreservationPackages);
}

function getSourceArtifacts(input: BuildMethodologyObjectInput): MethodologySourceArtifact[] {
  return [
    ...getKnowledgeObjects(input),
    ...getKnowledgeRelationships(input),
    ...getOrganizationalMemoryPackages(input),
    ...getOrganizationalMemoryGraphs(input),
    ...getOrganizationalMemoryArchives(input),
    ...getMemoryPreservationPackages(input),
  ];
}

function getMethodologyScope(input: BuildMethodologyObjectInput): SyntheticAuditScope | null {
  return getSourceArtifacts(input)[0]?.scope ?? null;
}

function getMethodologyCustomerIsolation(input: BuildMethodologyObjectInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.customerIsolation ?? null;
}

function getMethodologyFirmIsolation(input: BuildMethodologyObjectInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.firmIsolation ?? null;
}

function getMethodologyClientIsolation(input: BuildMethodologyObjectInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.clientIsolation ?? null;
}

function getSourceKnowledgeObjectIds(input: BuildMethodologyObjectInput): string[] {
  return [
    ...getKnowledgeObjects(input).map((artifact) => artifact.knowledgeObjectId),
    ...getKnowledgeRelationships(input).flatMap((artifact) => [
      artifact.sourceKnowledgeObjectId,
      artifact.targetKnowledgeObjectId,
    ]),
  ].filter(hasValue) as string[];
}

function getSourceKnowledgeRelationshipIds(input: BuildMethodologyObjectInput): string[] {
  return [
    ...getKnowledgeRelationships(input).map((artifact) => artifact.knowledgeRelationshipId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "knowledgeRelationshipIds")),
  ].filter(hasValue) as string[];
}

function getSourceOrganizationalMemoryPackageIds(input: BuildMethodologyObjectInput): string[] {
  return [
    ...getOrganizationalMemoryPackages(input).map((artifact) => artifact.organizationalMemoryPackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryPackageIds")),
    ...getKnowledgeObjects(input).flatMap((artifact) => artifact.sourceOrganizationalMemoryPackageIds),
    ...getKnowledgeRelationships(input).flatMap((artifact) => artifact.sourceOrganizationalMemoryPackageIds),
  ].filter(hasValue) as string[];
}

function getOrganizationalMemoryGraphIds(input: BuildMethodologyObjectInput): string[] {
  return [
    ...getOrganizationalMemoryGraphs(input).map((artifact) => artifact.organizationalMemoryGraphId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryGraphIds")),
  ].filter(hasValue) as string[];
}

function getOrganizationalMemoryArchiveIds(input: BuildMethodologyObjectInput): string[] {
  return [
    ...getOrganizationalMemoryArchives(input).map((artifact) => artifact.organizationalMemoryArchiveId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryArchiveIds")),
  ].filter(hasValue) as string[];
}

function getMemoryPreservationPackageIds(input: BuildMethodologyObjectInput): string[] {
  return [
    ...getMemoryPreservationPackages(input).map((artifact) => artifact.memoryPreservationPackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "memoryPreservationPackageIds")),
  ].filter(hasValue) as string[];
}

function getReferenceIds(input: BuildMethodologyObjectInput, singularName: string, arrayName: string): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringProperty(artifact, singularName)),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, arrayName)),
  ].filter(hasValue) as string[];
}

function buildMethodologyDerivationHash(input: BuildMethodologyObjectInput): string {
  return stableSnapshotHash({
    methodologyCategory: input.methodologyCategory,
    methodologyVersion: input.methodologyVersion,
    methodologyDerivationMethod: input.methodologyDerivationMethod,
    sourceKnowledgeObjectIds: getSourceKnowledgeObjectIds(input),
    sourceKnowledgePackageIds: getInputArray(input.sourceKnowledgePackageIds),
    sourceOrganizationalMemoryPackageIds: getSourceOrganizationalMemoryPackageIds(input),
    methodologyLineageReferenceIds: getReferenceIds(input, "lineageReferenceId", "lineageReferenceIds"),
    methodologyEvidenceReferenceIds: getReferenceIds(input, "evidenceReferenceId", "evidenceReferenceIds"),
    methodologySourceReferenceIds: getReferenceIds(input, "sourceReferenceId", "sourceReferenceIds"),
  });
}

function buildMethodologyObjectKey(input: BuildMethodologyObjectInput): string {
  const scope = getMethodologyScope(input);
  return stableSnapshotHash({
    methodologyCategory: input.methodologyCategory,
    methodologyVersion: input.methodologyVersion,
    companyId: scope?.companyId ?? null,
    scope,
    customerIsolation: getMethodologyCustomerIsolation(input),
    firmIsolation: getMethodologyFirmIsolation(input),
    clientIsolation: getMethodologyClientIsolation(input),
    sourceKnowledgeObjectIds: getSourceKnowledgeObjectIds(input),
    sourceKnowledgePackageIds: getInputArray(input.sourceKnowledgePackageIds),
    sourceOrganizationalMemoryPackageIds: getSourceOrganizationalMemoryPackageIds(input),
    methodologyDerivationMethod: input.methodologyDerivationMethod,
  });
}

function buildMethodologyObjectId(input: BuildMethodologyObjectInput): string {
  return `synthetic-methodology-object:${stableSnapshotHash({
    methodologyObjectKey: buildMethodologyObjectKey(input),
    methodologyCategory: input.methodologyCategory,
    methodologyVersion: input.methodologyVersion,
    companyId: getMethodologyScope(input)?.companyId ?? null,
  })}`;
}

function getForwardCompatibilityWarnings(
  healthcarePpdObservationIds: string[] | undefined,
  payrollObservationIds: string[] | undefined,
  methodologyObservationIds: string[] | undefined,
): string[] {
  return [
    ...(getInputArray(healthcarePpdObservationIds).length > 0
      ? ["healthcare PPD observation ids are forward-compatible references."]
      : []),
    ...(getInputArray(payrollObservationIds).length > 0 ? ["payroll observation ids are forward-compatible references."] : []),
    ...(getInputArray(methodologyObservationIds).length > 0
      ? ["methodology observation ids are Phase 37 reference-only inputs."]
      : []),
  ];
}

function validateMethodologyObjectInput(input: BuildMethodologyObjectInput): string[] {
  const warnings: string[] = [];
  const sourceArtifacts = getSourceArtifacts(input);
  const scope = getMethodologyScope(input);
  const companyId = scope?.companyId;

  if (!hasValue(input.methodologyCategory)) warnings.push("methodologyCategory is required.");
  if (!isSupportedMethodologyCategory(input.methodologyCategory)) warnings.push("methodologyCategory must be supported.");
  if (!hasValue(input.methodologyVersion)) warnings.push("methodologyVersion is required.");
  if (!hasValue(input.methodologyDerivationMethod)) warnings.push("methodologyDerivationMethod is required.");
  if (!isSupportedMethodologyDerivationMethod(input.methodologyDerivationMethod)) {
    warnings.push("methodologyDerivationMethod must be supported.");
  }
  if (sourceArtifacts.length === 0) warnings.push("at least one source knowledge or memory artifact is required.");
  if (!scope) warnings.push("source scope is required.");
  if (!companyId) warnings.push("source companyId is required.");
  if (!getMethodologyCustomerIsolation(input)) warnings.push("customerIsolation is required.");
  if (!getMethodologyFirmIsolation(input)) warnings.push("firmIsolation is required.");
  if (!getMethodologyClientIsolation(input)) warnings.push("clientIsolation is required.");
  if (getSourceKnowledgeObjectIds(input).length === 0) warnings.push("at least one sourceKnowledgeObjectId is required.");

  sourceArtifacts.forEach((artifact, index) => {
    if (companyId && artifact.companyId !== companyId) warnings.push(`sourceArtifacts[${index}].companyId must equal source companyId.`);
  });

  for (const [inputName, values, idName, keyName] of [
    ["sourceKnowledgeObjects", getKnowledgeObjects(input), "knowledgeObjectId", "knowledgeObjectKey"],
    ["sourceKnowledgeRelationships", getKnowledgeRelationships(input), "knowledgeRelationshipId", "knowledgeRelationshipKey"],
    ["sourceOrganizationalMemoryPackages", getOrganizationalMemoryPackages(input), "organizationalMemoryPackageId", "organizationalMemoryPackageKey"],
    ["sourceOrganizationalMemoryGraphs", getOrganizationalMemoryGraphs(input), "organizationalMemoryGraphId", "organizationalMemoryGraphKey"],
    ["sourceOrganizationalMemoryArchives", getOrganizationalMemoryArchives(input), "organizationalMemoryArchiveId", "organizationalMemoryArchiveKey"],
    ["sourceMemoryPreservationPackages", getMemoryPreservationPackages(input), "memoryPreservationPackageId", "memoryPreservationPackageKey"],
  ] as const) {
    values.forEach((artifact, index) => {
      if (!hasValue((artifact as unknown as ReferenceRecord)[idName])) warnings.push(`${inputName}[${index}].${idName} is required.`);
      if (!hasValue((artifact as unknown as ReferenceRecord)[keyName])) warnings.push(`${inputName}[${index}].${keyName} is required.`);
    });
  }

  return warnings;
}

export function buildMethodologyObject(input: BuildMethodologyObjectInput): BuildMethodologyObjectResult {
  const fatalWarnings = validateMethodologyObjectInput(input);
  const scope = getMethodologyScope(input);
  const customerIsolation = getMethodologyCustomerIsolation(input);
  const firmIsolation = getMethodologyFirmIsolation(input);
  const clientIsolation = getMethodologyClientIsolation(input);

  if (fatalWarnings.length > 0 || !scope || !customerIsolation || !firmIsolation || !clientIsolation) {
    return {
      methodologyObject: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const sourceArtifacts = getSourceArtifacts(input);
  const warnings = getForwardCompatibilityWarnings(
    input.healthcarePpdObservationIds,
    input.payrollObservationIds,
    input.methodologyObservationIds,
  );
  const methodologyLineageReferenceIds = getReferenceIds(input, "lineageReferenceId", "lineageReferenceIds");
  const methodologyEvidenceReferenceIds = getReferenceIds(input, "evidenceReferenceId", "evidenceReferenceIds");
  const methodologySourceReferenceIds = getReferenceIds(input, "sourceReferenceId", "sourceReferenceIds");

  return {
    methodologyObject: {
      methodologyObjectId: buildMethodologyObjectId(input),
      methodologyObjectKey: buildMethodologyObjectKey(input),
      methodologyCategory: input.methodologyCategory,
      methodologyVersion: input.methodologyVersion,
      companyId: scope.companyId,
      scope,
      customerIsolation,
      firmIsolation,
      clientIsolation,
      methodologyDerivationMethod: input.methodologyDerivationMethod,
      methodologyDerivationHash: buildMethodologyDerivationHash(input),
      methodologyAncestryIds: getInputArray(input.methodologyAncestryIds),
      sourceKnowledgeObjectIds: getSourceKnowledgeObjectIds(input),
      sourceKnowledgePackageIds: getInputArray(input.sourceKnowledgePackageIds),
      sourceOrganizationalMemoryPackageIds: getSourceOrganizationalMemoryPackageIds(input),
      methodologyLineageReferenceIds,
      methodologyEvidenceReferenceIds,
      methodologySourceReferenceIds,
      supersedesMethodologyIds: getInputArray(input.supersedesMethodologyIds),
      supersededByMethodologyIds: getInputArray(input.supersededByMethodologyIds),
      methodologyStaleMarker: input.methodologyStaleMarker ?? "current",
      methodologyStalenessReasonReferenceIds: getInputArray(input.methodologyStalenessReasonReferenceIds),
      confidenceFloorMetadata: sourceArtifacts.flatMap((artifact) =>
        getObjectArrayProperty<SyntheticKnowledgeConfidenceFloorMetadata>(artifact, "confidenceFloorMetadata"),
      ),
      sourceConfidenceReferenceIds: sourceArtifacts.flatMap((artifact) =>
        getStringArrayProperty(artifact, "sourceConfidenceReferenceIds"),
      ),
      evidenceReferenceIds: methodologyEvidenceReferenceIds,
      sourceReferenceIds: methodologySourceReferenceIds,
      lineageReferenceIds: methodologyLineageReferenceIds,
      upstreamObservationIds: getReferenceIds(input, "upstreamObservationId", "upstreamObservationIds"),
      upstreamPackageIds: getReferenceIds(input, "upstreamPackageId", "upstreamPackageIds"),
      knowledgeObjectIds: getSourceKnowledgeObjectIds(input),
      knowledgeRelationshipIds: getSourceKnowledgeRelationshipIds(input),
      organizationalMemoryPackageIds: getSourceOrganizationalMemoryPackageIds(input),
      organizationalMemoryGraphIds: getOrganizationalMemoryGraphIds(input),
      organizationalMemoryArchiveIds: getOrganizationalMemoryArchiveIds(input),
      memoryPreservationPackageIds: getMemoryPreservationPackageIds(input),
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
      trustMetadata: sourceArtifacts.flatMap((artifact) => artifact.trustMetadata),
      confidenceMetadata: sourceArtifacts.flatMap((artifact) => artifact.confidenceMetadata),
      governanceMetadata: sourceArtifacts.flatMap((artifact) => artifact.governanceMetadata),
      materialityMetadata: sourceArtifacts.flatMap((artifact) => artifact.materialityMetadata),
      personaCompatibility: sourceArtifacts.flatMap((artifact) => artifact.personaCompatibility),
      packageCompatibility: sourceArtifacts.flatMap((artifact) => artifact.packageCompatibility),
      memoryCompatibility: sourceArtifacts.flatMap((artifact) => artifact.memoryCompatibility),
      learningCompatibility: sourceArtifacts.flatMap((artifact) => artifact.learningCompatibility),
      surfaceCompatibility: sourceArtifacts.flatMap((artifact) => artifact.surfaceCompatibility),
      executable: false,
      actionReady: false,
      workflowReady: false,
      phase38Required: true,
      sourceKnowledgeObjects: getKnowledgeObjects(input),
      sourceKnowledgeRelationships: getKnowledgeRelationships(input),
      sourceOrganizationalMemoryPackages: getOrganizationalMemoryPackages(input),
      sourceOrganizationalMemoryGraphs: getOrganizationalMemoryGraphs(input),
      sourceOrganizationalMemoryArchives: getOrganizationalMemoryArchives(input),
      sourceMemoryPreservationPackages: getMemoryPreservationPackages(input),
      warnings,
    },
    skipped: false,
    warnings,
  };
}

function buildMethodologyRelationshipKey(input: BuildMethodologyRelationshipInput): string {
  const sourceObject = input.sourceMethodologyObject;
  const targetObject = input.targetMethodologyObject;
  return stableSnapshotHash({
    methodologyRelationshipCategory: input.methodologyRelationshipCategory,
    methodologyRelationshipType: input.methodologyRelationshipType,
    companyId: sourceObject?.companyId ?? null,
    scope: sourceObject?.scope ?? null,
    sourceMethodologyObjectId: sourceObject?.methodologyObjectId ?? null,
    targetMethodologyObjectId: targetObject?.methodologyObjectId ?? null,
    sourceMethodologyObjectKey: sourceObject?.methodologyObjectKey ?? null,
    targetMethodologyObjectKey: targetObject?.methodologyObjectKey ?? null,
    customerIsolation: sourceObject?.customerIsolation ?? null,
    firmIsolation: sourceObject?.firmIsolation ?? null,
    clientIsolation: sourceObject?.clientIsolation ?? null,
    sourceCustomerIsolation: sourceObject?.customerIsolation ?? null,
    sourceFirmIsolation: sourceObject?.firmIsolation ?? null,
    sourceClientIsolation: sourceObject?.clientIsolation ?? null,
    targetCustomerIsolation: targetObject?.customerIsolation ?? null,
    targetFirmIsolation: targetObject?.firmIsolation ?? null,
    targetClientIsolation: targetObject?.clientIsolation ?? null,
    methodologyAncestryIds: [
      ...(sourceObject?.methodologyAncestryIds ?? []),
      ...(targetObject?.methodologyAncestryIds ?? []),
    ],
    sourceKnowledgeObjectIds: [
      ...(sourceObject?.sourceKnowledgeObjectIds ?? []),
      ...(targetObject?.sourceKnowledgeObjectIds ?? []),
    ],
    sourceOrganizationalMemoryPackageIds: [
      ...(sourceObject?.sourceOrganizationalMemoryPackageIds ?? []),
      ...(targetObject?.sourceOrganizationalMemoryPackageIds ?? []),
    ],
  });
}

function buildMethodologyRelationshipId(input: BuildMethodologyRelationshipInput): string {
  return `synthetic-methodology-relationship:${stableSnapshotHash({
    methodologyRelationshipKey: buildMethodologyRelationshipKey(input),
    methodologyRelationshipCategory: input.methodologyRelationshipCategory,
    methodologyRelationshipType: input.methodologyRelationshipType,
    sourceMethodologyObjectId: input.sourceMethodologyObject?.methodologyObjectId ?? null,
    targetMethodologyObjectId: input.targetMethodologyObject?.methodologyObjectId ?? null,
  })}`;
}

function buildMethodologyRelationshipDerivationHash(input: BuildMethodologyRelationshipInput): string {
  return stableSnapshotHash({
    sourceMethodologyObjectId: input.sourceMethodologyObject?.methodologyObjectId ?? null,
    targetMethodologyObjectId: input.targetMethodologyObject?.methodologyObjectId ?? null,
    methodologyRelationshipCategory: input.methodologyRelationshipCategory,
    methodologyRelationshipType: input.methodologyRelationshipType,
    methodologyAncestryIds: [
      ...(input.sourceMethodologyObject?.methodologyAncestryIds ?? []),
      ...(input.targetMethodologyObject?.methodologyAncestryIds ?? []),
    ],
    sourceKnowledgeObjectIds: [
      ...(input.sourceMethodologyObject?.sourceKnowledgeObjectIds ?? []),
      ...(input.targetMethodologyObject?.sourceKnowledgeObjectIds ?? []),
    ],
  });
}

function validateMethodologyRelationshipInput(input: BuildMethodologyRelationshipInput): string[] {
  const warnings: string[] = [];
  const sourceObject = input.sourceMethodologyObject;
  const targetObject = input.targetMethodologyObject;

  if (!sourceObject) warnings.push("sourceMethodologyObject is required.");
  if (!targetObject) warnings.push("targetMethodologyObject is required.");
  if (!hasValue(input.methodologyRelationshipCategory)) warnings.push("methodologyRelationshipCategory is required.");
  if (!isSupportedMethodologyRelationshipCategory(input.methodologyRelationshipCategory)) {
    warnings.push("methodologyRelationshipCategory must be supported.");
  }
  if (!hasValue(input.methodologyRelationshipType)) warnings.push("methodologyRelationshipType is required.");
  if (!isSupportedMethodologyRelationshipType(input.methodologyRelationshipType)) {
    warnings.push("methodologyRelationshipType must be supported.");
  }
  if (!sourceObject || !targetObject) return warnings;

  if (!hasValue(sourceObject.methodologyObjectId)) warnings.push("sourceMethodologyObject.methodologyObjectId is required.");
  if (!hasValue(sourceObject.methodologyObjectKey)) warnings.push("sourceMethodologyObject.methodologyObjectKey is required.");
  if (!hasValue(targetObject.methodologyObjectId)) warnings.push("targetMethodologyObject.methodologyObjectId is required.");
  if (!hasValue(targetObject.methodologyObjectKey)) warnings.push("targetMethodologyObject.methodologyObjectKey is required.");
  if (!sourceObject.customerIsolation) warnings.push("sourceMethodologyObject.customerIsolation is required.");
  if (!sourceObject.firmIsolation) warnings.push("sourceMethodologyObject.firmIsolation is required.");
  if (!sourceObject.clientIsolation) warnings.push("sourceMethodologyObject.clientIsolation is required.");
  if (!targetObject.customerIsolation) warnings.push("targetMethodologyObject.customerIsolation is required.");
  if (!targetObject.firmIsolation) warnings.push("targetMethodologyObject.firmIsolation is required.");
  if (!targetObject.clientIsolation) warnings.push("targetMethodologyObject.clientIsolation is required.");
  if (sourceObject.companyId !== targetObject.companyId) {
    warnings.push("sourceMethodologyObject.companyId must equal targetMethodologyObject.companyId.");
  }
  if (isCrossScope(sourceObject, targetObject) && input.crossScopeReference !== true) {
    warnings.push("crossScopeReference must be true when source and target isolation differ.");
  }

  return warnings;
}

export function buildMethodologyRelationship(input: BuildMethodologyRelationshipInput): BuildMethodologyRelationshipResult {
  const fatalWarnings = validateMethodologyRelationshipInput(input);
  if (fatalWarnings.length > 0 || !input.sourceMethodologyObject || !input.targetMethodologyObject) {
    return {
      methodologyRelationship: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const sourceObject = input.sourceMethodologyObject;
  const targetObject = input.targetMethodologyObject;
  const warnings = getForwardCompatibilityWarnings(
    input.healthcarePpdObservationIds,
    input.payrollObservationIds,
    input.methodologyObservationIds,
  );

  return {
    methodologyRelationship: {
      methodologyRelationshipId: buildMethodologyRelationshipId(input),
      methodologyRelationshipKey: buildMethodologyRelationshipKey(input),
      methodologyRelationshipCategory: input.methodologyRelationshipCategory,
      methodologyRelationshipType: input.methodologyRelationshipType,
      companyId: sourceObject.companyId,
      scope: sourceObject.scope,
      sourceMethodologyObjectId: sourceObject.methodologyObjectId,
      targetMethodologyObjectId: targetObject.methodologyObjectId,
      sourceMethodologyObjectKey: sourceObject.methodologyObjectKey,
      targetMethodologyObjectKey: targetObject.methodologyObjectKey,
      customerIsolation: sourceObject.customerIsolation,
      firmIsolation: sourceObject.firmIsolation,
      clientIsolation: sourceObject.clientIsolation,
      sourceCustomerIsolation: sourceObject.customerIsolation,
      sourceFirmIsolation: sourceObject.firmIsolation,
      sourceClientIsolation: sourceObject.clientIsolation,
      targetCustomerIsolation: targetObject.customerIsolation,
      targetFirmIsolation: targetObject.firmIsolation,
      targetClientIsolation: targetObject.clientIsolation,
      crossScopeReference: isCrossScope(sourceObject, targetObject) ? input.crossScopeReference === true : input.crossScopeReference === true,
      methodologyAncestryIds: [
        ...sourceObject.methodologyAncestryIds,
        ...targetObject.methodologyAncestryIds,
      ],
      sourceKnowledgeObjectIds: [
        ...sourceObject.sourceKnowledgeObjectIds,
        ...targetObject.sourceKnowledgeObjectIds,
      ],
      sourceKnowledgePackageIds: [
        ...sourceObject.sourceKnowledgePackageIds,
        ...targetObject.sourceKnowledgePackageIds,
      ],
      sourceOrganizationalMemoryPackageIds: [
        ...sourceObject.sourceOrganizationalMemoryPackageIds,
        ...targetObject.sourceOrganizationalMemoryPackageIds,
      ],
      methodologyLineageReferenceIds: [
        ...sourceObject.methodologyLineageReferenceIds,
        ...targetObject.methodologyLineageReferenceIds,
      ],
      methodologyEvidenceReferenceIds: [
        ...sourceObject.methodologyEvidenceReferenceIds,
        ...targetObject.methodologyEvidenceReferenceIds,
      ],
      methodologySourceReferenceIds: [
        ...sourceObject.methodologySourceReferenceIds,
        ...targetObject.methodologySourceReferenceIds,
      ],
      methodologyDerivationMethod: "methodology_relationship_preservation",
      methodologyDerivationHash: buildMethodologyRelationshipDerivationHash(input),
      supersedesMethodologyIds: [
        ...sourceObject.supersedesMethodologyIds,
        ...targetObject.supersedesMethodologyIds,
      ],
      supersededByMethodologyIds: [
        ...sourceObject.supersededByMethodologyIds,
        ...targetObject.supersededByMethodologyIds,
      ],
      methodologyStaleMarker: sourceObject.methodologyStaleMarker,
      methodologyStalenessReasonReferenceIds: [
        ...sourceObject.methodologyStalenessReasonReferenceIds,
        ...targetObject.methodologyStalenessReasonReferenceIds,
      ],
      confidenceFloorMetadata: [
        ...sourceObject.confidenceFloorMetadata,
        ...targetObject.confidenceFloorMetadata,
      ],
      sourceConfidenceReferenceIds: [
        ...sourceObject.sourceConfidenceReferenceIds,
        ...targetObject.sourceConfidenceReferenceIds,
      ],
      evidenceReferenceIds: [
        ...sourceObject.evidenceReferenceIds,
        ...targetObject.evidenceReferenceIds,
      ],
      sourceReferenceIds: [
        ...sourceObject.sourceReferenceIds,
        ...targetObject.sourceReferenceIds,
      ],
      lineageReferenceIds: [
        ...sourceObject.lineageReferenceIds,
        ...targetObject.lineageReferenceIds,
      ],
      upstreamObservationIds: [
        ...sourceObject.upstreamObservationIds,
        ...targetObject.upstreamObservationIds,
      ],
      upstreamPackageIds: [
        ...sourceObject.upstreamPackageIds,
        ...targetObject.upstreamPackageIds,
      ],
      knowledgeObjectIds: [
        ...sourceObject.knowledgeObjectIds,
        ...targetObject.knowledgeObjectIds,
      ],
      knowledgeRelationshipIds: [
        ...sourceObject.knowledgeRelationshipIds,
        ...targetObject.knowledgeRelationshipIds,
      ],
      organizationalMemoryPackageIds: [
        ...sourceObject.organizationalMemoryPackageIds,
        ...targetObject.organizationalMemoryPackageIds,
      ],
      organizationalMemoryGraphIds: [
        ...sourceObject.organizationalMemoryGraphIds,
        ...targetObject.organizationalMemoryGraphIds,
      ],
      organizationalMemoryArchiveIds: [
        ...sourceObject.organizationalMemoryArchiveIds,
        ...targetObject.organizationalMemoryArchiveIds,
      ],
      memoryPreservationPackageIds: [
        ...sourceObject.memoryPreservationPackageIds,
        ...targetObject.memoryPreservationPackageIds,
      ],
      auditContractReferenceIds: [
        ...sourceObject.auditContractReferenceIds,
        ...targetObject.auditContractReferenceIds,
      ],
      auditCandidateIds: [
        ...sourceObject.auditCandidateIds,
        ...targetObject.auditCandidateIds,
      ],
      auditEvidencePackageIds: [
        ...sourceObject.auditEvidencePackageIds,
        ...targetObject.auditEvidencePackageIds,
      ],
      auditFindingArtifactIds: [
        ...sourceObject.auditFindingArtifactIds,
        ...targetObject.auditFindingArtifactIds,
      ],
      auditConfidenceIds: [
        ...sourceObject.auditConfidenceIds,
        ...targetObject.auditConfidenceIds,
      ],
      auditSurfaceIds: [
        ...sourceObject.auditSurfaceIds,
        ...targetObject.auditSurfaceIds,
      ],
      auditWatchlistIds: [
        ...sourceObject.auditWatchlistIds,
        ...targetObject.auditWatchlistIds,
      ],
      auditBriefingIds: [
        ...sourceObject.auditBriefingIds,
        ...targetObject.auditBriefingIds,
      ],
      healthcarePpdObservationIds: getInputArray(input.healthcarePpdObservationIds),
      payrollObservationIds: getInputArray(input.payrollObservationIds),
      methodologyObservationIds: getInputArray(input.methodologyObservationIds),
      trustMetadata: [
        ...sourceObject.trustMetadata,
        ...targetObject.trustMetadata,
      ],
      confidenceMetadata: [
        ...sourceObject.confidenceMetadata,
        ...targetObject.confidenceMetadata,
      ],
      governanceMetadata: [
        ...sourceObject.governanceMetadata,
        ...targetObject.governanceMetadata,
      ],
      materialityMetadata: [
        ...sourceObject.materialityMetadata,
        ...targetObject.materialityMetadata,
      ],
      personaCompatibility: [
        ...sourceObject.personaCompatibility,
        ...targetObject.personaCompatibility,
      ],
      packageCompatibility: [
        ...sourceObject.packageCompatibility,
        ...targetObject.packageCompatibility,
      ],
      memoryCompatibility: [
        ...sourceObject.memoryCompatibility,
        ...targetObject.memoryCompatibility,
      ],
      learningCompatibility: [
        ...sourceObject.learningCompatibility,
        ...targetObject.learningCompatibility,
      ],
      surfaceCompatibility: [
        ...sourceObject.surfaceCompatibility,
        ...targetObject.surfaceCompatibility,
      ],
      executable: false,
      actionReady: false,
      workflowReady: false,
      phase38Required: true,
      sourceMethodologyObject: sourceObject,
      targetMethodologyObject: targetObject,
      warnings,
    },
    skipped: false,
    warnings,
  };
}
