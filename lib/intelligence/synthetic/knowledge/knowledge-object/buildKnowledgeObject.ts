import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticKnowledgeConfidenceFloorMetadata,
  SyntheticKnowledgeDerivationMethod,
  SyntheticKnowledgeObjectContract,
  SyntheticKnowledgeStaleMarker,
  SyntheticKnowledgeValidityWindow,
} from "../contracts";
import type { SyntheticEvidenceLineageGraph } from "../../organizational-memory/evidence-lineage-graph";
import type { SyntheticEnterpriseMemoryPackage } from "../../organizational-memory/enterprise-memory-package";
import type { SyntheticMemoryObject, SyntheticMemoryObjectIsolationDimension, SyntheticMemoryObjectSourceArtifact } from "../../organizational-memory/memory-object";
import type { SyntheticMemoryPreservationPackage } from "../../organizational-memory/memory-preservation-package";
import type { SyntheticMemoryRelationship } from "../../organizational-memory/memory-relationship";
import type { SyntheticOrganizationalMemoryArchive } from "../../organizational-memory/organizational-memory-archive";
import type { SyntheticOrganizationalMemoryGraph } from "../../organizational-memory/organizational-memory-graph";
import type { SyntheticOrganizationalMemoryPackage } from "../../organizational-memory/organizational-memory-package";
import type { SyntheticPortfolioMemoryPackage } from "../../organizational-memory/portfolio-memory-package";
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

export type SyntheticKnowledgeObjectCategory =
  | "organizational_understanding"
  | "historical_understanding"
  | "audit_understanding"
  | "controller_understanding"
  | "enterprise_understanding"
  | "portfolio_understanding"
  | "relationship_understanding";

export const SYNTHETIC_KNOWLEDGE_OBJECT_CATEGORIES: SyntheticKnowledgeObjectCategory[] = [
  "organizational_understanding",
  "historical_understanding",
  "audit_understanding",
  "controller_understanding",
  "enterprise_understanding",
  "portfolio_understanding",
  "relationship_understanding",
];

export interface BuildKnowledgeObjectInput {
  auditContract: SyntheticAuditContract | null;
  knowledgeCategory: SyntheticKnowledgeObjectCategory;
  derivationMethod: SyntheticKnowledgeDerivationMethod;
  knowledgeValidityWindow: SyntheticKnowledgeValidityWindow | null;
  sourceMemorySnapshotIds?: string[];
  supersedesKnowledgeIds?: string[];
  supersededByKnowledgeIds?: string[];
  staleMarker?: SyntheticKnowledgeStaleMarker;
  stalenessReasonReferenceIds?: string[];
  confidenceFloorMetadata?: SyntheticKnowledgeConfidenceFloorMetadata[];
  sourceConfidenceReferenceIds?: string[];
  organizationalMemoryPackages?: SyntheticOrganizationalMemoryPackage[];
  organizationalMemoryGraphs?: SyntheticOrganizationalMemoryGraph[];
  enterpriseMemoryPackages?: SyntheticEnterpriseMemoryPackage[];
  portfolioMemoryPackages?: SyntheticPortfolioMemoryPackage[];
  organizationalMemoryArchives?: SyntheticOrganizationalMemoryArchive[];
  memoryPreservationPackages?: SyntheticMemoryPreservationPackage[];
  memoryObjects?: SyntheticMemoryObject[];
  memoryRelationships?: SyntheticMemoryRelationship[];
  evidenceLineageGraphs?: SyntheticEvidenceLineageGraph[];
  healthcarePpdObservations?: SyntheticMemoryObjectSourceArtifact[];
  payrollObservations?: SyntheticMemoryObjectSourceArtifact[];
  methodologyObservations?: SyntheticMemoryObjectSourceArtifact[];
}

export interface SyntheticKnowledgeObject extends SyntheticKnowledgeObjectContract {
  knowledgeObjectId: string;
  knowledgeObjectKey: string;
  knowledgeCategory: SyntheticKnowledgeObjectCategory;
  companyId: string;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
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
  enterpriseMemoryPackageIds: string[];
  portfolioMemoryPackageIds: string[];
  organizationalMemoryArchiveIds: string[];
  memoryPreservationPackageIds: string[];
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
  observationMetadata: SyntheticAuditObservationMetadata[];
  findingMetadata: SyntheticAuditFindingMetadata[];
  exceptionMetadata: SyntheticAuditExceptionMetadata[];
  riskMetadata: SyntheticAuditRiskMetadata[];
  executable: false;
  actionReady: false;
  workflowReady: false;
  phase38Required: true;
  organizationalMemoryPackages: SyntheticOrganizationalMemoryPackage[];
  organizationalMemoryGraphs: SyntheticOrganizationalMemoryGraph[];
  enterpriseMemoryPackages: SyntheticEnterpriseMemoryPackage[];
  portfolioMemoryPackages: SyntheticPortfolioMemoryPackage[];
  organizationalMemoryArchives: SyntheticOrganizationalMemoryArchive[];
  memoryPreservationPackages: SyntheticMemoryPreservationPackage[];
  memoryObjects: SyntheticMemoryObject[];
  memoryRelationships: SyntheticMemoryRelationship[];
  evidenceLineageGraphs: SyntheticEvidenceLineageGraph[];
  healthcarePpdObservations: SyntheticMemoryObjectSourceArtifact[];
  payrollObservations: SyntheticMemoryObjectSourceArtifact[];
  methodologyObservations: SyntheticMemoryObjectSourceArtifact[];
  warnings: string[];
}

export interface BuildKnowledgeObjectResult {
  knowledgeObject: SyntheticKnowledgeObject | null;
  skipped: boolean;
  warnings: string[];
}

type KnowledgeSourceArtifact =
  | SyntheticOrganizationalMemoryPackage
  | SyntheticOrganizationalMemoryGraph
  | SyntheticEnterpriseMemoryPackage
  | SyntheticPortfolioMemoryPackage
  | SyntheticOrganizationalMemoryArchive
  | SyntheticMemoryPreservationPackage
  | SyntheticMemoryObject
  | SyntheticMemoryRelationship
  | SyntheticEvidenceLineageGraph;

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function compactStrings(values: Array<string | undefined>): string[] {
  return values.filter((value): value is string => hasValue(value));
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

function isSupportedKnowledgeCategory(knowledgeCategory: SyntheticKnowledgeObjectCategory): boolean {
  return SYNTHETIC_KNOWLEDGE_OBJECT_CATEGORIES.includes(knowledgeCategory);
}

function buildCustomerIsolation(scope: SyntheticAuditScope): SyntheticMemoryObjectIsolationDimension {
  return { required: scope.customerIsolationRequired, referenceIds: [scope.companyId, ...scope.isolationBoundaryIds].filter(hasValue) as string[] };
}

function buildFirmIsolation(scope: SyntheticAuditScope): SyntheticMemoryObjectIsolationDimension {
  return { required: scope.firmIsolationRequired, referenceIds: [scope.firmId, ...scope.isolationBoundaryIds].filter(hasValue) as string[] };
}

function buildClientIsolation(scope: SyntheticAuditScope): SyntheticMemoryObjectIsolationDimension {
  return { required: scope.clientIsolationRequired, referenceIds: [scope.clientId, ...scope.isolationBoundaryIds].filter(hasValue) as string[] };
}

function getOrganizationalMemoryPackages(input: BuildKnowledgeObjectInput): SyntheticOrganizationalMemoryPackage[] {
  return getInputArray(input.organizationalMemoryPackages);
}

function getOrganizationalMemoryGraphs(input: BuildKnowledgeObjectInput): SyntheticOrganizationalMemoryGraph[] {
  return getInputArray(input.organizationalMemoryGraphs);
}

function getEnterpriseMemoryPackages(input: BuildKnowledgeObjectInput): SyntheticEnterpriseMemoryPackage[] {
  return getInputArray(input.enterpriseMemoryPackages);
}

function getPortfolioMemoryPackages(input: BuildKnowledgeObjectInput): SyntheticPortfolioMemoryPackage[] {
  return getInputArray(input.portfolioMemoryPackages);
}

function getOrganizationalMemoryArchives(input: BuildKnowledgeObjectInput): SyntheticOrganizationalMemoryArchive[] {
  return getInputArray(input.organizationalMemoryArchives);
}

function getMemoryPreservationPackages(input: BuildKnowledgeObjectInput): SyntheticMemoryPreservationPackage[] {
  return getInputArray(input.memoryPreservationPackages);
}

function getMemoryObjects(input: BuildKnowledgeObjectInput): SyntheticMemoryObject[] {
  return getInputArray(input.memoryObjects);
}

function getMemoryRelationships(input: BuildKnowledgeObjectInput): SyntheticMemoryRelationship[] {
  return getInputArray(input.memoryRelationships);
}

function getEvidenceLineageGraphs(input: BuildKnowledgeObjectInput): SyntheticEvidenceLineageGraph[] {
  return getInputArray(input.evidenceLineageGraphs);
}

function getKnowledgeSourceArtifacts(input: BuildKnowledgeObjectInput): KnowledgeSourceArtifact[] {
  return [
    ...getOrganizationalMemoryPackages(input),
    ...getOrganizationalMemoryGraphs(input),
    ...getEnterpriseMemoryPackages(input),
    ...getPortfolioMemoryPackages(input),
    ...getOrganizationalMemoryArchives(input),
    ...getMemoryPreservationPackages(input),
    ...getMemoryObjects(input),
    ...getMemoryRelationships(input),
    ...getEvidenceLineageGraphs(input),
  ];
}

function getForwardCompatibleReferences(input: BuildKnowledgeObjectInput): SyntheticMemoryObjectSourceArtifact[] {
  return [
    ...getInputArray(input.healthcarePpdObservations),
    ...getInputArray(input.payrollObservations),
    ...getInputArray(input.methodologyObservations),
  ];
}

function getReferenceIds(input: BuildKnowledgeObjectInput, singularName: string, arrayName: string): string[] {
  return [
    ...getForwardCompatibleReferences(input).flatMap((artifact) => [
      ...getStringProperty(artifact, singularName),
      ...getStringArrayProperty(artifact, arrayName),
    ]),
    ...getKnowledgeSourceArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, singularName),
      ...getStringArrayProperty(artifact, arrayName),
    ]),
  ].filter(hasValue) as string[];
}

function getSourceMemoryObjectIds(input: BuildKnowledgeObjectInput): string[] {
  return [
    ...getMemoryObjects(input).map((artifact) => artifact.memoryObjectId),
    ...getKnowledgeSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "memoryObjectIds")),
  ].filter(hasValue) as string[];
}

function getSourceMemoryRelationshipIds(input: BuildKnowledgeObjectInput): string[] {
  return [
    ...getMemoryRelationships(input).map((artifact) => artifact.memoryRelationshipId),
    ...getKnowledgeSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "memoryRelationshipIds")),
  ].filter(hasValue) as string[];
}

function getSourceEvidenceLineageGraphIds(input: BuildKnowledgeObjectInput): string[] {
  return [
    ...getEvidenceLineageGraphs(input).map((artifact) => artifact.evidenceLineageGraphId),
    ...getKnowledgeSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "evidenceLineageGraphIds")),
  ].filter(hasValue) as string[];
}

function getSourceOrganizationalMemoryPackageIds(input: BuildKnowledgeObjectInput): string[] {
  return [
    ...getOrganizationalMemoryPackages(input).map((artifact) => artifact.organizationalMemoryPackageId),
    ...getKnowledgeSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryPackageIds")),
  ].filter(hasValue) as string[];
}

function getSourceOrganizationalMemoryGraphIds(input: BuildKnowledgeObjectInput): string[] {
  return [
    ...getOrganizationalMemoryGraphs(input).map((artifact) => artifact.organizationalMemoryGraphId),
    ...getKnowledgeSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryGraphIds")),
  ].filter(hasValue) as string[];
}

function getEnterpriseMemoryPackageIds(input: BuildKnowledgeObjectInput): string[] {
  return [
    ...getEnterpriseMemoryPackages(input).map((artifact) => artifact.enterpriseMemoryPackageId),
    ...getKnowledgeSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "enterpriseMemoryPackageIds")),
  ].filter(hasValue) as string[];
}

function getPortfolioMemoryPackageIds(input: BuildKnowledgeObjectInput): string[] {
  return [
    ...getPortfolioMemoryPackages(input).map((artifact) => artifact.portfolioMemoryPackageId),
    ...getKnowledgeSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "portfolioMemoryPackageIds")),
  ].filter(hasValue) as string[];
}

function getOrganizationalMemoryArchiveIds(input: BuildKnowledgeObjectInput): string[] {
  return [
    ...getOrganizationalMemoryArchives(input).map((artifact) => artifact.organizationalMemoryArchiveId),
    ...getKnowledgeSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryArchiveIds")),
  ].filter(hasValue) as string[];
}

function getMemoryPreservationPackageIds(input: BuildKnowledgeObjectInput): string[] {
  return getMemoryPreservationPackages(input).map((artifact) => artifact.memoryPreservationPackageId).filter(hasValue);
}

function getDerivationLineageIds(input: BuildKnowledgeObjectInput): string[] {
  return [
    ...getSourceMemoryObjectIds(input),
    ...getSourceMemoryRelationshipIds(input),
    ...getSourceEvidenceLineageGraphIds(input),
    ...getSourceOrganizationalMemoryPackageIds(input),
    ...getSourceOrganizationalMemoryGraphIds(input),
    ...getEnterpriseMemoryPackageIds(input),
    ...getPortfolioMemoryPackageIds(input),
    ...getOrganizationalMemoryArchiveIds(input),
    ...getMemoryPreservationPackageIds(input),
  ];
}

function getEvidenceReferenceIds(input: BuildKnowledgeObjectInput): string[] {
  return [
    ...(input.auditContract?.evidence.evidenceIds ?? []),
    ...getForwardCompatibleReferences(input).flatMap((artifact) => artifact.evidenceReferenceIds ?? []),
    ...getKnowledgeSourceArtifacts(input).flatMap((artifact) => artifact.evidenceReferenceIds),
  ].filter(hasValue) as string[];
}

function getSourceReferenceIds(input: BuildKnowledgeObjectInput): string[] {
  return [
    ...(input.auditContract?.evidence.sourceReferenceIds ?? []),
    ...getForwardCompatibleReferences(input).flatMap((artifact) => artifact.sourceReferenceIds ?? []),
    ...getKnowledgeSourceArtifacts(input).flatMap((artifact) => artifact.sourceReferenceIds),
  ].filter(hasValue) as string[];
}

function getLineageReferenceIds(input: BuildKnowledgeObjectInput): string[] {
  return [
    ...(input.auditContract?.evidence.lineageReferenceIds ?? []),
    ...getForwardCompatibleReferences(input).flatMap((artifact) => artifact.lineageReferenceIds ?? []),
    ...getKnowledgeSourceArtifacts(input).flatMap((artifact) => artifact.lineageReferenceIds),
  ].filter(hasValue) as string[];
}

function getUpstreamObservationIds(input: BuildKnowledgeObjectInput): string[] {
  return compactStrings([
    input.auditContract?.observationMetadata?.auditObservationId,
    ...(input.auditContract?.evidence.supportingObservationIds ?? []),
    ...getForwardCompatibleReferences(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "observationId"),
      ...(artifact.upstreamObservationIds ?? []),
    ]),
    ...getKnowledgeSourceArtifacts(input).flatMap((artifact) => artifact.upstreamObservationIds),
  ]);
}

function getUpstreamPackageIds(input: BuildKnowledgeObjectInput): string[] {
  return [
    ...getForwardCompatibleReferences(input).flatMap((artifact) => [...getStringProperty(artifact, "packageId"), ...(artifact.upstreamPackageIds ?? [])]),
    ...getKnowledgeSourceArtifacts(input).flatMap((artifact) => artifact.upstreamPackageIds),
  ].filter(hasValue) as string[];
}

function getAuditContractReferenceIds(input: BuildKnowledgeObjectInput): string[] {
  const auditContract = input.auditContract;
  return compactStrings([
    auditContract?.observationMetadata?.auditObservationId,
    auditContract?.findingMetadata?.auditFindingId,
    auditContract?.exceptionMetadata?.auditExceptionId,
    auditContract?.riskMetadata?.auditRiskId,
    ...(auditContract?.evidence.sourceReferenceIds ?? []),
    ...(auditContract?.evidence.lineageReferenceIds ?? []),
    ...getForwardCompatibleReferences(input).flatMap((artifact) => artifact.auditContractReferenceIds ?? []),
    ...getKnowledgeSourceArtifacts(input).flatMap((artifact) => artifact.auditContractReferenceIds),
  ]);
}

function buildDerivationHash(input: BuildKnowledgeObjectInput): string {
  const scope = input.auditContract?.scope;
  return stableSnapshotHash({
    sourceMemoryObjectIds: getSourceMemoryObjectIds(input),
    sourceMemoryRelationshipIds: getSourceMemoryRelationshipIds(input),
    sourceEvidenceLineageGraphIds: getSourceEvidenceLineageGraphIds(input),
    sourceOrganizationalMemoryPackageIds: getSourceOrganizationalMemoryPackageIds(input),
    sourceOrganizationalMemoryGraphIds: getSourceOrganizationalMemoryGraphIds(input),
    derivationMethod: input.derivationMethod,
    customerIsolation: scope ? buildCustomerIsolation(scope) : null,
    firmIsolation: scope ? buildFirmIsolation(scope) : null,
    clientIsolation: scope ? buildClientIsolation(scope) : null,
    knowledgeCategory: input.knowledgeCategory,
  });
}

function buildKnowledgeObjectKey(input: BuildKnowledgeObjectInput): string {
  const scope = input.auditContract?.scope;
  return stableSnapshotHash({
    knowledgeCategory: input.knowledgeCategory,
    companyId: scope?.companyId ?? null,
    scope: scope ?? null,
    customerIsolation: scope ? buildCustomerIsolation(scope) : null,
    firmIsolation: scope ? buildFirmIsolation(scope) : null,
    clientIsolation: scope ? buildClientIsolation(scope) : null,
    sourceMemoryObjectIds: getSourceMemoryObjectIds(input),
    sourceMemoryRelationshipIds: getSourceMemoryRelationshipIds(input),
    sourceEvidenceLineageGraphIds: getSourceEvidenceLineageGraphIds(input),
    sourceOrganizationalMemoryPackageIds: getSourceOrganizationalMemoryPackageIds(input),
    sourceOrganizationalMemoryGraphIds: getSourceOrganizationalMemoryGraphIds(input),
    derivationMethod: input.derivationMethod,
  });
}

function buildKnowledgeObjectId(input: BuildKnowledgeObjectInput): string {
  return `synthetic-knowledge-object:${stableSnapshotHash({
    knowledgeObjectKey: buildKnowledgeObjectKey(input),
    knowledgeCategory: input.knowledgeCategory,
    companyId: input.auditContract?.scope.companyId ?? null,
  })}`;
}

function getMaterialityMetadata(input: BuildKnowledgeObjectInput): SyntheticAuditMaterialityCompatibility[] {
  return compactDefined([
    input.auditContract?.materialityCompatibility,
    ...getForwardCompatibleReferences(input).flatMap((artifact) => [
      ...getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(artifact, "materialityMetadata"),
      ...getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(artifact, "materialityCompatibility"),
    ]),
    ...getKnowledgeSourceArtifacts(input).flatMap((artifact) => [...artifact.materialityMetadata, ...artifact.materialityCompatibility]),
  ]);
}

function getForwardCompatibilityWarnings(input: BuildKnowledgeObjectInput): string[] {
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

function validateInput(input: BuildKnowledgeObjectInput): string[] {
  const warnings: string[] = [];
  const auditContract = input.auditContract;

  if (!auditContract) warnings.push("auditContract is required.");
  if (!auditContract) return warnings;

  if (!hasValue(input.knowledgeCategory)) warnings.push("knowledgeCategory is required.");
  if (!isSupportedKnowledgeCategory(input.knowledgeCategory)) warnings.push("knowledgeCategory must be supported.");
  if (!hasValue(input.derivationMethod)) warnings.push("derivationMethod is required.");
  if (!input.knowledgeValidityWindow) warnings.push("knowledgeValidityWindow is required.");
  if (!auditContract.scope) warnings.push("auditContract.scope is required.");
  if (!auditContract.evidence) warnings.push("auditContract.evidence is required.");
  if (!auditContract.scope || !auditContract.evidence) return warnings;

  if (!hasValue(auditContract.scope.companyId)) warnings.push("scope.companyId is required.");
  if (buildCustomerIsolation(auditContract.scope).referenceIds.length === 0) warnings.push("customerIsolation referenceIds are required.");
  if (buildFirmIsolation(auditContract.scope).referenceIds.length === 0) warnings.push("firmIsolation referenceIds are required.");
  if (getDerivationLineageIds(input).length === 0) warnings.push("at least one Phase 36 source memory reference is required.");

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

  for (const [inputName, values, idName, keyName] of [
    ["organizationalMemoryPackages", getOrganizationalMemoryPackages(input), "organizationalMemoryPackageId", "organizationalMemoryPackageKey"],
    ["organizationalMemoryGraphs", getOrganizationalMemoryGraphs(input), "organizationalMemoryGraphId", "organizationalMemoryGraphKey"],
    ["enterpriseMemoryPackages", getEnterpriseMemoryPackages(input), "enterpriseMemoryPackageId", "enterpriseMemoryPackageKey"],
    ["portfolioMemoryPackages", getPortfolioMemoryPackages(input), "portfolioMemoryPackageId", "portfolioMemoryPackageKey"],
    ["organizationalMemoryArchives", getOrganizationalMemoryArchives(input), "organizationalMemoryArchiveId", "organizationalMemoryArchiveKey"],
    ["memoryPreservationPackages", getMemoryPreservationPackages(input), "memoryPreservationPackageId", "memoryPreservationPackageKey"],
    ["memoryObjects", getMemoryObjects(input), "memoryObjectId", "memoryObjectKey"],
    ["memoryRelationships", getMemoryRelationships(input), "memoryRelationshipId", "memoryRelationshipKey"],
    ["evidenceLineageGraphs", getEvidenceLineageGraphs(input), "evidenceLineageGraphId", "evidenceLineageGraphKey"],
  ] as const) {
    values.forEach((artifact, index) => {
      if (!hasValue((artifact as unknown as Record<string, unknown>)[idName])) warnings.push(`${inputName}[${index}].${idName} is required.`);
      if (!hasValue((artifact as unknown as Record<string, unknown>)[keyName])) warnings.push(`${inputName}[${index}].${keyName} is required.`);
      if (artifact.companyId !== companyId) warnings.push(`${inputName}[${index}].companyId must equal scope.companyId.`);
    });
  }

  return warnings;
}

export function buildKnowledgeObject(input: BuildKnowledgeObjectInput): BuildKnowledgeObjectResult {
  const fatalWarnings = validateInput(input);
  if (fatalWarnings.length > 0 || !input.auditContract || !input.knowledgeValidityWindow) {
    return {
      knowledgeObject: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const auditContract = input.auditContract;
  const materialityMetadata = getMaterialityMetadata(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    knowledgeObject: {
      knowledgeObjectId: buildKnowledgeObjectId(input),
      knowledgeObjectKey: buildKnowledgeObjectKey(input),
      knowledgeCategory: input.knowledgeCategory,
      companyId: auditContract.scope.companyId,
      scope: auditContract.scope,
      customerIsolation: buildCustomerIsolation(auditContract.scope),
      firmIsolation: buildFirmIsolation(auditContract.scope),
      clientIsolation: buildClientIsolation(auditContract.scope),
      derivationLineageIds: getDerivationLineageIds(input),
      sourceMemoryObjectIds: getSourceMemoryObjectIds(input),
      sourceMemoryRelationshipIds: getSourceMemoryRelationshipIds(input),
      sourceEvidenceLineageGraphIds: getSourceEvidenceLineageGraphIds(input),
      sourceOrganizationalMemoryPackageIds: getSourceOrganizationalMemoryPackageIds(input),
      sourceOrganizationalMemoryGraphIds: getSourceOrganizationalMemoryGraphIds(input),
      derivationMethod: input.derivationMethod,
      derivationHash: buildDerivationHash(input),
      knowledgeValidityWindow: input.knowledgeValidityWindow,
      sourceMemorySnapshotIds: getInputArray(input.sourceMemorySnapshotIds),
      supersedesKnowledgeIds: getInputArray(input.supersedesKnowledgeIds),
      supersededByKnowledgeIds: getInputArray(input.supersededByKnowledgeIds),
      staleMarker: input.staleMarker ?? "current",
      stalenessReasonReferenceIds: getInputArray(input.stalenessReasonReferenceIds),
      confidenceFloorMetadata: getInputArray(input.confidenceFloorMetadata),
      sourceConfidenceReferenceIds: getInputArray(input.sourceConfidenceReferenceIds),
      evidenceReferenceIds: getEvidenceReferenceIds(input),
      sourceReferenceIds: getSourceReferenceIds(input),
      lineageReferenceIds: getLineageReferenceIds(input),
      upstreamObservationIds: getUpstreamObservationIds(input),
      upstreamPackageIds: getUpstreamPackageIds(input),
      memoryObjectIds: getSourceMemoryObjectIds(input),
      memoryRelationshipIds: getSourceMemoryRelationshipIds(input),
      evidenceLineageGraphIds: getSourceEvidenceLineageGraphIds(input),
      organizationalMemoryPackageIds: getSourceOrganizationalMemoryPackageIds(input),
      organizationalMemoryGraphIds: getSourceOrganizationalMemoryGraphIds(input),
      enterpriseMemoryPackageIds: getEnterpriseMemoryPackageIds(input),
      portfolioMemoryPackageIds: getPortfolioMemoryPackageIds(input),
      organizationalMemoryArchiveIds: getOrganizationalMemoryArchiveIds(input),
      memoryPreservationPackageIds: getMemoryPreservationPackageIds(input),
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
      trustMetadata: compactDefined([
        auditContract.trustMetadata,
        ...getForwardCompatibleReferences(input).flatMap((artifact) =>
          getObjectArrayProperty<SyntheticAuditTrustMetadata>(artifact, "trustMetadata"),
        ),
        ...getKnowledgeSourceArtifacts(input).flatMap((artifact) => artifact.trustMetadata),
      ]),
      confidenceMetadata: compactDefined([
        auditContract.confidenceMetadata,
        ...getForwardCompatibleReferences(input).flatMap((artifact) =>
          getObjectArrayProperty<SyntheticAuditConfidenceMetadata>(artifact, "confidenceMetadata"),
        ),
        ...getKnowledgeSourceArtifacts(input).flatMap((artifact) => artifact.confidenceMetadata),
      ]),
      governanceMetadata: compactDefined([
        auditContract.governanceMetadata,
        ...getForwardCompatibleReferences(input).flatMap((artifact) =>
          getObjectArrayProperty<SyntheticAuditGovernanceMetadata>(artifact, "governanceMetadata"),
        ),
        ...getKnowledgeSourceArtifacts(input).flatMap((artifact) => artifact.governanceMetadata),
      ]),
      materialityMetadata,
      materialityCompatibility: materialityMetadata,
      personaCompatibility: compactDefined([
        auditContract.personaCompatibility,
        ...getForwardCompatibleReferences(input).flatMap((artifact) =>
          getObjectArrayProperty<SyntheticAuditPersonaCompatibility>(artifact, "personaCompatibility"),
        ),
        ...getKnowledgeSourceArtifacts(input).flatMap((artifact) => artifact.personaCompatibility),
      ]),
      packageCompatibility: compactDefined([
        auditContract.packageCompatibility,
        ...getForwardCompatibleReferences(input).flatMap((artifact) =>
          getObjectArrayProperty<SyntheticAuditPackageCompatibility>(artifact, "packageCompatibility"),
        ),
        ...getKnowledgeSourceArtifacts(input).flatMap((artifact) => artifact.packageCompatibility),
      ]),
      memoryCompatibility: compactDefined([
        auditContract.memoryCompatibility,
        ...getForwardCompatibleReferences(input).flatMap((artifact) =>
          getObjectArrayProperty<SyntheticAuditMemoryCompatibility>(artifact, "memoryCompatibility"),
        ),
        ...getKnowledgeSourceArtifacts(input).flatMap((artifact) => artifact.memoryCompatibility),
      ]),
      learningCompatibility: compactDefined([
        auditContract.learningCompatibility,
        ...getForwardCompatibleReferences(input).flatMap((artifact) =>
          getObjectArrayProperty<SyntheticAuditLearningCompatibility>(artifact, "learningCompatibility"),
        ),
        ...getKnowledgeSourceArtifacts(input).flatMap((artifact) => artifact.learningCompatibility),
      ]),
      surfaceCompatibility: compactDefined([
        auditContract.surfaceCompatibility,
        ...getForwardCompatibleReferences(input).flatMap((artifact) =>
          getObjectArrayProperty<SyntheticAuditSurfaceCompatibility>(artifact, "surfaceCompatibility"),
        ),
        ...getKnowledgeSourceArtifacts(input).flatMap((artifact) => artifact.surfaceCompatibility),
      ]),
      observationMetadata: compactDefined([
        auditContract.observationMetadata,
        ...getForwardCompatibleReferences(input).flatMap((artifact) =>
          getObjectArrayProperty<SyntheticAuditObservationMetadata>(artifact, "observationMetadata"),
        ),
        ...getKnowledgeSourceArtifacts(input).flatMap((artifact) => artifact.observationMetadata),
      ]),
      findingMetadata: compactDefined([
        auditContract.findingMetadata,
        ...getForwardCompatibleReferences(input).flatMap((artifact) =>
          getObjectArrayProperty<SyntheticAuditFindingMetadata>(artifact, "findingMetadata"),
        ),
        ...getKnowledgeSourceArtifacts(input).flatMap((artifact) => artifact.findingMetadata),
      ]),
      exceptionMetadata: compactDefined([
        auditContract.exceptionMetadata,
        ...getForwardCompatibleReferences(input).flatMap((artifact) =>
          getObjectArrayProperty<SyntheticAuditExceptionMetadata>(artifact, "exceptionMetadata"),
        ),
        ...getKnowledgeSourceArtifacts(input).flatMap((artifact) => artifact.exceptionMetadata),
      ]),
      riskMetadata: compactDefined([
        auditContract.riskMetadata,
        ...getForwardCompatibleReferences(input).flatMap((artifact) =>
          getObjectArrayProperty<SyntheticAuditRiskMetadata>(artifact, "riskMetadata"),
        ),
        ...getKnowledgeSourceArtifacts(input).flatMap((artifact) => artifact.riskMetadata),
      ]),
      executable: false,
      actionReady: false,
      workflowReady: false,
      phase38Required: true,
      organizationalMemoryPackages: getOrganizationalMemoryPackages(input),
      organizationalMemoryGraphs: getOrganizationalMemoryGraphs(input),
      enterpriseMemoryPackages: getEnterpriseMemoryPackages(input),
      portfolioMemoryPackages: getPortfolioMemoryPackages(input),
      organizationalMemoryArchives: getOrganizationalMemoryArchives(input),
      memoryPreservationPackages: getMemoryPreservationPackages(input),
      memoryObjects: getMemoryObjects(input),
      memoryRelationships: getMemoryRelationships(input),
      evidenceLineageGraphs: getEvidenceLineageGraphs(input),
      healthcarePpdObservations: getInputArray(input.healthcarePpdObservations),
      payrollObservations: getInputArray(input.payrollObservations),
      methodologyObservations: getInputArray(input.methodologyObservations),
      warnings,
    },
    skipped: false,
    warnings,
  };
}
