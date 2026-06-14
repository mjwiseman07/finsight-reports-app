import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticKnowledgeConfidenceFloorMetadata,
  SyntheticKnowledgeDerivationMethod,
  SyntheticKnowledgeStaleMarker,
  SyntheticKnowledgeValidityWindow,
  SyntheticMethodologyDerivationMethod,
  SyntheticMethodologyStaleMarker,
} from "../contracts/knowledgeContracts";
import type { SyntheticAuditKnowledgePackage } from "../audit-knowledge-package";
import type { SyntheticControllerKnowledgePackage } from "../controller-knowledge-package";
import type { SyntheticCrossEntityKnowledgePackage } from "../cross-entity-knowledge-package";
import type { SyntheticCrossFunctionKnowledgePackage } from "../cross-function-knowledge-package";
import type { SyntheticCrossPeriodKnowledgePackage } from "../cross-period-knowledge-package";
import type { SyntheticHistoricalKnowledgePackage } from "../historical-knowledge-package";
import type { SyntheticHistoricalMethodologyPackage } from "../historical-methodology-package";
import type { SyntheticOrganizationalKnowledgeGraph } from "../organizational-knowledge-graph";
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
import type { SyntheticEnterpriseMemoryPackage } from "../../organizational-memory/enterprise-memory-package";
import type { SyntheticMemoryObjectIsolationDimension } from "../../organizational-memory/memory-object";
import type { SyntheticOrganizationalMemoryArchive } from "../../organizational-memory/organizational-memory-archive";
import type { SyntheticOrganizationalMemoryGraph } from "../../organizational-memory/organizational-memory-graph";
import type { SyntheticOrganizationalMemoryPackage } from "../../organizational-memory/organizational-memory-package";

export type SyntheticEnterpriseKnowledgePackageCategory =
  | "enterprise_knowledge_package"
  | "enterprise_audit_knowledge_package"
  | "enterprise_controller_knowledge_package"
  | "enterprise_methodology_knowledge_package"
  | "enterprise_historical_knowledge_package";

export const SYNTHETIC_ENTERPRISE_KNOWLEDGE_PACKAGE_CATEGORIES: SyntheticEnterpriseKnowledgePackageCategory[] = [
  "enterprise_knowledge_package",
  "enterprise_audit_knowledge_package",
  "enterprise_controller_knowledge_package",
  "enterprise_methodology_knowledge_package",
  "enterprise_historical_knowledge_package",
];

export type SyntheticEnterpriseKnowledgeSuggestedPersona = "executive" | "cfo" | "controller" | "firm_admin" | "audit_partner";

export const SYNTHETIC_ENTERPRISE_KNOWLEDGE_SUGGESTED_PERSONAS: SyntheticEnterpriseKnowledgeSuggestedPersona[] = [
  "executive",
  "cfo",
  "controller",
  "firm_admin",
  "audit_partner",
];

export interface BuildEnterpriseKnowledgePackageInput {
  packageCategory: SyntheticEnterpriseKnowledgePackageCategory;
  organizationalKnowledgeGraphs?: SyntheticOrganizationalKnowledgeGraph[];
  organizationalKnowledgePackages?: SyntheticOrganizationalKnowledgePackage[];
  crossPeriodKnowledgePackages?: SyntheticCrossPeriodKnowledgePackage[];
  crossEntityKnowledgePackages?: SyntheticCrossEntityKnowledgePackage[];
  crossFunctionKnowledgePackages?: SyntheticCrossFunctionKnowledgePackage[];
  historicalKnowledgePackages?: SyntheticHistoricalKnowledgePackage[];
  historicalMethodologyPackages?: SyntheticHistoricalMethodologyPackage[];
  auditKnowledgePackages?: SyntheticAuditKnowledgePackage[];
  controllerKnowledgePackages?: SyntheticControllerKnowledgePackage[];
  enterpriseMemoryPackages?: SyntheticEnterpriseMemoryPackage[];
  organizationalMemoryArchives?: SyntheticOrganizationalMemoryArchive[];
  organizationalMemoryGraphs?: SyntheticOrganizationalMemoryGraph[];
  organizationalMemoryPackages?: SyntheticOrganizationalMemoryPackage[];
  healthcarePpdObservationIds?: string[];
  payrollObservationIds?: string[];
  methodologyObservationIds?: string[];
}

export interface SyntheticEnterpriseKnowledgePackage {
  enterpriseKnowledgePackageId: string;
  enterpriseKnowledgePackageKey: string;
  packageCategory: SyntheticEnterpriseKnowledgePackageCategory;
  companyId: string;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  organizationalKnowledgeGraphIds: string[];
  organizationalKnowledgePackageIds: string[];
  crossPeriodKnowledgePackageIds: string[];
  crossEntityKnowledgePackageIds: string[];
  crossFunctionKnowledgePackageIds: string[];
  historicalKnowledgePackageIds: string[];
  historicalMethodologyPackageIds: string[];
  auditKnowledgePackageIds: string[];
  controllerKnowledgePackageIds: string[];
  enterpriseMemoryPackageIds: string[];
  organizationalMemoryArchiveIds: string[];
  organizationalMemoryGraphIds: string[];
  organizationalMemoryPackageIds: string[];
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
  methodologyStalenessReasonReferenceIds: string[];
  confidenceFloorMetadata: SyntheticKnowledgeConfidenceFloorMetadata[];
  sourceConfidenceReferenceIds: string[];
  evidenceReferenceIds: string[];
  sourceReferenceIds: string[];
  lineageReferenceIds: string[];
  upstreamObservationIds: string[];
  upstreamPackageIds: string[];
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
  suggestedPersonaCategories: SyntheticEnterpriseKnowledgeSuggestedPersona[];
  executable: false;
  actionReady: false;
  workflowReady: false;
  phase38Required: true;
  knowledgePackageHandle: string;
  methodologyPackageHandle: string;
  knowledgeGraphSnapshotHash: string;
  methodologySnapshotHash: string;
  sourceKnowledgeObjectIds: string[];
  sourceMethodologyObjectIds: string[];
  sourceMemoryObjectIds: string[];
  sourceEvidenceLineageGraphIds: string[];
  organizationalKnowledgeGraphs: SyntheticOrganizationalKnowledgeGraph[];
  organizationalKnowledgePackages: SyntheticOrganizationalKnowledgePackage[];
  crossPeriodKnowledgePackages: SyntheticCrossPeriodKnowledgePackage[];
  crossEntityKnowledgePackages: SyntheticCrossEntityKnowledgePackage[];
  crossFunctionKnowledgePackages: SyntheticCrossFunctionKnowledgePackage[];
  historicalKnowledgePackages: SyntheticHistoricalKnowledgePackage[];
  historicalMethodologyPackages: SyntheticHistoricalMethodologyPackage[];
  auditKnowledgePackages: SyntheticAuditKnowledgePackage[];
  controllerKnowledgePackages: SyntheticControllerKnowledgePackage[];
  enterpriseMemoryPackages: SyntheticEnterpriseMemoryPackage[];
  organizationalMemoryArchives: SyntheticOrganizationalMemoryArchive[];
  organizationalMemoryGraphs: SyntheticOrganizationalMemoryGraph[];
  organizationalMemoryPackages: SyntheticOrganizationalMemoryPackage[];
  warnings: string[];
}

export interface BuildEnterpriseKnowledgePackageResult {
  enterpriseKnowledgePackage: SyntheticEnterpriseKnowledgePackage | null;
  skipped: boolean;
  warnings: string[];
}

type EnterpriseKnowledgeSourceArtifact =
  | SyntheticOrganizationalKnowledgeGraph
  | SyntheticOrganizationalKnowledgePackage
  | SyntheticCrossPeriodKnowledgePackage
  | SyntheticCrossEntityKnowledgePackage
  | SyntheticCrossFunctionKnowledgePackage
  | SyntheticHistoricalKnowledgePackage
  | SyntheticHistoricalMethodologyPackage
  | SyntheticAuditKnowledgePackage
  | SyntheticControllerKnowledgePackage
  | SyntheticEnterpriseMemoryPackage
  | SyntheticOrganizationalMemoryArchive
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

function isSupportedPackageCategory(packageCategory: SyntheticEnterpriseKnowledgePackageCategory): boolean {
  return SYNTHETIC_ENTERPRISE_KNOWLEDGE_PACKAGE_CATEGORIES.includes(packageCategory);
}

function getOrganizationalKnowledgeGraphs(input: BuildEnterpriseKnowledgePackageInput): SyntheticOrganizationalKnowledgeGraph[] {
  return getInputArray(input.organizationalKnowledgeGraphs);
}

function getOrganizationalKnowledgePackages(input: BuildEnterpriseKnowledgePackageInput): SyntheticOrganizationalKnowledgePackage[] {
  return getInputArray(input.organizationalKnowledgePackages);
}

function getCrossPeriodKnowledgePackages(input: BuildEnterpriseKnowledgePackageInput): SyntheticCrossPeriodKnowledgePackage[] {
  return getInputArray(input.crossPeriodKnowledgePackages);
}

function getCrossEntityKnowledgePackages(input: BuildEnterpriseKnowledgePackageInput): SyntheticCrossEntityKnowledgePackage[] {
  return getInputArray(input.crossEntityKnowledgePackages);
}

function getCrossFunctionKnowledgePackages(input: BuildEnterpriseKnowledgePackageInput): SyntheticCrossFunctionKnowledgePackage[] {
  return getInputArray(input.crossFunctionKnowledgePackages);
}

function getHistoricalKnowledgePackages(input: BuildEnterpriseKnowledgePackageInput): SyntheticHistoricalKnowledgePackage[] {
  return getInputArray(input.historicalKnowledgePackages);
}

function getHistoricalMethodologyPackages(input: BuildEnterpriseKnowledgePackageInput): SyntheticHistoricalMethodologyPackage[] {
  return getInputArray(input.historicalMethodologyPackages);
}

function getAuditKnowledgePackages(input: BuildEnterpriseKnowledgePackageInput): SyntheticAuditKnowledgePackage[] {
  return getInputArray(input.auditKnowledgePackages);
}

function getControllerKnowledgePackages(input: BuildEnterpriseKnowledgePackageInput): SyntheticControllerKnowledgePackage[] {
  return getInputArray(input.controllerKnowledgePackages);
}

function getEnterpriseMemoryPackages(input: BuildEnterpriseKnowledgePackageInput): SyntheticEnterpriseMemoryPackage[] {
  return getInputArray(input.enterpriseMemoryPackages);
}

function getOrganizationalMemoryArchives(input: BuildEnterpriseKnowledgePackageInput): SyntheticOrganizationalMemoryArchive[] {
  return getInputArray(input.organizationalMemoryArchives);
}

function getOrganizationalMemoryGraphs(input: BuildEnterpriseKnowledgePackageInput): SyntheticOrganizationalMemoryGraph[] {
  return getInputArray(input.organizationalMemoryGraphs);
}

function getOrganizationalMemoryPackages(input: BuildEnterpriseKnowledgePackageInput): SyntheticOrganizationalMemoryPackage[] {
  return getInputArray(input.organizationalMemoryPackages);
}

function getSourceArtifacts(input: BuildEnterpriseKnowledgePackageInput): EnterpriseKnowledgeSourceArtifact[] {
  return [
    ...getOrganizationalKnowledgeGraphs(input),
    ...getOrganizationalKnowledgePackages(input),
    ...getCrossPeriodKnowledgePackages(input),
    ...getCrossEntityKnowledgePackages(input),
    ...getCrossFunctionKnowledgePackages(input),
    ...getHistoricalKnowledgePackages(input),
    ...getHistoricalMethodologyPackages(input),
    ...getAuditKnowledgePackages(input),
    ...getControllerKnowledgePackages(input),
    ...getEnterpriseMemoryPackages(input),
    ...getOrganizationalMemoryArchives(input),
    ...getOrganizationalMemoryGraphs(input),
    ...getOrganizationalMemoryPackages(input),
  ];
}

function getPackageScope(input: BuildEnterpriseKnowledgePackageInput): SyntheticAuditScope | null {
  return getSourceArtifacts(input)[0]?.scope ?? null;
}

function getPackageCustomerIsolation(input: BuildEnterpriseKnowledgePackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.customerIsolation ?? null;
}

function getPackageFirmIsolation(input: BuildEnterpriseKnowledgePackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.firmIsolation ?? null;
}

function getPackageClientIsolation(input: BuildEnterpriseKnowledgePackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.clientIsolation ?? null;
}

function getOrganizationalKnowledgeGraphIds(input: BuildEnterpriseKnowledgePackageInput): string[] {
  return [
    ...getOrganizationalKnowledgeGraphs(input).map((artifact) => artifact.organizationalKnowledgeGraphId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalKnowledgeGraphIds")),
  ].filter(hasValue) as string[];
}

function getOrganizationalKnowledgePackageIds(input: BuildEnterpriseKnowledgePackageInput): string[] {
  return [
    ...getOrganizationalKnowledgePackages(input).map((artifact) => artifact.organizationalKnowledgePackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalKnowledgePackageIds")),
  ].filter(hasValue) as string[];
}

function getCrossPeriodKnowledgePackageIds(input: BuildEnterpriseKnowledgePackageInput): string[] {
  return [
    ...getCrossPeriodKnowledgePackages(input).map((artifact) => artifact.crossPeriodKnowledgePackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "crossPeriodKnowledgePackageIds")),
  ].filter(hasValue) as string[];
}

function getCrossEntityKnowledgePackageIds(input: BuildEnterpriseKnowledgePackageInput): string[] {
  return [
    ...getCrossEntityKnowledgePackages(input).map((artifact) => artifact.crossEntityKnowledgePackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "crossEntityKnowledgePackageIds")),
  ].filter(hasValue) as string[];
}

function getCrossFunctionKnowledgePackageIds(input: BuildEnterpriseKnowledgePackageInput): string[] {
  return [
    ...getCrossFunctionKnowledgePackages(input).map((artifact) => artifact.crossFunctionKnowledgePackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "crossFunctionKnowledgePackageIds")),
  ].filter(hasValue) as string[];
}

function getHistoricalKnowledgePackageIds(input: BuildEnterpriseKnowledgePackageInput): string[] {
  return [
    ...getHistoricalKnowledgePackages(input).map((artifact) => artifact.historicalKnowledgePackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "historicalKnowledgePackageIds")),
  ].filter(hasValue) as string[];
}

function getHistoricalMethodologyPackageIds(input: BuildEnterpriseKnowledgePackageInput): string[] {
  return [
    ...getHistoricalMethodologyPackages(input).map((artifact) => artifact.historicalMethodologyPackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "historicalMethodologyPackageIds")),
  ].filter(hasValue) as string[];
}

function getAuditKnowledgePackageIds(input: BuildEnterpriseKnowledgePackageInput): string[] {
  return getAuditKnowledgePackages(input).map((artifact) => artifact.auditKnowledgePackageId).filter(hasValue);
}

function getControllerKnowledgePackageIds(input: BuildEnterpriseKnowledgePackageInput): string[] {
  return getControllerKnowledgePackages(input).map((artifact) => artifact.controllerKnowledgePackageId).filter(hasValue);
}

function getEnterpriseMemoryPackageIds(input: BuildEnterpriseKnowledgePackageInput): string[] {
  return [
    ...getEnterpriseMemoryPackages(input).map((artifact) => artifact.enterpriseMemoryPackageId),
    ...getOrganizationalMemoryArchives(input).flatMap((artifact) => artifact.enterpriseMemoryPackageIds),
  ].filter(hasValue) as string[];
}

function getOrganizationalMemoryArchiveIds(input: BuildEnterpriseKnowledgePackageInput): string[] {
  return getOrganizationalMemoryArchives(input).map((artifact) => artifact.organizationalMemoryArchiveId).filter(hasValue);
}

function getOrganizationalMemoryGraphIds(input: BuildEnterpriseKnowledgePackageInput): string[] {
  return [
    ...getOrganizationalMemoryGraphs(input).map((artifact) => artifact.organizationalMemoryGraphId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryGraphIds")),
  ].filter(hasValue) as string[];
}

function getOrganizationalMemoryPackageIds(input: BuildEnterpriseKnowledgePackageInput): string[] {
  return [
    ...getOrganizationalMemoryPackages(input).map((artifact) => artifact.organizationalMemoryPackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryPackageIds")),
  ].filter(hasValue) as string[];
}

function getReferenceIds(input: BuildEnterpriseKnowledgePackageInput, singularName: string, arrayName: string): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringProperty(artifact, singularName)),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, arrayName)),
  ].filter(hasValue) as string[];
}

function getSourceKnowledgeObjectIds(input: BuildEnterpriseKnowledgePackageInput): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "knowledgeObjectIds")),
    ...getOrganizationalKnowledgeGraphs(input).flatMap((artifact) => artifact.knowledgeObjectIds),
  ].filter(hasValue) as string[];
}

function getSourceMethodologyObjectIds(input: BuildEnterpriseKnowledgePackageInput): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "methodologyObjectIds")),
    ...getOrganizationalKnowledgeGraphs(input).flatMap((artifact) => artifact.methodologyObjectIds),
  ].filter(hasValue) as string[];
}

function getSourceMemoryObjectIds(input: BuildEnterpriseKnowledgePackageInput): string[] {
  return getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "memoryObjectIds"));
}

function getSourceEvidenceLineageGraphIds(input: BuildEnterpriseKnowledgePackageInput): string[] {
  return getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "evidenceLineageGraphIds"));
}

function getDerivationLineageIds(input: BuildEnterpriseKnowledgePackageInput): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "derivationLineageIds")),
    ...getOrganizationalKnowledgeGraphIds(input),
    ...getOrganizationalKnowledgePackageIds(input),
    ...getCrossPeriodKnowledgePackageIds(input),
    ...getCrossEntityKnowledgePackageIds(input),
    ...getCrossFunctionKnowledgePackageIds(input),
    ...getHistoricalKnowledgePackageIds(input),
    ...getHistoricalMethodologyPackageIds(input),
    ...getAuditKnowledgePackageIds(input),
    ...getControllerKnowledgePackageIds(input),
    ...getEnterpriseMemoryPackageIds(input),
    ...getOrganizationalMemoryArchiveIds(input),
    ...getOrganizationalMemoryGraphIds(input),
    ...getOrganizationalMemoryPackageIds(input),
  ];
}

function buildDerivationHash(input: BuildEnterpriseKnowledgePackageInput): string {
  return stableSnapshotHash({
    packageCategory: input.packageCategory,
    derivationLineageIds: getDerivationLineageIds(input),
    organizationalKnowledgeGraphIds: getOrganizationalKnowledgeGraphIds(input),
    organizationalKnowledgePackageIds: getOrganizationalKnowledgePackageIds(input),
    enterpriseMemoryPackageIds: getEnterpriseMemoryPackageIds(input),
  });
}

function buildEnterpriseKnowledgePackageKey(input: BuildEnterpriseKnowledgePackageInput): string {
  const scope = getPackageScope(input);
  return stableSnapshotHash({
    packageCategory: input.packageCategory,
    companyId: scope?.companyId ?? null,
    scope,
    customerIsolation: getPackageCustomerIsolation(input),
    firmIsolation: getPackageFirmIsolation(input),
    clientIsolation: getPackageClientIsolation(input),
    organizationalKnowledgeGraphIds: getOrganizationalKnowledgeGraphIds(input),
    organizationalKnowledgePackageIds: getOrganizationalKnowledgePackageIds(input),
    crossPeriodKnowledgePackageIds: getCrossPeriodKnowledgePackageIds(input),
    crossEntityKnowledgePackageIds: getCrossEntityKnowledgePackageIds(input),
    crossFunctionKnowledgePackageIds: getCrossFunctionKnowledgePackageIds(input),
    historicalKnowledgePackageIds: getHistoricalKnowledgePackageIds(input),
    historicalMethodologyPackageIds: getHistoricalMethodologyPackageIds(input),
    auditKnowledgePackageIds: getAuditKnowledgePackageIds(input),
    controllerKnowledgePackageIds: getControllerKnowledgePackageIds(input),
    enterpriseMemoryPackageIds: getEnterpriseMemoryPackageIds(input),
    organizationalMemoryArchiveIds: getOrganizationalMemoryArchiveIds(input),
    organizationalMemoryGraphIds: getOrganizationalMemoryGraphIds(input),
    organizationalMemoryPackageIds: getOrganizationalMemoryPackageIds(input),
  });
}

function buildEnterpriseKnowledgePackageId(input: BuildEnterpriseKnowledgePackageInput): string {
  return `synthetic-enterprise-knowledge-package:${stableSnapshotHash({
    enterpriseKnowledgePackageKey: buildEnterpriseKnowledgePackageKey(input),
    packageCategory: input.packageCategory,
    companyId: getPackageScope(input)?.companyId ?? null,
  })}`;
}

function buildKnowledgeGraphSnapshotHash(input: BuildEnterpriseKnowledgePackageInput): string {
  return stableSnapshotHash({
    organizationalKnowledgeGraphIds: getOrganizationalKnowledgeGraphIds(input),
    organizationalKnowledgePackageIds: getOrganizationalKnowledgePackageIds(input),
    sourceKnowledgeObjectIds: getSourceKnowledgeObjectIds(input),
  });
}

function buildMethodologySnapshotHash(input: BuildEnterpriseKnowledgePackageInput): string {
  return stableSnapshotHash({
    historicalMethodologyPackageIds: getHistoricalMethodologyPackageIds(input),
    sourceMethodologyObjectIds: getSourceMethodologyObjectIds(input),
    methodologyAncestryIds: getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "methodologyAncestryIds")),
  });
}

function buildKnowledgePackageHandle(input: BuildEnterpriseKnowledgePackageInput): string {
  return `phase38-knowledge-package:${stableSnapshotHash({
    enterpriseKnowledgePackageKey: buildEnterpriseKnowledgePackageKey(input),
    knowledgeGraphSnapshotHash: buildKnowledgeGraphSnapshotHash(input),
  })}`;
}

function buildMethodologyPackageHandle(input: BuildEnterpriseKnowledgePackageInput): string {
  return `phase38-methodology-package:${stableSnapshotHash({
    enterpriseKnowledgePackageKey: buildEnterpriseKnowledgePackageKey(input),
    methodologySnapshotHash: buildMethodologySnapshotHash(input),
  })}`;
}

function getForwardCompatibilityWarnings(input: BuildEnterpriseKnowledgePackageInput): string[] {
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

function validateInput(input: BuildEnterpriseKnowledgePackageInput): string[] {
  const warnings: string[] = [];
  const sourceArtifacts = getSourceArtifacts(input);
  const scope = getPackageScope(input);
  const companyId = scope?.companyId;

  if (!hasValue(input.packageCategory)) warnings.push("packageCategory is required.");
  if (!isSupportedPackageCategory(input.packageCategory)) warnings.push("packageCategory must be supported.");
  if (sourceArtifacts.length === 0) warnings.push("at least one enterprise knowledge source artifact is required.");
  if (!scope) warnings.push("source scope is required.");
  if (!companyId) warnings.push("source companyId is required.");
  if (!getPackageCustomerIsolation(input)) warnings.push("customerIsolation is required.");
  if (!getPackageFirmIsolation(input)) warnings.push("firmIsolation is required.");
  if (!getPackageClientIsolation(input)) warnings.push("clientIsolation is required.");

  sourceArtifacts.forEach((artifact, index) => {
    if (!hasValue(artifact.companyId)) warnings.push(`sourceArtifacts[${index}].companyId is required.`);
    if (companyId && artifact.companyId !== companyId) warnings.push(`sourceArtifacts[${index}].companyId must equal source companyId.`);
  });

  for (const [inputName, values, idName, keyName] of [
    ["organizationalKnowledgeGraphs", getOrganizationalKnowledgeGraphs(input), "organizationalKnowledgeGraphId", "organizationalKnowledgeGraphKey"],
    ["organizationalKnowledgePackages", getOrganizationalKnowledgePackages(input), "organizationalKnowledgePackageId", "organizationalKnowledgePackageKey"],
    ["crossPeriodKnowledgePackages", getCrossPeriodKnowledgePackages(input), "crossPeriodKnowledgePackageId", "crossPeriodKnowledgePackageKey"],
    ["crossEntityKnowledgePackages", getCrossEntityKnowledgePackages(input), "crossEntityKnowledgePackageId", "crossEntityKnowledgePackageKey"],
    ["crossFunctionKnowledgePackages", getCrossFunctionKnowledgePackages(input), "crossFunctionKnowledgePackageId", "crossFunctionKnowledgePackageKey"],
    ["historicalKnowledgePackages", getHistoricalKnowledgePackages(input), "historicalKnowledgePackageId", "historicalKnowledgePackageKey"],
    ["historicalMethodologyPackages", getHistoricalMethodologyPackages(input), "historicalMethodologyPackageId", "historicalMethodologyPackageKey"],
    ["auditKnowledgePackages", getAuditKnowledgePackages(input), "auditKnowledgePackageId", "auditKnowledgePackageKey"],
    ["controllerKnowledgePackages", getControllerKnowledgePackages(input), "controllerKnowledgePackageId", "controllerKnowledgePackageKey"],
    ["enterpriseMemoryPackages", getEnterpriseMemoryPackages(input), "enterpriseMemoryPackageId", "enterpriseMemoryPackageKey"],
    ["organizationalMemoryArchives", getOrganizationalMemoryArchives(input), "organizationalMemoryArchiveId", "organizationalMemoryArchiveKey"],
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

export function buildEnterpriseKnowledgePackage(
  input: BuildEnterpriseKnowledgePackageInput,
): BuildEnterpriseKnowledgePackageResult {
  const fatalWarnings = validateInput(input);
  const scope = getPackageScope(input);
  const customerIsolation = getPackageCustomerIsolation(input);
  const firmIsolation = getPackageFirmIsolation(input);
  const clientIsolation = getPackageClientIsolation(input);

  if (fatalWarnings.length > 0 || !scope || !customerIsolation || !firmIsolation || !clientIsolation) {
    return {
      enterpriseKnowledgePackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const sourceArtifacts = getSourceArtifacts(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    enterpriseKnowledgePackage: {
      enterpriseKnowledgePackageId: buildEnterpriseKnowledgePackageId(input),
      enterpriseKnowledgePackageKey: buildEnterpriseKnowledgePackageKey(input),
      packageCategory: input.packageCategory,
      companyId: scope.companyId,
      scope,
      customerIsolation,
      firmIsolation,
      clientIsolation,
      organizationalKnowledgeGraphIds: getOrganizationalKnowledgeGraphIds(input),
      organizationalKnowledgePackageIds: getOrganizationalKnowledgePackageIds(input),
      crossPeriodKnowledgePackageIds: getCrossPeriodKnowledgePackageIds(input),
      crossEntityKnowledgePackageIds: getCrossEntityKnowledgePackageIds(input),
      crossFunctionKnowledgePackageIds: getCrossFunctionKnowledgePackageIds(input),
      historicalKnowledgePackageIds: getHistoricalKnowledgePackageIds(input),
      historicalMethodologyPackageIds: getHistoricalMethodologyPackageIds(input),
      auditKnowledgePackageIds: getAuditKnowledgePackageIds(input),
      controllerKnowledgePackageIds: getControllerKnowledgePackageIds(input),
      enterpriseMemoryPackageIds: getEnterpriseMemoryPackageIds(input),
      organizationalMemoryArchiveIds: getOrganizationalMemoryArchiveIds(input),
      organizationalMemoryGraphIds: getOrganizationalMemoryGraphIds(input),
      organizationalMemoryPackageIds: getOrganizationalMemoryPackageIds(input),
      derivationLineageIds: getDerivationLineageIds(input),
      derivationMethod: "aggregation",
      derivationHash: buildDerivationHash(input),
      knowledgeValidityWindow: sourceArtifacts.flatMap((artifact) =>
        getObjectArrayProperty<SyntheticKnowledgeValidityWindow>(artifact, "knowledgeValidityWindow"),
      ),
      sourceMemorySnapshotIds: sourceArtifacts.flatMap((artifact) => getStringArrayProperty(artifact, "sourceMemorySnapshotIds")),
      supersedesKnowledgeIds: sourceArtifacts.flatMap((artifact) => getStringArrayProperty(artifact, "supersedesKnowledgeIds")),
      supersededByKnowledgeIds: sourceArtifacts.flatMap((artifact) => getStringArrayProperty(artifact, "supersededByKnowledgeIds")),
      staleMarker: sourceArtifacts.flatMap((artifact) => getStringArrayProperty(artifact, "staleMarker") as SyntheticKnowledgeStaleMarker[]),
      stalenessReasonReferenceIds: sourceArtifacts.flatMap((artifact) => getStringArrayProperty(artifact, "stalenessReasonReferenceIds")),
      methodologyVersion: sourceArtifacts.flatMap((artifact) => getStringArrayProperty(artifact, "methodologyVersion")),
      methodologyAncestryIds: sourceArtifacts.flatMap((artifact) => getStringArrayProperty(artifact, "methodologyAncestryIds")),
      methodologyDerivationMethod: sourceArtifacts.flatMap(
        (artifact) => getStringArrayProperty(artifact, "methodologyDerivationMethod") as SyntheticMethodologyDerivationMethod[],
      ),
      methodologyDerivationHash: sourceArtifacts.flatMap((artifact) => getStringArrayProperty(artifact, "methodologyDerivationHash")),
      supersedesMethodologyIds: sourceArtifacts.flatMap((artifact) => getStringArrayProperty(artifact, "supersedesMethodologyIds")),
      supersededByMethodologyIds: sourceArtifacts.flatMap((artifact) => getStringArrayProperty(artifact, "supersededByMethodologyIds")),
      methodologyStaleMarker: sourceArtifacts.flatMap(
        (artifact) => getStringArrayProperty(artifact, "methodologyStaleMarker") as SyntheticMethodologyStaleMarker[],
      ),
      methodologyStalenessReasonReferenceIds: sourceArtifacts.flatMap((artifact) =>
        getStringArrayProperty(artifact, "methodologyStalenessReasonReferenceIds"),
      ),
      confidenceFloorMetadata: sourceArtifacts.flatMap((artifact) =>
        getObjectArrayProperty<SyntheticKnowledgeConfidenceFloorMetadata>(artifact, "confidenceFloorMetadata"),
      ),
      sourceConfidenceReferenceIds: sourceArtifacts.flatMap((artifact) => getStringArrayProperty(artifact, "sourceConfidenceReferenceIds")),
      evidenceReferenceIds: getReferenceIds(input, "evidenceReferenceId", "evidenceReferenceIds"),
      sourceReferenceIds: getReferenceIds(input, "sourceReferenceId", "sourceReferenceIds"),
      lineageReferenceIds: getReferenceIds(input, "lineageReferenceId", "lineageReferenceIds"),
      upstreamObservationIds: getReferenceIds(input, "upstreamObservationId", "upstreamObservationIds"),
      upstreamPackageIds: getReferenceIds(input, "upstreamPackageId", "upstreamPackageIds"),
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
      suggestedPersonaCategories: SYNTHETIC_ENTERPRISE_KNOWLEDGE_SUGGESTED_PERSONAS,
      executable: false,
      actionReady: false,
      workflowReady: false,
      phase38Required: true,
      knowledgePackageHandle: buildKnowledgePackageHandle(input),
      methodologyPackageHandle: buildMethodologyPackageHandle(input),
      knowledgeGraphSnapshotHash: buildKnowledgeGraphSnapshotHash(input),
      methodologySnapshotHash: buildMethodologySnapshotHash(input),
      sourceKnowledgeObjectIds: getSourceKnowledgeObjectIds(input),
      sourceMethodologyObjectIds: getSourceMethodologyObjectIds(input),
      sourceMemoryObjectIds: getSourceMemoryObjectIds(input),
      sourceEvidenceLineageGraphIds: getSourceEvidenceLineageGraphIds(input),
      organizationalKnowledgeGraphs: getOrganizationalKnowledgeGraphs(input),
      organizationalKnowledgePackages: getOrganizationalKnowledgePackages(input),
      crossPeriodKnowledgePackages: getCrossPeriodKnowledgePackages(input),
      crossEntityKnowledgePackages: getCrossEntityKnowledgePackages(input),
      crossFunctionKnowledgePackages: getCrossFunctionKnowledgePackages(input),
      historicalKnowledgePackages: getHistoricalKnowledgePackages(input),
      historicalMethodologyPackages: getHistoricalMethodologyPackages(input),
      auditKnowledgePackages: getAuditKnowledgePackages(input),
      controllerKnowledgePackages: getControllerKnowledgePackages(input),
      enterpriseMemoryPackages: getEnterpriseMemoryPackages(input),
      organizationalMemoryArchives: getOrganizationalMemoryArchives(input),
      organizationalMemoryGraphs: getOrganizationalMemoryGraphs(input),
      organizationalMemoryPackages: getOrganizationalMemoryPackages(input),
      warnings,
    },
    skipped: false,
    warnings,
  };
}
