import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticKnowledgeConfidenceFloorMetadata,
  SyntheticKnowledgeDerivationMethod,
  SyntheticKnowledgeStaleMarker,
  SyntheticKnowledgeValidityWindow,
  SyntheticMethodologyDerivationMethod,
  SyntheticMethodologyStaleMarker,
} from "../contracts";
import type { SyntheticAuditKnowledgePackage } from "../audit-knowledge-package";
import type { SyntheticControllerKnowledgePackage } from "../controller-knowledge-package";
import type { SyntheticHistoricalKnowledgePackage } from "../historical-knowledge-package";
import type { SyntheticHistoricalMethodologyPackage } from "../historical-methodology-package";
import type { SyntheticKnowledgeObject } from "../knowledge-object";
import type { SyntheticKnowledgeRelationship } from "../knowledge-relationship";
import type { SyntheticMethodologyObject, SyntheticMethodologyRelationship } from "../methodology-object";
import type { SyntheticOrganizationalKnowledgePackage } from "../organizational-knowledge-package";
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
import type { SyntheticOrganizationalMemoryGraph } from "../../organizational-memory/organizational-memory-graph";
import type { SyntheticOrganizationalMemoryPackage } from "../../organizational-memory/organizational-memory-package";

export type SyntheticOrganizationalKnowledgeGraphCategory =
  | "organizational_knowledge_graph"
  | "audit_knowledge_graph"
  | "controller_knowledge_graph"
  | "methodology_knowledge_graph"
  | "historical_knowledge_graph";

export const SYNTHETIC_ORGANIZATIONAL_KNOWLEDGE_GRAPH_CATEGORIES: SyntheticOrganizationalKnowledgeGraphCategory[] = [
  "organizational_knowledge_graph",
  "audit_knowledge_graph",
  "controller_knowledge_graph",
  "methodology_knowledge_graph",
  "historical_knowledge_graph",
];

export interface BuildOrganizationalKnowledgeGraphInput {
  graphCategory: SyntheticOrganizationalKnowledgeGraphCategory;
  knowledgeObjects?: SyntheticKnowledgeObject[];
  knowledgeRelationships?: SyntheticKnowledgeRelationship[];
  methodologyObjects?: SyntheticMethodologyObject[];
  methodologyRelationships?: SyntheticMethodologyRelationship[];
  historicalKnowledgePackages?: SyntheticHistoricalKnowledgePackage[];
  historicalMethodologyPackages?: SyntheticHistoricalMethodologyPackage[];
  auditKnowledgePackages?: SyntheticAuditKnowledgePackage[];
  controllerKnowledgePackages?: SyntheticControllerKnowledgePackage[];
  organizationalKnowledgePackages?: SyntheticOrganizationalKnowledgePackage[];
  organizationalMemoryGraphs?: SyntheticOrganizationalMemoryGraph[];
  organizationalMemoryPackages?: SyntheticOrganizationalMemoryPackage[];
  healthcarePpdObservationIds?: string[];
  payrollObservationIds?: string[];
  methodologyObservationIds?: string[];
}

export interface SyntheticOrganizationalKnowledgeGraph {
  organizationalKnowledgeGraphId: string;
  organizationalKnowledgeGraphKey: string;
  graphCategory: SyntheticOrganizationalKnowledgeGraphCategory;
  companyId: string;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  knowledgeObjectNodeIds: string[];
  knowledgeRelationshipNodeIds: string[];
  methodologyObjectNodeIds: string[];
  methodologyRelationshipNodeIds: string[];
  historicalKnowledgeNodeIds: string[];
  historicalMethodologyNodeIds: string[];
  auditKnowledgeNodeIds: string[];
  controllerKnowledgeNodeIds: string[];
  knowledgeObjectIds: string[];
  knowledgeRelationshipIds: string[];
  methodologyObjectIds: string[];
  methodologyRelationshipIds: string[];
  historicalKnowledgePackageIds: string[];
  historicalMethodologyPackageIds: string[];
  auditKnowledgePackageIds: string[];
  controllerKnowledgePackageIds: string[];
  organizationalKnowledgePackageIds: string[];
  derivationLineageIds: string[];
  derivationMethod: SyntheticKnowledgeDerivationMethod;
  derivationHash: string;
  knowledgeValidityWindow: SyntheticKnowledgeValidityWindow[];
  sourceMemorySnapshotIds: string[];
  supersedesKnowledgeIds: string[];
  supersededByKnowledgeIds: string[];
  staleMarker: SyntheticKnowledgeStaleMarker[];
  stalenessReasonReferenceIds: string[];
  methodologyVersion: string[];
  methodologyAncestryIds: string[];
  methodologyDerivationMethod: SyntheticMethodologyDerivationMethod[];
  methodologyDerivationHash: string[];
  supersedesMethodologyIds: string[];
  supersededByMethodologyIds: string[];
  methodologyStaleMarker: SyntheticMethodologyStaleMarker[];
  confidenceFloorMetadata: SyntheticKnowledgeConfidenceFloorMetadata[];
  sourceConfidenceReferenceIds: string[];
  evidenceReferenceIds: string[];
  sourceReferenceIds: string[];
  lineageReferenceIds: string[];
  upstreamObservationIds: string[];
  upstreamPackageIds: string[];
  organizationalMemoryGraphIds: string[];
  organizationalMemoryPackageIds: string[];
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
  knowledgeObjects: SyntheticKnowledgeObject[];
  knowledgeRelationships: SyntheticKnowledgeRelationship[];
  methodologyObjects: SyntheticMethodologyObject[];
  methodologyRelationships: SyntheticMethodologyRelationship[];
  historicalKnowledgePackages: SyntheticHistoricalKnowledgePackage[];
  historicalMethodologyPackages: SyntheticHistoricalMethodologyPackage[];
  auditKnowledgePackages: SyntheticAuditKnowledgePackage[];
  controllerKnowledgePackages: SyntheticControllerKnowledgePackage[];
  organizationalKnowledgePackages: SyntheticOrganizationalKnowledgePackage[];
  organizationalMemoryGraphs: SyntheticOrganizationalMemoryGraph[];
  organizationalMemoryPackages: SyntheticOrganizationalMemoryPackage[];
  warnings: string[];
}

export interface BuildOrganizationalKnowledgeGraphResult {
  organizationalKnowledgeGraph: SyntheticOrganizationalKnowledgeGraph | null;
  skipped: boolean;
  warnings: string[];
}

type OrganizationalKnowledgeGraphSourceArtifact =
  | SyntheticKnowledgeObject
  | SyntheticKnowledgeRelationship
  | SyntheticMethodologyObject
  | SyntheticMethodologyRelationship
  | SyntheticHistoricalKnowledgePackage
  | SyntheticHistoricalMethodologyPackage
  | SyntheticAuditKnowledgePackage
  | SyntheticControllerKnowledgePackage
  | SyntheticOrganizationalKnowledgePackage
  | SyntheticOrganizationalMemoryGraph
  | SyntheticOrganizationalMemoryPackage;

type ReferenceRecord = Record<string, unknown>;

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
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

function isSupportedGraphCategory(graphCategory: SyntheticOrganizationalKnowledgeGraphCategory): boolean {
  return SYNTHETIC_ORGANIZATIONAL_KNOWLEDGE_GRAPH_CATEGORIES.includes(graphCategory);
}

function getKnowledgeObjects(input: BuildOrganizationalKnowledgeGraphInput): SyntheticKnowledgeObject[] {
  return getInputArray(input.knowledgeObjects);
}

function getKnowledgeRelationships(input: BuildOrganizationalKnowledgeGraphInput): SyntheticKnowledgeRelationship[] {
  return getInputArray(input.knowledgeRelationships);
}

function getMethodologyObjects(input: BuildOrganizationalKnowledgeGraphInput): SyntheticMethodologyObject[] {
  return getInputArray(input.methodologyObjects);
}

function getMethodologyRelationships(input: BuildOrganizationalKnowledgeGraphInput): SyntheticMethodologyRelationship[] {
  return getInputArray(input.methodologyRelationships);
}

function getHistoricalKnowledgePackages(input: BuildOrganizationalKnowledgeGraphInput): SyntheticHistoricalKnowledgePackage[] {
  return getInputArray(input.historicalKnowledgePackages);
}

function getHistoricalMethodologyPackages(input: BuildOrganizationalKnowledgeGraphInput): SyntheticHistoricalMethodologyPackage[] {
  return getInputArray(input.historicalMethodologyPackages);
}

function getAuditKnowledgePackages(input: BuildOrganizationalKnowledgeGraphInput): SyntheticAuditKnowledgePackage[] {
  return getInputArray(input.auditKnowledgePackages);
}

function getControllerKnowledgePackages(input: BuildOrganizationalKnowledgeGraphInput): SyntheticControllerKnowledgePackage[] {
  return getInputArray(input.controllerKnowledgePackages);
}

function getOrganizationalKnowledgePackages(input: BuildOrganizationalKnowledgeGraphInput): SyntheticOrganizationalKnowledgePackage[] {
  return getInputArray(input.organizationalKnowledgePackages);
}

function getOrganizationalMemoryGraphs(input: BuildOrganizationalKnowledgeGraphInput): SyntheticOrganizationalMemoryGraph[] {
  return getInputArray(input.organizationalMemoryGraphs);
}

function getOrganizationalMemoryPackages(input: BuildOrganizationalKnowledgeGraphInput): SyntheticOrganizationalMemoryPackage[] {
  return getInputArray(input.organizationalMemoryPackages);
}

function getSourceArtifacts(input: BuildOrganizationalKnowledgeGraphInput): OrganizationalKnowledgeGraphSourceArtifact[] {
  return [
    ...getKnowledgeObjects(input),
    ...getKnowledgeRelationships(input),
    ...getMethodologyObjects(input),
    ...getMethodologyRelationships(input),
    ...getHistoricalKnowledgePackages(input),
    ...getHistoricalMethodologyPackages(input),
    ...getAuditKnowledgePackages(input),
    ...getControllerKnowledgePackages(input),
    ...getOrganizationalKnowledgePackages(input),
    ...getOrganizationalMemoryGraphs(input),
    ...getOrganizationalMemoryPackages(input),
  ];
}

function getGraphScope(input: BuildOrganizationalKnowledgeGraphInput): SyntheticAuditScope | null {
  return getSourceArtifacts(input)[0]?.scope ?? null;
}

function getGraphCustomerIsolation(input: BuildOrganizationalKnowledgeGraphInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.customerIsolation ?? null;
}

function getGraphFirmIsolation(input: BuildOrganizationalKnowledgeGraphInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.firmIsolation ?? null;
}

function getGraphClientIsolation(input: BuildOrganizationalKnowledgeGraphInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.clientIsolation ?? null;
}

function getKnowledgeObjectIds(input: BuildOrganizationalKnowledgeGraphInput): string[] {
  return [
    ...getKnowledgeObjects(input).map((artifact) => artifact.knowledgeObjectId),
    ...getKnowledgeRelationships(input).flatMap((artifact) => [artifact.sourceKnowledgeObjectId, artifact.targetKnowledgeObjectId]),
    ...getMethodologyObjects(input).flatMap((artifact) => artifact.knowledgeObjectIds),
    ...getMethodologyRelationships(input).flatMap((artifact) => artifact.knowledgeObjectIds),
    ...getHistoricalKnowledgePackages(input).flatMap((artifact) => artifact.knowledgeObjectIds),
    ...getAuditKnowledgePackages(input).flatMap((artifact) => artifact.knowledgeObjectIds),
    ...getControllerKnowledgePackages(input).flatMap((artifact) => artifact.knowledgeObjectIds),
    ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.knowledgeObjectIds),
  ].filter(hasValue) as string[];
}

function getKnowledgeRelationshipIds(input: BuildOrganizationalKnowledgeGraphInput): string[] {
  return [
    ...getKnowledgeRelationships(input).map((artifact) => artifact.knowledgeRelationshipId),
    ...getMethodologyObjects(input).flatMap((artifact) => artifact.knowledgeRelationshipIds),
    ...getMethodologyRelationships(input).flatMap((artifact) => artifact.knowledgeRelationshipIds),
    ...getHistoricalKnowledgePackages(input).flatMap((artifact) => artifact.knowledgeRelationshipIds),
    ...getAuditKnowledgePackages(input).flatMap((artifact) => artifact.knowledgeRelationshipIds),
    ...getControllerKnowledgePackages(input).flatMap((artifact) => artifact.knowledgeRelationshipIds),
    ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.knowledgeRelationshipIds),
  ].filter(hasValue) as string[];
}

function getMethodologyObjectIds(input: BuildOrganizationalKnowledgeGraphInput): string[] {
  return [
    ...getMethodologyObjects(input).map((artifact) => artifact.methodologyObjectId),
    ...getMethodologyRelationships(input).flatMap((artifact) => [artifact.sourceMethodologyObjectId, artifact.targetMethodologyObjectId]),
    ...getHistoricalMethodologyPackages(input).flatMap((artifact) => artifact.methodologyObjectIds),
    ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.methodologyObjectIds),
  ].filter(hasValue) as string[];
}

function getMethodologyRelationshipIds(input: BuildOrganizationalKnowledgeGraphInput): string[] {
  return [
    ...getMethodologyRelationships(input).map((artifact) => artifact.methodologyRelationshipId),
    ...getHistoricalMethodologyPackages(input).flatMap((artifact) => artifact.methodologyRelationshipIds),
    ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.methodologyRelationshipIds),
  ].filter(hasValue) as string[];
}

function getHistoricalKnowledgePackageIds(input: BuildOrganizationalKnowledgeGraphInput): string[] {
  return [
    ...getHistoricalKnowledgePackages(input).map((artifact) => artifact.historicalKnowledgePackageId),
    ...getHistoricalMethodologyPackages(input).flatMap((artifact) => artifact.historicalKnowledgePackageIds),
    ...getAuditKnowledgePackages(input).flatMap((artifact) => artifact.historicalKnowledgePackageIds),
    ...getControllerKnowledgePackages(input).flatMap((artifact) => artifact.historicalKnowledgePackageIds),
  ].filter(hasValue) as string[];
}

function getHistoricalMethodologyPackageIds(input: BuildOrganizationalKnowledgeGraphInput): string[] {
  return [
    ...getHistoricalMethodologyPackages(input).map((artifact) => artifact.historicalMethodologyPackageId),
    ...getAuditKnowledgePackages(input).flatMap((artifact) => artifact.historicalMethodologyPackageIds),
    ...getControllerKnowledgePackages(input).flatMap((artifact) => artifact.historicalMethodologyPackageIds),
  ].filter(hasValue) as string[];
}

function getAuditKnowledgePackageIds(input: BuildOrganizationalKnowledgeGraphInput): string[] {
  return getAuditKnowledgePackages(input).map((artifact) => artifact.auditKnowledgePackageId).filter(hasValue);
}

function getControllerKnowledgePackageIds(input: BuildOrganizationalKnowledgeGraphInput): string[] {
  return getControllerKnowledgePackages(input).map((artifact) => artifact.controllerKnowledgePackageId).filter(hasValue);
}

function getOrganizationalKnowledgePackageIds(input: BuildOrganizationalKnowledgeGraphInput): string[] {
  return [
    ...getOrganizationalKnowledgePackages(input).map((artifact) => artifact.organizationalKnowledgePackageId),
    ...getHistoricalKnowledgePackages(input).flatMap((artifact) => artifact.organizationalKnowledgePackageIds),
    ...getHistoricalMethodologyPackages(input).flatMap((artifact) => artifact.organizationalKnowledgePackageIds),
    ...getAuditKnowledgePackages(input).flatMap((artifact) => artifact.organizationalKnowledgePackageIds),
    ...getControllerKnowledgePackages(input).flatMap((artifact) => artifact.organizationalKnowledgePackageIds),
  ].filter(hasValue) as string[];
}

function getOrganizationalMemoryGraphIds(input: BuildOrganizationalKnowledgeGraphInput): string[] {
  return [
    ...getOrganizationalMemoryGraphs(input).map((artifact) => artifact.organizationalMemoryGraphId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryGraphIds")),
    ...getKnowledgeObjects(input).flatMap((artifact) => artifact.sourceOrganizationalMemoryGraphIds),
    ...getKnowledgeRelationships(input).flatMap((artifact) => artifact.sourceOrganizationalMemoryGraphIds),
  ].filter(hasValue) as string[];
}

function getOrganizationalMemoryPackageIds(input: BuildOrganizationalKnowledgeGraphInput): string[] {
  return [
    ...getOrganizationalMemoryPackages(input).map((artifact) => artifact.organizationalMemoryPackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryPackageIds")),
    ...getKnowledgeObjects(input).flatMap((artifact) => artifact.sourceOrganizationalMemoryPackageIds),
    ...getKnowledgeRelationships(input).flatMap((artifact) => artifact.sourceOrganizationalMemoryPackageIds),
  ].filter(hasValue) as string[];
}

function getReferenceIds(input: BuildOrganizationalKnowledgeGraphInput, singularName: string, arrayName: string): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringProperty(artifact, singularName)),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, arrayName)),
  ].filter(hasValue) as string[];
}

function getDerivationLineageIds(input: BuildOrganizationalKnowledgeGraphInput): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "derivationLineageIds")),
    ...getKnowledgeObjectIds(input),
    ...getKnowledgeRelationshipIds(input),
    ...getMethodologyObjectIds(input),
    ...getMethodologyRelationshipIds(input),
    ...getHistoricalKnowledgePackageIds(input),
    ...getHistoricalMethodologyPackageIds(input),
    ...getAuditKnowledgePackageIds(input),
    ...getControllerKnowledgePackageIds(input),
    ...getOrganizationalKnowledgePackageIds(input),
    ...getOrganizationalMemoryGraphIds(input),
    ...getOrganizationalMemoryPackageIds(input),
  ];
}

function buildDerivationHash(input: BuildOrganizationalKnowledgeGraphInput): string {
  return stableSnapshotHash({
    graphCategory: input.graphCategory,
    derivationLineageIds: getDerivationLineageIds(input),
    knowledgeObjectIds: getKnowledgeObjectIds(input),
    knowledgeRelationshipIds: getKnowledgeRelationshipIds(input),
    methodologyObjectIds: getMethodologyObjectIds(input),
    methodologyRelationshipIds: getMethodologyRelationshipIds(input),
  });
}

function buildOrganizationalKnowledgeGraphKey(input: BuildOrganizationalKnowledgeGraphInput): string {
  const scope = getGraphScope(input);
  return stableSnapshotHash({
    graphCategory: input.graphCategory,
    companyId: scope?.companyId ?? null,
    scope,
    customerIsolation: getGraphCustomerIsolation(input),
    firmIsolation: getGraphFirmIsolation(input),
    clientIsolation: getGraphClientIsolation(input),
    knowledgeObjectIds: getKnowledgeObjectIds(input),
    knowledgeRelationshipIds: getKnowledgeRelationshipIds(input),
    methodologyObjectIds: getMethodologyObjectIds(input),
    methodologyRelationshipIds: getMethodologyRelationshipIds(input),
    historicalKnowledgePackageIds: getHistoricalKnowledgePackageIds(input),
    historicalMethodologyPackageIds: getHistoricalMethodologyPackageIds(input),
    auditKnowledgePackageIds: getAuditKnowledgePackageIds(input),
    controllerKnowledgePackageIds: getControllerKnowledgePackageIds(input),
    organizationalKnowledgePackageIds: getOrganizationalKnowledgePackageIds(input),
    organizationalMemoryGraphIds: getOrganizationalMemoryGraphIds(input),
    organizationalMemoryPackageIds: getOrganizationalMemoryPackageIds(input),
  });
}

function buildOrganizationalKnowledgeGraphId(input: BuildOrganizationalKnowledgeGraphInput): string {
  return `synthetic-organizational-knowledge-graph:${stableSnapshotHash({
    organizationalKnowledgeGraphKey: buildOrganizationalKnowledgeGraphKey(input),
    graphCategory: input.graphCategory,
    companyId: getGraphScope(input)?.companyId ?? null,
  })}`;
}

function getForwardCompatibilityWarnings(input: BuildOrganizationalKnowledgeGraphInput): string[] {
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

function validateInput(input: BuildOrganizationalKnowledgeGraphInput): string[] {
  const warnings: string[] = [];
  const sourceArtifacts = getSourceArtifacts(input);
  const scope = getGraphScope(input);
  const companyId = scope?.companyId;

  if (!hasValue(input.graphCategory)) warnings.push("graphCategory is required.");
  if (!isSupportedGraphCategory(input.graphCategory)) warnings.push("graphCategory must be supported.");
  if (sourceArtifacts.length === 0) warnings.push("at least one organizational knowledge graph source artifact is required.");
  if (!scope) warnings.push("source scope is required.");
  if (!companyId) warnings.push("source companyId is required.");
  if (!getGraphCustomerIsolation(input)) warnings.push("customerIsolation is required.");
  if (!getGraphFirmIsolation(input)) warnings.push("firmIsolation is required.");
  if (!getGraphClientIsolation(input)) warnings.push("clientIsolation is required.");
  if (getKnowledgeObjectIds(input).length === 0) warnings.push("at least one knowledgeObjectId is required.");

  sourceArtifacts.forEach((artifact, index) => {
    if (!hasValue(artifact.companyId)) warnings.push(`sourceArtifacts[${index}].companyId is required.`);
    if (companyId && artifact.companyId !== companyId) warnings.push(`sourceArtifacts[${index}].companyId must equal source companyId.`);
  });

  for (const [inputName, values, idName, keyName] of [
    ["knowledgeObjects", getKnowledgeObjects(input), "knowledgeObjectId", "knowledgeObjectKey"],
    ["knowledgeRelationships", getKnowledgeRelationships(input), "knowledgeRelationshipId", "knowledgeRelationshipKey"],
    ["methodologyObjects", getMethodologyObjects(input), "methodologyObjectId", "methodologyObjectKey"],
    ["methodologyRelationships", getMethodologyRelationships(input), "methodologyRelationshipId", "methodologyRelationshipKey"],
    ["historicalKnowledgePackages", getHistoricalKnowledgePackages(input), "historicalKnowledgePackageId", "historicalKnowledgePackageKey"],
    ["historicalMethodologyPackages", getHistoricalMethodologyPackages(input), "historicalMethodologyPackageId", "historicalMethodologyPackageKey"],
    ["auditKnowledgePackages", getAuditKnowledgePackages(input), "auditKnowledgePackageId", "auditKnowledgePackageKey"],
    ["controllerKnowledgePackages", getControllerKnowledgePackages(input), "controllerKnowledgePackageId", "controllerKnowledgePackageKey"],
    ["organizationalKnowledgePackages", getOrganizationalKnowledgePackages(input), "organizationalKnowledgePackageId", "organizationalKnowledgePackageKey"],
    ["organizationalMemoryGraphs", getOrganizationalMemoryGraphs(input), "organizationalMemoryGraphId", "organizationalMemoryGraphKey"],
    ["organizationalMemoryPackages", getOrganizationalMemoryPackages(input), "organizationalMemoryPackageId", "organizationalMemoryPackageKey"],
  ] as const) {
    values.forEach((artifact, index) => {
      if (!hasValue((artifact as unknown as ReferenceRecord)[idName])) warnings.push(`${inputName}[${index}].${idName} is required.`);
      if (!hasValue((artifact as unknown as ReferenceRecord)[keyName])) warnings.push(`${inputName}[${index}].${keyName} is required.`);
    });
  }

  return warnings;
}

export function buildOrganizationalKnowledgeGraph(
  input: BuildOrganizationalKnowledgeGraphInput,
): BuildOrganizationalKnowledgeGraphResult {
  const fatalWarnings = validateInput(input);
  const scope = getGraphScope(input);
  const customerIsolation = getGraphCustomerIsolation(input);
  const firmIsolation = getGraphFirmIsolation(input);
  const clientIsolation = getGraphClientIsolation(input);

  if (fatalWarnings.length > 0 || !scope || !customerIsolation || !firmIsolation || !clientIsolation) {
    return {
      organizationalKnowledgeGraph: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const sourceArtifacts = getSourceArtifacts(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    organizationalKnowledgeGraph: {
      organizationalKnowledgeGraphId: buildOrganizationalKnowledgeGraphId(input),
      organizationalKnowledgeGraphKey: buildOrganizationalKnowledgeGraphKey(input),
      graphCategory: input.graphCategory,
      companyId: scope.companyId,
      scope,
      customerIsolation,
      firmIsolation,
      clientIsolation,
      knowledgeObjectNodeIds: getKnowledgeObjectIds(input),
      knowledgeRelationshipNodeIds: getKnowledgeRelationshipIds(input),
      methodologyObjectNodeIds: getMethodologyObjectIds(input),
      methodologyRelationshipNodeIds: getMethodologyRelationshipIds(input),
      historicalKnowledgeNodeIds: getHistoricalKnowledgePackageIds(input),
      historicalMethodologyNodeIds: getHistoricalMethodologyPackageIds(input),
      auditKnowledgeNodeIds: getAuditKnowledgePackageIds(input),
      controllerKnowledgeNodeIds: getControllerKnowledgePackageIds(input),
      knowledgeObjectIds: getKnowledgeObjectIds(input),
      knowledgeRelationshipIds: getKnowledgeRelationshipIds(input),
      methodologyObjectIds: getMethodologyObjectIds(input),
      methodologyRelationshipIds: getMethodologyRelationshipIds(input),
      historicalKnowledgePackageIds: getHistoricalKnowledgePackageIds(input),
      historicalMethodologyPackageIds: getHistoricalMethodologyPackageIds(input),
      auditKnowledgePackageIds: getAuditKnowledgePackageIds(input),
      controllerKnowledgePackageIds: getControllerKnowledgePackageIds(input),
      organizationalKnowledgePackageIds: getOrganizationalKnowledgePackageIds(input),
      derivationLineageIds: getDerivationLineageIds(input),
      derivationMethod: "relationship_preservation",
      derivationHash: buildDerivationHash(input),
      knowledgeValidityWindow: [
        ...getKnowledgeObjects(input).map((artifact) => artifact.knowledgeValidityWindow),
        ...getKnowledgeRelationships(input).map((artifact) => artifact.knowledgeValidityWindow),
        ...getHistoricalKnowledgePackages(input).flatMap((artifact) => artifact.knowledgeValidityWindow),
        ...getAuditKnowledgePackages(input).flatMap((artifact) => artifact.knowledgeValidityWindow),
        ...getControllerKnowledgePackages(input).flatMap((artifact) => artifact.knowledgeValidityWindow),
        ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.knowledgeValidityWindow),
      ],
      sourceMemorySnapshotIds: [
        ...getKnowledgeObjects(input).flatMap((artifact) => artifact.sourceMemorySnapshotIds),
        ...getKnowledgeRelationships(input).flatMap((artifact) => artifact.sourceMemorySnapshotIds),
        ...getHistoricalKnowledgePackages(input).flatMap((artifact) => artifact.sourceMemorySnapshotIds),
        ...getAuditKnowledgePackages(input).flatMap((artifact) => artifact.sourceMemorySnapshotIds),
        ...getControllerKnowledgePackages(input).flatMap((artifact) => artifact.sourceMemorySnapshotIds),
        ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.sourceMemorySnapshotIds),
      ],
      supersedesKnowledgeIds: [
        ...getKnowledgeObjects(input).flatMap((artifact) => artifact.supersedesKnowledgeIds),
        ...getKnowledgeRelationships(input).flatMap((artifact) => artifact.supersedesKnowledgeIds),
        ...getHistoricalKnowledgePackages(input).flatMap((artifact) => artifact.supersedesKnowledgeIds),
        ...getAuditKnowledgePackages(input).flatMap((artifact) => artifact.supersedesKnowledgeIds),
        ...getControllerKnowledgePackages(input).flatMap((artifact) => artifact.supersedesKnowledgeIds),
        ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.supersedesKnowledgeIds),
      ],
      supersededByKnowledgeIds: [
        ...getKnowledgeObjects(input).flatMap((artifact) => artifact.supersededByKnowledgeIds),
        ...getKnowledgeRelationships(input).flatMap((artifact) => artifact.supersededByKnowledgeIds),
        ...getHistoricalKnowledgePackages(input).flatMap((artifact) => artifact.supersededByKnowledgeIds),
        ...getAuditKnowledgePackages(input).flatMap((artifact) => artifact.supersededByKnowledgeIds),
        ...getControllerKnowledgePackages(input).flatMap((artifact) => artifact.supersededByKnowledgeIds),
        ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.supersededByKnowledgeIds),
      ],
      staleMarker: [
        ...getKnowledgeObjects(input).map((artifact) => artifact.staleMarker),
        ...getKnowledgeRelationships(input).map((artifact) => artifact.staleMarker),
        ...getHistoricalKnowledgePackages(input).flatMap((artifact) => artifact.staleMarker),
        ...getAuditKnowledgePackages(input).flatMap((artifact) => artifact.staleMarker),
        ...getControllerKnowledgePackages(input).flatMap((artifact) => artifact.staleMarker),
        ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.staleMarker),
      ],
      stalenessReasonReferenceIds: [
        ...getKnowledgeObjects(input).flatMap((artifact) => artifact.stalenessReasonReferenceIds),
        ...getKnowledgeRelationships(input).flatMap((artifact) => artifact.stalenessReasonReferenceIds),
        ...getHistoricalKnowledgePackages(input).flatMap((artifact) => artifact.stalenessReasonReferenceIds),
        ...getAuditKnowledgePackages(input).flatMap((artifact) => artifact.stalenessReasonReferenceIds),
        ...getControllerKnowledgePackages(input).flatMap((artifact) => artifact.stalenessReasonReferenceIds),
        ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.stalenessReasonReferenceIds),
      ],
      methodologyVersion: [
        ...getMethodologyObjects(input).map((artifact) => artifact.methodologyVersion),
        ...getHistoricalMethodologyPackages(input).flatMap((artifact) => artifact.methodologyVersion),
        ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.methodologyVersion),
      ],
      methodologyAncestryIds: [
        ...getMethodologyObjects(input).flatMap((artifact) => artifact.methodologyAncestryIds),
        ...getMethodologyRelationships(input).flatMap((artifact) => artifact.methodologyAncestryIds),
        ...getHistoricalMethodologyPackages(input).flatMap((artifact) => artifact.methodologyAncestryIds),
        ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.methodologyAncestryIds),
      ],
      methodologyDerivationMethod: [
        ...getMethodologyObjects(input).map((artifact) => artifact.methodologyDerivationMethod),
        ...getMethodologyRelationships(input).map((artifact) => artifact.methodologyDerivationMethod),
        ...getHistoricalMethodologyPackages(input).flatMap((artifact) => artifact.methodologyDerivationMethod),
        ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.methodologyDerivationMethod),
      ],
      methodologyDerivationHash: [
        ...getMethodologyObjects(input).map((artifact) => artifact.methodologyDerivationHash),
        ...getMethodologyRelationships(input).map((artifact) => artifact.methodologyDerivationHash),
        ...getHistoricalMethodologyPackages(input).flatMap((artifact) => artifact.methodologyDerivationHash),
        ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.methodologyDerivationHash),
      ],
      supersedesMethodologyIds: [
        ...getMethodologyObjects(input).flatMap((artifact) => artifact.supersedesMethodologyIds),
        ...getMethodologyRelationships(input).flatMap((artifact) => artifact.supersedesMethodologyIds),
        ...getHistoricalMethodologyPackages(input).flatMap((artifact) => artifact.supersedesMethodologyIds),
        ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.supersedesMethodologyIds),
      ],
      supersededByMethodologyIds: [
        ...getMethodologyObjects(input).flatMap((artifact) => artifact.supersededByMethodologyIds),
        ...getMethodologyRelationships(input).flatMap((artifact) => artifact.supersededByMethodologyIds),
        ...getHistoricalMethodologyPackages(input).flatMap((artifact) => artifact.supersededByMethodologyIds),
        ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.supersededByMethodologyIds),
      ],
      methodologyStaleMarker: [
        ...getMethodologyObjects(input).map((artifact) => artifact.methodologyStaleMarker),
        ...getMethodologyRelationships(input).map((artifact) => artifact.methodologyStaleMarker),
        ...getHistoricalMethodologyPackages(input).flatMap((artifact) => artifact.methodologyStaleMarker),
        ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.methodologyStaleMarker),
      ],
      confidenceFloorMetadata: sourceArtifacts.flatMap((artifact) =>
        getObjectArrayProperty<SyntheticKnowledgeConfidenceFloorMetadata>(artifact, "confidenceFloorMetadata"),
      ),
      sourceConfidenceReferenceIds: sourceArtifacts.flatMap((artifact) => getStringArrayProperty(artifact, "sourceConfidenceReferenceIds")),
      evidenceReferenceIds: getReferenceIds(input, "evidenceReferenceId", "evidenceReferenceIds"),
      sourceReferenceIds: getReferenceIds(input, "sourceReferenceId", "sourceReferenceIds"),
      lineageReferenceIds: getReferenceIds(input, "lineageReferenceId", "lineageReferenceIds"),
      upstreamObservationIds: getReferenceIds(input, "upstreamObservationId", "upstreamObservationIds"),
      upstreamPackageIds: getReferenceIds(input, "upstreamPackageId", "upstreamPackageIds"),
      organizationalMemoryGraphIds: getOrganizationalMemoryGraphIds(input),
      organizationalMemoryPackageIds: getOrganizationalMemoryPackageIds(input),
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
      knowledgeObjects: getKnowledgeObjects(input),
      knowledgeRelationships: getKnowledgeRelationships(input),
      methodologyObjects: getMethodologyObjects(input),
      methodologyRelationships: getMethodologyRelationships(input),
      historicalKnowledgePackages: getHistoricalKnowledgePackages(input),
      historicalMethodologyPackages: getHistoricalMethodologyPackages(input),
      auditKnowledgePackages: getAuditKnowledgePackages(input),
      controllerKnowledgePackages: getControllerKnowledgePackages(input),
      organizationalKnowledgePackages: getOrganizationalKnowledgePackages(input),
      organizationalMemoryGraphs: getOrganizationalMemoryGraphs(input),
      organizationalMemoryPackages: getOrganizationalMemoryPackages(input),
      warnings,
    },
    skipped: false,
    warnings,
  };
}
