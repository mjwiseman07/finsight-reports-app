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
import type { SyntheticOrganizationalMemoryArchive } from "../organizational-memory-archive";
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

export type SyntheticMemoryPreservationPackageCategory =
  | "memory_preservation_package"
  | "enterprise_memory_preservation_package"
  | "portfolio_memory_preservation_package"
  | "archive_memory_preservation_package"
  | "transition_memory_preservation_package"
  | "continuity_memory_preservation_package";

export const SYNTHETIC_MEMORY_PRESERVATION_PACKAGE_CATEGORIES: SyntheticMemoryPreservationPackageCategory[] = [
  "memory_preservation_package",
  "enterprise_memory_preservation_package",
  "portfolio_memory_preservation_package",
  "archive_memory_preservation_package",
  "transition_memory_preservation_package",
  "continuity_memory_preservation_package",
];

export type SyntheticMemoryPreservationCategory =
  | "organizational_change_continuity"
  | "entity_change_continuity"
  | "firm_client_transition_continuity"
  | "system_transition_continuity"
  | "staffing_transition_continuity"
  | "department_transition_continuity"
  | "fiscal_period_transition_continuity"
  | "archive_continuity";

export const SYNTHETIC_MEMORY_PRESERVATION_CATEGORIES: SyntheticMemoryPreservationCategory[] = [
  "organizational_change_continuity",
  "entity_change_continuity",
  "firm_client_transition_continuity",
  "system_transition_continuity",
  "staffing_transition_continuity",
  "department_transition_continuity",
  "fiscal_period_transition_continuity",
  "archive_continuity",
];

export type SyntheticMemoryPreservationSuggestedPersona = "firm_admin" | "executive" | "cfo" | "controller" | "audit_partner";

export const SYNTHETIC_MEMORY_PRESERVATION_SUGGESTED_PERSONAS: SyntheticMemoryPreservationSuggestedPersona[] = [
  "firm_admin",
  "executive",
  "cfo",
  "controller",
  "audit_partner",
];

export type SyntheticMemoryPreservationMetadata = Record<string, unknown>;

export interface BuildMemoryPreservationPackageInput {
  auditContract: SyntheticAuditContract | null;
  packageCategory: SyntheticMemoryPreservationPackageCategory;
  preservationCategory: SyntheticMemoryPreservationCategory;
  preservationReferenceIds?: string[];
  preservationLineageReferenceIds?: string[];
  continuityReferenceIds?: string[];
  continuityEventReferenceIds?: string[];
  acquisitionReferenceIds?: string[];
  entityChangeReferenceIds?: string[];
  firmClientTransitionReferenceIds?: string[];
  systemMigrationReferenceIds?: string[];
  staffingTurnoverReferenceIds?: string[];
  departmentRestructureReferenceIds?: string[];
  fiscalPeriodTransitionReferenceIds?: string[];
  archiveContinuityReferenceIds?: string[];
  enterpriseMemoryPackages?: SyntheticEnterpriseMemoryPackage[];
  portfolioMemoryPackages?: SyntheticPortfolioMemoryPackage[];
  organizationalMemoryArchives?: SyntheticOrganizationalMemoryArchive[];
  crossPeriodMemoryPackages?: SyntheticCrossPeriodMemoryPackage[];
  crossEntityMemoryPackages?: SyntheticCrossEntityMemoryPackage[];
  crossFunctionMemoryPackages?: SyntheticCrossFunctionMemoryPackage[];
  organizationalMemoryGraphs?: SyntheticOrganizationalMemoryGraph[];
  organizationalMemoryPackages?: SyntheticOrganizationalMemoryPackage[];
  memoryObjects?: SyntheticMemoryObject[];
  memoryRelationships?: SyntheticMemoryRelationship[];
  evidenceLineageGraphs?: SyntheticEvidenceLineageGraph[];
  historicalOutcomePackages?: SyntheticHistoricalOutcomePackage[];
  historicalDecisionPackages?: SyntheticHistoricalDecisionPackage[];
  historicalAuditPackages?: SyntheticHistoricalAuditPackage[];
  historicalControllerPackages?: SyntheticHistoricalControllerPackage[];
  preservationMetadata?: SyntheticMemoryPreservationMetadata[];
  continuityMetadata?: SyntheticMemoryPreservationMetadata[];
  preservationGovernanceMetadata?: SyntheticMemoryPreservationMetadata[];
  healthcarePpdObservations?: SyntheticMemoryObjectSourceArtifact[];
  payrollObservations?: SyntheticMemoryObjectSourceArtifact[];
  methodologyObservations?: SyntheticMemoryObjectSourceArtifact[];
}

export interface SyntheticMemoryPreservationPackage {
  memoryPreservationPackageId: string;
  memoryPreservationPackageKey: string;
  packageCategory: SyntheticMemoryPreservationPackageCategory;
  preservationCategory: SyntheticMemoryPreservationCategory;
  companyId: string;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  preservationReferenceIds: string[];
  preservationLineageReferenceIds: string[];
  continuityReferenceIds: string[];
  continuityEventReferenceIds: string[];
  acquisitionReferenceIds: string[];
  entityChangeReferenceIds: string[];
  firmClientTransitionReferenceIds: string[];
  systemMigrationReferenceIds: string[];
  staffingTurnoverReferenceIds: string[];
  departmentRestructureReferenceIds: string[];
  fiscalPeriodTransitionReferenceIds: string[];
  archiveContinuityReferenceIds: string[];
  enterpriseMemoryPackageIds: string[];
  portfolioMemoryPackageIds: string[];
  organizationalMemoryArchiveIds: string[];
  crossPeriodMemoryPackageIds: string[];
  crossEntityMemoryPackageIds: string[];
  crossFunctionMemoryPackageIds: string[];
  organizationalMemoryGraphIds: string[];
  organizationalMemoryPackageIds: string[];
  memoryObjectIds: string[];
  memoryRelationshipIds: string[];
  evidenceLineageGraphIds: string[];
  historicalOutcomePackageIds: string[];
  historicalDecisionPackageIds: string[];
  historicalAuditPackageIds: string[];
  historicalControllerPackageIds: string[];
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
  preservationMetadata: SyntheticMemoryPreservationMetadata[];
  continuityMetadata: SyntheticMemoryPreservationMetadata[];
  preservationGovernanceMetadata: SyntheticMemoryPreservationMetadata[];
  suggestedPersonaCategories: SyntheticMemoryPreservationSuggestedPersona[];
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
  enterpriseMemoryPackages: SyntheticEnterpriseMemoryPackage[];
  portfolioMemoryPackages: SyntheticPortfolioMemoryPackage[];
  organizationalMemoryArchives: SyntheticOrganizationalMemoryArchive[];
  crossPeriodMemoryPackages: SyntheticCrossPeriodMemoryPackage[];
  crossEntityMemoryPackages: SyntheticCrossEntityMemoryPackage[];
  crossFunctionMemoryPackages: SyntheticCrossFunctionMemoryPackage[];
  organizationalMemoryGraphs: SyntheticOrganizationalMemoryGraph[];
  organizationalMemoryPackages: SyntheticOrganizationalMemoryPackage[];
  memoryObjects: SyntheticMemoryObject[];
  memoryRelationships: SyntheticMemoryRelationship[];
  evidenceLineageGraphs: SyntheticEvidenceLineageGraph[];
  historicalOutcomePackages: SyntheticHistoricalOutcomePackage[];
  historicalDecisionPackages: SyntheticHistoricalDecisionPackage[];
  historicalAuditPackages: SyntheticHistoricalAuditPackage[];
  historicalControllerPackages: SyntheticHistoricalControllerPackage[];
  healthcarePpdObservations: SyntheticMemoryObjectSourceArtifact[];
  payrollObservations: SyntheticMemoryObjectSourceArtifact[];
  methodologyObservations: SyntheticMemoryObjectSourceArtifact[];
  warnings: string[];
}

export interface BuildMemoryPreservationPackageResult {
  memoryPreservationPackage: SyntheticMemoryPreservationPackage | null;
  skipped: boolean;
  warnings: string[];
}

type PreservationReferenceArtifact =
  | SyntheticEnterpriseMemoryPackage
  | SyntheticPortfolioMemoryPackage
  | SyntheticOrganizationalMemoryArchive
  | SyntheticCrossPeriodMemoryPackage
  | SyntheticCrossEntityMemoryPackage
  | SyntheticCrossFunctionMemoryPackage
  | SyntheticOrganizationalMemoryGraph
  | SyntheticOrganizationalMemoryPackage
  | SyntheticMemoryObject
  | SyntheticMemoryRelationship
  | SyntheticEvidenceLineageGraph;

type PreservationHistoricalArtifact =
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

function isSupportedPackageCategory(packageCategory: SyntheticMemoryPreservationPackageCategory): boolean {
  return SYNTHETIC_MEMORY_PRESERVATION_PACKAGE_CATEGORIES.includes(packageCategory);
}

function isSupportedPreservationCategory(preservationCategory: SyntheticMemoryPreservationCategory): boolean {
  return SYNTHETIC_MEMORY_PRESERVATION_CATEGORIES.includes(preservationCategory);
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

function getEnterpriseMemoryPackages(input: BuildMemoryPreservationPackageInput): SyntheticEnterpriseMemoryPackage[] {
  return getInputArray(input.enterpriseMemoryPackages);
}

function getPortfolioMemoryPackages(input: BuildMemoryPreservationPackageInput): SyntheticPortfolioMemoryPackage[] {
  return getInputArray(input.portfolioMemoryPackages);
}

function getOrganizationalMemoryArchives(input: BuildMemoryPreservationPackageInput): SyntheticOrganizationalMemoryArchive[] {
  return getInputArray(input.organizationalMemoryArchives);
}

function getCrossPeriodMemoryPackages(input: BuildMemoryPreservationPackageInput): SyntheticCrossPeriodMemoryPackage[] {
  return getInputArray(input.crossPeriodMemoryPackages);
}

function getCrossEntityMemoryPackages(input: BuildMemoryPreservationPackageInput): SyntheticCrossEntityMemoryPackage[] {
  return getInputArray(input.crossEntityMemoryPackages);
}

function getCrossFunctionMemoryPackages(input: BuildMemoryPreservationPackageInput): SyntheticCrossFunctionMemoryPackage[] {
  return getInputArray(input.crossFunctionMemoryPackages);
}

function getOrganizationalMemoryGraphs(input: BuildMemoryPreservationPackageInput): SyntheticOrganizationalMemoryGraph[] {
  return getInputArray(input.organizationalMemoryGraphs);
}

function getOrganizationalMemoryPackages(input: BuildMemoryPreservationPackageInput): SyntheticOrganizationalMemoryPackage[] {
  return getInputArray(input.organizationalMemoryPackages);
}

function getMemoryObjects(input: BuildMemoryPreservationPackageInput): SyntheticMemoryObject[] {
  return getInputArray(input.memoryObjects);
}

function getMemoryRelationships(input: BuildMemoryPreservationPackageInput): SyntheticMemoryRelationship[] {
  return getInputArray(input.memoryRelationships);
}

function getEvidenceLineageGraphs(input: BuildMemoryPreservationPackageInput): SyntheticEvidenceLineageGraph[] {
  return getInputArray(input.evidenceLineageGraphs);
}

function getHistoricalOutcomePackages(input: BuildMemoryPreservationPackageInput): SyntheticHistoricalOutcomePackage[] {
  return getInputArray(input.historicalOutcomePackages);
}

function getHistoricalDecisionPackages(input: BuildMemoryPreservationPackageInput): SyntheticHistoricalDecisionPackage[] {
  return getInputArray(input.historicalDecisionPackages);
}

function getHistoricalAuditPackages(input: BuildMemoryPreservationPackageInput): SyntheticHistoricalAuditPackage[] {
  return getInputArray(input.historicalAuditPackages);
}

function getHistoricalControllerPackages(input: BuildMemoryPreservationPackageInput): SyntheticHistoricalControllerPackage[] {
  return getInputArray(input.historicalControllerPackages);
}

function getReferenceArtifacts(input: BuildMemoryPreservationPackageInput): PreservationReferenceArtifact[] {
  return [
    ...getEnterpriseMemoryPackages(input),
    ...getPortfolioMemoryPackages(input),
    ...getOrganizationalMemoryArchives(input),
    ...getCrossPeriodMemoryPackages(input),
    ...getCrossEntityMemoryPackages(input),
    ...getCrossFunctionMemoryPackages(input),
    ...getOrganizationalMemoryGraphs(input),
    ...getOrganizationalMemoryPackages(input),
    ...getMemoryObjects(input),
    ...getMemoryRelationships(input),
    ...getEvidenceLineageGraphs(input),
  ];
}

function getHistoricalArtifacts(input: BuildMemoryPreservationPackageInput): PreservationHistoricalArtifact[] {
  return [
    ...getHistoricalOutcomePackages(input),
    ...getHistoricalDecisionPackages(input),
    ...getHistoricalAuditPackages(input),
    ...getHistoricalControllerPackages(input),
  ];
}

function getAllArtifacts(input: BuildMemoryPreservationPackageInput): Array<PreservationReferenceArtifact | PreservationHistoricalArtifact> {
  return [...getReferenceArtifacts(input), ...getHistoricalArtifacts(input)];
}

function getForwardCompatibleReferences(input: BuildMemoryPreservationPackageInput): SyntheticMemoryObjectSourceArtifact[] {
  return [
    ...getInputArray(input.healthcarePpdObservations),
    ...getInputArray(input.payrollObservations),
    ...getInputArray(input.methodologyObservations),
  ];
}

function getReferenceIds(input: BuildMemoryPreservationPackageInput, singularName: string, arrayName: string): string[] {
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

function getMemoryObjectIds(input: BuildMemoryPreservationPackageInput): string[] {
  return uniqueStable([
    ...getMemoryObjects(input).map((artifact) => artifact.memoryObjectId),
    ...getAllArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "memoryObjectIds")),
  ]);
}

function getMemoryRelationshipIds(input: BuildMemoryPreservationPackageInput): string[] {
  return uniqueStable([
    ...getMemoryRelationships(input).map((artifact) => artifact.memoryRelationshipId),
    ...getAllArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "memoryRelationshipIds")),
  ]);
}

function getEvidenceLineageGraphIds(input: BuildMemoryPreservationPackageInput): string[] {
  return uniqueStable([
    ...getEvidenceLineageGraphs(input).map((artifact) => artifact.evidenceLineageGraphId),
    ...getAllArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "evidenceLineageGraphIds")),
  ]);
}

function getOrganizationalMemoryPackageIds(input: BuildMemoryPreservationPackageInput): string[] {
  return uniqueStable([
    ...getOrganizationalMemoryPackages(input).map((artifact) => artifact.organizationalMemoryPackageId),
    ...getAllArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryPackageIds")),
  ]);
}

function getOrganizationalMemoryGraphIds(input: BuildMemoryPreservationPackageInput): string[] {
  return uniqueStable([
    ...getOrganizationalMemoryGraphs(input).map((artifact) => artifact.organizationalMemoryGraphId),
    ...getAllArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryGraphIds")),
  ]);
}

function getHistoricalOutcomePackageIds(input: BuildMemoryPreservationPackageInput): string[] {
  return uniqueStable([
    ...getHistoricalOutcomePackages(input).map((artifact) => artifact.historicalOutcomePackageId),
    ...getAllArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "historicalOutcomePackageIds")),
  ]);
}

function getHistoricalDecisionPackageIds(input: BuildMemoryPreservationPackageInput): string[] {
  return uniqueStable([
    ...getHistoricalDecisionPackages(input).map((artifact) => artifact.historicalDecisionPackageId),
    ...getAllArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "historicalDecisionPackageIds")),
  ]);
}

function getHistoricalAuditPackageIds(input: BuildMemoryPreservationPackageInput): string[] {
  return uniqueStable([
    ...getHistoricalAuditPackages(input).map((artifact) => artifact.historicalAuditPackageId),
    ...getAllArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "historicalAuditPackageIds")),
  ]);
}

function getHistoricalControllerPackageIds(input: BuildMemoryPreservationPackageInput): string[] {
  return uniqueStable([
    ...getHistoricalControllerPackages(input).map((artifact) => artifact.historicalControllerPackageId),
    ...getAllArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "historicalControllerPackageIds")),
  ]);
}

function getCrossPeriodMemoryPackageIds(input: BuildMemoryPreservationPackageInput): string[] {
  return uniqueStable([
    ...getCrossPeriodMemoryPackages(input).map((artifact) => artifact.crossPeriodMemoryPackageId),
    ...getAllArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "crossPeriodMemoryPackageIds")),
  ]);
}

function getCrossEntityMemoryPackageIds(input: BuildMemoryPreservationPackageInput): string[] {
  return uniqueStable([
    ...getCrossEntityMemoryPackages(input).map((artifact) => artifact.crossEntityMemoryPackageId),
    ...getAllArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "crossEntityMemoryPackageIds")),
  ]);
}

function getCrossFunctionMemoryPackageIds(input: BuildMemoryPreservationPackageInput): string[] {
  return uniqueStable([
    ...getCrossFunctionMemoryPackages(input).map((artifact) => artifact.crossFunctionMemoryPackageId),
    ...getAllArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "crossFunctionMemoryPackageIds")),
  ]);
}

function getEnterpriseMemoryPackageIds(input: BuildMemoryPreservationPackageInput): string[] {
  return uniqueStable([
    ...getEnterpriseMemoryPackages(input).map((artifact) => artifact.enterpriseMemoryPackageId),
    ...getAllArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "enterpriseMemoryPackageIds")),
  ]);
}

function getPortfolioMemoryPackageIds(input: BuildMemoryPreservationPackageInput): string[] {
  return uniqueStable([
    ...getPortfolioMemoryPackages(input).map((artifact) => artifact.portfolioMemoryPackageId),
    ...getAllArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "portfolioMemoryPackageIds")),
  ]);
}

function getOrganizationalMemoryArchiveIds(input: BuildMemoryPreservationPackageInput): string[] {
  return uniqueStable([
    ...getOrganizationalMemoryArchives(input).map((artifact) => artifact.organizationalMemoryArchiveId),
    ...getAllArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryArchiveIds")),
  ]);
}

function getEvidenceReferenceIds(input: BuildMemoryPreservationPackageInput): string[] {
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

function getSourceReferenceIds(input: BuildMemoryPreservationPackageInput): string[] {
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

function getLineageReferenceIds(input: BuildMemoryPreservationPackageInput): string[] {
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

function getUpstreamObservationIds(input: BuildMemoryPreservationPackageInput): string[] {
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

function getUpstreamPackageIds(input: BuildMemoryPreservationPackageInput): string[] {
  return uniqueStable([
    ...getForwardCompatibleReferences(input).flatMap((artifact) => [...getStringProperty(artifact, "packageId"), ...(artifact.upstreamPackageIds ?? [])]),
    ...getAllArtifacts(input).flatMap((artifact) => artifact.upstreamPackageIds),
  ]);
}

function getAuditContractReferenceIds(input: BuildMemoryPreservationPackageInput): string[] {
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

function buildMemoryPreservationPackageKey(input: BuildMemoryPreservationPackageInput): string {
  const scope = input.auditContract?.scope;

  return stableSnapshotHash({
    packageCategory: input.packageCategory,
    preservationCategory: input.preservationCategory,
    companyId: scope?.companyId ?? null,
    scope: scope ?? null,
    customerIsolation: scope ? buildCustomerIsolation(scope) : null,
    firmIsolation: scope ? buildFirmIsolation(scope) : null,
    clientIsolation: scope ? buildClientIsolation(scope) : null,
    preservationReferenceIds: uniqueStable(getInputArray(input.preservationReferenceIds)),
    preservationLineageReferenceIds: uniqueStable(getInputArray(input.preservationLineageReferenceIds)),
    continuityReferenceIds: uniqueStable(getInputArray(input.continuityReferenceIds)),
    continuityEventReferenceIds: uniqueStable(getInputArray(input.continuityEventReferenceIds)),
    acquisitionReferenceIds: uniqueStable(getInputArray(input.acquisitionReferenceIds)),
    entityChangeReferenceIds: uniqueStable(getInputArray(input.entityChangeReferenceIds)),
    firmClientTransitionReferenceIds: uniqueStable(getInputArray(input.firmClientTransitionReferenceIds)),
    systemMigrationReferenceIds: uniqueStable(getInputArray(input.systemMigrationReferenceIds)),
    staffingTurnoverReferenceIds: uniqueStable(getInputArray(input.staffingTurnoverReferenceIds)),
    departmentRestructureReferenceIds: uniqueStable(getInputArray(input.departmentRestructureReferenceIds)),
    fiscalPeriodTransitionReferenceIds: uniqueStable(getInputArray(input.fiscalPeriodTransitionReferenceIds)),
    archiveContinuityReferenceIds: uniqueStable(getInputArray(input.archiveContinuityReferenceIds)),
    enterpriseMemoryPackageIds: getEnterpriseMemoryPackageIds(input),
    portfolioMemoryPackageIds: getPortfolioMemoryPackageIds(input),
    organizationalMemoryArchiveIds: getOrganizationalMemoryArchiveIds(input),
    crossPeriodMemoryPackageIds: getCrossPeriodMemoryPackageIds(input),
    crossEntityMemoryPackageIds: getCrossEntityMemoryPackageIds(input),
    crossFunctionMemoryPackageIds: getCrossFunctionMemoryPackageIds(input),
    organizationalMemoryGraphIds: getOrganizationalMemoryGraphIds(input),
    organizationalMemoryPackageIds: getOrganizationalMemoryPackageIds(input),
    memoryObjectIds: getMemoryObjectIds(input),
    memoryRelationshipIds: getMemoryRelationshipIds(input),
    evidenceLineageGraphIds: getEvidenceLineageGraphIds(input),
    historicalOutcomePackageIds: getHistoricalOutcomePackageIds(input),
    historicalDecisionPackageIds: getHistoricalDecisionPackageIds(input),
    historicalAuditPackageIds: getHistoricalAuditPackageIds(input),
    historicalControllerPackageIds: getHistoricalControllerPackageIds(input),
  });
}

function buildMemoryPreservationPackageId(input: BuildMemoryPreservationPackageInput): string {
  return `synthetic-memory-preservation-package:${stableSnapshotHash({
    memoryPreservationPackageKey: buildMemoryPreservationPackageKey(input),
    packageCategory: input.packageCategory,
    preservationCategory: input.preservationCategory,
    companyId: input.auditContract?.scope.companyId ?? null,
  })}`;
}

function getMaterialityMetadata(input: BuildMemoryPreservationPackageInput): SyntheticAuditMaterialityCompatibility[] {
  return compactDefined([
    input.auditContract?.materialityCompatibility,
    ...getForwardCompatibleReferences(input).flatMap((artifact) => [
      ...getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(artifact, "materialityMetadata"),
      ...getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(artifact, "materialityCompatibility"),
    ]),
    ...getAllArtifacts(input).flatMap((artifact) => [...artifact.materialityMetadata, ...artifact.materialityCompatibility]),
  ]);
}

function getForwardCompatibilityWarnings(input: BuildMemoryPreservationPackageInput): string[] {
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

function validateInput(input: BuildMemoryPreservationPackageInput): string[] {
  const warnings: string[] = [];
  const auditContract = input.auditContract;

  if (!auditContract) warnings.push("auditContract is required.");
  if (!auditContract) return warnings;

  if (!hasValue(input.packageCategory)) warnings.push("packageCategory is required.");
  if (hasValue(input.packageCategory) && !isSupportedPackageCategory(input.packageCategory)) warnings.push("packageCategory must be supported.");
  if (!hasValue(input.preservationCategory)) warnings.push("preservationCategory is required.");
  if (hasValue(input.preservationCategory) && !isSupportedPreservationCategory(input.preservationCategory)) {
    warnings.push("preservationCategory must be supported.");
  }
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
    ["enterpriseMemoryPackages", getEnterpriseMemoryPackages(input), "enterpriseMemoryPackageId", "enterpriseMemoryPackageKey"],
    ["portfolioMemoryPackages", getPortfolioMemoryPackages(input), "portfolioMemoryPackageId", "portfolioMemoryPackageKey"],
    ["organizationalMemoryArchives", getOrganizationalMemoryArchives(input), "organizationalMemoryArchiveId", "organizationalMemoryArchiveKey"],
    ["crossPeriodMemoryPackages", getCrossPeriodMemoryPackages(input), "crossPeriodMemoryPackageId", "crossPeriodMemoryPackageKey"],
    ["crossEntityMemoryPackages", getCrossEntityMemoryPackages(input), "crossEntityMemoryPackageId", "crossEntityMemoryPackageKey"],
    ["crossFunctionMemoryPackages", getCrossFunctionMemoryPackages(input), "crossFunctionMemoryPackageId", "crossFunctionMemoryPackageKey"],
    ["organizationalMemoryGraphs", getOrganizationalMemoryGraphs(input), "organizationalMemoryGraphId", "organizationalMemoryGraphKey"],
    ["organizationalMemoryPackages", getOrganizationalMemoryPackages(input), "organizationalMemoryPackageId", "organizationalMemoryPackageKey"],
    ["memoryObjects", getMemoryObjects(input), "memoryObjectId", "memoryObjectKey"],
    ["memoryRelationships", getMemoryRelationships(input), "memoryRelationshipId", "memoryRelationshipKey"],
    ["evidenceLineageGraphs", getEvidenceLineageGraphs(input), "evidenceLineageGraphId", "evidenceLineageGraphKey"],
    ["historicalOutcomePackages", getHistoricalOutcomePackages(input), "historicalOutcomePackageId", "historicalOutcomePackageKey"],
    ["historicalDecisionPackages", getHistoricalDecisionPackages(input), "historicalDecisionPackageId", "historicalDecisionPackageKey"],
    ["historicalAuditPackages", getHistoricalAuditPackages(input), "historicalAuditPackageId", "historicalAuditPackageKey"],
    ["historicalControllerPackages", getHistoricalControllerPackages(input), "historicalControllerPackageId", "historicalControllerPackageKey"],
  ] as const) {
    values.forEach((artifact, index) => {
      if (!hasValue((artifact as unknown as Record<string, unknown>)[idName])) warnings.push(`${inputName}[${index}].${idName} is required.`);
      if (!hasValue((artifact as unknown as Record<string, unknown>)[keyName])) warnings.push(`${inputName}[${index}].${keyName} is required.`);
      if (artifact.companyId !== companyId) warnings.push(`${inputName}[${index}].companyId must equal scope.companyId.`);
    });
  }

  return warnings;
}

export function buildMemoryPreservationPackage(input: BuildMemoryPreservationPackageInput): BuildMemoryPreservationPackageResult {
  const fatalWarnings = validateInput(input);
  if (fatalWarnings.length > 0 || !input.auditContract) {
    return {
      memoryPreservationPackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const auditContract = input.auditContract;
  const materialityMetadata = getMaterialityMetadata(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    memoryPreservationPackage: {
      memoryPreservationPackageId: buildMemoryPreservationPackageId(input),
      memoryPreservationPackageKey: buildMemoryPreservationPackageKey(input),
      packageCategory: input.packageCategory,
      preservationCategory: input.preservationCategory,
      companyId: auditContract.scope.companyId,
      scope: auditContract.scope,
      customerIsolation: buildCustomerIsolation(auditContract.scope),
      firmIsolation: buildFirmIsolation(auditContract.scope),
      clientIsolation: buildClientIsolation(auditContract.scope),
      preservationReferenceIds: uniqueStable(getInputArray(input.preservationReferenceIds)),
      preservationLineageReferenceIds: uniqueStable(getInputArray(input.preservationLineageReferenceIds)),
      continuityReferenceIds: uniqueStable(getInputArray(input.continuityReferenceIds)),
      continuityEventReferenceIds: uniqueStable(getInputArray(input.continuityEventReferenceIds)),
      acquisitionReferenceIds: uniqueStable(getInputArray(input.acquisitionReferenceIds)),
      entityChangeReferenceIds: uniqueStable(getInputArray(input.entityChangeReferenceIds)),
      firmClientTransitionReferenceIds: uniqueStable(getInputArray(input.firmClientTransitionReferenceIds)),
      systemMigrationReferenceIds: uniqueStable(getInputArray(input.systemMigrationReferenceIds)),
      staffingTurnoverReferenceIds: uniqueStable(getInputArray(input.staffingTurnoverReferenceIds)),
      departmentRestructureReferenceIds: uniqueStable(getInputArray(input.departmentRestructureReferenceIds)),
      fiscalPeriodTransitionReferenceIds: uniqueStable(getInputArray(input.fiscalPeriodTransitionReferenceIds)),
      archiveContinuityReferenceIds: uniqueStable(getInputArray(input.archiveContinuityReferenceIds)),
      enterpriseMemoryPackageIds: getEnterpriseMemoryPackageIds(input),
      portfolioMemoryPackageIds: getPortfolioMemoryPackageIds(input),
      organizationalMemoryArchiveIds: getOrganizationalMemoryArchiveIds(input),
      crossPeriodMemoryPackageIds: getCrossPeriodMemoryPackageIds(input),
      crossEntityMemoryPackageIds: getCrossEntityMemoryPackageIds(input),
      crossFunctionMemoryPackageIds: getCrossFunctionMemoryPackageIds(input),
      organizationalMemoryGraphIds: getOrganizationalMemoryGraphIds(input),
      organizationalMemoryPackageIds: getOrganizationalMemoryPackageIds(input),
      memoryObjectIds: getMemoryObjectIds(input),
      memoryRelationshipIds: getMemoryRelationshipIds(input),
      evidenceLineageGraphIds: getEvidenceLineageGraphIds(input),
      historicalOutcomePackageIds: getHistoricalOutcomePackageIds(input),
      historicalDecisionPackageIds: getHistoricalDecisionPackageIds(input),
      historicalAuditPackageIds: getHistoricalAuditPackageIds(input),
      historicalControllerPackageIds: getHistoricalControllerPackageIds(input),
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
      preservationMetadata: getInputArray(input.preservationMetadata),
      continuityMetadata: getInputArray(input.continuityMetadata),
      preservationGovernanceMetadata: getInputArray(input.preservationGovernanceMetadata),
      suggestedPersonaCategories: SYNTHETIC_MEMORY_PRESERVATION_SUGGESTED_PERSONAS,
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
      enterpriseMemoryPackages: getEnterpriseMemoryPackages(input),
      portfolioMemoryPackages: getPortfolioMemoryPackages(input),
      organizationalMemoryArchives: getOrganizationalMemoryArchives(input),
      crossPeriodMemoryPackages: getCrossPeriodMemoryPackages(input),
      crossEntityMemoryPackages: getCrossEntityMemoryPackages(input),
      crossFunctionMemoryPackages: getCrossFunctionMemoryPackages(input),
      organizationalMemoryGraphs: getOrganizationalMemoryGraphs(input),
      organizationalMemoryPackages: getOrganizationalMemoryPackages(input),
      memoryObjects: getMemoryObjects(input),
      memoryRelationships: getMemoryRelationships(input),
      evidenceLineageGraphs: getEvidenceLineageGraphs(input),
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
