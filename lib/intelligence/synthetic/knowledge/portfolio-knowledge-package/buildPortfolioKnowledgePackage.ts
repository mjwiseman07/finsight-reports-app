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
import type { SyntheticEnterpriseKnowledgePackage } from "../enterprise-knowledge-package";
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
import type { SyntheticOrganizationalMemoryGraph } from "../../organizational-memory/organizational-memory-graph";
import type { SyntheticOrganizationalMemoryPackage } from "../../organizational-memory/organizational-memory-package";
import type { SyntheticPortfolioMemoryPackage } from "../../organizational-memory/portfolio-memory-package";

export type SyntheticPortfolioKnowledgePackageCategory =
  | "portfolio_knowledge_package"
  | "portfolio_audit_knowledge_package"
  | "portfolio_controller_knowledge_package"
  | "portfolio_methodology_knowledge_package"
  | "portfolio_historical_knowledge_package";

export const SYNTHETIC_PORTFOLIO_KNOWLEDGE_PACKAGE_CATEGORIES: SyntheticPortfolioKnowledgePackageCategory[] = [
  "portfolio_knowledge_package",
  "portfolio_audit_knowledge_package",
  "portfolio_controller_knowledge_package",
  "portfolio_methodology_knowledge_package",
  "portfolio_historical_knowledge_package",
];

export type SyntheticPortfolioKnowledgeSuggestedPersona = "firm_admin" | "audit_partner" | "controller" | "cfo" | "executive";

export const SYNTHETIC_PORTFOLIO_KNOWLEDGE_SUGGESTED_PERSONAS: SyntheticPortfolioKnowledgeSuggestedPersona[] = [
  "firm_admin",
  "audit_partner",
  "controller",
  "cfo",
  "executive",
];

export interface BuildPortfolioKnowledgePackageInput {
  packageCategory: SyntheticPortfolioKnowledgePackageCategory;
  enterpriseKnowledgePackages?: SyntheticEnterpriseKnowledgePackage[];
  crossEntityKnowledgePackages?: SyntheticCrossEntityKnowledgePackage[];
  crossPeriodKnowledgePackages?: SyntheticCrossPeriodKnowledgePackage[];
  crossFunctionKnowledgePackages?: SyntheticCrossFunctionKnowledgePackage[];
  organizationalKnowledgeGraphs?: SyntheticOrganizationalKnowledgeGraph[];
  organizationalKnowledgePackages?: SyntheticOrganizationalKnowledgePackage[];
  historicalKnowledgePackages?: SyntheticHistoricalKnowledgePackage[];
  historicalMethodologyPackages?: SyntheticHistoricalMethodologyPackage[];
  auditKnowledgePackages?: SyntheticAuditKnowledgePackage[];
  controllerKnowledgePackages?: SyntheticControllerKnowledgePackage[];
  portfolioMemoryPackages?: SyntheticPortfolioMemoryPackage[];
  enterpriseMemoryPackages?: SyntheticEnterpriseMemoryPackage[];
  organizationalMemoryGraphs?: SyntheticOrganizationalMemoryGraph[];
  organizationalMemoryPackages?: SyntheticOrganizationalMemoryPackage[];
  healthcarePpdObservationIds?: string[];
  payrollObservationIds?: string[];
  methodologyObservationIds?: string[];
}

export interface SyntheticPortfolioKnowledgePackage {
  portfolioKnowledgePackageId: string;
  portfolioKnowledgePackageKey: string;
  packageCategory: SyntheticPortfolioKnowledgePackageCategory;
  companyId: string;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  enterpriseKnowledgePackageIds: string[];
  crossEntityKnowledgePackageIds: string[];
  crossPeriodKnowledgePackageIds: string[];
  crossFunctionKnowledgePackageIds: string[];
  organizationalKnowledgeGraphIds: string[];
  organizationalKnowledgePackageIds: string[];
  historicalKnowledgePackageIds: string[];
  historicalMethodologyPackageIds: string[];
  auditKnowledgePackageIds: string[];
  controllerKnowledgePackageIds: string[];
  portfolioMemoryPackageIds: string[];
  enterpriseMemoryPackageIds: string[];
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
  suggestedPersonaCategories: SyntheticPortfolioKnowledgeSuggestedPersona[];
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
  enterpriseKnowledgePackages: SyntheticEnterpriseKnowledgePackage[];
  crossEntityKnowledgePackages: SyntheticCrossEntityKnowledgePackage[];
  crossPeriodKnowledgePackages: SyntheticCrossPeriodKnowledgePackage[];
  crossFunctionKnowledgePackages: SyntheticCrossFunctionKnowledgePackage[];
  organizationalKnowledgeGraphs: SyntheticOrganizationalKnowledgeGraph[];
  organizationalKnowledgePackages: SyntheticOrganizationalKnowledgePackage[];
  historicalKnowledgePackages: SyntheticHistoricalKnowledgePackage[];
  historicalMethodologyPackages: SyntheticHistoricalMethodologyPackage[];
  auditKnowledgePackages: SyntheticAuditKnowledgePackage[];
  controllerKnowledgePackages: SyntheticControllerKnowledgePackage[];
  portfolioMemoryPackages: SyntheticPortfolioMemoryPackage[];
  enterpriseMemoryPackages: SyntheticEnterpriseMemoryPackage[];
  organizationalMemoryGraphs: SyntheticOrganizationalMemoryGraph[];
  organizationalMemoryPackages: SyntheticOrganizationalMemoryPackage[];
  warnings: string[];
}

export interface BuildPortfolioKnowledgePackageResult {
  portfolioKnowledgePackage: SyntheticPortfolioKnowledgePackage | null;
  skipped: boolean;
  warnings: string[];
}

type PortfolioKnowledgeSourceArtifact =
  | SyntheticEnterpriseKnowledgePackage
  | SyntheticCrossEntityKnowledgePackage
  | SyntheticCrossPeriodKnowledgePackage
  | SyntheticCrossFunctionKnowledgePackage
  | SyntheticOrganizationalKnowledgeGraph
  | SyntheticOrganizationalKnowledgePackage
  | SyntheticHistoricalKnowledgePackage
  | SyntheticHistoricalMethodologyPackage
  | SyntheticAuditKnowledgePackage
  | SyntheticControllerKnowledgePackage
  | SyntheticPortfolioMemoryPackage
  | SyntheticEnterpriseMemoryPackage
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

function isSupportedPackageCategory(packageCategory: SyntheticPortfolioKnowledgePackageCategory): boolean {
  return SYNTHETIC_PORTFOLIO_KNOWLEDGE_PACKAGE_CATEGORIES.includes(packageCategory);
}

function getEnterpriseKnowledgePackages(input: BuildPortfolioKnowledgePackageInput): SyntheticEnterpriseKnowledgePackage[] {
  return getInputArray(input.enterpriseKnowledgePackages);
}

function getCrossEntityKnowledgePackages(input: BuildPortfolioKnowledgePackageInput): SyntheticCrossEntityKnowledgePackage[] {
  return getInputArray(input.crossEntityKnowledgePackages);
}

function getCrossPeriodKnowledgePackages(input: BuildPortfolioKnowledgePackageInput): SyntheticCrossPeriodKnowledgePackage[] {
  return getInputArray(input.crossPeriodKnowledgePackages);
}

function getCrossFunctionKnowledgePackages(input: BuildPortfolioKnowledgePackageInput): SyntheticCrossFunctionKnowledgePackage[] {
  return getInputArray(input.crossFunctionKnowledgePackages);
}

function getOrganizationalKnowledgeGraphs(input: BuildPortfolioKnowledgePackageInput): SyntheticOrganizationalKnowledgeGraph[] {
  return getInputArray(input.organizationalKnowledgeGraphs);
}

function getOrganizationalKnowledgePackages(input: BuildPortfolioKnowledgePackageInput): SyntheticOrganizationalKnowledgePackage[] {
  return getInputArray(input.organizationalKnowledgePackages);
}

function getHistoricalKnowledgePackages(input: BuildPortfolioKnowledgePackageInput): SyntheticHistoricalKnowledgePackage[] {
  return getInputArray(input.historicalKnowledgePackages);
}

function getHistoricalMethodologyPackages(input: BuildPortfolioKnowledgePackageInput): SyntheticHistoricalMethodologyPackage[] {
  return getInputArray(input.historicalMethodologyPackages);
}

function getAuditKnowledgePackages(input: BuildPortfolioKnowledgePackageInput): SyntheticAuditKnowledgePackage[] {
  return getInputArray(input.auditKnowledgePackages);
}

function getControllerKnowledgePackages(input: BuildPortfolioKnowledgePackageInput): SyntheticControllerKnowledgePackage[] {
  return getInputArray(input.controllerKnowledgePackages);
}

function getPortfolioMemoryPackages(input: BuildPortfolioKnowledgePackageInput): SyntheticPortfolioMemoryPackage[] {
  return getInputArray(input.portfolioMemoryPackages);
}

function getEnterpriseMemoryPackages(input: BuildPortfolioKnowledgePackageInput): SyntheticEnterpriseMemoryPackage[] {
  return getInputArray(input.enterpriseMemoryPackages);
}

function getOrganizationalMemoryGraphs(input: BuildPortfolioKnowledgePackageInput): SyntheticOrganizationalMemoryGraph[] {
  return getInputArray(input.organizationalMemoryGraphs);
}

function getOrganizationalMemoryPackages(input: BuildPortfolioKnowledgePackageInput): SyntheticOrganizationalMemoryPackage[] {
  return getInputArray(input.organizationalMemoryPackages);
}

function getSourceArtifacts(input: BuildPortfolioKnowledgePackageInput): PortfolioKnowledgeSourceArtifact[] {
  return [
    ...getEnterpriseKnowledgePackages(input),
    ...getCrossEntityKnowledgePackages(input),
    ...getCrossPeriodKnowledgePackages(input),
    ...getCrossFunctionKnowledgePackages(input),
    ...getOrganizationalKnowledgeGraphs(input),
    ...getOrganizationalKnowledgePackages(input),
    ...getHistoricalKnowledgePackages(input),
    ...getHistoricalMethodologyPackages(input),
    ...getAuditKnowledgePackages(input),
    ...getControllerKnowledgePackages(input),
    ...getPortfolioMemoryPackages(input),
    ...getEnterpriseMemoryPackages(input),
    ...getOrganizationalMemoryGraphs(input),
    ...getOrganizationalMemoryPackages(input),
  ];
}

function getPackageScope(input: BuildPortfolioKnowledgePackageInput): SyntheticAuditScope | null {
  return getSourceArtifacts(input)[0]?.scope ?? null;
}

function getPackageCustomerIsolation(input: BuildPortfolioKnowledgePackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.customerIsolation ?? null;
}

function getPackageFirmIsolation(input: BuildPortfolioKnowledgePackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.firmIsolation ?? null;
}

function getPackageClientIsolation(input: BuildPortfolioKnowledgePackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.clientIsolation ?? null;
}

function getEnterpriseKnowledgePackageIds(input: BuildPortfolioKnowledgePackageInput): string[] {
  return getEnterpriseKnowledgePackages(input).map((artifact) => artifact.enterpriseKnowledgePackageId).filter(hasValue);
}

function getCrossEntityKnowledgePackageIds(input: BuildPortfolioKnowledgePackageInput): string[] {
  return [
    ...getCrossEntityKnowledgePackages(input).map((artifact) => artifact.crossEntityKnowledgePackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "crossEntityKnowledgePackageIds")),
  ].filter(hasValue) as string[];
}

function getCrossPeriodKnowledgePackageIds(input: BuildPortfolioKnowledgePackageInput): string[] {
  return [
    ...getCrossPeriodKnowledgePackages(input).map((artifact) => artifact.crossPeriodKnowledgePackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "crossPeriodKnowledgePackageIds")),
  ].filter(hasValue) as string[];
}

function getCrossFunctionKnowledgePackageIds(input: BuildPortfolioKnowledgePackageInput): string[] {
  return [
    ...getCrossFunctionKnowledgePackages(input).map((artifact) => artifact.crossFunctionKnowledgePackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "crossFunctionKnowledgePackageIds")),
  ].filter(hasValue) as string[];
}

function getOrganizationalKnowledgeGraphIds(input: BuildPortfolioKnowledgePackageInput): string[] {
  return [
    ...getOrganizationalKnowledgeGraphs(input).map((artifact) => artifact.organizationalKnowledgeGraphId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalKnowledgeGraphIds")),
  ].filter(hasValue) as string[];
}

function getOrganizationalKnowledgePackageIds(input: BuildPortfolioKnowledgePackageInput): string[] {
  return [
    ...getOrganizationalKnowledgePackages(input).map((artifact) => artifact.organizationalKnowledgePackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalKnowledgePackageIds")),
  ].filter(hasValue) as string[];
}

function getHistoricalKnowledgePackageIds(input: BuildPortfolioKnowledgePackageInput): string[] {
  return [
    ...getHistoricalKnowledgePackages(input).map((artifact) => artifact.historicalKnowledgePackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "historicalKnowledgePackageIds")),
  ].filter(hasValue) as string[];
}

function getHistoricalMethodologyPackageIds(input: BuildPortfolioKnowledgePackageInput): string[] {
  return [
    ...getHistoricalMethodologyPackages(input).map((artifact) => artifact.historicalMethodologyPackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "historicalMethodologyPackageIds")),
  ].filter(hasValue) as string[];
}

function getAuditKnowledgePackageIds(input: BuildPortfolioKnowledgePackageInput): string[] {
  return getAuditKnowledgePackages(input).map((artifact) => artifact.auditKnowledgePackageId).filter(hasValue);
}

function getControllerKnowledgePackageIds(input: BuildPortfolioKnowledgePackageInput): string[] {
  return getControllerKnowledgePackages(input).map((artifact) => artifact.controllerKnowledgePackageId).filter(hasValue);
}

function getPortfolioMemoryPackageIds(input: BuildPortfolioKnowledgePackageInput): string[] {
  return getPortfolioMemoryPackages(input).map((artifact) => artifact.portfolioMemoryPackageId).filter(hasValue);
}

function getEnterpriseMemoryPackageIds(input: BuildPortfolioKnowledgePackageInput): string[] {
  return [
    ...getEnterpriseMemoryPackages(input).map((artifact) => artifact.enterpriseMemoryPackageId),
    ...getPortfolioMemoryPackages(input).flatMap((artifact) => artifact.enterpriseMemoryPackageIds),
  ].filter(hasValue) as string[];
}

function getOrganizationalMemoryGraphIds(input: BuildPortfolioKnowledgePackageInput): string[] {
  return [
    ...getOrganizationalMemoryGraphs(input).map((artifact) => artifact.organizationalMemoryGraphId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryGraphIds")),
  ].filter(hasValue) as string[];
}

function getOrganizationalMemoryPackageIds(input: BuildPortfolioKnowledgePackageInput): string[] {
  return [
    ...getOrganizationalMemoryPackages(input).map((artifact) => artifact.organizationalMemoryPackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryPackageIds")),
  ].filter(hasValue) as string[];
}

function getReferenceIds(input: BuildPortfolioKnowledgePackageInput, singularName: string, arrayName: string): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringProperty(artifact, singularName)),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, arrayName)),
  ].filter(hasValue) as string[];
}

function getSourceKnowledgeObjectIds(input: BuildPortfolioKnowledgePackageInput): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "knowledgeObjectIds")),
    ...getOrganizationalKnowledgeGraphs(input).flatMap((artifact) => artifact.knowledgeObjectIds),
    ...getEnterpriseKnowledgePackages(input).flatMap((artifact) => artifact.sourceKnowledgeObjectIds),
  ].filter(hasValue) as string[];
}

function getSourceMethodologyObjectIds(input: BuildPortfolioKnowledgePackageInput): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "methodologyObjectIds")),
    ...getOrganizationalKnowledgeGraphs(input).flatMap((artifact) => artifact.methodologyObjectIds),
    ...getEnterpriseKnowledgePackages(input).flatMap((artifact) => artifact.sourceMethodologyObjectIds),
  ].filter(hasValue) as string[];
}

function getSourceMemoryObjectIds(input: BuildPortfolioKnowledgePackageInput): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "memoryObjectIds")),
    ...getEnterpriseKnowledgePackages(input).flatMap((artifact) => artifact.sourceMemoryObjectIds),
  ].filter(hasValue) as string[];
}

function getSourceEvidenceLineageGraphIds(input: BuildPortfolioKnowledgePackageInput): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "evidenceLineageGraphIds")),
    ...getEnterpriseKnowledgePackages(input).flatMap((artifact) => artifact.sourceEvidenceLineageGraphIds),
  ].filter(hasValue) as string[];
}

function getDerivationLineageIds(input: BuildPortfolioKnowledgePackageInput): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "derivationLineageIds")),
    ...getEnterpriseKnowledgePackageIds(input),
    ...getCrossEntityKnowledgePackageIds(input),
    ...getCrossPeriodKnowledgePackageIds(input),
    ...getCrossFunctionKnowledgePackageIds(input),
    ...getOrganizationalKnowledgeGraphIds(input),
    ...getOrganizationalKnowledgePackageIds(input),
    ...getHistoricalKnowledgePackageIds(input),
    ...getHistoricalMethodologyPackageIds(input),
    ...getAuditKnowledgePackageIds(input),
    ...getControllerKnowledgePackageIds(input),
    ...getPortfolioMemoryPackageIds(input),
    ...getEnterpriseMemoryPackageIds(input),
    ...getOrganizationalMemoryGraphIds(input),
    ...getOrganizationalMemoryPackageIds(input),
  ];
}

function buildDerivationHash(input: BuildPortfolioKnowledgePackageInput): string {
  return stableSnapshotHash({
    packageCategory: input.packageCategory,
    derivationLineageIds: getDerivationLineageIds(input),
    enterpriseKnowledgePackageIds: getEnterpriseKnowledgePackageIds(input),
    portfolioMemoryPackageIds: getPortfolioMemoryPackageIds(input),
  });
}

function buildPortfolioKnowledgePackageKey(input: BuildPortfolioKnowledgePackageInput): string {
  const scope = getPackageScope(input);
  return stableSnapshotHash({
    packageCategory: input.packageCategory,
    companyId: scope?.companyId ?? null,
    scope,
    customerIsolation: getPackageCustomerIsolation(input),
    firmIsolation: getPackageFirmIsolation(input),
    clientIsolation: getPackageClientIsolation(input),
    enterpriseKnowledgePackageIds: getEnterpriseKnowledgePackageIds(input),
    crossEntityKnowledgePackageIds: getCrossEntityKnowledgePackageIds(input),
    crossPeriodKnowledgePackageIds: getCrossPeriodKnowledgePackageIds(input),
    crossFunctionKnowledgePackageIds: getCrossFunctionKnowledgePackageIds(input),
    organizationalKnowledgeGraphIds: getOrganizationalKnowledgeGraphIds(input),
    organizationalKnowledgePackageIds: getOrganizationalKnowledgePackageIds(input),
    historicalKnowledgePackageIds: getHistoricalKnowledgePackageIds(input),
    historicalMethodologyPackageIds: getHistoricalMethodologyPackageIds(input),
    auditKnowledgePackageIds: getAuditKnowledgePackageIds(input),
    controllerKnowledgePackageIds: getControllerKnowledgePackageIds(input),
    portfolioMemoryPackageIds: getPortfolioMemoryPackageIds(input),
    enterpriseMemoryPackageIds: getEnterpriseMemoryPackageIds(input),
    organizationalMemoryGraphIds: getOrganizationalMemoryGraphIds(input),
    organizationalMemoryPackageIds: getOrganizationalMemoryPackageIds(input),
  });
}

function buildPortfolioKnowledgePackageId(input: BuildPortfolioKnowledgePackageInput): string {
  return `synthetic-portfolio-knowledge-package:${stableSnapshotHash({
    portfolioKnowledgePackageKey: buildPortfolioKnowledgePackageKey(input),
    packageCategory: input.packageCategory,
    companyId: getPackageScope(input)?.companyId ?? null,
  })}`;
}

function buildKnowledgeGraphSnapshotHash(input: BuildPortfolioKnowledgePackageInput): string {
  return stableSnapshotHash({
    enterpriseKnowledgePackageIds: getEnterpriseKnowledgePackageIds(input),
    organizationalKnowledgeGraphIds: getOrganizationalKnowledgeGraphIds(input),
    sourceKnowledgeObjectIds: getSourceKnowledgeObjectIds(input),
  });
}

function buildMethodologySnapshotHash(input: BuildPortfolioKnowledgePackageInput): string {
  return stableSnapshotHash({
    historicalMethodologyPackageIds: getHistoricalMethodologyPackageIds(input),
    sourceMethodologyObjectIds: getSourceMethodologyObjectIds(input),
    methodologyAncestryIds: getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "methodologyAncestryIds")),
  });
}

function buildKnowledgePackageHandle(input: BuildPortfolioKnowledgePackageInput): string {
  return `phase38-knowledge-package:${stableSnapshotHash({
    portfolioKnowledgePackageKey: buildPortfolioKnowledgePackageKey(input),
    knowledgeGraphSnapshotHash: buildKnowledgeGraphSnapshotHash(input),
  })}`;
}

function buildMethodologyPackageHandle(input: BuildPortfolioKnowledgePackageInput): string {
  return `phase38-methodology-package:${stableSnapshotHash({
    portfolioKnowledgePackageKey: buildPortfolioKnowledgePackageKey(input),
    methodologySnapshotHash: buildMethodologySnapshotHash(input),
  })}`;
}

function getForwardCompatibilityWarnings(input: BuildPortfolioKnowledgePackageInput): string[] {
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

function validateInput(input: BuildPortfolioKnowledgePackageInput): string[] {
  const warnings: string[] = [];
  const sourceArtifacts = getSourceArtifacts(input);
  const scope = getPackageScope(input);
  const companyId = scope?.companyId;

  if (!hasValue(input.packageCategory)) warnings.push("packageCategory is required.");
  if (!isSupportedPackageCategory(input.packageCategory)) warnings.push("packageCategory must be supported.");
  if (sourceArtifacts.length === 0) warnings.push("at least one portfolio knowledge source artifact is required.");
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
    ["enterpriseKnowledgePackages", getEnterpriseKnowledgePackages(input), "enterpriseKnowledgePackageId", "enterpriseKnowledgePackageKey"],
    ["crossEntityKnowledgePackages", getCrossEntityKnowledgePackages(input), "crossEntityKnowledgePackageId", "crossEntityKnowledgePackageKey"],
    ["crossPeriodKnowledgePackages", getCrossPeriodKnowledgePackages(input), "crossPeriodKnowledgePackageId", "crossPeriodKnowledgePackageKey"],
    ["crossFunctionKnowledgePackages", getCrossFunctionKnowledgePackages(input), "crossFunctionKnowledgePackageId", "crossFunctionKnowledgePackageKey"],
    ["organizationalKnowledgeGraphs", getOrganizationalKnowledgeGraphs(input), "organizationalKnowledgeGraphId", "organizationalKnowledgeGraphKey"],
    ["organizationalKnowledgePackages", getOrganizationalKnowledgePackages(input), "organizationalKnowledgePackageId", "organizationalKnowledgePackageKey"],
    ["historicalKnowledgePackages", getHistoricalKnowledgePackages(input), "historicalKnowledgePackageId", "historicalKnowledgePackageKey"],
    ["historicalMethodologyPackages", getHistoricalMethodologyPackages(input), "historicalMethodologyPackageId", "historicalMethodologyPackageKey"],
    ["auditKnowledgePackages", getAuditKnowledgePackages(input), "auditKnowledgePackageId", "auditKnowledgePackageKey"],
    ["controllerKnowledgePackages", getControllerKnowledgePackages(input), "controllerKnowledgePackageId", "controllerKnowledgePackageKey"],
    ["portfolioMemoryPackages", getPortfolioMemoryPackages(input), "portfolioMemoryPackageId", "portfolioMemoryPackageKey"],
    ["enterpriseMemoryPackages", getEnterpriseMemoryPackages(input), "enterpriseMemoryPackageId", "enterpriseMemoryPackageKey"],
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

export function buildPortfolioKnowledgePackage(
  input: BuildPortfolioKnowledgePackageInput,
): BuildPortfolioKnowledgePackageResult {
  const fatalWarnings = validateInput(input);
  const scope = getPackageScope(input);
  const customerIsolation = getPackageCustomerIsolation(input);
  const firmIsolation = getPackageFirmIsolation(input);
  const clientIsolation = getPackageClientIsolation(input);

  if (fatalWarnings.length > 0 || !scope || !customerIsolation || !firmIsolation || !clientIsolation) {
    return {
      portfolioKnowledgePackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const sourceArtifacts = getSourceArtifacts(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    portfolioKnowledgePackage: {
      portfolioKnowledgePackageId: buildPortfolioKnowledgePackageId(input),
      portfolioKnowledgePackageKey: buildPortfolioKnowledgePackageKey(input),
      packageCategory: input.packageCategory,
      companyId: scope.companyId,
      scope,
      customerIsolation,
      firmIsolation,
      clientIsolation,
      enterpriseKnowledgePackageIds: getEnterpriseKnowledgePackageIds(input),
      crossEntityKnowledgePackageIds: getCrossEntityKnowledgePackageIds(input),
      crossPeriodKnowledgePackageIds: getCrossPeriodKnowledgePackageIds(input),
      crossFunctionKnowledgePackageIds: getCrossFunctionKnowledgePackageIds(input),
      organizationalKnowledgeGraphIds: getOrganizationalKnowledgeGraphIds(input),
      organizationalKnowledgePackageIds: getOrganizationalKnowledgePackageIds(input),
      historicalKnowledgePackageIds: getHistoricalKnowledgePackageIds(input),
      historicalMethodologyPackageIds: getHistoricalMethodologyPackageIds(input),
      auditKnowledgePackageIds: getAuditKnowledgePackageIds(input),
      controllerKnowledgePackageIds: getControllerKnowledgePackageIds(input),
      portfolioMemoryPackageIds: getPortfolioMemoryPackageIds(input),
      enterpriseMemoryPackageIds: getEnterpriseMemoryPackageIds(input),
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
      suggestedPersonaCategories: SYNTHETIC_PORTFOLIO_KNOWLEDGE_SUGGESTED_PERSONAS,
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
      enterpriseKnowledgePackages: getEnterpriseKnowledgePackages(input),
      crossEntityKnowledgePackages: getCrossEntityKnowledgePackages(input),
      crossPeriodKnowledgePackages: getCrossPeriodKnowledgePackages(input),
      crossFunctionKnowledgePackages: getCrossFunctionKnowledgePackages(input),
      organizationalKnowledgeGraphs: getOrganizationalKnowledgeGraphs(input),
      organizationalKnowledgePackages: getOrganizationalKnowledgePackages(input),
      historicalKnowledgePackages: getHistoricalKnowledgePackages(input),
      historicalMethodologyPackages: getHistoricalMethodologyPackages(input),
      auditKnowledgePackages: getAuditKnowledgePackages(input),
      controllerKnowledgePackages: getControllerKnowledgePackages(input),
      portfolioMemoryPackages: getPortfolioMemoryPackages(input),
      enterpriseMemoryPackages: getEnterpriseMemoryPackages(input),
      organizationalMemoryGraphs: getOrganizationalMemoryGraphs(input),
      organizationalMemoryPackages: getOrganizationalMemoryPackages(input),
      warnings,
    },
    skipped: false,
    warnings,
  };
}
