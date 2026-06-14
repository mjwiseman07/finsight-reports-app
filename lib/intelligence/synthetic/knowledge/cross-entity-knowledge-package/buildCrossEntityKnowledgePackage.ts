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
import type { SyntheticCrossEntityMemoryPackage } from "../../organizational-memory/cross-entity-memory-package";
import type { SyntheticEnterpriseMemoryPackage } from "../../organizational-memory/enterprise-memory-package";
import type { SyntheticMemoryObjectIsolationDimension } from "../../organizational-memory/memory-object";
import type { SyntheticOrganizationalMemoryGraph } from "../../organizational-memory/organizational-memory-graph";
import type { SyntheticPortfolioMemoryPackage } from "../../organizational-memory/portfolio-memory-package";

export type SyntheticCrossEntityKnowledgePackageCategory =
  | "cross_entity_knowledge_package"
  | "client_entity_knowledge_package"
  | "firm_entity_knowledge_package"
  | "business_unit_knowledge_package"
  | "organizational_scope_knowledge_package";

export const SYNTHETIC_CROSS_ENTITY_KNOWLEDGE_PACKAGE_CATEGORIES: SyntheticCrossEntityKnowledgePackageCategory[] = [
  "cross_entity_knowledge_package",
  "client_entity_knowledge_package",
  "firm_entity_knowledge_package",
  "business_unit_knowledge_package",
  "organizational_scope_knowledge_package",
];

export interface BuildCrossEntityKnowledgePackageInput {
  packageCategory: SyntheticCrossEntityKnowledgePackageCategory;
  crossScopeReference?: boolean;
  sourceCustomerIsolation?: SyntheticMemoryObjectIsolationDimension;
  sourceFirmIsolation?: SyntheticMemoryObjectIsolationDimension;
  sourceClientIsolation?: SyntheticMemoryObjectIsolationDimension;
  targetCustomerIsolation?: SyntheticMemoryObjectIsolationDimension;
  targetFirmIsolation?: SyntheticMemoryObjectIsolationDimension;
  targetClientIsolation?: SyntheticMemoryObjectIsolationDimension;
  organizationalKnowledgeGraphs?: SyntheticOrganizationalKnowledgeGraph[];
  crossPeriodKnowledgePackages?: SyntheticCrossPeriodKnowledgePackage[];
  historicalKnowledgePackages?: SyntheticHistoricalKnowledgePackage[];
  historicalMethodologyPackages?: SyntheticHistoricalMethodologyPackage[];
  auditKnowledgePackages?: SyntheticAuditKnowledgePackage[];
  controllerKnowledgePackages?: SyntheticControllerKnowledgePackage[];
  organizationalKnowledgePackages?: SyntheticOrganizationalKnowledgePackage[];
  crossEntityMemoryPackages?: SyntheticCrossEntityMemoryPackage[];
  portfolioMemoryPackages?: SyntheticPortfolioMemoryPackage[];
  enterpriseMemoryPackages?: SyntheticEnterpriseMemoryPackage[];
  organizationalMemoryGraphs?: SyntheticOrganizationalMemoryGraph[];
  entityReferenceIds?: string[];
  sourceEntityReferenceIds?: string[];
  targetEntityReferenceIds?: string[];
  entityLineageReferenceIds?: string[];
  clientReferenceIds?: string[];
  sourceClientReferenceIds?: string[];
  targetClientReferenceIds?: string[];
  firmReferenceIds?: string[];
  healthcarePpdObservationIds?: string[];
  payrollObservationIds?: string[];
  methodologyObservationIds?: string[];
}

export interface SyntheticCrossEntityKnowledgePackage {
  crossEntityKnowledgePackageId: string;
  crossEntityKnowledgePackageKey: string;
  packageCategory: SyntheticCrossEntityKnowledgePackageCategory;
  companyId: string;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  crossScopeReference: boolean;
  sourceCustomerIsolation: SyntheticMemoryObjectIsolationDimension;
  sourceFirmIsolation: SyntheticMemoryObjectIsolationDimension;
  sourceClientIsolation: SyntheticMemoryObjectIsolationDimension;
  targetCustomerIsolation: SyntheticMemoryObjectIsolationDimension;
  targetFirmIsolation: SyntheticMemoryObjectIsolationDimension;
  targetClientIsolation: SyntheticMemoryObjectIsolationDimension;
  entityReferenceIds: string[];
  sourceEntityReferenceIds: string[];
  targetEntityReferenceIds: string[];
  entityLineageReferenceIds: string[];
  clientReferenceIds: string[];
  sourceClientReferenceIds: string[];
  targetClientReferenceIds: string[];
  firmReferenceIds: string[];
  organizationalKnowledgeGraphIds: string[];
  crossPeriodKnowledgePackageIds: string[];
  historicalKnowledgePackageIds: string[];
  historicalMethodologyPackageIds: string[];
  auditKnowledgePackageIds: string[];
  controllerKnowledgePackageIds: string[];
  crossEntityMemoryPackageIds: string[];
  portfolioMemoryPackageIds: string[];
  enterpriseMemoryPackageIds: string[];
  organizationalMemoryGraphIds: string[];
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
  organizationalKnowledgeGraphs: SyntheticOrganizationalKnowledgeGraph[];
  crossPeriodKnowledgePackages: SyntheticCrossPeriodKnowledgePackage[];
  historicalKnowledgePackages: SyntheticHistoricalKnowledgePackage[];
  historicalMethodologyPackages: SyntheticHistoricalMethodologyPackage[];
  auditKnowledgePackages: SyntheticAuditKnowledgePackage[];
  controllerKnowledgePackages: SyntheticControllerKnowledgePackage[];
  organizationalKnowledgePackages: SyntheticOrganizationalKnowledgePackage[];
  crossEntityMemoryPackages: SyntheticCrossEntityMemoryPackage[];
  portfolioMemoryPackages: SyntheticPortfolioMemoryPackage[];
  enterpriseMemoryPackages: SyntheticEnterpriseMemoryPackage[];
  organizationalMemoryGraphs: SyntheticOrganizationalMemoryGraph[];
  warnings: string[];
}

export interface BuildCrossEntityKnowledgePackageResult {
  crossEntityKnowledgePackage: SyntheticCrossEntityKnowledgePackage | null;
  skipped: boolean;
  warnings: string[];
}

type CrossEntityKnowledgeSourceArtifact =
  | SyntheticOrganizationalKnowledgeGraph
  | SyntheticCrossPeriodKnowledgePackage
  | SyntheticHistoricalKnowledgePackage
  | SyntheticHistoricalMethodologyPackage
  | SyntheticAuditKnowledgePackage
  | SyntheticControllerKnowledgePackage
  | SyntheticOrganizationalKnowledgePackage
  | SyntheticCrossEntityMemoryPackage
  | SyntheticPortfolioMemoryPackage
  | SyntheticEnterpriseMemoryPackage
  | SyntheticOrganizationalMemoryGraph;

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

function getBooleanProperty(value: object, propertyName: string): boolean | undefined {
  const property = (value as ReferenceRecord)[propertyName];
  return typeof property === "boolean" ? property : undefined;
}

function getIsolationProperty(value: object, propertyName: string): SyntheticMemoryObjectIsolationDimension | undefined {
  const property = (value as ReferenceRecord)[propertyName];
  return property && typeof property === "object" ? (property as SyntheticMemoryObjectIsolationDimension) : undefined;
}

function areIsolationDimensionsEqual(
  sourceIsolation: SyntheticMemoryObjectIsolationDimension | null | undefined,
  targetIsolation: SyntheticMemoryObjectIsolationDimension | null | undefined,
): boolean {
  if (!sourceIsolation || !targetIsolation) return false;
  return stableSnapshotHash(sourceIsolation) === stableSnapshotHash(targetIsolation);
}

function isSupportedPackageCategory(packageCategory: SyntheticCrossEntityKnowledgePackageCategory): boolean {
  return SYNTHETIC_CROSS_ENTITY_KNOWLEDGE_PACKAGE_CATEGORIES.includes(packageCategory);
}

function getOrganizationalKnowledgeGraphs(input: BuildCrossEntityKnowledgePackageInput): SyntheticOrganizationalKnowledgeGraph[] {
  return getInputArray(input.organizationalKnowledgeGraphs);
}

function getCrossPeriodKnowledgePackages(input: BuildCrossEntityKnowledgePackageInput): SyntheticCrossPeriodKnowledgePackage[] {
  return getInputArray(input.crossPeriodKnowledgePackages);
}

function getHistoricalKnowledgePackages(input: BuildCrossEntityKnowledgePackageInput): SyntheticHistoricalKnowledgePackage[] {
  return getInputArray(input.historicalKnowledgePackages);
}

function getHistoricalMethodologyPackages(input: BuildCrossEntityKnowledgePackageInput): SyntheticHistoricalMethodologyPackage[] {
  return getInputArray(input.historicalMethodologyPackages);
}

function getAuditKnowledgePackages(input: BuildCrossEntityKnowledgePackageInput): SyntheticAuditKnowledgePackage[] {
  return getInputArray(input.auditKnowledgePackages);
}

function getControllerKnowledgePackages(input: BuildCrossEntityKnowledgePackageInput): SyntheticControllerKnowledgePackage[] {
  return getInputArray(input.controllerKnowledgePackages);
}

function getOrganizationalKnowledgePackages(input: BuildCrossEntityKnowledgePackageInput): SyntheticOrganizationalKnowledgePackage[] {
  return getInputArray(input.organizationalKnowledgePackages);
}

function getCrossEntityMemoryPackages(input: BuildCrossEntityKnowledgePackageInput): SyntheticCrossEntityMemoryPackage[] {
  return getInputArray(input.crossEntityMemoryPackages);
}

function getPortfolioMemoryPackages(input: BuildCrossEntityKnowledgePackageInput): SyntheticPortfolioMemoryPackage[] {
  return getInputArray(input.portfolioMemoryPackages);
}

function getEnterpriseMemoryPackages(input: BuildCrossEntityKnowledgePackageInput): SyntheticEnterpriseMemoryPackage[] {
  return getInputArray(input.enterpriseMemoryPackages);
}

function getOrganizationalMemoryGraphs(input: BuildCrossEntityKnowledgePackageInput): SyntheticOrganizationalMemoryGraph[] {
  return getInputArray(input.organizationalMemoryGraphs);
}

function getSourceArtifacts(input: BuildCrossEntityKnowledgePackageInput): CrossEntityKnowledgeSourceArtifact[] {
  return [
    ...getOrganizationalKnowledgeGraphs(input),
    ...getCrossPeriodKnowledgePackages(input),
    ...getHistoricalKnowledgePackages(input),
    ...getHistoricalMethodologyPackages(input),
    ...getAuditKnowledgePackages(input),
    ...getControllerKnowledgePackages(input),
    ...getOrganizationalKnowledgePackages(input),
    ...getCrossEntityMemoryPackages(input),
    ...getPortfolioMemoryPackages(input),
    ...getEnterpriseMemoryPackages(input),
    ...getOrganizationalMemoryGraphs(input),
  ];
}

function getPackageScope(input: BuildCrossEntityKnowledgePackageInput): SyntheticAuditScope | null {
  return getSourceArtifacts(input)[0]?.scope ?? null;
}

function getPackageCustomerIsolation(input: BuildCrossEntityKnowledgePackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.customerIsolation ?? null;
}

function getPackageFirmIsolation(input: BuildCrossEntityKnowledgePackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.firmIsolation ?? null;
}

function getPackageClientIsolation(input: BuildCrossEntityKnowledgePackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.clientIsolation ?? null;
}

function getSourceCustomerIsolation(input: BuildCrossEntityKnowledgePackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return (
    input.sourceCustomerIsolation ??
    getCrossEntityMemoryPackages(input)[0]?.sourceCustomerIsolation ??
    getPackageCustomerIsolation(input)
  );
}

function getSourceFirmIsolation(input: BuildCrossEntityKnowledgePackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return input.sourceFirmIsolation ?? getCrossEntityMemoryPackages(input)[0]?.sourceFirmIsolation ?? getPackageFirmIsolation(input);
}

function getSourceClientIsolation(input: BuildCrossEntityKnowledgePackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return input.sourceClientIsolation ?? getCrossEntityMemoryPackages(input)[0]?.sourceClientIsolation ?? getPackageClientIsolation(input);
}

function getTargetCustomerIsolation(input: BuildCrossEntityKnowledgePackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return (
    input.targetCustomerIsolation ??
    getCrossEntityMemoryPackages(input)[0]?.targetCustomerIsolation ??
    getPackageCustomerIsolation(input)
  );
}

function getTargetFirmIsolation(input: BuildCrossEntityKnowledgePackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return input.targetFirmIsolation ?? getCrossEntityMemoryPackages(input)[0]?.targetFirmIsolation ?? getPackageFirmIsolation(input);
}

function getTargetClientIsolation(input: BuildCrossEntityKnowledgePackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return input.targetClientIsolation ?? getCrossEntityMemoryPackages(input)[0]?.targetClientIsolation ?? getPackageClientIsolation(input);
}

function getCrossScopeReference(input: BuildCrossEntityKnowledgePackageInput): boolean | null {
  return input.crossScopeReference ?? getCrossEntityMemoryPackages(input).map((artifact) => artifact.crossScopeReference)[0] ?? null;
}

function hasCrossScopeSourceIsolation(input: BuildCrossEntityKnowledgePackageInput): boolean {
  const crossEntityMemoryPackage = getCrossEntityMemoryPackages(input)[0];
  return Boolean(
    (input.sourceCustomerIsolation || crossEntityMemoryPackage?.sourceCustomerIsolation) &&
      (input.sourceFirmIsolation || crossEntityMemoryPackage?.sourceFirmIsolation) &&
      (input.sourceClientIsolation || crossEntityMemoryPackage?.sourceClientIsolation),
  );
}

function hasCrossScopeTargetIsolation(input: BuildCrossEntityKnowledgePackageInput): boolean {
  const crossEntityMemoryPackage = getCrossEntityMemoryPackages(input)[0];
  return Boolean(
    (input.targetCustomerIsolation || crossEntityMemoryPackage?.targetCustomerIsolation) &&
      (input.targetFirmIsolation || crossEntityMemoryPackage?.targetFirmIsolation) &&
      (input.targetClientIsolation || crossEntityMemoryPackage?.targetClientIsolation),
  );
}

function hasCrossScopeIsolation(input: BuildCrossEntityKnowledgePackageInput): boolean {
  return (
    !areIsolationDimensionsEqual(getSourceCustomerIsolation(input), getTargetCustomerIsolation(input)) ||
    !areIsolationDimensionsEqual(getSourceFirmIsolation(input), getTargetFirmIsolation(input)) ||
    !areIsolationDimensionsEqual(getSourceClientIsolation(input), getTargetClientIsolation(input))
  );
}

function getPreservedReferenceIds(input: BuildCrossEntityKnowledgePackageInput, inputName: keyof BuildCrossEntityKnowledgePackageInput): string[] {
  const values = input[inputName];
  return Array.isArray(values) ? values.filter((value): value is string => typeof value === "string" && hasValue(value)) : [];
}

function getEntityReferenceIds(input: BuildCrossEntityKnowledgePackageInput): string[] {
  return [
    ...getPreservedReferenceIds(input, "entityReferenceIds"),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "entityReferenceIds")),
  ].filter(hasValue) as string[];
}

function getSourceEntityReferenceIds(input: BuildCrossEntityKnowledgePackageInput): string[] {
  return [
    ...getPreservedReferenceIds(input, "sourceEntityReferenceIds"),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "sourceEntityReferenceIds")),
  ].filter(hasValue) as string[];
}

function getTargetEntityReferenceIds(input: BuildCrossEntityKnowledgePackageInput): string[] {
  return [
    ...getPreservedReferenceIds(input, "targetEntityReferenceIds"),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "targetEntityReferenceIds")),
  ].filter(hasValue) as string[];
}

function getEntityLineageReferenceIds(input: BuildCrossEntityKnowledgePackageInput): string[] {
  return [
    ...getPreservedReferenceIds(input, "entityLineageReferenceIds"),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "entityLineageReferenceIds")),
  ].filter(hasValue) as string[];
}

function getClientReferenceIds(input: BuildCrossEntityKnowledgePackageInput): string[] {
  return [
    ...getPreservedReferenceIds(input, "clientReferenceIds"),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "clientReferenceIds")),
  ].filter(hasValue) as string[];
}

function getSourceClientReferenceIds(input: BuildCrossEntityKnowledgePackageInput): string[] {
  return [
    ...getPreservedReferenceIds(input, "sourceClientReferenceIds"),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "sourceClientReferenceIds")),
  ].filter(hasValue) as string[];
}

function getTargetClientReferenceIds(input: BuildCrossEntityKnowledgePackageInput): string[] {
  return [
    ...getPreservedReferenceIds(input, "targetClientReferenceIds"),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "targetClientReferenceIds")),
  ].filter(hasValue) as string[];
}

function getFirmReferenceIds(input: BuildCrossEntityKnowledgePackageInput): string[] {
  return [
    ...getPreservedReferenceIds(input, "firmReferenceIds"),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "firmReferenceIds")),
  ].filter(hasValue) as string[];
}

function getOrganizationalKnowledgeGraphIds(input: BuildCrossEntityKnowledgePackageInput): string[] {
  return [
    ...getOrganizationalKnowledgeGraphs(input).map((artifact) => artifact.organizationalKnowledgeGraphId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalKnowledgeGraphIds")),
  ].filter(hasValue) as string[];
}

function getCrossPeriodKnowledgePackageIds(input: BuildCrossEntityKnowledgePackageInput): string[] {
  return getCrossPeriodKnowledgePackages(input).map((artifact) => artifact.crossPeriodKnowledgePackageId).filter(hasValue);
}

function getHistoricalKnowledgePackageIds(input: BuildCrossEntityKnowledgePackageInput): string[] {
  return [
    ...getHistoricalKnowledgePackages(input).map((artifact) => artifact.historicalKnowledgePackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "historicalKnowledgePackageIds")),
  ].filter(hasValue) as string[];
}

function getHistoricalMethodologyPackageIds(input: BuildCrossEntityKnowledgePackageInput): string[] {
  return [
    ...getHistoricalMethodologyPackages(input).map((artifact) => artifact.historicalMethodologyPackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "historicalMethodologyPackageIds")),
  ].filter(hasValue) as string[];
}

function getAuditKnowledgePackageIds(input: BuildCrossEntityKnowledgePackageInput): string[] {
  return getAuditKnowledgePackages(input).map((artifact) => artifact.auditKnowledgePackageId).filter(hasValue);
}

function getControllerKnowledgePackageIds(input: BuildCrossEntityKnowledgePackageInput): string[] {
  return getControllerKnowledgePackages(input).map((artifact) => artifact.controllerKnowledgePackageId).filter(hasValue);
}

function getCrossEntityMemoryPackageIds(input: BuildCrossEntityKnowledgePackageInput): string[] {
  return [
    ...getCrossEntityMemoryPackages(input).map((artifact) => artifact.crossEntityMemoryPackageId),
    ...getPortfolioMemoryPackages(input).flatMap((artifact) => artifact.crossEntityMemoryPackageIds),
    ...getEnterpriseMemoryPackages(input).flatMap((artifact) => artifact.crossEntityMemoryPackageIds),
  ].filter(hasValue) as string[];
}

function getPortfolioMemoryPackageIds(input: BuildCrossEntityKnowledgePackageInput): string[] {
  return getPortfolioMemoryPackages(input).map((artifact) => artifact.portfolioMemoryPackageId).filter(hasValue);
}

function getEnterpriseMemoryPackageIds(input: BuildCrossEntityKnowledgePackageInput): string[] {
  return [
    ...getEnterpriseMemoryPackages(input).map((artifact) => artifact.enterpriseMemoryPackageId),
    ...getPortfolioMemoryPackages(input).flatMap((artifact) => artifact.enterpriseMemoryPackageIds),
  ].filter(hasValue) as string[];
}

function getOrganizationalMemoryGraphIds(input: BuildCrossEntityKnowledgePackageInput): string[] {
  return [
    ...getOrganizationalMemoryGraphs(input).map((artifact) => artifact.organizationalMemoryGraphId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryGraphIds")),
  ].filter(hasValue) as string[];
}

function getReferenceIds(input: BuildCrossEntityKnowledgePackageInput, singularName: string, arrayName: string): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringProperty(artifact, singularName)),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, arrayName)),
  ].filter(hasValue) as string[];
}

function getDerivationLineageIds(input: BuildCrossEntityKnowledgePackageInput): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "derivationLineageIds")),
    ...getEntityReferenceIds(input),
    ...getSourceEntityReferenceIds(input),
    ...getTargetEntityReferenceIds(input),
    ...getEntityLineageReferenceIds(input),
    ...getClientReferenceIds(input),
    ...getSourceClientReferenceIds(input),
    ...getTargetClientReferenceIds(input),
    ...getFirmReferenceIds(input),
    ...getOrganizationalKnowledgeGraphIds(input),
    ...getCrossPeriodKnowledgePackageIds(input),
    ...getHistoricalKnowledgePackageIds(input),
    ...getHistoricalMethodologyPackageIds(input),
    ...getAuditKnowledgePackageIds(input),
    ...getControllerKnowledgePackageIds(input),
    ...getCrossEntityMemoryPackageIds(input),
    ...getPortfolioMemoryPackageIds(input),
    ...getEnterpriseMemoryPackageIds(input),
    ...getOrganizationalMemoryGraphIds(input),
  ];
}

function buildDerivationHash(input: BuildCrossEntityKnowledgePackageInput): string {
  return stableSnapshotHash({
    packageCategory: input.packageCategory,
    derivationLineageIds: getDerivationLineageIds(input),
    entityReferenceIds: getEntityReferenceIds(input),
    sourceEntityReferenceIds: getSourceEntityReferenceIds(input),
    targetEntityReferenceIds: getTargetEntityReferenceIds(input),
    entityLineageReferenceIds: getEntityLineageReferenceIds(input),
  });
}

function buildCrossEntityKnowledgePackageKey(input: BuildCrossEntityKnowledgePackageInput): string {
  const scope = getPackageScope(input);
  return stableSnapshotHash({
    packageCategory: input.packageCategory,
    companyId: scope?.companyId ?? null,
    scope,
    customerIsolation: getPackageCustomerIsolation(input),
    firmIsolation: getPackageFirmIsolation(input),
    clientIsolation: getPackageClientIsolation(input),
    crossScopeReference: getCrossScopeReference(input),
    entityReferenceIds: getEntityReferenceIds(input),
    sourceEntityReferenceIds: getSourceEntityReferenceIds(input),
    targetEntityReferenceIds: getTargetEntityReferenceIds(input),
    entityLineageReferenceIds: getEntityLineageReferenceIds(input),
    clientReferenceIds: getClientReferenceIds(input),
    sourceClientReferenceIds: getSourceClientReferenceIds(input),
    targetClientReferenceIds: getTargetClientReferenceIds(input),
    firmReferenceIds: getFirmReferenceIds(input),
    organizationalKnowledgeGraphIds: getOrganizationalKnowledgeGraphIds(input),
    crossPeriodKnowledgePackageIds: getCrossPeriodKnowledgePackageIds(input),
    historicalKnowledgePackageIds: getHistoricalKnowledgePackageIds(input),
    historicalMethodologyPackageIds: getHistoricalMethodologyPackageIds(input),
    auditKnowledgePackageIds: getAuditKnowledgePackageIds(input),
    controllerKnowledgePackageIds: getControllerKnowledgePackageIds(input),
    crossEntityMemoryPackageIds: getCrossEntityMemoryPackageIds(input),
    portfolioMemoryPackageIds: getPortfolioMemoryPackageIds(input),
    enterpriseMemoryPackageIds: getEnterpriseMemoryPackageIds(input),
    organizationalMemoryGraphIds: getOrganizationalMemoryGraphIds(input),
  });
}

function buildCrossEntityKnowledgePackageId(input: BuildCrossEntityKnowledgePackageInput): string {
  return `synthetic-cross-entity-knowledge-package:${stableSnapshotHash({
    crossEntityKnowledgePackageKey: buildCrossEntityKnowledgePackageKey(input),
    packageCategory: input.packageCategory,
    companyId: getPackageScope(input)?.companyId ?? null,
  })}`;
}

function getForwardCompatibilityWarnings(input: BuildCrossEntityKnowledgePackageInput): string[] {
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

function validateInput(input: BuildCrossEntityKnowledgePackageInput): string[] {
  const warnings: string[] = [];
  const sourceArtifacts = getSourceArtifacts(input);
  const scope = getPackageScope(input);
  const companyId = scope?.companyId;
  const crossScopeReference = getCrossScopeReference(input);
  const sourceCustomerIsolation = getSourceCustomerIsolation(input);
  const sourceFirmIsolation = getSourceFirmIsolation(input);
  const sourceClientIsolation = getSourceClientIsolation(input);
  const targetCustomerIsolation = getTargetCustomerIsolation(input);
  const targetFirmIsolation = getTargetFirmIsolation(input);
  const targetClientIsolation = getTargetClientIsolation(input);

  if (!hasValue(input.packageCategory)) warnings.push("packageCategory is required.");
  if (!isSupportedPackageCategory(input.packageCategory)) warnings.push("packageCategory must be supported.");
  if (sourceArtifacts.length === 0) warnings.push("at least one cross-entity knowledge source artifact is required.");
  if (!scope) warnings.push("source scope is required.");
  if (!companyId) warnings.push("source companyId is required.");
  if (!getPackageCustomerIsolation(input)) warnings.push("customerIsolation is required.");
  if (!getPackageFirmIsolation(input)) warnings.push("firmIsolation is required.");
  if (!getPackageClientIsolation(input)) warnings.push("clientIsolation is required.");
  if (crossScopeReference === null) warnings.push("crossScopeReference is required.");
  if (!sourceCustomerIsolation) warnings.push("sourceCustomerIsolation is required.");
  if (!sourceFirmIsolation) warnings.push("sourceFirmIsolation is required.");
  if (!sourceClientIsolation) warnings.push("sourceClientIsolation is required.");
  if (!targetCustomerIsolation) warnings.push("targetCustomerIsolation is required.");
  if (!targetFirmIsolation) warnings.push("targetFirmIsolation is required.");
  if (!targetClientIsolation) warnings.push("targetClientIsolation is required.");
  if (crossScopeReference === true && !hasCrossScopeSourceIsolation(input)) warnings.push("cross-scope source isolation is required.");
  if (crossScopeReference === true && !hasCrossScopeTargetIsolation(input)) warnings.push("cross-scope target isolation is required.");
  if (hasCrossScopeIsolation(input) && crossScopeReference !== true) warnings.push("crossScopeReference must be true for cross-scope isolation.");

  sourceArtifacts.forEach((artifact, index) => {
    if (!hasValue(artifact.companyId)) warnings.push(`sourceArtifacts[${index}].companyId is required.`);
    if (companyId && artifact.companyId !== companyId) warnings.push(`sourceArtifacts[${index}].companyId must equal source companyId.`);
  });

  getSourceArtifacts(input).forEach((artifact, index) => {
    const artifactCrossScopeReference = getBooleanProperty(artifact, "crossScopeReference");
    const artifactSourceCustomerIsolation = getIsolationProperty(artifact, "sourceCustomerIsolation");
    const artifactSourceFirmIsolation = getIsolationProperty(artifact, "sourceFirmIsolation");
    const artifactSourceClientIsolation = getIsolationProperty(artifact, "sourceClientIsolation");
    const artifactTargetCustomerIsolation = getIsolationProperty(artifact, "targetCustomerIsolation");
    const artifactTargetFirmIsolation = getIsolationProperty(artifact, "targetFirmIsolation");
    const artifactTargetClientIsolation = getIsolationProperty(artifact, "targetClientIsolation");

    if (artifactCrossScopeReference === true) {
      if (!artifactSourceCustomerIsolation) warnings.push(`sourceArtifacts[${index}].sourceCustomerIsolation is required.`);
      if (!artifactSourceFirmIsolation) warnings.push(`sourceArtifacts[${index}].sourceFirmIsolation is required.`);
      if (!artifactSourceClientIsolation) warnings.push(`sourceArtifacts[${index}].sourceClientIsolation is required.`);
      if (!artifactTargetCustomerIsolation) warnings.push(`sourceArtifacts[${index}].targetCustomerIsolation is required.`);
      if (!artifactTargetFirmIsolation) warnings.push(`sourceArtifacts[${index}].targetFirmIsolation is required.`);
      if (!artifactTargetClientIsolation) warnings.push(`sourceArtifacts[${index}].targetClientIsolation is required.`);
    }
  });

  for (const [inputName, values, idName, keyName] of [
    ["organizationalKnowledgeGraphs", getOrganizationalKnowledgeGraphs(input), "organizationalKnowledgeGraphId", "organizationalKnowledgeGraphKey"],
    ["crossPeriodKnowledgePackages", getCrossPeriodKnowledgePackages(input), "crossPeriodKnowledgePackageId", "crossPeriodKnowledgePackageKey"],
    ["historicalKnowledgePackages", getHistoricalKnowledgePackages(input), "historicalKnowledgePackageId", "historicalKnowledgePackageKey"],
    ["historicalMethodologyPackages", getHistoricalMethodologyPackages(input), "historicalMethodologyPackageId", "historicalMethodologyPackageKey"],
    ["auditKnowledgePackages", getAuditKnowledgePackages(input), "auditKnowledgePackageId", "auditKnowledgePackageKey"],
    ["controllerKnowledgePackages", getControllerKnowledgePackages(input), "controllerKnowledgePackageId", "controllerKnowledgePackageKey"],
    ["organizationalKnowledgePackages", getOrganizationalKnowledgePackages(input), "organizationalKnowledgePackageId", "organizationalKnowledgePackageKey"],
    ["crossEntityMemoryPackages", getCrossEntityMemoryPackages(input), "crossEntityMemoryPackageId", "crossEntityMemoryPackageKey"],
    ["portfolioMemoryPackages", getPortfolioMemoryPackages(input), "portfolioMemoryPackageId", "portfolioMemoryPackageKey"],
    ["enterpriseMemoryPackages", getEnterpriseMemoryPackages(input), "enterpriseMemoryPackageId", "enterpriseMemoryPackageKey"],
    ["organizationalMemoryGraphs", getOrganizationalMemoryGraphs(input), "organizationalMemoryGraphId", "organizationalMemoryGraphKey"],
  ] as const) {
    values.forEach((artifact, index) => {
      if (!hasValue((artifact as unknown as ReferenceRecord)[idName])) warnings.push(`${inputName}[${index}].${idName} is required.`);
      if (!hasValue((artifact as unknown as ReferenceRecord)[keyName])) warnings.push(`${inputName}[${index}].${keyName} is required.`);
    });
  }

  return warnings;
}

export function buildCrossEntityKnowledgePackage(
  input: BuildCrossEntityKnowledgePackageInput,
): BuildCrossEntityKnowledgePackageResult {
  const fatalWarnings = validateInput(input);
  const scope = getPackageScope(input);
  const customerIsolation = getPackageCustomerIsolation(input);
  const firmIsolation = getPackageFirmIsolation(input);
  const clientIsolation = getPackageClientIsolation(input);
  const crossScopeReference = getCrossScopeReference(input);
  const sourceCustomerIsolation = getSourceCustomerIsolation(input);
  const sourceFirmIsolation = getSourceFirmIsolation(input);
  const sourceClientIsolation = getSourceClientIsolation(input);
  const targetCustomerIsolation = getTargetCustomerIsolation(input);
  const targetFirmIsolation = getTargetFirmIsolation(input);
  const targetClientIsolation = getTargetClientIsolation(input);

  if (
    fatalWarnings.length > 0 ||
    !scope ||
    !customerIsolation ||
    !firmIsolation ||
    !clientIsolation ||
    crossScopeReference === null ||
    !sourceCustomerIsolation ||
    !sourceFirmIsolation ||
    !sourceClientIsolation ||
    !targetCustomerIsolation ||
    !targetFirmIsolation ||
    !targetClientIsolation
  ) {
    return {
      crossEntityKnowledgePackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const sourceArtifacts = getSourceArtifacts(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    crossEntityKnowledgePackage: {
      crossEntityKnowledgePackageId: buildCrossEntityKnowledgePackageId(input),
      crossEntityKnowledgePackageKey: buildCrossEntityKnowledgePackageKey(input),
      packageCategory: input.packageCategory,
      companyId: scope.companyId,
      scope,
      customerIsolation,
      firmIsolation,
      clientIsolation,
      crossScopeReference,
      sourceCustomerIsolation,
      sourceFirmIsolation,
      sourceClientIsolation,
      targetCustomerIsolation,
      targetFirmIsolation,
      targetClientIsolation,
      entityReferenceIds: getEntityReferenceIds(input),
      sourceEntityReferenceIds: getSourceEntityReferenceIds(input),
      targetEntityReferenceIds: getTargetEntityReferenceIds(input),
      entityLineageReferenceIds: getEntityLineageReferenceIds(input),
      clientReferenceIds: getClientReferenceIds(input),
      sourceClientReferenceIds: getSourceClientReferenceIds(input),
      targetClientReferenceIds: getTargetClientReferenceIds(input),
      firmReferenceIds: getFirmReferenceIds(input),
      organizationalKnowledgeGraphIds: getOrganizationalKnowledgeGraphIds(input),
      crossPeriodKnowledgePackageIds: getCrossPeriodKnowledgePackageIds(input),
      historicalKnowledgePackageIds: getHistoricalKnowledgePackageIds(input),
      historicalMethodologyPackageIds: getHistoricalMethodologyPackageIds(input),
      auditKnowledgePackageIds: getAuditKnowledgePackageIds(input),
      controllerKnowledgePackageIds: getControllerKnowledgePackageIds(input),
      crossEntityMemoryPackageIds: getCrossEntityMemoryPackageIds(input),
      portfolioMemoryPackageIds: getPortfolioMemoryPackageIds(input),
      enterpriseMemoryPackageIds: getEnterpriseMemoryPackageIds(input),
      organizationalMemoryGraphIds: getOrganizationalMemoryGraphIds(input),
      derivationLineageIds: getDerivationLineageIds(input),
      derivationMethod: "relationship_preservation",
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
      executable: false,
      actionReady: false,
      workflowReady: false,
      phase38Required: true,
      organizationalKnowledgeGraphs: getOrganizationalKnowledgeGraphs(input),
      crossPeriodKnowledgePackages: getCrossPeriodKnowledgePackages(input),
      historicalKnowledgePackages: getHistoricalKnowledgePackages(input),
      historicalMethodologyPackages: getHistoricalMethodologyPackages(input),
      auditKnowledgePackages: getAuditKnowledgePackages(input),
      controllerKnowledgePackages: getControllerKnowledgePackages(input),
      organizationalKnowledgePackages: getOrganizationalKnowledgePackages(input),
      crossEntityMemoryPackages: getCrossEntityMemoryPackages(input),
      portfolioMemoryPackages: getPortfolioMemoryPackages(input),
      enterpriseMemoryPackages: getEnterpriseMemoryPackages(input),
      organizationalMemoryGraphs: getOrganizationalMemoryGraphs(input),
      warnings,
    },
    skipped: false,
    warnings,
  };
}
