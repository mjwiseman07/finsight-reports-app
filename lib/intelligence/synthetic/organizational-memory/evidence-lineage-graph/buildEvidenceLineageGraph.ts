import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticMemoryObject,
  SyntheticMemoryObjectIsolationDimension,
  SyntheticMemoryObjectSourceArtifact,
} from "../memory-object";
import type { SyntheticMemoryRelationship } from "../memory-relationship";
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

export type SyntheticEvidenceLineageGraphCategory =
  | "organizational_evidence_lineage"
  | "audit_evidence_lineage"
  | "controller_evidence_lineage"
  | "package_evidence_lineage"
  | "memory_object_evidence_lineage"
  | "memory_relationship_evidence_lineage"
  | "historical_evidence_lineage"
  | "cross_period_evidence_lineage"
  | "cross_entity_evidence_lineage"
  | "cross_function_evidence_lineage";

export const SYNTHETIC_EVIDENCE_LINEAGE_GRAPH_CATEGORIES: SyntheticEvidenceLineageGraphCategory[] = [
  "organizational_evidence_lineage",
  "audit_evidence_lineage",
  "controller_evidence_lineage",
  "package_evidence_lineage",
  "memory_object_evidence_lineage",
  "memory_relationship_evidence_lineage",
  "historical_evidence_lineage",
  "cross_period_evidence_lineage",
  "cross_entity_evidence_lineage",
  "cross_function_evidence_lineage",
];

export interface BuildEvidenceLineageGraphInput {
  auditContract: SyntheticAuditContract | null;
  graphCategory: SyntheticEvidenceLineageGraphCategory;
  observations?: SyntheticMemoryObjectSourceArtifact[];
  auditArtifacts?: SyntheticMemoryObjectSourceArtifact[];
  evidenceArtifacts?: SyntheticMemoryObjectSourceArtifact[];
  trustArtifacts?: SyntheticMemoryObjectSourceArtifact[];
  confidenceArtifacts?: SyntheticMemoryObjectSourceArtifact[];
  workflowPackages?: SyntheticMemoryObjectSourceArtifact[];
  packageLineageArtifacts?: SyntheticMemoryObjectSourceArtifact[];
  memoryObjects?: SyntheticMemoryObject[];
  memoryRelationships?: SyntheticMemoryRelationship[];
  healthcarePpdObservations?: SyntheticMemoryObjectSourceArtifact[];
  payrollObservations?: SyntheticMemoryObjectSourceArtifact[];
  methodologyObservations?: SyntheticMemoryObjectSourceArtifact[];
}

export interface SyntheticEvidenceLineageGraph {
  evidenceLineageGraphId: string;
  evidenceLineageGraphKey: string;
  graphCategory: SyntheticEvidenceLineageGraphCategory;
  companyId: string;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  evidenceReferenceIds: string[];
  sourceReferenceIds: string[];
  lineageReferenceIds: string[];
  upstreamObservationIds: string[];
  upstreamPackageIds: string[];
  memoryObjectIds: string[];
  memoryRelationshipIds: string[];
  evidenceNodeIds: string[];
  sourceNodeIds: string[];
  lineageNodeIds: string[];
  observationNodeIds: string[];
  packageNodeIds: string[];
  memoryObjectNodeIds: string[];
  memoryRelationshipNodeIds: string[];
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
  observations: SyntheticMemoryObjectSourceArtifact[];
  auditArtifacts: SyntheticMemoryObjectSourceArtifact[];
  evidenceArtifacts: SyntheticMemoryObjectSourceArtifact[];
  trustArtifacts: SyntheticMemoryObjectSourceArtifact[];
  confidenceArtifacts: SyntheticMemoryObjectSourceArtifact[];
  workflowPackages: SyntheticMemoryObjectSourceArtifact[];
  packageLineageArtifacts: SyntheticMemoryObjectSourceArtifact[];
  memoryObjects: SyntheticMemoryObject[];
  memoryRelationships: SyntheticMemoryRelationship[];
  healthcarePpdObservations: SyntheticMemoryObjectSourceArtifact[];
  payrollObservations: SyntheticMemoryObjectSourceArtifact[];
  methodologyObservations: SyntheticMemoryObjectSourceArtifact[];
  warnings: string[];
}

export interface BuildEvidenceLineageGraphResult {
  evidenceLineageGraph: SyntheticEvidenceLineageGraph | null;
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

function isSupportedGraphCategory(graphCategory: SyntheticEvidenceLineageGraphCategory): boolean {
  return SYNTHETIC_EVIDENCE_LINEAGE_GRAPH_CATEGORIES.includes(graphCategory);
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

function getAllReferenceArtifacts(input: BuildEvidenceLineageGraphInput): SyntheticMemoryObjectSourceArtifact[] {
  return [
    ...getInputArray(input.observations),
    ...getInputArray(input.auditArtifacts),
    ...getInputArray(input.evidenceArtifacts),
    ...getInputArray(input.trustArtifacts),
    ...getInputArray(input.confidenceArtifacts),
    ...getInputArray(input.workflowPackages),
    ...getInputArray(input.packageLineageArtifacts),
    ...getInputArray(input.healthcarePpdObservations),
    ...getInputArray(input.payrollObservations),
    ...getInputArray(input.methodologyObservations),
  ];
}

function getMemoryObjects(input: BuildEvidenceLineageGraphInput): SyntheticMemoryObject[] {
  return getInputArray(input.memoryObjects);
}

function getMemoryRelationships(input: BuildEvidenceLineageGraphInput): SyntheticMemoryRelationship[] {
  return getInputArray(input.memoryRelationships);
}

function getReferenceIds(input: BuildEvidenceLineageGraphInput, singularName: string, arrayName: string): string[] {
  return uniqueStable([
    ...getAllReferenceArtifacts(input).flatMap((referenceArtifact) => [
      ...getStringProperty(referenceArtifact, singularName),
      ...getStringArrayProperty(referenceArtifact, arrayName),
    ]),
    ...getMemoryObjects(input).flatMap((memoryObject) => [
      ...getStringProperty(memoryObject, singularName),
      ...getStringArrayProperty(memoryObject, arrayName),
    ]),
    ...getMemoryRelationships(input).flatMap((memoryRelationship) => [
      ...getStringProperty(memoryRelationship, singularName),
      ...getStringArrayProperty(memoryRelationship, arrayName),
    ]),
  ]);
}

function getEvidenceReferenceIds(input: BuildEvidenceLineageGraphInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.evidenceIds ?? []),
    ...getAllReferenceArtifacts(input).flatMap((referenceArtifact) => referenceArtifact.evidenceReferenceIds ?? []),
    ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.evidenceReferenceIds),
    ...getMemoryRelationships(input).flatMap((memoryRelationship) => memoryRelationship.evidenceReferenceIds),
  ]);
}

function getSourceReferenceIds(input: BuildEvidenceLineageGraphInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.sourceReferenceIds ?? []),
    ...getAllReferenceArtifacts(input).flatMap((referenceArtifact) => referenceArtifact.sourceReferenceIds ?? []),
    ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.sourceReferenceIds),
    ...getMemoryRelationships(input).flatMap((memoryRelationship) => memoryRelationship.sourceReferenceIds),
  ]);
}

function getLineageReferenceIds(input: BuildEvidenceLineageGraphInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.lineageReferenceIds ?? []),
    ...getAllReferenceArtifacts(input).flatMap((referenceArtifact) => referenceArtifact.lineageReferenceIds ?? []),
    ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.lineageReferenceIds),
    ...getMemoryRelationships(input).flatMap((memoryRelationship) => memoryRelationship.lineageReferenceIds),
  ]);
}

function getUpstreamObservationIds(input: BuildEvidenceLineageGraphInput): string[] {
  return uniqueStable([
    input.auditContract?.observationMetadata?.auditObservationId,
    ...(input.auditContract?.evidence.supportingObservationIds ?? []),
    ...getAllReferenceArtifacts(input).flatMap((referenceArtifact) => [
      ...getStringProperty(referenceArtifact, "observationId"),
      ...(referenceArtifact.upstreamObservationIds ?? []),
    ]),
    ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.upstreamObservationIds),
    ...getMemoryRelationships(input).flatMap((memoryRelationship) => memoryRelationship.upstreamObservationIds),
  ].filter((value): value is string => value !== undefined));
}

function getUpstreamPackageIds(input: BuildEvidenceLineageGraphInput): string[] {
  return uniqueStable([
    ...getAllReferenceArtifacts(input).flatMap((referenceArtifact) => [
      ...getStringProperty(referenceArtifact, "packageId"),
      ...(referenceArtifact.upstreamPackageIds ?? []),
    ]),
    ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.upstreamPackageIds),
    ...getMemoryRelationships(input).flatMap((memoryRelationship) => memoryRelationship.upstreamPackageIds),
  ]);
}

function getMemoryObjectIds(input: BuildEvidenceLineageGraphInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.supportingMemoryIds ?? []),
    ...getMemoryObjects(input).map((memoryObject) => memoryObject.memoryObjectId),
    ...getMemoryRelationships(input).flatMap((memoryRelationship) => memoryRelationship.memoryObjectIds),
  ]);
}

function getMemoryRelationshipIds(input: BuildEvidenceLineageGraphInput): string[] {
  return uniqueStable(getMemoryRelationships(input).map((memoryRelationship) => memoryRelationship.memoryRelationshipId));
}

function getAuditContractReferenceIds(input: BuildEvidenceLineageGraphInput): string[] {
  const auditContract = input.auditContract;
  return uniqueStable([
    auditContract?.observationMetadata?.auditObservationId,
    auditContract?.findingMetadata?.auditFindingId,
    auditContract?.exceptionMetadata?.auditExceptionId,
    auditContract?.riskMetadata?.auditRiskId,
    ...(auditContract?.evidence.sourceReferenceIds ?? []),
    ...(auditContract?.evidence.lineageReferenceIds ?? []),
    ...getAllReferenceArtifacts(input).flatMap((referenceArtifact) => referenceArtifact.auditContractReferenceIds ?? []),
    ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.auditContractReferenceIds),
    ...getMemoryRelationships(input).flatMap((memoryRelationship) => memoryRelationship.auditContractReferenceIds),
  ].filter((value): value is string => value !== undefined));
}

function buildEvidenceLineageGraphKey(input: BuildEvidenceLineageGraphInput): string {
  const scope = input.auditContract?.scope;

  return stableSnapshotHash({
    graphCategory: input.graphCategory,
    companyId: scope?.companyId ?? null,
    scope: scope ?? null,
    customerIsolation: scope ? buildCustomerIsolation(scope) : null,
    firmIsolation: scope ? buildFirmIsolation(scope) : null,
    clientIsolation: scope ? buildClientIsolation(scope) : null,
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    sourceReferenceIds: getSourceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
    upstreamObservationIds: getUpstreamObservationIds(input),
    upstreamPackageIds: getUpstreamPackageIds(input),
    memoryObjectIds: getMemoryObjectIds(input),
    memoryRelationshipIds: getMemoryRelationshipIds(input),
  });
}

function buildEvidenceLineageGraphId(input: BuildEvidenceLineageGraphInput): string {
  return `synthetic-evidence-lineage-graph:${stableSnapshotHash({
    evidenceLineageGraphKey: buildEvidenceLineageGraphKey(input),
    graphCategory: input.graphCategory,
    companyId: input.auditContract?.scope.companyId ?? null,
  })}`;
}

function getMaterialityMetadata(input: BuildEvidenceLineageGraphInput): SyntheticAuditMaterialityCompatibility[] {
  return compactDefined([
    input.auditContract?.materialityCompatibility,
    ...getAllReferenceArtifacts(input).flatMap((referenceArtifact) => [
      ...getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(referenceArtifact, "materialityMetadata"),
      ...getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(referenceArtifact, "materialityCompatibility"),
    ]),
    ...getMemoryObjects(input).flatMap((memoryObject) => [
      ...memoryObject.materialityMetadata,
      ...memoryObject.materialityCompatibility,
    ]),
    ...getMemoryRelationships(input).flatMap((memoryRelationship) => [
      ...memoryRelationship.materialityMetadata,
      ...memoryRelationship.materialityCompatibility,
    ]),
  ]);
}

function getForwardCompatibilityWarnings(input: BuildEvidenceLineageGraphInput): string[] {
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

function validateInput(input: BuildEvidenceLineageGraphInput): string[] {
  const warnings: string[] = [];
  const auditContract = input.auditContract;

  if (!auditContract) warnings.push("auditContract is required.");
  if (!auditContract) return warnings;

  if (!hasValue(input.graphCategory)) warnings.push("graphCategory is required.");
  if (!isSupportedGraphCategory(input.graphCategory)) warnings.push("graphCategory must be supported.");
  if (!auditContract.scope) warnings.push("auditContract.scope is required.");
  if (!auditContract.evidence) warnings.push("auditContract.evidence is required.");
  if (!auditContract.scope || !auditContract.evidence) return warnings;

  if (!hasValue(auditContract.scope.companyId)) warnings.push("scope.companyId is required.");

  const companyId = auditContract.scope.companyId;
  for (const [inputName, values] of [
    ["observations", getInputArray(input.observations)],
    ["auditArtifacts", getInputArray(input.auditArtifacts)],
    ["evidenceArtifacts", getInputArray(input.evidenceArtifacts)],
    ["trustArtifacts", getInputArray(input.trustArtifacts)],
    ["confidenceArtifacts", getInputArray(input.confidenceArtifacts)],
    ["workflowPackages", getInputArray(input.workflowPackages)],
    ["packageLineageArtifacts", getInputArray(input.packageLineageArtifacts)],
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

  return warnings;
}

export function buildEvidenceLineageGraph(input: BuildEvidenceLineageGraphInput): BuildEvidenceLineageGraphResult {
  const fatalWarnings = validateInput(input);
  if (fatalWarnings.length > 0 || !input.auditContract) {
    return {
      evidenceLineageGraph: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const auditContract = input.auditContract;
  const evidenceReferenceIds = getEvidenceReferenceIds(input);
  const sourceReferenceIds = getSourceReferenceIds(input);
  const lineageReferenceIds = getLineageReferenceIds(input);
  const upstreamObservationIds = getUpstreamObservationIds(input);
  const upstreamPackageIds = getUpstreamPackageIds(input);
  const memoryObjectIds = getMemoryObjectIds(input);
  const memoryRelationshipIds = getMemoryRelationshipIds(input);
  const materialityMetadata = getMaterialityMetadata(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    evidenceLineageGraph: {
      evidenceLineageGraphId: buildEvidenceLineageGraphId(input),
      evidenceLineageGraphKey: buildEvidenceLineageGraphKey(input),
      graphCategory: input.graphCategory,
      companyId: auditContract.scope.companyId,
      scope: auditContract.scope,
      customerIsolation: buildCustomerIsolation(auditContract.scope),
      firmIsolation: buildFirmIsolation(auditContract.scope),
      clientIsolation: buildClientIsolation(auditContract.scope),
      evidenceReferenceIds,
      sourceReferenceIds,
      lineageReferenceIds,
      upstreamObservationIds,
      upstreamPackageIds,
      memoryObjectIds,
      memoryRelationshipIds,
      evidenceNodeIds: evidenceReferenceIds,
      sourceNodeIds: sourceReferenceIds,
      lineageNodeIds: lineageReferenceIds,
      observationNodeIds: upstreamObservationIds,
      packageNodeIds: upstreamPackageIds,
      memoryObjectNodeIds: memoryObjectIds,
      memoryRelationshipNodeIds: memoryRelationshipIds,
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
        ...getAllReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditObservationMetadata>(referenceArtifact, "observationMetadata"),
        ),
        ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.observationMetadata),
        ...getMemoryRelationships(input).flatMap((memoryRelationship) => memoryRelationship.observationMetadata),
      ]),
      findingMetadata: compactDefined([
        auditContract.findingMetadata,
        ...getAllReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditFindingMetadata>(referenceArtifact, "findingMetadata"),
        ),
        ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.findingMetadata),
        ...getMemoryRelationships(input).flatMap((memoryRelationship) => memoryRelationship.findingMetadata),
      ]),
      exceptionMetadata: compactDefined([
        auditContract.exceptionMetadata,
        ...getAllReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditExceptionMetadata>(referenceArtifact, "exceptionMetadata"),
        ),
        ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.exceptionMetadata),
        ...getMemoryRelationships(input).flatMap((memoryRelationship) => memoryRelationship.exceptionMetadata),
      ]),
      riskMetadata: compactDefined([
        auditContract.riskMetadata,
        ...getAllReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditRiskMetadata>(referenceArtifact, "riskMetadata"),
        ),
        ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.riskMetadata),
        ...getMemoryRelationships(input).flatMap((memoryRelationship) => memoryRelationship.riskMetadata),
      ]),
      trustMetadata: compactDefined([
        auditContract.trustMetadata,
        ...getAllReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditTrustMetadata>(referenceArtifact, "trustMetadata"),
        ),
        ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.trustMetadata),
        ...getMemoryRelationships(input).flatMap((memoryRelationship) => memoryRelationship.trustMetadata),
      ]),
      confidenceMetadata: compactDefined([
        auditContract.confidenceMetadata,
        ...getAllReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditConfidenceMetadata>(referenceArtifact, "confidenceMetadata"),
        ),
        ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.confidenceMetadata),
        ...getMemoryRelationships(input).flatMap((memoryRelationship) => memoryRelationship.confidenceMetadata),
      ]),
      governanceMetadata: compactDefined([
        auditContract.governanceMetadata,
        ...getAllReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditGovernanceMetadata>(referenceArtifact, "governanceMetadata"),
        ),
        ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.governanceMetadata),
        ...getMemoryRelationships(input).flatMap((memoryRelationship) => memoryRelationship.governanceMetadata),
      ]),
      materialityMetadata,
      materialityCompatibility: materialityMetadata,
      personaCompatibility: compactDefined([
        auditContract.personaCompatibility,
        ...getAllReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditPersonaCompatibility>(referenceArtifact, "personaCompatibility"),
        ),
        ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.personaCompatibility),
        ...getMemoryRelationships(input).flatMap((memoryRelationship) => memoryRelationship.personaCompatibility),
      ]),
      packageCompatibility: compactDefined([
        auditContract.packageCompatibility,
        ...getAllReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditPackageCompatibility>(referenceArtifact, "packageCompatibility"),
        ),
        ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.packageCompatibility),
        ...getMemoryRelationships(input).flatMap((memoryRelationship) => memoryRelationship.packageCompatibility),
      ]),
      memoryCompatibility: compactDefined([
        auditContract.memoryCompatibility,
        ...getAllReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditMemoryCompatibility>(referenceArtifact, "memoryCompatibility"),
        ),
        ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.memoryCompatibility),
        ...getMemoryRelationships(input).flatMap((memoryRelationship) => memoryRelationship.memoryCompatibility),
      ]),
      learningCompatibility: compactDefined([
        auditContract.learningCompatibility,
        ...getAllReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditLearningCompatibility>(referenceArtifact, "learningCompatibility"),
        ),
        ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.learningCompatibility),
        ...getMemoryRelationships(input).flatMap((memoryRelationship) => memoryRelationship.learningCompatibility),
      ]),
      surfaceCompatibility: compactDefined([
        auditContract.surfaceCompatibility,
        ...getAllReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditSurfaceCompatibility>(referenceArtifact, "surfaceCompatibility"),
        ),
        ...getMemoryObjects(input).flatMap((memoryObject) => memoryObject.surfaceCompatibility),
        ...getMemoryRelationships(input).flatMap((memoryRelationship) => memoryRelationship.surfaceCompatibility),
      ]),
      observations: getInputArray(input.observations),
      auditArtifacts: getInputArray(input.auditArtifacts),
      evidenceArtifacts: getInputArray(input.evidenceArtifacts),
      trustArtifacts: getInputArray(input.trustArtifacts),
      confidenceArtifacts: getInputArray(input.confidenceArtifacts),
      workflowPackages: getInputArray(input.workflowPackages),
      packageLineageArtifacts: getInputArray(input.packageLineageArtifacts),
      memoryObjects: getMemoryObjects(input),
      memoryRelationships: getMemoryRelationships(input),
      healthcarePpdObservations: getInputArray(input.healthcarePpdObservations),
      payrollObservations: getInputArray(input.payrollObservations),
      methodologyObservations: getInputArray(input.methodologyObservations),
      warnings,
    },
    skipped: false,
    warnings,
  };
}
