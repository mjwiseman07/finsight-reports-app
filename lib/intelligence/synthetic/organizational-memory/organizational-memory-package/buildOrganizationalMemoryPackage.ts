import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticMemoryObject,
  SyntheticMemoryObjectIsolationDimension,
  SyntheticMemoryObjectSourceArtifact,
} from "../memory-object";
import type { SyntheticMemoryRelationship } from "../memory-relationship";
import type { SyntheticEvidenceLineageGraph } from "../evidence-lineage-graph";
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

export type SyntheticOrganizationalMemoryPackageCategory =
  | "organizational_memory_package"
  | "audit_memory_package"
  | "controller_memory_package"
  | "evidence_memory_package"
  | "package_lineage_memory_package"
  | "historical_memory_package"
  | "cross_period_memory_package"
  | "cross_entity_memory_package"
  | "cross_function_memory_package";

export const SYNTHETIC_ORGANIZATIONAL_MEMORY_PACKAGE_CATEGORIES: SyntheticOrganizationalMemoryPackageCategory[] = [
  "organizational_memory_package",
  "audit_memory_package",
  "controller_memory_package",
  "evidence_memory_package",
  "package_lineage_memory_package",
  "historical_memory_package",
  "cross_period_memory_package",
  "cross_entity_memory_package",
  "cross_function_memory_package",
];

export interface BuildOrganizationalMemoryPackageInput {
  auditContract: SyntheticAuditContract | null;
  packageCategory: SyntheticOrganizationalMemoryPackageCategory;
  memoryObjects?: SyntheticMemoryObject[];
  memoryRelationships?: SyntheticMemoryRelationship[];
  evidenceLineageGraphs?: SyntheticEvidenceLineageGraph[];
  observationReferences?: SyntheticMemoryObjectSourceArtifact[];
  auditArtifactReferences?: SyntheticMemoryObjectSourceArtifact[];
  workflowPackageReferences?: SyntheticMemoryObjectSourceArtifact[];
  healthcarePpdObservations?: SyntheticMemoryObjectSourceArtifact[];
  payrollObservations?: SyntheticMemoryObjectSourceArtifact[];
  methodologyObservations?: SyntheticMemoryObjectSourceArtifact[];
}

export interface SyntheticOrganizationalMemoryPackage {
  organizationalMemoryPackageId: string;
  organizationalMemoryPackageKey: string;
  packageCategory: SyntheticOrganizationalMemoryPackageCategory;
  companyId: string;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  memoryObjectIds: string[];
  memoryRelationshipIds: string[];
  evidenceLineageGraphIds: string[];
  evidenceReferenceIds: string[];
  sourceReferenceIds: string[];
  lineageReferenceIds: string[];
  upstreamObservationIds: string[];
  upstreamPackageIds: string[];
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
  memoryObjects: SyntheticMemoryObject[];
  memoryRelationships: SyntheticMemoryRelationship[];
  evidenceLineageGraphs: SyntheticEvidenceLineageGraph[];
  observationReferences: SyntheticMemoryObjectSourceArtifact[];
  auditArtifactReferences: SyntheticMemoryObjectSourceArtifact[];
  workflowPackageReferences: SyntheticMemoryObjectSourceArtifact[];
  healthcarePpdObservations: SyntheticMemoryObjectSourceArtifact[];
  payrollObservations: SyntheticMemoryObjectSourceArtifact[];
  methodologyObservations: SyntheticMemoryObjectSourceArtifact[];
  warnings: string[];
}

export interface BuildOrganizationalMemoryPackageResult {
  organizationalMemoryPackage: SyntheticOrganizationalMemoryPackage | null;
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

function isSupportedPackageCategory(packageCategory: SyntheticOrganizationalMemoryPackageCategory): boolean {
  return SYNTHETIC_ORGANIZATIONAL_MEMORY_PACKAGE_CATEGORIES.includes(packageCategory);
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

function getMemoryObjects(input: BuildOrganizationalMemoryPackageInput): SyntheticMemoryObject[] {
  return getInputArray(input.memoryObjects);
}

function getMemoryRelationships(input: BuildOrganizationalMemoryPackageInput): SyntheticMemoryRelationship[] {
  return getInputArray(input.memoryRelationships);
}

function getEvidenceLineageGraphs(input: BuildOrganizationalMemoryPackageInput): SyntheticEvidenceLineageGraph[] {
  return getInputArray(input.evidenceLineageGraphs);
}

function getReferenceArtifacts(input: BuildOrganizationalMemoryPackageInput): SyntheticMemoryObjectSourceArtifact[] {
  return [
    ...getInputArray(input.observationReferences),
    ...getInputArray(input.auditArtifactReferences),
    ...getInputArray(input.workflowPackageReferences),
    ...getInputArray(input.healthcarePpdObservations),
    ...getInputArray(input.payrollObservations),
    ...getInputArray(input.methodologyObservations),
  ];
}

function getAllPrimitiveArtifacts(
  input: BuildOrganizationalMemoryPackageInput,
): Array<SyntheticMemoryObject | SyntheticMemoryRelationship | SyntheticEvidenceLineageGraph> {
  return [...getMemoryObjects(input), ...getMemoryRelationships(input), ...getEvidenceLineageGraphs(input)];
}

function getReferenceIds(input: BuildOrganizationalMemoryPackageInput, singularName: string, arrayName: string): string[] {
  return uniqueStable([
    ...getReferenceArtifacts(input).flatMap((referenceArtifact) => [
      ...getStringProperty(referenceArtifact, singularName),
      ...getStringArrayProperty(referenceArtifact, arrayName),
    ]),
    ...getAllPrimitiveArtifacts(input).flatMap((primitiveArtifact) => [
      ...getStringProperty(primitiveArtifact, singularName),
      ...getStringArrayProperty(primitiveArtifact, arrayName),
    ]),
  ]);
}

function getMemoryObjectIds(input: BuildOrganizationalMemoryPackageInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.supportingMemoryIds ?? []),
    ...getMemoryObjects(input).map((memoryObject) => memoryObject.memoryObjectId),
    ...getMemoryRelationships(input).flatMap((memoryRelationship) => memoryRelationship.memoryObjectIds),
    ...getEvidenceLineageGraphs(input).flatMap((evidenceLineageGraph) => evidenceLineageGraph.memoryObjectIds),
  ]);
}

function getMemoryRelationshipIds(input: BuildOrganizationalMemoryPackageInput): string[] {
  return uniqueStable([
    ...getMemoryRelationships(input).map((memoryRelationship) => memoryRelationship.memoryRelationshipId),
    ...getEvidenceLineageGraphs(input).flatMap((evidenceLineageGraph) => evidenceLineageGraph.memoryRelationshipIds),
  ]);
}

function getEvidenceLineageGraphIds(input: BuildOrganizationalMemoryPackageInput): string[] {
  return uniqueStable(getEvidenceLineageGraphs(input).map((evidenceLineageGraph) => evidenceLineageGraph.evidenceLineageGraphId));
}

function getEvidenceReferenceIds(input: BuildOrganizationalMemoryPackageInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.evidenceIds ?? []),
    ...getReferenceArtifacts(input).flatMap((referenceArtifact) => referenceArtifact.evidenceReferenceIds ?? []),
    ...getAllPrimitiveArtifacts(input).flatMap((primitiveArtifact) => primitiveArtifact.evidenceReferenceIds),
  ]);
}

function getSourceReferenceIds(input: BuildOrganizationalMemoryPackageInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.sourceReferenceIds ?? []),
    ...getReferenceArtifacts(input).flatMap((referenceArtifact) => referenceArtifact.sourceReferenceIds ?? []),
    ...getAllPrimitiveArtifacts(input).flatMap((primitiveArtifact) => primitiveArtifact.sourceReferenceIds),
  ]);
}

function getLineageReferenceIds(input: BuildOrganizationalMemoryPackageInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.lineageReferenceIds ?? []),
    ...getReferenceArtifacts(input).flatMap((referenceArtifact) => referenceArtifact.lineageReferenceIds ?? []),
    ...getAllPrimitiveArtifacts(input).flatMap((primitiveArtifact) => primitiveArtifact.lineageReferenceIds),
  ]);
}

function getUpstreamObservationIds(input: BuildOrganizationalMemoryPackageInput): string[] {
  return uniqueStable([
    input.auditContract?.observationMetadata?.auditObservationId,
    ...(input.auditContract?.evidence.supportingObservationIds ?? []),
    ...getReferenceArtifacts(input).flatMap((referenceArtifact) => [
      ...getStringProperty(referenceArtifact, "observationId"),
      ...(referenceArtifact.upstreamObservationIds ?? []),
    ]),
    ...getAllPrimitiveArtifacts(input).flatMap((primitiveArtifact) => primitiveArtifact.upstreamObservationIds),
  ].filter((value): value is string => value !== undefined));
}

function getUpstreamPackageIds(input: BuildOrganizationalMemoryPackageInput): string[] {
  return uniqueStable([
    ...getReferenceArtifacts(input).flatMap((referenceArtifact) => [
      ...getStringProperty(referenceArtifact, "packageId"),
      ...(referenceArtifact.upstreamPackageIds ?? []),
    ]),
    ...getAllPrimitiveArtifacts(input).flatMap((primitiveArtifact) => primitiveArtifact.upstreamPackageIds),
  ]);
}

function getAuditContractReferenceIds(input: BuildOrganizationalMemoryPackageInput): string[] {
  const auditContract = input.auditContract;
  return uniqueStable([
    auditContract?.observationMetadata?.auditObservationId,
    auditContract?.findingMetadata?.auditFindingId,
    auditContract?.exceptionMetadata?.auditExceptionId,
    auditContract?.riskMetadata?.auditRiskId,
    ...(auditContract?.evidence.sourceReferenceIds ?? []),
    ...(auditContract?.evidence.lineageReferenceIds ?? []),
    ...getReferenceArtifacts(input).flatMap((referenceArtifact) => referenceArtifact.auditContractReferenceIds ?? []),
    ...getAllPrimitiveArtifacts(input).flatMap((primitiveArtifact) => primitiveArtifact.auditContractReferenceIds),
  ].filter((value): value is string => value !== undefined));
}

function buildOrganizationalMemoryPackageKey(input: BuildOrganizationalMemoryPackageInput): string {
  const scope = input.auditContract?.scope;

  return stableSnapshotHash({
    packageCategory: input.packageCategory,
    companyId: scope?.companyId ?? null,
    scope: scope ?? null,
    customerIsolation: scope ? buildCustomerIsolation(scope) : null,
    firmIsolation: scope ? buildFirmIsolation(scope) : null,
    clientIsolation: scope ? buildClientIsolation(scope) : null,
    memoryObjectIds: getMemoryObjectIds(input),
    memoryRelationshipIds: getMemoryRelationshipIds(input),
    evidenceLineageGraphIds: getEvidenceLineageGraphIds(input),
    upstreamObservationIds: getUpstreamObservationIds(input),
    upstreamPackageIds: getUpstreamPackageIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    sourceReferenceIds: getSourceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
  });
}

function buildOrganizationalMemoryPackageId(input: BuildOrganizationalMemoryPackageInput): string {
  return `synthetic-organizational-memory-package:${stableSnapshotHash({
    organizationalMemoryPackageKey: buildOrganizationalMemoryPackageKey(input),
    packageCategory: input.packageCategory,
    companyId: input.auditContract?.scope.companyId ?? null,
  })}`;
}

function getMaterialityMetadata(input: BuildOrganizationalMemoryPackageInput): SyntheticAuditMaterialityCompatibility[] {
  return compactDefined([
    input.auditContract?.materialityCompatibility,
    ...getReferenceArtifacts(input).flatMap((referenceArtifact) => [
      ...getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(referenceArtifact, "materialityMetadata"),
      ...getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(referenceArtifact, "materialityCompatibility"),
    ]),
    ...getAllPrimitiveArtifacts(input).flatMap((primitiveArtifact) => [
      ...primitiveArtifact.materialityMetadata,
      ...primitiveArtifact.materialityCompatibility,
    ]),
  ]);
}

function getForwardCompatibilityWarnings(input: BuildOrganizationalMemoryPackageInput): string[] {
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

function validateInput(input: BuildOrganizationalMemoryPackageInput): string[] {
  const warnings: string[] = [];
  const auditContract = input.auditContract;

  if (!auditContract) warnings.push("auditContract is required.");
  if (!auditContract) return warnings;

  if (!hasValue(input.packageCategory)) warnings.push("packageCategory is required.");
  if (!isSupportedPackageCategory(input.packageCategory)) warnings.push("packageCategory must be supported.");
  if (!auditContract.scope) warnings.push("auditContract.scope is required.");
  if (!auditContract.evidence) warnings.push("auditContract.evidence is required.");
  if (!auditContract.scope || !auditContract.evidence) return warnings;

  if (!hasValue(auditContract.scope.companyId)) warnings.push("scope.companyId is required.");
  if (getAllPrimitiveArtifacts(input).length === 0) warnings.push("at least one Phase 36 primitive artifact is required.");

  const companyId = auditContract.scope.companyId;
  for (const [inputName, values] of [
    ["observationReferences", getInputArray(input.observationReferences)],
    ["auditArtifactReferences", getInputArray(input.auditArtifactReferences)],
    ["workflowPackageReferences", getInputArray(input.workflowPackageReferences)],
    ["healthcarePpdObservations", getInputArray(input.healthcarePpdObservations)],
    ["payrollObservations", getInputArray(input.payrollObservations)],
    ["methodologyObservations", getInputArray(input.methodologyObservations)],
  ] as const) {
    values.forEach((referenceArtifact, index) => {
      if (!hasValue(referenceArtifact.companyId)) warnings.push(`${inputName}[${index}].companyId is required.`);
      if (referenceArtifact.companyId && referenceArtifact.companyId !== companyId) {
        warnings.push(`${inputName}[${index}].companyId must equal scope.companyId.`);
      }
    });
  }

  getMemoryObjects(input).forEach((memoryObject, index) => {
    if (!hasValue(memoryObject.memoryObjectId)) warnings.push(`memoryObjects[${index}].memoryObjectId is required.`);
    if (!hasValue(memoryObject.memoryObjectKey)) warnings.push(`memoryObjects[${index}].memoryObjectKey is required.`);
    if (memoryObject.companyId !== companyId) warnings.push(`memoryObjects[${index}].companyId must equal scope.companyId.`);
  });

  getMemoryRelationships(input).forEach((memoryRelationship, index) => {
    if (!hasValue(memoryRelationship.memoryRelationshipId)) {
      warnings.push(`memoryRelationships[${index}].memoryRelationshipId is required.`);
    }
    if (!hasValue(memoryRelationship.memoryRelationshipKey)) {
      warnings.push(`memoryRelationships[${index}].memoryRelationshipKey is required.`);
    }
    if (memoryRelationship.companyId !== companyId) warnings.push(`memoryRelationships[${index}].companyId must equal scope.companyId.`);
  });

  getEvidenceLineageGraphs(input).forEach((evidenceLineageGraph, index) => {
    if (!hasValue(evidenceLineageGraph.evidenceLineageGraphId)) {
      warnings.push(`evidenceLineageGraphs[${index}].evidenceLineageGraphId is required.`);
    }
    if (!hasValue(evidenceLineageGraph.evidenceLineageGraphKey)) {
      warnings.push(`evidenceLineageGraphs[${index}].evidenceLineageGraphKey is required.`);
    }
    if (evidenceLineageGraph.companyId !== companyId) warnings.push(`evidenceLineageGraphs[${index}].companyId must equal scope.companyId.`);
  });

  return warnings;
}

export function buildOrganizationalMemoryPackage(
  input: BuildOrganizationalMemoryPackageInput,
): BuildOrganizationalMemoryPackageResult {
  const fatalWarnings = validateInput(input);
  if (fatalWarnings.length > 0 || !input.auditContract) {
    return {
      organizationalMemoryPackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const auditContract = input.auditContract;
  const memoryObjectIds = getMemoryObjectIds(input);
  const memoryRelationshipIds = getMemoryRelationshipIds(input);
  const evidenceLineageGraphIds = getEvidenceLineageGraphIds(input);
  const evidenceReferenceIds = getEvidenceReferenceIds(input);
  const sourceReferenceIds = getSourceReferenceIds(input);
  const lineageReferenceIds = getLineageReferenceIds(input);
  const upstreamObservationIds = getUpstreamObservationIds(input);
  const upstreamPackageIds = getUpstreamPackageIds(input);
  const materialityMetadata = getMaterialityMetadata(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    organizationalMemoryPackage: {
      organizationalMemoryPackageId: buildOrganizationalMemoryPackageId(input),
      organizationalMemoryPackageKey: buildOrganizationalMemoryPackageKey(input),
      packageCategory: input.packageCategory,
      companyId: auditContract.scope.companyId,
      scope: auditContract.scope,
      customerIsolation: buildCustomerIsolation(auditContract.scope),
      firmIsolation: buildFirmIsolation(auditContract.scope),
      clientIsolation: buildClientIsolation(auditContract.scope),
      memoryObjectIds,
      memoryRelationshipIds,
      evidenceLineageGraphIds,
      evidenceReferenceIds,
      sourceReferenceIds,
      lineageReferenceIds,
      upstreamObservationIds,
      upstreamPackageIds,
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
        ...getReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditObservationMetadata>(referenceArtifact, "observationMetadata"),
        ),
        ...getAllPrimitiveArtifacts(input).flatMap((primitiveArtifact) => primitiveArtifact.observationMetadata),
      ]),
      findingMetadata: compactDefined([
        auditContract.findingMetadata,
        ...getReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditFindingMetadata>(referenceArtifact, "findingMetadata"),
        ),
        ...getAllPrimitiveArtifacts(input).flatMap((primitiveArtifact) => primitiveArtifact.findingMetadata),
      ]),
      exceptionMetadata: compactDefined([
        auditContract.exceptionMetadata,
        ...getReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditExceptionMetadata>(referenceArtifact, "exceptionMetadata"),
        ),
        ...getAllPrimitiveArtifacts(input).flatMap((primitiveArtifact) => primitiveArtifact.exceptionMetadata),
      ]),
      riskMetadata: compactDefined([
        auditContract.riskMetadata,
        ...getReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditRiskMetadata>(referenceArtifact, "riskMetadata"),
        ),
        ...getAllPrimitiveArtifacts(input).flatMap((primitiveArtifact) => primitiveArtifact.riskMetadata),
      ]),
      trustMetadata: compactDefined([
        auditContract.trustMetadata,
        ...getReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditTrustMetadata>(referenceArtifact, "trustMetadata"),
        ),
        ...getAllPrimitiveArtifacts(input).flatMap((primitiveArtifact) => primitiveArtifact.trustMetadata),
      ]),
      confidenceMetadata: compactDefined([
        auditContract.confidenceMetadata,
        ...getReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditConfidenceMetadata>(referenceArtifact, "confidenceMetadata"),
        ),
        ...getAllPrimitiveArtifacts(input).flatMap((primitiveArtifact) => primitiveArtifact.confidenceMetadata),
      ]),
      governanceMetadata: compactDefined([
        auditContract.governanceMetadata,
        ...getReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditGovernanceMetadata>(referenceArtifact, "governanceMetadata"),
        ),
        ...getAllPrimitiveArtifacts(input).flatMap((primitiveArtifact) => primitiveArtifact.governanceMetadata),
      ]),
      materialityMetadata,
      materialityCompatibility: materialityMetadata,
      personaCompatibility: compactDefined([
        auditContract.personaCompatibility,
        ...getReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditPersonaCompatibility>(referenceArtifact, "personaCompatibility"),
        ),
        ...getAllPrimitiveArtifacts(input).flatMap((primitiveArtifact) => primitiveArtifact.personaCompatibility),
      ]),
      packageCompatibility: compactDefined([
        auditContract.packageCompatibility,
        ...getReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditPackageCompatibility>(referenceArtifact, "packageCompatibility"),
        ),
        ...getAllPrimitiveArtifacts(input).flatMap((primitiveArtifact) => primitiveArtifact.packageCompatibility),
      ]),
      memoryCompatibility: compactDefined([
        auditContract.memoryCompatibility,
        ...getReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditMemoryCompatibility>(referenceArtifact, "memoryCompatibility"),
        ),
        ...getAllPrimitiveArtifacts(input).flatMap((primitiveArtifact) => primitiveArtifact.memoryCompatibility),
      ]),
      learningCompatibility: compactDefined([
        auditContract.learningCompatibility,
        ...getReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditLearningCompatibility>(referenceArtifact, "learningCompatibility"),
        ),
        ...getAllPrimitiveArtifacts(input).flatMap((primitiveArtifact) => primitiveArtifact.learningCompatibility),
      ]),
      surfaceCompatibility: compactDefined([
        auditContract.surfaceCompatibility,
        ...getReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditSurfaceCompatibility>(referenceArtifact, "surfaceCompatibility"),
        ),
        ...getAllPrimitiveArtifacts(input).flatMap((primitiveArtifact) => primitiveArtifact.surfaceCompatibility),
      ]),
      memoryObjects: getMemoryObjects(input),
      memoryRelationships: getMemoryRelationships(input),
      evidenceLineageGraphs: getEvidenceLineageGraphs(input),
      observationReferences: getInputArray(input.observationReferences),
      auditArtifactReferences: getInputArray(input.auditArtifactReferences),
      workflowPackageReferences: getInputArray(input.workflowPackageReferences),
      healthcarePpdObservations: getInputArray(input.healthcarePpdObservations),
      payrollObservations: getInputArray(input.payrollObservations),
      methodologyObservations: getInputArray(input.methodologyObservations),
      warnings,
    },
    skipped: false,
    warnings,
  };
}
