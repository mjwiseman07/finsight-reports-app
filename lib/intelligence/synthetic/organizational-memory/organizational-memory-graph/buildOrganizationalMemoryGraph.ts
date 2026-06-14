import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticMemoryObject,
  SyntheticMemoryObjectIsolationDimension,
  SyntheticMemoryObjectSourceArtifact,
} from "../memory-object";
import type { SyntheticMemoryRelationship } from "../memory-relationship";
import type { SyntheticEvidenceLineageGraph } from "../evidence-lineage-graph";
import type { SyntheticOrganizationalMemoryPackage } from "../organizational-memory-package";
import type { SyntheticHistoricalOutcomePackage } from "../historical-outcome-package";
import type { SyntheticHistoricalDecisionPackage } from "../historical-decision-package";
import type { SyntheticHistoricalAuditPackage } from "../historical-audit-package";
import type { SyntheticHistoricalControllerPackage } from "../historical-controller-package";
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

export type SyntheticOrganizationalMemoryGraphCategory =
  | "organizational_memory_graph"
  | "audit_memory_graph"
  | "controller_memory_graph"
  | "historical_memory_graph"
  | "cross_period_memory_graph"
  | "cross_entity_memory_graph"
  | "cross_function_memory_graph";

export const SYNTHETIC_ORGANIZATIONAL_MEMORY_GRAPH_CATEGORIES: SyntheticOrganizationalMemoryGraphCategory[] = [
  "organizational_memory_graph",
  "audit_memory_graph",
  "controller_memory_graph",
  "historical_memory_graph",
  "cross_period_memory_graph",
  "cross_entity_memory_graph",
  "cross_function_memory_graph",
];

export interface BuildOrganizationalMemoryGraphInput {
  auditContract: SyntheticAuditContract | null;
  graphCategory: SyntheticOrganizationalMemoryGraphCategory;
  memoryObjects?: SyntheticMemoryObject[];
  memoryRelationships?: SyntheticMemoryRelationship[];
  evidenceLineageGraphs?: SyntheticEvidenceLineageGraph[];
  organizationalMemoryPackages?: SyntheticOrganizationalMemoryPackage[];
  historicalOutcomePackages?: SyntheticHistoricalOutcomePackage[];
  historicalDecisionPackages?: SyntheticHistoricalDecisionPackage[];
  historicalAuditPackages?: SyntheticHistoricalAuditPackage[];
  historicalControllerPackages?: SyntheticHistoricalControllerPackage[];
  healthcarePpdObservations?: SyntheticMemoryObjectSourceArtifact[];
  payrollObservations?: SyntheticMemoryObjectSourceArtifact[];
  methodologyObservations?: SyntheticMemoryObjectSourceArtifact[];
}

export interface SyntheticOrganizationalMemoryGraph {
  organizationalMemoryGraphId: string;
  organizationalMemoryGraphKey: string;
  graphCategory: SyntheticOrganizationalMemoryGraphCategory;
  companyId: string;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  memoryObjectNodeIds: string[];
  memoryRelationshipNodeIds: string[];
  evidenceLineageGraphNodeIds: string[];
  historicalOutcomeNodeIds: string[];
  historicalDecisionNodeIds: string[];
  historicalAuditNodeIds: string[];
  historicalControllerNodeIds: string[];
  evidenceReferenceIds: string[];
  sourceReferenceIds: string[];
  lineageReferenceIds: string[];
  upstreamObservationIds: string[];
  upstreamPackageIds: string[];
  memoryObjectIds: string[];
  memoryRelationshipIds: string[];
  evidenceLineageGraphIds: string[];
  organizationalMemoryPackageIds: string[];
  historicalOutcomePackageIds: string[];
  historicalDecisionPackageIds: string[];
  historicalAuditPackageIds: string[];
  historicalControllerPackageIds: string[];
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
  organizationalMemoryPackages: SyntheticOrganizationalMemoryPackage[];
  historicalOutcomePackages: SyntheticHistoricalOutcomePackage[];
  historicalDecisionPackages: SyntheticHistoricalDecisionPackage[];
  historicalAuditPackages: SyntheticHistoricalAuditPackage[];
  historicalControllerPackages: SyntheticHistoricalControllerPackage[];
  healthcarePpdObservations: SyntheticMemoryObjectSourceArtifact[];
  payrollObservations: SyntheticMemoryObjectSourceArtifact[];
  methodologyObservations: SyntheticMemoryObjectSourceArtifact[];
  warnings: string[];
}

export interface BuildOrganizationalMemoryGraphResult {
  organizationalMemoryGraph: SyntheticOrganizationalMemoryGraph | null;
  skipped: boolean;
  warnings: string[];
}

type Phase36CoreArtifact =
  | SyntheticMemoryObject
  | SyntheticMemoryRelationship
  | SyntheticEvidenceLineageGraph
  | SyntheticOrganizationalMemoryPackage;

type HistoricalPackageArtifact =
  | SyntheticHistoricalOutcomePackage
  | SyntheticHistoricalDecisionPackage
  | SyntheticHistoricalAuditPackage
  | SyntheticHistoricalControllerPackage;

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

function isSupportedGraphCategory(graphCategory: SyntheticOrganizationalMemoryGraphCategory): boolean {
  return SYNTHETIC_ORGANIZATIONAL_MEMORY_GRAPH_CATEGORIES.includes(graphCategory);
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

function getMemoryObjects(input: BuildOrganizationalMemoryGraphInput): SyntheticMemoryObject[] {
  return getInputArray(input.memoryObjects);
}

function getMemoryRelationships(input: BuildOrganizationalMemoryGraphInput): SyntheticMemoryRelationship[] {
  return getInputArray(input.memoryRelationships);
}

function getEvidenceLineageGraphs(input: BuildOrganizationalMemoryGraphInput): SyntheticEvidenceLineageGraph[] {
  return getInputArray(input.evidenceLineageGraphs);
}

function getOrganizationalMemoryPackages(input: BuildOrganizationalMemoryGraphInput): SyntheticOrganizationalMemoryPackage[] {
  return getInputArray(input.organizationalMemoryPackages);
}

function getHistoricalOutcomePackages(input: BuildOrganizationalMemoryGraphInput): SyntheticHistoricalOutcomePackage[] {
  return getInputArray(input.historicalOutcomePackages);
}

function getHistoricalDecisionPackages(input: BuildOrganizationalMemoryGraphInput): SyntheticHistoricalDecisionPackage[] {
  return getInputArray(input.historicalDecisionPackages);
}

function getHistoricalAuditPackages(input: BuildOrganizationalMemoryGraphInput): SyntheticHistoricalAuditPackage[] {
  return getInputArray(input.historicalAuditPackages);
}

function getHistoricalControllerPackages(input: BuildOrganizationalMemoryGraphInput): SyntheticHistoricalControllerPackage[] {
  return getInputArray(input.historicalControllerPackages);
}

function getForwardCompatibleReferences(input: BuildOrganizationalMemoryGraphInput): SyntheticMemoryObjectSourceArtifact[] {
  return [
    ...getInputArray(input.healthcarePpdObservations),
    ...getInputArray(input.payrollObservations),
    ...getInputArray(input.methodologyObservations),
  ];
}

function getPhase36CoreArtifacts(input: BuildOrganizationalMemoryGraphInput): Phase36CoreArtifact[] {
  return [
    ...getMemoryObjects(input),
    ...getMemoryRelationships(input),
    ...getEvidenceLineageGraphs(input),
    ...getOrganizationalMemoryPackages(input),
  ];
}

function getHistoricalPackageArtifacts(input: BuildOrganizationalMemoryGraphInput): HistoricalPackageArtifact[] {
  return [
    ...getHistoricalOutcomePackages(input),
    ...getHistoricalDecisionPackages(input),
    ...getHistoricalAuditPackages(input),
    ...getHistoricalControllerPackages(input),
  ];
}

function getAllPackageArtifacts(input: BuildOrganizationalMemoryGraphInput): Array<Phase36CoreArtifact | HistoricalPackageArtifact> {
  return [...getPhase36CoreArtifacts(input), ...getHistoricalPackageArtifacts(input)];
}

function getReferenceIds(input: BuildOrganizationalMemoryGraphInput, singularName: string, arrayName: string): string[] {
  return uniqueStable([
    ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) => [
      ...getStringProperty(referenceArtifact, singularName),
      ...getStringArrayProperty(referenceArtifact, arrayName),
    ]),
    ...getAllPackageArtifacts(input).flatMap((packageArtifact) => [
      ...getStringProperty(packageArtifact, singularName),
      ...getStringArrayProperty(packageArtifact, arrayName),
    ]),
  ]);
}

function getEvidenceReferenceIds(input: BuildOrganizationalMemoryGraphInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.evidenceIds ?? []),
    ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) => referenceArtifact.evidenceReferenceIds ?? []),
    ...getPhase36CoreArtifacts(input).flatMap((packageArtifact) => packageArtifact.evidenceReferenceIds),
    ...getHistoricalOutcomePackages(input).flatMap((historicalOutcomePackage) => historicalOutcomePackage.outcomeEvidenceReferenceIds),
    ...getHistoricalDecisionPackages(input).flatMap((historicalDecisionPackage) => historicalDecisionPackage.decisionEvidenceReferenceIds),
    ...getHistoricalAuditPackages(input).flatMap((historicalAuditPackage) => historicalAuditPackage.auditEvidenceReferenceIds),
    ...getHistoricalControllerPackages(input).flatMap(
      (historicalControllerPackage) => historicalControllerPackage.controllerEvidenceReferenceIds,
    ),
  ]);
}

function getSourceReferenceIds(input: BuildOrganizationalMemoryGraphInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.sourceReferenceIds ?? []),
    ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) => referenceArtifact.sourceReferenceIds ?? []),
    ...getPhase36CoreArtifacts(input).flatMap((packageArtifact) => packageArtifact.sourceReferenceIds),
    ...getHistoricalOutcomePackages(input).flatMap((historicalOutcomePackage) => historicalOutcomePackage.outcomeSourceReferenceIds),
    ...getHistoricalDecisionPackages(input).flatMap((historicalDecisionPackage) => historicalDecisionPackage.decisionSourceReferenceIds),
    ...getHistoricalAuditPackages(input).flatMap((historicalAuditPackage) => historicalAuditPackage.auditSourceReferenceIds),
    ...getHistoricalControllerPackages(input).flatMap(
      (historicalControllerPackage) => historicalControllerPackage.controllerSourceReferenceIds,
    ),
  ]);
}

function getLineageReferenceIds(input: BuildOrganizationalMemoryGraphInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.lineageReferenceIds ?? []),
    ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) => referenceArtifact.lineageReferenceIds ?? []),
    ...getPhase36CoreArtifacts(input).flatMap((packageArtifact) => packageArtifact.lineageReferenceIds),
    ...getHistoricalOutcomePackages(input).flatMap((historicalOutcomePackage) => historicalOutcomePackage.outcomeLineageReferenceIds),
    ...getHistoricalDecisionPackages(input).flatMap((historicalDecisionPackage) => historicalDecisionPackage.decisionLineageReferenceIds),
    ...getHistoricalAuditPackages(input).flatMap((historicalAuditPackage) => historicalAuditPackage.auditLineageReferenceIds),
    ...getHistoricalControllerPackages(input).flatMap(
      (historicalControllerPackage) => historicalControllerPackage.controllerLineageReferenceIds,
    ),
  ]);
}

function getMemoryObjectIds(input: BuildOrganizationalMemoryGraphInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.supportingMemoryIds ?? []),
    ...getMemoryObjects(input).map((memoryObject) => memoryObject.memoryObjectId),
    ...getMemoryRelationships(input).flatMap((memoryRelationship) => memoryRelationship.memoryObjectIds),
    ...getEvidenceLineageGraphs(input).flatMap((evidenceLineageGraph) => evidenceLineageGraph.memoryObjectIds),
    ...getOrganizationalMemoryPackages(input).flatMap((organizationalMemoryPackage) => organizationalMemoryPackage.memoryObjectIds),
    ...getHistoricalPackageArtifacts(input).flatMap((historicalPackage) => historicalPackage.memoryObjectIds),
  ]);
}

function getMemoryRelationshipIds(input: BuildOrganizationalMemoryGraphInput): string[] {
  return uniqueStable([
    ...getMemoryRelationships(input).map((memoryRelationship) => memoryRelationship.memoryRelationshipId),
    ...getEvidenceLineageGraphs(input).flatMap((evidenceLineageGraph) => evidenceLineageGraph.memoryRelationshipIds),
    ...getOrganizationalMemoryPackages(input).flatMap((organizationalMemoryPackage) => organizationalMemoryPackage.memoryRelationshipIds),
    ...getHistoricalPackageArtifacts(input).flatMap((historicalPackage) => historicalPackage.memoryRelationshipIds),
  ]);
}

function getEvidenceLineageGraphIds(input: BuildOrganizationalMemoryGraphInput): string[] {
  return uniqueStable([
    ...getEvidenceLineageGraphs(input).map((evidenceLineageGraph) => evidenceLineageGraph.evidenceLineageGraphId),
    ...getOrganizationalMemoryPackages(input).flatMap((organizationalMemoryPackage) => organizationalMemoryPackage.evidenceLineageGraphIds),
    ...getHistoricalPackageArtifacts(input).flatMap((historicalPackage) => historicalPackage.evidenceLineageGraphIds),
  ]);
}

function getOrganizationalMemoryPackageIds(input: BuildOrganizationalMemoryGraphInput): string[] {
  return uniqueStable([
    ...getOrganizationalMemoryPackages(input).map((organizationalMemoryPackage) => organizationalMemoryPackage.organizationalMemoryPackageId),
    ...getHistoricalPackageArtifacts(input).flatMap((historicalPackage) => historicalPackage.organizationalMemoryPackageIds),
  ]);
}

function getHistoricalOutcomePackageIds(input: BuildOrganizationalMemoryGraphInput): string[] {
  return uniqueStable([
    ...getHistoricalOutcomePackages(input).map((historicalOutcomePackage) => historicalOutcomePackage.historicalOutcomePackageId),
    ...getHistoricalAuditPackages(input).flatMap((historicalAuditPackage) => historicalAuditPackage.historicalOutcomePackageIds),
    ...getHistoricalControllerPackages(input).flatMap(
      (historicalControllerPackage) => historicalControllerPackage.historicalOutcomePackageIds,
    ),
  ]);
}

function getHistoricalDecisionPackageIds(input: BuildOrganizationalMemoryGraphInput): string[] {
  return uniqueStable([
    ...getHistoricalDecisionPackages(input).map((historicalDecisionPackage) => historicalDecisionPackage.historicalDecisionPackageId),
    ...getHistoricalAuditPackages(input).flatMap((historicalAuditPackage) => historicalAuditPackage.historicalDecisionPackageIds),
    ...getHistoricalControllerPackages(input).flatMap(
      (historicalControllerPackage) => historicalControllerPackage.historicalDecisionPackageIds,
    ),
  ]);
}

function getHistoricalAuditPackageIds(input: BuildOrganizationalMemoryGraphInput): string[] {
  return uniqueStable(getHistoricalAuditPackages(input).map((historicalAuditPackage) => historicalAuditPackage.historicalAuditPackageId));
}

function getHistoricalControllerPackageIds(input: BuildOrganizationalMemoryGraphInput): string[] {
  return uniqueStable(
    getHistoricalControllerPackages(input).map((historicalControllerPackage) => historicalControllerPackage.historicalControllerPackageId),
  );
}

function getUpstreamObservationIds(input: BuildOrganizationalMemoryGraphInput): string[] {
  return uniqueStable([
    input.auditContract?.observationMetadata?.auditObservationId,
    ...(input.auditContract?.evidence.supportingObservationIds ?? []),
    ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) => [
      ...getStringProperty(referenceArtifact, "observationId"),
      ...(referenceArtifact.upstreamObservationIds ?? []),
    ]),
    ...getAllPackageArtifacts(input).flatMap((packageArtifact) => packageArtifact.upstreamObservationIds),
  ].filter((value): value is string => value !== undefined));
}

function getUpstreamPackageIds(input: BuildOrganizationalMemoryGraphInput): string[] {
  return uniqueStable([
    ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) => [
      ...getStringProperty(referenceArtifact, "packageId"),
      ...(referenceArtifact.upstreamPackageIds ?? []),
    ]),
    ...getAllPackageArtifacts(input).flatMap((packageArtifact) => packageArtifact.upstreamPackageIds),
  ]);
}

function getAuditContractReferenceIds(input: BuildOrganizationalMemoryGraphInput): string[] {
  const auditContract = input.auditContract;
  return uniqueStable([
    auditContract?.observationMetadata?.auditObservationId,
    auditContract?.findingMetadata?.auditFindingId,
    auditContract?.exceptionMetadata?.auditExceptionId,
    auditContract?.riskMetadata?.auditRiskId,
    ...(auditContract?.evidence.sourceReferenceIds ?? []),
    ...(auditContract?.evidence.lineageReferenceIds ?? []),
    ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) => referenceArtifact.auditContractReferenceIds ?? []),
    ...getAllPackageArtifacts(input).flatMap((packageArtifact) => packageArtifact.auditContractReferenceIds),
  ].filter((value): value is string => value !== undefined));
}

function buildOrganizationalMemoryGraphKey(input: BuildOrganizationalMemoryGraphInput): string {
  const scope = input.auditContract?.scope;

  return stableSnapshotHash({
    graphCategory: input.graphCategory,
    companyId: scope?.companyId ?? null,
    scope: scope ?? null,
    customerIsolation: scope ? buildCustomerIsolation(scope) : null,
    firmIsolation: scope ? buildFirmIsolation(scope) : null,
    clientIsolation: scope ? buildClientIsolation(scope) : null,
    memoryObjectIds: getMemoryObjectIds(input),
    memoryRelationshipIds: getMemoryRelationshipIds(input),
    evidenceLineageGraphIds: getEvidenceLineageGraphIds(input),
    organizationalMemoryPackageIds: getOrganizationalMemoryPackageIds(input),
    historicalOutcomePackageIds: getHistoricalOutcomePackageIds(input),
    historicalDecisionPackageIds: getHistoricalDecisionPackageIds(input),
    historicalAuditPackageIds: getHistoricalAuditPackageIds(input),
    historicalControllerPackageIds: getHistoricalControllerPackageIds(input),
  });
}

function buildOrganizationalMemoryGraphId(input: BuildOrganizationalMemoryGraphInput): string {
  return `synthetic-organizational-memory-graph:${stableSnapshotHash({
    organizationalMemoryGraphKey: buildOrganizationalMemoryGraphKey(input),
    graphCategory: input.graphCategory,
    companyId: input.auditContract?.scope.companyId ?? null,
  })}`;
}

function getMaterialityMetadata(input: BuildOrganizationalMemoryGraphInput): SyntheticAuditMaterialityCompatibility[] {
  return compactDefined([
    input.auditContract?.materialityCompatibility,
    ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) => [
      ...getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(referenceArtifact, "materialityMetadata"),
      ...getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(referenceArtifact, "materialityCompatibility"),
    ]),
    ...getAllPackageArtifacts(input).flatMap((packageArtifact) => [
      ...packageArtifact.materialityMetadata,
      ...packageArtifact.materialityCompatibility,
    ]),
  ]);
}

function getForwardCompatibilityWarnings(input: BuildOrganizationalMemoryGraphInput): string[] {
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

function validateInput(input: BuildOrganizationalMemoryGraphInput): string[] {
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

  getOrganizationalMemoryPackages(input).forEach((organizationalMemoryPackage, index) => {
    if (!hasValue(organizationalMemoryPackage.organizationalMemoryPackageId)) {
      warnings.push(`organizationalMemoryPackages[${index}].organizationalMemoryPackageId is required.`);
    }
    if (!hasValue(organizationalMemoryPackage.organizationalMemoryPackageKey)) {
      warnings.push(`organizationalMemoryPackages[${index}].organizationalMemoryPackageKey is required.`);
    }
    if (organizationalMemoryPackage.companyId !== companyId) {
      warnings.push(`organizationalMemoryPackages[${index}].companyId must equal scope.companyId.`);
    }
  });

  getHistoricalOutcomePackages(input).forEach((historicalOutcomePackage, index) => {
    if (!hasValue(historicalOutcomePackage.historicalOutcomePackageId)) {
      warnings.push(`historicalOutcomePackages[${index}].historicalOutcomePackageId is required.`);
    }
    if (!hasValue(historicalOutcomePackage.historicalOutcomePackageKey)) {
      warnings.push(`historicalOutcomePackages[${index}].historicalOutcomePackageKey is required.`);
    }
    if (historicalOutcomePackage.companyId !== companyId) warnings.push(`historicalOutcomePackages[${index}].companyId must equal scope.companyId.`);
  });

  getHistoricalDecisionPackages(input).forEach((historicalDecisionPackage, index) => {
    if (!hasValue(historicalDecisionPackage.historicalDecisionPackageId)) {
      warnings.push(`historicalDecisionPackages[${index}].historicalDecisionPackageId is required.`);
    }
    if (!hasValue(historicalDecisionPackage.historicalDecisionPackageKey)) {
      warnings.push(`historicalDecisionPackages[${index}].historicalDecisionPackageKey is required.`);
    }
    if (historicalDecisionPackage.companyId !== companyId) {
      warnings.push(`historicalDecisionPackages[${index}].companyId must equal scope.companyId.`);
    }
  });

  getHistoricalAuditPackages(input).forEach((historicalAuditPackage, index) => {
    if (!hasValue(historicalAuditPackage.historicalAuditPackageId)) {
      warnings.push(`historicalAuditPackages[${index}].historicalAuditPackageId is required.`);
    }
    if (!hasValue(historicalAuditPackage.historicalAuditPackageKey)) {
      warnings.push(`historicalAuditPackages[${index}].historicalAuditPackageKey is required.`);
    }
    if (historicalAuditPackage.companyId !== companyId) warnings.push(`historicalAuditPackages[${index}].companyId must equal scope.companyId.`);
  });

  getHistoricalControllerPackages(input).forEach((historicalControllerPackage, index) => {
    if (!hasValue(historicalControllerPackage.historicalControllerPackageId)) {
      warnings.push(`historicalControllerPackages[${index}].historicalControllerPackageId is required.`);
    }
    if (!hasValue(historicalControllerPackage.historicalControllerPackageKey)) {
      warnings.push(`historicalControllerPackages[${index}].historicalControllerPackageKey is required.`);
    }
    if (historicalControllerPackage.companyId !== companyId) {
      warnings.push(`historicalControllerPackages[${index}].companyId must equal scope.companyId.`);
    }
  });

  return warnings;
}

export function buildOrganizationalMemoryGraph(
  input: BuildOrganizationalMemoryGraphInput,
): BuildOrganizationalMemoryGraphResult {
  const fatalWarnings = validateInput(input);
  if (fatalWarnings.length > 0 || !input.auditContract) {
    return {
      organizationalMemoryGraph: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const auditContract = input.auditContract;
  const memoryObjectIds = getMemoryObjectIds(input);
  const memoryRelationshipIds = getMemoryRelationshipIds(input);
  const evidenceLineageGraphIds = getEvidenceLineageGraphIds(input);
  const historicalOutcomePackageIds = getHistoricalOutcomePackageIds(input);
  const historicalDecisionPackageIds = getHistoricalDecisionPackageIds(input);
  const historicalAuditPackageIds = getHistoricalAuditPackageIds(input);
  const historicalControllerPackageIds = getHistoricalControllerPackageIds(input);
  const materialityMetadata = getMaterialityMetadata(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    organizationalMemoryGraph: {
      organizationalMemoryGraphId: buildOrganizationalMemoryGraphId(input),
      organizationalMemoryGraphKey: buildOrganizationalMemoryGraphKey(input),
      graphCategory: input.graphCategory,
      companyId: auditContract.scope.companyId,
      scope: auditContract.scope,
      customerIsolation: buildCustomerIsolation(auditContract.scope),
      firmIsolation: buildFirmIsolation(auditContract.scope),
      clientIsolation: buildClientIsolation(auditContract.scope),
      memoryObjectNodeIds: memoryObjectIds,
      memoryRelationshipNodeIds: memoryRelationshipIds,
      evidenceLineageGraphNodeIds: evidenceLineageGraphIds,
      historicalOutcomeNodeIds: historicalOutcomePackageIds,
      historicalDecisionNodeIds: historicalDecisionPackageIds,
      historicalAuditNodeIds: historicalAuditPackageIds,
      historicalControllerNodeIds: historicalControllerPackageIds,
      evidenceReferenceIds: getEvidenceReferenceIds(input),
      sourceReferenceIds: getSourceReferenceIds(input),
      lineageReferenceIds: getLineageReferenceIds(input),
      upstreamObservationIds: getUpstreamObservationIds(input),
      upstreamPackageIds: getUpstreamPackageIds(input),
      memoryObjectIds,
      memoryRelationshipIds,
      evidenceLineageGraphIds,
      organizationalMemoryPackageIds: getOrganizationalMemoryPackageIds(input),
      historicalOutcomePackageIds,
      historicalDecisionPackageIds,
      historicalAuditPackageIds,
      historicalControllerPackageIds,
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
        ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditObservationMetadata>(referenceArtifact, "observationMetadata"),
        ),
        ...getAllPackageArtifacts(input).flatMap((packageArtifact) => packageArtifact.observationMetadata),
      ]),
      findingMetadata: compactDefined([
        auditContract.findingMetadata,
        ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditFindingMetadata>(referenceArtifact, "findingMetadata"),
        ),
        ...getAllPackageArtifacts(input).flatMap((packageArtifact) => packageArtifact.findingMetadata),
      ]),
      exceptionMetadata: compactDefined([
        auditContract.exceptionMetadata,
        ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditExceptionMetadata>(referenceArtifact, "exceptionMetadata"),
        ),
        ...getAllPackageArtifacts(input).flatMap((packageArtifact) => packageArtifact.exceptionMetadata),
      ]),
      riskMetadata: compactDefined([
        auditContract.riskMetadata,
        ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditRiskMetadata>(referenceArtifact, "riskMetadata"),
        ),
        ...getAllPackageArtifacts(input).flatMap((packageArtifact) => packageArtifact.riskMetadata),
      ]),
      trustMetadata: compactDefined([
        auditContract.trustMetadata,
        ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditTrustMetadata>(referenceArtifact, "trustMetadata"),
        ),
        ...getAllPackageArtifacts(input).flatMap((packageArtifact) => packageArtifact.trustMetadata),
      ]),
      confidenceMetadata: compactDefined([
        auditContract.confidenceMetadata,
        ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditConfidenceMetadata>(referenceArtifact, "confidenceMetadata"),
        ),
        ...getAllPackageArtifacts(input).flatMap((packageArtifact) => packageArtifact.confidenceMetadata),
      ]),
      governanceMetadata: compactDefined([
        auditContract.governanceMetadata,
        ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditGovernanceMetadata>(referenceArtifact, "governanceMetadata"),
        ),
        ...getAllPackageArtifacts(input).flatMap((packageArtifact) => packageArtifact.governanceMetadata),
      ]),
      materialityMetadata,
      materialityCompatibility: materialityMetadata,
      personaCompatibility: compactDefined([
        auditContract.personaCompatibility,
        ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditPersonaCompatibility>(referenceArtifact, "personaCompatibility"),
        ),
        ...getAllPackageArtifacts(input).flatMap((packageArtifact) => packageArtifact.personaCompatibility),
      ]),
      packageCompatibility: compactDefined([
        auditContract.packageCompatibility,
        ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditPackageCompatibility>(referenceArtifact, "packageCompatibility"),
        ),
        ...getAllPackageArtifacts(input).flatMap((packageArtifact) => packageArtifact.packageCompatibility),
      ]),
      memoryCompatibility: compactDefined([
        auditContract.memoryCompatibility,
        ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditMemoryCompatibility>(referenceArtifact, "memoryCompatibility"),
        ),
        ...getAllPackageArtifacts(input).flatMap((packageArtifact) => packageArtifact.memoryCompatibility),
      ]),
      learningCompatibility: compactDefined([
        auditContract.learningCompatibility,
        ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditLearningCompatibility>(referenceArtifact, "learningCompatibility"),
        ),
        ...getAllPackageArtifacts(input).flatMap((packageArtifact) => packageArtifact.learningCompatibility),
      ]),
      surfaceCompatibility: compactDefined([
        auditContract.surfaceCompatibility,
        ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditSurfaceCompatibility>(referenceArtifact, "surfaceCompatibility"),
        ),
        ...getAllPackageArtifacts(input).flatMap((packageArtifact) => packageArtifact.surfaceCompatibility),
      ]),
      memoryObjects: getMemoryObjects(input),
      memoryRelationships: getMemoryRelationships(input),
      evidenceLineageGraphs: getEvidenceLineageGraphs(input),
      organizationalMemoryPackages: getOrganizationalMemoryPackages(input),
      historicalOutcomePackages: getHistoricalOutcomePackages(input),
      historicalDecisionPackages: getHistoricalDecisionPackages(input),
      historicalAuditPackages: getHistoricalAuditPackages(input),
      historicalControllerPackages: getHistoricalControllerPackages(input),
      healthcarePpdObservations: getInputArray(input.healthcarePpdObservations),
      payrollObservations: getInputArray(input.payrollObservations),
      methodologyObservations: getInputArray(input.methodologyObservations),
      warnings,
    },
    skipped: false,
    warnings,
  };
}
