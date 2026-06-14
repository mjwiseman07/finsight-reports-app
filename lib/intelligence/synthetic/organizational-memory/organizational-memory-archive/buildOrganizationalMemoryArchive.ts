import { stableSnapshotHash } from "../../../core/hash";
import type { SyntheticCrossEntityMemoryPackage } from "../cross-entity-memory-package";
import type { SyntheticCrossFunctionMemoryPackage } from "../cross-function-memory-package";
import type { SyntheticCrossPeriodMemoryPackage } from "../cross-period-memory-package";
import type { SyntheticEvidenceLineageGraph } from "../evidence-lineage-graph";
import type { SyntheticEnterpriseMemoryPackage } from "../enterprise-memory-package";
import type { SyntheticHistoricalAuditPackage } from "../historical-audit-package";
import type { SyntheticHistoricalControllerPackage } from "../historical-controller-package";
import type { SyntheticHistoricalDecisionPackage } from "../historical-decision-package";
import type { SyntheticHistoricalOutcomePackage } from "../historical-outcome-package";
import type { SyntheticMemoryObject, SyntheticMemoryObjectIsolationDimension, SyntheticMemoryObjectSourceArtifact } from "../memory-object";
import type { SyntheticMemoryRelationship } from "../memory-relationship";
import type { SyntheticOrganizationalMemoryGraph } from "../organizational-memory-graph";
import type { SyntheticOrganizationalMemoryPackage } from "../organizational-memory-package";
import type { SyntheticPortfolioMemoryPackage } from "../portfolio-memory-package";
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

export type SyntheticOrganizationalMemoryArchiveCategory =
  | "organizational_memory_archive"
  | "enterprise_memory_archive"
  | "portfolio_memory_archive"
  | "historical_memory_archive"
  | "audit_memory_archive"
  | "controller_memory_archive";

export const SYNTHETIC_ORGANIZATIONAL_MEMORY_ARCHIVE_CATEGORIES: SyntheticOrganizationalMemoryArchiveCategory[] = [
  "organizational_memory_archive",
  "enterprise_memory_archive",
  "portfolio_memory_archive",
  "historical_memory_archive",
  "audit_memory_archive",
  "controller_memory_archive",
];

export type SyntheticOrganizationalMemoryArchiveStatus =
  | "archive_snapshot"
  | "archive_locked"
  | "archive_reference_only"
  | "archive_handoff_ready";

export const SYNTHETIC_ORGANIZATIONAL_MEMORY_ARCHIVE_STATUSES: SyntheticOrganizationalMemoryArchiveStatus[] = [
  "archive_snapshot",
  "archive_locked",
  "archive_reference_only",
  "archive_handoff_ready",
];

export type SyntheticOrganizationalMemoryArchiveSuggestedPersona =
  | "firm_admin"
  | "executive"
  | "cfo"
  | "controller"
  | "audit_partner";

export const SYNTHETIC_ORGANIZATIONAL_MEMORY_ARCHIVE_SUGGESTED_PERSONAS: SyntheticOrganizationalMemoryArchiveSuggestedPersona[] = [
  "firm_admin",
  "executive",
  "cfo",
  "controller",
  "audit_partner",
];

export type SyntheticOrganizationalMemoryArchiveMetadata = Record<string, unknown>;

export interface BuildOrganizationalMemoryArchiveInput {
  auditContract: SyntheticAuditContract | null;
  archiveCategory: SyntheticOrganizationalMemoryArchiveCategory;
  archiveStatus: SyntheticOrganizationalMemoryArchiveStatus;
  memoryObjects?: SyntheticMemoryObject[];
  memoryRelationships?: SyntheticMemoryRelationship[];
  evidenceLineageGraphs?: SyntheticEvidenceLineageGraph[];
  organizationalMemoryPackages?: SyntheticOrganizationalMemoryPackage[];
  organizationalMemoryGraphs?: SyntheticOrganizationalMemoryGraph[];
  historicalOutcomePackages?: SyntheticHistoricalOutcomePackage[];
  historicalDecisionPackages?: SyntheticHistoricalDecisionPackage[];
  historicalAuditPackages?: SyntheticHistoricalAuditPackage[];
  historicalControllerPackages?: SyntheticHistoricalControllerPackage[];
  crossPeriodMemoryPackages?: SyntheticCrossPeriodMemoryPackage[];
  crossEntityMemoryPackages?: SyntheticCrossEntityMemoryPackage[];
  crossFunctionMemoryPackages?: SyntheticCrossFunctionMemoryPackage[];
  enterpriseMemoryPackages?: SyntheticEnterpriseMemoryPackage[];
  portfolioMemoryPackages?: SyntheticPortfolioMemoryPackage[];
  archiveMetadata?: SyntheticOrganizationalMemoryArchiveMetadata[];
  archiveLineageMetadata?: SyntheticOrganizationalMemoryArchiveMetadata[];
  archiveGovernanceMetadata?: SyntheticOrganizationalMemoryArchiveMetadata[];
  healthcarePpdObservations?: SyntheticMemoryObjectSourceArtifact[];
  payrollObservations?: SyntheticMemoryObjectSourceArtifact[];
  methodologyObservations?: SyntheticMemoryObjectSourceArtifact[];
}

export interface SyntheticOrganizationalMemoryArchive {
  organizationalMemoryArchiveId: string;
  organizationalMemoryArchiveKey: string;
  archiveCategory: SyntheticOrganizationalMemoryArchiveCategory;
  archiveStatus: SyntheticOrganizationalMemoryArchiveStatus;
  companyId: string;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  memoryObjectIds: string[];
  memoryRelationshipIds: string[];
  evidenceLineageGraphIds: string[];
  organizationalMemoryPackageIds: string[];
  organizationalMemoryGraphIds: string[];
  historicalOutcomePackageIds: string[];
  historicalDecisionPackageIds: string[];
  historicalAuditPackageIds: string[];
  historicalControllerPackageIds: string[];
  crossPeriodMemoryPackageIds: string[];
  crossEntityMemoryPackageIds: string[];
  crossFunctionMemoryPackageIds: string[];
  enterpriseMemoryPackageIds: string[];
  portfolioMemoryPackageIds: string[];
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
  archiveMetadata: SyntheticOrganizationalMemoryArchiveMetadata[];
  archiveLineageMetadata: SyntheticOrganizationalMemoryArchiveMetadata[];
  archiveGovernanceMetadata: SyntheticOrganizationalMemoryArchiveMetadata[];
  suggestedPersonaCategories: SyntheticOrganizationalMemoryArchiveSuggestedPersona[];
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
  organizationalMemoryGraphs: SyntheticOrganizationalMemoryGraph[];
  historicalOutcomePackages: SyntheticHistoricalOutcomePackage[];
  historicalDecisionPackages: SyntheticHistoricalDecisionPackage[];
  historicalAuditPackages: SyntheticHistoricalAuditPackage[];
  historicalControllerPackages: SyntheticHistoricalControllerPackage[];
  crossPeriodMemoryPackages: SyntheticCrossPeriodMemoryPackage[];
  crossEntityMemoryPackages: SyntheticCrossEntityMemoryPackage[];
  crossFunctionMemoryPackages: SyntheticCrossFunctionMemoryPackage[];
  enterpriseMemoryPackages: SyntheticEnterpriseMemoryPackage[];
  portfolioMemoryPackages: SyntheticPortfolioMemoryPackage[];
  healthcarePpdObservations: SyntheticMemoryObjectSourceArtifact[];
  payrollObservations: SyntheticMemoryObjectSourceArtifact[];
  methodologyObservations: SyntheticMemoryObjectSourceArtifact[];
  warnings: string[];
}

export interface BuildOrganizationalMemoryArchiveResult {
  organizationalMemoryArchive: SyntheticOrganizationalMemoryArchive | null;
  skipped: boolean;
  warnings: string[];
}

type ArchiveReferenceArtifact =
  | SyntheticMemoryObject
  | SyntheticMemoryRelationship
  | SyntheticEvidenceLineageGraph
  | SyntheticOrganizationalMemoryPackage
  | SyntheticOrganizationalMemoryGraph
  | SyntheticCrossPeriodMemoryPackage
  | SyntheticCrossEntityMemoryPackage
  | SyntheticCrossFunctionMemoryPackage
  | SyntheticEnterpriseMemoryPackage
  | SyntheticPortfolioMemoryPackage;

type ArchiveHistoricalArtifact =
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

function isSupportedArchiveCategory(archiveCategory: SyntheticOrganizationalMemoryArchiveCategory): boolean {
  return SYNTHETIC_ORGANIZATIONAL_MEMORY_ARCHIVE_CATEGORIES.includes(archiveCategory);
}

function isSupportedArchiveStatus(archiveStatus: SyntheticOrganizationalMemoryArchiveStatus): boolean {
  return SYNTHETIC_ORGANIZATIONAL_MEMORY_ARCHIVE_STATUSES.includes(archiveStatus);
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

function getMemoryObjects(input: BuildOrganizationalMemoryArchiveInput): SyntheticMemoryObject[] {
  return getInputArray(input.memoryObjects);
}

function getMemoryRelationships(input: BuildOrganizationalMemoryArchiveInput): SyntheticMemoryRelationship[] {
  return getInputArray(input.memoryRelationships);
}

function getEvidenceLineageGraphs(input: BuildOrganizationalMemoryArchiveInput): SyntheticEvidenceLineageGraph[] {
  return getInputArray(input.evidenceLineageGraphs);
}

function getOrganizationalMemoryPackages(input: BuildOrganizationalMemoryArchiveInput): SyntheticOrganizationalMemoryPackage[] {
  return getInputArray(input.organizationalMemoryPackages);
}

function getOrganizationalMemoryGraphs(input: BuildOrganizationalMemoryArchiveInput): SyntheticOrganizationalMemoryGraph[] {
  return getInputArray(input.organizationalMemoryGraphs);
}

function getHistoricalOutcomePackages(input: BuildOrganizationalMemoryArchiveInput): SyntheticHistoricalOutcomePackage[] {
  return getInputArray(input.historicalOutcomePackages);
}

function getHistoricalDecisionPackages(input: BuildOrganizationalMemoryArchiveInput): SyntheticHistoricalDecisionPackage[] {
  return getInputArray(input.historicalDecisionPackages);
}

function getHistoricalAuditPackages(input: BuildOrganizationalMemoryArchiveInput): SyntheticHistoricalAuditPackage[] {
  return getInputArray(input.historicalAuditPackages);
}

function getHistoricalControllerPackages(input: BuildOrganizationalMemoryArchiveInput): SyntheticHistoricalControllerPackage[] {
  return getInputArray(input.historicalControllerPackages);
}

function getCrossPeriodMemoryPackages(input: BuildOrganizationalMemoryArchiveInput): SyntheticCrossPeriodMemoryPackage[] {
  return getInputArray(input.crossPeriodMemoryPackages);
}

function getCrossEntityMemoryPackages(input: BuildOrganizationalMemoryArchiveInput): SyntheticCrossEntityMemoryPackage[] {
  return getInputArray(input.crossEntityMemoryPackages);
}

function getCrossFunctionMemoryPackages(input: BuildOrganizationalMemoryArchiveInput): SyntheticCrossFunctionMemoryPackage[] {
  return getInputArray(input.crossFunctionMemoryPackages);
}

function getEnterpriseMemoryPackages(input: BuildOrganizationalMemoryArchiveInput): SyntheticEnterpriseMemoryPackage[] {
  return getInputArray(input.enterpriseMemoryPackages);
}

function getPortfolioMemoryPackages(input: BuildOrganizationalMemoryArchiveInput): SyntheticPortfolioMemoryPackage[] {
  return getInputArray(input.portfolioMemoryPackages);
}

function getReferenceArtifacts(input: BuildOrganizationalMemoryArchiveInput): ArchiveReferenceArtifact[] {
  return [
    ...getMemoryObjects(input),
    ...getMemoryRelationships(input),
    ...getEvidenceLineageGraphs(input),
    ...getOrganizationalMemoryPackages(input),
    ...getOrganizationalMemoryGraphs(input),
    ...getCrossPeriodMemoryPackages(input),
    ...getCrossEntityMemoryPackages(input),
    ...getCrossFunctionMemoryPackages(input),
    ...getEnterpriseMemoryPackages(input),
    ...getPortfolioMemoryPackages(input),
  ];
}

function getHistoricalArtifacts(input: BuildOrganizationalMemoryArchiveInput): ArchiveHistoricalArtifact[] {
  return [
    ...getHistoricalOutcomePackages(input),
    ...getHistoricalDecisionPackages(input),
    ...getHistoricalAuditPackages(input),
    ...getHistoricalControllerPackages(input),
  ];
}

function getAllArtifacts(input: BuildOrganizationalMemoryArchiveInput): Array<ArchiveReferenceArtifact | ArchiveHistoricalArtifact> {
  return [...getReferenceArtifacts(input), ...getHistoricalArtifacts(input)];
}

function getForwardCompatibleReferences(input: BuildOrganizationalMemoryArchiveInput): SyntheticMemoryObjectSourceArtifact[] {
  return [
    ...getInputArray(input.healthcarePpdObservations),
    ...getInputArray(input.payrollObservations),
    ...getInputArray(input.methodologyObservations),
  ];
}

function getReferenceIds(input: BuildOrganizationalMemoryArchiveInput, singularName: string, arrayName: string): string[] {
  return uniqueStable([
    ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) => [
      ...getStringProperty(referenceArtifact, singularName),
      ...getStringArrayProperty(referenceArtifact, arrayName),
    ]),
    ...getAllArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, singularName),
      ...getStringArrayProperty(artifact, arrayName),
    ]),
  ]);
}

function getMemoryObjectIds(input: BuildOrganizationalMemoryArchiveInput): string[] {
  return uniqueStable([
    ...getMemoryObjects(input).map((artifact) => artifact.memoryObjectId),
    ...getAllArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "memoryObjectIds")),
  ]);
}

function getMemoryRelationshipIds(input: BuildOrganizationalMemoryArchiveInput): string[] {
  return uniqueStable([
    ...getMemoryRelationships(input).map((artifact) => artifact.memoryRelationshipId),
    ...getAllArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "memoryRelationshipIds")),
  ]);
}

function getEvidenceLineageGraphIds(input: BuildOrganizationalMemoryArchiveInput): string[] {
  return uniqueStable([
    ...getEvidenceLineageGraphs(input).map((artifact) => artifact.evidenceLineageGraphId),
    ...getAllArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "evidenceLineageGraphIds")),
  ]);
}

function getOrganizationalMemoryPackageIds(input: BuildOrganizationalMemoryArchiveInput): string[] {
  return uniqueStable([
    ...getOrganizationalMemoryPackages(input).map((artifact) => artifact.organizationalMemoryPackageId),
    ...getAllArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryPackageIds")),
  ]);
}

function getOrganizationalMemoryGraphIds(input: BuildOrganizationalMemoryArchiveInput): string[] {
  return uniqueStable([
    ...getOrganizationalMemoryGraphs(input).map((artifact) => artifact.organizationalMemoryGraphId),
    ...getAllArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryGraphIds")),
  ]);
}

function getHistoricalOutcomePackageIds(input: BuildOrganizationalMemoryArchiveInput): string[] {
  return uniqueStable([
    ...getHistoricalOutcomePackages(input).map((artifact) => artifact.historicalOutcomePackageId),
    ...getAllArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "historicalOutcomePackageIds")),
  ]);
}

function getHistoricalDecisionPackageIds(input: BuildOrganizationalMemoryArchiveInput): string[] {
  return uniqueStable([
    ...getHistoricalDecisionPackages(input).map((artifact) => artifact.historicalDecisionPackageId),
    ...getAllArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "historicalDecisionPackageIds")),
  ]);
}

function getHistoricalAuditPackageIds(input: BuildOrganizationalMemoryArchiveInput): string[] {
  return uniqueStable([
    ...getHistoricalAuditPackages(input).map((artifact) => artifact.historicalAuditPackageId),
    ...getAllArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "historicalAuditPackageIds")),
  ]);
}

function getHistoricalControllerPackageIds(input: BuildOrganizationalMemoryArchiveInput): string[] {
  return uniqueStable([
    ...getHistoricalControllerPackages(input).map((artifact) => artifact.historicalControllerPackageId),
    ...getAllArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "historicalControllerPackageIds")),
  ]);
}

function getCrossPeriodMemoryPackageIds(input: BuildOrganizationalMemoryArchiveInput): string[] {
  return uniqueStable([
    ...getCrossPeriodMemoryPackages(input).map((artifact) => artifact.crossPeriodMemoryPackageId),
    ...getAllArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "crossPeriodMemoryPackageIds")),
  ]);
}

function getCrossEntityMemoryPackageIds(input: BuildOrganizationalMemoryArchiveInput): string[] {
  return uniqueStable([
    ...getCrossEntityMemoryPackages(input).map((artifact) => artifact.crossEntityMemoryPackageId),
    ...getAllArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "crossEntityMemoryPackageIds")),
  ]);
}

function getCrossFunctionMemoryPackageIds(input: BuildOrganizationalMemoryArchiveInput): string[] {
  return uniqueStable([
    ...getCrossFunctionMemoryPackages(input).map((artifact) => artifact.crossFunctionMemoryPackageId),
    ...getAllArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "crossFunctionMemoryPackageIds")),
  ]);
}

function getEnterpriseMemoryPackageIds(input: BuildOrganizationalMemoryArchiveInput): string[] {
  return uniqueStable([
    ...getEnterpriseMemoryPackages(input).map((artifact) => artifact.enterpriseMemoryPackageId),
    ...getAllArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "enterpriseMemoryPackageIds")),
  ]);
}

function getPortfolioMemoryPackageIds(input: BuildOrganizationalMemoryArchiveInput): string[] {
  return uniqueStable([
    ...getPortfolioMemoryPackages(input).map((artifact) => artifact.portfolioMemoryPackageId),
    ...getAllArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "portfolioMemoryPackageIds")),
  ]);
}

function getEvidenceReferenceIds(input: BuildOrganizationalMemoryArchiveInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.evidenceIds ?? []),
    ...getForwardCompatibleReferences(input).flatMap((artifact) => artifact.evidenceReferenceIds ?? []),
    ...getReferenceArtifacts(input).flatMap((artifact) => artifact.evidenceReferenceIds),
    ...getHistoricalOutcomePackages(input).flatMap((artifact) => artifact.outcomeEvidenceReferenceIds),
    ...getHistoricalDecisionPackages(input).flatMap((artifact) => artifact.decisionEvidenceReferenceIds),
    ...getHistoricalAuditPackages(input).flatMap((artifact) => artifact.auditEvidenceReferenceIds),
    ...getHistoricalControllerPackages(input).flatMap((artifact) => artifact.controllerEvidenceReferenceIds),
  ]);
}

function getSourceReferenceIds(input: BuildOrganizationalMemoryArchiveInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.sourceReferenceIds ?? []),
    ...getForwardCompatibleReferences(input).flatMap((artifact) => artifact.sourceReferenceIds ?? []),
    ...getReferenceArtifacts(input).flatMap((artifact) => artifact.sourceReferenceIds),
    ...getHistoricalOutcomePackages(input).flatMap((artifact) => artifact.outcomeSourceReferenceIds),
    ...getHistoricalDecisionPackages(input).flatMap((artifact) => artifact.decisionSourceReferenceIds),
    ...getHistoricalAuditPackages(input).flatMap((artifact) => artifact.auditSourceReferenceIds),
    ...getHistoricalControllerPackages(input).flatMap((artifact) => artifact.controllerSourceReferenceIds),
  ]);
}

function getLineageReferenceIds(input: BuildOrganizationalMemoryArchiveInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.lineageReferenceIds ?? []),
    ...getForwardCompatibleReferences(input).flatMap((artifact) => artifact.lineageReferenceIds ?? []),
    ...getReferenceArtifacts(input).flatMap((artifact) => artifact.lineageReferenceIds),
    ...getHistoricalOutcomePackages(input).flatMap((artifact) => artifact.outcomeLineageReferenceIds),
    ...getHistoricalDecisionPackages(input).flatMap((artifact) => artifact.decisionLineageReferenceIds),
    ...getHistoricalAuditPackages(input).flatMap((artifact) => artifact.auditLineageReferenceIds),
    ...getHistoricalControllerPackages(input).flatMap((artifact) => artifact.controllerLineageReferenceIds),
  ]);
}

function getUpstreamObservationIds(input: BuildOrganizationalMemoryArchiveInput): string[] {
  return uniqueStable([
    input.auditContract?.observationMetadata?.auditObservationId,
    ...(input.auditContract?.evidence.supportingObservationIds ?? []),
    ...getForwardCompatibleReferences(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "observationId"),
      ...(artifact.upstreamObservationIds ?? []),
    ]),
    ...getAllArtifacts(input).flatMap((artifact) => artifact.upstreamObservationIds),
  ].filter((value): value is string => value !== undefined));
}

function getUpstreamPackageIds(input: BuildOrganizationalMemoryArchiveInput): string[] {
  return uniqueStable([
    ...getForwardCompatibleReferences(input).flatMap((artifact) => [...getStringProperty(artifact, "packageId"), ...(artifact.upstreamPackageIds ?? [])]),
    ...getAllArtifacts(input).flatMap((artifact) => artifact.upstreamPackageIds),
  ]);
}

function getAuditContractReferenceIds(input: BuildOrganizationalMemoryArchiveInput): string[] {
  const auditContract = input.auditContract;
  return uniqueStable([
    auditContract?.observationMetadata?.auditObservationId,
    auditContract?.findingMetadata?.auditFindingId,
    auditContract?.exceptionMetadata?.auditExceptionId,
    auditContract?.riskMetadata?.auditRiskId,
    ...(auditContract?.evidence.sourceReferenceIds ?? []),
    ...(auditContract?.evidence.lineageReferenceIds ?? []),
    ...getForwardCompatibleReferences(input).flatMap((artifact) => artifact.auditContractReferenceIds ?? []),
    ...getAllArtifacts(input).flatMap((artifact) => artifact.auditContractReferenceIds),
  ].filter((value): value is string => value !== undefined));
}

function buildOrganizationalMemoryArchiveKey(input: BuildOrganizationalMemoryArchiveInput): string {
  const scope = input.auditContract?.scope;

  return stableSnapshotHash({
    archiveCategory: input.archiveCategory,
    archiveStatus: input.archiveStatus,
    companyId: scope?.companyId ?? null,
    scope: scope ?? null,
    customerIsolation: scope ? buildCustomerIsolation(scope) : null,
    firmIsolation: scope ? buildFirmIsolation(scope) : null,
    clientIsolation: scope ? buildClientIsolation(scope) : null,
    memoryObjectIds: getMemoryObjectIds(input),
    memoryRelationshipIds: getMemoryRelationshipIds(input),
    evidenceLineageGraphIds: getEvidenceLineageGraphIds(input),
    organizationalMemoryPackageIds: getOrganizationalMemoryPackageIds(input),
    organizationalMemoryGraphIds: getOrganizationalMemoryGraphIds(input),
    historicalOutcomePackageIds: getHistoricalOutcomePackageIds(input),
    historicalDecisionPackageIds: getHistoricalDecisionPackageIds(input),
    historicalAuditPackageIds: getHistoricalAuditPackageIds(input),
    historicalControllerPackageIds: getHistoricalControllerPackageIds(input),
    crossPeriodMemoryPackageIds: getCrossPeriodMemoryPackageIds(input),
    crossEntityMemoryPackageIds: getCrossEntityMemoryPackageIds(input),
    crossFunctionMemoryPackageIds: getCrossFunctionMemoryPackageIds(input),
    enterpriseMemoryPackageIds: getEnterpriseMemoryPackageIds(input),
    portfolioMemoryPackageIds: getPortfolioMemoryPackageIds(input),
  });
}

function buildOrganizationalMemoryArchiveId(input: BuildOrganizationalMemoryArchiveInput): string {
  return `synthetic-organizational-memory-archive:${stableSnapshotHash({
    organizationalMemoryArchiveKey: buildOrganizationalMemoryArchiveKey(input),
    archiveCategory: input.archiveCategory,
    archiveStatus: input.archiveStatus,
    companyId: input.auditContract?.scope.companyId ?? null,
  })}`;
}

function getMaterialityMetadata(input: BuildOrganizationalMemoryArchiveInput): SyntheticAuditMaterialityCompatibility[] {
  return compactDefined([
    input.auditContract?.materialityCompatibility,
    ...getForwardCompatibleReferences(input).flatMap((artifact) => [
      ...getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(artifact, "materialityMetadata"),
      ...getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(artifact, "materialityCompatibility"),
    ]),
    ...getAllArtifacts(input).flatMap((artifact) => [...artifact.materialityMetadata, ...artifact.materialityCompatibility]),
  ]);
}

function getForwardCompatibilityWarnings(input: BuildOrganizationalMemoryArchiveInput): string[] {
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

function validateInput(input: BuildOrganizationalMemoryArchiveInput): string[] {
  const warnings: string[] = [];
  const auditContract = input.auditContract;

  if (!auditContract) warnings.push("auditContract is required.");
  if (!auditContract) return warnings;

  if (!hasValue(input.archiveCategory)) warnings.push("archiveCategory is required.");
  if (hasValue(input.archiveCategory) && !isSupportedArchiveCategory(input.archiveCategory)) warnings.push("archiveCategory must be supported.");
  if (!hasValue(input.archiveStatus)) warnings.push("archiveStatus is required.");
  if (hasValue(input.archiveStatus) && !isSupportedArchiveStatus(input.archiveStatus)) warnings.push("archiveStatus must be supported.");
  if (!auditContract.scope) warnings.push("auditContract.scope is required.");
  if (!auditContract.evidence) warnings.push("auditContract.evidence is required.");
  if (!auditContract.scope || !auditContract.evidence) return warnings;

  if (!hasValue(auditContract.scope.companyId)) warnings.push("scope.companyId is required.");
  if (buildCustomerIsolation(auditContract.scope).referenceIds.length === 0) warnings.push("customerIsolation referenceIds are required.");
  if (buildFirmIsolation(auditContract.scope).referenceIds.length === 0) warnings.push("firmIsolation referenceIds are required.");

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
    ["memoryObjects", getMemoryObjects(input), "memoryObjectId", "memoryObjectKey"],
    ["memoryRelationships", getMemoryRelationships(input), "memoryRelationshipId", "memoryRelationshipKey"],
    ["evidenceLineageGraphs", getEvidenceLineageGraphs(input), "evidenceLineageGraphId", "evidenceLineageGraphKey"],
    ["organizationalMemoryPackages", getOrganizationalMemoryPackages(input), "organizationalMemoryPackageId", "organizationalMemoryPackageKey"],
    ["organizationalMemoryGraphs", getOrganizationalMemoryGraphs(input), "organizationalMemoryGraphId", "organizationalMemoryGraphKey"],
    ["historicalOutcomePackages", getHistoricalOutcomePackages(input), "historicalOutcomePackageId", "historicalOutcomePackageKey"],
    ["historicalDecisionPackages", getHistoricalDecisionPackages(input), "historicalDecisionPackageId", "historicalDecisionPackageKey"],
    ["historicalAuditPackages", getHistoricalAuditPackages(input), "historicalAuditPackageId", "historicalAuditPackageKey"],
    ["historicalControllerPackages", getHistoricalControllerPackages(input), "historicalControllerPackageId", "historicalControllerPackageKey"],
    ["crossPeriodMemoryPackages", getCrossPeriodMemoryPackages(input), "crossPeriodMemoryPackageId", "crossPeriodMemoryPackageKey"],
    ["crossEntityMemoryPackages", getCrossEntityMemoryPackages(input), "crossEntityMemoryPackageId", "crossEntityMemoryPackageKey"],
    ["crossFunctionMemoryPackages", getCrossFunctionMemoryPackages(input), "crossFunctionMemoryPackageId", "crossFunctionMemoryPackageKey"],
    ["enterpriseMemoryPackages", getEnterpriseMemoryPackages(input), "enterpriseMemoryPackageId", "enterpriseMemoryPackageKey"],
    ["portfolioMemoryPackages", getPortfolioMemoryPackages(input), "portfolioMemoryPackageId", "portfolioMemoryPackageKey"],
  ] as const) {
    values.forEach((artifact, index) => {
      if (!hasValue((artifact as unknown as Record<string, unknown>)[idName])) warnings.push(`${inputName}[${index}].${idName} is required.`);
      if (!hasValue((artifact as unknown as Record<string, unknown>)[keyName])) warnings.push(`${inputName}[${index}].${keyName} is required.`);
      if (artifact.companyId !== companyId) warnings.push(`${inputName}[${index}].companyId must equal scope.companyId.`);
    });
  }

  return warnings;
}

export function buildOrganizationalMemoryArchive(
  input: BuildOrganizationalMemoryArchiveInput,
): BuildOrganizationalMemoryArchiveResult {
  const fatalWarnings = validateInput(input);
  if (fatalWarnings.length > 0 || !input.auditContract) {
    return {
      organizationalMemoryArchive: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const auditContract = input.auditContract;
  const materialityMetadata = getMaterialityMetadata(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    organizationalMemoryArchive: {
      organizationalMemoryArchiveId: buildOrganizationalMemoryArchiveId(input),
      organizationalMemoryArchiveKey: buildOrganizationalMemoryArchiveKey(input),
      archiveCategory: input.archiveCategory,
      archiveStatus: input.archiveStatus,
      companyId: auditContract.scope.companyId,
      scope: auditContract.scope,
      customerIsolation: buildCustomerIsolation(auditContract.scope),
      firmIsolation: buildFirmIsolation(auditContract.scope),
      clientIsolation: buildClientIsolation(auditContract.scope),
      memoryObjectIds: getMemoryObjectIds(input),
      memoryRelationshipIds: getMemoryRelationshipIds(input),
      evidenceLineageGraphIds: getEvidenceLineageGraphIds(input),
      organizationalMemoryPackageIds: getOrganizationalMemoryPackageIds(input),
      organizationalMemoryGraphIds: getOrganizationalMemoryGraphIds(input),
      historicalOutcomePackageIds: getHistoricalOutcomePackageIds(input),
      historicalDecisionPackageIds: getHistoricalDecisionPackageIds(input),
      historicalAuditPackageIds: getHistoricalAuditPackageIds(input),
      historicalControllerPackageIds: getHistoricalControllerPackageIds(input),
      crossPeriodMemoryPackageIds: getCrossPeriodMemoryPackageIds(input),
      crossEntityMemoryPackageIds: getCrossEntityMemoryPackageIds(input),
      crossFunctionMemoryPackageIds: getCrossFunctionMemoryPackageIds(input),
      enterpriseMemoryPackageIds: getEnterpriseMemoryPackageIds(input),
      portfolioMemoryPackageIds: getPortfolioMemoryPackageIds(input),
      evidenceReferenceIds: getEvidenceReferenceIds(input),
      sourceReferenceIds: getSourceReferenceIds(input),
      lineageReferenceIds: getLineageReferenceIds(input),
      upstreamObservationIds: getUpstreamObservationIds(input),
      upstreamPackageIds: getUpstreamPackageIds(input),
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
      archiveMetadata: getInputArray(input.archiveMetadata),
      archiveLineageMetadata: getInputArray(input.archiveLineageMetadata),
      archiveGovernanceMetadata: getInputArray(input.archiveGovernanceMetadata),
      suggestedPersonaCategories: SYNTHETIC_ORGANIZATIONAL_MEMORY_ARCHIVE_SUGGESTED_PERSONAS,
      observationMetadata: compactDefined([
        auditContract.observationMetadata,
        ...getForwardCompatibleReferences(input).flatMap((artifact) =>
          getObjectArrayProperty<SyntheticAuditObservationMetadata>(artifact, "observationMetadata"),
        ),
        ...getAllArtifacts(input).flatMap((artifact) => artifact.observationMetadata),
      ]),
      findingMetadata: compactDefined([
        auditContract.findingMetadata,
        ...getForwardCompatibleReferences(input).flatMap((artifact) =>
          getObjectArrayProperty<SyntheticAuditFindingMetadata>(artifact, "findingMetadata"),
        ),
        ...getAllArtifacts(input).flatMap((artifact) => artifact.findingMetadata),
      ]),
      exceptionMetadata: compactDefined([
        auditContract.exceptionMetadata,
        ...getForwardCompatibleReferences(input).flatMap((artifact) =>
          getObjectArrayProperty<SyntheticAuditExceptionMetadata>(artifact, "exceptionMetadata"),
        ),
        ...getAllArtifacts(input).flatMap((artifact) => artifact.exceptionMetadata),
      ]),
      riskMetadata: compactDefined([
        auditContract.riskMetadata,
        ...getForwardCompatibleReferences(input).flatMap((artifact) =>
          getObjectArrayProperty<SyntheticAuditRiskMetadata>(artifact, "riskMetadata"),
        ),
        ...getAllArtifacts(input).flatMap((artifact) => artifact.riskMetadata),
      ]),
      trustMetadata: compactDefined([
        auditContract.trustMetadata,
        ...getForwardCompatibleReferences(input).flatMap((artifact) =>
          getObjectArrayProperty<SyntheticAuditTrustMetadata>(artifact, "trustMetadata"),
        ),
        ...getAllArtifacts(input).flatMap((artifact) => artifact.trustMetadata),
      ]),
      confidenceMetadata: compactDefined([
        auditContract.confidenceMetadata,
        ...getForwardCompatibleReferences(input).flatMap((artifact) =>
          getObjectArrayProperty<SyntheticAuditConfidenceMetadata>(artifact, "confidenceMetadata"),
        ),
        ...getAllArtifacts(input).flatMap((artifact) => artifact.confidenceMetadata),
      ]),
      governanceMetadata: compactDefined([
        auditContract.governanceMetadata,
        ...getForwardCompatibleReferences(input).flatMap((artifact) =>
          getObjectArrayProperty<SyntheticAuditGovernanceMetadata>(artifact, "governanceMetadata"),
        ),
        ...getAllArtifacts(input).flatMap((artifact) => artifact.governanceMetadata),
      ]),
      materialityMetadata,
      materialityCompatibility: materialityMetadata,
      personaCompatibility: compactDefined([
        auditContract.personaCompatibility,
        ...getForwardCompatibleReferences(input).flatMap((artifact) =>
          getObjectArrayProperty<SyntheticAuditPersonaCompatibility>(artifact, "personaCompatibility"),
        ),
        ...getAllArtifacts(input).flatMap((artifact) => artifact.personaCompatibility),
      ]),
      packageCompatibility: compactDefined([
        auditContract.packageCompatibility,
        ...getForwardCompatibleReferences(input).flatMap((artifact) =>
          getObjectArrayProperty<SyntheticAuditPackageCompatibility>(artifact, "packageCompatibility"),
        ),
        ...getAllArtifacts(input).flatMap((artifact) => artifact.packageCompatibility),
      ]),
      memoryCompatibility: compactDefined([
        auditContract.memoryCompatibility,
        ...getForwardCompatibleReferences(input).flatMap((artifact) =>
          getObjectArrayProperty<SyntheticAuditMemoryCompatibility>(artifact, "memoryCompatibility"),
        ),
        ...getAllArtifacts(input).flatMap((artifact) => artifact.memoryCompatibility),
      ]),
      learningCompatibility: compactDefined([
        auditContract.learningCompatibility,
        ...getForwardCompatibleReferences(input).flatMap((artifact) =>
          getObjectArrayProperty<SyntheticAuditLearningCompatibility>(artifact, "learningCompatibility"),
        ),
        ...getAllArtifacts(input).flatMap((artifact) => artifact.learningCompatibility),
      ]),
      surfaceCompatibility: compactDefined([
        auditContract.surfaceCompatibility,
        ...getForwardCompatibleReferences(input).flatMap((artifact) =>
          getObjectArrayProperty<SyntheticAuditSurfaceCompatibility>(artifact, "surfaceCompatibility"),
        ),
        ...getAllArtifacts(input).flatMap((artifact) => artifact.surfaceCompatibility),
      ]),
      memoryObjects: getMemoryObjects(input),
      memoryRelationships: getMemoryRelationships(input),
      evidenceLineageGraphs: getEvidenceLineageGraphs(input),
      organizationalMemoryPackages: getOrganizationalMemoryPackages(input),
      organizationalMemoryGraphs: getOrganizationalMemoryGraphs(input),
      historicalOutcomePackages: getHistoricalOutcomePackages(input),
      historicalDecisionPackages: getHistoricalDecisionPackages(input),
      historicalAuditPackages: getHistoricalAuditPackages(input),
      historicalControllerPackages: getHistoricalControllerPackages(input),
      crossPeriodMemoryPackages: getCrossPeriodMemoryPackages(input),
      crossEntityMemoryPackages: getCrossEntityMemoryPackages(input),
      crossFunctionMemoryPackages: getCrossFunctionMemoryPackages(input),
      enterpriseMemoryPackages: getEnterpriseMemoryPackages(input),
      portfolioMemoryPackages: getPortfolioMemoryPackages(input),
      healthcarePpdObservations: getInputArray(input.healthcarePpdObservations),
      payrollObservations: getInputArray(input.payrollObservations),
      methodologyObservations: getInputArray(input.methodologyObservations),
      warnings,
    },
    skipped: false,
    warnings,
  };
}
