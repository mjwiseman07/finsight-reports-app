import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticMemoryObject,
  SyntheticMemoryObjectIsolationDimension,
  SyntheticMemoryObjectSourceArtifact,
} from "../memory-object";
import type {
  SyntheticAuditConfidenceMetadata,
  SyntheticAuditContract,
  SyntheticAuditExceptionMetadata,
  SyntheticAuditFindingMetadata,
  SyntheticAuditGovernanceMetadata,
  SyntheticAuditLearningCompatibility,
  SyntheticAuditMaterialityCompatibility,
  SyntheticAuditMemoryCompatibility,
  SyntheticAuditObservationMetadata,
  SyntheticAuditPackageCompatibility,
  SyntheticAuditPersonaCompatibility,
  SyntheticAuditRiskMetadata,
  SyntheticAuditScope,
  SyntheticAuditSurfaceCompatibility,
  SyntheticAuditTrustMetadata,
} from "../../audit/types";

export type SyntheticMemoryRelationshipCategory =
  | "organizational_context_relationship"
  | "audit_context_relationship"
  | "controller_context_relationship"
  | "evidence_context_relationship"
  | "package_lineage_relationship"
  | "historical_context_relationship"
  | "cross_period_context_relationship"
  | "cross_entity_context_relationship"
  | "cross_function_context_relationship";

export const SYNTHETIC_MEMORY_RELATIONSHIP_CATEGORIES: SyntheticMemoryRelationshipCategory[] = [
  "organizational_context_relationship",
  "audit_context_relationship",
  "controller_context_relationship",
  "evidence_context_relationship",
  "package_lineage_relationship",
  "historical_context_relationship",
  "cross_period_context_relationship",
  "cross_entity_context_relationship",
  "cross_function_context_relationship",
];

export type SyntheticMemoryRelationshipType =
  | "supports"
  | "relates_to"
  | "derived_from"
  | "same_source_as"
  | "same_package_lineage_as"
  | "precedes"
  | "supersedes"
  | "context_for"
  | "reference_only";

export const SYNTHETIC_MEMORY_RELATIONSHIP_TYPES: SyntheticMemoryRelationshipType[] = [
  "supports",
  "relates_to",
  "derived_from",
  "same_source_as",
  "same_package_lineage_as",
  "precedes",
  "supersedes",
  "context_for",
  "reference_only",
];

export interface BuildMemoryRelationshipInput {
  auditContract: SyntheticAuditContract | null;
  relationshipCategory: SyntheticMemoryRelationshipCategory;
  relationshipType: SyntheticMemoryRelationshipType;
  sourceMemoryObject: SyntheticMemoryObject | null;
  targetMemoryObject: SyntheticMemoryObject | null;
  crossScopeReference?: boolean;
  referenceArtifacts?: SyntheticMemoryObjectSourceArtifact[];
  healthcarePpdObservations?: SyntheticMemoryObjectSourceArtifact[];
  payrollObservations?: SyntheticMemoryObjectSourceArtifact[];
  methodologyObservations?: SyntheticMemoryObjectSourceArtifact[];
}

export interface SyntheticMemoryRelationship {
  memoryRelationshipId: string;
  memoryRelationshipKey: string;
  relationshipCategory: SyntheticMemoryRelationshipCategory;
  relationshipType: SyntheticMemoryRelationshipType;
  companyId: string;
  scope: SyntheticAuditScope;
  sourceMemoryObjectId: string;
  targetMemoryObjectId: string;
  sourceMemoryObjectKey: string;
  targetMemoryObjectKey: string;
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
  evidenceReferenceIds: string[];
  sourceReferenceIds: string[];
  lineageReferenceIds: string[];
  upstreamObservationIds: string[];
  upstreamPackageIds: string[];
  memoryObjectIds: string[];
  auditContractReferenceIds: string[];
  auditCandidateIds: string[];
  auditEvidencePackageIds: string[];
  auditFindingArtifactIds: string[];
  auditFindingIds: string[];
  auditConfidenceIds: string[];
  auditSurfaceIds: string[];
  auditWatchlistIds: string[];
  auditBriefingIds: string[];
  healthcarePpdObservationIds: string[];
  payrollObservationIds: string[];
  methodologyObservationIds: string[];
  observationMetadata: SyntheticAuditObservationMetadata[];
  findingMetadata: SyntheticAuditFindingMetadata[];
  exceptionMetadata: SyntheticAuditExceptionMetadata[];
  riskMetadata: SyntheticAuditRiskMetadata[];
  trustMetadata: SyntheticAuditTrustMetadata[];
  confidenceMetadata: SyntheticAuditConfidenceMetadata[];
  governanceMetadata: SyntheticAuditGovernanceMetadata[];
  materialityMetadata: SyntheticAuditMaterialityCompatibility[];
  materialityCompatibility: SyntheticAuditMaterialityCompatibility[];
  personaCompatibility: SyntheticAuditPersonaCompatibility[];
  packageCompatibility: SyntheticAuditPackageCompatibility[];
  memoryCompatibility: SyntheticAuditMemoryCompatibility[];
  learningCompatibility: SyntheticAuditLearningCompatibility[];
  surfaceCompatibility: SyntheticAuditSurfaceCompatibility[];
  sourceMemoryObject: SyntheticMemoryObject;
  targetMemoryObject: SyntheticMemoryObject;
  referenceArtifacts: SyntheticMemoryObjectSourceArtifact[];
  healthcarePpdObservations: SyntheticMemoryObjectSourceArtifact[];
  payrollObservations: SyntheticMemoryObjectSourceArtifact[];
  methodologyObservations: SyntheticMemoryObjectSourceArtifact[];
  warnings: string[];
}

export interface BuildMemoryRelationshipResult {
  memoryRelationship: SyntheticMemoryRelationship | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function uniqueStable(values: string[]): string[] {
  return [...new Set(values.filter(hasValue))];
}

function compactDefined<T>(values: Array<T | undefined>): T[] {
  return values.filter((value): value is T => value !== undefined);
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getStringProperty(value: object, propertyName: string): string[] {
  const property = (value as Record<string, unknown>)[propertyName];
  return typeof property === "string" ? [property] : [];
}

function getStringArrayProperty(value: object, propertyName: string): string[] {
  const property = (value as Record<string, unknown>)[propertyName];
  return Array.isArray(property) ? property.filter((item): item is string => typeof item === "string") : [];
}

function getObjectArrayProperty<T>(value: object, propertyName: string): T[] {
  const property = (value as Record<string, unknown>)[propertyName];
  return Array.isArray(property) ? (property as T[]) : [];
}

function isSupportedRelationshipCategory(relationshipCategory: SyntheticMemoryRelationshipCategory): boolean {
  return SYNTHETIC_MEMORY_RELATIONSHIP_CATEGORIES.includes(relationshipCategory);
}

function isSupportedRelationshipType(relationshipType: SyntheticMemoryRelationshipType): boolean {
  return SYNTHETIC_MEMORY_RELATIONSHIP_TYPES.includes(relationshipType);
}

function buildCustomerIsolation(scope: SyntheticAuditScope): SyntheticMemoryObjectIsolationDimension {
  return { required: scope.customerIsolationRequired, referenceIds: uniqueStable([scope.companyId, ...scope.isolationBoundaryIds]) };
}

function buildFirmIsolation(scope: SyntheticAuditScope): SyntheticMemoryObjectIsolationDimension {
  return {
    required: scope.firmIsolationRequired,
    referenceIds: uniqueStable([scope.firmId, ...scope.isolationBoundaryIds].filter((value): value is string => value !== undefined)),
  };
}

function buildClientIsolation(scope: SyntheticAuditScope): SyntheticMemoryObjectIsolationDimension {
  return {
    required: scope.clientIsolationRequired,
    referenceIds: uniqueStable([scope.clientId, ...scope.isolationBoundaryIds].filter((value): value is string => value !== undefined)),
  };
}

function getAllReferenceArtifacts(input: BuildMemoryRelationshipInput): SyntheticMemoryObjectSourceArtifact[] {
  return [
    ...getInputArray(input.referenceArtifacts),
    ...getInputArray(input.healthcarePpdObservations),
    ...getInputArray(input.payrollObservations),
    ...getInputArray(input.methodologyObservations),
  ];
}

function getMemoryObjects(input: BuildMemoryRelationshipInput): SyntheticMemoryObject[] {
  return compactDefined([input.sourceMemoryObject ?? undefined, input.targetMemoryObject ?? undefined]);
}

function areIsolationDimensionsEqual(
  sourceIsolation: SyntheticMemoryObjectIsolationDimension,
  targetIsolation: SyntheticMemoryObjectIsolationDimension,
): boolean {
  return stableSnapshotHash(sourceIsolation) === stableSnapshotHash(targetIsolation);
}

function isCrossScopeRelationship(input: BuildMemoryRelationshipInput): boolean {
  if (!input.sourceMemoryObject || !input.targetMemoryObject) return false;

  return (
    !areIsolationDimensionsEqual(input.sourceMemoryObject.customerIsolation, input.targetMemoryObject.customerIsolation) ||
    !areIsolationDimensionsEqual(input.sourceMemoryObject.firmIsolation, input.targetMemoryObject.firmIsolation) ||
    !areIsolationDimensionsEqual(input.sourceMemoryObject.clientIsolation, input.targetMemoryObject.clientIsolation)
  );
}

function getReferenceIds(input: BuildMemoryRelationshipInput, singularName: string, arrayName: string): string[] {
  return uniqueStable([
    ...getMemoryObjects(input).flatMap((memoryObject) => [
      ...getStringProperty(memoryObject, singularName),
      ...getStringArrayProperty(memoryObject, arrayName),
    ]),
    ...getAllReferenceArtifacts(input).flatMap((referenceArtifact) => [
      ...getStringProperty(referenceArtifact, singularName),
      ...getStringArrayProperty(referenceArtifact, arrayName),
    ]),
  ]);
}

function getEvidenceReferenceIds(input: BuildMemoryRelationshipInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.evidenceIds ?? []),
    ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.evidenceReferenceIds),
    ...getAllReferenceArtifacts(input).flatMap((referenceArtifact) => referenceArtifact.evidenceReferenceIds ?? []),
  ]);
}

function getSourceReferenceIds(input: BuildMemoryRelationshipInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.sourceReferenceIds ?? []),
    ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.sourceReferenceIds),
    ...getAllReferenceArtifacts(input).flatMap((referenceArtifact) => referenceArtifact.sourceReferenceIds ?? []),
  ]);
}

function getLineageReferenceIds(input: BuildMemoryRelationshipInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.lineageReferenceIds ?? []),
    ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.lineageReferenceIds),
    ...getAllReferenceArtifacts(input).flatMap((referenceArtifact) => referenceArtifact.lineageReferenceIds ?? []),
  ]);
}

function getUpstreamObservationIds(input: BuildMemoryRelationshipInput): string[] {
  return uniqueStable([
    ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.upstreamObservationIds),
    ...getAllReferenceArtifacts(input).flatMap((referenceArtifact) => [
      ...getStringProperty(referenceArtifact, "observationId"),
      ...(referenceArtifact.upstreamObservationIds ?? []),
    ]),
  ]);
}

function getUpstreamPackageIds(input: BuildMemoryRelationshipInput): string[] {
  return uniqueStable([
    ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.upstreamPackageIds),
    ...getAllReferenceArtifacts(input).flatMap((referenceArtifact) => [
      ...getStringProperty(referenceArtifact, "packageId"),
      ...(referenceArtifact.upstreamPackageIds ?? []),
    ]),
  ]);
}

function getAuditContractReferenceIds(input: BuildMemoryRelationshipInput): string[] {
  const auditContract = input.auditContract;
  return uniqueStable([
    auditContract?.observationMetadata?.auditObservationId,
    auditContract?.findingMetadata?.auditFindingId,
    auditContract?.exceptionMetadata?.auditExceptionId,
    auditContract?.riskMetadata?.auditRiskId,
    ...(auditContract?.evidence.sourceReferenceIds ?? []),
    ...(auditContract?.evidence.lineageReferenceIds ?? []),
    ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.auditContractReferenceIds),
    ...getAllReferenceArtifacts(input).flatMap((referenceArtifact) => referenceArtifact.auditContractReferenceIds ?? []),
  ].filter((value): value is string => value !== undefined));
}

function buildMemoryRelationshipKey(input: BuildMemoryRelationshipInput): string {
  const auditContract = input.auditContract;
  const sourceMemoryObject = input.sourceMemoryObject;
  const targetMemoryObject = input.targetMemoryObject;
  const scope = auditContract?.scope;

  return stableSnapshotHash({
    relationshipCategory: input.relationshipCategory,
    relationshipType: input.relationshipType,
    companyId: scope?.companyId ?? null,
    scope: scope ?? null,
    sourceMemoryObjectId: sourceMemoryObject?.memoryObjectId ?? null,
    targetMemoryObjectId: targetMemoryObject?.memoryObjectId ?? null,
    sourceMemoryObjectKey: sourceMemoryObject?.memoryObjectKey ?? null,
    targetMemoryObjectKey: targetMemoryObject?.memoryObjectKey ?? null,
    customerIsolation: scope ? buildCustomerIsolation(scope) : null,
    firmIsolation: scope ? buildFirmIsolation(scope) : null,
    clientIsolation: scope ? buildClientIsolation(scope) : null,
    sourceCustomerIsolation: sourceMemoryObject?.customerIsolation ?? null,
    sourceFirmIsolation: sourceMemoryObject?.firmIsolation ?? null,
    sourceClientIsolation: sourceMemoryObject?.clientIsolation ?? null,
    targetCustomerIsolation: targetMemoryObject?.customerIsolation ?? null,
    targetFirmIsolation: targetMemoryObject?.firmIsolation ?? null,
    targetClientIsolation: targetMemoryObject?.clientIsolation ?? null,
    upstreamObservationIds: getUpstreamObservationIds(input),
    upstreamPackageIds: getUpstreamPackageIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    sourceReferenceIds: getSourceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
  });
}

function buildMemoryRelationshipId(input: BuildMemoryRelationshipInput): string {
  return `synthetic-memory-relationship:${stableSnapshotHash({
    memoryRelationshipKey: buildMemoryRelationshipKey(input),
    relationshipCategory: input.relationshipCategory,
    relationshipType: input.relationshipType,
    companyId: input.auditContract?.scope.companyId ?? null,
  })}`;
}

function getMaterialityMetadata(input: BuildMemoryRelationshipInput): SyntheticAuditMaterialityCompatibility[] {
  return compactDefined([
    input.auditContract?.materialityCompatibility,
    ...getMemoryObjects(input).flatMap((memoryObject) => [
      ...memoryObject.materialityMetadata,
      ...memoryObject.materialityCompatibility,
    ]),
    ...getAllReferenceArtifacts(input).flatMap((referenceArtifact) => [
      ...getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(referenceArtifact, "materialityMetadata"),
      ...getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(referenceArtifact, "materialityCompatibility"),
    ]),
  ]);
}

function getForwardCompatibilityWarnings(input: BuildMemoryRelationshipInput): string[] {
  return [
    ...(getInputArray(input.healthcarePpdObservations).length > 0
      ? ["healthcare PPD observations are forward-compatible references."]
      : []),
    ...(getInputArray(input.payrollObservations).length > 0 ? ["payroll observations are forward-compatible references."] : []),
    ...(getInputArray(input.methodologyObservations).length > 0
      ? ["methodology observations are Phase 37 reference-only inputs."]
      : []),
  ];
}

function validateInput(input: BuildMemoryRelationshipInput): string[] {
  const warnings: string[] = [];
  const auditContract = input.auditContract;
  const sourceMemoryObject = input.sourceMemoryObject;
  const targetMemoryObject = input.targetMemoryObject;

  if (!auditContract) warnings.push("auditContract is required.");
  if (!sourceMemoryObject) warnings.push("sourceMemoryObject is required.");
  if (!targetMemoryObject) warnings.push("targetMemoryObject is required.");
  if (!auditContract || !sourceMemoryObject || !targetMemoryObject) return warnings;

  if (!hasValue(input.relationshipCategory)) warnings.push("relationshipCategory is required.");
  if (!isSupportedRelationshipCategory(input.relationshipCategory)) warnings.push("relationshipCategory must be supported.");
  if (!hasValue(input.relationshipType)) warnings.push("relationshipType is required.");
  if (!isSupportedRelationshipType(input.relationshipType)) warnings.push("relationshipType must be supported.");
  if (!auditContract.scope) warnings.push("auditContract.scope is required.");
  if (!auditContract.evidence) warnings.push("auditContract.evidence is required.");
  if (!auditContract.scope || !auditContract.evidence) return warnings;

  if (!hasValue(auditContract.scope.companyId)) warnings.push("scope.companyId is required.");
  if (!hasValue(sourceMemoryObject.memoryObjectId)) warnings.push("sourceMemoryObject.memoryObjectId is required.");
  if (!hasValue(targetMemoryObject.memoryObjectId)) warnings.push("targetMemoryObject.memoryObjectId is required.");
  if (!hasValue(sourceMemoryObject.memoryObjectKey)) warnings.push("sourceMemoryObject.memoryObjectKey is required.");
  if (!hasValue(targetMemoryObject.memoryObjectKey)) warnings.push("targetMemoryObject.memoryObjectKey is required.");
  if (sourceMemoryObject.companyId !== auditContract.scope.companyId) warnings.push("sourceMemoryObject.companyId must match scope.companyId.");
  if (targetMemoryObject.companyId !== auditContract.scope.companyId) warnings.push("targetMemoryObject.companyId must match scope.companyId.");

  if (isCrossScopeRelationship(input) && input.crossScopeReference !== true) {
    warnings.push("crossScopeReference must be true when source and target isolation differ.");
  }

  const companyId = auditContract.scope.companyId;
  for (const [inputName, values] of [
    ["referenceArtifacts", getInputArray(input.referenceArtifacts)],
    ["healthcarePpdObservations", getInputArray(input.healthcarePpdObservations)],
    ["payrollObservations", getInputArray(input.payrollObservations)],
    ["methodologyObservations", getInputArray(input.methodologyObservations)],
  ] as const) {
    values.forEach((referenceArtifact, index) => {
      if (!hasValue(referenceArtifact.companyId)) warnings.push(`${inputName}[${index}].companyId is required.`);
      if (referenceArtifact.companyId && referenceArtifact.companyId !== companyId) {
        warnings.push(`${inputName}[${index}].companyId must match scope.companyId.`);
      }
    });
  }

  return warnings;
}

export function buildMemoryRelationship(input: BuildMemoryRelationshipInput): BuildMemoryRelationshipResult {
  const fatalWarnings = validateInput(input);
  if (fatalWarnings.length > 0 || !input.auditContract || !input.sourceMemoryObject || !input.targetMemoryObject) {
    return {
      memoryRelationship: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const auditContract = input.auditContract;
  const sourceMemoryObject = input.sourceMemoryObject;
  const targetMemoryObject = input.targetMemoryObject;
  const referenceArtifacts = getInputArray(input.referenceArtifacts);
  const materialityMetadata = getMaterialityMetadata(input);
  const warnings = getForwardCompatibilityWarnings(input);
  const crossScopeReference = isCrossScopeRelationship(input);

  return {
    memoryRelationship: {
      memoryRelationshipId: buildMemoryRelationshipId(input),
      memoryRelationshipKey: buildMemoryRelationshipKey(input),
      relationshipCategory: input.relationshipCategory,
      relationshipType: input.relationshipType,
      companyId: auditContract.scope.companyId,
      scope: auditContract.scope,
      sourceMemoryObjectId: sourceMemoryObject.memoryObjectId,
      targetMemoryObjectId: targetMemoryObject.memoryObjectId,
      sourceMemoryObjectKey: sourceMemoryObject.memoryObjectKey,
      targetMemoryObjectKey: targetMemoryObject.memoryObjectKey,
      customerIsolation: buildCustomerIsolation(auditContract.scope),
      firmIsolation: buildFirmIsolation(auditContract.scope),
      clientIsolation: buildClientIsolation(auditContract.scope),
      sourceCustomerIsolation: sourceMemoryObject.customerIsolation,
      sourceFirmIsolation: sourceMemoryObject.firmIsolation,
      sourceClientIsolation: sourceMemoryObject.clientIsolation,
      targetCustomerIsolation: targetMemoryObject.customerIsolation,
      targetFirmIsolation: targetMemoryObject.firmIsolation,
      targetClientIsolation: targetMemoryObject.clientIsolation,
      crossScopeReference,
      evidenceReferenceIds: getEvidenceReferenceIds(input),
      sourceReferenceIds: getSourceReferenceIds(input),
      lineageReferenceIds: getLineageReferenceIds(input),
      upstreamObservationIds: getUpstreamObservationIds(input),
      upstreamPackageIds: getUpstreamPackageIds(input),
      memoryObjectIds: uniqueStable([sourceMemoryObject.memoryObjectId, targetMemoryObject.memoryObjectId]),
      auditContractReferenceIds: getAuditContractReferenceIds(input),
      auditCandidateIds: getReferenceIds(input, "auditCandidateId", "auditCandidateIds"),
      auditEvidencePackageIds: getReferenceIds(input, "auditEvidencePackageId", "auditEvidencePackageIds"),
      auditFindingArtifactIds: getReferenceIds(input, "auditFindingArtifactId", "auditFindingArtifactIds"),
      auditFindingIds: getReferenceIds(input, "auditFindingId", "auditFindingIds"),
      auditConfidenceIds: getReferenceIds(input, "auditConfidenceId", "auditConfidenceIds"),
      auditSurfaceIds: getReferenceIds(input, "auditSurfaceId", "auditSurfaceIds"),
      auditWatchlistIds: getReferenceIds(input, "auditWatchlistId", "auditWatchlistIds"),
      auditBriefingIds: getReferenceIds(input, "auditBriefingId", "auditBriefingIds"),
      healthcarePpdObservationIds: getReferenceIds(input, "healthcarePpdObservationId", "healthcarePpdObservationIds"),
      payrollObservationIds: getReferenceIds(input, "payrollObservationId", "payrollObservationIds"),
      methodologyObservationIds: getReferenceIds(input, "methodologyObservationId", "methodologyObservationIds"),
      observationMetadata: compactDefined([
        auditContract.observationMetadata,
        ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.observationMetadata),
        ...referenceArtifacts.flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditObservationMetadata>(referenceArtifact, "observationMetadata"),
        ),
      ]),
      findingMetadata: compactDefined([
        auditContract.findingMetadata,
        ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.findingMetadata),
        ...referenceArtifacts.flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditFindingMetadata>(referenceArtifact, "findingMetadata"),
        ),
      ]),
      exceptionMetadata: compactDefined([
        auditContract.exceptionMetadata,
        ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.exceptionMetadata),
        ...referenceArtifacts.flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditExceptionMetadata>(referenceArtifact, "exceptionMetadata"),
        ),
      ]),
      riskMetadata: compactDefined([
        auditContract.riskMetadata,
        ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.riskMetadata),
        ...referenceArtifacts.flatMap((referenceArtifact) => getObjectArrayProperty<SyntheticAuditRiskMetadata>(referenceArtifact, "riskMetadata")),
      ]),
      trustMetadata: compactDefined([
        auditContract.trustMetadata,
        ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.trustMetadata),
        ...referenceArtifacts.flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditTrustMetadata>(referenceArtifact, "trustMetadata"),
        ),
      ]),
      confidenceMetadata: compactDefined([
        auditContract.confidenceMetadata,
        ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.confidenceMetadata),
        ...referenceArtifacts.flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditConfidenceMetadata>(referenceArtifact, "confidenceMetadata"),
        ),
      ]),
      governanceMetadata: compactDefined([
        auditContract.governanceMetadata,
        ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.governanceMetadata),
        ...referenceArtifacts.flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditGovernanceMetadata>(referenceArtifact, "governanceMetadata"),
        ),
      ]),
      materialityMetadata,
      materialityCompatibility: materialityMetadata,
      personaCompatibility: compactDefined([
        auditContract.personaCompatibility,
        ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.personaCompatibility),
        ...referenceArtifacts.flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditPersonaCompatibility>(referenceArtifact, "personaCompatibility"),
        ),
      ]),
      packageCompatibility: compactDefined([
        auditContract.packageCompatibility,
        ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.packageCompatibility),
        ...referenceArtifacts.flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditPackageCompatibility>(referenceArtifact, "packageCompatibility"),
        ),
      ]),
      memoryCompatibility: compactDefined([
        auditContract.memoryCompatibility,
        ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.memoryCompatibility),
        ...referenceArtifacts.flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditMemoryCompatibility>(referenceArtifact, "memoryCompatibility"),
        ),
      ]),
      learningCompatibility: compactDefined([
        auditContract.learningCompatibility,
        ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.learningCompatibility),
        ...referenceArtifacts.flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditLearningCompatibility>(referenceArtifact, "learningCompatibility"),
        ),
      ]),
      surfaceCompatibility: compactDefined([
        auditContract.surfaceCompatibility,
        ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.surfaceCompatibility),
        ...referenceArtifacts.flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditSurfaceCompatibility>(referenceArtifact, "surfaceCompatibility"),
        ),
      ]),
      sourceMemoryObject,
      targetMemoryObject,
      referenceArtifacts,
      healthcarePpdObservations: getInputArray(input.healthcarePpdObservations),
      payrollObservations: getInputArray(input.payrollObservations),
      methodologyObservations: getInputArray(input.methodologyObservations),
      warnings,
    },
    skipped: false,
    warnings,
  };
}
